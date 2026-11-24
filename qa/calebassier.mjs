// « Mila et le calebassier magique » (book id mila-calebassier) driven from the interface of the
// built site, real time, on the GPU. One line per check: `PASS|FAIL <mode>/<id> <detail>`;
// results.json in OUT; exit code 1 when any check fails. Touch input goes through CDP
// Input.dispatchTouchEvent; no check calls a "next page" function.
// Usage: [SITE=url] [OUT=dir] [ONLY=text,journey,...] [VPS=desktop,phone,small] [QA_CHANNEL=chrome]
//        [QA_INJECT_CSS=css: negative control, a style added to the page under test, never to the app]
//        node qa/calebassier.mjs
//   text       French text of the 12 pages against the brief's story.fr.json, and the counter
//   journey    1 → 12 → 1 with the buttons: data-page / data-hero / data-settled, the gift of
//              pages 3 and 11 must not replay, no console error
//   rapid      quick presses (2→3→4→3, 6→8→6, 10→11→12→11), keyboard, wheel
//   lifecycle  Escape while opening / changing page, then ten open → page 5 → back cycles (heap)
//   resize     viewport changes on page 3
//   touch      emulated phone, real swipes and taps
//   reduced    prefers-reduced-motion: pages settle within 2 s
//   contrast   text against the scene behind it, pages 7 and 9, desktop and 390×844
//   failure    a blocked .glb, then a blocked rt_*.webp: notice and back to the tree
//   shots      stills of the 12 pages per viewport (VPS) and contact sheets (ImageMagick montage)
// The default ONLY is every mode. Needs the Chrome channel on Ubuntu 26.04 (QA_CHANNEL=chrome).
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (
  process.env.OUT ?? new URL("./out/calebassier-run/", import.meta.url).pathname
).replace(/\/?$/, "/");
const MODES = ["text", "journey", "rapid", "lifecycle", "resize", "touch", "reduced"].concat([
  "contrast",
  "failure",
  "shots",
]);
const ONLY = (process.env.ONLY ?? MODES.join(",")).split(",");
const VPS = (process.env.VPS ?? "desktop,phone,small").split(",");
const STORY = new URL(
  "../docs/missions/2026-11-23-mila-calebassier/brief/data/story.fr.json",
  import.meta.url,
).pathname;
mkdirSync(OUT, { recursive: true });

const GPU = [
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--use-gl=angle",
  "--use-angle=gl-egl",
  "--enable-precise-memory-info",
];
const GPU_ENV = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};
const touchVp = (width, height, deviceScaleFactor = 2) => ({
  viewport: { width, height },
  deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
});
const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: touchVp(390, 844),
  small: touchVp(360, 640),
};
const CANVAS = ".app-book canvas";
const BOOK = "calebassier";
const EXPECTED_HERO = [
  "branch",
  "branch",
  "carry",
  "carry",
  "carry",
  "table",
  "table",
  "carry",
  "carry",
  "carry",
  "branch",
  "branch",
];
const pid = (n) => `p${String(n).padStart(2, "0")}`;
const results = { site: SITE, browser: "", renderer: "", checks: [], extras: {} };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Records one check; a `pass` of false fails the run. */
function check(mode, id, pass, detail = "") {
  results.checks.push({ mode, id, pass: Boolean(pass), detail: String(detail) });
  console.log(`${pass ? "PASS" : "FAIL"} ${mode}/${id}${detail !== "" ? ` ${detail}` : ""}`);
}

