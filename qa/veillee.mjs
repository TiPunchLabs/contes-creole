// « La Veillée » home: motion videos, journeys and GPU measurements, headed on the GPU only.
// Usage: [SITE=url] [OUT=dir] [QA_CHANNEL=chrome] MODE=rest|journey|perf [VP=desktop,mobile]
//        nice -n 19 node qa/veillee.mjs
// rest    : 22 s untouched at rest, then one page turn (per viewport), recorded (webm).
// journey : Mila → first scene → back on the same page → turn → animated portrait (its text) →
//           Ti Kannot → first scene → back; desktop with clicks, mobile with taps and swipes.
// perf    : FPS over 20 s at rest and over ~10 s of page turns; first-load bytes; renderer.info
//           after each of 5 round trips into a tale (needs the `?qa=1` hook of src/veillee).
// Aborts unless WebGL's UNMASKED_RENDERER is a hardware GPU (never SwiftShader / llvmpipe).
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const MODE = process.env.MODE ?? "rest";
const OUT = (
  process.env.OUT ?? `${homedir()}/.local/share/contes-creole-qa/accueil-veillee/${MODE}`
).replace(/\/?$/, "/");
const VPS = (process.env.VP ?? "desktop,mobile").split(",");
mkdirSync(OUT, { recursive: true });
// Same launch as the other GPU scripts: ANGLE on EGL with the NVIDIA EGL vendor pinned.
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
};
const log = { site: SITE, mode: MODE, renderer: null, chrome: null, runs: {} };
const wait = (page, ms) => page.waitForTimeout(ms);

/** The WebGL renderer string; throws on a software renderer. */
async function checkRenderer(page) {
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  log.renderer = renderer;
  if (/swiftshader|llvmpipe|software|none/i.test(renderer))
    throw new Error(`software renderer (${renderer}): measurements would be invalid`);
  return renderer;
}

/** Clicks or taps a locator. */
const press = (loc, touch) => (touch ? loc.tap() : loc.click());

/** A horizontal swipe across the book (touch), `dx` pixels. */
async function swipe(page, dx) {
  const { width, height } = page.viewportSize();
  const x = width / 2;
  const y = height * 0.72;
  await page.evaluate(
    ({ x, y, dx }) => {
      const target = document.elementFromPoint(x, y) ?? document.body;
      const fire = (type, cx) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 7,
            pointerType: "touch",
            clientX: cx,
            clientY: y,
            isPrimary: true,
          }),
        );
      fire("pointerdown", x);
      fire("pointermove", x + dx / 2);
      fire("pointerup", x + dx);
    },
    { x, y, dx },
  );
}

/** Counts animation frames over `ms` in the page. */
const fps = (page, ms) =>
  page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        let n = 0;
        const t0 = performance.now();
        const step = (t) => {
          n++;
          if (t - t0 < ms) requestAnimationFrame(step);
          else resolve(Math.round((n / (t - t0)) * 10000) / 10);
        };
        requestAnimationFrame(step);
      }),
    ms,
  );

