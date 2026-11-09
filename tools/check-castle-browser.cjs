const fs = require("node:fs"), path = require("node:path");
const { chromium } = require("./castle-deps.cjs")("playwright");
const root = path.resolve(__dirname, ".."), out = path.resolve(root, "../output/schulschloss-20261107");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "castle/layout.json"), "utf8"));
const worlds = new Map(manifest.worlds.map((w) => [w.id, w]));
const hall = worlds.get("grosse-halle"), commonRoom = worlds.get("mittelstufe");
const mapIds = require('./castle-map-ids.cjs');
const viewports = [{ width: 1440, height: 960 }, { width: 390, height: 844 }, { width: 320, height: 740 }];
const base = new URL(process.argv[2] || "http://127.0.0.1:4192/");
base.hash = "";
const api = "https://deutsche-online-schule.com/schooltools/verwaltung/api/";
const boards = ["stumbleguysgame", "haxballarea01", ...[1, 2, 3, 4, 5].map((n) => "gamesarea0" + n)];
const cmsItems = boards.map((board, i) => ({ board, title: "CMS " + ["Stumble Guys", "Haxball", "Spielrunde 1", "Spielrunde 2", "Spielrunde 3", "Spielrunde 4", "Spielrunde 5"][i] }));
const errors = [], results = [], screenshots = [], cmsRequests = [], layoutFindings = [];
fs.mkdirSync(out, { recursive: true });
function assert(ok, message) { if (!ok) throw Error(message); }
const prop = (o, name) => o.properties?.find((p) => p.name === name)?.value;
const hallMap = JSON.parse(fs.readFileSync(path.join(root, "castle/grosse-halle.tmj"), "utf8"));
const hallObjects = hallMap.layers.flatMap((l) => l.objects || []);

