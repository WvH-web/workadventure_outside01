import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const sharp = createRequire(import.meta.url)("../tools/castle-deps.cjs")("sharp");
const castle = new URL("../castle/", import.meta.url);
const art = new URL("art/grosse-halle-20261107/", castle);
const readJson = (url) => JSON.parse(fs.readFileSync(url, "utf8"));
const map = readJson(new URL("grosse-halle.tmj", castle));
const source = readJson(new URL("layout.json", art));
const properties = (o) => Object.fromEntries((o.properties || []).map((p) => [p.name, p.value]));
const layer = (name) => map.layers.find((l) => l.name === name);
const tileset = (name) => map.tilesets.find((t) => t.name === name);
const tileLayers = map.layers.filter((l) => l.type === "tilelayer");
const objects = map.layers.flatMap((l) => l.objects || []);
const collisions = layer("collisions").data;
const T = 32, W = 48, H = 32;
const rect = ({ x, y, width, height }) => ({ x, y, width, height });
const contains = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.width && y < r.y + r.height;
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const seats = layer("seating").objects.map((o) => {
  const p = properties(o);
  return { id: p.seatId, label: p.seatLabel, x: p.seatX, y: p.seatY, standX: p.standX, standY: p.standY, facing: p.facing, audioGroup: p.audioGroup };
});
const groups = layer("conversationAreas").objects.map((o) => ({ ...rect(o), id: properties(o).conversationGroup }));
const entries = Object.fromEntries(tileLayers
  .filter((l) => l.name === "start" || properties(l).startLayer === true)
  .map((l) => {
    const n = l.data.findIndex(Boolean);
    return [l.name, [n % W, Math.floor(n / W)]];
  }));
const exits = tileLayers.filter((l) => properties(l).exitUrl);
const portalCells = new Set(exits.flatMap((l) => l.data.flatMap((gid, i) => gid ? [i] : [])));
const bodyFree = (x, y) => [x - 8, x + 8].every((xx) => [y - 8, y + 8].every((yy) =>
  xx >= 0 && yy >= 0 && xx < W * T && yy < H * T && !collisions[Math.floor(yy / T) * W + Math.floor(xx / T)]));
