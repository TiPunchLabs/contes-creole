// Ti Kannot's reading in the scene (TKR) on the GPU: every page in Kréyòl and French, captured once
// settled and once mid-glide, with the text box, the controls and the overlap between them.
// Usage: [SITE=url] [OUT=dir] [VPS=desktop,mobile,narrow] [LANGS=gcf,fr] [QA_INJECT_CSS=css] node qa/tk-reading.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/tk-reading/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
mkdirSync(OUT, { recursive: true });
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const GPU_ENV = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};
const touchVp = (width, height) => ({
  viewport: { width, height },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  laptop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  tablet: touchVp(820, 1180),
  mobile: touchVp(390, 844),
  narrow: touchVp(320, 568),
  landscape: touchVp(844, 390),
};
const VPS = (process.env.VPS ?? "desktop,mobile,narrow").split(",");
const LANGS = (process.env.LANGS ?? "gcf,fr").split(",");
const results = { site: SITE, pages: [], checks: [] };

/** Records one check; `pass` false fails the run. */
function check(run, name, pass, detail = "") {
  results.checks.push({ run, name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${run} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Layout of the reading UI: text box, its scroll state, controls, and their overlaps. */
const layout = (p) =>
  p.evaluate(() => {
    const r = (el) => {
      if (!el || el.hidden) return null;
      const b = el.getBoundingClientRect();
      return b.width && b.height ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
    };
    const card = document.querySelector(".reading-card");
    const cs = card ? getComputedStyle(card) : null;
    const controls = [
      ...document.querySelectorAll(
        ".reading-back, .reading-langs, .reading-arrows, .tk-sound, .reading-hint:not([hidden])",
      ),
    ]
      .map((el) => ({ cls: el.className.split(" ")[0], box: r(el) }))
      .filter((c) => c.box);
    const box = r(card);
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    return {
      card: box,
      title: document.querySelector(".reading-title")?.textContent,
      count: document.querySelector(".reading-count")?.textContent,
      scroll: card
        ? { sh: card.scrollHeight, ch: card.clientHeight, overflow: cs.overflowY }
        : null,
      background: cs ? cs.backgroundImage + " | " + cs.backgroundColor : null,
      panel: cs
        ? cs.backgroundImage !== "none" ||
          !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) ||
          cs.borderTopStyle !== "none" ||
          cs.boxShadow !== "none"
        : true,
      overlaps: box ? controls.filter((c) => hit(box, c.box)).map((c) => c.cls) : [],
      inside: box
        ? box.x >= 0 && box.y >= 0 && box.x + box.w <= innerWidth && box.y + box.h <= innerHeight
        : false,
    };
  });

/**
 * Scrolls the text of a long passage to its end, one gesture at a time, stopping there: wheel over
 * it with a mouse, a real touch swipe (CDP touch events) on touch screens. Reports whether its end
 * was reached and the page counter.
 */
async function scrollToEnd(p, touch) {
  const b = await p.locator(".reading-card").boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height * 0.6;
  const cdp = touch ? await p.context().newCDPSession(p) : null;
  for (let k = 0; k < 12; k++) {
    if (touch) {
      const pt = (yy) => [{ x, y: yy }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(y) });
      for (let s = 1; s <= 6; s++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: pt(y - s * 12),
        });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await p.mouse.move(x, y);
      await p.mouse.wheel(0, 80);
    }
    await p.waitForTimeout(150);
    const done = await p.evaluate(() => {
      const c = document.querySelector(".reading-card");
      return c.scrollTop + c.clientHeight >= c.scrollHeight - 2;
    });
    if (done) break;
  }
  await p.waitForTimeout(400);
  return p.evaluate(() => {
    const c = document.querySelector(".reading-card");
    return {
      atEnd: c.scrollTop + c.clientHeight >= c.scrollHeight - 2,
      scrollTop: Math.round(c.scrollTop),
      count: document.querySelector(".reading-count")?.textContent,
    };
  });
}

async function run(browser, vp) {
  const ctx = await browser.newContext(VIEWPORTS[vp]);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  await p.goto(SITE);
  if (process.env.QA_INJECT_CSS) await p.addStyleTag({ content: process.env.QA_INJECT_CSS });
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  await p.waitForTimeout(1500);
  const touch = Boolean(VIEWPORTS[vp].hasTouch);
  const press = (loc) => (touch ? loc.tap() : loc.click());
  const shelf = p.locator(".tree-shelf-book").nth(0);
  await press(shelf);
  await p.waitForTimeout(3000);
  await press(shelf);
  await p.waitForSelector(".reading:not([hidden]) .reading-card", { timeout: 25000 });
  await p.waitForTimeout(3500);
  for (const lang of LANGS) {
    await press(p.locator(`.reading-langs button[data-lang="${lang}"]`));
    await p.waitForTimeout(600);
    for (let i = 1; i <= 12; i++) {
      if (i > 1) {
        await press(p.locator(".reading-next"));
        // Mid-glide: the camera is between two shots.
        await p.waitForTimeout(900);
        await p.screenshot({
          path: `${OUT}${vp}-${lang}-p${String(i).padStart(2, "0")}-glide.png`,
        });
        await p.waitForTimeout(2600);
      }
      const l = await layout(p);
      results.pages.push({ vp, lang, page: i, ...l });
      await p.screenshot({ path: `${OUT}${vp}-${lang}-p${String(i).padStart(2, "0")}.png` });
      check(`${vp}.${lang}.p${i}`, "no-panel-behind-text", !l.panel, l.background);
      if (l.scroll && l.scroll.sh > l.scroll.ch + 2) {
        const end = await scrollToEnd(p, touch);
        check(
          `${vp}.${lang}.p${i}`,
          "long-passage-reaches-end-without-page-turn",
          end.atEnd && end.count === l.count,
          JSON.stringify(end),
        );
        await p.screenshot({
          path: `${OUT}${vp}-${lang}-p${String(i).padStart(2, "0")}-scrolled.png`,
        });
      }
      check(`${vp}.${lang}.p${i}`, "text-inside-screen", l.inside, JSON.stringify(l.card));
      check(
        `${vp}.${lang}.p${i}`,
        "text-clear-of-controls",
        l.overlaps.length === 0,
        l.overlaps.join(),
      );
    }
    // Back to page 1 for the next language.
    for (let i = 1; i < 12; i++) {
      await press(p.locator(".reading-prev"));
      await p.waitForTimeout(250);
    }
    await p.waitForTimeout(3000);
  }
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.querySelector(".app")?.dataset.book, null, {
    timeout: 15000,
  });
  check(vp, "back-to-tree", true);
  check(vp, "no-console-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

const browser = await chromium.launch({ args: GPU, env: GPU_ENV });
try {
  const probe = await browser.newPage();
  const renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  await probe.close();
  results.renderer = renderer;
  if (!/nvidia/i.test(renderer)) throw new Error(`not on the NVIDIA GPU: ${renderer}`);
  console.log(`renderer: ${renderer}`);
  for (const vp of VPS) await run(browser, vp);
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
}
const failed = results.checks.filter((c) => !c.pass);
console.log(`${results.checks.length - failed.length}/${results.checks.length} PASS`);
process.exit(failed.length ? 1 : 0);
