'use strict';

const crypto = require('node:crypto');
const { GatewayError } = require('./errors.cjs');

const ROOM_PATTERN = /^castle-audio-[a-f0-9]{32}$/;

function inside(position, rect) {
  return position && Number.isFinite(position.x) && Number.isFinite(position.y) &&
    position.x >= rect.x && position.y >= rect.y &&
    position.x < rect.x + rect.width && position.y < rect.y + rect.height;
}

class AttemptLimiter {
  constructor(config, clock) { this.config = config; this.clock = clock; this.buckets = new Map(); }
  consume(identifier, ip) {
    const now = this.clock();
    for (const [key, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(key);
    const keys = [['id:' + identifier, this.config.identityAttempts]];
    if (Number.isFinite(this.config.ipAttempts)) keys.push(['ip:' + ip, this.config.ipAttempts]);
    for (const [key, limit] of keys) {
      const bucket = this.buckets.get(key);
      if (bucket && bucket.count >= limit) {
        throw new GatewayError(429, 'rate_limited', Math.max(1, Math.ceil((bucket.until - now) / 1000)));
      }
    }
    if (this.buckets.size > 10000) throw new GatewayError(503, 'unavailable');
    for (const [key] of keys) {
      const bucket = this.buckets.get(key) || { count: 0, until: now + this.config.rateWindowMs };
      bucket.count++;
      this.buckets.set(key, bucket);
    }
  }
}

class HallAudioController {
  constructor({ config, media, verifyCode, clock = Date.now,
    randomId = () => crypto.randomBytes(16).toString('hex') }) {
    this.config = config; this.media = media; this.verifyCode = verifyCode;
    this.clock = clock; this.randomId = randomId;
    this.sessions = new Map(); this.limiter = new AttemptLimiter(config, clock);
    this.sessionLimiter = new AttemptLimiter({ ...config,
      identityAttempts: config.sessionCreationAttempts, ipAttempts: Infinity }, clock);
    this.lease = null; this.pending = null; this.room = null; this.epoch = null;
    this.roomSpeaker = null; this.ready = false; this.revision = 0;
    this.gatewayId = this.randomId();
    this.rotations = 0; this.mediaTail = Promise.resolve(); this.closed = false;
  }

  async initialize() {
    if (this.media.cleanupOrphans) await this.mediaCall(() => this.media.cleanupOrphans(ROOM_PATTERN));
    await this.rotate();
  }

  async mediaCall(task) {
    let timer;
    try {
      return await Promise.race([Promise.resolve().then(task), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new GatewayError(503, 'unavailable')), this.config.mediaTimeoutMs);
        timer.unref?.();
      })]);
    } finally { clearTimeout(timer); }
  }

  // Change the advertised epoch before any network operation. Queued retire/create calls never revive an old epoch.
  rotate() {
    const oldRoom = this.room, oldSpeaker = this.roomSpeaker;
    this.epoch = this.randomId();
    this.room = 'castle-audio-' + this.epoch;
    if (!ROOM_PATTERN.test(this.room)) throw new Error('Invalid epoch generator');
    const room = this.room, revision = ++this.revision;
    this.roomSpeaker = null; this.ready = false; this.rotations++;
    const task = this.mediaTail.catch(() => {}).then(async () => {
      if (oldRoom) await this.mediaCall(() => this.media.retireRoom(oldRoom, oldSpeaker));
      if (revision !== this.revision || this.closed) return;
      await this.mediaCall(() => this.media.createRoom(room));
      if (revision === this.revision && !this.closed) this.ready = true;
    }).finally(() => { this.rotations--; });
    this.mediaTail = task;
    return task;
  }

  newSession(auth, mapId) {
    if (this.closed || !this.ready || this.rotations) throw new GatewayError(503, 'unavailable');
    if (mapId !== this.config.map.id) throw new GatewayError(403, 'wrong_map');
    const now = this.clock();
    for (const [id, session] of this.sessions) if (session.until <= now) this.sessions.delete(id);
    this.sessionLimiter.consume(auth.identifier);
    const ownSessions = [...this.sessions.values()].filter(s => s.identifier === auth.identifier);
    if (ownSessions.length >= this.config.identitySessionLimit) {
      throw new GatewayError(429, 'session_limit', Math.max(1,
        Math.ceil((Math.min(...ownSessions.map(s => s.until)) - now) / 1000)));
    }
    if (this.sessions.size >= this.config.maxSessions) throw new GatewayError(503, 'unavailable');
    const id = this.randomId();
    this.sessions.set(id, { id, identifier: auth.identifier, name: auth.name, until: now + this.config.sessionMs });
    return { sessionId: id };
  }

  session(auth, id) {
    const session = this.sessions.get(id);
    if (!session || session.until <= this.clock() || session.identifier !== auth.identifier) {
      throw new GatewayError(401, 'session_expired');
    }
    session.until = this.clock() + this.config.sessionMs;
    return session;
  }

  snapshot(auth, session) {
    const lease = this.lease;
    return { gatewayId: this.gatewayId, revision: this.revision, epoch: this.epoch, room: this.room,
      available: this.ready && this.rotations === 0 && !this.closed,
      serverTime: this.clock(), freshnessMs: this.config.freshnessMs,
      speaker: lease ? { name: lease.name, phase: lease.phase, expiresAt: lease.expiresAt,
        sameAccount: lease.identifier === auth.identifier, owned: lease.sessionId === session.id } : null };
  }

  async state(auth, id) {
    const session = this.session(auth, id);
    await this.tick();
    return this.snapshot(auth, session);
  }

  async listen(auth, id) {
    const session = this.session(auth, id);
    await this.tick();
    if (!this.ready || this.rotations || this.closed) throw new GatewayError(503, 'unavailable');
    if (this.lease?.identifier === auth.identifier) return { ...this.snapshot(auth, session), suppressed: true };
    const epoch = this.epoch, room = this.room;
    const identity = 'listener-' + this.randomId();
    const token = await this.mediaCall(() => this.media.issueToken({ room, identity,
      publisher: false, ttl: this.config.tokenTtlSeconds }));
    if (epoch !== this.epoch || !this.ready || this.rotations || this.lease?.identifier === auth.identifier) {
      throw new GatewayError(409, 'epoch_changed');
    }
    return { ...this.snapshot(auth, session), token, identity, url: this.config.livekit.browserUrl };
  }

  async claim(auth, id, { code, position } = {}, ip) {
    const session = this.session(auth, id);
    await this.tick();
    if (!inside(position, this.config.podium)) throw new GatewayError(403, 'off_podium');
    if (this.config.allowedTags.length && !this.config.allowedTags.some(t => auth.tags.includes(t))) {
      throw new GatewayError(403, 'role_required');
    }
    if (this.pending || this.lease || this.rotations) throw new GatewayError(409, 'occupied');
    if (!this.ready || this.closed) throw new GatewayError(503, 'unavailable');
    this.limiter.consume(auth.identifier, ip);
    const pending = { sessionId: session.id, cancelled: false };
    this.pending = pending;
    let lease;
    try {
      if (!await this.verifyCode(code)) throw new GatewayError(403, 'wrong_code');
      if (pending.cancelled || this.closed) throw new GatewayError(409, 'cancelled');
      lease = { id: this.randomId(), sessionId: session.id, identifier: session.identifier,
        name: session.name, identity: 'speaker-' + this.randomId(), phase: 'arming',
        armingUntil: this.clock() + this.config.armingMs,
        expiresAt: this.clock() + this.config.leaseMs };
      this.lease = lease;
      await this.rotate();
      this.assertLease(lease);
      const epoch = this.epoch, room = this.room;
      this.roomSpeaker = lease.identity;
      const token = await this.mediaCall(() => this.media.issueToken({ room, identity: lease.identity,
        publisher: true, ttl: this.config.tokenTtlSeconds }));
      this.assertLease(lease);
      if (epoch !== this.epoch) throw new GatewayError(409, 'epoch_changed');
      return { ...this.snapshot(auth, session), token, identity: lease.identity,
        url: this.config.livekit.browserUrl, leaseId: lease.id };
    } catch (error) {
      if (lease && this.lease === lease) {
        this.lease = null;
        await this.rotate().catch(() => {});
      }
      throw error instanceof GatewayError ? error : new GatewayError(503, 'unavailable');
    } finally {
      if (this.pending === pending) this.pending = null;
    }
  }

  assertLease(lease) {
    if (this.lease !== lease || lease.expiresAt <= this.clock() || this.closed) {
      throw new GatewayError(410, 'lease_expired');
    }
  }

  async heartbeat(auth, id, { leaseId, position, active } = {}) {
    const session = this.session(auth, id);
    const lease = this.lease;
    if (!lease || lease.sessionId !== session.id || lease.id !== leaseId) throw new GatewayError(410, 'lease_expired');
    if (!inside(position, this.config.podium)) {
      await this.release(auth, id, leaseId);
      throw new GatewayError(403, 'off_podium');
    }
    if (lease.expiresAt <= this.clock()) {
      await this.tick();
      throw new GatewayError(410, 'lease_expired');
    }
    if (active === true) {
      lease.phase = 'active';
      lease.expiresAt = this.clock() + this.config.leaseMs;
    } else if (lease.phase === 'arming') {
      lease.expiresAt = Math.min(lease.armingUntil, this.clock() + this.config.leaseMs);
    }
    return this.snapshot(auth, session);
  }

  async release(auth, id, leaseId) {
    const session = this.session(auth, id);
    if (this.pending?.sessionId === session.id && !leaseId) this.pending.cancelled = true;
    const lease = this.lease;
    if (!lease || lease.sessionId !== session.id || (leaseId && lease.id !== leaseId)) {
      return this.snapshot(auth, session);
    }
    this.lease = null;
    await this.rotate();
    return this.snapshot(auth, session);
  }

  async tick() {
    if (this.closed) return;
    if (this.lease && this.lease.expiresAt <= this.clock()) {
      this.lease = null;
      await this.rotate();
    } else if (!this.ready && !this.rotations && !this.pending) {
      await this.rotate();
    }
  }

  async shutdown() {
    this.closed = true; this.ready = false; this.revision++;
    if (this.pending) this.pending.cancelled = true;
    this.lease = null;
    await this.mediaTail.catch(() => {});
    if (this.room) await this.mediaCall(() => this.media.retireRoom(this.room, this.roomSpeaker));
  }
}

module.exports = { HallAudioController, AttemptLimiter, inside, ROOM_PATTERN };