const center = ([x, y]) => [x * T + T / 2, y * T + T / 2];
const groupCounts = { kaminrunde: 6, "tafel-nord": 8, "tafel-sued": 8, lehrerbank: 4, spieltreff: 4 };
const expectedEntries = {
  start: [23, 26], "vom-lehrerzimmer": [5, 9], mittelstufe: [17, 9], kino: [31, 9], bibliothek: [40, 9], "vom-og": [44, 9], schlosstor: [24, 26],
};
const expectedExits = {
  "door-lehrerzimmer": { x: 5, y: 7, width: 1, height: 1, url: "../teachersmeetingground.tmj" },
  "door-mittelstufe": { x: 17, y: 7, width: 1, height: 1, url: "mittelstufe.tmj#vom-flur" },
  "door-kino": { x: 31, y: 7, width: 1, height: 1, url: "kino.tmj#foyer" },
  "door-bibliothek": { x: 40, y: 7, width: 1, height: 1, url: "erdgeschoss.tmj#bibliothek-anreise" },
  "door-treppe": { x: 44, y: 7, width: 2, height: 1, url: "obergeschoss.tmj#vom-eg" },
  "door-schlosstor": { x: 23, y: 29, width: 2, height: 1, url: "umgebung.tmj#schlosstor" },
};
const imageCache = new Map();
function rgba(url) {
  const key = url.href;
  if (!imageCache.has(key)) imageCache.set(key, sharp(fs.readFileSync(url)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
  return imageCache.get(key);
}
function* propertyOwners(value) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value.properties)) yield value;
  for (const [key, child] of Object.entries(value)) if (key !== "properties") {
    if (Array.isArray(child)) for (const item of child) yield* propertyOwners(item);
    else yield* propertyOwners(child);
  }
}
function reachedTiles() {
  const start = entries.start[1] * W + entries.start[0], seen = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i], x = n % W, y = Math.floor(n / W);
    for (const [xx, yy] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const next = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || collisions[next] || portalCells.has(next) || seen.has(next)) continue;
      seen.add(next); queue.push(next);
    }
  }
  return seen;
}
let bodyRoutes;
function reachedBodies() {
  if (bodyRoutes) return bodyRoutes;
  // A sub-tile flood fill catches passages that are tile-connected but too narrow for the body.
  const step = 4, cols = W * T / step;
  const key = (x, y) => Math.round(y / step) * cols + Math.round(x / step);
  const start = center(entries.start), seen = new Set([key(...start)]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [xx, yy] of [[x - step, y], [x + step, y], [x, y - step], [x, y + step]]) {
      if (xx < 8 || yy < 8 || xx >= W * T - 8 || yy >= H * T - 8) continue;
      const next = key(xx, yy);
      if (seen.has(next) || !bodyFree(xx, yy) || portalCells.has(Math.floor(yy / T) * W + Math.floor(xx / T))) continue;
      seen.add(next); queue.push([xx, yy]);
    }
  }
  const has = (x, y) => {
    const xx = Math.round(x / step) * step, yy = Math.round(y / step) * step;
    return seen.has(key(xx, yy)) && [0, 0.5, 1].every((t) => bodyFree(x + (xx - x) * t, y + (yy - y) * t));
  };
  return bodyRoutes = { has, positions: queue };
}
async function animationFrame(set, animatedLayer, baseX, baseY, side, frame) {
  const { data, info } = await rgba(new URL(set.image, castle));
  const output = Buffer.alloc(side * T * side * T * 4), width = side * T;
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const gid = animatedLayer.data[(baseY + y) * W + baseX + x];
    const tile = set.tiles.find((t) => t.id === gid - set.firstgid);
    assert.ok(tile?.animation, `Missing native quadrant at ${x},${y}`);
    const id = tile.animation[frame].tileid, sx = id % set.columns * T, sy = Math.floor(id / set.columns) * T;
    for (let row = 0; row < T; row++) data.copy(output, ((y * T + row) * width + x * T) * 4, ((sy + row) * info.width + sx) * 4, ((sy + row) * info.width + sx + T) * 4);
  }
  return output;
}

test("Great Hall is a native 48x32 map with valid grids, gids and local assets", async () => {
  assert.deepEqual([map.width, map.height, map.tilewidth, map.tileheight], [W, H, T, T]);
  assert.equal(map.infinite, false);
  assert.equal(map.orientation, "orthogonal");
  assert.equal(properties(map).castleMapId, "grosse-halle");
  assert.equal(properties(map).castleArtScale, 1);
  assert.equal(properties(map).script, "hall.js?v=20261107-hall1");
  assert.ok(!map.properties.some((p) => /playerScale|avatarScale/i.test(p.name)));
  for (const l of tileLayers) {
    assert.equal(l.data.length, W * H, l.name);
    assert.ok(l.data.every((gid) => Number.isInteger(gid) && (gid === 0 || map.tilesets.some((t) => gid >= t.firstgid && gid < t.firstgid + t.tilecount))), l.name);
  }
  let last = 0;
  for (const t of map.tilesets) {
    assert.ok(t.firstgid > last, t.name);
    last = t.firstgid + t.tilecount - 1;
    assert.deepEqual([t.tilewidth, t.tileheight], [T, T]);
    const { info } = await rgba(new URL(t.image, castle));
    assert.deepEqual([info.width, info.height], [t.imagewidth, t.imageheight], t.name);
    assert.equal(t.columns * T, t.imagewidth, t.name);
    assert.equal(t.tilecount, t.columns * t.imageheight / T, t.name);
  }
  const solidGids = new Set(map.tilesets.flatMap((t) => (t.tiles || []).filter((tile) => properties(tile).collides === true).map((tile) => t.firstgid + tile.id)));
  assert.ok(solidGids.size > 0);
  assert.ok(collisions.every((gid) => !gid || solidGids.has(gid)));
  const marker = await rgba(new URL(tileset("Entry marker").image, castle));
  assert.ok(marker.data.every((value) => value === 0));
  assert.ok(!tileset("Entry marker").tiles?.some((t) => properties(t).collides));
});

