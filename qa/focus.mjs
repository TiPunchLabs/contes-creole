// Visible-focus check by pixels: compares a thin band just outside a control, focused vs unfocused.
// It does not care how the ring is drawn (outline, box-shadow, forced-colors system outline), so a
// transparent outline or a removed box-shadow fails. `node qa/focus.mjs` runs the self-test.
import { chromium } from "@playwright/test";

const BAND = 6; // px outside the border box that a visible ring must cover
const MIN_CHANGED = 0.3; // share of band pixels that must change
const DELTA = 40; // per-channel difference that counts as a change

/** Focuses `locator` with keyboard modality (Tab from a sentinel just before it). */
async function keyboardFocus(page, locator) {
  await locator.evaluate((el) => {
    const s = document.createElement("span");
    s.tabIndex = 0;
    s.dataset.qaSentinel = "";
    el.before(s);
    s.focus();
  });
  await page.keyboard.press("Tab");
  await page.evaluate(() => document.querySelector("[data-qa-sentinel]")?.remove());
}

/** Moves focus away without keyboard modality, so no :focus-visible ring remains on `locator`. */
async function unfocus(page) {
  await page.evaluate(() => {
    const s = document.createElement("span");
    s.tabIndex = -1;
    s.dataset.qaSentinel = "";
    document.body.prepend(s);
    s.focus();
  });
}

/**
 * Measures the focus indicator of `locator`. Returns { visible, changed, focused, outline, shadow }.
 * `changed` is the share of pixels in the BAND-wide ring around the box that differ focused vs not.
 */
export async function focusIndicator(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const vp = page.viewportSize();
  const clip = {
    x: Math.max(0, Math.floor(box.x) - BAND),
    y: Math.max(0, Math.floor(box.y) - BAND),
  };
  clip.width = Math.min(vp.width, Math.ceil(box.x + box.width) + BAND) - clip.x;
  clip.height = Math.min(vp.height, Math.ceil(box.y + box.height) + BAND) - clip.y;

  await unfocus(page);
  await page.waitForTimeout(150);
  const off = (await page.screenshot({ clip })).toString("base64");
  await keyboardFocus(page, locator);
  await page.waitForTimeout(150);
  const info = await locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      focused: el.matches(":focus-visible"),
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      shadow: cs.boxShadow,
    };
  });
  const on = (await page.screenshot({ clip })).toString("base64");

  // Band = clip minus the element's own border box (clip coordinates, scaled to device pixels).
  const inner = {
    x0: box.x - clip.x,
    y0: box.y - clip.y,
    x1: box.x - clip.x + box.width,
    y1: box.y - clip.y + box.height,
  };
  const share = await page.evaluate(
    async ([off, on, inner, cssWidth, delta]) => {
      const decode = async (b64) => {
        const bitmap = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${b64}`)).blob(),
        );
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      };
      const [a, b] = await Promise.all([decode(off), decode(on)]);
      const s = a.width / cssWidth;
      let band = 0;
      let changed = 0;
      for (let y = 0; y < a.height; y++)
        for (let x = 0; x < a.width; x++) {
          if (x >= inner.x0 * s && x < inner.x1 * s && y >= inner.y0 * s && y < inner.y1 * s)
            continue;
          band++;
          const i = (y * a.width + x) * 4;
          const d = Math.max(
            Math.abs(a.data[i] - b.data[i]),
            Math.abs(a.data[i + 1] - b.data[i + 1]),
            Math.abs(a.data[i + 2] - b.data[i + 2]),
          );
          if (d > delta) changed++;
        }
      return band ? changed / band : 0;
    },
    [off, on, inner, clip.width, DELTA],
  );
  return {
    visible: info.focused && share >= MIN_CHANGED,
    changed: Number(share.toFixed(3)),
    ...info,
  };
}

// ---------- Self-test: the check must pass on the real UI and fail when the ring is removed ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const SITE = process.env.SITE ?? "http://localhost:4199/";
  const browser = await chromium.launch({
    args: [
      "--enable-gpu",
      "--ignore-gpu-blocklist",
      "--use-angle=vulkan",
      "--enable-features=Vulkan",
    ],
  });
  const cases = [
    { id: "real-ui", expect: true },
    { id: "forced-colors", expect: true, ctx: { forcedColors: "active" } },
    {
      id: "box-shadow-removed (transparent outline left)",
      expect: false,
      css: ".tree-overlay :focus-visible { box-shadow: none !important; }",
    },
    {
      id: "all-indicators-removed",
      expect: false,
      css: ".tree-overlay :focus-visible { box-shadow: none !important; outline: none !important; }",
    },
    {
      id: "forced-colors + outline removed",
      expect: false,
      ctx: { forcedColors: "active" },
      css: ".tree-overlay :focus-visible { outline: none !important; }",
    },
  ];
  let bad = 0;
  try {
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...c.ctx });
      const p = await ctx.newPage();
      await p.goto(SITE);
      await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
      await p.waitForTimeout(1200);
      if (c.css) await p.addStyleTag({ content: c.css });
      const r = await focusIndicator(p, p.locator(".tree-shelf-book").nth(1));
      const ok = r.visible === c.expect;
      if (!ok) bad++;
      console.log(
        ok ? "PASS" : "FAIL",
        `${c.id}: expected visible=${c.expect}, got visible=${r.visible} changed=${r.changed} outline="${r.outline}"`,
      );
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
}
