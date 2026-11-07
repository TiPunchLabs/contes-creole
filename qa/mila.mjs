// Mila's book: the card in the tree, the dive, the twelve pages, controls, leave and reopen
// (WebGL contexts, render loops and AudioContexts counted), keyboard and focus, reduced motion,
// the text-only fallback, and the existing tale still opening. Real time (the scene runs on
// performance.now), GPU only.
// Usage: [SITE=url] [OUT=dir] [ONLY=desktop,mobile,landscape,keys,reduced,nogl,kannot] node qa/mila.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/mila/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "desktop,mobile,landscape,keys,reduced,nogl,kannot").split(",");
mkdirSync(OUT, { recursive: true });
// ANGLE on EGL with the NVIDIA EGL vendor pinned: without it, glvnd may pick Mesa's llvmpipe (CPU).
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const GPU_ENV = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  landscape: {
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
const TITLE = "Mila et le lambi qui avait perdu son chant";
/** Third-party requests a host injects (Netlify's deploy-preview toolbar), not the site's own. */
const HOST_NOISE = /cdn\.segment\.com|sessions\.bugsnag\.com/;
const results = { site: SITE, checks: [], runs: {} };

/** Records one check; `pass` false marks the run as failed. */
function check(run, name, pass, detail = "") {
  results.checks.push({ run, name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${run} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Counts WebGL contexts, AudioContexts and draw calls per canvas kind (installed before load). */
const INSTRUMENT = () => {
  const s = { webgl: [], audio: [], draws: { mila: 0, other: 0 } };
  window.__qa = s;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const mila = this.classList.contains("mila-gl");
    if (window.__qaNoMilaGL && mila && /webgl/.test(type)) return null;
    const ctx = getContext.call(this, type, ...rest);
    if (ctx && /webgl/.test(type) && !s.webgl.some((e) => e.gl === ctx))
      s.webgl.push({ gl: ctx, mila });
    return ctx;
  };
  const Audio = window.AudioContext;
  if (Audio)
    window.AudioContext = class extends Audio {
      constructor(...args) {
        super(...args);
        s.audio.push(this);
      }
    };
  for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    for (const name of [
      "drawArrays",
      "drawElements",
      "drawArraysInstanced",
      "drawElementsInstanced",
    ]) {
      const original = P[name];
      if (!original) continue;
      P[name] = function (...args) {
        s.draws[this.canvas.classList?.contains("mila-gl") ? "mila" : "other"]++;
        return original.apply(this, args);
      };
    }
  }
};

/** Live counters: contexts created and lost, audio states, and Mila draw calls per second. */
async function counters(p, ms = 2000) {
  const before = await p.evaluate(() => window.__qa.draws.mila);
  await p.waitForTimeout(ms);
  return p.evaluate(
    ({ before, ms }) => {
      const s = window.__qa;
      const mila = s.webgl.filter((e) => e.mila);
      return {
        milaContexts: mila.length,
        milaContextsLive: mila.filter((e) => !e.gl.isContextLost()).length,
        audio: s.audio.map((a) => a.state),
        milaDrawsPerSec: Math.round(((s.draws.mila - before) * 1000) / ms),
      };
    },
    { before, ms },
  );
}

async function newPage(browser, vp, extra = {}) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp], ...extra });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (m) => {
    const url = m.location()?.url ?? "";
    if (m.type() === "error" && !HOST_NOISE.test(url)) errors.push("console: " + m.text());
  });
  p.on("requestfailed", (r) => {
    if (!HOST_NOISE.test(r.url())) errors.push(`requestfailed: ${r.url()}`);
  });
  await p.addInitScript(INSTRUMENT);
  await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  await p.waitForTimeout(1500);
  return { ctx, p, errors };
}

const press = async (loc, touch) => (touch ? loc.tap() : loc.click());

