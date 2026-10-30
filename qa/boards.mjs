// Captures every screen of phase 3 boards 11 (desktop) and 12 (mobile) by data-screen-label, GPU only.
// Preview URLs are tokenized and short-lived: pass them through env, never write them to a file.
// Usage: B11=<url> B12=<url> [OUT=dir] node qa/boards.mjs   (default OUT: qa/out/boards/, git-ignored)
// The committed reference set is qa/boards/ref/; refresh it only on purpose with OUT=qa/boards/ref.
// Claude Design's MCP stops on 2026-12-14; after that qa/boards/ref/ is the only copy.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = (process.env.OUT ?? new URL("./out/boards/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  args: [
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=vulkan",
    "--enable-features=Vulkan",
  ],
});
const manifest = [];
try {
  for (const [board, url] of [
    ["11", process.env.B11],
    ["12", process.env.B12],
  ]) {
    if (!url) throw new Error(`B${board} is not set`);
    const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await p.goto(url, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1500);
    const screens = p.locator("[data-screen-label]");
    for (let i = 0; i < (await screens.count()); i++) {
      const s = screens.nth(i);
      const label = await s.getAttribute("data-screen-label");
      const id = label.split(" ")[0];
      await s.scrollIntoViewIfNeeded();
      const file = `board${board}-${id}.png`;
      await s.screenshot({ path: OUT + file });
      manifest.push({ board, id, label, file });
      console.log("captured", file, `"${label}"`);
    }
    await p.close();
  }
} finally {
  await browser.close();
  writeFileSync(
    OUT + "manifest.json",
    JSON.stringify(
      {
        project: "43434ae5-34d9-42b9-8092-ebf912d69c03",
        captured: new Date().toISOString(),
        screens: manifest,
      },
      null,
      2,
    ),
  );
}
