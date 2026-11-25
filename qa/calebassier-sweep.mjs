// « Mila et le calebassier magique »: sweep of every page through its whole action in the QA viewer
// (qa/calebassier/, needs `vite` dev), for defects a still cannot show: an arm inside the clothes
// (`info().arms`, metres; clear at 0 or less), more than one hero calabash, a foot through the
// ground, inside a root or another solid of the set, or up in the dress, a planted foot that slides. Prints, per page and viewport, the worst
// of each and the instant it happens; exit 1 over the limits.
// Usage: [SITE=http://127.0.0.1:5199/] [OUT=dir] [STEP=0.1] [TOL=0.018] [VPS=desktop,mobile]
//        [STRIPS=1,3,4,5,9,10,11,12] [QA_CHANNEL=chrome] node qa/calebassier-sweep.mjs
// STRIPS also writes a frame strip (8 instants) of those pages per viewport (ImageMagick `montage`).
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = (process.env.SITE ?? "http://127.0.0.1:5199/").replace(/\/?$/, "/");
const OUT = (process.env.OUT ?? new URL("./out/sweep/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const STEP = Number(process.env.STEP ?? 0.1);
// Depth is measured against the clothes plus 40 mm (a forearm is 20 mm thick from its axis): at
// 18 mm the arm's surface is still 2 mm outside the cloth.
const TOL = Number(process.env.TOL ?? 0.018);
// Feet (`info().feet`): no shoe under the ground (GROUND, metres), none up in the dress on open
// ground (HEM: each figure's hem less 3 cm), and for a figure who walks on planted feet (PLANTED) a foot lying flat on
// the ground does not move more than SLIDE between two instants while she keeps her heading.
const GROUND = Number(process.env.GROUND ?? -0.003);
const HEM = { mila: 0.425, ninon: 0.27 };
const PLANTED = ["mila", "ninon"];
// Any vertex of a shoe more than SUNK (metres) under the surface of a root, a step or any other
// solid of the set is a fault: the whole shoe is tested, not the place under the ankle.
const SUNK = Number(process.env.SUNK ?? 0.004);
const SLIDE = Number(process.env.SLIDE ?? 0.01);
const STRIPS = (process.env.STRIPS ?? "").split(",").filter(Boolean).map(Number);
const EGL_VENDOR = process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json";
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
const VPS = (process.env.VPS ?? "desktop,mobile").split(",");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: GPU,
  channel: process.env.QA_CHANNEL || undefined,
  env: { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: EGL_VENDOR },
});
const results = {};
let failed = false;
try {
  for (const vp of VPS) {
    const context = await browser.newContext(VIEWPORTS[vp]);
    const page = await context.newPage();
    await page.goto(`${SITE}qa/calebassier/index.html`);
    await page.waitForFunction(() => window.__cal, null, { timeout: 30000 });
    await page.evaluate(() => window.__cal.ready.then((api) => void (window.__api = api)));
    const renderer = await page.evaluate(() => {
      const gl = document.querySelector("canvas").getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
    });
    if (!/NVIDIA/i.test(renderer)) throw new Error(`not a GPU renderer: ${renderer}`);
    const pages = await page.evaluate(() => window.__api.pages);
    results[vp] = [];
    for (let i = 0; i < pages.length; i++) {
      // The whole sweep of a page runs in the page: one frame per instant, read after it is drawn.
      const worst = await page.evaluate(
        async ([index, step]) => {
          const api = window.__api;
          api.seek(index, 0);
          const { seconds } = api.info();
          const out = { mila: [-1, 0], ninon: [-1, 0], heroes: 0, samples: 0, feet: {} };
          let before = null;
          for (let t = 0; t <= seconds + 1e-6; t += step) {
            api.seek(index, t);
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const info = api.info();
            out.samples++;
            out.heroes = Math.max(out.heroes, info.heroCount);
            for (const who of ["mila", "ninon"]) {
              const depth = info.arms[who];
              if (depth !== null && depth > out[who][0]) out[who] = [depth, t];
            }
            // Feet: lowest and highest point over the page, and how far a foot that lies flat on
            // the ground moves between two instants while she does not turn (a slide).
            for (const [who, feet] of Object.entries(info.feet ?? {})) {
              const f = (out.feet[who] ??= {
                low: [1, 0],
                top: [0, 0],
                slide: [0, 0],
                sunk: [-1, 0, 0, 0, 0],
              });
              feet.forEach((foot, k) => {
                if (foot.low < f.low[0]) f.low = [foot.low, t];
                // A root, a step or a wall under any vertex of the shoe (`over`), and how far the
                // deepest vertex of the shoe is below that solid's surface (`sunk`): measured in the
                // world on the shoe's own meshes, heel, toe and sides included.
                const sunk = (foot.over ?? 0) > 0.03 ? foot.sunk : -1;
                if (sunk > f.sunk[0]) f.sunk = [sunk, t, foot.over, foot.ankle ?? 0, foot.low];
                // A foot lifted over a root or onto a step, or still beside the one it is stepping
                // over (`near`), is under the skirt, as it should be: the dress check is for open
                // ground, where nothing calls for a foot that high.
                if (!((foot.near ?? foot.over ?? 0) > 0.03) && foot.top > f.top[0])
                  f.top = [foot.top, t];
                const was = before?.[who]?.[k];
                const flat = (g) => g.low < 0.005 && Math.abs(g.pitch) < 0.03;
                if (was && flat(foot) && flat(was) && Math.abs(foot.yaw - was.yaw) < 0.002) {
                  const moved = Math.hypot(foot.x - was.x, foot.z - was.z);
                  if (moved > f.slide[0]) f.slide = [moved, t];
                }
              });
            }
            before = info.feet ?? null;
          }
          return out;
        },
        [i, STEP],
      );
      const row = { page: pages[i], ...worst };
      results[vp].push(row);
      const feetBad = Object.entries(worst.feet).some(
        ([who, f]) =>
          f.low[0] < GROUND ||
          f.top[0] > HEM[who] ||
          f.sunk[0] > SUNK ||
          (PLANTED.includes(who) && f.slide[0] > SLIDE),
      );
      const bad = worst.mila[0] > TOL || worst.ninon[0] > TOL || worst.heroes !== 1 || feetBad;
      failed ||= bad;
      const fmt = ([d, t]) =>
        d === -1 ? "absent" : `${(d * 1000).toFixed(1)} mm at ${t.toFixed(1)} s`;
      console.log(
        `${bad ? "FAIL" : "PASS"} ${vp} ${pages[i]} arms: Mila ${fmt(worst.mila)}, Man Ninon ${fmt(worst.ninon)}; hero calabashes ${worst.heroes}; ${worst.samples} instants${Object.entries(
          worst.feet,
        )
          .map(
            ([who, f]) =>
              `; ${who} feet lowest ${(f.low[0] * 1000).toFixed(1)} mm at ${f.low[1].toFixed(1)} s, highest ${(f.top[0] * 1000).toFixed(0)} mm, flat-foot slide ${(f.slide[0] * 1000).toFixed(1)} mm at ${f.slide[1].toFixed(1)} s, ${
                f.sunk[0] === -1
                  ? "never over a solid"
                  : f.sunk[0] > 0
                    ? `deepest in a solid ${(f.sunk[0] * 1000).toFixed(1)} mm at ${f.sunk[1].toFixed(1)} s (solid ${(f.sunk[2] * 1000).toFixed(0)} mm high; under the ankle alone ${(f.sunk[3] * 1000).toFixed(0)} mm, shoe's lowest point ${(f.sunk[4] * 1000).toFixed(0)} mm)`
                    : `closest to a solid ${(-f.sunk[0] * 1000).toFixed(1)} mm clear at ${f.sunk[1].toFixed(1)} s (solid ${(f.sunk[2] * 1000).toFixed(0)} mm high)`
              }`,
          )
          .join("")}`,
      );
      if (STRIPS.includes(i + 1)) {
        const seconds = await page.evaluate(() => window.__api.info().seconds);
        const files = [];
        for (let k = 0; k < 8; k++) {
          await page.evaluate(([n, s]) => window.__api.seek(n, s), [i, (seconds * k) / 7]);
          await page.waitForTimeout(140);
          const file = `${OUT}${vp}-${pages[i]}-${k}.png`;
          await page.screenshot({ path: file });
          files.push(file);
        }
        const geometry = vp === "desktop" ? "480x300+2+2" : "195x422+2+2";
        execFileSync("montage", [
          ...files,
          "-tile",
          "8x",
          "-geometry",
          geometry,
          `${OUT}strip-${vp}-${pages[i]}.jpg`,
        ]);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
process.exit(failed ? 1 : 0);
