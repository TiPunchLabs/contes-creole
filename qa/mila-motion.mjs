// Mila in motion: frame sequences a still image cannot show. Walks the tale on the GPU and captures
// every page once settled, the walks 3 -> 4 and 4 -> 5 (Mila around the rock, her arms while
// walking) and the turtle on page 7 over one full lap (heading on its turns). Sheets are assembled
// with ImageMagick `montage` when it is installed.
// Usage: [SITE=url] [OUT=dir] [VP=desktop,mobile] [LAP=40] node qa/mila-motion.mjs
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/mila-motion/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const VPS = (process.env.VP ?? "desktop,mobile").split(",");
const LAP_S = Number(process.env.LAP ?? 40);
mkdirSync(OUT, { recursive: true });
// same launch as qa/mila.mjs: ANGLE on EGL with the NVIDIA EGL vendor pinned (never llvmpipe)
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
const log = { site: SITE, renderer: null, runs: {} };

const pad = (n) => String(n).padStart(2, "0");
const press = (loc, touch) => (touch ? loc.tap() : loc.click());

/** Assembles captures into one sheet (ImageMagick), labelled with their file names. */
function sheet(files, out, tile) {
  try {
    execFileSync("montage", [
      ...files,
      "-tile",
      tile,
      "-geometry",
      "+4+4",
      "-resize",
      "480x",
      "-label",
      "%f",
      out,
    ]);
  } catch (err) {
    console.warn(`montage skipped: ${String(err).split("\n")[0]}`);
  }
}

/** Waits until another page's text is shown after pressing "Continuer". */
async function next(p, touch) {
  const before = await p.locator(".mila-num").textContent();
  await press(p.locator(".mila-next"), touch);
  await p.waitForFunction(
    (b) =>
      document.querySelector(".mila-story")?.classList.contains("is-on") &&
      document.querySelector(".mila-num")?.textContent !== b,
    before,
    { timeout: 25000, polling: 50 },
  );
}

/** Captures `n` frames `ms` apart while a transition plays. */
async function frames(p, name, n, ms) {
  const files = [];
  for (let i = 0; i < n; i++) {
    const f = `${OUT}${name}-${pad(i)}.png`;
    await p.screenshot({ path: f });
    files.push(f);
    await p.waitForTimeout(ms);
  }
  return files;
}

/** Taps the visible scene until the crab's three pieces of debris are gone (page 5). */
async function freeCrab(p, touch) {
  const { width, height } = p.viewportSize();
  for (let y = height * 0.15; y < height * 0.85; y += 22) {
    for (let x = 10; x < width - 10; x += 22) {
      const onScene = await p.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.classList.contains("mila-gl"),
        [x, y],
      );
      if (!onScene) continue;
      if (touch) await p.touchscreen.tap(x, y);
      else await p.mouse.click(x, y);
      if (await p.locator(".mila-hint").isHidden()) return true;
    }
  }
  return false;
}

async function run(browser, vp) {
  const touch = vp !== "desktop";
  const ctx = await browser.newContext(VIEWPORTS[vp]);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  const renderer = await p.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  log.renderer = renderer;
  console.log(`${vp}: renderer ${renderer}`);
  if (!/NVIDIA/i.test(renderer)) throw new Error("no NVIDIA renderer, refusing to run on the CPU");
  await p.waitForTimeout(1500);
  const shelf = p.locator(".tree-shelf-book").nth(1);
  await press(shelf, touch);
  await p.waitForTimeout(2800);
  await press(shelf, touch);
  await p.waitForFunction(
    () => document.querySelector(".mila-num")?.textContent === "Page 01",
    null,
    {
      timeout: 25000,
    },
  );
  const settled = [];
  const shoot = async (i) => {
    await p.waitForTimeout(2500);
    const f = `${OUT}${vp}-p${pad(i)}.png`;
    await p.screenshot({ path: f });
    settled.push(f);
  };
  await shoot(1);
  await next(p, touch);
  await shoot(2);
  // 3 -> 4 and 4 -> 5: Mila walks (8.5 s and 10 s flights)
  await next(p, touch);
  await shoot(3);
  await press(p.locator(".mila-next"), touch);
  const walk34 = await frames(p, `${vp}-t34`, 20, 500);
  await p.waitForFunction(() => document.querySelector(".mila-num")?.textContent === "Page 04");
  await shoot(4);
  await press(p.locator(".mila-next"), touch);
  const walk45 = await frames(p, `${vp}-t45`, 20, 400);
  await p.waitForFunction(() => document.querySelector(".mila-num")?.textContent === "Page 05");
  await shoot(5);
  const freed = await freeCrab(p, touch);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}${vp}-p05-freed.png` });
  await next(p, touch);
  await shoot(6);
  await next(p, touch);
  await shoot(7);
  // one turtle lap on page 7 (it circles the meadow in about 39 s)
  const n = Math.max(2, Math.round(LAP_S / 2));
  const turtle = await frames(p, `${vp}-p07-turtle`, n, 2000);
  for (let i = 8; i <= 12; i++) {
    await next(p, touch);
    await shoot(i);
  }
  sheet(settled, `${OUT}${vp}-sheet-pages.png`, "4x");
  sheet(walk34, `${OUT}${vp}-sheet-t34.png`, "5x");
  sheet(walk45, `${OUT}${vp}-sheet-t45.png`, "5x");
  sheet(turtle, `${OUT}${vp}-sheet-turtle.png`, "5x");
  log.runs[vp] = { renderer, crabFreed: freed, errors };
  await ctx.close();
}

const browser = await chromium.launch({ args: GPU, env: GPU_ENV });
try {
  for (const vp of VPS) await run(browser, vp);
} finally {
  await browser.close();
  writeFileSync(`${OUT}motion.json`, JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
}
