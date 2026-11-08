export const SEAT_KEY = 'teacherLoungeSeatV1';
const PUBLIC_STATE = { public: true, persist: false };
const SYNC_PROPERTIES = ['cameraState', 'microphoneState', 'screenSharingState'];
const STAND_BUTTON = 'teacher-lounge-stand';

function properties(object) {
  return Object.fromEntries((object.properties || []).map((entry) => [entry.name, entry.value]));
}

export function parseLoungeMap(map) {
  const seats = [];
  function walk(layers) {
    for (const layer of layers || []) {
      if (layer.layers) walk(layer.layers);
      for (const object of layer.objects || []) {
        const p = properties(object);
        if (p.seatId) {
          const seat = { id: p.seatId, label: p.seatLabel, x: p.seatX, y: p.seatY,
            standX: p.standX, standY: p.standY, facing: p.facing, audioGroup: p.audioGroup || null };
          if (![seat.x, seat.y, seat.standX, seat.standY].every(Number.isFinite)) throw Error('Invalid seat coordinates');
          seats.push(seat);
        }
      }
    }
  }
  walk(map.layers);
  return { seats, hallUrl: properties(map).teacherLoungeHallUrl };
}

export function bounded(promise, milliseconds = 4000) {
  let timer;
  return Promise.race([Promise.resolve(promise), new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error('Lounge action timed out')), milliseconds);
  })]).finally(() => clearTimeout(timer));
}

export class TeacherLounge {
  constructor(wa, layout, options = {}) {
    this.wa = wa;
    this.layout = layout;
    this.delay = options.delay || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.position = { x: 384, y: 432 };
    this.seat = null;
    this.phase = 'standing';
    this.prompt = null;
    this.promptKey = '';
    this.subscriptions = [];
    this.activeSpace = null;
    this.activeSpaceId = null;
    this.desiredSpaceId = null;
    this.audioTask = null;
    this.audioRetryAt = 0;
    this.disposed = false;
    this.standingTask = null;
  }

  async start() {
    await this.wa.players.configureTracking({ players: true, movement: true });
    await this.wa.player.state.saveVariable(SEAT_KEY, null, PUBLIC_STATE);
    this.position = await this.wa.player.getPosition();
    const changed = () => { this.reconcileSeat(); this.updatePrompt(); };
    this.subscriptions.push(this.wa.players.onVariableChange(SEAT_KEY).subscribe(changed));
    this.subscriptions.push(this.wa.players.onPlayerEnters.subscribe(changed));
    this.subscriptions.push(this.wa.players.onPlayerLeaves.subscribe(changed));
    this.subscriptions.push(this.wa.player.onPlayerMove((position) => {
      this.position = position;
      this.updatePrompt();
      this.updateAudio();
    }));
    this.heartbeat = setInterval(() => { changed(); this.updateAudio(); }, 1000);
    this.updatePrompt();
    this.updateAudio();
    if (this.layout.hallUrl && this.wa.nav?.goToRoom) this.wa.ui.actionBar.addButton({
      id: 'teacher-lounge-hall', label: 'Zur Grossen Halle', callback: () => {
        this.returnToHall().catch(error => console.warn('Lounge return failed:', error.message));
      }
    });
    return this;
  }

  async returnToHall() {
    if (this.navigating || !this.layout.hallUrl || !this.wa.nav?.goToRoom) return false;
    this.navigating = true;
    try {
      await this.stand();
      if (this.audioTask) await bounded(this.audioTask, 2500).catch(() => {});
      await this.wa.nav.goToRoom(this.layout.hallUrl);
      return true;
    } finally { this.navigating = false; }
  }

  othersAt(id) {
    return [...this.wa.players.list()].filter((player) => {
      const value = player.state[SEAT_KEY];
      return value && typeof value === 'object' && value.id === id && ['claiming', 'seated'].includes(value.stage);
    });
  }