test("thirty distinct native seat sockets belong to five separate social groups", () => {
  assert.equal(seats.length, 30);
  assert.equal(new Set(seats.map((s) => s.id)).size, 30);
  assert.deepEqual(seats, source.seats);
  assert.equal(groups.length, 5);
  assert.deepEqual(groups.map((g) => g.id).sort(), Object.keys(groupCounts).sort());
  for (const [id, count] of Object.entries(groupCounts)) assert.equal(seats.filter((s) => s.audioGroup === id).length, count, id);
  for (const s of seats) {
    const matches = groups.filter((g) => contains(g, s.x, s.y));
    assert.equal(matches.length, 1, s.id);
    assert.equal(matches[0].id, s.audioGroup, s.id);
    assert.ok(contains(matches[0], s.standX, s.standY), s.id);
    assert.ok(["up", "down", "left", "right"].includes(s.facing), s.id);
    const o = layer("seating").objects.find((o) => properties(o).seatId === s.id);
    assert.deepEqual(rect(o), { x: s.x - 16, y: s.y - 16, width: 32, height: 32 }, s.id);
  }
  for (const [i, a] of groups.entries()) for (const b of groups.slice(i + 1)) assert.equal(overlaps(a, b), false, `${a.id} / ${b.id}`);
});

test("all seven return markers are clear and outside every exit trigger", () => {
  assert.deepEqual(entries, expectedEntries);
  assert.deepEqual(entries, source.entries);
  for (const [name, point] of Object.entries(entries)) {
    assert.equal(layer(name).data.filter(Boolean).length, 1, name);
    assert.ok(bodyFree(...center(point)), name);
    assert.equal(portalCells.has(point[1] * W + point[0]), false, name);
    if (name !== "start") assert.equal(properties(layer(name)).startLayer, true, name);
  }
});

test("six native exits have exact unobstructed portal cells and existing destinations", () => {
  assert.deepEqual(exits.map((l) => l.name).sort(), Object.keys(expectedExits).sort());
  assert.equal(portalCells.size, 8);
  for (const l of exits) {
    const e = expectedExits[l.name], points = [];
    for (let y = e.y; y < e.y + e.height; y++) for (let x = e.x; x < e.x + e.width; x++) points.push(y * W + x);
    assert.equal(properties(l).exitUrl, e.url, l.name);
    assert.deepEqual(l.data.flatMap((gid, n) => gid ? [n] : []), points, l.name);
    for (const n of points) assert.ok(bodyFree(...center([n % W, Math.floor(n / W)])), l.name);
    assert.ok(fs.existsSync(new URL(e.url.split("#")[0], castle)), e.url);
  }
  assert.equal(properties(layer("door-lehrerzimmer")).exitUrl, "../teachersmeetingground.tmj");
});

test("body-clear walking routes reach every entry, seat approach, action and exit without crossing another portal", () => {
  const visited = reachedTiles(), bodies = reachedBodies();
  for (const [name, point] of Object.entries(entries)) assert.ok(bodies.has(...center(point)), `entry ${name}`);
  for (const s of seats) {
    assert.ok(bodyFree(s.x, s.y), `seat body ${s.id}`);
    assert.ok(bodyFree(s.standX, s.standY), `standing body ${s.id}`);
    assert.ok(bodies.has(s.standX, s.standY), `standing route ${s.id}`);
  }
  for (const l of exits) for (const [n, gid] of l.data.entries()) if (gid) {
    const x = n % W, y = Math.floor(n / W);
    assert.ok([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([xx, yy]) =>
      xx >= 0 && yy >= 0 && xx < W && yy < H && visited.has(yy * W + xx) && bodies.has(...center([xx, yy]))), l.name);
  }
  for (const o of layer("hallActions").objects.filter((o) => properties(o).hallPodium || properties(o).hallAction))
    assert.ok(bodies.positions.some(([x, y]) => contains(o, x, y)), `action route ${o.name}`);
  for (let n = 0; n < W * H; n++) if (!collisions[n] && !portalCells.has(n) && !visited.has(n)) {
    const cell = { x: n % W * T, y: Math.floor(n / W) * T, width: T, height: T };
    assert.ok(layer("seating").objects.some((seat) => overlaps(cell, seat)), `Isolated non-seat floor at ${n % W},${Math.floor(n / W)}`);
  }
});

