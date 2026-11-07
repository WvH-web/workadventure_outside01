import { readLayout, conversationAt } from "./room.js";
const $ = (id) => document.getElementById(id);
function showError() {
  const retry = document.createElement("button");
  retry.textContent = "Erneut laden";
  retry.onclick = () => location.reload();
  $("loading").replaceChildren(
    document.createTextNode("Das Schloss konnte nicht geladen werden. "),
    retry,
  );
  $("loading").hidden = false;
}
window.addEventListener("unhandledrejection", showError);
window.addEventListener("error", (event) => {
  if (event.message) showError();
});
const canvas = $("map"),
  ctx = canvas.getContext("2d");
const manifest = await fetch("layout.json").then((r) => r.json());
const atlas = await new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = "art/castle-atlas.png";
});
const cache = new Map(),
  keys = new Set();
const compactTitles = {
  wohnen: "Wohnen", grundschule: "Grundschule", mittelstufe: "Mittelstufe",
  schloss: "Schloss", dorf: "Dorfplatz", markt: "Markt & Garten",
  rutsche: "Rutsche", kurs: "Rundkurs"
};
let world,
  map,
  layout,
  background,
  front,
  animated = [],
  position = { x: 0, y: 0 },
  seat = null,
  overview = true,
  groups = false,
  zoom = 1,
  camera = { x: 0, y: 0 },
  modeBusy = false,
  currentAction = null,
  last = 0,
  drag = null,
  ride = null;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const index = new Map(manifest.animations.map((a) => [a.id + 1, a.animation]));
