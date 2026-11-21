// Horizontal swipe navigation on smartphones (MOBILE-SWIPE-NAV), driven from the interface with real
// touch input (CDP Input.dispatchTouchEvent): the browser's own gesture pipeline, touch-action and
// native scroll included. No check calls a "next scene" function.
// Usage: [SITE=url] [OUT=dir] [ONLY=home,kannot,mila,ends,text,legacy,video] [QA_CHANNEL=chrome] node qa/swipe.mjs
//   home    phone portrait: hint, one landmark per swipe, ambiguous gestures, covers, both ends
//   kannot  Ti Kannot from the home's cover: swipes against the page buttons, ends, rotation, controls
//   mila    Mila from the home's cover, real time: the same, and swipes during a transition
//   ends    Mila's last page and landscape phones (reduced motion, to get there quickly)
//   text    long passages on a small phone (320×568, Mila 568×320): vertical scroll to the last line,
//           Kréyòl and French
//   legacy  desktop, narrow desktop window and tablet: values to compare between two builds
//           (run it on both with two OUT folders, then diff legacy.json)
//   video   short recordings of a round trip on the home and in each tale
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/swipe/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "home,kannot,mila,ends,text").split(",");
mkdirSync(OUT, { recursive: true });
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const GPU_ENV = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};
const touchVp = (width, height, deviceScaleFactor = 3) => ({
  viewport: { width, height },
  deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
});
const PROFILES = {
  phone: touchVp(390, 844),
  landscape: touchVp(844, 390),
  small: touchVp(320, 568, 2),
  smallLandscape: touchVp(568, 320, 2),
  tablet: touchVp(820, 1180, 2),
  desktop: { viewport: { width: 1440, height: 900 } },
  narrow: { viewport: { width: 390, height: 844 } },
};
const results = { site: SITE, browser: "", renderer: "", checks: [], legacy: {} };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Records one check; `pass` false fails the run. */
function check(run, name, pass, detail = "") {
  results.checks.push({ run, name, pass: Boolean(pass), detail: String(detail) });
  console.log(`${pass ? "PASS" : "FAIL"} ${run} ${name}${detail !== "" ? ` — ${detail}` : ""}`);
}

/** Shows each finger as a dot, so the recordings show the gesture (QA only, never in the app). */
const SHOW_TOUCHES = () => {
  const dots = new Map();
  const place = (e) => {
    let dot = dots.get(e.pointerId);
    if (!dot) {
      dot = document.createElement("div");
      dot.style.cssText =
        "position:fixed;z-index:999;width:36px;height:36px;margin:-18px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid rgba(0,0,0,.55);pointer-events:none";
      document.documentElement.append(dot);
      dots.set(e.pointerId, dot);
    }
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
  };
  const lift = (e) => {
    dots.get(e.pointerId)?.remove();
    dots.delete(e.pointerId);
  };
  addEventListener("pointerdown", (e) => e.pointerType === "touch" && place(e), true);
  addEventListener("pointermove", (e) => dots.has(e.pointerId) && place(e), true);
  addEventListener("pointerup", lift, true);
  addEventListener("pointercancel", lift, true);
};

async function open(browser, profile, extra = {}) {
  const ctx = await browser.newContext({ ...PROFILES[profile], ...extra });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on(
    "console",
    (m) => m.type() === "error" && errors.push(`console: ${m.text()} ${m.location().url}`),
  );
  // QA visits stay out of the site's audience statistics.
  await ctx.route(/umami\.is/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  if (extra.recordVideo) await p.addInitScript(SHOW_TOUCHES);
  await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
  await p.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(p);
  return { ctx, p, cdp, errors };
}

/* ---------- real touch input ---------- */
const points = (list) => list.map(([x, y], id) => ({ x: Math.round(x), y: Math.round(y), id }));
const send = (cdp, type, list) =>
  cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points(list) });

/** One finger from `from` to `to`; `end` "cancel" lets the system take the touch away. */
async function drag(cdp, from, to, { steps = 8, ms = 160, end = "end" } = {}) {
  await send(cdp, "touchStart", [from]);
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    await send(cdp, "touchMove", [
      [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k],
    ]);
    await sleep(ms / steps);
  }
  await send(cdp, end === "cancel" ? "touchCancel" : "touchEnd", []);
}
/** Two fingers moving together by `d`. */
async function drag2(cdp, a, b, d) {
  await send(cdp, "touchStart", [a]);
  await send(cdp, "touchStart", [a, b]);
  for (let i = 1; i <= 6; i++) {
    const k = i / 6;
    await send(cdp, "touchMove", [
      [a[0] + d[0] * k, a[1] + d[1] * k],
      [b[0] + d[0] * k, b[1] + d[1] * k],
    ]);
    await sleep(20);
  }
  await send(cdp, "touchEnd", []);
}
/** A press whose finger trembles a few pixels before lifting. */
async function shakyTap(cdp, [x, y]) {
  await send(cdp, "touchStart", [[x, y]]);
  for (const [dx, dy] of [
    [4, 3],
    [-3, 5],
    [5, -4],
    [2, 2],
  ]) {
    await send(cdp, "touchMove", [[x + dx, y + dy]]);
    await sleep(25);
  }
  await send(cdp, "touchEnd", []);
}
const size = (p) => p.viewportSize();
/** A swipe across the middle of the screen: right to left is "next". */
async function swipe(p, cdp, direction, options = {}) {
  const { width, height } = size(p);
  const y = height * (options.at ?? 0.5);
  const [a, b] = direction === "next" ? [0.8, 0.25] : [0.2, 0.75];
  await drag(cdp, [width * a, y], [width * b, y + 6], options);
}
const centre = async (locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no box");
  return [box.x + box.width / 2, box.y + box.height / 2];
};
const tap = async (cdp, locator) => {
  await locator.scrollIntoViewIfNeeded();
  const at = await centre(locator);
  await send(cdp, "touchStart", [at]);
  await sleep(40);
  await send(cdp, "touchEnd", []);
};