/** Opens a context and a page that collect every console error, page error and failed request. */
async function open(browser, profile, extra = {}) {
  const ctx = await browser.newContext({ ...PROFILES[profile], ...extra });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  p.on(
    "console",
    (m) => m.type() === "error" && errors.push(`console.error: ${m.text()} ${m.location().url}`),
  );
  p.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  // QA visits stay out of the site's audience statistics.
  await ctx.route(/umami\.is/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  return { ctx, p, errors, touch: Boolean(PROFILES[profile]?.hasTouch) };
}

/** Loads the home and waits for the tree. */
async function home(p) {
  await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
  await p.waitForTimeout(1500);
  // Negative-control hook: QA_INJECT_CSS breaks the page under test on purpose to prove a check can fail.
  if (process.env.QA_INJECT_CSS) await p.addStyleTag({ content: process.env.QA_INJECT_CSS });
}

/** Presses `locator` with a mouse click, or a touch tap on a touch context. */
async function press(s, locator, options = {}) {
  await (s.touch ? locator.tap({ timeout: 10000, ...options }) : locator.click(options));
}

/**
 * Opens the tale from the home tree (first press turns to its card, the second opens it) and
 * switches to French; resolves once the world's canvas publishes its page.
 */
async function openTale(s, { lang = "Français", wait = true } = {}) {
  const { p } = s;
  const book = p.locator(".tree-shelf-book", { hasText: new RegExp(BOOK, "i") });
  // Back from a tale the tree already faces its card: one press opens it.
  const facing = await book.evaluate((b) => b.classList.contains("is-near"));
  if (!facing) {
    await press(s, book);
    await p.waitForTimeout(2800);
  }
  await press(s, book);
  if (!wait) return;
  await p.waitForSelector(".reading-card", { state: "visible", timeout: 40000 });
  await p.waitForSelector(`${CANVAS}[data-page]`, { timeout: 40000 });
  if (lang) {
    await press(s, p.locator(".reading-langs button", { hasText: lang }));
    await p.waitForTimeout(700);
  }
}

/** Leaves the tale with the back button or Escape and waits for the tree to rest. */
async function leaveTale(s, how = "button") {
  const { p } = s;
  if (how === "escape") await p.keyboard.press("Escape");
  else await press(s, p.locator(".reading-back"));
  await p.waitForFunction(() => !document.querySelector("#app").dataset.book, undefined, {
    timeout: 20000,
  });
  await p.waitForTimeout(2800);
}

/** What the page shows: the canvas' published state, the text card and the counter. */
const state = (p) =>
  p.evaluate((sel) => {
    const c = document.querySelector(sel);
    const text = (q) => document.querySelector(q)?.textContent ?? null;
    return {
      page: c?.dataset.page ?? null,
      hero: c?.dataset.hero ?? null,
      settled: c?.dataset.settled ?? null,
      count: text(".reading-count"),
      title: text(".reading-title"),
    };
  }, CANVAS);

/** Waits until the canvas shows `page` (e.g. "p03"), settled when `settled` is true. */
async function waitPage(p, page, settled = true, timeout = 40000) {
  await p.waitForFunction(
    ([sel, id, wantSettled]) => {
      const c = document.querySelector(sel);
      return c && c.dataset.page === id && (!wantSettled || c.dataset.settled === "true");
    },
    [CANVAS, page, settled],
    { timeout },
  );
}

/** One page forward (`1`) or back (`-1`) with the buttons; waits for the new page to be shown. */
async function step(s, direction, settled = false) {
  const { p } = s;
  const now = (await state(p)).page;
  const target = pid(parseInt(now.slice(1)) + direction);
  await press(s, p.locator(direction > 0 ? ".reading-next" : ".reading-prev"), { timeout: 10000 });
  await waitPage(p, target, settled, 40000);
  return target;
}

/** Goes to page `n` with the buttons, without waiting for the actions to end. */
async function goTo(s, n) {
  let at = parseInt((await state(s.p)).page.slice(1));
  while (at !== n) {
    await step(s, n > at ? 1 : -1);
    at += n > at ? 1 : -1;
    await s.p.waitForTimeout(120);
  }
}

/** SHA-1 of a buffer, short. */
const hash = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 12);

/** Mean absolute difference (0-255) between two PNG buffers, compared at 96 px wide. */
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

/**
 * Relative luminance (WCAG, 0-1) of a PNG buffer: mean, mean of the lightest 5 % of the pixels,
 * and standard deviation of the luminance.
 */
