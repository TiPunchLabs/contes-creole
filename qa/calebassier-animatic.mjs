// Silent animatic of « Mila et le calebassier magique » from the web engine (QA viewer, `vite` dev):
// each page's action sampled on its own clock, with a slate (page id, instant, title), encoded as a
// low-resolution mp4 (ffmpeg). Timings are indicative: in the tale the reader turns the pages.
// Usage: [SITE=http://127.0.0.1:5199/] [OUT=dir] [VPS=desktop,mobile] [FPS=6] [GRAYBOX=1]
//        [HOLD=1.5] [PAGES=3,11] [QA_CHANNEL=chrome] node qa/calebassier-animatic.mjs
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const SITE = (process.env.SITE ?? "http://127.0.0.1:5199/").replace(/\/?$/, "/");
const OUT = (process.env.OUT ?? new URL("./out/animatic/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const FPS = Number(process.env.FPS ?? 6);
const HOLD = Number(process.env.HOLD ?? 1.5);
const GRAYBOX = process.env.GRAYBOX === "1";
/** PAGES=3,11 keeps only some pages (1-based): a gesture clip instead of the whole tale. */
const ONLY = process.env.PAGES?.split(",").map(Number);
const EGL_VENDOR = process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json";
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const VIEWPORTS = {
  desktop: { viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
};
const VPS = (process.env.VPS ?? "desktop,mobile").split(",");

const browser = await chromium.launch({
  args: GPU,
  channel: process.env.QA_CHANNEL || undefined,
  env: { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: EGL_VENDOR },
});
try {
  for (const vp of VPS) {
    const dir = `${OUT}${vp}${GRAYBOX ? "-graybox" : ""}/`;
    mkdirSync(dir, { recursive: true });
    const context = await browser.newContext(VIEWPORTS[vp]);
    const page = await context.newPage();
    await page.goto(`${SITE}qa/calebassier/index.html?slate=1${GRAYBOX ? "&graybox=1" : ""}`);
    await page.waitForFunction(() => window.__cal, null, { timeout: 30000 });
    await page.evaluate(() => window.__cal.ready.then((api) => void (window.__api = api)));
    const pages = await page.evaluate(() => window.__api.pages);
    let frame = 0;
    for (let i = 0; i < pages.length; i++) {
      if (ONLY && !ONLY.includes(i + 1)) continue;
      await page.evaluate((n) => window.__api.seek(n, 0), i);
      const seconds = await page.evaluate(() => window.__api.info().seconds);
      for (let t = 0; t <= seconds + HOLD; t += 1 / FPS) {
        await page.evaluate(([n, s]) => window.__api.seek(n, s), [i, t]);
        await page.waitForTimeout(40);
        await page.screenshot({
          path: `${dir}f${String(frame++).padStart(5, "0")}.jpg`,
          type: "jpeg",
          quality: 80,
        });
      }
    }
    await context.close();
    const video = `${OUT}animatic-${vp}${GRAYBOX ? "-graybox" : ""}.mp4`;
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(FPS),
      "-i",
      `${dir}f%05d.jpg`,
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "30",
      "-an",
      video,
    ]);
    console.log(vp, frame, "frames ->", video);
  }
} finally {
  await browser.close();
}
