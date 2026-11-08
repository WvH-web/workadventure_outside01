import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { readLayout, conversationAt, CastleRoom } from "../castle/room.js";
const base = new URL("../castle/", import.meta.url);
const sharp = createRequire(import.meta.url)("../tools/castle-deps.cjs")(
  "sharp",
);
const manifest = JSON.parse(fs.readFileSync(new URL("layout.json", base)));
const maps = new Map(
  manifest.worlds.map((w) => [
    w.id,
    JSON.parse(fs.readFileSync(new URL(w.id + ".tmj", base))),
  ]),
);
const dataOf = (m) => m.layers.find((l) => l.name === "collisions").data;
const free = (m, x, y) =>
  x >= 7 &&
  y >= 7 &&
  x < m.width * 32 - 7 &&
  y < m.height * 32 - 7 &&
  [x - 6, x + 6].every((px) =>
    [y - 6, y + 6].every(
      (py) => !dataOf(m)[Math.floor(py / 32) * m.width + Math.floor(px / 32)],
    ),
  );
function reached(map, start) {
  const data = dataOf(map),
    seen = new Set(),
    q = [[...start]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i],
      n = y * map.width + x;
    if (
      x < 0 ||
      y < 0 ||
      x >= map.width ||
      y >= map.height ||
      data[n] ||
      seen.has(n)
    )
      continue;
    seen.add(n);
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}
test("five modular maps have valid native grids, gids and local assets", () => {
  assert.equal(maps.size, 5);
  for (const map of maps.values()) {
    assert.equal(map.tilewidth, 32);
    assert.equal(map.tileheight, 32);
    for (const ts of map.tilesets) {
      assert.ok(fs.existsSync(new URL(ts.image, base)));
      const image = fs.readFileSync(new URL(ts.image, base));
      assert.equal(image.readUInt32BE(16), ts.imagewidth);
      assert.equal(image.readUInt32BE(20), ts.imageheight);
      assert.equal(ts.columns * 32, ts.imagewidth);
      assert.ok(ts.imagewidth <= 4096 && ts.imageheight <= 4096);
    }
    const collisionGids = new Set(
      map.tilesets.flatMap((ts) =>
        (ts.tiles || [])
          .filter((t) =>
            t.properties?.some(
              (p) => p.name === "collides" && p.value === true,
            ),
          )
          .map((t) => ts.firstgid + t.id),
      ),
    );
    assert.ok(collisionGids.size > 0);
    assert.ok(dataOf(map).every((g) => !g || collisionGids.has(g)));
    for (const layer of map.layers.filter((l) => l.type === "tilelayer")) {
      assert.equal(layer.data.length, map.width * map.height);
      assert.ok(
        layer.data.every(
          (g) =>
            Number.isInteger(g) &&
            (g === 0 ||
              map.tilesets.some(
                (ts) => g >= ts.firstgid && g < ts.firstgid + ts.tilecount,
              )),
        ),
      );
    }
  }
});

