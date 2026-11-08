const fs = require("node:fs");
const path = require("node:path");
const { nativeTarget, writeWam } = require("./castle-wam.cjs");
const { prepareHallFurniture } = require("./prepare-hall-furniture.cjs");
const sharp = require("./castle-deps.cjs")("sharp");
const root = path.resolve(__dirname, "..");
const art = path.join(root, "castle/art/grosse-halle-20261108-scale");
const artPath = "art/grosse-halle-20261108-scale/";
const P = (name, value) => ({
  name,
  type: typeof value === "boolean" ? "bool" : typeof value === "number" ? "float" : "string",
  value,
});
const contains = (r, x, y) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function geometry(layout) {
  const { width: W, height: H, tileSize: T, seats, entries, portals } = layout;
  if (W !== 48 || H !== 32 || T !== 32) throw Error("Great Hall must remain 48 x 32 native 32px tiles");
  const blocked = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (layout.collisionRects.some((r) => contains(r, x * T + T / 2, y * T + T / 2))) blocked.add(y * W + x);
  const cell = (x, y) => Math.floor(y / T) * W + Math.floor(x / T);
  const clearBody = (x, y) => {
    if (x < 8 || y < 8 || x >= W * T - 8 || y >= H * T - 8) throw Error(`Point outside hall: ${x},${y}`);
    for (const xx of [Math.floor((x - 8) / T), Math.floor((x + 8) / T)])
      for (const yy of [Math.floor((y - 8) / T), Math.floor((y + 8) / T)]) blocked.delete(yy * W + xx);
  };
  for (const p of portals) for (let y = p.y; y < p.y + p.height; y++)
    for (let x = p.x; x < p.x + p.width; x++) blocked.delete(y * W + x);
  for (const s of seats) {
    clearBody(s.x, s.y);
    clearBody(s.standX, s.standY);
  }
  for (const [x, y] of Object.values(entries)) clearBody(x * T + T / 2, y * T + T / 2);
  for (const r of layout.collisionRects.filter((r) => r.preserve))
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (contains(r, x * T + T / 2, y * T + T / 2) && !blocked.has(y * W + x))
        throw Error(`Seat/entry clears protected furniture or wall: ${r.id} at ${x},${y}`);

  // A closed portal is a route destination, never a corridor needed by another destination.
  const portalCells = new Set(portals.flatMap((p) => Array.from({ length: p.width * p.height }, (_, i) =>
    (p.y + Math.floor(i / p.width)) * W + p.x + i % p.width)));
  const start = entries.start[1] * W + entries.start[0], reachable = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i], x = n % W, y = Math.floor(n / W);
    for (const [xx, yy] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const next = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || blocked.has(next) || portalCells.has(next) || reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  for (const [name, [x, y]] of Object.entries(entries)) {
    const n = y * W + x;
    if (portalCells.has(n) || !reachable.has(n)) throw Error(`Unsafe or unreachable entry: ${name}`);
  }
  if (seats.length !== layout.measurements.expectedSeats || new Set(seats.map((s) => s.id)).size !== seats.length) throw Error("Unexpected hall seat count or duplicate IDs");
  for (const s of seats) {
    if (!reachable.has(cell(s.standX, s.standY))) throw Error(`Unreachable seat approach: ${s.id}`);
    if (blocked.has(cell(s.x, s.y))) throw Error(`Blocked seat: ${s.id}`);
    const group = layout.groups.find((g) => g.id === s.audioGroup);
    if (!group || !contains(group, s.x, s.y) || !contains(group, s.standX, s.standY)) throw Error(`Seat outside its group: ${s.id}`);
  }
  for (const p of portals) {
    let approaches = 0;
    for (let y = p.y; y < p.y + p.height; y++) for (let x = p.x; x < p.x + p.width; x++)
      for (const [xx, yy] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]])
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && reachable.has(yy * W + xx)) approaches++;
    if (!approaches) throw Error(`Unreachable portal: ${p.id}`);
  }
  for (const a of [layout.podium, layout.noticeboard.approach])
    if (![...reachable].some((n) => contains(a, (n % W) * T + T / 2, Math.floor(n / W) * T + T / 2)))
      throw Error(`Unreachable hall action: ${a.id}`);
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  if (layout.groups.some((g, i) => overlaps(g, layout.podium) || layout.groups.slice(i + 1).some((b) => overlaps(g, b))))
    throw Error("Conversation groups must remain separate from each other and the podium");
  return { blocked, reachable, portalCells };
}

