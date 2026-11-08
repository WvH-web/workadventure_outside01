'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../ops/hall-audio');
const dependency = createRequire(path.join(root, 'package.json'));
const { SignJWT, jwtVerify } = dependency('jose');
const { HallAudioController, ROOM_PATTERN } = require('../ops/hall-audio/controller.cjs');
const { createVerifier, createCodeVerifier } = require('../ops/hall-audio/auth.cjs');
const { loadConfig, publicConfig } = require('../ops/hall-audio/config.cjs');
const { createGatewayServer, clientIp } = require('../ops/hall-audio/server.cjs');
const { LiveKitMedia, permissions } = require('../ops/hall-audio/media.cjs');

const salt = Buffer.alloc(32, 7);
const syntheticCode = 'synthetic-test-only';
const hash = crypto.scryptSync(syntheticCode, salt, 64);
const testSecret = 'synthetic-test-secret-not-a-production-key';
const key = new TextEncoder().encode(testSecret);
const auth = { identifier: 'student-one@invalid.test', name: 'Testperson', tags: ['student'] };
const other = { identifier: 'student-two@invalid.test', name: 'Zweite Testperson', tags: ['student'] };
const point = { x: 110, y: 210 };

function config() {
  return loadConfig({ SECRET_KEY: testSecret, LIVEKIT_API_KEY: 'synthetic-api-key',
    LIVEKIT_API_SECRET: 'synthetic-api-secret-for-local-tests-only',
    LIVEKIT_HOST: 'wss://together.example.test', LIVEKIT_URL: 'http://livekit.invalid:7880',
    HALL_AUDIO_CODE_SALT: salt.toString('base64'), HALL_AUDIO_CODE_HASH: hash.toString('hex'),
    HALL_AUDIO_MAP_ID: 'https://together.example.test/_/global/maps.example.test/hall.tmj',
    HALL_AUDIO_MAP_URL: 'https://maps.example.test/hall.tmj', HALL_AUDIO_MAP_NAME: 'Grosse Halle',
    HALL_AUDIO_PODIUM_BOUNDS: JSON.stringify({ x: 100, y: 200, width: 64, height: 32 }),
    HALL_AUDIO_ORIGIN: 'https://together.example.test' });
}

async function fixture(options = {}) {
  let time = 1800000000000, serial = 0;
  const calls = [], rooms = new Set(), tokens = [];
  const media = {
    async cleanupOrphans(pattern) { calls.push(['orphans', pattern.source]); },
    async createRoom(room) { calls.push(['create', room]); rooms.add(room); },
    async retireRoom(room, identity) { calls.push(['retire', room, identity]); rooms.delete(room); },
    async issueToken(grant) { tokens.push(grant); calls.push(['token', grant]); return 'synthetic-' + tokens.length; },
    ...options.media,
  };
  const cfg = { ...config(), ...options.config };
  const controller = new HallAudioController({ config: cfg, media,
    verifyCode: options.verifyCode || createCodeVerifier(cfg), clock: () => time,
    randomId: () => (++serial).toString(16).padStart(32, '0') });
  await controller.initialize();
  const session = (actor = auth) => controller.newSession(actor, cfg.map.id).sessionId;
  return { controller, calls, rooms, tokens, config: cfg, session,
    advance: ms => { time += ms; }, clock: () => time };
}

async function rejectCode(promise, code, status) {
  await assert.rejects(promise, error => error.code === code && (!status || error.status === status));
}

