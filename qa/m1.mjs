// M1 baseline: 4 critical journeys + reference screenshots, GPU Chromium only.
import { chromium } from "@playwright/test";
const SITE = process.env.SITE ?? "http://localhost:4199/";
// OUT: evidence folder (default qa/out/m1/, git-ignored); point it at the mission evidence folder.
const OUT = (process.env.OUT ?? new URL("./out/m1/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
import { mkdirSync } from "node:fs";
import { focusIndicator } from "./focus.mjs";
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (id, ok, detail = "") => {
  results.push({ id, status: ok ? "PASS" : "FAIL", detail });
  console.log(ok ? "PASS" : "FAIL", id, detail);
};
const browser = await chromium.launch({
  args: [
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=vulkan",
    "--enable-features=Vulkan",
  ],
});

async function open(ctxOpts, query = "") {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on(
    "console",
    (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push("console: " + m.text()),
  );
  p.on("response", (r) => r.status() >= 400 && errors.push(`http ${r.status()} ${r.url()}`));
  await p.goto(SITE + query);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  // Negative-control hook: QA_INJECT_CSS breaks the page on purpose to prove a check can fail.
  if (process.env.QA_INJECT_CSS) await p.addStyleTag({ content: process.env.QA_INJECT_CSS });
  await wait(1200);
  return { ctx, p, errors };
}
const thumbTop = (p) => p.$eval(".tree-climb-thumb", (e) => e.getBoundingClientRect().top);
const bubbleShown = (p) =>
  p.$eval(".app-bubble", (e) => (e.style.opacity === "1" ? e.textContent : ""));

/** Moves the mouse over a grid until the Konteur bubble shows; returns the point. */
async function findKonteur(p, w, h) {
  for (let y = Math.round(h * 0.95); y > h * 0.45; y -= 24)
    for (let x = 8; x < w * 0.98; x += 24) {
      await p.mouse.move(x, y);
      await wait(25);
      const t = await bubbleShown(p);
      if (t.includes("krik")) return { x, y, text: t };
    }
  return null;
}

try {
  const page0 = await browser.newPage();
  const renderer = await page0.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  await page0.close();
  check("gpu.renderer", /NVIDIA/.test(renderer), renderer);
  if (!/NVIDIA/.test(renderer)) throw new Error("not on GPU, abort");

  // ---------- Desktop ----------
  {
    const W = 1440,
      H = 900;
    const { ctx, p, errors } = await open({ viewport: { width: W, height: H } });
    check("tree.webgl-canvas", (await p.$$(".app-tree canvas")).length === 1);
    await p.screenshot({ path: OUT + "d1-home.png" });

    // J1 tree navigation
    const t0 = await thumbTop(p);
    await p.mouse.move(W / 2, H / 2);
    for (let i = 0; i < 6; i++) {
      await p.mouse.wheel(0, 120);
      await wait(60);
    }
    await wait(1500);
    const t1 = await thumbTop(p);
    check("j1.wheel-climbs", t1 > t0, `${t0.toFixed(0)} -> ${t1.toFixed(0)}`);
    await p.keyboard.press("ArrowUp");
    await p.keyboard.press("ArrowUp");
    await wait(1200);
    check("j1.arrow-keys-climb", (await thumbTop(p)) < t1);
    const shelf = p.locator(".tree-shelf-book");
    const n = await shelf.count();
    check("j1.shelf-lists-books", n === 3, `count=${n}`);
    await shelf.nth(1).click();
    await wait(2600);
    const lockedVisible = await p.isVisible(".tree-locked");
    check(
      "j1.locked-book-label",
      lockedVisible && !(await p.isVisible(".tree-enter")),
      await p.$eval(".tree-label-title", (e) => e.textContent),
    );
    await p.screenshot({ path: OUT + "d3-near-locked-book.png" });
    await shelf.nth(0).click();
    await wait(2600);
    const title = await p.$eval(".tree-label-title", (e) => e.textContent);
    const labelOp = await p.$eval(".tree-label", (e) => getComputedStyle(e).opacity);
    const enterVisible = await p.isVisible(".tree-enter");
    check(
      "j1.shelf-brings-near-card",
      Number(labelOp) > 0.5 && title.length > 0 && enterVisible && !(await p.isVisible(".reading")),
      `title="${title}" opacity=${labelOp}`,
    );
    check("j1.shelf-aria-current", (await shelf.nth(0).getAttribute("aria-current")) === "true");
    await p.screenshot({ path: OUT + "d2-near-ready-book.png" });

    // J2 open, read, close (via shelf + Enter key)
    await p.mouse.move(W / 2, 60);
    await p.keyboard.press("Enter");
    await p.waitForSelector(".reading:not([hidden])", { timeout: 15000 }).catch(() => {});
    await wait(1800);
    const reading = await p.isVisible(".reading");
    check("j2.enter-key-opens-book", reading);
    if (reading) {
      const num1 = await p.$eval(".reading-num", (e) => e.textContent);
      await p.screenshot({ path: OUT + "d5-reading-gcf.png" });
      await p.click(".reading-next");
      await wait(600);
      const num2 = await p.$eval(".reading-num", (e) => e.textContent);
      check("j2.next-button", num1 !== num2, `${num1} -> ${num2}`);
      await p.keyboard.press("ArrowRight");
      await wait(600);
      check("j2.arrow-key-pages", (await p.$eval(".reading-num", (e) => e.textContent)) !== num2);
      await p.mouse.move(W * 0.7, H / 2);
      await p.mouse.wheel(0, -300);
      await wait(900);
      check("j2.wheel-pages-back", (await p.$eval(".reading-num", (e) => e.textContent)) === num2);
      await p.click('.reading-langs [data-lang="bi"]');
      await wait(500);
      check("j2.bileng-gloss", await p.isVisible(".reading-gloss"));
      await p.screenshot({ path: OUT + "d6-reading-bileng.png" });
      await p.click('.reading-langs [data-lang="fr"]');
      await wait(500);
      check(
        "j2.french",
        (await p.$eval('.reading-langs [data-lang="fr"]', (e) =>
          e.getAttribute("aria-pressed"),
        )) === "true",
      );
      const burger = p.locator("button[aria-expanded]").first();
      await burger.click();
      await wait(500);
      check("j2.language-panel-opens", await p.isVisible(".lang-panel"));
      await p.screenshot({ path: OUT + "d7-language-panel.png" });
      await p.keyboard.press("Escape");
      await wait(500);
      check(
        "j2.escape-closes-panel-only",
        !(await p.isVisible(".lang-panel")) && (await p.isVisible(".reading")),
      );
      await p.keyboard.press("Escape");
      await wait(3500);
      check(
        "j2.escape-leaves-book",
        !(await p.isVisible(".reading")) && (await p.isVisible(".app-tree")),
      );
      // second cycle via back button, then count canvases (leak guard)
      await shelf.nth(0).click();
      await wait(800);
      await p.waitForSelector(".reading:not([hidden])", { timeout: 15000 }).catch(() => {});
      check("j2.shelf-press-on-near-opens", await p.isVisible(".reading"));
      await p.waitForSelector(".reading:not([hidden])", { timeout: 15000 }).catch(() => {});
      await wait(1500);
      await p.click(".reading-back");
      await wait(3500);
      const canvases = await p.$$eval("canvas", (c) => c.length);
      check(
        "j2.back-button-and-no-canvas-leak",
        !(await p.isVisible(".reading")) && canvases === 1,
        `canvases=${canvases}`,
      );
    }

    // J3 Konteur (desktop hover) — back to t=0 first
    for (let i = 0; i < 30; i++) {
      await p.mouse.wheel(0, -200);
      await wait(30);
    }
    await wait(2000);
    const k = await findKonteur(p, W, H);
    check("j3.konteur-hover-bubble", !!k, k ? `at ${k.x},${k.y}` : "not found");
    if (k) {
      await p.screenshot({ path: OUT + "d4-konteur-bubble.png" });
      await p.mouse.move(W / 2, 80);
      await wait(800);
      check("j3.bubble-hides-on-leave", (await bubbleShown(p)) === "");
    }

    // J4 accessibility essentials
    await p.mouse.move(W / 2, 60);
    let shelfFocus = false;
    for (let i = 0; i < 6 && !shelfFocus; i++) {
      await p.keyboard.press("Tab");
      shelfFocus = await p.evaluate(
        () => document.activeElement?.classList.contains("tree-shelf-book") ?? false,
      );
    }
    // Visible ring measured in pixels (see focus.mjs), not inferred from outline-style.
    const focusedBook = await p.evaluate(() =>
      [...document.querySelectorAll(".tree-shelf-book")].indexOf(document.activeElement),
    );
    const ring = shelfFocus
      ? await focusIndicator(p, p.locator(".tree-shelf-book").nth(focusedBook))
      : null;
    check("j4.tab-reaches-shelf-with-focus-ring", shelfFocus && ring.visible, JSON.stringify(ring));
    const lang = await p.evaluate(() => ({
      root: document.documentElement.lang,
      tagged: document.querySelectorAll("#app [lang]").length,
      pageButtons: [...document.querySelectorAll(".reading-prev,.reading-next")].map((b) =>
        b.getAttribute("aria-label"),
      ),
    }));
    results.push({ id: "j4.lang-state", status: "BASELINE", detail: JSON.stringify(lang) });
    console.log("BASELINE j4.lang-state", JSON.stringify(lang));
    check("j1-j4.no-console-errors-desktop", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ---------- Mobile ----------
  {
    const W = 390,
      H = 844;
    const { ctx, p, errors } = await open({
      viewport: { width: W, height: H },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await p.screenshot({ path: OUT + "m1-home.png" });
    const k = await findKonteur(p, W, H);
    if (k) {
      await p.mouse.move(5, 5);
      await wait(600);
      await p.touchscreen.tap(k.x, k.y);
      await wait(700);
    }
    const tapped = k ? await bubbleShown(p) : "";
    check(
      "j3.konteur-tap-bubble-mobile",
      tapped.includes("krik"),
      k ? `at ${k.x},${k.y}` : "not found",
    );
    if (tapped) await p.screenshot({ path: OUT + "m2-konteur-bubble.png" });
    await wait(5000);
    check("j3.mobile-bubble-auto-hides-after-hold", (await bubbleShown(p)) === "");
    const shelf = p.locator(".tree-shelf-book");
    await shelf.nth(0).tap();
    await wait(2600);
    check("j1.mobile-shelf-near-card", await p.isVisible(".tree-enter"));
    await p.screenshot({ path: OUT + "m3-near-ready-book.png" });
    await p.locator(".tree-enter").tap({ force: true });
    await p.waitForSelector(".reading:not([hidden])", { timeout: 15000 }).catch(() => {});
    await wait(1800);
    check("j2.mobile-open-book", await p.isVisible(".reading"));
    await p.screenshot({ path: OUT + "m4-reading-gcf.png" });
    check("j1-j4.no-console-errors-mobile", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ---------- Reduced motion + lite ----------
  {
    const { ctx, p, errors } = await open(
      { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" },
      "?lite=1",
    );
    const rm = await p.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    check("j4.reduced-motion-media-active", rm);
    const t0 = await thumbTop(p);
    await p.mouse.move(720, 450);
    for (let i = 0; i < 6; i++) {
      await p.mouse.wheel(0, 120);
      await wait(60);
    }
    await wait(1500);
    check(
      "j4.reduced-motion-lite-tree-usable",
      (await thumbTop(p)) > t0 && errors.length === 0,
      errors.join(" | "),
    );
    await ctx.close();
  }

  // ---------- Indicative perf (desktop, full) ----------
  {
    const { ctx, p } = await open({ viewport: { width: 1440, height: 900 } });
    const fps = await p.evaluate(
      () =>
        new Promise((r) => {
          let n = 0;
          const s = performance.now();
          const f = () => {
            n++;
            performance.now() - s < 3000 ? requestAnimationFrame(f) : r(n / 3);
          };
          requestAnimationFrame(f);
        }),
    );
    results.push({ id: "perf.indicative-fps-desktop", status: "INFO", detail: fps.toFixed(1) });
    console.log("INFO fps", fps.toFixed(1));
    await ctx.close();
  }
} finally {
  await browser.close();
  const fs = await import("node:fs");
  fs.writeFileSync(OUT + "results.json", JSON.stringify(results, null, 2));
}
// A failed check fails the run, so a wrapper or CI step cannot mistake it for a pass.
process.exitCode = results.some((r) => r.status === "FAIL") ? 1 : 0;