async function luminance(p, buf) {
  return p.evaluate(
    async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const { data } = g.getImageData(0, 0, c.width, c.height);
      const lin = Array.from({ length: 256 }, (_, i) => {
        const v = i / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      const all = new Float32Array(data.length / 4);
      for (let i = 0; i < all.length; i++) {
        all[i] =
          0.2126 * lin[data[i * 4]] + 0.7152 * lin[data[i * 4 + 1]] + 0.0722 * lin[data[i * 4 + 2]];
      }
      const sorted = all.slice().sort();
      const mean = all.reduce((a, b) => a + b, 0) / all.length;
      const top = sorted.slice(Math.floor(sorted.length * 0.95));
      const std = Math.sqrt(all.reduce((a, b) => a + (b - mean) ** 2, 0) / all.length);
      return { mean, top5: top.reduce((a, b) => a + b, 0) / top.length, std };
    },
    `data:image/png;base64,${buf.toString("base64")}`,
  );
}

/** Lists the errors seen, one `check` per mode; they are never ignored. */
function errorCheck(mode, id, errors, expectNone = true) {
  const list = [...new Set(errors)];
  check(mode, id, expectNone ? list.length === 0 : true, list.length ? list.join(" | ") : "none");
  if (list.length) results.extras[`${mode}/${id}`] = list;
}

/* ---------------------------------- modes ---------------------------------- */

async function runText(browser) {
  const mode = "text";
  const story = JSON.parse(readFileSync(STORY, "utf8"));
  const s = await open(browser, "desktop");
  await home(s.p);
  await openTale(s);
  for (let n = 1; n <= 12; n++) {
    if (n > 1) await step(s, 1);
    const expected = story.pages[n - 1];
    const fix = (t) => t.replaceAll("\u00a0", " ").replaceAll("\u202f", " ");
    let got;
    for (let i = 0; i < 20; i++) {
      await s.p.waitForTimeout(250);
      got = await s.p.evaluate(() => ({
        title: document.querySelector(".reading-title")?.textContent ?? "",
        paragraphs: [...document.querySelectorAll(".reading-body p")].map((e) => e.textContent),
        count: document.querySelector(".reading-count")?.textContent ?? "",
      }));
      if (fix(got.title) === fix(expected.title) && i > 2) break;
    }
    const normalised =
      got.title !== fix(got.title) || got.paragraphs.some((t) => t !== fix(t))
        ? " (nbsp normalised)"
        : "";
    const diffs = [];
    if (fix(got.title) !== fix(expected.title))
      diffs.push(
        `title expected ${JSON.stringify(expected.title)} got ${JSON.stringify(got.title)}`,
      );
    if (got.paragraphs.length !== expected.paragraphs.length)
      diffs.push(`paragraphs ${expected.paragraphs.length} expected, ${got.paragraphs.length} got`);
    expected.paragraphs.forEach((t, i) => {
      if (got.paragraphs[i] !== undefined && fix(got.paragraphs[i]) !== fix(t))
        diffs.push(
          `p[${i}] expected ${JSON.stringify(t)} got ${JSON.stringify(got.paragraphs[i])}`,
        );
    });
    check(
      mode,
      `${pid(n)}-text`,
      diffs.length === 0,
      diffs.length ? diffs.join(" ; ") : `ok${normalised}`,
    );
    check(mode, `${pid(n)}-counter`, got.count.trim() === `${n} / 12`, JSON.stringify(got.count));
  }
  errorCheck(mode, "no-console-error", s.errors);
  await s.ctx.close();
}

async function runJourney(browser) {
  const mode = "journey";
  const s = await open(browser, "desktop");
  const { p } = s;
  await home(p);
  await openTale(s);
  const gift = async (n, label) => {
    await p.waitForTimeout(2000);
    const [a, sa] = [await p.screenshot(), await state(p)];
    await p.waitForTimeout(23000);
    const [b, sb] = [await p.screenshot(), await state(p)];
    const pixels = await diff(p, a, b);
    check(
      mode,
      `${label}-${pid(n)}-hold-25s`,
      sa.hero === sb.hero && sa.settled === "true" && sb.settled === "true" && sb.page === pid(n),
      `hero ${sa.hero}→${sb.hero} settled ${sa.settled}→${sb.settled} hash ${hash(a)}→${hash(b)} meanAbsDiff ${pixels}`,
    );
    check(
      mode,
      `${label}-${pid(n)}-still`,
      // Leaves and hems keep stirring on a settled page; a replayed gift moves branch and fruit.
      Number(pixels) < 3,
      `mean abs diff ${pixels}/255 between t+2 s and t+25 s (limit 3)`,
    );
  };
  for (let n = 1; n <= 12; n++) {
    if (n > 1) await step(s, 1);
    await waitPage(p, pid(n), true);
    const st = await state(p);
    check(
      mode,
      `fwd-${pid(n)}`,
      st.page === pid(n) && st.hero === EXPECTED_HERO[n - 1] && st.settled === "true",
      `page ${st.page} hero ${st.hero} (expected ${EXPECTED_HERO[n - 1]}) settled ${st.settled}`,
    );
    if (n === 3 || n === 11) await gift(n, "fwd");
  }
  await p.screenshot({ path: `${OUT}journey-p12.png` });
  for (let n = 11; n >= 1; n--) {
    await step(s, -1);
    await waitPage(p, pid(n), true);
    const st = await state(p);
    check(
      mode,
      `back-${pid(n)}`,
      st.page === pid(n) && st.hero === EXPECTED_HERO[n - 1] && st.settled === "true",
      `page ${st.page} hero ${st.hero} (expected ${EXPECTED_HERO[n - 1]}) settled ${st.settled}`,
    );
    if (n === 11 || n === 3) await gift(n, "back");
  }
  errorCheck(mode, "no-console-error", s.errors);
  await s.ctx.close();
}

async function runRapid(browser) {
  const mode = "rapid";
  const s = await open(browser, "desktop");
  const { p } = s;
  await home(p);
  await openTale(s);
  await p.mouse.move(1000, 450);
  /** Centre of a page button as it is laid out now (the buttons shift on the last page). */
  const button = async (sel) => {
    const box = await p.locator(sel).boundingBox({ timeout: 2000 });
    return [box.x + box.width / 2, box.y + box.height / 2];
  };
  /** Presses the page buttons in order, about 100 ms apart, each where it is at that moment. */
  const burst = async (list) => {
    for (const name of list) {
      await p.mouse.click(...(await button(name === "next" ? ".reading-next" : ".reading-prev")));
      await sleep(100);
    }
  };
  const expectEnd = async (id, n, label) => {
    await p.waitForTimeout(1500);
    let st;
    await waitPage(p, pid(n), true, 15000).catch(() => {});
    st = await state(p);
    check(
      mode,
      id,
      st.page === pid(n) && st.hero === EXPECTED_HERO[n - 1] && st.settled === "true",
      `${label}: page ${st.page} hero ${st.hero} (expected ${EXPECTED_HERO[n - 1]}) settled ${st.settled} count ${st.count}`,
    );
  };

  await goTo(s, 2);
  await waitPage(p, "p02", true);
  await burst(["next", "next", "prev"]);
  await expectEnd("2-3-4-3", 3, "2→3→4→3");

  await goTo(s, 6);
  await waitPage(p, "p06", true);
  await burst(["next", "next", "prev", "prev"]);
  await expectEnd("6-8-6", 6, "6→8→6");

  await goTo(s, 10);
  await waitPage(p, "p10", true);
  await burst(["next", "next", "prev"]);
  await expectEnd("10-11-12-11", 11, "10→11→12→11");

  // keyboard: one page per key, within bounds
  await goTo(s, 1);
  await waitPage(p, "p01", true);
  await p.evaluate(
    () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
  );
  const at = async () => parseInt((await state(p)).page.slice(1));
  const key = async (name, expected) => {
    await p.keyboard.press(name);
    await p.waitForTimeout(2200);
    const n = await at();
    check(mode, `key-${name}-to-p${expected}`, n === expected, `page ${n}`);
  };
  await key("ArrowLeft", 1);
  await key("PageUp", 1);
  await key("ArrowRight", 2);
  await key("ArrowLeft", 1);
  await key("PageDown", 2);
  await key("PageUp", 1);
  await key("Space", 2);
  await goTo(s, 12);
  await p.evaluate(
    () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
  );
  await waitPage(p, "p12", true);
  for (const name of ["ArrowRight", "PageDown", "Space"]) await key(name, 12);
  await key("ArrowLeft", 11);

  // the wheel: one page per gesture (three notches 30 ms apart)
  await p.mouse.move(1000, 450);
  const wheel = async (dy, expected) => {
    for (let i = 0; i < 3; i++) {
      await p.mouse.wheel(0, dy);
      await sleep(30);
    }
    await p.waitForTimeout(2200);
    const n = await at();
    check(mode, `wheel-${dy > 0 ? "down" : "up"}-to-p${expected}`, n === expected, `page ${n}`);
  };
  await wheel(-40, 10);
  await wheel(-40, 9);
  await wheel(40, 10);
  await goTo(s, 1);
  await wheel(-40, 1);
  errorCheck(mode, "no-console-error", s.errors);
  await s.ctx.close();
}

async function runLifecycle(browser) {
  const mode = "lifecycle";
  const dom = (p) =>
    p.evaluate(
      (sel) => ({
        cards: document.querySelectorAll(".reading-card").length,
        canvases: document.querySelectorAll(sel).length,
        books: document.querySelectorAll(".app-book").length,
        allCanvases: document.querySelectorAll("canvas").length,
        backs: document.querySelectorAll(".reading-back").length,
        nexts: document.querySelectorAll(".reading-next").length,
      }),
      CANVAS,
    );
  {
    const s = await open(browser, "desktop");
    const { p } = s;
    await home(p);
    for (const when of ["opening", "page-change"]) {
      await openTale(s, { wait: when === "page-change" });
      if (when === "page-change") {
        await waitPage(p, "p01", true);
        await press(s, p.locator(".reading-next"));
        await p.waitForTimeout(150);
      } else await p.waitForTimeout(200);
      await p.keyboard.press("Escape");
      // Escape is ignored until the tale is open (the shell is not in its book state yet).
      const opened = await p
        .waitForSelector(`${CANVAS}[data-page]`, { timeout: when === "opening" ? 20000 : 3000 })
        .then(() => true)
        .catch(() => false);
      if (when === "page-change") await p.waitForTimeout(2500);
      const book = await p.evaluate(() => document.querySelector("#app").dataset.book ?? null);
      if (book) {
        await p.waitForTimeout(1500);
        await p.keyboard.press("Escape");
      }
      await p.waitForFunction(() => !document.querySelector("#app").dataset.book, undefined, {
        timeout: 20000,
      });
      await p.waitForTimeout(3500);
      check(
        mode,
        `escape-${when}-back-on-tree`,
        true,
        `first Escape: ${when === "opening" ? (opened ? "tale opened anyway (key ignored during the opening)" : "tale did not open") : "tale left or still open per book attribute"}, book attribute ${book}`,
      );
      await openTale(s);
      await waitPage(p, "p01", false);
      await p.waitForTimeout(1000);
      const st = await state(p);
      const d = await dom(p);
      check(
        mode,
        `reopen-after-${when}-page1-branch`,
        st.page === "p01" && st.hero === "branch" && st.count?.trim() === "1 / 12",
        `page ${st.page} hero ${st.hero} count ${st.count}`,
      );
      check(
        mode,
        `reopen-after-${when}-no-duplicates`,
        d.cards === 1 && d.canvases === 1 && d.books === 1 && d.backs === 1 && d.nexts === 1,
        JSON.stringify(d),
      );
      await leaveTale(s);
    }
    errorCheck(mode, "escape-no-console-error", s.errors);
    await s.ctx.close();
  }
  {
    const s = await open(browser, "desktop");
    const { p, ctx } = s;
    await p.addInitScript(() => {
      window.__gl = [];
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        const gl = get.call(this, kind, ...rest);
        if (gl && /webgl/.test(kind)) window.__gl.push(new WeakRef(gl));
        return gl;
      };
    });
    await home(p);
    const cdp = await ctx.newCDPSession(p);
    const heaps = {};
    for (let cycle = 1; cycle <= 10; cycle++) {
      await openTale(s);
      await waitPage(p, "p01", false);
      await goTo(s, 5);
      await p.waitForTimeout(800);
      await leaveTale(s);
      if ([1, 5, 10].includes(cycle)) {
        await cdp.send("HeapProfiler.collectGarbage");
        await p.waitForTimeout(500);
        await cdp.send("HeapProfiler.collectGarbage");
        heaps[cycle] = await p.evaluate(() => {
          const alive = window.__gl.map((r) => r.deref()).filter(Boolean);
          return {
            heap: performance.memory.usedJSHeapSize,
            canvases: document.querySelectorAll("canvas").length,
            glCreated: window.__gl.length,
            glAlive: alive.length,
            glAliveNotLost: alive.filter((g) => !g.isContextLost()).length,
          };
        });
        console.log(`lifecycle cycle ${cycle}`, JSON.stringify(heaps[cycle]));
      }
    }
    results.extras.heap = heaps;
    const growth = (heaps[10].heap - heaps[5].heap) / heaps[5].heap;
    check(
      mode,
      "heap-growth-5-to-10-under-10pct",
      growth < 0.1,
      `heap cycle1 ${heaps[1].heap} cycle5 ${heaps[5].heap} cycle10 ${heaps[10].heap} bytes; growth 5→10 ${(growth * 100).toFixed(1)} %`,
    );
    check(
      mode,
      "canvases-do-not-accumulate",
      heaps[10].canvases <= heaps[1].canvases,
      `canvas elements ${heaps[1].canvases}/${heaps[5].canvases}/${heaps[10].canvases}`,
    );
    check(
      mode,
      "webgl-contexts-do-not-accumulate",
      heaps[10].glAliveNotLost <= heaps[1].glAliveNotLost + 1,
      `contexts created ${heaps[1].glCreated}/${heaps[5].glCreated}/${heaps[10].glCreated}, alive and not lost ${heaps[1].glAliveNotLost}/${heaps[5].glAliveNotLost}/${heaps[10].glAliveNotLost}`,
    );
    errorCheck(mode, "cycles-no-console-error", s.errors);
    await ctx.close();
  }
}