  reconcileSeat() {
    if (!this.seat || this.phase === 'standing') return;
    // Tracking covers nearby occupants. Ties between simultaneous claims settle
    // deterministically, without a persistent lock left behind by disconnected tabs.
    if (this.othersAt(this.seat.id).some((p) => p.playerId < this.wa.player.playerId)) {
      this.stand().catch((error) => console.warn('Seat release failed:', error.message));
    }
  }

  nearestSeat() {
    return this.layout.seats.map((seat) => ({ seat, distance: Math.min(
      Math.hypot(this.position.x - seat.x, this.position.y - seat.y),
      Math.hypot(this.position.x - seat.standX, this.position.y - seat.standY)
    ) })).filter((entry) => entry.distance <= 52 && this.othersAt(entry.seat.id).length === 0)
      .sort((a, b) => a.distance - b.distance)[0]?.seat;
  }

  updatePrompt() {
    if (this.disposed) return;
    const candidate = this.seat || this.nearestSeat();
    const key = this.seat ? 'stand' : candidate?.id || '';
    if (key === this.promptKey) return;
    this.prompt?.remove(); this.prompt = null; this.promptKey = key;
    if (!candidate) return;
    this.prompt = this.wa.ui.displayActionMessage({
      message: this.seat ? 'Aufstehen' : `Hinsetzen: ${candidate.label}`,
      callback: () => { (this.seat ? this.stand() : this.sit(candidate.id)).catch((error) => console.warn('Seat action failed:', error.message)); }
    });
  }

  async sit(id) {
    if (this.disposed || this.seat || this.standingTask) return false;
    const seat = this.layout.seats.find((s) => s.id === id);
    if (!seat || this.othersAt(id).length || Math.min(
      Math.hypot(this.position.x - seat.x, this.position.y - seat.y),
      Math.hypot(this.position.x - seat.standX, this.position.y - seat.standY)
    ) > 80) return false;
    this.seat = seat; this.phase = 'claiming';
    try {
      await bounded(this.wa.player.state.saveVariable(SEAT_KEY, { id, stage: 'claiming' }, PUBLIC_STATE));
      await this.delay(260);
      if (this.seat !== seat || this.othersAt(id).some((p) => p.playerId < this.wa.player.playerId)) {
        await this.stand(); return false;
      }
      this.wa.ui.actionBar.addButton({ id: STAND_BUTTON, label: 'Aufstehen', callback: () => {
        this.stand().catch((error) => console.warn('Standing up failed:', error.message));
      } });
      this.wa.controls.disablePlayerControls();
      const direction = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[seat.facing] || [0, 1];
      const centre = { x: Math.floor(seat.x / 32) * 32 + 16, y: Math.floor(seat.y / 32) * 32 + 16 };
      // Native pathfinding treats a same-tile move as an empty path and picks a
      // neighbour instead. Approach from another tile, accounting for the feet.
      const turnFrom = { x: centre.x - direction[0] * 32,
        y: centre.y - 16 - direction[1] * 32 };
      await bounded(this.wa.player.teleport(turnFrom.x, turnFrom.y));
      if (this.disposed || this.seat !== seat) return false;
      try {
        // Keep the turn longer than one render frame, otherwise the engine can
        // snap to the endpoint without updating the avatar's direction.
        await bounded(this.wa.player.moveTo(centre.x, centre.y, 4), 2500);
      } catch (error) {
        if (!/No path found/i.test(error.message)) throw error;
      }
      if (this.disposed || this.seat !== seat) return false;
      // Native pathfinding finishes at a tile centre, not the exact chair socket.
      await bounded(this.wa.player.teleport(seat.x, seat.y));
      if (this.seat !== seat) return false;
      this.position = await bounded(this.wa.player.getPosition());
      this.phase = 'seated';
      await bounded(this.wa.player.state.saveVariable(SEAT_KEY, { id, stage: 'seated' }, PUBLIC_STATE));
      this.updatePrompt(); this.updateAudio();
      return true;
    } catch (error) {
      await this.stand();
      throw error;
    }
  }