/* ---------- state read from the interface ---------- */
/** The home: climb progress from the climb bar, the near card from the shelf, the hint, the open book. */
const home = (p) =>
  p.evaluate(() => {
    const bar = document.querySelector(".tree-climb").getBoundingClientRect();
    const thumb = document.querySelector(".tree-climb-thumb").getBoundingClientRect();
    const hint = document.querySelector(".tree-intro-hint");
    const app = document.querySelector("#app");
    return {
      t: Math.round(((thumb.top - bar.top) / (bar.height - thumb.height)) * 1000) / 1000,
      near: [...document.querySelectorAll(".tree-shelf-book")].findIndex((b) =>
        b.classList.contains("is-near"),
      ),
      hint: hint.hidden ? null : hint.textContent,
      book: app.dataset.book ?? null,
      path: location.pathname,
    };
  });
/** The home once the camera has come to rest. */
async function settled(p) {
  let last = await home(p);
  for (let i = 0; i < 30; i++) {
    await p.waitForTimeout(300);
    const now = await home(p);
    if (Math.abs(now.t - last.t) < 0.0015) return now;
    last = now;
  }
  return last;
}
const kannot = (p) =>
  p.evaluate(() => {
    const text = (s) => document.querySelector(s)?.textContent ?? null;
    const card = document.querySelector(".reading-card");
    return {
      count: text(".reading-count"),
      title: text(".reading-title"),
      lang: card?.lang ?? null,
      open: !document.querySelector(".reading").hidden,
      book: document.querySelector("#app").dataset.book ?? null,
    };
  });
const mila = (p) =>
  p.evaluate(() => {
    const text = (s) => document.querySelector(s)?.textContent ?? null;
    return {
      count: text(".mila-count"),
      num: text(".mila-num"),
      heading: text(".mila-heading"),
      lang: document.querySelector(".mila-story")?.lang ?? null,
      book: document.querySelector("#app").dataset.book ?? null,
    };
  });
/** Mila once the page has arrived: its text is on and the page buttons are live again. */
async function milaArrived(p, timeout = 25000) {
  await p.waitForFunction(
    () => {
      const next = document.querySelector(".mila-next");
      const reread = document.querySelector(".mila-reread");
      return (
        document.querySelector(".mila-story.is-on") &&
        ((next && !next.hidden && !next.disabled) || (reread && !reread.hidden && !reread.disabled))
      );
    },
    undefined,
    { timeout },
  );
  await p.waitForTimeout(1300);
  return mila(p);
}

/** Mean absolute difference (0–255) between two screenshots, compared at 96 px wide. */
async function diff(p, a, b) {
  return p.evaluate(
    async ([ua, ub]) => {
      const load = async (u) => {
        const img = new Image();
        img.src = u;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = 96;
        c.height = Math.round((96 * img.height) / img.width);
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0, c.width, c.height);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const [da, db] = [await load(ua), await load(ub)];
      let sum = 0;
      for (let i = 0; i < da.length; i++) sum += Math.abs(da[i] - db[i]);
      return Math.round((sum / da.length) * 100) / 100;
    },
    [a, b].map((buf) => `data:image/png;base64,${buf.toString("base64")}`),
  );
}
/** The scene above the text (the decor), as a PNG; `file` also saves the whole screen. */
async function decor(p, file) {
  if (file) await p.screenshot({ path: OUT + file });
  const { width, height } = size(p);
  return p.screenshot({ clip: { x: 0, y: 70, width, height: Math.round(height * 0.3) } });
}

/** Swipes the home to the landmark of card `index` and presses its cover with a trembling finger. */
async function enterByCover(p, cdp, index) {
  for (let i = 0; i < 6 && (await settled(p)).near !== index; i++) await swipe(p, cdp, "next");
  await shakyTap(cdp, await centre(p.locator(".tree-book:not([hidden])")));
}