/** Selects Mila's card from the shelf, then opens it; returns ms from the press to page 1's text. */
async function openMila(p, run, touch, shoot) {
  const shelf = p.locator(".tree-shelf-book").nth(1);
  // Back from the book, the tree already rests on Mila's card: one press opens it.
  if (!(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
    await press(shelf, touch);
    await p.waitForTimeout(2800);
  }
  if (shoot) await p.screenshot({ path: `${OUT}${run}-tree-card.png` });
  const t0 = Date.now();
  await press(shelf, touch);
  await waitPageOne(p);
  return Date.now() - t0;
}

/** Waits until the tale shows page 1's text (it opens there, with no cover screen). */
async function waitPageOne(p) {
  await p.waitForFunction(
    () =>
      document.querySelector(".mila-story")?.classList.contains("is-on") &&
      document.querySelector(".mila-num")?.textContent === "Page 01",
    null,
    { timeout: 25000, polling: 50 },
  );
}

/** What the reader finds on arrival: page 1, no cover screen, the focus and the sound. */
const arrival = (p) =>
  p.evaluate(() => ({
    num: document.querySelector(".mila-num")?.textContent,
    coverScreen: document.querySelectorAll(".mila-cover, .mila-enter, .mila-tocover").length,
    controls: document.querySelector(".mila-ui")?.classList.contains("is-on"),
    focus: document.activeElement?.className,
    audio: window.__qa.audio.map((a) => a.state),
  }));

/** Checks the arrival on page 1 straight from the tree. */
function checkArrival(run, a, ms) {
  check(
    run,
    "opens-on-page-1",
    a.num === "Page 01" && a.coverScreen === 0 && a.controls,
    `${JSON.stringify(a)} in ${ms} ms`,
  );
  check(run, "focus-on-next", /mila-next/.test(a.focus ?? ""), a.focus);
}

/** Bounding boxes of the story text, the controls and the way back. */
const layout = (p) =>
  p.evaluate(() => {
    const box = (sel) => document.querySelector(sel)?.getBoundingClientRect();
    const scroll = document.querySelector(".mila-story-scroll");
    const story = box(".mila-story-scroll");
    const controls = [...document.querySelectorAll(".mila-ui .mila-btn, .mila-count")].map((e) =>
      e.getBoundingClientRect(),
    );
    const back = box(".mila-back");
    const hit = (a, b) =>
      a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return {
      story: story && { top: Math.round(story.top), bottom: Math.round(story.bottom) },
      overflowPx: scroll ? scroll.scrollHeight - scroll.clientHeight : 0,
      overControls: controls.some((c) => hit(story, c)),
      overBack: hit(story, back),
      inView: story ? story.top >= 0 && story.bottom <= innerHeight : false,
    };
  });

/** Clicks (taps on touch devices) over the visible scene until the three pieces of debris are gone (page 5). */
async function freeCrab(p, touch) {
  const { width, height } = p.viewportSize();
  let clicks = 0;
  for (let y = height * 0.15; y < height * 0.85; y += 22) {
    for (let x = 10; x < width - 10; x += 22) {
      const onScene = await p.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.classList.contains("mila-gl"),
        [x, y],
      );
      if (!onScene) continue;
      if (touch) await p.touchscreen.tap(x, y);
      else await p.mouse.click(x, y);
      clicks++;
      if (await p.locator(".mila-hint").isHidden()) return clicks;
    }
  }
  return -clicks;
}

/** Presses a page control and waits until another page's text is shown. */
async function turn(p, control, touch) {
  const before = await p.locator(".mila-num").textContent();
  const t0 = Date.now();
  await press(p.locator(control), touch);
  await p.waitForFunction(
    (before) =>
      document.querySelector(".mila-story")?.classList.contains("is-on") &&
      document.querySelector(".mila-num")?.textContent !== before,
    before,
    { timeout: 25000, polling: 50 },
  );
  return Date.now() - t0;
}

const SHOTS = {
  desktop: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12],
  mobile: [1, 2, 5, 7, 8, 12],
  landscape: [1, 5, 9, 12],
};

