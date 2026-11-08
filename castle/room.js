const STATE = "castleSeatV1";
const PUBLIC = { public: true, persist: false };
const SYNC = ["cameraState", "microphoneState", "screenSharingState"];
const props = (object) =>
  Object.fromEntries((object.properties || []).map((p) => [p.name, p.value]));
const inside = (p, a) =>
  p.x >= a.x && p.y >= a.y && p.x < a.x + a.width && p.y < a.y + a.height;
export function readLayout(map) {
  const result = {
    id: props(map).castleMapId,
    seats: [],
    groups: [],
    quiet: [],
    rides: [],
  };
  function walk(layers) {
    for (const layer of layers || []) {
      if (layer.layers) walk(layer.layers);
      for (const o of layer.objects || []) {
        const p = props(o);
        if (p.seatId)
          result.seats.push({
            id: p.seatId,
            label: p.seatLabel,
            x: p.seatX,
            y: p.seatY,
            standX: p.standX,
            standY: p.standY,
            facing: p.facing,
            audioGroup: p.audioGroup,
          });
        if (p.conversationGroup)
          result.groups.push({
            ...o,
            group: p.conversationGroup,
            label: p.conversationLabel,
          });
        if (p.silent === true || p.silent === "true") result.quiet.push(o);
        if (p.castleRide)
          result.rides.push({ ...o, waypoints: JSON.parse(p.castleRide) });
      }
    }
  }
  walk(map.layers);
  return result;
}
export function conversationAt(layout, position, seat) {
  if (layout.quiet.some((a) => inside(position, a)))
    return { id: "quiet", label: "Ruhezone", quiet: true, area: false };
  const area = layout.groups.find((a) => inside(position, a));
  if (area) return { id: "area-" + area.group, label: area.label, area: true };
  return seat?.audioGroup
    ? { id: "table-" + seat.audioGroup, label: seat.label, area: false }
    : null;
}
async function bounded(promise, ms = 5000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error("Castle action timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export class CastleRoom {
  constructor(wa, layout, options = {}) {
    this.wa = wa;
    this.layout = layout;
    this.delay =
      options.delay || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.position = { x: 0, y: 0 };
    this.seat = null;
    this.prompt = null;
    this.promptId = "";
    this.subscriptions = [];
    this.active = null;
    this.activeId = null;
    this.desired = null;
    this.disposed = false;
    this.busy = false;
    this.audioTask = null;
    this.retryAt = 0;
    this.positionTask = null;
    this.positionRevision = 0;
    this.positionRetryAt = 0;
  }
  async start() {
    await this.wa.players.configureTracking({ players: true, movement: true });
    await this.wa.player.state.saveVariable(STATE, null, PUBLIC);
    this.position = await this.wa.player.getPosition();
    this.subscriptions.push(
      this.wa.player.onPlayerMove((p) => {
        this.positionRevision++;
        this.position = p;
        this.refresh();
      }),
    );
    this.subscriptions.push(
      this.wa.players.onVariableChange(STATE).subscribe(() => this.refresh()),
    );
    this.timer = setInterval(() => {
      this.refresh();
      void this.syncPosition();
    }, 400);
    this.refresh();
    return this;
  }
  syncPosition() {
    if (this.positionTask) return this.positionTask;
    if (
      this.disposed ||
      this.busy ||
      this.seat ||
      this.riding ||
      this.standingTask ||
      Date.now() < this.positionRetryAt
    )
      return Promise.resolve();
    const revision = this.positionRevision;
    // Movement notifications can lag behind the real position in the native client.
    this.positionTask = bounded(
      Promise.resolve().then(() => this.wa.player.getPosition()),
      1500,
    )
      .then((position) => {
        if (
          this.disposed ||
          this.busy ||
          this.seat ||
          this.riding ||
          this.standingTask ||
          revision !== this.positionRevision
        )
          return;
        this.position = position;
        this.refresh();
      })
      .catch((error) => {
        this.positionRetryAt = Date.now() + 5000;
        if (!this.disposed)
          console.warn("Castle position synchronization:", error.message);
      })
      .finally(() => {
        this.positionTask = null;
      });
    return this.positionTask;
  }
  occupants(id) {
    return [...this.wa.players.list()].filter((p) => p.state[STATE]?.id === id);
  }
  occupied(id) {
    return this.occupants(id).length > 0;
  }
  nearby() {
    return this.layout.seats
      .map((s) => ({
        s,
        d: Math.min(
          Math.hypot(this.position.x - s.x, this.position.y - s.y),
          Math.hypot(this.position.x - s.standX, this.position.y - s.standY),
        ),
      }))
      .filter((e) => e.d < 52 && !this.occupied(e.s.id))
      .sort((a, b) => a.d - b.d)[0]?.s;
  }
  refresh() {
    if (this.disposed) return;
    if (
      this.seat &&
      this.occupants(this.seat.id).some(
        (p) => p.playerId < this.wa.player.playerId,
      ) &&
      !this.busy
    )
      void this.stand();
    const slide = this.layout.rides.find((a) => inside(this.position, a));
    const candidate = this.seat || this.nearby(),
      key = this.riding
        ? "ride-stop"
        : this.seat
          ? "stand"
          : slide
            ? "ride-start"
            : candidate?.id || "";
    if (key !== this.promptId) {
      this.prompt?.remove();
      this.prompt = null;
      this.promptId = key;
      if (key)
        this.prompt = this.wa.ui.displayActionMessage({
          message: this.riding
            ? "Rutsche verlassen"
            : this.seat
              ? "Aufstehen"
              : slide
                ? "Rutschen"
                : "Hinsetzen",
          callback: () => {
            const action = this.riding
              ? this.cancelRide()
              : this.seat
                ? this.stand()
                : slide
                  ? this.startRide(slide)
                  : this.sit(candidate.id);
            void Promise.resolve(action).catch((e) => console.warn(e.message));
          },
        });
    }
    this.desired = conversationAt(this.layout, this.position, this.seat);
    if (
      !this.audioTask &&
      this.activeId !== (this.desired?.id || null) &&
      Date.now() >= this.retryAt
    ) {
      this.audioTask = this.routeAudio()
        .catch((e) => {
          this.retryAt = Date.now() + 5000;
          console.warn("Castle conversation:", e.message);
        })
        .finally(() => {
          this.audioTask = null;
        });
    }
  }
  async routeAudio() {
    while (!this.disposed && this.activeId !== (this.desired?.id || null)) {
      if (this.active) {
        const previous = this.active;
        this.active = null;
        this.activeId = null;
        await bounded(previous.leave());
      }
      this.activeId = null;
      this.wa.controls.restorePlayerProximityMeeting();
      const desired = this.desired;
      if (!desired) return;
      if (desired.quiet) {
        this.wa.controls.disablePlayerProximityMeeting();
        this.activeId = desired.id;
        continue;
      }
      let joined, pending;
      try {
        pending = this.wa.spaces.joinSpace(
          `school-castle-v1-${this.layout.id}-${desired.id}`,
          "everyone",
          SYNC,
        );
        joined = await bounded(pending);
        if (this.disposed || desired.id !== this.desired?.id) {
          await bounded(joined.leave());
          continue;
        }
        if (desired.area) this.wa.controls.disablePlayerProximityMeeting();
        this.active = joined;
        this.activeId = desired.id;
      } catch (error) {
        if (joined) await Promise.resolve(joined.leave()).catch(() => {});
        else if (pending)
          void Promise.resolve(pending)
            .then((late) => late.leave())
            .catch(() => {});
        this.wa.controls.restorePlayerProximityMeeting();
        throw error;
      }
    }
  }
  async sit(id) {
    const seat = this.layout.seats.find((s) => s.id === id);
    if (
      !seat ||
      this.seat ||
      this.busy ||
      this.riding ||
      this.standingTask ||
      this.occupied(id) ||
      Math.min(
        Math.hypot(this.position.x - seat.x, this.position.y - seat.y),
        Math.hypot(
          this.position.x - seat.standX,
          this.position.y - seat.standY,
        ),
      ) > 80
    )
      return false;
    this.busy = true;
    this.seat = seat;
    try {
      await bounded(
        this.wa.player.state.saveVariable(
          STATE,
          { id, stage: "claiming" },
          PUBLIC,
        ),
      );
      await this.delay(260);
      if (
        this.disposed ||
        this.seat !== seat ||
        this.occupants(id).some((p) => p.playerId < this.wa.player.playerId)
      ) {
        await this.stand();
        return false;
      }
      this.wa.ui.actionBar.addButton({
        id: "castle-stand",
        label: "Aufstehen",
        callback: () => {
          void this.stand();
        },
      });
      this.wa.controls.disablePlayerControls();
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
        seat.facing
      ];
      const centre = {
        x: Math.floor(seat.x / 32) * 32 + 16,
        y: Math.floor(seat.y / 32) * 32 + 16,
      };
      await bounded(
        this.wa.player.teleport(
          centre.x - d[0] * 32,
          centre.y - 16 - d[1] * 32,
        ),
      );
      if (this.disposed || this.seat !== seat) return false;
      try {
        await bounded(this.wa.player.moveTo(centre.x, centre.y, 4), 2500);
      } catch (e) {
        if (!/No path found/.test(e.message)) throw e;
      }
      if (this.disposed || this.seat !== seat) return false;
      await bounded(this.wa.player.teleport(seat.x, seat.y));
      await bounded(
        this.wa.player.state.saveVariable(
          STATE,
          { id, stage: "seated" },
          PUBLIC,
        ),
      );
      this.position = await this.wa.player.getPosition();
      this.refresh();
      return true;
    } catch (error) {
      await this.stand();
      throw error;
    } finally {
      this.busy = false;
    }
  }
  stand() {
    if (this.standingTask) return this.standingTask;
    const seat = this.seat;
    this.seat = null;
    this.wa.ui.actionBar.removeButton("castle-stand");
    this.standingTask = (async () => {
      try {
        await Promise.allSettled([
          bounded(this.wa.player.state.saveVariable(STATE, null, PUBLIC), 2500),
          ...(seat
            ? [bounded(this.wa.player.teleport(seat.standX, seat.standY), 2500)]
            : []),
        ]);
      } finally {
        this.wa.controls.restorePlayerControls();
        if (seat) this.position = { x: seat.standX, y: seat.standY };
        this.standingTask = null;
        this.refresh();
      }
    })();
    return this.standingTask;
  }
  cancelRide() {
    this.riding = false;
  }
  async startRide(slide) {
    if (this.riding || this.busy || this.seat || !inside(this.position, slide))
      return;
    this.riding = true;
    this.wa.controls.disablePlayerControls();
    this.wa.ui.actionBar.addButton({
      id: "castle-ride-stop",
      label: "Rutsche verlassen",
      callback: () => this.cancelRide(),
    });
    try {
      for (
        let i = 1;
        i < slide.waypoints.length && this.riding && !this.disposed;
        i++
      ) {
        const a = slide.waypoints[i - 1],
          b = slide.waypoints[i],
          steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 24);
        for (let n = 1; n <= steps && this.riding && !this.disposed; n++) {
          await bounded(
            this.wa.player.teleport(
              a.x + ((b.x - a.x) * n) / steps,
              a.y + ((b.y - a.y) * n) / steps,
            ),
          );
          await this.delay(80);
        }
      }
    } finally {
      this.riding = false;
      this.wa.ui.actionBar.removeButton("castle-ride-stop");
      if (!this.disposed) {
        const landing = slide.waypoints.at(-1);
        await bounded(this.wa.player.teleport(landing.x, landing.y)).catch(
          () => {},
        );
      }
      this.wa.controls.restorePlayerControls();
      this.refresh();
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.riding = false;
    clearInterval(this.timer);
    this.prompt?.remove();
    this.wa.ui.actionBar.removeButton("castle-stand");
    this.wa.ui.actionBar.removeButton("castle-ride-stop");
    for (const sub of this.subscriptions) sub?.unsubscribe?.();
    this.wa.controls.restorePlayerControls();
    this.wa.controls.restorePlayerProximityMeeting();
    if (this.active) void Promise.resolve(this.active.leave()).catch(() => {});
    void this.wa.player.state.saveVariable(STATE, null, PUBLIC).catch(() => {});
  }
}
if (typeof WA !== "undefined")
  WA.onInit()
    .then(async () => {
      const room = new CastleRoom(WA, readLayout(await WA.room.getTiledMap()));
      await room.start();
      window.castleRoom = room;
      window.addEventListener("pagehide", () => room.dispose(), { once: true });
    })
    .catch((e) => console.error("Castle room initialization:", e.message));