test("illustrated common room has twelve distinct seats in three separate conversation groups", () => {
  const map = maps.get("mittelstufe"),
    layout = readLayout(map);
  assert.equal(map.width, 30);
  assert.equal(map.height, 20);
  assert.equal(
    map.properties.find((p) => p.name === "castleArtScale").value,
    1.25,
  );
  assert.equal(layout.seats.length, 12);
  assert.equal(new Set(layout.seats.map((s) => s.id)).size, 12);
  assert.equal(layout.groups.length, 3);
  for (const seat of layout.seats) {
    assert.equal(
      conversationAt(layout, seat, seat).id,
      "area-" + seat.audioGroup,
    );
    assert.equal(
      conversationAt(layout, { x: seat.standX, y: seat.standY }, null).id,
      "area-" + seat.audioGroup,
    );
  }
  assert.equal(conversationAt(layout, { x: 480, y: 560 }, null), null);
  for (const a of layout.groups)
    for (const b of layout.groups) {
      if (a === b) continue;
      assert.ok(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      );
    }
  const floorIndex = map.layers.findIndex((l) => l.name === "floorLayer");
  assert.ok(
    map.layers.findIndex((l) => l.name === "furniture-fronts") > floorIndex,
  );
  const fire = map.tilesets.find((t) => t.name === "fire");
  assert.equal(fire.tiles.length, 6);
  assert.ok(
    fire.tiles.every(
      (t) =>
        t.animation.length === 7 &&
        t.animation.every((f) => f.tileid < fire.tilecount),
    ),
  );
  const audio = map.layers.find((l) => l.name === "ambience").objects[0];
  const audioPath = audio.properties.find((p) => p.name === "playAudio").value;
  assert.ok(fs.existsSync(new URL(audioPath, base)));
});
test("every entry and seat fits an avatar body and is reachable", () => {
  const failures = [];
  for (const world of manifest.worlds) {
    const m = maps.get(world.id),
      visited = reached(m, world.entries.start);
    for (const [name, p] of Object.entries(world.entries))
      if (
        !free(m, p[0] * 32 + 16, p[1] * 32 + 16) ||
        !visited.has(p[1] * m.width + p[0])
      )
        failures.push(`${world.id}: entry ${name}`);
    for (const s of world.seats) {
      if (!free(m, s.x, s.y)) failures.push(`${world.id}: seat ${s.id}`);
      if (
        !free(m, s.standX, s.standY) ||
        !visited.has(
          Math.floor(s.standY / 32) * m.width + Math.floor(s.standX / 32),
        )
      )
        failures.push(`${world.id}: approach ${s.id}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("illustrated foreground copies original furniture pixels without opaque rectangular cutouts", async () => {
  const art = new URL("art/mittelstufe-20261107/", base);
  const map = maps.get("mittelstufe");
  const source = await sharp(
    fs.readFileSync(new URL("source-ms3.png", art)),
  ).metadata();
  assert.equal(source.width, 1536);
  assert.equal(source.height, 1024);
  const floor = await sharp(
    fs.readFileSync(new URL(map.tilesets[0].image, base)),
  )
    .ensureAlpha()
    .raw()
    .toBuffer();
  const fronts = await sharp(
    fs.readFileSync(
      new URL(
        map.tilesets.find((t) => t.name === "Moebel-Vorderkanten").image,
        base,
      ),
    ),
  )
    .ensureAlpha()
    .raw()
    .toBuffer();
  for (const seat of readLayout(map).seats) {
    let visible = 0;
    for (let y = seat.y - 16; y < seat.y - 6; y++)
      for (let x = seat.x - 6; x < seat.x + 6; x++)
        if (!fronts[(y * 960 + x) * 4 + 3]) visible++;
    assert.ok(visible >= 72, `Head covered by foreground at ${seat.id}`);
  }
  let opaque = 0;
  for (let i = 0; i < fronts.length; i += 4) {
    if (!fronts[i + 3]) continue;
    opaque++;
    assert.equal(fronts[i + 3], 255);
    assert.deepEqual(fronts.subarray(i, i + 4), floor.subarray(i, i + 4));
  }
  assert.ok(opaque > 5000 && opaque < 25000);
  assert.equal(
    fronts[(560 * 960 + 480) * 4 + 3],
    0,
    "Main walkway must not cover avatar",
  );
});

test("common room preview and native map share the new geometry without shrinking the avatar", () => {
  const map = maps.get("mittelstufe"),
    world = manifest.worlds.find((w) => w.id === "mittelstufe");
  assert.equal(world.width, map.width);
  assert.equal(world.height, map.height);
  assert.deepEqual(world.seats, readLayout(map).seats);
  assert.ok(world.width * world.height > 24 * 16);
  for (const y of [240, 336, 432, 560])
    assert.ok(free(map, 480, y), "Central route blocked at " + y);
  for (const [x, y] of [
    [704, 336],
    [256, 272],
    [480, 208],
    [64, 224],
  ])
    assert.equal(free(map, x, y), false, "Furniture or wall has no collision");
  assert.ok(
    !map.properties.some((p) => /playerScale|avatarScale/.test(p.name)),
  );
  const front = map.layers.find((l) => l.name === "furniture-fronts");
  assert.ok(front.data.filter(Boolean).length < 100);
});
test("internal doors have real return destinations away from arrival triggers", () => {
  for (const world of manifest.worlds)
    for (const door of world.links.filter((l) => !l.target.startsWith("../"))) {
      const source = maps.get(world.id),
        visited = reached(source, world.entries.start);
      assert.ok(
        visited.has(
          Math.floor(door.y / 32) * source.width + Math.floor(door.x / 32),
        ),
        `${world.id}: inaccessible door ${door.name}`,
      );
      const target = manifest.worlds.find(
        (w) => w.id === door.target.replace(".tmj", ""),
      );
      assert.ok(target, door.target);
      const p = target.entries[door.entry || "start"];
      assert.ok(p);
      const pos = { x: p[0] * 32 + 16, y: p[1] * 32 + 16 };
      assert.ok(
        !target.links.some(
          (l) =>
            pos.x >= l.x &&
            pos.x < l.x + l.width &&
            pos.y >= l.y &&
            pos.y < l.y + l.height,
        ),
        `${world.id} -> ${target.id} arrival loop`,
      );
    }
});
test("all 48 front cinema seats are quiet; all 16 rear seats have table groups", () => {
  const layout = readLayout(maps.get("kino"));
  assert.equal(layout.seats.length, 64);
  const front = layout.seats.filter((s) => !s.audioGroup),
    rear = layout.seats.filter((s) => s.audioGroup);
  assert.equal(front.length, 48);
  assert.equal(rear.length, 16);
  for (const s of front)
    assert.equal(conversationAt(layout, s, s)?.quiet, true);
  for (const s of rear) {
    assert.equal(conversationAt(layout, s, s)?.quiet, undefined);
    assert.ok(conversationAt(layout, s, s)?.id.startsWith("table-"));
  }
});
test("reading group joins separate tables and covers standing participants too", () => {
  const layout = readLayout(maps.get("erdgeschoss"));
  const left = layout.seats.find((s) => s.id === "lesen-1-n0"),
    right = layout.seats.find((s) => s.id === "lesen-2-s0");
  assert.equal(
    conversationAt(layout, left, left).id,
    "area-bibliothek-lesekreis",
  );
  assert.equal(
    conversationAt(layout, right, right).id,
    "area-bibliothek-lesekreis",
  );
  assert.equal(
    conversationAt(layout, { x: left.standX, y: left.standY }, null).id,
    "area-bibliothek-lesekreis",
  );
  assert.equal(conversationAt(layout, { x: 1400, y: 1300 }, null), null);
});
test("portraits, fireplaces, water and occasional ambience use native animation frames", () => {
  assert.ok(manifest.animations.length >= 30);
  const ts = maps.get("erdgeschoss").tilesets[0];
  for (const animation of manifest.animations) {
    assert.ok(animation.animation.length > 1);
    assert.ok(
      animation.animation.every(
        (f) => f.tileid >= 0 && f.tileid < ts.tilecount && f.duration > 0,
      ),
    );
  }
  for (const name of ["portrait", "fireplace", "fountain", "book"]) {
    const data = fs.readFileSync(new URL("art/" + name + ".gif", base));
    assert.equal(data.subarray(0, 3).toString(), "GIF");
    assert.ok(data.length > 100);
  }
});
test("published layouts do not contain private routes or private reference images", () => {
  for (const map of maps.values()) {
    assert.ok(
      !/secret|geheim|hiddenPassage|privateRoute/i.test(JSON.stringify(map)),
    );
  }
  const names = fs.readdirSync(new URL("art/", base));
  assert.ok(!names.some((n) => /dorfplan|04-dorf|private/i.test(n)));
});
function observable() {
  const f = new Set();
  return {
    subscribe(fn) {
      f.add(fn);
      return {
        unsubscribe() {
          f.delete(fn);
        },
      };
    },
    emit(p) {
      for (const fn of f) fn(p);
    },
  };
}
function fixture() {
  const moved = observable(),
    changed = observable(),
    state = {},
    remotes = [],
    calls = {
      joined: [],
      leaves: 0,
      prox: true,
      controls: true,
      buttons: new Map(),
    };
  let position = { x: 0, y: 0 };
  const wa = {
    player: {
      playerId: 2,
      state: {
        saveVariable: async (k, v) => {
          state[k] = v;
        },
      },
      getPosition: async () => position,
      teleport: async (x, y) => {
        position = { x, y };
        moved.emit(position);
      },
      moveTo: async (x, y) => {
        position = { x, y };
        moved.emit(position);
      },
      onPlayerMove: (fn) => moved.subscribe(fn),
    },
    players: {
      configureTracking: async () => {},
      list: () => remotes.values(),
      onVariableChange: () => changed,
    },
    controls: {
      disablePlayerControls: () => (calls.controls = false),
      restorePlayerControls: () => (calls.controls = true),
      disablePlayerProximityMeeting: () => (calls.prox = false),
      restorePlayerProximityMeeting: () => (calls.prox = true),
    },
    ui: {
      displayActionMessage: (data) => {
        calls.prompt = data;
        return { remove() {} };
      },
      actionBar: {
        addButton: (b) => calls.buttons.set(b.id, b),
        removeButton: (id) => calls.buttons.delete(id),
      },
    },
    spaces: {
      joinSpace: async (name, filter, sync) => {
        calls.joined.push({ name, filter, sync });
        return { leave: async () => calls.leaves++ };
      },
    },
  };
  return { wa, calls, state, remotes, moved, changed };
}
const settle = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
};

test("fresh positions restore seating prompts and group audio after stale movement notifications", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("mittelstufe"));
  const room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  try {
    const s = layout.seats.find((s) => s.id === "sofa-rechts");
    await f.wa.player.teleport(s.standX, s.standY);
    f.moved.emit({ x: 480, y: 560, moving: false });
    assert.equal(room.promptId, "");
    await room.syncPosition();
    await settle();
    assert.equal(room.nearby().id, s.id);
    assert.equal(f.calls.prompt.message, "Hinsetzen");
    assert.ok(f.calls.joined.at(-1).name.endsWith("area-kaminrunde"));
  } finally {
    room.dispose();
  }
});

test("position polling neither overlaps nor replaces a newer movement event", async () => {
  const f = fixture(),
    room = new CastleRoom(f.wa, readLayout(maps.get("mittelstufe")));
  await room.start();
  try {
    let resolvePosition,
      calls = 0;
    f.wa.player.getPosition = () => {
      calls++;
      return new Promise((r) => {
        resolvePosition = r;
      });
    };
    const first = room.syncPosition(),
      second = room.syncPosition();
    await settle();
    assert.equal(calls, 1);
    f.moved.emit({ x: 480, y: 560 });
    resolvePosition({ x: 0, y: 0 });
    await Promise.all([first, second]);
    assert.deepEqual(room.position, { x: 480, y: 560 });
  } finally {
    room.dispose();
  }
});

test("late position responses cannot update a disposed room", async () => {
  const f = fixture(),
    room = new CastleRoom(f.wa, readLayout(maps.get("mittelstufe")));
  await room.start();
  let resolvePosition;
  f.wa.player.getPosition = () =>
    new Promise((r) => {
      resolvePosition = r;
    });
  const task = room.syncPosition();
  await settle();
  room.dispose();
  resolvePosition({ x: 348, y: 306 });
  await task;
  assert.deepEqual(room.position, { x: 0, y: 0 });
  assert.equal(f.calls.joined.length, 0);
});
test("group entry and departure change native conversation without changing microphone state", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("erdgeschoss")),
    room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  try {
    const a = layout.groups[0];
    f.moved.emit({ x: a.x + 20, y: a.y + 20 });
    await settle();
    assert.match(f.calls.joined.at(-1).name, /bibliothek-lesekreis/);
    assert.equal(f.calls.prox, false);
    assert.deepEqual(f.calls.joined.at(-1).sync, [
      "cameraState",
      "microphoneState",
      "screenSharingState",
    ]);
    f.moved.emit({ x: 0, y: 0 });
    await settle();
    assert.equal(f.calls.leaves, 1);
    assert.equal(f.calls.prox, true);
  } finally {
    room.dispose();
  }
});
test("cinema quiet mode does not create a group and restores proximity on leaving", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("kino")),
    room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  try {
    f.moved.emit({ x: 500, y: 500 });
    await settle();
    assert.equal(f.calls.prox, false);
    assert.equal(f.calls.joined.length, 0);
    f.moved.emit({ x: 24 * 32, y: 39 * 32 });
    await settle();
    assert.equal(f.calls.prox, true);
  } finally {
    room.dispose();
  }
});
test("native seating and standing preserve the avatar and clear transient state", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("erdgeschoss")),
    room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  try {
    const s = layout.seats.find((s) => s.id === "halle-west-n0");
    f.moved.emit({ x: s.standX, y: s.standY });
    assert.equal(await room.sit(s.id), true);
    assert.equal(f.calls.controls, false);
    assert.equal(f.state.castleSeatV1.stage, "seated");
    await room.stand();
    assert.equal(f.calls.controls, true);
    assert.equal(f.state.castleSeatV1, null);
  } finally {
    room.dispose();
  }
});

test("all twelve illustrated seats use native sitting and restore a reachable standing position", async () => {
  const f = fixture(),
    map = maps.get("mittelstufe"),
    layout = readLayout(map);
  const room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  try {
    for (const s of layout.seats) {
      f.moved.emit({ x: s.standX, y: s.standY });
      assert.equal(await room.sit(s.id), true, s.id);
      assert.deepEqual(await f.wa.player.getPosition(), { x: s.x, y: s.y });
      assert.equal(f.state.castleSeatV1.id, s.id);
      assert.equal(f.calls.controls, false);
      await settle();
      assert.ok(f.calls.joined.at(-1).name.endsWith("area-" + s.audioGroup));
      await room.stand();
      assert.deepEqual(await f.wa.player.getPosition(), {
        x: s.standX,
        y: s.standY,
      });
      assert.equal(f.calls.controls, true);
      assert.equal(f.state.castleSeatV1, null);
    }
    f.moved.emit({ x: 368, y: 440 });
    await settle();
    assert.equal(f.calls.prox, true);
  } finally {
    room.dispose();
  }
});
test("slide cancellation and exceptions always restore player controls", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("umgebung")),
    room = new CastleRoom(f.wa, layout, {
      delay: async () => {
        room.cancelRide();
      },
    });
  await room.start();
  try {
    const slide = layout.rides[0];
    f.moved.emit({ x: slide.x + 16, y: slide.y + 16 });
    await room.startRide(slide);
    assert.equal(f.calls.controls, true);
    assert.equal(f.calls.buttons.has("castle-ride-stop"), false);
    assert.equal(room.riding, false);
  } finally {
    room.dispose();
  }
});
test("a failed slide transport restores controls and removes the exit action", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("umgebung")),
    room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  try {
    const slide = layout.rides[0];
    f.moved.emit({ x: slide.x + 16, y: slide.y + 16 });
    f.wa.player.teleport = async () => {
      throw Error("transport unavailable");
    };
    await assert.rejects(room.startRide(slide), /transport unavailable/);
    assert.equal(f.calls.controls, true);
    assert.equal(f.calls.buttons.has("castle-ride-stop"), false);
  } finally {
    room.dispose();
  }
});
test("an occupied seat is not stolen and failed movement releases controls", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("erdgeschoss")),
    room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  try {
    const s = layout.seats[0];
    f.moved.emit({ x: s.standX, y: s.standY });
    f.remotes.push({
      playerId: 3,
      state: { castleSeatV1: { id: s.id, stage: "seated" } },
    });
    assert.equal(await room.sit(s.id), false);
    f.remotes.length = 0;
    f.wa.player.moveTo = async () => {
      throw Error("movement unavailable");
    };
    await assert.rejects(room.sit(s.id), /movement unavailable/);
    assert.equal(f.calls.controls, true);
    assert.equal(f.state.castleSeatV1, null);
  } finally {
    room.dispose();
  }
});
test("late audio joins are left when the map has already been disposed", async () => {
  const f = fixture(),
    layout = readLayout(maps.get("erdgeschoss"));
  let resolveJoin;
  f.wa.spaces.joinSpace = () =>
    new Promise((resolve) => {
      resolveJoin = resolve;
    });
  const room = new CastleRoom(f.wa, layout, { delay: async () => {} });
  await room.start();
  const a = layout.groups[0];
  f.moved.emit({ x: a.x + 16, y: a.y + 16 });
  await settle();
  room.dispose();
  resolveJoin({ leave: async () => f.calls.leaves++ });
  await settle();
  assert.equal(f.calls.leaves, 1);
  assert.equal(f.calls.prox, true);
});