/** Opens a page (optionally recording) and waits for the scene. */
async function open(browser, vp, record, query = "") {
  const context = await browser.newContext({
    ...VIEWPORTS[vp],
    ...(record ? { recordVideo: { dir: OUT, size: VIEWPORTS[vp].viewport } } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(SITE + query);
  await checkRenderer(page);
  await wait(page, 2500);
  return { context, page, errors };
}

/** Saves the context's video under a readable name. */
async function finish({ context, page, errors }, name) {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(`${OUT}${name}.webm`);
  log.runs[name] = { ...(log.runs[name] ?? {}), errors };
}

const browser = await chromium.launch({
  headless: false,
  args: GPU,
  env: GPU_ENV,
  channel: process.env.QA_CHANNEL || undefined,
});
log.chrome = browser.version();
try {
  for (const vp of VPS) {
    const touch = vp === "mobile";
    if (MODE === "rest") {
      const run = await open(browser, vp, true);
      await wait(run.page, 22000);
      await press(run.page.locator(".v-next"), touch);
      await wait(run.page, 3000);
      await finish(run, `rest-${vp}`);
    } else if (MODE === "journey") {
      const run = await open(browser, vp, true);
      const { page } = run;
      const steps = [];
      const note = (what) => steps.push({ t: Date.now(), what });
      await press(page.locator(".v-mark", { hasText: "Mila" }), touch);
      await wait(page, 2200);
      note("Mila page selected");
      await press(page.locator(".v-art"), touch);
      await page.waitForFunction(() => document.querySelector(".app")?.dataset.book === "mila");
      note("Mila first scene");
      await wait(page, 5000);
      await press(page.locator(".mila-back"), touch);
      await page.waitForFunction(() => !document.querySelector(".app")?.dataset.book);
      await wait(page, 2400);
      note(`back: ${await page.locator(".v-status").textContent()}`);
      if (touch) await swipe(page, -160);
      else await press(page.locator(".v-next"), touch);
      await wait(page, 2200);
      note(`turned: ${await page.locator(".v-status").textContent()}`);
      await wait(page, 4500);
      note(`portrait text: ${await page.locator(".v-portrait-text").textContent()}`);
      await press(page.locator(".v-mark", { hasText: "Ti Kannot" }), touch);
      await wait(page, 2400);
      note(`bookmark: ${await page.locator(".v-status").textContent()}`);
      await press(page.locator(".v-art"), touch);
      await page.waitForFunction(
        () => document.querySelector(".app")?.dataset.book === "ti-kannot",
      );
      note("Ti Kannot first scene");
      await wait(page, 4500);
      await press(page.locator(".reading-back"), touch);
      await page.waitForFunction(() => !document.querySelector(".app")?.dataset.book);
      await wait(page, 2400);
      note(`back: ${await page.locator(".v-status").textContent()}`);
      log.runs[`journey-${vp}`] = {
        steps,
        focus: await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 140)),
      };
      await finish(run, `journey-${vp}`);
    } else if (MODE === "perf") {
      const run = await open(browser, vp, false, "?qa=1");
      const { page } = run;
      const bytes = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .concat(performance.getEntriesByType("navigation"))
          .reduce((sum, e) => sum + (e.transferSize || 0), 0),
      );
      await wait(page, 3000);
      const rest = await fps(page, 20000);
      const turning = page.evaluate(() => {
        const next = document.querySelector(".v-next");
        const prev = document.querySelector(".v-prev");
        let k = 0;
        const id = setInterval(() => ((k++ % 6 < 3 ? next : prev) || next)?.click(), 1300);
        // Stops before the FPS window closes: no late click may follow the next step.
        setTimeout(() => clearInterval(id), 9500);
      });
      const turn = await fps(page, 10000);
      await turning;
      const info = [await page.evaluate(() => window.__veillee?.())];
      for (let i = 0; i < 5; i++) {
        const id = i % 2 ? "Ti Kannot" : "Mila";
        await press(page.locator(".v-mark", { hasText: id }), touch);
        await wait(page, 1800);
        await press(page.locator(".v-art"), touch);
        await page.waitForFunction(() => !!document.querySelector(".app")?.dataset.book);
        await wait(page, 3000);
        const hiddenWhileOpen = await page.evaluate(() => window.__veillee?.().running);
        await page.keyboard.press("Escape");
        if (
          await page
            .locator(".mila-back")
            .isVisible()
            .catch(() => false)
        )
          await page.locator(".mila-back").click();
        await page.waitForFunction(() => !document.querySelector(".app")?.dataset.book);
        await wait(page, 2500);
        info.push({ ...(await page.evaluate(() => window.__veillee?.())), hiddenWhileOpen });
      }
      log.runs[`perf-${vp}`] = { firstLoadBytes: bytes, fpsRest: rest, fpsTurning: turn, info };
      await finish(run, `perf-${vp}`);
    }
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}log-${MODE}.json`, JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
}
