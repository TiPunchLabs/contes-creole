// Side-by-side board-vs-build sheets (board left, build right), composed in a page and screenshotted.
// Usage: node qa/compare.mjs <OUT_DIR> D1=<impl.png> M2=<impl.png> ...
//   IDs come from qa/boards/ref/manifest.json (D1..D8 desktop, M1..M8 mobile).
// Sheets are 900 px high for desktop screens and 844 px for mobile, plus a 40 px caption row.
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const REF = new URL("./boards/ref/", import.meta.url).pathname;
const [outArg, ...pairs] = process.argv.slice(2);
if (!outArg || pairs.length === 0) {
  console.error("usage: node qa/compare.mjs <OUT_DIR> ID=<impl.png> [ID=<impl.png> ...]");
  process.exit(2);
}
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(readFileSync(join(REF, "manifest.json"), "utf8"));
const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;

const browser = await chromium.launch({
  args: [
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=vulkan",
    "--enable-features=Vulkan",
  ],
});
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  for (const pair of pairs) {
    const [id, impl] = pair.split(/=(.*)/s);
    const entry = manifest.screens.find((s) => s.id === id);
    if (!entry) throw new Error(`unknown board screen ${id}`);
    const height = id.startsWith("D") ? 900 : 844;
    await page.setContent(`<style>
        body { margin: 0; background: #fff; font: 13px sans-serif; }
        .row { display: inline-flex; gap: 20px; }
        figure { margin: 0; }
        figcaption { height: 40px; line-height: 30px; padding-left: 8px; }
        img { height: ${height}px; display: block; }
      </style>
      <div class="row">
        <figure><figcaption>${entry.label} - board ${entry.board} (left)</figcaption><img src="${dataUrl(join(REF, entry.file))}"></figure>
        <figure><figcaption>build: ${basename(impl)} (right)</figcaption><img src="${dataUrl(resolve(impl))}"></figure>
      </div>`);
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    const file = join(out, `compare-${id}.png`);
    await page.locator(".row").screenshot({ path: file });
    console.log("wrote", file);
  }
} finally {
  await browser.close();
}