async function screenshot(page, name, viewport) {
  const file = path.join(out, `${name}-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: file });
  screenshots.push(file);
}
async function ready(page, id) {
  await page.waitForFunction((id) => window.castlePreview?.state.world === id && document.getElementById("loading").hidden, id);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function load(page, id, entry = "start") {
  await page.evaluate(({ id, entry }) => window.castlePreview.load(id, entry), { id, entry });
  await ready(page, id);
}
async function layoutCheck(page, label) {
  const failures = await page.evaluate(() => {
    const problems = [], header = document.querySelector("header"), h = header.getBoundingClientRect();
    const overlap = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const visible = (e) => e && !e.hidden && e.getBoundingClientRect().width > 2 && e.getBoundingClientRect().height > 2;
    if (document.documentElement.scrollWidth > innerWidth + 1) problems.push("horizontal overflow");
    const children = [...header.children].filter(visible).map((e) => ({ name: e.id || e.className, rect: e.getBoundingClientRect() }));
    for (const c of children) if (c.rect.top < h.top - 1 || c.rect.bottom > h.bottom + 1 || c.rect.left < -1 || c.rect.right > innerWidth + 1) problems.push("header overflow: " + c.name);
    for (let i = 0; i < children.length; i++) for (const b of children.slice(i + 1)) if (overlap(children[i].rect, b.rect)) problems.push("header overlap: " + children[i].name + " / " + b.name);
    for (const e of [...header.querySelectorAll("button"), document.getElementById("action"), document.getElementById("hall-open")].filter(visible))
      if (e.scrollWidth > e.clientWidth + 1) problems.push("clipped control text: " + e.id);
    if (document.getElementById("content").hidden) {
      const controls = [document.getElementById("action"), document.getElementById("hall-open"), document.querySelector(".location"), document.getElementById("touch-controls")].filter(visible);
      for (let i = 0; i < controls.length; i++) for (const b of controls.slice(i + 1))
        if (overlap(controls[i].getBoundingClientRect(), b.getBoundingClientRect())) problems.push("map control overlap: " + (controls[i].id || controls[i].className) + " / " + (b.id || b.className));
    } else {
      const panel = document.getElementById("content").getBoundingClientRect();
      if (panel.left < -1 || panel.right > innerWidth + 1 || panel.top < h.bottom - 1 || panel.bottom > innerHeight + 1) problems.push("content panel outside viewport");
    }
    return problems;
  });
  if (failures.length) {
    const finding = { viewport: page.viewportSize(), label, issues: failures };
    layoutFindings.push(finding);
    console.warn(JSON.stringify({ status: "layout finding", ...finding }));
  }
}
async function canvasColors(page) {
  return page.locator("#map").evaluate((c) => {
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, colors = new Set();
    for (let i = 0; i < data.length; i += 160) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return colors.size;
  });
}
async function move(page, x, y, label) {
  assert(await page.evaluate(({ x, y }) => window.castlePreview.moveTo(x, y), { x, y }), "Blocked approach: " + label);
}
async function walkThrough(page, link) {
  if(!await page.locator('#content').evaluate(e=>e.hidden))await closePanel(page);
  const target = link.target.replace(/\.tmj$/, "");
  assert(!target.startsWith("../"), "Protected external teacher route must not be opened by browser QA");
  const options = [
    { x: link.x + link.width / 2, y: link.y + link.height + 16, key: "ArrowUp" },
    { x: link.x + link.width / 2, y: link.y - 16, key: "ArrowDown" },
    { x: link.x + link.width + 16, y: link.y + link.height / 2, key: "ArrowLeft" },
    { x: link.x - 16, y: link.y + link.height / 2, key: "ArrowRight" },
  ];
  const approach = await page.evaluate((options) => options.find((p) => window.castlePreview.free(p.x, p.y)), options);
  assert(approach, "No clear door approach: " + link.name);
  await move(page, approach.x, approach.y, link.name);
  await page.keyboard.down(approach.key);
  try { await page.waitForFunction((target) => window.castlePreview.state.world === target, target, { timeout: 6000 }); }
  finally { await page.keyboard.up(approach.key); }
  await ready(page, target);
  const expected = worlds.get(target).entries[link.entry || "start"];
  const position = await page.evaluate(() => window.castlePreview.state.position);
  assert(Math.hypot(position.x - expected[0] * 32 - 16, position.y - expected[1] * 32 - 16) < 1, "Wrong arrival: " + link.name);
}
async function checkAnimations(page) {
  await page.click("#overview");
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const samples = { fire: new Set(), portrait: new Set() };
  const started = Date.now();
  while (Date.now() - started < 6500) {
    const hashes = await page.locator("#map").evaluate((c) => {
      const zoom = Math.min(c.clientWidth / (1536 + 64), c.clientHeight / (1024 + 64)), dpr = c.width / c.clientWidth;
      const ctx = c.getContext("2d");
      const regions = { fire: { x: 288, y: 192, width: 64, height: 64 }, portrait: { x: 1172, y: 56, width: 52, height: 64 } };
      return Object.fromEntries(Object.entries(regions).map(([name, r]) => {
        const x = Math.floor(c.width / 2 + (r.x - 768) * zoom * dpr), y = Math.floor(c.height / 2 + (r.y - 512) * zoom * dpr);
        const width = Math.max(1, Math.ceil(r.width * zoom * dpr)), height = Math.max(1, Math.ceil(r.height * zoom * dpr));
        const data = ctx.getImageData(x, y, width, height).data;
        let hash = 2166136261;
        for (const byte of data) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
        return [name, hash];
      }));
    });
    for (const name of Object.keys(samples)) samples[name].add(hashes[name]);
    if (samples.fire.size > 1 && samples.portrait.size > 1) break;
    await page.waitForTimeout(100);
  }
  assert(samples.fire.size > 1, "Native Hall fireplace pixels are static");
  assert(samples.portrait.size > 1, "Native Hall portrait pixels are static");
  return Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, values.size]));
}
async function closePanel(page) {
  await page.click("#content-close");
  assert(!(await page.locator("#content").isVisible()), "Content panel did not close");
  assert(!(await page.locator("#content-frame").getAttribute("src")), "Closed panel keeps an active iframe");
}
async function checkGames(page, viewport, seat) {
  assert(await page.locator("#hall-open").isVisible(), "Game secondary button hidden while seated: " + seat.id);
  assert((await page.locator("#action").textContent()) === "Aufstehen", "Game panel replaced the standing action");
  await page.click("#hall-open");
  assert(await page.locator("#content").isVisible(), "Game panel hidden");
  assert((await page.locator("#content-title").textContent()) === "Spielrunden", "Wrong game panel title");
  assert(new URL(await page.locator("#content-frame").getAttribute("src")).pathname.endsWith("/hall-games.html"), "Wrong game panel URL");
  const frame = page.frameLocator("#content-frame");
  await frame.getByText("CMS Stumble Guys", { exact: true }).waitFor();
  const links = await frame.locator("a.game").evaluateAll((links) => links.map((a) => ({ url: a.href, title: a.querySelector("strong").textContent })));
  assert(links.length === 7, "Expected seven CMS game links");
  for (const [i, link] of links.entries()) {
    const url = new URL(link.url);
    assert(url.origin + url.pathname === api + "workadventure_museum_open.php", "Game bypasses official CMS endpoint");
    assert(url.searchParams.get("board") === boards[i], "Wrong game board");
    assert(link.title === cmsItems[i].title, "CMS game title not applied");
  }
  assert(await frame.locator("body").evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Game panel overflows");
  await layoutCheck(page, "seated game panel");
  assert(await page.evaluate((id) => window.castlePreview.state.seat === id, seat.id), "Opening games unseats avatar");
  if (seat.id === "spiel-nw") {
    await screenshot(page, "grosse-halle-games-seated", viewport);
    await frame.locator('a.game[href*="board=haxballarea01"]').click();
    await frame.locator('[data-board="haxballarea01"]').waitFor();
    assert(await page.evaluate((id) => window.castlePreview.state.seat === id, seat.id), "Opening a CMS game unseats avatar");
  }
  await closePanel(page);
  assert(await page.evaluate((id) => window.castlePreview.state.seat === id, seat.id), "Closing games unseats avatar");
}
async function checkSeats(page, world, viewport) {
  let gamePanels = 0;
  for (const seat of world.seats) {
    await move(page, seat.standX, seat.standY, seat.id);
    await page.getByRole("button", { name: "Hinsetzen", exact: true }).click();
    const state = await page.evaluate(() => window.castlePreview.state);
    assert(state.seat === seat.id, "Wrong illustrated seat: " + seat.id);
    assert(state.position.x === seat.x && state.position.y === seat.y, "Wrong avatar position: " + seat.id);
    assert(state.conversation?.id === (seat.audioGroup ? "area-" + seat.audioGroup : "quiet"), "Wrong conversation: " + seat.id);
    await layoutCheck(page, "seated " + seat.id);
    if (viewport.width > 1000) await screenshot(page, `${world.id}-seat-${seat.id}`, viewport);
    if (world.id === "grosse-halle" && seat.audioGroup === "spieltreff") { await checkGames(page, viewport, seat); gamePanels++; }
    await page.getByRole("button", { name: "Aufstehen", exact: true }).click();
    const after = await page.evaluate(() => window.castlePreview.state);
    assert(!after.seat && after.position.x === seat.standX && after.position.y === seat.standY, "Standing failed: " + seat.id);
  }
  return { seats: world.seats.length, seatedGamePanels: gamePanels };
}
async function checkBoard(page, viewport) {
  const board = hallObjects.find((o) => prop(o, "hallAction") === "noticeboard");
  const approach = await page.evaluate((r) => {
    for (let y = r.y + 16; y < r.y + r.height; y += 32) for (let x = r.x + 16; x < r.x + r.width; x += 32)
      if (window.castlePreview.free(x, y)) return { x, y };
  }, board);
  assert(approach, "No reachable noticeboard approach");
  await move(page, approach.x, approach.y, "noticeboard");
  assert((await page.locator("#action").textContent()) === "Schlossbrett", "Noticeboard primary action missing");
  assert(await page.locator("#hall-open").isVisible(), "Noticeboard secondary action missing");
  await page.click("#action");
  await page.frameLocator("#content-frame").locator('[data-board="hallnotice01"]').waitFor();
  const url = new URL(await page.locator("#content-frame").getAttribute("src"));
  assert(url.origin + url.pathname === api + "workadventure_museum_open.php" && url.searchParams.get("board") === "hallnotice01", "Noticeboard bypasses official CMS endpoint");
  assert((await page.locator("#content-external").getAttribute("href")) === url.href, "Wrong external noticeboard URL");
  await layoutCheck(page, "noticeboard panel");
  await screenshot(page, "grosse-halle-noticeboard", viewport);
  await closePanel(page);
}

(async () => {
  assert(worlds.size === mapIds.length && mapIds.every((id) => worlds.has(id)), "Build all registered castle maps before browser QA");
  assert(hall.seats.length === 42, "Expected 42 Hall seats including the communal table");
  assert(commonRoom.links[0].target === "grosse-halle.tmj", "Middle common room must return to Hall, not EG");
  const browser = await chromium.launch({ headless: true, ...(!fs.existsSync(chromium.executablePath()) ? { channel: "chrome" } : {}) });
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport, reducedMotion: "no-preference", deviceScaleFactor: 1, isMobile: viewport.width < 680, hasTouch: viewport.width < 680 });
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(10000);
      page.on("pageerror", (e) => errors.push(`${viewport.width}: ${e.message}`));
      page.on("response", (r) => { if (r.status() >= 400) errors.push(`${viewport.width}: HTTP ${r.status()} ${r.url()}`); });
      await page.route(api + "workadventure_museum.php*", (route) => {
        cmsRequests.push("catalog");
        return route.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ items: cmsItems }) });
      });
      await page.route(api + "workadventure_museum_open.php*", (route) => {
        const board = new URL(route.request().url()).searchParams.get("board");
        assert(board === "hallnotice01" || boards.includes(board), "Unexpected CMS board: " + board);
        cmsRequests.push(board);
        return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="de"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CMS test</title><h1 data-board="${board}">CMS ${board}</h1></html>` });
      });
      await page.route("https://deutsche-online-schule.com/kino/**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><h1>Kinoverbindung</h1>" }));
      try {
        await page.goto(base.href, { waitUntil: "networkidle" });
        await ready(page, "grosse-halle");
        assert((await page.locator("#floor").inputValue()) === "grosse-halle", "Hall is not the default map");
        assert((await page.locator("#floor option").count()) === mapIds.length, "Map selector does not contain all registered maps");
        assert((await page.locator("header svg").count()) >= 3, "Missing toolbar icons");
        await layoutCheck(page, "default Hall");
        const pixels = await canvasColors(page);
        assert(pixels > 30, "Blank Hall canvas");
        await screenshot(page, "grosse-halle-overview", viewport);
        const animations = await checkAnimations(page);
        const maps = [];
        for (const id of mapIds) {
          await page.selectOption("#floor", id);
          await ready(page, id);
          if(id==='kino'){
            await page.frameLocator('#content-frame').getByText('Kinoverbindung',{exact:true}).waitFor();
            await layoutCheck(page,'automatic cinema panel');
            await screenshot(page,'kino-auto-panel',viewport);
            await closePanel(page);
          }
          await page.click("#overview");
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
          await layoutCheck(page, id);
          assert(await canvasColors(page) > 30, "Blank map: " + id);
          await screenshot(page, "map-" + id, viewport);
          maps.push(id);
        }
        await load(page, "grosse-halle");
        const hallSeats = await checkSeats(page, hall, viewport);
        await checkBoard(page, viewport);
        const podium = hallObjects.find((o) => prop(o, "hallPodium"));
        const podiumPoint = await page.evaluate((r) => {
          for (let y = r.y + r.height - 16; y >= r.y; y -= 16) for (let x = r.x + 16; x < r.x + r.width; x += 16)
            if (window.castlePreview.free(x, y)) return { x, y };
        }, podium);
        assert(podiumPoint, "Podium approach blocked");
        await move(page, podiumPoint.x, podiumPoint.y, "podium");
        await layoutCheck(page, "podium action");
        await screenshot(page, "grosse-halle-podium", viewport);
        await move(page, 176, 240, "protected teacher portal");
        assert((await page.locator("#action").textContent()) === "Lehrerzimmer oeffnen", "Protected teacher portal action missing");
        assert(await page.evaluate(() => window.castlePreview.state.world === "grosse-halle"), "Teacher portal opened without explicit user action");
        const hallTrips = [];
        for (const link of hall.links.filter((l) => !l.target.startsWith("../"))) {
          await load(page, "grosse-halle");
          await walkThrough(page, link);
          const destination = worlds.get(link.target.replace(".tmj", ""));
          const back = destination.links.find((l) => l.target === "grosse-halle.tmj");
          assert(back, "Missing Hall return from " + destination.id);
          await walkThrough(page, back);
          hallTrips.push(destination.id);
        }
        await load(page, "mittelstufe");
        const middleSeats = await checkSeats(page, commonRoom, viewport);
        await walkThrough(page, commonRoom.links[0]);
        assert(await page.evaluate(() => window.castlePreview.state.world === "grosse-halle"), "MS exit returned to EG instead of Hall");
        await walkThrough(page, hall.links.find((l) => l.target === "mittelstufe.tmj"));
        await load(page, "kino");
        await page.frameLocator('#content-frame').getByText('Kinoverbindung',{exact:true}).waitFor();
        await closePanel(page);
        const cinemaSeats = await checkSeats(page, worlds.get("kino"), viewport);
        await page.click("#overview");
        await screenshot(page, "kino-overview", viewport);
        await page.click("#explore");
        await page.click("#cinema-open");
        await page.frameLocator("#content-frame").getByText("Kinoverbindung", { exact: true }).waitFor();
        await layoutCheck(page, "cinema panel");
        await screenshot(page, "kino-panel", viewport);
        await closePanel(page);
        await load(page, "bibliothek");
        const librarySeats=await checkSeats(page,worlds.get("bibliothek"),viewport);
        await page.click("#overview");
        await screenshot(page,"bibliothek-overview",viewport);
        await walkThrough(page,worlds.get("bibliothek").links[0]);
        await load(page,'grundschule');
        const primarySeats=await checkSeats(page,worlds.get('grundschule'),viewport);
        await page.click('#overview');await screenshot(page,'grundschule-overview',viewport);
        await move(page,198,288,'story activity');await page.click('#hall-open');
        await page.frameLocator('#content-frame').getByRole('button',{name:'Neue Karten'}).click();
        await layoutCheck(page,'story activity');await screenshot(page,'grundschule-story',viewport);await closePanel(page);
        await walkThrough(page,worlds.get('grundschule').links[0]);
        const expansionChecks=[];
        for(const id of ['erdgeschoss','obergeschoss','oberstufe','spielesaal','museum','musikzimmer','atelier','sternwarte','umgebung','dorf','park']){
          const world=worlds.get(id);await load(page,id);const seats=await checkSeats(page,world,viewport);
          const links=[];for(const link of world.links){await load(page,id);await walkThrough(page,link);links.push(link.name);}
          expansionChecks.push({id,seats:seats.seats,links});
        }
        await load(page,'park');await move(page,1012,160,'water slide');
        await page.getByRole('button',{name:'Rutschen',exact:true}).click();
        await page.waitForFunction(()=>window.castlePreview.state.ride);await page.waitForTimeout(250);
        await page.getByRole('button',{name:'Rutsche verlassen',exact:true}).click();
        assert(!await page.evaluate(()=>window.castlePreview.state.ride),'Preview ride cancellation');
        await load(page, "erdgeschoss");
        const egSeat = worlds.get("erdgeschoss").seats[0];
        await move(page, egSeat.standX, egSeat.standY, egSeat.id);
        await page.getByRole("button", { name: "Hinsetzen", exact: true }).click();
        assert(await page.evaluate((id) => window.castlePreview.state.seat === id, egSeat.id), "Existing EG seat failed");
        await page.getByRole("button", { name: "Aufstehen", exact: true }).click();
        await page.keyboard.down("ArrowRight");
        await page.waitForTimeout(150);
        await page.evaluate(() => window.dispatchEvent(new Event("blur")));
        const before = await page.evaluate(() => window.castlePreview.state.position);
        await page.waitForTimeout(200);
        const after = await page.evaluate(() => window.castlePreview.state.position);
        await page.keyboard.up("ArrowRight");
        assert(Math.hypot(before.x - after.x, before.y - after.y) < 0.1, "Movement sticks after blur");
        await load(page, "grosse-halle");
        await page.click("#overview");
        await layoutCheck(page, "final Hall");
        const layoutPassed = !layoutFindings.some((f) => f.viewport.width === viewport.width);
        results.push({ viewport, pixels, maps: maps.length, defaultHall: true, hallSeats: hallSeats.seats, middleSeats: middleSeats.seats, cinemaSeats:cinemaSeats.seats, librarySeats:librarySeats.seats, expansionChecks, seatedGamePanels: hallSeats.seatedGamePanels, noticeboardCmsPanel: true, gameCmsTitles: true, nativeAnimationPixelStates: animations, hallRoundTrips: hallTrips, commonRoomReturnsToHall: true, protectedTeacherLink: true, cinemaPanel: true, blurStopsMovement: true, layoutPassed });
        console.log(JSON.stringify({ viewport, status: layoutPassed ? "passed" : "functional checks passed; layout finding", hallSeats: hallSeats.seats, maps: maps.length }));
      } catch (error) {
        await screenshot(page, "failed", viewport).catch(() => {});
        throw error;
      } finally { await page.close(); }
    }
    const report = { results, errors, layoutFindings, cmsMode: "official endpoint URLs with local deterministic CMS/cinema responses; no publishing or protected-room navigation", cmsRequests, screenshots, output: out };
    fs.writeFileSync(path.join(out, "great-hall-browser-report.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({output:out,viewports:results.map(r=>({viewport:r.viewport,maps:r.maps,layoutPassed:r.layoutPassed})),screenshots:screenshots.length,errors,layoutFindings},null,2));
    assert(errors.length === 0, "Browser errors: " + errors.join("; "));
    assert(layoutFindings.length === 0, "Layout findings saved in great-hall-browser-report.json");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
