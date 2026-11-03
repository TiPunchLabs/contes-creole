// Ti Kannot world captures from the tale's own cameras, with a fake clock so every run renders the
// same frame, plus an uncapped fps and draw-call sample on the pilot page.
// Usage: [SITE=url] [OUT=dir] [PAGES=1,2,3,4] [ONLY=shots|perf] node qa/world.mjs
// Shots: <vp>-p<N>.png with the reading card, <vp>-p<N>-scene.png in "scène seule".
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/world/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const PAGES = (process.env.PAGES ?? "1,2,3,4").split(",").map(Number);
const PERF_PAGE = 2;
mkdirSync(OUT, { recursive: true });
// ANGLE on EGL: since the 580.178 driver, the Vulkan flags of the other scripts give no WebGL here.
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
const results = {};

/** Counts WebGL draw calls and drawn triangles per animation frame (installed before load). */
const COUNTER = () => {
  const stats = { calls: 0, tris: 0, frames: [] };
  window.__draws = stats;
  const tri = (mode, count, inst = 1) => (mode === 4 ? (count / 3) * inst : 0);
  const P = WebGL2RenderingContext.prototype;
  for (const [name, at] of [
    ["drawArrays", (a) => tri(a[0], a[2])],
    ["drawElements", (a) => tri(a[0], a[1])],
    ["drawArraysInstanced", (a) => tri(a[0], a[2], a[3])],
    ["drawElementsInstanced", (a) => tri(a[0], a[1], a[4])],
  ]) {
    const original = P[name];
    P[name] = function (...args) {
      stats.calls++;
      stats.tris += at(args);
      return original.apply(this, args);
    };
  }
  const raf = window.requestAnimationFrame.bind(window);
  const tick = () => {
    stats.frames.push([stats.calls, stats.tris]);
    if (stats.frames.length > 400) stats.frames.shift();
    stats.calls = 0;
    stats.tris = 0;
    raf(tick);
  };
  raf(tick);
};

/** Opens the tale on its first page; with `clock`, all waiting goes through the fake clock. */
async function openTale(browser, vp, clock) {
  const ctx = await browser.newContext(VIEWPORTS[vp]);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  if (clock) await p.clock.install({ time: new Date("2026-11-02T12:00:00Z") });
  else await p.addInitScript(COUNTER);
  const wait = (ms) => (clock ? p.clock.runFor(ms) : p.waitForTimeout(ms));
  await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  await wait(1500);
  const book = p.locator(".tree-shelf-book").nth(0);
  await book.click();
  await wait(2600);
  await book.click();
  await wait(4000);
  await p.waitForSelector(".reading:not([hidden])", { timeout: 15000 });
  await wait(6000);
  return { ctx, p, errors, wait };
}

const browser = await chromium.launch({ args: GPU });
try {
  const probe = await browser.newPage();
  const renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  await probe.close();
  results.renderer = renderer;
  console.log("renderer", renderer);
  if (!/NVIDIA/.test(renderer)) throw new Error("not on GPU, abort");

  if (process.env.ONLY !== "perf") {
    for (const vp of Object.keys(VIEWPORTS)) {
      const { ctx, p, errors, wait } = await openTale(browser, vp, true);
      let at = 1;
      for (const n of PAGES) {
        while (at < n) {
          await p.click(".reading-next");
          await wait(400);
          at++;
        }
        await wait(7000);
        await p.screenshot({ path: `${OUT}${vp}-p${n}.png` });
        await p.click(".reading-toggle");
        await wait(2500);
        await p.screenshot({ path: `${OUT}${vp}-p${n}-scene.png` });
        await p.click(".reading-toggle");
        await wait(2500);
        console.log("shot", vp, n);
      }
      results[`errors.${vp}`] = errors;
      await ctx.close();
    }
  }
  await browser.close();

  if (process.env.ONLY !== "shots") {
    const free = await chromium.launch({
      args: [...GPU, "--disable-gpu-vsync", "--disable-frame-rate-limit"],
    });
    for (const vp of Object.keys(VIEWPORTS)) {
      const { ctx, p } = await openTale(free, vp, false);
      for (let at = 1; at < PERF_PAGE; at++) {
        await p.click(".reading-next");
        await p.waitForTimeout(400);
      }
      await p.waitForTimeout(6000);
      const sample = await p.evaluate(
        () =>
          new Promise((done) => {
            let n = 0;
            const t0 = performance.now();
            const step = () => {
              n++;
              if (performance.now() - t0 < 5000) requestAnimationFrame(step);
              else {
                const f = window.__draws.frames.slice(-60);
                const avg = (k) => f.reduce((s, x) => s + x[k], 0) / f.length;
                done({ fps: (n * 1000) / (performance.now() - t0), calls: avg(0), tris: avg(1) });
              }
            };
            requestAnimationFrame(step);
          }),
      );
      results[`perf.${vp}`] = sample;
      console.log("perf", vp, JSON.stringify(sample));
      await ctx.close();
    }
    await free.close();
  }
} finally {
  writeFileSync(OUT + "results.json", JSON.stringify(results, null, 2));
}