test('JWT requires a valid HS256 signature, expiration, and identifier', async () => {
  const time = 1800000000000;
  const verify = createVerifier(testSecret, { clock: () => time });
  const sign = (payload, alg = 'HS256', signingKey = key) => new SignJWT(payload)
    .setProtectedHeader({ alg }).sign(signingKey);
  const payload = { identifier: auth.identifier, username: 'Signed name', exp: time / 1000 + 60 };
  assert.equal((await verify('Bearer ' + await sign(payload))).name, 'Signed name');
  for (const token of [undefined, 'Bearer garbage', 'Bearer ' + await sign({ ...payload, exp: time / 1000 - 1 }),
    'Bearer ' + await sign({ identifier: auth.identifier }), 'Bearer ' + await sign({ exp: time / 1000 + 60 }),
    'Bearer ' + await sign({ ...payload, identifier: '' }), 'Bearer ' + await sign(payload, 'HS384'),
    'Bearer ' + await sign(payload, 'HS256', new TextEncoder().encode('different-test-key'))]) {
    await rejectCode(verify(token), 'unauthorized', 401);
  }
});

test('code is scrypt-checked; private configuration is never returned publicly', async () => {
  const cfg = config(), check = createCodeVerifier(cfg);
  assert.equal(await check(syntheticCode), true);
  assert.equal(await check('wrong-code'), false);
  assert.equal(await check('x'.repeat(129)), false);
  const value = JSON.stringify(publicConfig(cfg));
  assert.ok(!value.includes(testSecret)); assert.ok(!value.includes(cfg.codeHash.toString('hex')));
  assert.ok(!value.includes(cfg.codeSalt.toString('base64')));
  assert.throws(() => loadConfig({}), /configuration/);
});

test('wrong code and off-podium claims never produce publisher tokens', async () => {
  const f = await fixture(), id = f.session();
  await rejectCode(f.controller.claim(auth, id, { code: 'incorrect', position: point }, 'ip-one'), 'wrong_code', 403);
  await rejectCode(f.controller.claim(auth, id, { code: syntheticCode, position: { x: 0, y: 0 } }, 'ip-one'), 'off_podium', 403);
  await rejectCode(f.controller.claim(auth, id, { code: syntheticCode, position: { x: 164, y: 210 } }, 'ip-one'), 'off_podium', 403);
  assert.equal(f.tokens.length, 0); assert.equal(f.controller.lease, null);
});