/* ---------- journeys ---------- */
async function runHome(browser) {
  const run = "home";
  const { ctx, p, cdp, errors } = await open(browser, "phone");
  const { width, height } = size(p);
  const mid = [width / 2, height / 2];
  let s = await settled(p);
  check(
    run,
    "phone-detected",
    await p.evaluate(() => "phone" in document.querySelector("#app").dataset),
  );
  check(run, "hint-invites-swipe", s.hint === "Glisse vers la gauche pour explorer", s.hint);
  await p.screenshot({ path: OUT + "home-0-hint.png" });

  await swipe(p, cdp, "next");
  s = await settled(p);
  check(
    run,
    "swipe-left-reaches-first-cover",
    s.near === 0 && Math.abs(s.t - 0.2) < 0.01,
    `t=${s.t} near=${s.near}`,
  );
  check(run, "hint-removed-after-first-navigation", s.hint === null);
  await p.screenshot({ path: OUT + "home-1-first-cover.png" });
  await swipe(p, cdp, "next");
  s = await settled(p);
  check(
    run,
    "second-swipe-reaches-second-cover",
    s.near === 1 && Math.abs(s.t - 0.54) < 0.01,
    `t=${s.t} near=${s.near}`,
  );
  await swipe(p, cdp, "previous");
  s = await settled(p);
  check(
    run,
    "swipe-right-comes-back",
    s.near === 0 && Math.abs(s.t - 0.2) < 0.01,
    `t=${s.t} near=${s.near}`,
  );

  const rest = s.t;
  const still = async (name) => {
    const now = await settled(p);
    check(run, name, Math.abs(now.t - rest) < 0.005 && now.book === null, `t=${now.t}`);
  };
  await drag(cdp, [mid[0], height * 0.7], [mid[0] + 10, height * 0.25]);
  await still("vertical-move-keeps-the-scene");
  await drag(cdp, [mid[0] + 80, height * 0.65], [mid[0] - 70, height * 0.4]);
  await still("diagonal-move-keeps-the-scene");
  await drag(cdp, [mid[0] + 15, mid[1]], [mid[0] - 15, mid[1]]);
  await still("short-move-keeps-the-scene");
  await drag(cdp, [width * 0.8, mid[1]], [width * 0.2, mid[1]], { end: "cancel" });
  await still("cancelled-swipe-keeps-the-scene");
  await drag(cdp, [width * 0.8, mid[1]], [width * 0.75, mid[1]], { steps: 12, ms: 300 });
  await drag2(cdp, [width * 0.8, mid[1] - 40], [width * 0.8, mid[1] + 60], [-width * 0.55, 0]);
  await still("two-finger-move-keeps-the-scene");
  await drag(cdp, [width * 0.85, mid[1]], [width * 0.3, mid[1]], { steps: 10, ms: 500 });
  await drag(cdp, [width * 0.3, mid[1]], [width * 0.85, mid[1]], { steps: 10, ms: 500 });
  // out and back in one touch
  await send(cdp, "touchStart", [[width * 0.8, mid[1]]]);
  for (const x of [0.6, 0.4, 0.3, 0.5, 0.7, 0.78]) {
    await send(cdp, "touchMove", [[width * x, mid[1]]]);
    await sleep(30);
  }
  await send(cdp, "touchEnd", []);
  await still("swipe-that-comes-back-keeps-the-scene");

  await drag(cdp, [width * 0.95, mid[1]], [width * 0.03, mid[1] + 4], { steps: 3, ms: 30 });
  s = await settled(p);
  check(run, "fast-long-swipe-moves-one-scene", s.near === 1, `t=${s.t} near=${s.near}`);
  await swipe(p, cdp, "previous");
  await settled(p);

  const cover = await centre(p.locator(".tree-book:not([hidden])"));
  await drag(cdp, cover, [cover[0] - 190, cover[1] + 5]);
  s = await settled(p);
  check(
    run,
    "swipe-from-a-cover-explores-without-opening",
    s.near === 1 && s.book === null,
    `near=${s.near} book=${s.book}`,
  );
  await swipe(p, cdp, "previous");
  await swipe(p, cdp, "previous");
  s = await settled(p);
  check(run, "back-to-the-opening-view", s.t < 0.01, `t=${s.t}`);
  check(run, "hint-stays-removed", s.hint === null);
  await swipe(p, cdp, "previous");
  s = await settled(p);
  check(run, "start-of-the-climb-is-respected", s.t < 0.01, `t=${s.t}`);
  for (let i = 0; i < 4; i++) await swipe(p, cdp, "next");
  s = await settled(p);
  check(
    run,
    "end-of-the-climb-is-respected",
    Math.abs(s.t - 0.88) < 0.01 && s.path === "/",
    `t=${s.t} near=${s.near} path=${s.path}`,
  );
  await swipe(p, cdp, "previous");
  await swipe(p, cdp, "previous");
  s = await settled(p);
  check(run, "back-on-the-first-cover", s.near === 0, `near=${s.near}`);

  // the shelf keeps its own horizontal scroll and its taps
  await tap(cdp, p.locator(".tree-shelf-book").nth(1));
  s = await settled(p);
  check(run, "shelf-still-climbs-to-a-book", s.near === 1, `near=${s.near}`);
  await swipe(p, cdp, "previous");
  await settled(p);

  await shakyTap(cdp, await centre(p.locator(".tree-book:not([hidden])")));
  await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
  const k = await kannot(p);
  check(run, "trembling-tap-on-the-cover-opens-its-tale", k.book === "ti-kannot", k.book);
  check(run, "no-console-error", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function runKannot(browser) {
  const run = "kannot";
  const { ctx, p, cdp, errors } = await open(browser, "phone");
  await enterByCover(p, cdp, 0);
  await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
  await p.waitForTimeout(3500);
  let k = await kannot(p);
  check(run, "opens-on-page-1", k.count === "1 / 12" && k.book === "ti-kannot", k.count);
  const hint = await p.locator(".reading-hint").textContent();
  check(run, "hint-invites-swipe", hint === "Glissez pour continuer", hint);
  await p.screenshot({ path: OUT + "kannot-1.png" });

  await swipe(p, cdp, "next", { at: 0.3 });
  await p.waitForTimeout(1200);
  await swipe(p, cdp, "next", { at: 0.3 });
  await p.waitForTimeout(1200);
  await swipe(p, cdp, "previous", { at: 0.3 });
  await p.waitForTimeout(4500);
  const bySwipe = await kannot(p);
  check(run, "forward-twice-back-once-shows-page-2", bySwipe.count === "2 / 12", bySwipe.count);
  const a = await decor(p, "kannot-2-by-swipe.png");

  await tap(cdp, p.locator(".reading-prev"));
  await p.waitForTimeout(600);
  await tap(cdp, p.locator(".reading-next"));
  await p.waitForTimeout(600);
  await tap(cdp, p.locator(".reading-next"));
  await p.waitForTimeout(600);
  await tap(cdp, p.locator(".reading-prev"));
  await p.waitForTimeout(4500);
  const byButton = await kannot(p);
  check(
    run,
    "buttons-lead-to-the-same-text",
    JSON.stringify(byButton) === JSON.stringify(bySwipe),
    `${byButton.count} ${byButton.title}`,
  );
  const b = await decor(p, "kannot-2-by-button.png");
  await tap(cdp, p.locator(".reading-next"));
  await p.waitForTimeout(4500);
  const c = await decor(p);
  const [same, other] = [await diff(p, a, b), await diff(p, a, c)];
  check(
    run,
    "buttons-lead-to-the-same-decor",
    same < other * 0.5,
    `page 2 swipe vs button ${same}, page 2 vs page 3 ${other}`,
  );
  await swipe(p, cdp, "previous", { at: 0.3 });
  await p.waitForTimeout(1200);

  // a swipe that starts on the text card turns the page too
  const card = await p.locator(".reading-card").boundingBox();
  const cy = card.y + card.height / 2;
  await drag(cdp, [card.x + card.width * 0.8, cy], [card.x + card.width * 0.2, cy + 5]);
  await p.waitForTimeout(1200);
  k = await kannot(p);
  check(run, "swipe-on-the-text-card-turns-the-page", k.count === "3 / 12", k.count);
  await drag(
    cdp,
    [card.x + card.width * 0.5, card.y + card.height * 0.8],
    [card.x + card.width * 0.5 + 8, card.y - 120],
  );
  await drag(cdp, [200, 300], [205, 90]);
  await drag(cdp, [300, 280], [150, 130]);
  await drag2(cdp, [300, 200], [300, 300], [-200, 0]);
  await drag(cdp, [320, 250], [90, 250], { end: "cancel" });
  await p.waitForTimeout(1200);
  k = await kannot(p);
  check(run, "vertical-diagonal-two-finger-cancelled-keep-the-page", k.count === "3 / 12", k.count);
  await drag(cdp, [370, 250], [20, 254], { steps: 3, ms: 30 });
  await p.waitForTimeout(1200);
  k = await kannot(p);
  check(run, "fast-long-swipe-turns-one-page", k.count === "4 / 12", k.count);

  for (let i = 0; i < 3; i++) {
    await swipe(p, cdp, "previous", { at: 0.3 });
    await p.waitForTimeout(900);
  }
  k = await kannot(p);
  check(run, "back-to-page-1", k.count === "1 / 12", k.count);
  await swipe(p, cdp, "previous", { at: 0.3 });
  await p.waitForTimeout(900);
  k = await kannot(p);
  check(
    run,
    "first-page-is-respected",
    k.count === "1 / 12" && k.open && k.book === "ti-kannot",
    k.count,
  );

  for (let i = 0; i < 11; i++) {
    await tap(cdp, p.locator(".reading-next"));
    await p.waitForTimeout(350);
  }
  k = await kannot(p);
  check(run, "buttons-reach-the-last-page", k.count === "12 / 12", k.count);
  await swipe(p, cdp, "next", { at: 0.3 });
  await p.waitForTimeout(900);
  await swipe(p, cdp, "next", { at: 0.3 });
  await p.waitForTimeout(1500);
  k = await kannot(p);
  check(
    run,
    "last-page-neither-closes-nor-restarts",
    k.count === "12 / 12" && k.open && k.book === "ti-kannot",
    `${k.count} open=${k.open} book=${k.book}`,
  );

  // the phone turns while reading
  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(1500);
  k = await kannot(p);
  check(run, "rotation-keeps-the-page", k.count === "12 / 12", k.count);
  await p.screenshot({ path: OUT + "kannot-12-landscape.png" });
  await swipe(p, cdp, "previous", { at: 0.45 });
  await p.waitForTimeout(1200);
  k = await kannot(p);
  check(run, "landscape-swipe-right-goes-back", k.count === "11 / 12", k.count);
  await swipe(p, cdp, "previous", { at: 0.45 });
  await p.waitForTimeout(1200);
  await swipe(p, cdp, "next", { at: 0.45 });
  await p.waitForTimeout(1200);
  k = await kannot(p);
  check(run, "landscape-swipe-left-goes-on", k.count === "11 / 12", k.count);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1500);
  k = await kannot(p);
  check(run, "rotation-back-keeps-the-page", k.count === "11 / 12", k.count);

  await tap(cdp, p.locator('.reading-langs button[data-lang="fr"]'));
  await p.waitForTimeout(600);
  k = await kannot(p);
  check(
    run,
    "language-switch-answers-a-tap",
    k.lang === "fr" && k.count === "11 / 12",
    `${k.lang} ${k.count}`,
  );
  await swipe(p, cdp, "next", { at: 0.3 });
  await p.waitForTimeout(1200);
  k = await kannot(p);
  check(run, "swipe-works-in-french", k.count === "12 / 12" && k.lang === "fr", k.count);
  await tap(cdp, p.locator(".reading-back"));
  await p.waitForFunction(() => !document.querySelector("#app").dataset.book, undefined, {
    timeout: 15000,
  });
  await p.waitForTimeout(2500);
  let s = await settled(p);
  check(run, "back-control-returns-to-the-tree", s.book === null && s.near === 0, `near=${s.near}`);
  await swipe(p, cdp, "next");
  s = await settled(p);
  check(run, "home-swipe-works-after-the-return", s.near === 1, `near=${s.near}`);
  check(run, "no-console-error", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function runMila(browser) {
  const run = "mila";
  const { ctx, p, cdp, errors } = await open(browser, "phone");
  await enterByCover(p, cdp, 1);
  let m = await milaArrived(p, 40000);
  check(
    run,
    "cover-opens-mila-on-page-1",
    m.book === "mila" && m.num === "Page 01",
    `${m.book} ${m.num}`,
  );
  await p.screenshot({ path: OUT + "mila-1.png" });

  // a second swipe while the page is still on its way is not queued
  await swipe(p, cdp, "next", { at: 0.4 });
  await p.waitForTimeout(700);
  await swipe(p, cdp, "next", { at: 0.4 });
  m = await milaArrived(p);
  check(run, "swipe-during-a-transition-is-ignored", m.num === "Page 02", m.num);
  await swipe(p, cdp, "next", { at: 0.4 });
  m = await milaArrived(p);
  check(run, "swipe-left-goes-on", m.num === "Page 03", m.num);
  await swipe(p, cdp, "previous", { at: 0.4 });
  const bySwipe = await milaArrived(p);
  check(
    run,
    "forward-twice-back-once-shows-page-2",
    bySwipe.num === "Page 02" && bySwipe.count === "2 / 12",
    `${bySwipe.num} ${bySwipe.count}`,
  );
  await p.waitForTimeout(2500);
  const a = await decor(p, "mila-2-by-swipe.png");

  await tap(cdp, p.locator(".mila-prev"));
  await milaArrived(p);
  await tap(cdp, p.locator(".mila-next"));
  await milaArrived(p);
  await tap(cdp, p.locator(".mila-next"));
  await milaArrived(p);
  await tap(cdp, p.locator(".mila-prev"));
  const byButton = await milaArrived(p);
  check(
    run,
    "buttons-lead-to-the-same-text",
    JSON.stringify(byButton) === JSON.stringify(bySwipe),
    `${byButton.num} ${byButton.heading}`,
  );
  await p.waitForTimeout(2500);
  const b = await decor(p, "mila-2-by-button.png");
  await tap(cdp, p.locator(".mila-next"));
  await milaArrived(p);
  await p.waitForTimeout(2500);
  const c = await decor(p);
  const [same, other] = [await diff(p, a, b), await diff(p, a, c)];
  check(
    run,
    "buttons-lead-to-the-same-decor",
    same < other * 0.5,
    `page 2 swipe vs button ${same}, page 2 vs page 3 ${other}`,
  );

  await drag(cdp, [200, 600], [206, 200]);
  await drag(cdp, [300, 500], [160, 330]);
  await drag2(cdp, [300, 300], [300, 400], [-200, 0]);
  await drag(cdp, [320, 400], [90, 400], { end: "cancel" });
  await p.waitForTimeout(1500);
  m = await mila(p);
  check(run, "vertical-diagonal-two-finger-cancelled-keep-the-page", m.num === "Page 03", m.num);
  await swipe(p, cdp, "previous", { at: 0.4 });
  await milaArrived(p);
  await swipe(p, cdp, "previous", { at: 0.4 });
  m = await milaArrived(p);
  check(run, "back-to-page-1", m.num === "Page 01", m.num);
  await swipe(p, cdp, "previous", { at: 0.4 });
  await p.waitForTimeout(2500);
  m = await mila(p);
  check(
    run,
    "first-page-is-respected",
    m.num === "Page 01" && m.count === "1 / 12" && m.book === "mila",
    `${m.num} ${m.count}`,
  );

  const heading = m.heading;
  await tap(cdp, p.locator('.reading-langs button[data-lang="fr"]'));
  await p.waitForTimeout(800);
  m = await mila(p);
  check(
    run,
    "language-switch-answers-a-tap",
    m.lang === "fr" && m.num === "Page 01",
    `${m.lang} ${m.heading === heading ? "same heading" : "heading changed"}`,
  );
  await tap(cdp, p.locator(".mila-back"));
  await p.waitForFunction(() => !document.querySelector("#app").dataset.book, undefined, {
    timeout: 15000,
  });
  await p.waitForTimeout(2500);
  const s = await settled(p);
  check(run, "back-control-returns-to-the-tree", s.book === null && s.near === 1, `near=${s.near}`);
  check(run, "no-console-error", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Mila's last page, then both tales on a phone held in landscape (reduced motion: no waiting). */
async function runEnds(browser) {
  const run = "ends";
  const { ctx, p, cdp, errors } = await open(browser, "landscape", { reducedMotion: "reduce" });
  let s = await settled(p);
  check(
    run,
    "landscape-hint-invites-swipe",
    s.hint === "Glisse vers la gauche pour explorer",
    s.hint,
  );
  await p.screenshot({ path: OUT + "home-landscape-hint.png" });
  await swipe(p, cdp, "next");
  s = await settled(p);
  check(run, "landscape-home-swipe-left", s.near === 0, `t=${s.t} near=${s.near}`);
  await swipe(p, cdp, "next");
  s = await settled(p);
  check(run, "landscape-home-second-swipe", s.near === 1, `t=${s.t} near=${s.near}`);
  await swipe(p, cdp, "previous");
  s = await settled(p);
  check(run, "landscape-home-swipe-right", s.near === 0, `t=${s.t} near=${s.near}`);
  await swipe(p, cdp, "next");
  await settled(p);
  await shakyTap(cdp, await centre(p.locator(".tree-book:not([hidden])")));
  let m = await milaArrived(p, 40000);
  check(
    run,
    "landscape-cover-opens-mila",
    m.book === "mila" && m.num === "Page 01",
    `${m.book} ${m.num}`,
  );
  await swipe(p, cdp, "next");
  await milaArrived(p);
  await swipe(p, cdp, "next");
  await milaArrived(p);
  await swipe(p, cdp, "previous");
  m = await milaArrived(p);
  check(run, "landscape-mila-forward-twice-back-once", m.num === "Page 02", m.num);
  await p.screenshot({ path: OUT + "mila-2-landscape.png" });
  for (let i = 0; i < 10; i++) {
    await tap(cdp, p.locator(".mila-next"));
    await milaArrived(p);
  }
  m = await mila(p);
  check(run, "buttons-reach-the-last-page", m.count === "12 / 12", m.count);
  await swipe(p, cdp, "next");
  await p.waitForTimeout(1500);
  await swipe(p, cdp, "next");
  await p.waitForTimeout(1500);
  m = await mila(p);
  check(
    run,
    "last-page-neither-closes-nor-restarts",
    m.count === "12 / 12" && m.num === "Page 12" && m.book === "mila",
    `${m.count} ${m.num} book=${m.book}`,
  );
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1500);
  m = await mila(p);
  check(run, "rotation-keeps-the-page", m.num === "Page 12", m.num);
  await swipe(p, cdp, "previous", { at: 0.4 });
  m = await milaArrived(p);
  check(run, "portrait-swipe-right-goes-back", m.num === "Page 11", m.num);
  await swipe(p, cdp, "next", { at: 0.4 });
  m = await milaArrived(p);
  check(run, "portrait-swipe-left-goes-on", m.num === "Page 12", m.num);
  check(run, "no-console-error", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Scrolls `selector` with vertical touches from its page's first overflowing passage to its last line. */
async function scrollToEnd(p, cdp, selector) {
  const box = await p.locator(selector).boundingBox();
  const x = box.x + box.width / 2;
  const reach = () =>
    p.evaluate((sel) => {
      const el = document.querySelector(sel);
      const last = el.querySelector("p:last-of-type, :scope > :last-child");
      return {
        left: Math.round(el.scrollHeight - el.clientHeight - el.scrollTop),
        overflow: el.scrollHeight - el.clientHeight,
        lastLineVisible:
          [...el.querySelectorAll("p")].at(-1).getBoundingClientRect().bottom <=
          el.getBoundingClientRect().bottom + 1,
        tag: last?.tagName,
      };
    }, selector);
  const before = await reach();
  for (let i = 0; i < 14 && (await reach()).left > 1; i++) {
    await drag(cdp, [x, box.y + box.height * 0.8], [x + 6, box.y + box.height * 0.15], { ms: 260 });
    await p.waitForTimeout(700);
  }
  // one more, at the end of the text: it must not turn the page
  await drag(cdp, [x, box.y + box.height * 0.8], [x + 6, box.y + box.height * 0.15], { ms: 260 });
  await p.waitForTimeout(900);
  return { before, after: await reach() };
}

async function runText(browser) {
  const run = "text";
  {
    const { ctx, p, cdp, errors } = await open(browser, "small");
    await enterByCover(p, cdp, 0);
    await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
    await p.waitForTimeout(2500);
    for (const lang of ["gcf", "fr"]) {
      await tap(cdp, p.locator(`.reading-langs button[data-lang="${lang}"]`));
      await p.waitForTimeout(500);
      let found = false;
      for (let i = 0; i < 12 && !found; i++) {
        found = await p.evaluate(() => {
          const c = document.querySelector(".reading-card");
          return c.scrollHeight > c.clientHeight + 40;
        });
        if (!found) {
          await tap(cdp, p.locator(".reading-next"));
          await p.waitForTimeout(450);
        }
      }
      const at = await kannot(p);
      if (!found) {
        check(run, `kannot-${lang}-has-a-long-passage`, false, "no overflowing page at 320×568");
        continue;
      }
      const r = await scrollToEnd(p, cdp, ".reading-card");
      const now = await kannot(p);
      check(
        run,
        `kannot-${lang}-last-line-reached-by-vertical-scroll`,
        r.after.left <= 1 && r.after.lastLineVisible,
        `page ${at.count}, overflow ${r.before.overflow}px, left ${r.after.left}px`,
      );
      check(
        run,
        `kannot-${lang}-page-unchanged-while-scrolling`,
        now.count === at.count && now.lang === lang,
        `${at.count} → ${now.count}`,
      );
      await p.screenshot({ path: OUT + `text-kannot-${lang}-end.png` });
      const card = await p.locator(".reading-card").boundingBox();
      await drag(
        cdp,
        [card.x + card.width * 0.85, card.y + card.height / 2],
        [card.x + card.width * 0.15, card.y + card.height / 2 + 5],
      );
      await p.waitForTimeout(900);
      const turned = await kannot(p);
      check(
        run,
        `kannot-${lang}-swipe-on-the-long-text-turns-the-page`,
        parseInt(turned.count) === parseInt(at.count) + 1,
        `${at.count} → ${turned.count}`,
      );
      for (let i = parseInt(turned.count); i > 1; i--) {
        await tap(cdp, p.locator(".reading-prev"));
        await p.waitForTimeout(300);
      }
    }
    check(run, "kannot-no-console-error", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  {
    // Mila's text only overflows on a small phone held in landscape.
    const { ctx, p, cdp, errors } = await open(browser, "smallLandscape", {
      reducedMotion: "reduce",
    });
    await enterByCover(p, cdp, 1);
    await milaArrived(p, 40000);
    for (const lang of ["gcf", "fr"]) {
      await tap(cdp, p.locator(`.reading-langs button[data-lang="${lang}"]`));
      await p.waitForTimeout(600);
      let found = false;
      for (let i = 0; i < 12 && !found; i++) {
        found = await p.evaluate(() => {
          const c = document.querySelector(".mila-story-scroll");
          return c.scrollHeight > c.clientHeight + 40;
        });
        if (!found) {
          await tap(cdp, p.locator(".mila-next"));
          await milaArrived(p);
        }
      }
      const at = await mila(p);
      if (!found) {
        check(run, `mila-${lang}-has-a-long-passage`, false, "no overflowing page at 568×320");
        continue;
      }
      const r = await scrollToEnd(p, cdp, ".mila-story-scroll");
      const now = await mila(p);
      check(
        run,
        `mila-${lang}-last-line-reached-by-vertical-scroll`,
        r.after.left <= 1 && r.after.lastLineVisible,
        `${at.num}, overflow ${r.before.overflow}px, left ${r.after.left}px`,
      );
      check(
        run,
        `mila-${lang}-page-unchanged-while-scrolling`,
        now.num === at.num && now.lang === lang,
        `${at.num} → ${now.num}`,
      );
      await p.screenshot({ path: OUT + `text-mila-${lang}-end.png` });
      const box = await p.locator(".mila-story-scroll").boundingBox();
      await drag(
        cdp,
        [box.x + box.width * 0.85, box.y + box.height / 2],
        [box.x + box.width * 0.15, box.y + box.height / 2 + 5],
      );
      const turned = await milaArrived(p);
      check(
        run,
        `mila-${lang}-swipe-on-the-long-text-turns-the-page`,
        parseInt(turned.count) === parseInt(at.count) + 1,
        `${at.count} → ${turned.count}`,
      );
      for (let i = parseInt(turned.count); i > 1; i--) {
        await tap(cdp, p.locator(".mila-prev"));
        await milaArrived(p);
      }
    }
    check(run, "mila-no-console-error", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}

/**
 * Desktop, narrow desktop window and tablet: the values a build gives to the same wheel, keyboard
 * and finger input. Run on the base and on the branch; the two legacy.json must be identical.
 */
async function runLegacy(browser) {
  const out = {};
  for (const profile of ["desktop", "narrow", "tablet"]) {
    const touch = profile === "tablet";
    const { ctx, p, cdp } = await open(browser, profile, { reducedMotion: "reduce" });
    const { width, height } = size(p);
    const v = (out[profile] = {});
    const t = async () => (await settled(p)).t;
    v.phone = await p.evaluate(() => "phone" in document.querySelector("#app").dataset);
    v.homeHint = (await home(p)).hint;
    await p.mouse.move(width / 2, height / 2);
    await p.mouse.wheel(0, 300);
    v.homeWheel = await t();
    await p.keyboard.press("ArrowDown");
    v.homeKeyDown = await t();
    await p.keyboard.press("ArrowUp");
    await p.keyboard.press("ArrowUp");
    v.homeKeyUp = await t();
    if (touch) {
      await drag(cdp, [width / 2, height * 0.6], [width / 2, height * 0.4]);
      v.homeFingerUp = await t();
      await drag(cdp, [width * 0.8, height * 0.5], [width * 0.2, height * 0.5]);
      v.homeFingerSideways = await t();
    }
    const shelf = p.locator(".tree-shelf-book").first();
    for (let i = 0; i < 2; i++) {
      if (i === 1 || !(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
        await (touch ? shelf.tap() : shelf.click());
        await settled(p);
      }
    }
    await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
    await p.waitForTimeout(2500);
    const count = async () => (await kannot(p)).count;
    v.kannotHint = await p.locator(".reading-hint").textContent();
    await p.mouse.move(width / 2, height * 0.3);
    await p.mouse.wheel(0, 120);
    await p.waitForTimeout(900);
    v.kannotWheel = await count();
    await p.keyboard.press("ArrowRight");
    await p.keyboard.press("PageDown");
    v.kannotKeysNext = await count();
    await p.keyboard.press("ArrowLeft");
    v.kannotKeyPrev = await count();
    if (touch) {
      await p.waitForTimeout(900);
      await drag(cdp, [width / 2, height * 0.35], [width / 2, height * 0.15]);
      await p.waitForTimeout(900);
      v.kannotFingerUp = await count();
      await drag(cdp, [width * 0.8, height * 0.3], [width * 0.2, height * 0.3]);
      await p.waitForTimeout(900);
      v.kannotFingerSideways = await count();
    }
    await (touch ? p.locator(".reading-back").tap() : p.keyboard.press("Escape"));
    await p.waitForFunction(() => !document.querySelector("#app").dataset.book, undefined, {
      timeout: 15000,
    });
    await p.waitForTimeout(2500);
    const milaShelf = p.locator(".tree-shelf-book").nth(1);
    await (touch ? milaShelf.tap() : milaShelf.click());
    await settled(p);
    await (touch ? milaShelf.tap() : milaShelf.click());
    await milaArrived(p, 40000);
    await p.mouse.move(width * 0.7, height * 0.5);
    await p.mouse.wheel(0, 120);
    v.milaWheel = (await milaArrived(p)).num;
    await p.waitForTimeout(800);
    await p.keyboard.press("ArrowRight");
    v.milaKeyNext = (await milaArrived(p)).num;
    await p.keyboard.press("ArrowLeft");
    v.milaKeyPrev = (await milaArrived(p)).num;
    if (touch) {
      await p.waitForTimeout(800);
      await drag(cdp, [width * 0.7, height * 0.6], [width * 0.7, height * 0.4]);
      v.milaFingerUp = (await milaArrived(p)).num;
      await p.waitForTimeout(800);
      await drag(cdp, [width * 0.8, height * 0.5], [width * 0.2, height * 0.5]);
      await p.waitForTimeout(1200);
      v.milaFingerSideways = (await mila(p)).num;
    }
    console.log(profile, JSON.stringify(v));
    await ctx.close();
  }
  results.legacy = out;
  writeFileSync(OUT + "legacy.json", JSON.stringify(out, null, 2) + "\n");
}

/** Short recordings: a round trip on the home, then in each tale. */
async function runVideo(browser) {
  const { ctx, p, cdp } = await open(browser, "phone", {
    recordVideo: { dir: OUT + "video/", size: { width: 390, height: 844 } },
  });
  await p.waitForTimeout(1000);
  await swipe(p, cdp, "next", { ms: 320 });
  await settled(p);
  await swipe(p, cdp, "next", { ms: 320 });
  await settled(p);
  await swipe(p, cdp, "previous", { ms: 320 });
  await settled(p);
  await shakyTap(cdp, await centre(p.locator(".tree-book:not([hidden])")));
  await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
  await p.waitForTimeout(4500);
  for (const direction of ["next", "next", "previous"]) {
    await swipe(p, cdp, direction, { at: 0.3, ms: 320 });
    await p.waitForTimeout(3500);
  }
  await tap(cdp, p.locator(".reading-back"));
  await p.waitForFunction(() => !document.querySelector("#app").dataset.book, undefined, {
    timeout: 15000,
  });
  await p.waitForTimeout(3000);
  await swipe(p, cdp, "next", { ms: 320 });
  await settled(p);
  await shakyTap(cdp, await centre(p.locator(".tree-book:not([hidden])")));
  await milaArrived(p, 40000);
  for (const direction of ["next", "next", "previous"]) {
    await swipe(p, cdp, direction, { at: 0.4, ms: 320 });
    await milaArrived(p);
    await p.waitForTimeout(1500);
  }
  const video = p.video();
  await ctx.close();
  console.log("video", await video.path());
}

const browser = await chromium.launch({
  args: GPU,
  env: GPU_ENV,
  channel: process.env.QA_CHANNEL || undefined,
});
try {
  results.browser = browser.version();
  const probe = await browser.newPage();
  results.renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl");
    return gl?.getParameter(gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL);
  });
  await probe.close();
  console.log(`Chromium ${results.browser} — ${results.renderer}`);
  if (!/NVIDIA/.test(results.renderer ?? "") && !process.env.QA_ALLOW_CPU) {
    throw new Error(
      "no GPU renderer: refusing to render the scenes on the CPU (QA_ALLOW_CPU=1 to force)",
    );
  }
  const runs = {
    home: runHome,
    kannot: runKannot,
    mila: runMila,
    ends: runEnds,
    text: runText,
    legacy: runLegacy,
    video: runVideo,
  };
  for (const name of ONLY) {
    try {
      await runs[name](browser);
    } catch (err) {
      check(name, "run-completed", false, err.message.split("\n")[0]);
    }
  }
} finally {
  await browser.close();
}
writeFileSync(OUT + "results.json", JSON.stringify(results, null, 2) + "\n");
const failed = results.checks.filter((c) => !c.pass);
console.log(`\n${results.checks.length - failed.length}/${results.checks.length} PASS`);
process.exit(failed.length ? 1 : 0);