async function buildFire(layout) {
  const T = layout.tileSize, hearth = layout.hearth;
  const fire = JSON.parse(fs.readFileSync(path.join(root, "village/wa-headquarters.tmj"), "utf8")).tilesets.find((t) => t.name === "fire");
  const animation = fire.tiles.find((t) => t.id === 112).animation;
  if (animation.length !== 7 || fire.columns !== 22) throw Error("Unexpected village fire animation");
  const sprites = [];
  for (const frame of animation) sprites.push(await sharp(path.join(root, "village/tilesets/fire.png"))
    .extract({ left: (frame.tileid % fire.columns) * T, top: Math.floor(frame.tileid / fire.columns) * T, width: T, height: T * 2 })
    .resize(24, 48, { kernel: "nearest" })
    .extract({ left: 0, top: 0, width: 24, height: 32 })
    .png().toBuffer());
  const frames = [];
  for (let i = 0; i < animation.length; i++) {
    const input = await sharp({ create: { width: 64, height: 64, channels: 4, background: "#00000000" } })
      .composite(hearth.flames.map((f) => ({ input: sprites[(i + f.phase) % sprites.length], left: f.x, top: f.y })))
      .png().toBuffer();
    frames.push({ input, left: i * 64, top: 0 });
  }
  await sharp({ create: { width: 448, height: 64, channels: 4, background: "#00000000" } })
    .composite(frames).png({ compressionLevel: 9 }).toFile(path.join(art, layout.render.fire));
  // Every quadrant follows the same composite frame. No tile-layer offsets are used.
  return [0, 1, 14, 15].map((id) => ({ id, animation: animation.map((f, i) => ({ tileid: id + i * 2, duration: f.duration })) }));
}

async function buildPortrait(layout) {
  const p = layout.portrait, file = path.join(root, p.source);
  const metadata = await sharp(file, { animated: true }).metadata();
  if (metadata.pages !== 8 || metadata.width !== 64 || metadata.pageHeight !== 96) throw Error("Unexpected existing portrait GIF geometry");
  const frames = [];
  for (let i = 0; i < metadata.pages; i++) {
    const portrait = await sharp(file, { page: i, pages: 1 })
      .resize(p.width, p.height, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
    const input = await sharp({ create: { width: 96, height: 96, channels: 4, background: "#00000000" } })
      .composite([{ input: portrait, left: p.insetX, top: p.insetY }]).png().toBuffer();
    frames.push({ input, left: i * 96, top: 0 });
  }
  await sharp({ create: { width: 768, height: 96, channels: 4, background: "#00000000" } })
    .composite(frames).png({ compressionLevel: 9 }).toFile(path.join(art, layout.render.portrait));
  const tiles = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const id = y * 24 + x;
    tiles.push({ id, animation: metadata.delay.map((duration, i) => ({ tileid: id + i * 3, duration })) });
  }
  return { tiles, durations: metadata.delay };
}

