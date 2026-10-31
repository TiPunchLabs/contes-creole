// 3D scene checks (M5 and later 3D missions): captures at fixed climb values, full and lite, an
// uncapped fps sample, console errors, and a focus check over the animated sky with frozen time.
// Usage: [SITE=url] [OUT=dir] [ONLY=fps] [QA_INJECT_CSS=css] node qa/scene.mjs   (default OUT: qa/out/scene/)
// ONLY=fps skips captures and focus (repeat it to see the fps spread). QA_INJECT_CSS: negative control.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { focusIndicator } from "./focus.mjs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/scene/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
mkdirSync(OUT, { recursive: true });
const GPU = [
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--use-angle=vulkan",
  "--enable-features=Vulkan",
];
const CLIMB = [0, 0.5, 1];
const results = [];
const check = (id, ok, detail = "") => {
  results.push({ id, status: ok ? "PASS" : "FAIL", detail });
  console.log(ok ? "PASS" : "FAIL", id, detail);
};
const info = (id, detail) => {
  results.push({ id, status: "INFO", detail });
  console.log("INFO", id, detail);
};

/** Opens the tree in a new context; `clock` installs Playwright's fake clock before loading. */
async function open(browser, ctxOpts, query = "", clock = false) {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  if (clock) await p.clock.install();
  await p.goto(SITE + query);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  if (process.env.QA_INJECT_CSS) await p.addStyleTag({ content: process.env.QA_INJECT_CSS });
  await p.waitForTimeout(1200);
  return { ctx, p, errors };
}

/** Current climb value t, from the thumb's `top` (`calc(<100t>% - <24t>px)` once normalized). */
const climbT = (p) =>
  p.$eval(".tree-climb-thumb", (e) => Number(/([\d.e-]+)%/.exec(e.style.top)?.[1] ?? NaN) / 100);

/** Wheels until the eased climb settles on `goal` (0..1). */
async function climbTo(p, goal, w, h) {
  await p.mouse.move(w / 2, h / 2);
  for (let i = 0; i < 40; i++) {
    const now = await climbT(p);
    if (Math.abs(now - goal) < 0.01) break;
    await p.mouse.wheel(0, Math.max(-400, Math.min(400, (goal - now) / 0.00055)));
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(1800);
  return climbT(p);
}

const browser = await chromium.launch({ args: GPU });
try {
  const renderer = await (async () => {
    const p = await browser.newPage();
    const r = await p.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
    });
    await p.close();
    return r;
  })();
  check("gpu.renderer", /NVIDIA/.test(renderer), renderer);
  if (!/NVIDIA/.test(renderer)) throw new Error("not on GPU, abort");

  // Captures at fixed climb values, full and lite, desktop; t = 0 on mobile.
  for (const [mode, query, vp] of process.env.ONLY === "fps"
    ? []
    : [
        ["full", "", { width: 1440, height: 900 }],
        ["lite", "?lite=1", { width: 1440, height: 900 }],
        ["mobile", "", { width: 390, height: 844 }],
      ]) {
    const extra = mode === "mobile" ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {};
    const { ctx, p, errors } = await open(browser, { viewport: vp, ...extra }, query);
    for (const goal of mode === "mobile" ? [0] : CLIMB) {
      const t = await climbTo(p, goal, vp.width, vp.height);
      await p.screenshot({ path: `${OUT}${mode}-t${goal}.png` });
      check(`capture.${mode}.t${goal}`, Math.abs(t - goal) < 0.02, `t=${t.toFixed(3)}`);
    }
    check(`console.${mode}`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // Focus ring over the animated sky: pause the page clock (rAF, performance, timers) so the WebGL
  // frame stops, prove the background is static, then measure the ring with focusIndicator.
  if (process.env.ONLY !== "fps") {
    const { ctx, p } = await open(
      browser,
      { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" },
      "",
      true,
    );
    await p.locator(".tree-shelf-book").nth(0).click();
    await p.clock.runFor(4000);
    await p.clock.pauseAt(Date.now() + 3_600_000);
    await p.mouse.move(720, 40);
    for (const [name, sel] of [["enter-button", ".tree-enter"]]) {
      const box = await p.locator(sel).boundingBox();
      const clip = { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 };
      // A rare transient frame was seen once in a full run (0 of 36 in isolation): wait for two
      // identical frames, up to 3 tries, and record how many it took.
      let attempts = 0;
      let still = false;
      while (!still && attempts < 3) {
        attempts++;
        const a = await p.screenshot({ clip });
        await p.waitForTimeout(400);
        still = a.equals(await p.screenshot({ clip }));
      }
      check(`focus-frozen.${name}.background-static`, still, `attempts=${attempts}`);
      const ring = await focusIndicator(p, p.locator(sel));
      check(`focus-frozen.${name}.visible`, ring.visible, JSON.stringify(ring));
    }
    await ctx.close();
  }

  // Uncapped frame rate (vsync and frame-rate limit off), t = 0, full and lite.
  const fast = await chromium.launch({
    args: [...GPU, "--disable-gpu-vsync", "--disable-frame-rate-limit"],
  });
  try {
    for (const [mode, query] of [
      ["full", ""],
      ["lite", "?lite=1"],
    ]) {
      const { ctx, p } = await open(fast, { viewport: { width: 1440, height: 900 } }, query);
      await p.waitForTimeout(2000);
      const fps = await p.evaluate(
        () =>
          new Promise((r) => {
            let n = 0;
            const s = performance.now();
            const f = () => {
              n++;
              if (performance.now() - s < 5000) requestAnimationFrame(f);
              else r(n / 5);
            };
            requestAnimationFrame(f);
          }),
      );
      info(`fps.uncapped.${mode}`, fps.toFixed(1));
      await ctx.close();
    }
  } finally {
    await fast.close();
  }
} catch (e) {
  check("run", false, String(e));
} finally {
  writeFileSync(OUT + "results.json", JSON.stringify(results, null, 2));
  await browser.close();
  // Shell callers rely on the status: any recorded FAIL makes the run fail.
  process.exitCode = results.some((r) => r.status === "FAIL") ? 1 : 0;
}