async function runResize(browser) {
  const mode = "resize";
  const s = await open(browser, "desktop");
  const { p } = s;
  await home(p);
  await openTale(s);
  await goTo(s, 3);
  await waitPage(p, "p03", true);
  const sizes = [
    [1440, 900],
    [900, 1200],
    [390, 844],
    [844, 390],
    [1440, 900],
  ];
  let count = 0;
  for (const [w, h] of sizes) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(1500);
    const shot = `${OUT}resize-${++count}-${w}x${h}.png`;
    await p.screenshot({ path: shot });
    const r = await p.evaluate((sel) => {
      const box = (q) => {
        const e = document.querySelector(q);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return {
          l: b.left,
          t: b.top,
          r: b.right,
          b: b.bottom,
          w: b.width,
          h: b.height,
          vis: !e.hidden,
        };
      };
      return {
        iw: innerWidth,
        ih: innerHeight,
        canvas: box(sel),
        card: box(".reading-card"),
        next: box(".reading-next"),
        scrollX: document.documentElement.scrollWidth - innerWidth,
      };
    }, CANVAS);
    const inside = (b) =>
      b && b.l >= -0.5 && b.t >= -0.5 && b.r <= r.iw + 0.5 && b.b <= r.ih + 0.5 && b.w > 0;
    const fills = r.canvas && Math.abs(r.canvas.w - r.iw) <= 1 && Math.abs(r.canvas.h - r.ih) <= 1;
    const st = await state(p);
    check(
      mode,
      `${w}x${h}-canvas-fills`,
      fills,
      `canvas ${r.canvas && Math.round(r.canvas.w)}x${r.canvas && Math.round(r.canvas.h)} viewport ${r.iw}x${r.ih}; ${shot}`,
    );
    check(mode, `${w}x${h}-card-inside`, inside(r.card), JSON.stringify(r.card));
    check(mode, `${w}x${h}-next-inside`, inside(r.next) && r.next.vis, JSON.stringify(r.next));
    check(
      mode,
      `${w}x${h}-state-kept`,
      st.page === "p03" && st.hero === "carry",
      `page ${st.page} hero ${st.hero} settled ${st.settled}; no horizontal overflow ${r.scrollX <= 0}`,
    );
  }
  errorCheck(mode, "no-console-error", s.errors);
  await s.ctx.close();
}