async function buildGreatHall() {
  const layout = await prepareHallFurniture();
  const { width: W, height: H, tileSize: T, seats, groups, entries } = layout;
  const { blocked, reachable, portalCells } = geometry(layout);
  const count = W * H, collisionGid = count + 1, entryGid = count + 2, frontGid = count + 3, fireGid = 2 * count + 3, portraitGid = fireGid + 28;
  const source = await sharp(path.join(art, layout.render.source)).metadata();
  await sharp(path.join(art, layout.render.source))
    .resize(W * T, H * T, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 9 }).toFile(path.join(art, layout.render.floor));
  const { data, info } = await sharp(path.join(art, layout.render.floor)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frontCells = new Set();
  let foregroundPixels = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const head=layout.measurements.headClearance;
    const protectedAvatar=seats.some((s)=>x>=s.x-head.x&&x<s.x+head.x&&y>=s.y-head.top&&y<s.y+head.bottom);
    if (!protectedAvatar && layout.frontPolygons.some((p) => inside(x + 0.5, y + 0.5, p))) {
      foregroundPixels++;
      frontCells.add(Math.floor(y / T) * W + Math.floor(x / T));
    } else data.fill(0, (y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 }).toFile(path.join(art, layout.render.fronts));
  await sharp({ create: { width: T, height: T, channels: 4, background: "#00000000" } })
    .png().toFile(path.join(art, "marker.png"));
  const fireTiles = await buildFire(layout);
  const portrait = await buildPortrait(layout);
  let lid = 1, oid = 1;
  const tile = (name, data, properties = []) => ({ id: lid++, name, type: "tilelayer", x: 0, y: 0, width: W, height: H, opacity: 1, visible: true, data, ...(properties.length ? { properties } : {}) });
  const marker = (points) => {
    const data = Array(count).fill(0);
    for (const [x, y] of points) data[y * W + x] = entryGid;
    return data;
  };
  const area = (name, r, properties) => ({ id: oid++, name, type: "area", x: r.x, y: r.y, width: r.width, height: r.height, rotation: 0, visible: true, properties });
  const objects = (name, items) => ({ id: lid++, name, type: "objectgroup", draworder: "topdown", x: 0, y: 0, opacity: 1, visible: true, objects: items });
  const layers = Object.entries(entries).map(([name, point]) => tile(name, marker([point]), name === "start" ? [] : [P("startLayer", true)]));
  layers.push(tile("room-art", Array.from({ length: count }, (_, i) => i + 1)));
  const fireData = Array(count).fill(0);
  for (const [dx, dy, id] of [[0, 0, 0], [1, 0, 1], [0, 1, 14], [1, 1, 15]])
    fireData[(layout.hearth.tileY + dy) * W + layout.hearth.tileX + dx] = fireGid + id;
  const portraitData = Array(count).fill(0);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++)
    portraitData[(layout.portrait.tileY + y) * W + layout.portrait.tileX + x] = portraitGid + y * 24 + x;
  layers.push(tile("hearth-flames", fireData), tile("north-wall-portrait", portraitData), tile("collisions", Array.from({ length: count }, (_, i) => blocked.has(i) ? collisionGid : 0)));
  for (const p of layout.portals) layers.push(tile("door-" + p.id,
    marker(Array.from({ length: p.width * p.height }, (_, i) => [p.x + i % p.width, p.y + Math.floor(i / p.width)])),
    [P("exitUrl", nativeTarget(p.target + (p.entry ? "#" + p.entry : "")))]));
  layers.push(objects("seating", seats.map((s) => area("seat-" + s.id, { x: s.x - 16, y: s.y - 16, width: 32, height: 32 }, [
    P("seatId", s.id), P("seatLabel", s.label), P("seatX", s.x), P("seatY", s.y), P("standX", s.standX), P("standY", s.standY), P("facing", s.facing), P("audioGroup", s.audioGroup),
  ]))));
  layers.push(objects("conversationAreas", groups.map((g) => area("group-" + g.id, g, [P("conversationGroup", g.id), P("conversationLabel", g.label)]))));
  layers.push(objects("hallActions", [
    area("podium", layout.podium, [P("hallPodium", true), P("silent", true)]),
    area("noticeboard", layout.noticeboard.approach, [P("hallAction", "noticeboard"), P("hallNoticeboardKey", "hallnotice01")]),
    area("noticeboard-display", layout.noticeboard.display, [P("hallBoardDisplay", true)]),
    area("game-table", layout.games, [P("hallAction", "games")]),
  ]));
  layers.push(objects("ambience", [area("kamin-prasseln", layout.hearth.audio, [P("playAudio", "../village/fire.mp3"), P("audioLoop", true), P("audioVolume", 0.08)])]));
  layers.push(objects("floorLayer", []), tile("furniture-fronts", Array.from({ length: count }, (_, i) => frontCells.has(i) ? frontGid + i : 0)));
  const imageSet = (firstgid, name, image, columns, tilecount, imagewidth, imageheight, extra = {}) => ({ firstgid, name, image, columns, tilecount, imagewidth, imageheight, tilewidth: T, tileheight: T, margin: 0, spacing: 0, ...extra });
  const mapdata = {
    source: layout.render.source, sourceWidth: source.width, sourceHeight: source.height, pixelWidth: W * T, pixelHeight: H * T, tileSize: T,
    avatarSize: 32, seats: seats.length, blockedTiles: blocked.size, reachableFloorTiles: reachable.size, portalTiles: portalCells.size, foregroundTiles: frontCells.size, foregroundPixels,
    podium: { x: layout.podium.x, y: layout.podium.y, width: layout.podium.width, height: layout.podium.height },
    noticeboardDisplay: layout.noticeboard.display, noticeboardApproach: layout.noticeboard.approach,
    portrait: { source: layout.portrait.source, x: layout.portrait.tileX * T + layout.portrait.insetX, y: layout.portrait.tileY * T + layout.portrait.insetY, width: layout.portrait.width, height: layout.portrait.height, frames: portrait.durations.length, durations: portrait.durations },
  };
  const map = {
    compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T, infinite: false, orientation: "orthogonal", renderorder: "right-down", tiledversion: "1.11.2", type: "map", version: "1.10", nextlayerid: lid, nextobjectid: oid, layers,
    properties: [
      P("mapName", "Grosse Halle"), P("mapDescription", "Gemeinsame Schlosshalle mit Kaminrunde, Tafeln, Lehrerbank, Spieltreff und Podium."),
      P("mapImage", artPath + layout.render.floor), P("script", "hall.js?v=20261108-scale1"), P("castleArtScale", 1), P("castleMapId", "grosse-halle"),
      P("castleRevision", "20261108-gs1"), P("castleFurnitureScale", layout.measurements.furnitureScale),
      P("castleNativeMeetings", true),
      P("castleNativeRoomUrl", nativeTarget("grosse-halle.tmj")),
      P("hallAudioUrl", "https://together.deine-schule.com/castle-audio/"),
      P("castleSourceWidth", source.width), P("castleSourceHeight", source.height),
      P("castleMapdata", JSON.stringify(mapdata)),
      P("mapCopyright", "Original artwork generated for deine Schule. Original fantasy school interior; fire from the existing village tileset."),
    ],
    tilesets: [
      imageSet(1, "Grosse Halle", artPath + layout.render.floor, W, count, W * T, H * T),
      imageSet(collisionGid, "Collision marker", artPath + "marker.png", 1, 1, T, T, { tiles: [{ id: 0, properties: [P("collides", true)] }] }),
      imageSet(entryGid, "Entry marker", artPath + "marker.png", 1, 1, T, T),
      imageSet(frontGid, "Moebel-Vorderkanten", artPath + layout.render.fronts, W, count, W * T, H * T),
      imageSet(fireGid, "fire", artPath + layout.render.fire, 14, 28, 448, 64, { tiles: fireTiles }),
      imageSet(portraitGid, "portrait", artPath + layout.render.portrait, 24, 72, 768, 96, { tiles: portrait.tiles }),
    ],
  };
  const room = (g) => ({ id: g.id, title: g.label, x: g.x, y: g.y, width: g.width, height: g.height, floor: "grosse-halle" });
  const world = {
    id: "grosse-halle", width: W, height: H, illustrated: true, artScale: 1,
    rooms: [...groups, layout.podium, layout.foyer].map(room), seats, rides: [], entries,
    links: layout.portals.map((p) => ({ name: p.id, x: p.x * T, y: p.y * T, width: p.width * T, height: p.height * T, target: p.target, entry: p.entry || "" })),
    mapdata,
  };
  fs.writeFileSync(path.join(root, "castle/grosse-halle.tmj"), JSON.stringify(map) + "\n");
  writeWam(map, path.join(root, "castle"));
  const firePreview = await sharp(path.join(art, layout.render.fire)).extract({ left: 0, top: 0, width: 64, height: 64 }).png().toBuffer();
  const portraitPreview = await sharp(path.join(art, layout.render.portrait)).extract({ left: 0, top: 0, width: 96, height: 96 }).png().toBuffer();
  await sharp(path.join(art, layout.render.floor)).composite([
    { input: firePreview, left: layout.hearth.tileX * T, top: layout.hearth.tileY * T },
    { input: portraitPreview, left: layout.portrait.tileX * T, top: layout.portrait.tileY * T },
  ]).png({ compressionLevel: 9 }).toFile(path.join(root, "castle/art/grosse-halle-overview.png"));
  return { map, world };
}
module.exports = { buildGreatHall };
if (require.main === module) buildGreatHall().then(({ world }) => {
  // Shared world registration is opt-in; normal generation never edits the manifest.
  if (process.argv.includes("--update-world")) {
    const file = path.join(root, "castle/layout.json");
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    const index = manifest.worlds.findIndex((w) => w.id === world.id);
    if (index < 0) manifest.worlds.push(world);
    else manifest.worlds[index] = world;
    fs.writeFileSync(file, JSON.stringify(manifest) + "\n");
  }
  console.log(JSON.stringify({ map: world.id, ...world.mapdata, rooms: world.rooms.map((r) => r.id), entries: world.entries, links: world.links }, null, 2));
}).catch((error) => { console.error(error); process.exitCode = 1; });