test('attempts are limited separately by verified identity and trusted client IP', async () => {
  const f = await fixture({ config: { identityAttempts: 2, ipAttempts: 3 } });
  const id = f.session(), id2 = f.session(other);
  for (let n = 0; n < 2; n++) await rejectCode(f.controller.claim(auth, id, { code: 'bad', position: point }, 'ip-one'), 'wrong_code');
  await rejectCode(f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-two'), 'rate_limited', 429);
  await rejectCode(f.controller.claim(other, id2, { code: 'bad', position: point }, 'ip-one'), 'wrong_code');
  const third = { ...other, identifier: 'student-three@invalid.test' };
  await rejectCode(f.controller.claim(third, f.session(third), { code: syntheticCode, position: point }, 'ip-one'), 'rate_limited', 429);
  f.advance(60001);
  assert.ok((await f.controller.claim(auth, f.session(), { code: syntheticCode, position: point }, 'ip-one')).leaseId);
});

test('claims reserve the single holder before awaiting code or media', async () => {
  let resolveCode;
  const f = await fixture({ verifyCode: () => new Promise(resolve => { resolveCode = resolve; }) });
  const id = f.session(), id2 = f.session(other);
  const first = f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  await new Promise(resolve => setImmediate(resolve));
  await rejectCode(f.controller.claim(other, id2, { code: syntheticCode, position: point }, 'ip-two'), 'occupied', 409);
  resolveCode(true);
  const result = await first;
  assert.ok(result.leaseId); assert.equal(f.tokens.filter(t => t.publisher).length, 1);
});

test('a release cancels an in-flight code check before a grant exists', async () => {
  let resolveCode;
  const f = await fixture({ verifyCode: () => new Promise(resolve => { resolveCode = resolve; }) });
  const id = f.session();
  const pending = f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  await new Promise(resolve => setImmediate(resolve));
  await f.controller.release(auth, id);
  resolveCode(true);
  await rejectCode(pending, 'cancelled', 409);
  assert.equal(f.tokens.length, 0);
});

test('microphone permission grace is bounded at 30 seconds even with ongoing arming heartbeats', async () => {
  const f = await fixture(), id = f.session();
  const grant = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  const deadline = f.clock() + 30000;
  for (let n = 0; n < 4; n++) {
    f.advance(7000);
    const next = await f.controller.heartbeat(auth, id, { leaseId: grant.leaseId, position: point, active: false });
    assert.ok(next.speaker.expiresAt <= deadline);
  }
  f.advance(2001); await f.controller.tick();
  assert.equal(f.controller.lease, null); assert.notEqual(f.controller.room, grant.room);
});

test('losing heartbeats during microphone permission expires within eight seconds, not thirty', async () => {
  const f = await fixture(), id = f.session();
  const grant = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  assert.equal(grant.speaker.expiresAt, f.clock() + 8000);
  f.advance(8001); await f.controller.tick();
  assert.equal(f.controller.lease, null); assert.notEqual(f.controller.room, grant.room);
});

test('active heartbeats extend only eight seconds; disconnection expires and rotates the room', async () => {
  const f = await fixture(), id = f.session();
  const grant = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  const next = await f.controller.heartbeat(auth, id, { leaseId: grant.leaseId, position: point, active: true });
  assert.equal(next.speaker.expiresAt, f.clock() + 8000);
  f.advance(8001); await f.controller.tick();
  assert.equal(f.controller.lease, null);
  assert.ok(f.calls.some(call => call[0] === 'retire' && call[1] === grant.room && call[2] === grant.identity));
  await rejectCode(f.controller.heartbeat(auth, id, { leaseId: grant.leaseId, position: point, active: true }), 'lease_expired', 410);
});

test('off-podium heartbeat revokes immediately and cannot be used to extend a lease', async () => {
  const f = await fixture(), id = f.session();
  const grant = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  await rejectCode(f.controller.heartbeat(auth, id, { leaseId: grant.leaseId, position: { x: 0, y: 0 }, active: true }), 'off_podium', 403);
  assert.equal(f.controller.lease, null); assert.notEqual(f.controller.room, grant.room);
});

test('leases are bound to both signed identity and opaque session; stale release cannot end a new grant', async () => {
  const f = await fixture(), id = f.session(), secondTab = f.session(), foreign = f.session(other);
  const first = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  await rejectCode(f.controller.heartbeat(auth, secondTab, { leaseId: first.leaseId, position: point, active: true }), 'lease_expired');
  await rejectCode(f.controller.state(other, id), 'session_expired');
  await f.controller.release(other, foreign, first.leaseId);
  assert.equal(f.controller.lease.id, first.leaseId);
  await f.controller.release(auth, id, first.leaseId);
  const second = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  await f.controller.release(auth, id, first.leaseId);
  assert.equal(f.controller.lease.id, second.leaseId);
});

test('retired speaker tokens name only the old room; new listeners and new holder use a fresh epoch', async () => {
  const f = await fixture(), id = f.session(), audience = f.session(other);
  const first = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  const firstListener = await f.controller.listen(other, audience);
  assert.equal(first.room, firstListener.room);
  const originalGrant = f.tokens.find(t => t.publisher);
  await f.controller.release(auth, id, first.leaseId);
  const idleListener = await f.controller.listen(other, audience);
  assert.notEqual(idleListener.room, originalGrant.room);
  const second = await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  const currentListener = await f.controller.listen(other, audience);
  assert.equal(currentListener.room, second.room);
  assert.notEqual(second.room, originalGrant.room); assert.notEqual(second.identity, first.identity);
  assert.notEqual(currentListener.identity, firstListener.identity);
  assert.ok(ROOM_PATTERN.test(second.room)); assert.ok(!second.room.includes('.'));
  assert.ok(f.tokens.every(t => t.ttl === 45));
});

test('same-account speaker monitoring is suppressed, including a second browser tab', async () => {
  const f = await fixture(), id = f.session(), secondTab = f.session();
  await f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  const count = f.tokens.length;
  assert.equal((await f.controller.listen(auth, secondTab)).suppressed, true);
  assert.equal(f.tokens.length, count);
});

test('code holders are not role-limited unless configured', async () => {
  const f = await fixture({ config: { allowedTags: ['teacher'] } });
  await rejectCode(f.controller.claim(auth, f.session(), { code: syntheticCode, position: point }, 'ip-one'), 'role_required', 403);
});

test('SDK grants forbid audience publishing and speaker camera, screen, data and admin privileges', async () => {
  const cfg = config();
  const media = new LiveKitMedia(cfg.livekit, {});
  for (const publisher of [false, true]) {
    const token = await media.issueToken({ room: 'castle-audio-' + 'a'.repeat(32), identity: 'opaque', publisher, ttl: 45 });
    const { payload } = await jwtVerify(token, new TextEncoder().encode(cfg.livekit.apiSecret), { algorithms: ['HS256'] });
    const grant = payload.video;
    assert.equal(grant.canPublish, publisher); assert.equal(grant.canSubscribe, !publisher);
    assert.equal(grant.canPublishData, false);
    for (const key of ['roomAdmin', 'roomCreate', 'roomList', 'roomRecord']) assert.ok(!grant[key]);
    if (publisher) assert.deepEqual(grant.canPublishSources, ['microphone']);
    else assert.equal(grant.canPublishSources, undefined);
    assert.ok(payload.exp - payload.nbf <= 45);
  }
  assert.deepEqual(permissions(true).canPublishSources, [2]);
});

test('retirement revokes, removes, and deletes only the exact gateway room', async () => {
  const calls = [], room = 'castle-audio-' + 'b'.repeat(32);
  const media = new LiveKitMedia(config().livekit, {
    async updateParticipant(...args) { calls.push(['update', ...args]); },
    async removeParticipant(...args) { calls.push(['remove', ...args]); },
    async deleteRoom(...args) { calls.push(['delete', ...args]); },
    async listRooms() { return [{ name: room }, { name: 'https://native.world.table' }, { name: 'a'.repeat(64) }]; },
  });
  await media.retireRoom(room, 'old-speaker');
  assert.deepEqual(calls.map(c => c[0]), ['update', 'remove', 'delete']);
  assert.equal(calls[0][3].permission.canPublish, false);
  assert.deepEqual(calls[0][3].permission.canPublishSources, []);
  calls.length = 0; await media.cleanupOrphans(ROOM_PATTERN);
  assert.deepEqual(calls, [['delete', room]]);
});

test('a failed room rotation fails closed and never returns a new publisher token', async () => {
  const f = await fixture(), id = f.session();
  f.controller.media.retireRoom = async () => { throw new Error('synthetic network failure'); };
  await rejectCode(f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one'), 'unavailable', 503);
  assert.equal(f.controller.lease, null); assert.equal(f.controller.ready, false); assert.equal(f.tokens.length, 0);
});

test('release while the SDK is issuing a speaker token prevents a late grant response', async () => {
  let finish;
  const f = await fixture({ media: { issueToken: () => new Promise(resolve => { finish = resolve; }) } });
  const id = f.session();
  const claim = f.controller.claim(auth, id, { code: syntheticCode, position: point }, 'ip-one');
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  const leaseId = f.controller.lease.id;
  await f.controller.release(auth, id, leaseId);
  finish('late-token-that-must-not-be-returned');
  await rejectCode(claim, 'lease_expired', 410);
  assert.equal(f.controller.lease, null);
});

test('listener token issuance cannot race a room rotation into returning a retired token', async () => {
  let finish;
  const f = await fixture({ media: { issueToken: () => new Promise(resolve => { finish = resolve; }) } });
  const id = f.session();
  const listen = f.controller.listen(auth, id);
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  const old = f.controller.room;
  await f.controller.rotate(); finish('retired-listener-token');
  await rejectCode(listen, 'epoch_changed', 409);
  assert.notEqual(f.controller.room, old);
});

test('fresh process initialization uses a fresh cryptographic epoch', async () => {
  const cfg = config();
  const media = { async createRoom() {}, async retireRoom() {}, async cleanupOrphans() {} };
  const first = new HallAudioController({ config: cfg, media, verifyCode: async () => true });
  const second = new HallAudioController({ config: cfg, media, verifyCode: async () => true });
  await first.initialize(); await second.initialize();
  assert.notEqual(first.room, second.room);
  assert.notEqual(first.gatewayId, second.gatewayId);
  assert.ok(ROOM_PATTERN.test(first.room)); assert.ok(ROOM_PATTERN.test(second.room));
});

test('HTTP rejects unauthorized, expired, cross-origin and spoofed identity requests', async t => {
  const f = await fixture();
  const server = createGatewayServer({ config: f.config, controller: f.controller,
    verify: createVerifier(testSecret, { clock: f.clock }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = 'http://127.0.0.1:' + server.address().port + '/castle-audio/';
  const token = await new SignJWT({ identifier: auth.identifier, username: auth.name })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime(f.clock() / 1000 + 60).sign(key);
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const post = (route, body, extra = {}) => fetch(base + route, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  assert.equal((await fetch(base + 'state')).status, 401);
  assert.equal((await post('session', { mapId: f.config.map.id }, { Origin: 'https://evil.invalid' })).status, 403);
  const response = await post('session', { mapId: f.config.map.id, identifier: other.identifier, email: other.identifier });
  const id = (await response.json()).sessionId;
  assert.equal(f.controller.sessions.get(id).identifier, auth.identifier);
  const state = await fetch(base + 'state', { headers: { ...headers, 'X-Hall-Session': id } });
  assert.equal(state.status, 200); assert.equal(state.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(base + 'state?token=forbidden')).status, 404);
  assert.equal((await post('session', { mapId: 'other-map' })).status, 403);
  f.advance(61000);
  assert.equal((await post('session', { mapId: f.config.map.id })).status, 401);
});

test('forwarded IP is trusted only from explicitly configured proxy peers', () => {
  const req = { socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: { 'x-real-ip': '203.0.113.9' } };
  assert.equal(clientIp(req, { trustedProxyIps: [] }), '127.0.0.1');
  assert.equal(clientIp(req, { trustedProxyIps: ['127.0.0.1'] }), '203.0.113.9');
});

test('widget uses bounded polling, only speaker microphone capture, no token/code persistence or URL transport', () => {
  const source = fs.readFileSync(path.join(root, 'public/widget.js'), 'utf8');
  assert.match(source, /WA\.player\.getPosition\(\)/);
  assert.match(source, /pollPosition\(\); }, 500/);
  assert.match(source, /pollState\(\); }, 2000/);
  assert.match(source, /heartbeat\(\); }, 1000/);
  assert.match(source, /Math\.min\(config\.freshnessMs, 4500\)/);
  assert.match(source, /getById\(own\.id\)/);
  assert.match(source, /track\.mediaStreamTrack\.stop\(\)/);
  assert.equal((source.match(/createLocalAudioTrack\(/g) || []).length, 1);
  assert.doesNotMatch(source, /localStorage\.(setItem|removeItem)|sessionStorage|console\.|createLocalVideoTrack|setMicrophoneEnabled|setCameraEnabled/);
  assert.doesNotMatch(source, /searchParams|sendBeacon/);
  assert.doesNotMatch(source, /document\.hidden/);
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  for (const [name, version] of Object.entries({ jose: '6.2.3', 'livekit-client': '2.19.2', 'livekit-server-sdk': '2.15.3' })) {
    assert.equal(lock.packages['node_modules/' + name].version, version);
  }
  assert.ok(fs.existsSync(path.join(root, 'public/vendor/livekit-client.LICENSE')));
});

