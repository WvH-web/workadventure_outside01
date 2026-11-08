const fs = require("node:fs");
const path = require("node:path");
const { nativeTarget, writeWam } = require("./castle-wam.cjs");
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
  const layout = JSON.parse(
    fs.readFileSync(path.join(art, "layout.json"), "utf8"),
  );
  if (source && path.resolve(source) !== path.join(art, layout.render.source))
    fs.copyFileSync(source, path.join(art, layout.render.source));
  const {
    tileSize: T,
    render: { scale, padding, version },
  } = layout;
  const W = Math.ceil((layout.width * T * scale + 2 * padding) / T);
  const H = Math.ceil((layout.height * T * scale + 2 * padding) / T);
  const count = W * H,
    collisionGid = count + 1,
    entryGid = count + 2;
  const frontGid = count + 3,
    fireGid = 2 * count + 3;
  const px = (value) => Math.round(value * scale + padding);
  const size = (value) => Math.round(value * scale);
  const seats = layout.seats.map((s) => ({
    ...s,
    x: px(s.x),
    y: px(s.y),
    standX: px(s.standX),
    standY: px(s.standY),
  }));
  const groups = layout.groups.map((g) => ({
    ...g,
    x: px(g.x),
    y: px(g.y),
    width: size(g.width),
    height: size(g.height),
  }));
  const entries = Object.fromEntries(
    Object.entries(layout.entries).map(([name, [x, y]]) => [
      name,
      [Math.floor(px(x * T + T / 2) / T), Math.floor(px(y * T + T / 2) / T)],
    ]),
  );
  const fronts = layout.frontPolygons.map((p) =>
    p.map(([x, y]) => [px(x), px(y)]),
  );
  const floorFile = layout.render.floor,
    frontFile = layout.render.fronts;
  const metadata = await sharp(path.join(art, layout.render.source)).metadata();
  if (
    metadata.width !== layout.width * T * 2 ||
    metadata.height !== layout.height * T * 2
  )
    throw Error("Unexpected middle-school artwork size");
  await sharp(path.join(art, layout.render.source))
    .resize(size(layout.width * T), size(layout.height * T), {
      kernel: "lanczos3",
    })
    .extend({
      left: padding,
      top: padding,
      right: W * T - size(layout.width * T) - padding,
      bottom: H * T - size(layout.height * T) - padding,
      background: "#252b28",
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(art, floorFile));
  const { data, info } = await sharp(path.join(art, floorFile))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frontCells = new Set();
  // Keep only original furniture pixels; blank atlas cells need no foreground tiles.
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (fronts.some((p) => inside(x + 0.5, y + 0.5, p)))
        frontCells.add(Math.floor(y / T) * W + Math.floor(x / T));
      else data.fill(0, (y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(path.join(art, frontFile));
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
  const blocked = new Set();
  if (
    layout.collisionGrid.length !== H ||
    layout.collisionGrid.some((row) => row.length !== W)
  )
    throw Error("Collision grid does not match scaled room");
  layout.collisionGrid.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      if (cell === "#") blocked.add(y * W + x);
    }),
  );
  const clearBody = (x, y) => {
    for (const xx of [Math.floor((x - 6) / T), Math.floor((x + 6) / T)])
      for (const yy of [Math.floor((y - 6) / T), Math.floor((y + 6) / T)])
        blocked.delete(yy * W + xx);
  };
  for (const s of seats) {
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
    for (const [x, y] of points) data[y * W + x] = entryGid;
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
  const layers = Object.entries(entries).map(([name, point]) =>
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
    const x = px(layout.hearth.x + phase * layout.hearth.spacing),
      y = px(layout.hearth.y),
      col = Math.floor(x / T),
      row = Math.floor(y / T);
    data[row * W + col] = fireGid + phase;
    data[(row + 1) * W + col] = fireGid + 7 + phase;
    layers.push({
      ...tile("hearth-flames-" + phase, data),
      offsetx: x - col * T,
      offsety: y - row * T,
    });
  }
  layers.push(
    tile(
      "collisions",
      Array.from({ length: W * H }, (_, i) =>
        blocked.has(i) ? collisionGid : 0,
      ),
    ),
  );
  layers.push(
    tile(
      "door-zum-flur",
      marker([
        [layout.exit.x, layout.exit.y],
        [layout.exit.x + 1, layout.exit.y],
      ]),
      [P("exitUrl", nativeTarget("grosse-halle.tmj#mittelstufe"))],
    ),
  );
  layers.push(
    objects(
      "seating",
      seats.map((s) =>
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
      groups.map((g) =>
        area("group-" + g.id, g.x, g.y, g.width, g.height, [
          P("conversationGroup", g.id),
          P("conversationLabel", g.label),
        ]),
      ),
    ),
  );
  layers.push(
    objects("ambience", [
      area(
        "kamin-prasseln",
        groups[0].x,
        groups[0].y,
        groups[0].width,
        groups[0].height,
        [
          P("playAudio", "../village/fire.mp3"),
          P("audioLoop", true),
          P("audioVolume", 0.1),
        ],
      ),
    ]),
  );
  const activities=[['story','Erzaehlkarten','kaminrunde','story.html',true],['games','Spielrunden','spieltisch','hall-games.html',false],['music','Musikwerkstatt','kreativecke','https://musiclab.chromeexperiments.com/Song-Maker/',false]];
  layers.push(objects('activities',activities.map(([id,label,group,url,api])=>{
    const g=groups.find(g=>g.id===group);
    return area('activity-'+id,g.x,g.y,g.width,g.height,[P('castleActivityId',id),P('castleActivityLabel',label),P('castleActivityUrl',url),P('castleActivityApi',api)]);
  })));
  layers.push(objects('variables',[{id:oid++,name:'castleStoryMs',type:'variable',x:0,y:0,width:0,height:0,rotation:0,visible:false,properties:[P('persist',false),P('default',false)]}]));
  layers.push(objects("floorLayer", []));
  layers.push(
    tile(
      "furniture-fronts",
      Array.from({ length: W * H }, (_, i) =>
        frontCells.has(i) ? frontGid + i : 0,
      ),
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
  const upper = fire.tiles.find((t) => t.id === 112).animation;
  const frames = [];
  for (let i = 0; i < upper.length; i++) {
    const id = upper[i].tileid;
    const frame = await sharp(path.join(root, "village/tilesets/fire.png"))
      .extract({
        left: (id % fire.columns) * T,
        top: Math.floor(id / fire.columns) * T,
        width: T,
        height: T * 2,
      })
      .resize(
        Math.round(T * layout.hearth.scale),
        Math.round(T * 2 * layout.hearth.scale),
        { kernel: "nearest" },
      )
      .png()
      .toBuffer();
    frames.push({ input: frame, left: i * T, top: 0 });
  }
  await sharp({
    create: {
      width: 7 * T,
      height: 2 * T,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames)
    .png()
    .toFile(path.join(art, layout.render.fire));
  const phased = [];
  for (const row of [0, 1])
    for (let phase = 0; phase < 3; phase++) {
      const shift = phase * 2;
      const animation = upper.map((f, i) => ({
        tileid: row * 7 + i,
        duration: f.duration,
      }));
      phased.push({
        id: row * 7 + phase,
        animation: animation.slice(shift).concat(animation.slice(0, shift)),
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
      P("mapImage", artPath + floorFile),
      P("script", "activities.js?v=20261108-activities1"),
      P('castleRevision','20261108-activities1'),P('castleStoryVariable','castleStoryMs'),
      P("castleNativeMeetings", true),
      P("castleNativeRoomUrl", nativeTarget("mittelstufe.tmj")),
      P("castleArtScale", scale),
      P("castleMapId", "mittelstufe"),
      P("castleHallUrl", nativeTarget("grosse-halle.tmj")),
      P(
        "mapCopyright",
        "Original artwork generated for deine Schule. Original fantasy school interior.",
      ),
    ],
    tilesets: [
      imageSet(
        1,
        "Mittelstufenraum",
        artPath + floorFile,
        W,
        W * H,
        W * T,
        H * T,
      ),
      imageSet(
        collisionGid,
        "Collision marker",
        artPath + "marker.png",
        1,
        1,
        T,
        T,
        {
          tiles: [{ id: 0, properties: [P("collides", true)] }],
        },
      ),
      imageSet(entryGid, "Entry marker", artPath + "marker.png", 1, 1, T, T),
      imageSet(
        frontGid,
        "Moebel-Vorderkanten",
        artPath + frontFile,
        W,
        W * H,
        W * T,
        H * T,
      ),
      imageSet(
        fireGid,
        "fire",
        artPath + layout.render.fire,
        7,
        14,
        7 * T,
        2 * T,
        { tiles: phased },
      ),
    ],
  };
  fs.writeFileSync(
    path.join(root, "castle/mittelstufe.tmj"),
    JSON.stringify(map) + "\n",
  );
  writeWam(map, path.join(root, "castle"));
  const rooms = groups.map((g) => ({
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
    seats,
    rides: [],
    links: [
      {
        name: "zum-flur",
        x: layout.exit.x * T,
        y: layout.exit.y * T,
        width: layout.exit.width * T,
        height: layout.exit.height * T,
        target: "grosse-halle.tmj",
        entry: "mittelstufe",
      },
    ],
    entries,
    artScale: scale,
  };
  await sharp(path.join(art, floorFile))
    .resize(W * T * 2, H * T * 2, { kernel: "nearest" })
    .png()
    .toFile(path.join(root, "castle/art/mittelstufe-overview.png"));
  return { map, world };
}
module.exports = { buildMiddleCommonRoom };
if (require.main === module)
  buildMiddleCommonRoom(process.argv[2])
    .then(({ world }) => {
      const file = path.join(root, "castle/layout.json");
      if (fs.existsSync(file)) {
        const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
        manifest.worlds = manifest.worlds
          .filter((w) => w.id !== world.id)
          .concat(world);
        fs.writeFileSync(file, JSON.stringify(manifest) + "\n");
      }
      console.log(
        JSON.stringify({
          map: world.id,
          width: world.width,
          height: world.height,
          seats: world.seats.length,
        }),
      );
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
