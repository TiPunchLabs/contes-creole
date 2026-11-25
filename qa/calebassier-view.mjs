// « Mila et le calebassier magique » through its QA viewer (qa/calebassier/, needs `vite` dev):
// stills of chosen pages at chosen instants, per viewport, painted or graybox. No assertions.
// Usage: [SITE=http://127.0.0.1:5199/] [OUT=dir] [PAGES=1,3] [T=end|2.5,6] [VPS=desktop,mobile]
//        [GRAYBOX=1] [SLATE=1] [CARD=0] [SHEET=1] [QA_CHANNEL=chrome] node qa/calebassier-view.mjs
// SHEET=1 also writes a contact sheet per viewport (ImageMagick `montage`).
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const SITE = (process.env.SITE ?? "http://127.0.0.1:5199/").replace(/\/?$/, "/");
const OUT = (process.env.OUT ?? new URL("./out/calebassier/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const PAGES = (process.env.PAGES ?? "1,2,3,4,5,6,7,8,9,10,11,12").split(",").map(Number);
const TIMES = (process.env.T ?? "end").split(",");
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
  small: {
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
// The tree card's cover window is 468 x 411: `cover` frames a page in those proportions.
VIEWPORTS.cover = { viewport: { width: 1140, height: 1001 }, deviceScaleFactor: 1 };
const VPS = (process.env.VPS ?? "desktop").split(",");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: GPU,
  channel: process.env.QA_CHANNEL || undefined,
  env: { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: EGL_VENDOR },
});
try {
  for (const vp of VPS) {
    const context = await browser.newContext(VIEWPORTS[vp]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
    const query = [
      process.env.GRAYBOX === "1" ? "graybox=1" : "",
      process.env.SLATE === "1" ? "slate=1" : "",
      process.env.CARD === "0" ? "card=0" : "",
    ]
      .filter(Boolean)
      .join("&");
    await page.goto(`${SITE}qa/calebassier/index.html?${query}`);
    await page.waitForFunction(() => window.__cal, null, { timeout: 30000 });
    const failed = await page.evaluate(() =>
      window.__cal.ready.then(
        (api) => void (window.__api = api),
        (err) => String(err),
      ),
    );
    if (failed) throw new Error(`viewer failed to mount: ${failed}\n${errors.join("\n")}`);
    const renderer = await page.evaluate(() => {
      const gl = document.querySelector("canvas").getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
    });
    if (!/NVIDIA/i.test(renderer)) throw new Error(`not a GPU renderer: ${renderer}`);
    const files = [];
    for (const n of PAGES) {
      for (const t of TIMES) {
        await page.evaluate(
          ([i, s]) => window.__api.seek(i, s),
          [n - 1, t === "end" ? 1e3 : Number(t)],
        );
        await page.waitForTimeout(160);
        const name = `${vp}-p${String(n).padStart(2, "0")}${t === "end" ? "" : `-t${t}`}.png`;
        await page.screenshot({ path: OUT + name });
        files.push(OUT + name);
      }
    }
    const info = await page.evaluate(() => window.__api.info());
    console.log(vp, renderer, JSON.stringify(info), errors.length ? errors : "no console errors");
    if (process.env.SHEET === "1") {
      const tile = vp === "desktop" ? "4x" : "6x";
      execFileSync("montage", [
        ...files,
        "-tile",
        tile,
        "-geometry",
        vp === "desktop" ? "720x450+4+4" : "260x563+4+4",
        `${OUT}sheet-${vp}.jpg`,
      ]);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
