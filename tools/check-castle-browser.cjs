const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("./castle-deps.cjs")("playwright");
const root = path.resolve(__dirname, ".."),
  out = path.resolve(root, "../output/schulschloss-20261107");
fs.mkdirSync(out, { recursive: true });
const base = process.argv[2] || "http://127.0.0.1:4192/";
const commonRoom = JSON.parse(
  fs.readFileSync(
    path.join(root, "castle/art/mittelstufe-20261107/layout.json"),
  ),
);
function assert(ok, message) {
  if (!ok) throw Error(message);
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(!fs.existsSync(chromium.executablePath()) ? { channel: "chrome" } : {}),
  });
  const errors = [];
  const results = [];
  try {
    for (const viewport of [
      { width: 1440, height: 960 },
      { width: 390, height: 844 },
      { width: 320, height: 740 },
    ]) {
      const page = await browser.newPage({ viewport });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.castlePreview?.state);
      await page.waitForTimeout(250);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Horizontal overflow",
      );
      assert(
        await page
          .locator("header")
          .evaluate((h) =>
            [...h.children]
              .filter((e) => e.getBoundingClientRect().width > 2)
              .every(
                (e) =>
                  e.getBoundingClientRect().bottom <=
                  h.getBoundingClientRect().bottom + 1,
              ),
          ),
        "Header content overlaps map",
      );
      assert(
        (await page.locator("header svg").count()) >= 3,
        "Missing toolbar icons",
      );
      const pixels = await page.locator("canvas").evaluate((c) => {
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
          colors = new Set();
        for (let i = 0; i < d.length; i += 160)
          colors.add(d.slice(i, i + 3).join(","));
        return colors.size;
      });
      assert(pixels > 30, "Blank canvas");
      await page.screenshot({
        path: path.join(out, `grundriss-${viewport.width}.png`),
      });
      for (const id of [
        "obergeschoss",
        "kino",
        "umgebung",
        "mittelstufe",
        "erdgeschoss",
      ]) {
        await page.selectOption("#floor", id);
        await page.waitForFunction(
          (id) => window.castlePreview?.state.world === id,
          id,
        );
        await page.waitForTimeout(120);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Overflow in " + id,
        );
      }
      await page.selectOption("#floor", "kino");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "kino",
      );
      await page.route("https://deutsche-online-schule.com/kino/**", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Kino Test</title><h1>Kinoverbindung</h1>",
        }),
      );
      await page.click("#cinema-open");
      assert(await page.locator("#content").isVisible(), "Cinema panel hidden");
      await page.click("#content-close");
      assert(
        !(await page.locator("#content").isVisible()),
        "Cinema panel not closed",
      );
      await page.selectOption("#floor", "erdgeschoss");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "erdgeschoss",
      );
      const seats = JSON.parse(
        fs.readFileSync(path.join(root, "castle/layout.json")),
      ).worlds.find((w) => w.id === "erdgeschoss").seats;
      const s = seats.find((s) => s.id === "halle-west-n0");
      await page.evaluate(
        (s) => window.castlePreview.moveTo(s.standX, s.standY),
        s,
      );
      await page.waitForTimeout(100);
      await page
        .getByRole("button", { name: "Hinsetzen", exact: true })
        .click();
      assert(
        await page.evaluate(
          (id) => window.castlePreview.state.seat === id,
          s.id,
        ),
        "Seat not entered",
      );
      await page
        .getByRole("button", { name: "Aufstehen", exact: true })
        .click();
      assert(
        await page.evaluate(() => !window.castlePreview.state.seat),
        "Seat not left",
      );
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(180);
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      const p = await page.evaluate(() => window.castlePreview.state.position);
      await page.waitForTimeout(220);
      const after = await page.evaluate(
        () => window.castlePreview.state.position,
      );
      await page.keyboard.up("ArrowRight");
      assert(
        Math.hypot(p.x - after.x, p.y - after.y) < 0.1,
        "Movement sticks after blur",
      );
      if (viewport.width > 1000) {
        await page
          .getByRole("button", { name: "Mittelstufenraum", exact: true })
          .click();
        await page.waitForTimeout(150);
        const a = await page.locator("canvas").evaluate((c) => c.toDataURL());
        await page.waitForTimeout(400);
        const b = await page.locator("canvas").evaluate((c) => c.toDataURL());
        assert(a !== b, "Native animation preview is static");
        await page.screenshot({
          path: path.join(out, "mittelstufe-desktop.png"),
        });
      }
      await page.evaluate(() =>
        window.castlePreview.moveTo(43 * 32 + 16, 68 * 32 + 16),
      );
      await page.keyboard.down("ArrowDown");
      await page.waitForTimeout(450);
      await page.keyboard.up("ArrowDown");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "umgebung",
      );
      await page.selectOption("#floor", "mittelstufe");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "mittelstufe",
      );
      await page.click("#overview");
      await page.waitForTimeout(300);
      const firstFire = await page
        .locator("canvas")
        .evaluate((c) => c.toDataURL());
      await page.waitForTimeout(300);
      assert(
        firstFire !==
          (await page.locator("canvas").evaluate((c) => c.toDataURL())),
        "Illustrated fireplace is static",
      );
      await page.screenshot({
        path: path.join(out, `mittelstufe-fertig-${viewport.width}.png`),
      });
      for (const seat of commonRoom.seats) {
        assert(
          await page.evaluate(
            (s) => window.castlePreview.moveTo(s.standX, s.standY),
            seat,
          ),
          "Unreachable seat approach: " + seat.id,
        );
        await page
          .getByRole("button", { name: "Hinsetzen", exact: true })
          .click();
        assert(
          await page.evaluate(
            (id) => window.castlePreview.state.seat === id,
            seat.id,
          ),
          "Wrong illustrated seat: " + seat.id,
        );
        assert(
          await page.evaluate(
            (group) =>
              window.castlePreview.state.conversation?.id === "area-" + group,
            seat.audioGroup,
          ),
          "Wrong conversation: " + seat.id,
        );
        if (viewport.width > 1000) {
          await page.waitForTimeout(150);
          await page.screenshot({
            path: path.join(out, `sitz-${seat.id}.png`),
          });
        }
        await page
          .getByRole("button", { name: "Aufstehen", exact: true })
          .click();
        assert(
          await page.evaluate((s) => {
            const state = window.castlePreview.state;
            return (
              !state.seat &&
              state.position.x === s.standX &&
              state.position.y === s.standY
            );
          }, seat),
          "Standing failed: " + seat.id,
        );
      }
      assert(
        await page.evaluate(() => window.castlePreview.moveTo(368, 464)),
        "Return door approach blocked",
      );
      await page.keyboard.down("ArrowDown");
      await page.waitForTimeout(450);
      await page.keyboard.up("ArrowDown");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "erdgeschoss",
      );
      assert(
        await page.evaluate(() =>
          window.castlePreview.moveTo(72 * 32 + 16, 34 * 32 + 16),
        ),
        "Common room door approach blocked",
      );
      await page.keyboard.down("ArrowUp");
      await page.waitForTimeout(450);
      await page.keyboard.up("ArrowUp");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "mittelstufe",
      );
      await page.selectOption("#floor", "kino");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "kino",
      );
      await page.click("#overview");
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(out, `kino-${viewport.width}.png`),
      });
      await page.selectOption("#floor", "umgebung");
      await page.waitForFunction(
        () => window.castlePreview.state.world === "umgebung",
      );
      await page.click("#overview");
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(out, `umgebung-${viewport.width}.png`),
      });
      results.push({
        viewport,
        pixels,
        maps: 5,
        illustratedSeats: commonRoom.seats.length,
        commonRoomReturnTrip: true,
        seating: true,
        cinemaPanel: true,
        blurStopsMovement: true,
      });
      await page.close();
    }
    assert(errors.length === 0, "Browser errors: " + errors.join("; "));
    console.log(JSON.stringify({ results, errors, output: out }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