function tile(c, gid, x, y) {
  if (!gid) return;
  const i = gid - 1,
    cols = atlas.width / 32;
  c.drawImage(
    atlas,
    (i % cols) * 32,
    Math.floor(i / cols) * 32,
    32,
    32,
    x,
    y,
    32,
    32,
  );
}
function resize() {
  const r = canvas.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  if (overview) fit();
}
function fit() {
  if (!world) return;
  zoom = Math.min(
    canvas.clientWidth / (world.width * 32 + 64),
    canvas.clientHeight / (world.height * 32 + 64),
  );
  camera = { x: world.width * 16, y: world.height * 16 };
}
function free(x, y) {
  if (
    !map ||
    x < 7 ||
    y < 7 ||
    x >= map.width * 32 - 7 ||
    y >= map.height * 32 - 7
  )
    return false;
  const data = map.layers.find((l) => l.name === "collisions").data;
  return [x - 6, x + 6].every((px) =>
    [y - 6, y + 6].every(
      (py) => !data[Math.floor(py / 32) * map.width + Math.floor(px / 32)],
    ),
  );
}
function nearestFree(x, y) {
  for (let radius = 0; radius < 30; radius++)
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const p = {
          x: Math.floor(x / 32) * 32 + 16 + dx * 32,
          y: Math.floor(y / 32) * 32 + 16 + dy * 32,
        };
        if (free(p.x, p.y)) return p;
      }
  return null;
}
async function load(id, entry = "start") {
  if (modeBusy) return;
  modeBusy = true;
  keys.clear();
  seat = null;
  ride = null;
  if (id !== "kino") {
    $("content").hidden = true;
    $("content-frame").removeAttribute("src");
  }
  $("loading").hidden = false;
  try {
    if (!cache.has(id))
      cache.set(
        id,
        await fetch(id + ".tmj").then((r) => {
          if (!r.ok) throw Error("Karte nicht erreichbar");
          return r.json();
        }),
      );
    map = cache.get(id);
    world = manifest.worlds.find((w) => w.id === id);
    layout = readLayout(map);
    $("floor").value = id;
    const start = world.entries[entry] || world.entries.start;
    position = { x: start[0] * 32 + 16, y: start[1] * 32 + 16 };
    background = document.createElement("canvas");
    background.width = map.width * 32;
    background.height = map.height * 32;
    const b = background.getContext("2d");
    front = document.createElement("canvas");
    front.width = background.width;
    front.height = background.height;
    const f = front.getContext("2d");
    animated = [];
    for (const layer of map.layers.filter(
      (l) =>
        l.type === "tilelayer" &&
        !["start", "collisions"].includes(l.name) &&
        !l.name.startsWith("door-") &&
        !world.entries[l.name],
    )) {
      const target = layer.name === "furniture-fronts" ? f : b;
      layer.data.forEach((gid, i) => {
        if (!gid) return;
        const x = (i % map.width) * 32,
          y = Math.floor(i / map.width) * 32;
        if (index.has(gid))
          animated.push({ gid, x, y, animation: index.get(gid) });
        else tile(target, gid, x, y);
      });
    }
    $("rooms").replaceChildren(
      ...world.rooms.map((r) => {
        const button = document.createElement("button");
        button.dataset.room = r.id;
        const dot = document.createElement("span");
        dot.className = "dot";
        button.append(dot, document.createTextNode(r.title));
        button.onclick = () => focusRoom(r);
        return button;
      }),
    );
    document.querySelector(".reference").href = "art/" + id + "-overview.png";
    if (overview) fit();
    else {
      zoom = 1;
      camera = { ...position };
    }
    refresh();
    history.replaceState(null, "", "#" + id);
    window.castlePreview = {
      get state() {
        return {
          world: world.id,
          position: { ...position },
          seat: seat?.id || null,
          conversation: conversationAt(layout, position, seat),
          overview,
          ride: !!ride,
        };
      },
      load,
      focusRoom,
      moveTo: (x, y) => {
        if (free(x, y)) {
          position = { x, y };
          overview = false;
          setMode(false);
          refresh();
          return true;
        }
        return false;
      },
      free,
    };
  } catch (e) {
    $("loading").textContent = e.message;
    throw e;
  } finally {
    modeBusy = false;
    $("loading").hidden = true;
  }
}
function setMode(value) {
  overview = value;
  document.body.dataset.overview = String(value);
  $("overview").setAttribute("aria-pressed", String(value));
  $("explore").setAttribute("aria-pressed", String(!value));
  if (value) fit();
  else {
    zoom = Math.max(0.75, Math.min(zoom, 1.5));
    camera = { ...position };
  }
  if (!value) canvas.focus();
}
function focusRoom(room) {
  if (seat) stand();
  const p = nearestFree(room.x + room.width / 2, room.y + room.height / 2);
  if (p) position = p;
  setMode(false);
  zoom = 0.9;
  camera = { ...position };
  refresh();
}
function openCinema() {
  const url = "https://deutsche-online-schule.com/kino/public/kino.php";
  $("content").hidden = false;
  if ($("content-frame").src !== url) $("content-frame").src = url;
  $("content-external").href = url;
  resize();
}
function stand() {
  if (seat) {
    position = { x: seat.standX, y: seat.standY };
    seat = null;
  }
  refresh();
}
function inArea(p, a) {
  return (
    p.x >= a.x && p.y >= a.y && p.x < a.x + a.width && p.y < a.y + a.height
  );
}
function nearestSeat() {
  return world.seats
    .map((s) => ({
      s,
      d: Math.min(
        Math.hypot(position.x - s.x, position.y - s.y),
        Math.hypot(position.x - s.standX, position.y - s.standY),
      ),
    }))
    .filter((e) => e.d < 48)
    .sort((a, b) => a.d - b.d)[0]?.s;
}
function refresh() {
  if (!world) return;
  const room = world.rooms.find((r) => inArea(position, r));
  $("location").textContent =
    room?.title ||
    {
      umgebung: "Sternendorf",
      erdgeschoss: "Wandelgang",
      obergeschoss: "Wandelgang",
      kino: "Foyer",
    }[world.id];
  const conversation = conversationAt(layout, position, seat);
  $("conversation").textContent = conversation?.label || "";
  for (const b of document.querySelectorAll("#rooms button"))
    b.setAttribute("aria-current", String(b.dataset.room === room?.id));
  const candidate = nearestSeat(),
    cinema = world.id === "kino" && position.y < 37 * 32,
    slide = world.rides?.find((a) => inArea(position, a));
  const external = world.links.find(
    (l) => l.target.startsWith("../") && inArea(position, l),
  );
  let label = "";
  currentAction = null;
  $("cinema-open").hidden = world.id !== "kino";
  if (ride) {
    label = "Rutsche verlassen";
    currentAction = () => {
      position = { ...ride.points.at(-1) };
      ride = null;
      refresh();
    };
  } else if (seat) {
    label = "Aufstehen";
    currentAction = stand;
  } else if (slide) {
    label = "Rutschen";
    currentAction = () => {
      ride = { points: slide.waypoints, start: performance.now() };
    };
  } else if (candidate) {
    label = "Hinsetzen";
    currentAction = () => {
      seat = candidate;
      position = { x: seat.x, y: seat.y };
      refresh();
    };
  } else if (cinema) {
    label = "Kino oeffnen";
    currentAction = openCinema;
  } else if (external) {
    label = "Lehrerzimmer oeffnen";
    currentAction = () =>
      window.open(
        "https://together.deine-schule.com/_/global/wvh-web.github.io/workadventure_outside01/teachersmeetingground.tmj",
        "_blank",
        "noopener",
      );
  }
  $("action").hidden = !label;
  $("action").textContent = label;
}
function avatar(c, p) {
  c.save();
  c.translate(Math.round(p.x), Math.round(p.y));
  rect(c, -7, 8, 6, 7, "#3a3e46");
  rect(c, 2, 8, 6, 7, "#3a3e46");
  rect(c, -8, -6, 16, 17, "#3b638b");
  rect(c, -6, -18, 13, 13, "#edc298");
  rect(c, -7, -21, 14, 7, "#674c47");
  rect(c, -5, -8, 11, 3, "#c86461");
  rect(c, 1, -13, 2, 2, "#434548");
  if (seat) {
    rect(c, -9, 8, 8, 4, "#3a3e46");
    rect(c, 2, 8, 8, 4, "#3a3e46");
  }
  c.restore();
}
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function draw(now) {
  const dt = Math.min((now - last) / 1000, 0.05) || 0;
  last = now;
  if (world && !modeBusy) {
    if (ride) {
      const elapsed = (now - ride.start) / 1000,
        speed = 270;
      let distance = elapsed * speed;
      const pts = ride.points;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i],
          len = Math.hypot(b.x - a.x, b.y - a.y);
        if (distance < len) {
          position = {
            x: a.x + ((b.x - a.x) * distance) / len,
            y: a.y + ((b.y - a.y) * distance) / len,
          };
          break;
        }
        distance -= len;
        if (i === pts.length - 1) {
          position = { ...b };
          ride = null;
        }
      }
      refresh();
    } else if (!overview && !seat) {
      let dx = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0),
        dy = (keys.has("down") ? 1 : 0) - (keys.has("up") ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1,
        speed = (keys.has("shift") ? 170 : 100) * dt;
      dx = (dx / len) * speed;
      dy = (dy / len) * speed;
      if (free(position.x + dx, position.y)) position.x += dx;
      if (free(position.x, position.y + dy)) position.y += dy;
      if (dx || dy) {
        refresh();
        const link = world.links.find(
          (l) => !l.target.startsWith("../") && inArea(position, l),
        );
        if (link) void load(link.target.replace(".tmj", ""), link.entry);
      }
    }
    if (!overview) {
      camera.x += (position.x - camera.x) * Math.min(1, dt * 12);
      camera.y += (position.y - camera.y) * Math.min(1, dt * 12);
    }
    const dpr = canvas.width / canvas.clientWidth;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = "#416650";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.translate(canvas.clientWidth / 2, canvas.clientHeight / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    ctx.imageSmoothingEnabled = zoom < 0.6;
    ctx.drawImage(background, 0, 0);
    for (const a of animated) {
      const total = a.animation.reduce((s, f) => s + f.duration, 0);
      let time = (reduced ? 0 : now) % total,
        frame = a.animation[0];
      for (const f of a.animation) {
        frame = f;
        if (time < f.duration) break;
        time -= f.duration;
      }
      tile(ctx, frame.tileid + 1, a.x, a.y);
    }
    if (groups) {
      for (const a of layout.groups) {
        ctx.fillStyle = "#638cd62b";
        ctx.fillRect(a.x, a.y, a.width, a.height);
        ctx.strokeStyle = "#d6e2ff";
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(a.x, a.y, a.width, a.height);
      }
      for (const a of layout.quiet) {
        ctx.fillStyle = "#cba38c22";
        ctx.fillRect(a.x, a.y, a.width, a.height);
      }
    }
    avatar(ctx, position);
    ctx.drawImage(front, 0, 0);
    if (overview && zoom < 0.65) {
      ctx.font = `500 ${12 / zoom}px "Segoe UI",sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const r of world.rooms) {
        const text = canvas.clientWidth < 500 ? compactTitles[r.id] || r.title : r.title,
          tw = ctx.measureText(text).width;
        ctx.fillStyle = "#f5f6efe8";
        ctx.fillRect(
          r.x + r.width / 2 - tw / 2 - 5 / zoom,
          r.y + 5 / zoom,
          tw + 10 / zoom,
          19 / zoom,
        );
        ctx.fillStyle = "#294b41";
        ctx.fillText(text, r.x + r.width / 2, r.y + 7 / zoom);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  requestAnimationFrame(draw);
}
const directions = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ShiftLeft: "shift",
  ShiftRight: "shift",
};
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (directions[e.code]) {
    e.preventDefault();
    keys.add(directions[e.code]);
    if (overview) setMode(false);
  }
  if (e.code === "Escape") {
    if (!$("content").hidden) $("content-close").click();
    else if (seat) stand();
    else if (ride) {
      position = { ...ride.points.at(-1) };
      ride = null;
    }
  }
  if (e.code === "KeyE" && !e.repeat) currentAction?.();
});
window.addEventListener("keyup", (e) => keys.delete(directions[e.code]));
window.addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) keys.clear();
});
$("floor").onchange = (e) => void load(e.target.value);
$("overview").onclick = () => setMode(true);
$("explore").onclick = () => setMode(false);
$("action").onclick = () => {
  currentAction?.();
  canvas.focus();
};
$("groups").onclick = () => {
  groups = !groups;
  $("groups").setAttribute("aria-pressed", String(groups));
};
$("zoom-in").onclick = () => {
  zoom = Math.min(2.5, zoom * 1.25);
};
$("zoom-out").onclick = () => {
  zoom = Math.max(0.12, zoom / 1.25);
};
$("content-close").onclick = () => {
  $("content").hidden = true;
  $("content-frame").removeAttribute("src");
  resize();
  canvas.focus();
};
$("cinema-open").onclick = openCinema;
for (const b of document.querySelectorAll("[data-dir]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    setMode(false);
    keys.add(b.dataset.dir);
    b.setPointerCapture(e.pointerId);
  };
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(name, () => keys.delete(b.dataset.dir));
}
canvas.onpointerdown = (e) => {
  if (overview) {
    drag = { x: e.clientX, y: e.clientY, camera: { ...camera } };
    canvas.setPointerCapture(e.pointerId);
  }
  canvas.focus();
};
canvas.onpointermove = (e) => {
  if (drag)
    camera = {
      x: drag.camera.x - (e.clientX - drag.x) / zoom,
      y: drag.camera.y - (e.clientY - drag.y) / zoom,
    };
};
canvas.onpointerup = (e) => {
  if (drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) {
    const r = canvas.getBoundingClientRect(),
      p = {
        x: camera.x + (e.clientX - r.left - r.width / 2) / zoom,
        y: camera.y + (e.clientY - r.top - r.height / 2) / zoom,
      };
    const room = world.rooms.find((a) => inArea(p, a));
    if (room) focusRoom(room);
  }
  drag = null;
};
canvas.onpointercancel = () => {
  drag = null;
};
new ResizeObserver(resize).observe($("viewport"));
window.addEventListener("load", () => window.lucide?.createIcons());
await load(
  manifest.worlds.some((w) => w.id === location.hash.slice(1))
    ? location.hash.slice(1)
    : "erdgeschoss",
);
resize();
setMode(true);
window.lucide?.createIcons();
requestAnimationFrame(draw);