test("table centers, walls, books, lamps, lectern and noticeboard remain solid after seat clearance", () => {
  for (const r of source.collisionRects.filter((r) => r.preserve))
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (contains(r, ...center([x, y]))) assert.ok(collisions[y * W + x], `${r.id}: ${x},${y}`);
  for (const [x, y] of [[352, 496], [992, 464], [992, 656], [1376, 768], [112, 752], [768, 288], [1408, 480], [16, 400], [1520, 400], [752, 16], [752, 1008]])
    assert.equal(bodyFree(x, y), false, `Solid furniture/wall at ${x},${y}`);
});

test("the exact podium is the only silent area and is outside all conversation groups", () => {
  const podiums = objects.filter((o) => properties(o).hallPodium === true);
  assert.equal(podiums.length, 1);
  const podium = podiums[0];
  assert.deepEqual(rect(podium), { x: 624, y: 272, width: 288, height: 88 });
  assert.equal(properties(podium).silent, true);
  assert.equal(podium.properties.find((p) => p.name === "silent").type, "bool");
  assert.deepEqual([...propertyOwners(map)].filter((o) => properties(o).silent === true), [podium]);
  for (const g of groups) assert.equal(overlaps(g, podium), false, g.id);
  for (const s of seats) assert.equal(contains(podium, s.x, s.y), false, s.id);
  assert.ok(reachedBodies().positions.some(([x, y]) => contains(podium, x, y)));
});

test("noticeboard display and approach are separate and games expose their own Hall action", () => {
  const display = objects.filter((o) => properties(o).hallBoardDisplay === true);
  assert.equal(display.length, 1);
  assert.deepEqual(rect(display[0]), { x: 1343, y: 429, width: 120, height: 96 });
  assert.equal(properties(display[0]).hallAction, undefined);
  const board = objects.filter((o) => properties(o).hallAction === "noticeboard");
  assert.equal(board.length, 1);
  assert.notEqual(board[0].id, display[0].id);
  assert.deepEqual(rect(board[0]), { x: 1248, y: 384, width: 256, height: 224 });
  assert.equal(properties(board[0]).hallNoticeboardKey, "hallnotice01");
  assert.ok(contains(board[0], display[0].x, display[0].y));
  assert.ok(contains(board[0], display[0].x + display[0].width - 1, display[0].y + display[0].height - 1));
  assert.equal(bodyFree(display[0].x + display[0].width / 2, display[0].y + display[0].height / 2), false);
  const games = objects.filter((o) => properties(o).hallAction === "games");
  assert.equal(games.length, 1);
  assert.deepEqual(rect(games[0]), rect(groups.find((g) => g.id === "spieltreff")));
});

test("the public audio gateway does not enable native broadcasts or embed credentials", () => {
  const url = new URL(properties(map).hallAudioUrl);
  assert.equal(url.href, "https://together.deine-schule.com/castle-audio/");
  assert.equal(url.username, ""); assert.equal(url.password, ""); assert.equal(url.search, "");
  for (const owner of propertyOwners(map)) for (const p of owner.properties) {
    assert.doesNotMatch(p.name, /broadcast|megaphone|stream|jitsi|bbbMeeting|livekit/i, `${owner.name || "map"}: ${p.name}`);
    assert.doesNotMatch(p.name, /^(?:hall)?(?:pin|code|token|secret|password|authorization|accessCode|accessToken)$/i, p.name);
  }
  const publicJson = JSON.stringify([map, source]);
  assert.doesNotMatch(publicJson, /Bearer\s+[A-Za-z0-9._-]+|(?:password|access_token|api_key|pin)=/i);
});

