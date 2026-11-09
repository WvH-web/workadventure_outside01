import {clearPreviousCastleUi} from './ui-lifecycle.js?v=20261108-outdoors1';
const STATE = "castleSeatV1";
const PUBLIC = { public: true, persist: false };
const SYNC = ["cameraState", "microphoneState", "screenSharingState"];
const props = (object) =>
  Object.fromEntries((object.properties || []).map((p) => [p.name, p.value]));
const inside = (p, a) =>
  p.x >= a.x && p.y >= a.y && p.x < a.x + a.width && p.y < a.y + a.height;
export function seatingFacingPath(map, seat) {
  const grid=map.layers?.find(l=>l.type==='tilelayer'&&l.name==='collisions')?.data;
  if(!grid||map.tilewidth!==32||map.tileheight!==32)return null;
  const direction={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[seat.facing];
  if(!direction)return null;
  const free=p=>[p.x-8,p.x+8].every(x=>[p.y-8,p.y+8,p.y+24].every(y=>
    x>=0&&y>=0&&x<map.width*32&&y<map.height*32&&!grid[Math.floor(y/32)*map.width+Math.floor(x/32)]));
  let best=null,distance=Infinity;
  const cx=Math.floor(seat.standX/32),cy=Math.floor(seat.standY/32);
  for(let y=Math.max(1,cy-5);y<Math.min(map.height-1,cy+6);y++)for(let x=Math.max(1,cx-5);x<Math.min(map.width-1,cx+6);x++){
    const from={x:x*32+16,y:y*32},end={x:from.x+direction[0]*32,y:from.y+direction[1]*32};
    if(!free(from)||!free(end))continue;
    const score=Math.hypot(from.x-seat.standX,from.y-seat.standY)+Math.hypot(end.x-seat.standX,end.y-seat.standY);
    if(score<distance){distance=score;best={from,to:{x:end.x,y:end.y+16}};}
  }
  return best;
}
export function readLayout(map) {
  const result = {
    id: props(map).castleMapId,
    hallUrl: props(map).castleHallUrl,
    returnLabel: props(map).castleReturnLabel || 'Grosse Halle',
    nativeMeetings: props(map).castleNativeMeetings === true,
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
  result.facingPaths=Object.fromEntries(result.seats.map(s=>[s.id,seatingFacingPath(map,s)]));
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
async function bounded(promise, ms = 5000, operation = 'Castle action') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error(operation+" timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export function isNativeMeetingRoom(wa, layout) {
  if (!layout.nativeMeetings || !wa.room?.id) return false;
  try { return new URL(wa.room.id).pathname.endsWith('.wam'); }
  catch { return false; }
}
export function nativeRoomUrl(roomId, map, position) {
  if (!new URL(roomId).pathname.endsWith('.tmj')) throw Error('Castle source room must be a TMJ');
  const url = new URL(props(map).castleNativeRoomUrl || roomId);
  if (url.pathname.endsWith('.tmj')) url.pathname = url.pathname.slice(0, -4) + '.wam';
  url.search = '';
  let entry = 'start', nearest = 64 * 64;
  if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
    for (const layer of map.layers || []) {
      if (layer.type !== 'tilelayer' || (layer.name !== 'start' && props(layer).startLayer !== true)) continue;
      for (let index = 0; index < layer.data.length; index++) {
        if (!layer.data[index]) continue;
        const distance = (index % map.width * 32 + 16 - position.x) ** 2 +
          (Math.floor(index / map.width) * 32 + 16 - position.y) ** 2;
        if (distance < nearest) { nearest = distance; entry = layer.name; }
      }
    }
  }
  url.hash = entry;
  return url.href;
}
export class CastleRoom {
  constructor(wa, layout, options = {}) {
    this.wa = wa;
    this.layout = layout;
    this.uiIds={stand:'castle-stand-'+layout.id,ride:'castle-ride-stop-'+layout.id,back:'castle-return-hall-'+layout.id};
    this.uiCleanupTimers=[];
    this.beforeTravel=new Set();
    this.nativeMeetings = isNativeMeetingRoom(wa, layout);
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
    clearPreviousCastleUi(this.wa,this.layout.id);
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
    if (this.layout.hallUrl && this.wa.nav?.goToRoom)
      this.wa.ui.actionBar.addButton({id:this.uiIds.back, label:this.layout.returnLabel || 'Grosse Halle', callback:()=>{
        void this.returnToHall().catch((error)=>console.warn("Castle return:",error.message));
      }});
    if(this.wa.room?.getTiledMap)for(const delay of [700,2200])this.uiCleanupTimers.push(setTimeout(()=>{
      if(this.disposed)return;
      void bounded(this.wa.room.getTiledMap(),1500).then(map=>{
        if(!this.disposed&&props(map).castleMapId===this.layout.id)clearPreviousCastleUi(this.wa,this.layout.id);
      }).catch(()=>{});
    },delay));
    return this;
  }
  onBeforeTravel(callback) {
    this.beforeTravel.add(callback);
    return ()=>this.beforeTravel.delete(callback);
  }
  async returnToHall() {
    if (!this.layout.hallUrl || !this.wa.nav?.goToRoom || this.riding || this.navigating) return false;
    this.navigating = true;
    try {
      await this.stand();
      await Promise.allSettled([...this.beforeTravel].map(callback=>bounded(Promise.resolve().then(callback),2500,'Castle departure')));
      if (this.audioTask) await bounded(this.audioTask,2500).catch(()=>{});
      await this.wa.nav.goToRoom(this.layout.hallUrl);
      return true;
    } finally { this.navigating = false; }
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
    // Native meeting areas own media and bubble isolation; do not mute their tracks.
    if (this.nativeMeetings) { this.activeId = this.desired?.id || null; return; }
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
        5000,'Seat reservation',
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
        id: this.uiIds.stand,
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
      const alignment=this.layout.facingPaths?.[seat.id]||{
        from:{x:centre.x-d[0]*32,y:centre.y-16-d[1]*32},to:centre,
      };
      await bounded(
        this.wa.player.teleport(alignment.from.x,alignment.from.y),5000,'Seat alignment position',
      );
      if (this.disposed || this.seat !== seat) return false;
      try {
        await bounded(this.wa.player.moveTo(alignment.to.x, alignment.to.y, 4), 2500,'Seat orientation');
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
    this.wa.ui.actionBar.removeButton(this.uiIds.stand);
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
      id: this.uiIds.ride,
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
      this.wa.ui.actionBar.removeButton(this.uiIds.ride);
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
    for(const timer of this.uiCleanupTimers)clearTimeout(timer);
    for(const callback of this.beforeTravel)void bounded(Promise.resolve().then(callback),2500,'Castle departure').catch(()=>{});
    this.beforeTravel.clear();
    this.prompt?.remove();
    this.wa.ui.actionBar.removeButton(this.uiIds.stand);
    this.wa.ui.actionBar.removeButton(this.uiIds.ride);
    this.wa.ui.actionBar.removeButton(this.uiIds.back);
    for (const sub of this.subscriptions) sub?.unsubscribe?.();
    this.wa.controls.restorePlayerControls();
    if (!this.nativeMeetings) this.wa.controls.restorePlayerProximityMeeting();
    if (this.active) void Promise.resolve(this.active.leave()).catch(() => {});
    void this.wa.player.state.saveVariable(STATE, null, PUBLIC).catch(() => {});
  }
}
export const castleRoomReady = typeof WA !== "undefined"
  ? WA.onInit()
    .then(async () => {
      const map = await WA.room.getTiledMap(), layout = readLayout(map);
      if (layout.nativeMeetings && !isNativeMeetingRoom(WA, layout)) {
        const position = await bounded(WA.player.getPosition(), 1500).catch(() => null);
        await WA.nav.goToRoom(nativeRoomUrl(WA.room.id, map, position));
        return null;
      }
      const room = new CastleRoom(WA, layout);
      await room.start();
      window.castleRoom = room;
      window.addEventListener("pagehide", () => room.dispose(), { once: true });
      return room;
    })
    .catch((e) => { console.error("Castle room initialization:", e.message); return null; })
  : Promise.resolve(null);