  stand() {
    if (this.standingTask) return this.standingTask;
    const seat = this.seat;
    this.seat = null; this.phase = 'standing';
    this.prompt?.remove(); this.prompt = null; this.promptKey = '';
    this.wa.ui.actionBar.removeButton(STAND_BUTTON);
    this.standingTask = (async () => {
      try {
        const actions = [bounded(this.wa.player.state.saveVariable(SEAT_KEY, null, PUBLIC_STATE))];
        if (seat) actions.push(bounded(this.wa.player.teleport(seat.standX, seat.standY)));
        await Promise.allSettled(actions);
      } finally {
        this.wa.controls.restorePlayerControls();
        if (seat) this.position = { x: seat.standX, y: seat.standY };
        this.standingTask = null;
        this.updatePrompt(); this.updateAudio();
      }
    })();
    return this.standingTask;
  }

  updateAudio() {
    if (this.disposed) return;
    this.desiredSpaceId = this.phase === 'seated' ? this.seat?.audioGroup || null : null;
    if (this.audioTask || this.desiredSpaceId === this.activeSpaceId || Date.now() < this.audioRetryAt) return;
    this.audioTask = this.syncAudio().catch((error) => {
      this.audioRetryAt = Date.now() + 5000;
      console.warn('Lounge audio transition failed:', error.message);
    }).finally(() => { this.audioTask = null; });
  }

  async syncAudio() {
    while (!this.disposed && this.activeSpaceId !== this.desiredSpaceId) {
      if (this.activeSpace) {
        const previous = this.activeSpace;
        this.activeSpace = null; this.activeSpaceId = null;
        await bounded(previous.leave());
      }
      const desired = this.desiredSpaceId;
      if (!desired) return;
      let joined;
      try {
        // Each table has its own native two-way meeting. Standing up leaves it.
        const space = joined = await this.wa.spaces.joinSpace(`teacher-lounge-tables-v2-${desired}`, 'everyone', SYNC_PROPERTIES);
        if (this.disposed || desired !== this.desiredSpaceId) {
          await bounded(space.leave());
          continue;
        }
        this.activeSpace = space; this.activeSpaceId = desired;
      } catch (error) {
        if (joined) { try { await bounded(joined.leave()); } catch {} }
        this.audioRetryAt = Date.now() + 5000;
        console.warn('Lounge audio unavailable:', error.message);
        return;
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.seat = null; this.phase = 'standing';
    clearInterval(this.heartbeat);
    this.prompt?.remove(); this.prompt = null;
    this.wa.ui.actionBar.removeButton(STAND_BUTTON);
    this.wa.ui.actionBar.removeButton('teacher-lounge-hall');
    this.wa.controls.restorePlayerControls();
    const space = this.activeSpace;
    if (space) Promise.resolve().then(() => space.leave()).catch(() => {});
    this.activeSpace = null;
    for (const subscription of this.subscriptions) subscription?.unsubscribe?.();
    this.wa.player.state.saveVariable(SEAT_KEY, null, PUBLIC_STATE).catch(() => {});
  }
}

if (typeof WA !== 'undefined') {
  window.teacherLoungeInitState = 'waiting-for-api';
  WA.onInit().then(async () => {
    window.teacherLoungeInitState = 'reading-map';
    const lounge = new TeacherLounge(WA, parseLoungeMap(await WA.room.getTiledMap()));
    window.teacherLoungeInitState = 'tracking-players';
    await lounge.start();
    window.teacherLounge = lounge;
    window.teacherLoungeInitState = 'ready';
    window.addEventListener('pagehide', () => lounge.dispose(), { once: true });
  }).catch((error) => {
    window.teacherLoungeInitState = 'failed';
    console.error('Teacher lounge initialization failed:', error.message);
  });
}