test("all native animation layers avoid offsets and use valid synchronized frame indices", () => {
  for (const l of map.layers) {
    assert.equal(Object.hasOwn(l, "offsetx"), false, l.name);
    assert.equal(Object.hasOwn(l, "offsety"), false, l.name);
    assert.equal(l.x, 0, l.name); assert.equal(l.y, 0, l.name);
  }
  for (const t of map.tilesets) {
    assert.equal(t.tileoffset, undefined, t.name);
    for (const tile of t.tiles || []) for (const f of tile.animation || []) {
      assert.ok(Number.isInteger(f.tileid) && f.tileid >= 0 && f.tileid < t.tilecount, t.name);
      assert.ok(Number.isInteger(f.duration) && f.duration > 0, t.name);
    }
  }
  const fire = tileset("fire"), portrait = tileset("portrait");
  assert.equal(portrait.firstgid, fire.firstgid + fire.tilecount);
  assert.deepEqual(fire.tiles.map((t) => t.id), [0, 1, 14, 15]);
  assert.deepEqual(portrait.tiles.map((t) => t.id), [0, 1, 2, 24, 25, 26, 48, 49, 50]);
  for (const [set, name, x, y, side, stride] of [[fire, "hearth-flames", 9, 6, 2, 2], [portrait, "north-wall-portrait", 36, 1, 3, 3]]) {
    const l = layer(name);
    assert.equal(l.data.filter(Boolean).length, side * side, name);
    for (let dy = 0; dy < side; dy++) for (let dx = 0; dx < side; dx++) {
      const id = dy * set.columns + dx;
      assert.equal(l.data[(y + dy) * W + x + dx], set.firstgid + id, name);
      const animation = set.tiles.find((t) => t.id === id).animation;
      assert.ok(animation.every((f, i) => f.tileid === id + i * stride), name);
    }
  }
});

test("seven native fire frames move on the hearth and retain original 100ms timing", async () => {
  const fire = tileset("fire");
  assert.deepEqual([fire.imagewidth, fire.imageheight, fire.columns, fire.tilecount], [448, 64, 14, 28]);
  const original = readJson(new URL("../village/wa-headquarters.tmj", castle)).tilesets.find((t) => t.name === "fire").tiles.find((t) => t.id === 112).animation;
  assert.deepEqual(original.map((f) => f.tileid), [112, 156, 200, 244, 288, 332, 376]);
  for (const tile of fire.tiles) {
    assert.equal(tile.animation.length, 7);
    assert.deepEqual(tile.animation.map((f) => f.duration), original.map((f) => f.duration));
    assert.ok(tile.animation.every((f) => f.duration === 100));
  }
  const hashes = new Set();
  for (let i = 0; i < 7; i++) {
    const frame = await animationFrame(fire, layer("hearth-flames"), 9, 6, 2, i);
    hashes.add(createHash("sha256").update(frame).digest("hex"));
    let visible = 0;
    for (let p = 0; p < frame.length; p += 4) if (frame[p + 3]) {
      const pixel = p / 4, x = pixel % 64, y = Math.floor(pixel / 64);
      assert.ok(x >= 8 && x < 60 && y >= 20 && y < 56, `Flame outside hearth inset: ${i} at ${x},${y}`);
      visible++;
    }
    assert.ok(visible > 200, `Empty fire frame ${i}`);
  }
  assert.ok(hashes.size > 1, "Fire frames are static");
});

