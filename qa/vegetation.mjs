// Vegetation captures for before/after comparison (organic vegetation mission): fixed viewpoints of
// the tree scene through the QA viewer (qa/vegetation/, needs the `vite` dev server), the real app
// at fixed climb values on desktop and phones, triangle and draw-call counts, an uncapped fps sample
// and console errors. Run it against the baseline and the branch with the same OUT layout.
// Usage: SITE=http://localhost:5173/ OUT=dir [ONLY=views,app,fps] node qa/vegetation.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = (process.env.SITE ?? "http://localhost:5173/").replace(/\/?$/, "/");
const OUT = (process.env.OUT ?? new URL("./out/vegetation/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "views,app,fps").split(",");
mkdirSync(OUT, { recursive: true });
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const env = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};

/** Spiral camera of the tree (src/tree/scene/camera.ts `hubCam`). */
function hub(t) {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 20 - t * 4;
  const y = 1.3 + t * 6.4;
  return [
    [Math.cos(a) * r, y, Math.sin(a) * r],
    [0, y + 2.2 - t * 1.2, 0],
  ];
}

/** Named viewpoints: [position, look-at]. */
const VIEWS = {
  "01-opening": hub(0),
  "02-trunk-roots": [
    [1.2, 1.4, -6.8],
    [0, 1.2, 0],
  ],
  "03-junctions": [
    [-1.5, 5.2, -8.5],
    [0, 6.4, 0],
  ],
  "04-canopy": [
    [0, 9.5, -19],
    [0, 9.8, 0],
  ],
  "05-canopy-under": [
    [3, 3.5, -5],
    [0, 9, 0],
  ],
  "06-roots-side": [
    [-6, 0.6, 2.5],
    [0, 0.2, 0],
  ],
  "07-palms": [
    [-2, 3.2, -19],
    [-9.5, 4, -10],
  ],
  "08-palm-crown": [
    [7.5, 5.5, -10],
    [12.2, 5.4, -5.8],
  ],
  "09-banana": [
    [-6.5, 1.8, -1.5],
    [-12, 2, 4],
  ],
  "10-balisiers": [
    [-2.5, 1.3, -17.5],
    [-5.5, 0.4, -11],
  ],
  "11-tree-ferns": [
    [-0.5, 2.6, 7.5],
    [-2, 2.8, 14],
  ],
  "12-breadfruit": [
    [-19, 3, -12],
    [-28, 3.5, -5],
  ],
  "13-flamboyant": [
    [-16, 3, 1],
    [-25, 4, 7],
  ],
  "14-ground-ferns": [
    [4, 0.7, -10],
    [5.5, -0.4, -5],
  ],
  "15-hub-025": hub(0.25),
  "16-hub-050": hub(0.5),
  "17-hub-075": hub(0.75),
  "18-hub-100": hub(1),
  "19-far-east": [
    [6, 3, -24],
    [22, 3, -10],
  ],
};
const VIEWPORTS = {
  desktop: { viewport: { width: 1920, height: 918 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  narrow: {
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
const results = { site: SITE, views: {}, app: {}, fps: {}, errors: [] };

/** Records page errors under `tag`. */
function watch(page, tag) {
  page.on("pageerror", (e) => results.errors.push(`${tag} pageerror: ${e.message}`));
  page.on(
    "console",
    (m) => m.type() === "error" && results.errors.push(`${tag} console: ${m.text()}`),
  );
}

/** Wheels the real app's climb to `goal`. */
async function climbTo(p, goal, w, h) {
  const climbT = () =>
    p.$eval(".tree-climb-thumb", (e) => Number(/([\d.e-]+)%/.exec(e.style.top)?.[1] ?? NaN) / 100);
  await p.mouse.move(w / 2, h / 2);
  for (let i = 0; i < 40; i++) {
    const now = await climbT();
    if (Math.abs(now - goal) < 0.01) break;
    await p.mouse.wheel(0, Math.max(-400, Math.min(400, (goal - now) / 0.00055)));
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(1800);
}

const browser = await chromium.launch({
  args: [...GPU, "--disable-gpu-vsync", "--disable-frame-rate-limit"],
  env,
});
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
  if (!/NVIDIA/.test(renderer)) throw new Error("not on the NVIDIA GPU, abort");

  if (ONLY.includes("views") || ONLY.includes("fps")) {
    for (const [mode, query] of [
      ["full", ""],
      ["lite", "?lite=1"],
    ]) {
      const ctx = await browser.newContext(VIEWPORTS.desktop);
      const p = await ctx.newPage();
      watch(p, `viewer-${mode}`);
      await p.goto(`${SITE}qa/vegetation/index.html${query}`);
      await p.waitForFunction(() => window.__vegReady, null, { timeout: 30000 });
      await p.waitForTimeout(800);
      if (ONLY.includes("views")) {
        for (const [name, [pos, look]] of Object.entries(VIEWS)) {
          if (mode === "lite" && !name.startsWith("01")) continue;
          const info = await p.evaluate(([a, b]) => window.__veg.shot(a, b, 4), [pos, look]);
          await p.screenshot({ path: `${OUT}view-${mode}-${name}.png` });
          results.views[`${mode}:${name}`] = info;
        }
      }
      if (ONLY.includes("fps")) {
        const [pos, look] = VIEWS["01-opening"];
        const runs = [];
        for (let i = 0; i < 3; i++) {
          runs.push(await p.evaluate(([a, b]) => window.__veg.fps(4000, a, b), [pos, look]));
        }
        results.fps[mode] = runs;
        console.log("fps", mode, runs.map((r) => r.meanMs.toFixed(2)).join(" "));
      }
      await ctx.close();
    }
  }

  if (ONLY.includes("app")) {
    for (const [vp, opts] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ ...opts, reducedMotion: "no-preference" });
      const p = await ctx.newPage();
      watch(p, `app-${vp}`);
      await p.goto(SITE);
      await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
      await p.waitForTimeout(2500);
      const { width: w, height: h } = opts.viewport;
      for (const t of vp === "desktop" ? [0, 0.2, 0.54, 0.88] : [0, 0.54]) {
        if (t) await climbTo(p, t, w, h);
        await p.mouse.move(w / 2, h / 2);
        await p.waitForTimeout(600);
        await p.screenshot({ path: `${OUT}app-${vp}-t${String(t).replace(".", "")}.png` });
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
  console.log("errors", results.errors.length);
}