/* ---- real touch input ---- */
const points = (list) => list.map(([x, y], id) => ({ x: Math.round(x), y: Math.round(y), id }));
const send = (cdp, type, list) =>
  cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points(list) });
/** One finger from `from` to `to`. */
async function drag(cdp, from, to, { steps = 8, ms = 160 } = {}) {
  await send(cdp, "touchStart", [from]);
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    await send(cdp, "touchMove", [
      [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k],
    ]);
    await sleep(ms / steps);
  }
  await send(cdp, "touchEnd", []);
}
/** A swipe across the screen: right to left is "next". */
async function swipe(p, cdp, direction, at = 0.3) {
  const { width, height } = p.viewportSize();
  const [a, b] = direction === "next" ? [0.8, 0.25] : [0.2, 0.75];
  await drag(cdp, [width * a, height * at], [width * b, height * at + 6]);
}
/** A touch tap through CDP at the centre of `locator`. */
async function tap(cdp, locator) {
  const box = await locator.boundingBox();
  await send(cdp, "touchStart", [[box.x + box.width / 2, box.y + box.height / 2]]);
  await sleep(40);
  await send(cdp, "touchEnd", []);
}

async function runTouch(browser) {
  const mode = "touch";
  const s = await open(browser, "phone");
  const { p } = s;
  const cdp = await s.ctx.newCDPSession(p);
  await home(p);
  await openTale(s);
  await waitPage(p, "p01", true);
  const pageNow = async () => (await state(p)).page;
  const check1 = async (id, expected, label) => {
    await p.waitForTimeout(2500);
    const now = await pageNow();
    check(mode, id, now === expected, `${label}: page ${now} (expected ${expected})`);
  };
  await swipe(p, cdp, "previous");
  await check1("swipe-right-on-p01-stays", "p01", "swipe to the right on page 1");
  for (let n = 2; n <= 4; n++) {
    await swipe(p, cdp, "next");
    await check1(`swipe-left-to-${pid(n)}`, pid(n), "swipe to the left");
  }
  await swipe(p, cdp, "previous");
  await check1("swipe-right-back-to-p03", "p03", "swipe to the right");
  await waitPage(p, "p03", true);
  await drag(cdp, [195, 700], [201, 250]);
  await drag(cdp, [195, 250], [190, 700]);
  await check1("vertical-swipe-changes-nothing", "p03", "mostly vertical swipes");
  await drag(cdp, [300, 600], [150, 380]);
  await check1(
    "diagonal-swipe-changes-nothing",
    "p03",
    "diagonal swipe (150 px across, 220 px up)",
  );
  await tap(cdp, p.locator(".reading-next"));
  await check1("tap-next", "p04", "tap on .reading-next");
  await tap(cdp, p.locator(".reading-prev"));
  await check1("tap-prev", "p03", "tap on .reading-prev");
  for (let n = 4; n <= 12; n++) {
    await tap(cdp, p.locator(".reading-next"));
    await waitPage(p, pid(n), false, 15000).catch(() => {});
    await p.waitForTimeout(400);
  }
  await check1("taps-reach-p12", "p12", "nine taps from page 3");
  await waitPage(p, "p12", true);
  await swipe(p, cdp, "next");
  await check1("swipe-left-on-p12-stays", "p12", "swipe to the left on page 12");
  await p.screenshot({ path: `${OUT}touch-p12.png` });
  const st = await state(p);
  check(mode, "open-after-gestures", st.count?.trim() === "12 / 12", `count ${st.count}`);
  errorCheck(mode, "no-console-error", s.errors);
  await s.ctx.close();
}

