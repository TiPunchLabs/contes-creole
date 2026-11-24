// « Mila et le calebassier magique »: framing sweep in the QA viewer (qa/calebassier/, needs `vite`
// dev). Every page is run through its whole action on each screen, and the fruit, faces, hands and
// lantern the lens must keep (`info().subjects`) are checked against the edges of the screen: once
// whole on it they stay whole through the move (a figure may walk in), and all are at the reading frame. The text
// card is not in the viewer: `qa/calebassier.mjs` mode `framing` checks the reading frame against
// the real card. Prints one line per page and screen; exit 1 when a subject is cropped.
// Usage: [SITE=http://127.0.0.1:5199/] [OUT=dir] [STEP=0.25] [VPS=phone,small,...] [QA_CHANNEL=chrome]
//        [QA_ALLOW_CPU=1: accept a software renderer (positions only, no picture is judged)]
//        [QA_SHIFT_LOOK=dx: negative control, slides every subject by dx of the screen width]
//        node qa/calebassier-framing.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { cropped, required, SCREENS } from "./calebassier-subjects.mjs";

const SITE = (process.env.SITE ?? "http://127.0.0.1:5199/").replace(/\/?$/, "/");
const OUT = (process.env.OUT ?? new URL("./out/framing/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const STEP = Number(process.env.STEP ?? 0.25);
const SHIFT = Number(process.env.QA_SHIFT_LOOK ?? 0);
const VPS = (process.env.VPS ?? Object.keys(SCREENS).join(",")).split(",");
const EGL_VENDOR = process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json";
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: GPU,
  channel: process.env.QA_CHANNEL || undefined,
  env: { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: EGL_VENDOR },
});
const results = {};
let failed = 0;
let checks = 0;
try {
  for (const vp of VPS) {
    const context = await browser.newContext(SCREENS[vp]);
    const page = await context.newPage();
    await page.goto(`${SITE}qa/calebassier/index.html`);
    await page.waitForFunction(() => window.__cal, null, { timeout: 30000 });
    await page.evaluate(() => window.__cal.ready.then((api) => void (window.__api = api)));
    const renderer = await page.evaluate(() => {
      const gl = document.querySelector("canvas").getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
    });
    if (!/NVIDIA/i.test(renderer) && !process.env.QA_ALLOW_CPU) {
      throw new Error(`not a GPU renderer: ${renderer}`);
    }
    const { width, height } = SCREENS[vp].viewport;
    const pages = await page.evaluate(() => window.__api.pages);
    results[vp] = { renderer, pages: [] };
    for (let i = 0; i < pages.length; i++) {
      const samples = await page.evaluate(
        async ([index, step]) => {
          const api = window.__api;
          api.seek(index, 0);
          const { seconds } = api.info();
          const out = [];
          const times = [];
          for (let t = 0; t < seconds; t += step) times.push(t);
          times.push(seconds);
          for (const t of times) {
            api.seek(index, t);
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const info = api.info();
            out.push({
              t,
              end: t === seconds,
              hold: info.hold,
              gift: info.gift,
              subjects: info.subjects,
            });
          }
          return out;
        },
        [i, STEP],
      );
      // A figure may walk into the frame; once whole on the screen, what the lens must keep stays
      // whole, and everything required is whole at the reading frame.
      const faults = new Map();
      const whole = new Set();
      for (const sample of samples) {
        for (const name of required(pages[i], sample)) {
          const s = sample.subjects[name];
          const why = cropped(s && { ...s, x: s.x + SHIFT }, width, height);
          if (!why) whole.add(name);
          else if ((sample.end || whole.has(name)) && !faults.has(name)) {
            faults.set(
              name,
              `${name} ${why} at ${sample.t.toFixed(2)} s${sample.end ? " (reading frame)" : ""}`,
            );
          }
        }
      }
      checks++;
      if (faults.size) failed++;
      results[vp].pages.push({ page: pages[i], faults: [...faults.values()], end: samples.at(-1) });
      console.log(
        `${faults.size ? "FAIL" : "PASS"} framing-sweep/${vp}-${pages[i]} ${samples.length} instants${faults.size ? `: ${[...faults.values()].join("; ")}` : ""}`,
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
console.log(`\n${checks - failed}/${checks} PASS`);
process.exit(failed ? 1 : 0);
