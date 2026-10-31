// Visible-focus check by pixels: compares a band just outside a control, focused vs unfocused, and
// counts the pixels whose colour changes with a contrast of at least 3:1 (WCAG 2.4.13 focus
// appearance). Visible = those pixels cover at least a 1 CSS px ring around the control's perimeter.
// It does not care how the ring is drawn (outline, box-shadow, forced-colors system outline), so a
// transparent outline, a removed ring or a merely vanishing soft shadow fails.
// The background must be static between the two screenshots (shelf, or a frozen page clock).
// `node qa/focus.mjs` runs the self-test.
import { chromium } from "@playwright/test";

const BAND = 8; // CSS px outside the border box that are measured (the M4 ring reaches 7 px)
const MIN_CONTRAST = 3; // focused vs unfocused contrast that makes a pixel part of the indicator
const MIN_COVERAGE = 1; // indicator area / perimeter, in CSS px: at least a 1 px solid ring

/** Focuses `locator` with keyboard modality (Tab from a sentinel just before it). */
async function keyboardFocus(page, locator) {
  await locator.evaluate((el) => {
    const s = document.createElement("span");
    s.tabIndex = 0;
    s.dataset.qaSentinel = "";
    // Out of flow: inside a flex or grid parent an in-flow sentinel would shift the control.
    s.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
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
    s.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    document.body.prepend(s);
    s.focus();
  });
}

/**
 * Measures the focus indicator of `locator`. Returns { visible, coverage, focused, outline, shadow }.
 * `coverage` is the area (CSS px) of band pixels changing by >= 3:1 contrast, divided by the box
 * perimeter: 1 means the equivalent of a 1 px solid ring all around.
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
  const coverage = await page.evaluate(
    async ([off, on, inner, cssWidth, minContrast]) => {
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
      const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      let changed = 0;
      for (let y = 0; y < a.height; y++)
        for (let x = 0; x < a.width; x++) {
          if (x >= inner.x0 * s && x < inner.x1 * s && y >= inner.y0 * s && y < inner.y1 * s)
            continue;
          const i = (y * a.width + x) * 4;
          const [l1, l2] = [lum(a.data, i), lum(b.data, i)];
          if ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) >= minContrast) changed++;
        }
      const perimeter = 2 * (inner.x1 - inner.x0 + inner.y1 - inner.y0);
      return changed / (s * s) / perimeter;
    },
    [off, on, inner, clip.width, MIN_CONTRAST],
  );
  return {
    visible: info.focused && coverage >= MIN_COVERAGE,
    coverage: Number(coverage.toFixed(2)),
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
    { id: "real-ui at device pixel ratio 2", expect: true, ctx: { deviceScaleFactor: 2 } },
    {
      id: "box-shadow-removed at device pixel ratio 2",
      expect: false,
      ctx: { deviceScaleFactor: 2 },
      css: ".tree-overlay :focus-visible { box-shadow: none !important; }",
    },
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
        `${c.id}: expected visible=${c.expect}, got visible=${r.visible} coverage=${r.coverage} outline="${r.outline}"`,
      );
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
}