async function journey(browser, vp) {
  const run = vp;
  const touch = vp !== "desktop";
  const { ctx, p, errors } = await newPage(browser, vp);
  const renderer = await p.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  check(run, "gpu-renderer", /NVIDIA/i.test(renderer), renderer);
  if (!/NVIDIA/i.test(renderer)) throw new Error("no GPU renderer, refusing to run on the CPU");

  const shelf = await p.evaluate(() =>
    [...document.querySelectorAll(".tree-shelf-book")].map((b) => ({
      lang: b.lang,
      label: b.getAttribute("aria-label"),
      title: b.querySelector(".tree-shelf-title")?.textContent,
    })),
  );
  check(run, "tree-three-slots", shelf.length === 3, shelf.map((s) => s.title).join(" | "));
  check(
    run,
    "shelf-mila-name",
    shelf[1]?.title === TITLE && shelf[1]?.label?.startsWith(TITLE),
    shelf[1]?.label,
  );
  check(run, "shelf-mila-lang-fr", shelf[1]?.lang === "fr");

  const openMs = await openMila(p, run, touch, true);
  await p.waitForTimeout(600);
  const fiche = await p.evaluate(() => ({ lang: document.querySelector(".tree-label")?.lang }));
  results.runs[run] = { fiche, openMs };
  const first1 = await arrival(p);
  checkArrival(run, first1, openMs);
  check(run, "sound-starts-on-opening", first1.audio.length === 1, JSON.stringify(first1.audio));
  const cover = await p.evaluate(() => ({
    immersive: document.querySelector(".app")?.hasAttribute("data-immersive"),
    focus: document.activeElement?.className,
    title: document.querySelector(".mila-title")?.textContent,
    readingHidden: document.querySelector(".reading")?.hidden,
  }));
  check(
    run,
    "dive-opens-mila",
    cover.immersive && cover.title === TITLE && cover.readingHidden,
    JSON.stringify(cover),
  );

  // the tale, page by page
  const times = [];
  const layouts = {};
  for (let i = 1; i <= 12; i++) {
    const num = await p.locator(".mila-num").textContent();
    check(run, `page-${i}-shown`, num === `Page ${String(i).padStart(2, "0")}`, num);
    const lay = await layout(p);
    layouts[i] = lay;
    check(
      run,
      `page-${i}-text-clear`,
      lay.inView && !lay.overControls && !lay.overBack,
      JSON.stringify(lay),
    );
    if (SHOTS[vp].includes(i)) {
      await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}${run}-p${String(i).padStart(2, "0")}.png` });
    }
    if (i === 5) {
      const hint = await p.locator(".mila-hint").isVisible();
      check(run, "crab-hint-shown", hint);
      const clicks = await freeCrab(p, touch);
      check(run, "crab-freed-by-touch", clicks > 0, `${Math.abs(clicks)} clicks`);
      await p.waitForTimeout(1500);
      if (vp === "desktop") await p.screenshot({ path: `${OUT}${run}-p05-freed.png` });
    }
    if (i === 8 && vp === "desktop") {
      // Paused under water once the page has settled, two frames a second apart must match
      // (compared with ImageMagick).
      await p.waitForTimeout(6000);
      await press(p.locator(".mila-pause"), touch);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}${run}-p08-paused-a.png` });
      await p.waitForTimeout(1000);
      await p.screenshot({ path: `${OUT}${run}-p08-paused-b.png` });
      await press(p.locator(".mila-pause"), touch);
      await p.waitForTimeout(800);
    }
    if (i < 12) times.push(await turn(p, ".mila-next", touch));
  }
  results.runs[run].transitionMs = times;
  results.runs[run].layouts = layouts;
  const endShown = await p.locator(".mila-end").isVisible();
  check(run, "ending-buttons", endShown);
  check(run, "next-disabled-on-12", await p.locator(".mila-next").isDisabled());

  if (vp === "desktop") {
    await turn(p, ".mila-prev", touch);
    check(run, "prev-goes-back", (await p.locator(".mila-num").textContent()) === "Page 11");
    await turn(p, ".mila-next", touch);
    const audioBefore = await p.evaluate(() => window.__qa.audio.map((a) => a.state));
    await press(p.locator(".mila-sound"), touch);
    check(
      run,
      "sound-toggle",
      (await p.locator(".mila-sound").getAttribute("aria-pressed")) === "false",
      JSON.stringify(audioBefore),
    );
    await press(p.locator(".mila-sound"), touch);
    await press(p.locator(".mila-pause"), touch);
    check(
      run,
      "pause-toggle",
      (await p.locator(".mila-pause").getAttribute("aria-pressed")) === "true",
    );
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}${run}-p12-paused.png` });
    await press(p.locator(".mila-pause"), touch);
    await turn(p, ".mila-reread", touch);
    check(run, "reread-to-page-1", (await p.locator(".mila-num").textContent()) === "Page 01");
    const first = await counters(p);
    results.runs[run].firstOpen = first;
    check(
      run,
      "one-mila-context-live",
      first.milaContexts === 1 && first.milaContextsLive === 1,
      JSON.stringify(first),
    );
    check(
      run,
      "one-audio-context-running",
      first.audio.length === 1 && first.audio[0] === "running",
      JSON.stringify(first.audio),
    );
    // leave from another page than 1: the reopening must not resume where the reader left
    await turn(p, ".mila-next", touch);

    // leave by the way back, then reopen and leave by Escape
    await press(p.locator(".mila-back"), touch);
    await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
    await p.waitForTimeout(2600);
    const focusBack = await p.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName,
    );
    check(run, "focus-back-on-shelf", focusBack?.startsWith(TITLE), focusBack);
    const left = await counters(p);
    check(
      run,
      "leave-releases",
      left.milaContextsLive === 0 &&
        left.audio.every((a) => a === "closed") &&
        left.milaDrawsPerSec === 0,
      JSON.stringify(left),
    );
    check(run, "mila-dom-removed", (await p.locator(".mila").count()) === 0);

    const reopenMs = await openMila(p, run, touch, false);
    await p.waitForTimeout(600);
    const again = await arrival(p);
    check(
      run,
      "reopen-on-page-1",
      again.num === "Page 01" && again.coverScreen === 0 && /mila-next/.test(again.focus ?? ""),
      `${JSON.stringify(again)} in ${reopenMs} ms`,
    );
    const second = await counters(p);
    results.runs[run].secondOpen = second;
    const ratio = second.milaDrawsPerSec / Math.max(1, first.milaDrawsPerSec);
    check(
      run,
      "reopen-single-loop",
      second.milaContextsLive === 1 && ratio < 1.5,
      `draws/s ${first.milaDrawsPerSec} -> ${second.milaDrawsPerSec}`,
    );
    check(
      run,
      "reopen-single-audio",
      second.audio.filter((a) => a !== "closed").length === 1,
      JSON.stringify(second.audio),
    );
    await p.keyboard.press("Escape");
    await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
    await p.waitForTimeout(2600);
    const left2 = await counters(p);
    check(
      run,
      "escape-leaves-and-releases",
      left2.milaContexts === 2 &&
        left2.milaContextsLive === 0 &&
        left2.audio.every((a) => a === "closed"),
      JSON.stringify(left2),
    );
    await p.screenshot({ path: `${OUT}${run}-tree-after.png` });
  }
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function keys(browser) {
  const run = "keys";
  const { ctx, p, errors } = await newPage(browser, "desktop");
  const shelf = p.locator(".tree-shelf-book").nth(1);
  await shelf.focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(2800);
  await p.keyboard.press("Enter");
  await waitPageOne(p);
  await p.waitForTimeout(600);
  checkArrival(run, await arrival(p), 0);
  await p.keyboard.press("ArrowRight");
  await p.waitForSelector(".mila-story:not(.is-on)", { timeout: 5000 });
  await p.waitForSelector(".mila-story.is-on", { timeout: 20000 });
  check(run, "arrow-right-turns", (await p.locator(".mila-num").textContent()) === "Page 02");
  await p.keyboard.press("Shift+Tab");
  await p.keyboard.press("Tab");
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}keys-focus-ring.png` });
  const ring = await p.evaluate(() => {
    const el = document.activeElement;
    const cs = el && getComputedStyle(el);
    return { cls: el?.className, outline: cs?.outlineStyle, color: cs?.outlineColor };
  });
  check(run, "visible-focus-ring", ring.outline === "solid", JSON.stringify(ring));
  await p.keyboard.press("Escape");
  await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
  await p.waitForTimeout(2600);
  const back = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  check(run, "escape-returns-focus-to-shelf", back?.startsWith(TITLE), back);
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function reduced(browser) {
  const run = "reduced";
  const { ctx, p, errors } = await newPage(browser, "desktop", { reducedMotion: "reduce" });
  const t1 = await openMila(p, run, false, false);
  const t2 = await turn(p, ".mila-next", false);
  check(run, "cuts-not-flights", t2 < 2500, `open ${t1} ms, page 2 ${t2} ms`);
  const anim = await p.evaluate(
    () => getComputedStyle(document.querySelector(".mila-hint"), "::before").animationName,
  );
  check(run, "hint-pulse-off", anim === "none", anim);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}reduced-p02.png` });
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function nogl(browser, vp) {
  const run = `nogl-${vp}`;
  const ctx = await browser.newContext(VIEWPORTS[vp]);
  await ctx.addInitScript(() => (window.__qaNoMilaGL = true));
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await p.addInitScript(INSTRUMENT);
  await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  await p.waitForTimeout(1500);
  const openMs = await openMila(p, run, vp !== "desktop", false);
  check(run, "text-fallback", (await p.locator(".mila.is-nogl").count()) === 1);
  checkArrival(run, await arrival(p), openMs);
  await p.screenshot({ path: `${OUT}${run}-p01.png` });
  for (let i = 1; i < 12; i++) await press(p.locator(".mila-next"), vp !== "desktop");
  check(run, "reads-to-page-12", (await p.locator(".mila-num").textContent()) === "Page 12");
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}${run}-p12.png` });
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function kannot(browser, vp) {
  const run = `kannot-${vp}`;
  const touch = vp !== "desktop";
  const { ctx, p, errors } = await newPage(browser, vp);
  const shelf = p.locator(".tree-shelf-book").nth(0);
  if (!(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
    await press(shelf, touch);
    await p.waitForTimeout(2600);
  }
  await press(shelf, touch);
  await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
  await p.waitForTimeout(4000);
  const state = await p.evaluate(() => ({
    title: document.querySelector(".reading-title")?.textContent,
    book: document.querySelector(".app")?.dataset.book,
    immersive: document.querySelector(".app")?.hasAttribute("data-immersive"),
    mila: document.querySelectorAll(".mila").length,
    vignette: getComputedStyle(document.querySelector(".app-vignette")).display,
  }));
  check(
    run,
    "ti-kannot-opens-in-its-own-reading-ui",
    state.book === "ti-kannot" && !state.immersive && state.mila === 0 && state.vignette !== "none",
    JSON.stringify(state),
  );
  await press(p.locator(".reading-next"), touch);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${OUT}${run}-p02.png` });
  check(
    run,
    "ti-kannot-pages",
    /2 \//.test((await p.locator(".reading-count").textContent()) ?? ""),
  );
  await press(p.locator(".reading-back"), touch);
  await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Runs one scenario; a crash is recorded as a failed check (with a capture) and the rest go on. */
async function guarded(run, fn) {
  try {
    await fn();
  } catch (err) {
    check(run, "completed", false, String(err).split("\n")[0]);
    for (const ctx of browser.contexts()) {
      for (const page of ctx.pages()) {
        await page.screenshot({ path: `${OUT}${run}-crash.png` }).catch(() => undefined);
        const state = await page
          .evaluate(() => ({
            tree: document.querySelector(".app-tree")?.hidden,
            book: document.querySelector(".app")?.dataset.book,
            shelf: [...document.querySelectorAll(".tree-shelf-book")].map((b) => {
              const r = b.getBoundingClientRect();
              return [b.className, Math.round(r.x), Math.round(r.y), Math.round(r.width)];
            }),
          }))
          .catch(() => null);
        check(run, "crash-state", false, JSON.stringify(state));
      }
      await ctx.close();
    }
  }
}

const browser = await chromium.launch({ args: GPU, env: GPU_ENV });
try {
  for (const vp of ["desktop", "mobile", "landscape"])
    if (ONLY.includes(vp)) await guarded(vp, () => journey(browser, vp));
  if (ONLY.includes("keys")) await guarded("keys", () => keys(browser));
  if (ONLY.includes("reduced")) await guarded("reduced", () => reduced(browser));
  if (ONLY.includes("nogl"))
    for (const vp of ["desktop", "mobile"]) await guarded(`nogl-${vp}`, () => nogl(browser, vp));
  if (ONLY.includes("kannot"))
    for (const vp of ["desktop", "mobile"])
      await guarded(`kannot-${vp}`, () => kannot(browser, vp));
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
  const failed = results.checks.filter((c) => !c.pass);
  console.log(`\n${results.checks.length - failed.length}/${results.checks.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}
