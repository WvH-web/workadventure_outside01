const fs = require("node:fs");
const path = require("node:path");
const sharp = require("./castle-deps.cjs")("sharp");
const root = path.resolve(__dirname, "..");
const art = path.join(root, "castle/art/mittelstufe-20261107");
const P = (name, value) => ({
  name,
  type:
    typeof value === "boolean"
      ? "bool"
      : typeof value === "number"
        ? "float"
        : "string",
  value,
});
function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
}
async function buildMiddleCommonRoom(source) {
  fs.mkdirSync(art, { recursive: true });
  if (source && path.resolve(source) !== path.join(art, "source.png"))
    fs.copyFileSync(source, path.join(art, "source.png"));
  const layout = JSON.parse(
    fs.readFileSync(path.join(art, "layout.json"), "utf8"),
  );
  const { width: W, height: H, tileSize: T } = layout;
  const metadata = await sharp(path.join(art, "source.png")).metadata();
  if (metadata.width !== W * T * 2 || metadata.height !== H * T * 2)
    throw Error("Unexpected middle-school artwork size");
  await sharp(path.join(art, "source.png"))
    .resize(W * T, H * T, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(art, "floor.png"));
  const { data, info } = await sharp(path.join(art, "floor.png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (!layout.frontPolygons.some((p) => inside(x + 0.5, y + 0.5, p)))
        data.fill(0, (y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(path.join(art, "fronts.png"));
  await sharp({
    create: {
      width: T,
      height: T,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toFile(path.join(art, "marker.png"));
  fs.copyFileSync(
    path.join(root, "village/tilesets/fire.png"),
    path.join(root, "castle/art/shared-fire.png"),
  );
  const blocked = new Set();
  for (const [x, y, w, h] of layout.blockedRectangles)
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) blocked.add(yy * W + xx);
  const clearBody = (x, y) => {
    for (const xx of [Math.floor((x - 6) / T), Math.floor((x + 6) / T)])
      for (const yy of [Math.floor((y - 6) / T), Math.floor((y + 6) / T)])
        blocked.delete(yy * W + xx);
  };
  for (const s of layout.seats) {
    clearBody(s.x, s.y);
    clearBody(s.standX, s.standY);
  }
  let lid = 1,
    oid = 1;
  const tile = (name, data, properties = []) => ({
    id: lid++,
    name,
    type: "tilelayer",
    x: 0,
    y: 0,
    width: W,
    height: H,
    opacity: 1,
    visible: true,
    data,
    ...(properties.length ? { properties } : {}),
  });
  const objects = (name, items) => ({
    id: lid++,
    name,
    type: "objectgroup",
    draworder: "topdown",
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    objects: items,
  });
  const marker = (points) => {
    const data = Array(W * H).fill(0);
    for (const [x, y] of points) data[y * W + x] = 386;
    return data;
  };
  const area = (name, x, y, width, height, properties) => ({
    id: oid++,
    name,
    type: "area",
    x,
    y,
    width,
    height,
    rotation: 0,
    visible: true,
    properties,
  });
  const layers = Object.entries(layout.entries).map(([name, point]) =>
    tile(
      name,
      marker([point]),
      name === "start" ? [] : [P("startLayer", true)],
    ),
  );
  layers.push(
    tile(
      "room-art",
      Array.from({ length: W * H }, (_, i) => i + 1),
    ),
  );
  for (let phase = 0; phase < 3; phase++) {
    const data = Array(W * H).fill(0);
    data[4 * W + 11] = 771 + 112 + phase;
    data[5 * W + 11] = 771 + 134 + phase;
    layers.push({
      ...tile("hearth-flames-" + phase, data),
      offsetx: 5 + phase * 11,
      offsety: 0,
    });
  }
  layers.push(
    tile(
      "collisions",
      Array.from({ length: W * H }, (_, i) => (blocked.has(i) ? 385 : 0)),
    ),
  );
  layers.push(
    tile(
      "door-zum-flur",
      marker([
        [11, 15],
        [12, 15],
      ]),
      [P("exitUrl", "erdgeschoss.tmj#mittelstufe-anreise")],
    ),
  );
  layers.push(
    objects(
      "seating",
      layout.seats.map((s) =>
        area("seat-" + s.id, s.x - 16, s.y - 16, 32, 32, [
          P("seatId", s.id),
          P("seatLabel", s.label),
          P("seatX", s.x),
          P("seatY", s.y),
          P("standX", s.standX),
          P("standY", s.standY),
          P("facing", s.facing),
          P("audioGroup", s.audioGroup),
        ]),
      ),
    ),
  );
  layers.push(
    objects(
      "conversationAreas",
      layout.groups.map((g) =>
        area("group-" + g.id, g.x, g.y, g.width, g.height, [
          P("conversationGroup", g.id),
          P("conversationLabel", g.label),
        ]),
      ),
    ),
  );
  layers.push(
    objects("ambience", [
      area("kamin-prasseln", 304, 112, 160, 160, [
        P("playAudio", "../village/fire.mp3"),
        P("audioLoop", true),
        P("audioVolume", 0.1),
      ]),
    ]),
  );
  layers.push(objects("floorLayer", []));
  layers.push(
    tile(
      "furniture-fronts",
      Array.from({ length: W * H }, (_, i) => 387 + i),
    ),
  );
  const artPath = "art/mittelstufe-20261107/";
  const imageSet = (
    firstgid,
    name,
    image,
    columns,
    tilecount,
    imagewidth,
    imageheight,
    extra = {},
  ) => ({
    firstgid,
    name,
    image,
    columns,
    tilecount,
    imagewidth,
    imageheight,
    tilewidth: T,
    tileheight: T,
    margin: 0,
    spacing: 0,
    ...extra,
  });
  const fire = JSON.parse(
    fs.readFileSync(path.join(root, "village/wa-headquarters.tmj"), "utf8"),
  ).tilesets.find((t) => t.name === "fire");
  const phased = [];
  for (const t of fire.tiles)
    for (let phase = 0; phase < 3; phase++) {
      const shift = phase * 2;
      phased.push({
        id: t.id + phase,
        animation: t.animation.slice(shift).concat(t.animation.slice(0, shift)),
      });
    }
  const map = {
    compressionlevel: -1,
    width: W,
    height: H,
    tilewidth: T,
    tileheight: T,
    infinite: false,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.11.2",
    type: "map",
    version: "1.10",
    nextlayerid: lid,
    nextobjectid: oid,
    layers,
    properties: [
      P("mapName", "Gemeinschaftsraum der Mittelstufe"),
      P(
        "mapDescription",
        "Ein gemuetlicher Gemeinschaftsraum mit Kamin, Spieltisch und Kreativecke.",
      ),
      P("mapImage", artPath + "floor.png"),
      P("script", "room.js?v=20261107-ms1"),
      P("castleMapId", "mittelstufe"),
      P(
        "mapCopyright",
        "Original artwork generated for deine Schule. Original fantasy school interior.",
      ),
    ],
    tilesets: [
      imageSet(
        1,
        "Mittelstufenraum",
        artPath + "floor.png",
        W,
        W * H,
        W * T,
        H * T,
      ),
      imageSet(385, "Collision marker", artPath + "marker.png", 1, 1, T, T, {
        tiles: [{ id: 0, properties: [P("collides", true)] }],
      }),
      imageSet(386, "Entry marker", artPath + "marker.png", 1, 1, T, T),
      imageSet(
        387,
        "Moebel-Vorderkanten",
        artPath + "fronts.png",
        W,
        W * H,
        W * T,
        H * T,
      ),
      { ...fire, firstgid: 771, image: "art/shared-fire.png", tiles: phased },
    ],
  };
  fs.writeFileSync(
    path.join(root, "castle/mittelstufe.tmj"),
    JSON.stringify(map) + "\n",
  );
  const rooms = layout.groups.map((g) => ({
    id: g.id,
    title: g.label,
    x: g.x,
    y: g.y,
    width: g.width,
    height: g.height,
    floor: "mittelstufe",
  }));
  const world = {
    id: "mittelstufe",
    width: W,
    height: H,
    illustrated: true,
    rooms,
    seats: layout.seats,
    rides: [],
    links: [
      {
        name: "zum-flur",
        x: 352,
        y: 480,
        width: 64,
        height: 32,
        target: "erdgeschoss.tmj",
        entry: "mittelstufe-anreise",
      },
    ],
    entries: layout.entries,
  };
  await sharp(path.join(art, "floor.png"))
    .resize(1536, 1024, { kernel: "nearest" })
    .png()
    .toFile(path.join(root, "castle/art/mittelstufe-overview.png"));
  return { map, world };
}
module.exports = { buildMiddleCommonRoom };
if (require.main === module)
  buildMiddleCommonRoom(process.argv[2])
    .then(({ world }) =>
      console.log(JSON.stringify({ map: world.id, seats: world.seats.length })),
    )
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