async function runReduced(browser) {
  const mode = "reduced";
  const s = await open(browser, "desktop", { reducedMotion: "reduce" });
  const { p } = s;
  await home(p);
  await openTale(s);
  await waitPage(p, "p01", true, 10000).catch(() => {});
  for (let n = 1; n <= 12; n++) {
    let ms = 0;
    if (n > 1) {
      const t0 = Date.now();
      await press(s, p.locator(".reading-next"));
      await waitPage(p, pid(n), true, 10000).catch(() => {});
      ms = Date.now() - t0;
    }
    const st = await state(p);
    check(
      mode,
      `${pid(n)}-settled-within-2s`,
      st.page === pid(n) && st.settled === "true" && st.hero === EXPECTED_HERO[n - 1] && ms <= 2000,
      `page ${st.page} hero ${st.hero} (expected ${EXPECTED_HERO[n - 1]}) settled ${st.settled} after ${ms} ms`,
    );
    if ([3, 9, 11].includes(n)) await p.screenshot({ path: `${OUT}reduced-${pid(n)}.png` });
  }
  errorCheck(mode, "no-console-error", s.errors);
  await s.ctx.close();
}

async function runContrast(browser) {
  const mode = "contrast";
  const rows = [];
  for (const vp of ["desktop", "phone"]) {
    const s = await open(browser, vp);
    const { p } = s;
    await home(p);
    await openTale(s);
    for (const n of [1, 7, 9, 12]) {
      await goTo(s, n);
      await waitPage(p, pid(n), true);
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}contrast-${vp}-${pid(n)}.png` });
      const info = await p.evaluate(() => {
        const e = document.querySelector(".reading-body");
        const b = e.getBoundingClientRect();
        return {
          color: getComputedStyle(e).color,
          box: {
            x: Math.max(0, b.left),
            y: Math.max(0, b.top),
            width: Math.min(innerWidth, b.right) - Math.max(0, b.left),
            height: Math.min(innerHeight, b.bottom) - Math.max(0, b.top),
          },
        };
      });
      const handle = await p.addStyleTag({
        content:
          ".reading-card, .reading-card * { color: transparent !important; text-shadow: none !important; }",
      });
      await p.waitForTimeout(300);
      const bgShot = await p.screenshot({ clip: info.box });
      writeFileSync(`${OUT}contrast-${vp}-${pid(n)}-background.png`, bgShot);
      await handle.evaluate((e) => e.remove());
      const lum = await luminance(p, bgShot);
      const [r, g, b] = info.color.match(/[\d.]+/g).map(Number);
      const lin = (v) =>
        v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4;
      const lt = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const ratio = (a, c) => (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
      const row = {
        vp,
        page: pid(n),
        color: info.color,
        bgMean: +lum.mean.toFixed(4),
        bgLightest5: +lum.top5.toFixed(4),
        ratioMean: +ratio(lt, lum.mean).toFixed(2),
        ratioLightest5: +ratio(lt, lum.top5).toFixed(2),
      };
      rows.push(row);
      check(
        mode,
        `${vp}-${pid(n)}-ratio-mean-4.5`,
        row.ratioMean >= 4.5,
        `text ${info.color}; background mean L ${row.bgMean}, lightest 5 % L ${row.bgLightest5}; ratio vs mean ${row.ratioMean}, vs lightest 5 % ${row.ratioLightest5} (text-shadow removed in the background shot)`,
      );
    }
    await s.ctx.close();
  }
  results.extras.contrast = rows;
}

async function runFailure(browser) {
  const mode = "failure";
  const cases = [
    ["glb", "**/*.glb"],
    ["rt-webp", "**/rt_garden-*.webp"],
  ];
  for (const [name, pattern] of cases) {
    const s = await open(browser, "desktop");
    const { p } = s;
    await s.ctx.route(pattern, (route) => route.abort());
    await home(p);
    await openTale(s, { wait: false });
    let notice;
    try {
      await p.waitForSelector(".app-notice", { timeout: 40000 });
      notice = await p.locator(".app-notice").textContent();
    } catch {
      notice = null;
    }
    await p.waitForTimeout(1500);
    const now = await p.evaluate(() => ({
      book: document.querySelector("#app").dataset.book ?? null,
      reading: !document.querySelector(".reading")?.hidden,
      canvases: document.querySelectorAll(".app-book canvas").length,
    }));
    const shot = await p.screenshot({ path: `${OUT}failure-${name}.png` });
    const lum = await luminance(p, shot);
    check(
      mode,
      `${name}-notice`,
      notice !== null && notice.includes("Kont-la pa ka chajé"),
      `notice ${JSON.stringify(notice)}`,
    );
    check(mode, `${name}-back-on-tree`, now.book === null, JSON.stringify(now));
    check(
      mode,
      `${name}-not-blank`,
      lum.std > 0.02,
      `luminance std ${lum.std.toFixed(3)} mean ${lum.mean.toFixed(3)}; failure-${name}.png`,
    );
    const other = p.locator(".tree-shelf-book").first();
    await press(s, other);
    await p.waitForTimeout(1500);
    const near = await other.evaluate((b) => b.classList.contains("is-near"));
    check(mode, `${name}-shelf-usable`, near, `first shelf book is-near=${near}`);
    results.extras[`${mode}/${name}-console`] = [...new Set(s.errors)];
    console.log(
      `INFO failure/${name} console (expected): ${[...new Set(s.errors)].join(" | ") || "none"}`,
    );
    await s.ctx.close();
  }
}

async function runShots(browser) {
  const mode = "shots";
  mkdirSync(`${OUT}shots/`, { recursive: true });
  for (const vp of VPS) {
    const s = await open(browser, vp);
    const { p } = s;
    await home(p);
    await openTale(s);
    const files = [];
    for (let n = 1; n <= 12; n++) {
      if (n > 1) await step(s, 1);
      await waitPage(p, pid(n), true);
      await p.waitForTimeout(500);
      const file = `${OUT}shots/${vp}-${pid(n)}.png`;
      await p.screenshot({ path: file });
      files.push(file);
      if (vp === "desktop" && (n === 3 || n === 11)) {
        await press(s, p.locator(".reading-toggle"));
        await p.waitForTimeout(2000);
        await p.screenshot({ path: `${OUT}shots/desktop-${pid(n)}-scene-only.png` });
        await press(s, p.locator(".reading-toggle"));
        await p.waitForTimeout(2000);
      }
    }
    const tile = vp === "desktop" ? "480x+4+4" : "260x+4+4";
    const cols = vp === "desktop" ? "4x3" : "6x2";
    execFileSync("montage", [
      ...files,
      "-tile",
      cols,
      "-geometry",
      tile,
      "-background",
      "#222",
      "-quality",
      "85",
      `${OUT}sheet-${vp}.jpg`,
    ]);
    check(
      mode,
      `${vp}-12-stills`,
      files.length === 12,
      `${OUT}shots/${vp}-pNN.png, ${OUT}sheet-${vp}.jpg`,
    );
    errorCheck(mode, `${vp}-no-console-error`, s.errors);
    await s.ctx.close();
  }
}

/* ---------------------------------- main ---------------------------------- */
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
  console.log(`Chrome ${results.browser} — ${results.renderer}`);
  if (!/NVIDIA/.test(results.renderer ?? "")) {
    throw new Error("no NVIDIA renderer: refusing to render the scenes on the CPU");
  }
  const runs = {
    text: runText,
    journey: runJourney,
    rapid: runRapid,
    lifecycle: runLifecycle,
    resize: runResize,
    touch: runTouch,
    reduced: runReduced,
    contrast: runContrast,
    failure: runFailure,
    shots: runShots,
  };
  for (const name of ONLY) {
    try {
      await runs[name](browser);
    } catch (err) {
      check(name, "run-completed", false, String(err.message).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2) + "\n");
const failed = results.checks.filter((c) => !c.pass);
console.log(`\n${results.checks.length - failed.length}/${results.checks.length} PASS`);
process.exit(failed.length ? 1 : 0);