test("nine portrait animations reproduce all eight inset GIF frames exactly with original delays", async () => {
  const portrait = tileset("portrait"), gif = fs.readFileSync(new URL("art/portrait.gif", castle));
  const metadata = await sharp(gif, { animated: true }).metadata();
  const delays = [5500, 2400, 100, 140, 3000, 2500, 2200, 4000];
  assert.deepEqual([metadata.width, metadata.pageHeight, metadata.pages], [64, 96, 8]);
  assert.deepEqual(metadata.delay, delays);
  assert.deepEqual([portrait.imagewidth, portrait.imageheight, portrait.columns, portrait.tilecount], [768, 96, 24, 72]);
  for (const tile of portrait.tiles) assert.deepEqual(tile.animation.map((f) => f.duration), delays);
  const hashes = new Set();
  for (let i = 0; i < 8; i++) {
    const image = await sharp(gif, { page: i, pages: 1 }).resize(52, 64, { fit: "fill", kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
    const expected = Buffer.alloc(96 * 96 * 4);
    for (let y = 0; y < 64; y++) image.copy(expected, ((y + 24) * 96 + 20) * 4, y * 52 * 4, (y + 1) * 52 * 4);
    const actual = await animationFrame(portrait, layer("north-wall-portrait"), 36, 1, 3, i);
    assert.deepEqual(actual, expected, `Portrait frame ${i} differs or has nontransparent padding`);
    hashes.add(createHash("sha256").update(actual).digest("hex"));
  }
  assert.ok(hashes.size > 1, "Portrait frames are static");
  for (let y = 1; y <= 3; y++) for (let x = 36; x <= 38; x++) assert.ok(collisions[y * W + x], "Portrait must stay on the solid north wall");
});

test("native floor retains the entire 1:1 source image without cropping or shrinking avatars", async () => {
  const original = await rgba(new URL("source.png", art));
  const floor = await rgba(new URL(tileset("Grosse Halle").image, castle));
  assert.deepEqual([original.info.width, original.info.height], [1536, 1024]);
  assert.deepEqual([floor.info.width, floor.info.height], [1536, 1024]);
  assert.deepEqual(floor.data, original.data);
});

test("foreground copies exact furniture pixels and leaves every seated head and central walkway clear", async () => {
  const floor = await rgba(new URL(tileset("Grosse Halle").image, castle));
  const front = await rgba(new URL(tileset("Moebel-Vorderkanten").image, castle));
  const frontLayer = layer("furniture-fronts"), frontSet = tileset("Moebel-Vorderkanten"), frontCells = new Set();
  assert.ok(map.layers.indexOf(frontLayer) > map.layers.indexOf(layer("floorLayer")));
  let opaque = 0;
  for (let i = 0; i < front.data.length; i += 4) if (front.data[i + 3]) {
    opaque++;
    assert.equal(front.data[i + 3], 255);
    for (let c = 0; c < 4; c++) assert.equal(front.data[i + c], floor.data[i + c], `Changed furniture pixel at ${i / 4}`);
    const x = i / 4 % (W * T), y = Math.floor(i / 4 / (W * T));
    frontCells.add(Math.floor(y / T) * W + Math.floor(x / T));
  }
  assert.ok(opaque > 5000 && opaque < W * H * T * T / 10, "Foreground is missing or contains broad opaque cutouts");
  for (let n = 0; n < W * H; n++) assert.equal(frontLayer.data[n], frontCells.has(n) ? frontSet.firstgid + n : 0, `Foreground tile ${n}`);
  for (const s of seats) for (let y = s.y - 17; y < s.y - 3; y++) for (let x = s.x - 9; x < s.x + 9; x++)
    assert.equal(front.data[(y * W * T + x) * 4 + 3], 0, `Head masked at ${s.id}: ${x},${y}`);
  for (let y = 368; y < 832; y++) for (let x = 704; x < 800; x++) assert.equal(front.data[(y * W * T + x) * 4 + 3], 0, "Central aisle masks the avatar");
  const data = JSON.parse(properties(map).castleMapdata);
  assert.equal(data.foregroundPixels, opaque); assert.equal(data.foregroundTiles, frontCells.size);
});

test("saved Hall metadata and preview world agree with current native geometry", () => {
  const data = JSON.parse(properties(map).castleMapdata);
  assert.equal(data.blockedTiles, collisions.filter(Boolean).length);
  assert.equal(data.reachableFloorTiles, reachedTiles().size);
  assert.equal(data.portalTiles, portalCells.size);
  assert.equal(data.seats, seats.length);
  assert.deepEqual([data.pixelWidth, data.pixelHeight, data.tileSize, data.avatarSize], [1536, 1024, 32, 32]);
  const manifest = readJson(new URL("layout.json", castle));
  const world = manifest.worlds.find((w) => w.id === "grosse-halle");
  assert.ok(world, "Hall world is not registered in the saved preview manifest");
  assert.deepEqual([world.width, world.height, world.artScale], [W, H, 1]);
  assert.deepEqual(world.seats, seats);
  assert.deepEqual(world.entries, entries);
  assert.deepEqual(world.mapdata, data);
  assert.equal(world.rooms.length, 7);
  assert.equal(world.links.length, exits.length);
  for (const l of exits) {
    const e = expectedExits[l.name], [target, entry = ""] = e.url.split("#");
    const link = world.links.find((link) => link.name === l.name.slice(5));
    assert.ok(link, l.name);
    assert.deepEqual(rect(link), { x: e.x * T, y: e.y * T, width: e.width * T, height: e.height * T });
    assert.equal(link.target, target); assert.equal(link.entry || "", entry);
  }
});
