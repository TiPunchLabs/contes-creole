// Ti Kannot page turns, frame by frame: the camera glide, the watercolour wash and Ti Kannot's
// flight, from the tale's own cameras in "scène seule", on a fake clock (same frames every run).
// Usage: [SITE=url] [OUT=dir] [TURNS=2,6] [STEP=300] [FRAMES=8] [QA_CHANNEL=chrome] node qa/tk-turn.mjs
// Frames: turn-<from>-<k>.png, k = 0 (before the turn) to FRAMES.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/tk-turn/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const TURNS = (process.env.TURNS ?? "2,6").split(",").map(Number);
const STEP = Number(process.env.STEP ?? 300);
const FRAMES = Number(process.env.FRAMES ?? 8);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.QA_CHANNEL || undefined,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"],
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const renderer = await p.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  console.log("renderer", renderer);
  if (!/NVIDIA/.test(renderer)) throw new Error("not on GPU, abort");
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await p.clock.install({ time: new Date("2026-11-02T12:00:00Z") });
  const wait = (ms) => p.clock.runFor(ms);
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
  await p.click(".reading-toggle");
  await wait(2500);
  let at = 1;
  for (const from of TURNS) {
    while (at < from) {
      await p.keyboard.press("ArrowRight");
      await wait(400);
      at++;
    }
    await wait(7000);
    await p.screenshot({ path: `${OUT}turn-${from}-0.png` });
    await p.keyboard.press("ArrowRight");
    at++;
    for (let k = 1; k <= FRAMES; k++) {
      await wait(STEP);
      await p.screenshot({ path: `${OUT}turn-${from}-${k}.png` });
    }
    console.log("turn", from, "->", from + 1);
  }
  console.log("errors", JSON.stringify(errors));
} finally {
  await browser.close();
}
