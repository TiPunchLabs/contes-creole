// M1 baseline: 4 critical journeys (+ J5 invitation to classes, M2) + reference screenshots, GPU Chromium only.
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

/** Centre of the Konteur on screen (his keyboard entry point's box), or null when out of view. */
async function findKonteur(p) {
  return p.evaluate(() => {
    const el = document.querySelector(".tree-teller");
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height * 0.55) };
  });
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
    // Published books (Ti Kannot, Mila since MILA-AIM), then one invitation to classes, last
    // (pending books are not shown).
    const last = await shelf.nth(n - 1).evaluate((b) => b.classList.contains("is-invitation"));
    check(
      "j1.shelf-lists-books-and-invitation",
      n === 3 && last,
      `count=${n} invitationLast=${last}`,
    );
    await p.locator(".tree-shelf-book.is-invitation").click();
    await wait(2600);
    // No fiche since TREE-PANEL: the near card itself is the entry point (a link for the invitation).
    check(
      "j1.invitation-card-entry",
      (await p.isVisible(".tree-book-invite")) && !(await p.isVisible("button.tree-book")),
      (await p.$eval(".tree-book-invite", (e) => e.textContent)) ?? "",
    );
    await p.screenshot({ path: OUT + "d3-near-invitation.png" });
    await shelf.nth(0).click();
    await wait(2600);
    const title = await p.$eval("button.tree-book .tree-book-title", (e) => e.textContent);
    const enterVisible = await p.isVisible("button.tree-book");
    check(
      "j1.shelf-brings-near-card",
      title.length > 0 && enterVisible && !(await p.isVisible(".reading")),
      `title="${title}"`,
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
      // TKP-EDU: the tale carries no "Lang kréyòl" panel any more.
      check(
        "j2.no-language-panel",
        (await p.locator(".lang-burger:visible, .lang-panel:visible").count()) === 0,
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
    // Since TREE-RANDOM the Konteur speaks unasked at the foot of the tree, his bubble ending with
    // the random-tale call; it goes once the climb leaves the foot.
    const k = await findKonteur(p);
    if (k) await p.mouse.move(k.x, k.y);
    await wait(600);
    const said = await bubbleShown(p);
    check(
      "j3.konteur-bubble-with-call",
      !!k && said.includes("krik") && said.includes("conte au hasard"),
      k ? `at ${k.x},${k.y}` : "not found",
    );
    if (k) await p.screenshot({ path: OUT + "d4-konteur-bubble.png" });
    await p.mouse.move(W / 2, 80);
    for (let i = 0; i < 6; i++) await p.mouse.wheel(0, 200);
    await wait(5600);
    check("j3.bubble-hides-up-the-tree", (await bubbleShown(p)) === "");
    for (let i = 0; i < 30; i++) {
      await p.mouse.wheel(0, -200);
      await wait(30);
    }
    await wait(2000);

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

    // J5 invitation to classes: shelf -> fiche -> classes page -> contact link -> back, keyboard only
    await p.keyboard.press("Escape");
    const invite = p.locator(".tree-shelf-book.is-invitation");
    await invite.focus();
    await p.keyboard.press("Enter");
    await wait(2600);
    check(
      "j5.invitation-shelf-name",
      (await invite.getAttribute("aria-label"))?.includes("invitation aux classes") &&
        (await invite.getAttribute("aria-current")) === "true",
      await invite.getAttribute("aria-label"),
    );
    await p.keyboard.press("Enter");
    await p.waitForURL(/\/contes-des-classes\/$/, { timeout: 10000 }).catch(() => {});
    await p.evaluate(() => document.fonts.ready);
    check(
      "j5.press-again-opens-classes-page",
      new URL(p.url()).pathname === "/contes-des-classes/",
      p.url(),
    );
    await p.screenshot({ path: OUT + "d6-classes-page.png" });
    const page = await p.evaluate(() => {
      const a = document.querySelector(".cc-cta");
      return {
        h1: document.querySelector("h1")?.textContent.trim(),
        href: a?.getAttribute("href"),
        target: a?.target,
        hScroll: document.documentElement.scrollWidth > innerWidth,
        nested: [...document.querySelectorAll("body *")].filter((e) => {
          const st = getComputedStyle(e);
          return /(auto|scroll)/.test(st.overflowY) && e.scrollHeight > e.clientHeight;
        }).length,
        // Every script the page actually fetched: none may be the tree bundle (Three.js) or a world.
        three: performance
          .getEntriesByType("resource")
          .some((r) => /\/assets\/(main|world)-.*\.js$/.test(r.name)),
        scripts: performance
          .getEntriesByType("resource")
          .filter((r) => r.name.endsWith(".js"))
          .map((r) => r.name.replace(location.origin, "")),
      };
    });
    check(
      "j5.page-cta-links-existing-contact",
      page.href === "https://xgueret.tipunchlabs.fr/#tp-contact" && page.target === "_blank",
      JSON.stringify(page),
    );
    check(
      "j5.page-one-scroll-no-tree-bundle",
      !page.hScroll && page.nested === 0 && !page.three,
      JSON.stringify(page),
    );
    await p.keyboard.press("Tab");
    check(
      "j5.tab-starts-on-way-back",
      await p.evaluate(() => document.activeElement?.classList.contains("cc-back")),
    );
    let ctaFocused = false;
    for (let i = 0; i < 6 && !ctaFocused; i++) {
      await p.keyboard.press("Tab");
      ctaFocused = await p.evaluate(() => document.activeElement?.classList.contains("cc-cta"));
    }
    await wait(900);
    const ctaInView = await p.$eval(".cc-cta", (a) => {
      const r = a.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    });
    check(
      "j5.tab-reaches-cta-scrolled-into-view",
      ctaFocused && ctaInView,
      `focused=${ctaFocused} inView=${ctaInView}`,
    );
    await p.screenshot({ path: OUT + "d7-classes-cta-focus.png" });
    await p.keyboard.press("Home");
    await wait(600);
    await p.focus(".cc-top .cc-back");
    await p.keyboard.press("Enter");
    await p.waitForURL((u) => new URL(u).pathname === "/", { timeout: 10000 }).catch(() => {});
    await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
    await wait(2200);
    check(
      "j5.way-back-opens-tree-on-invitation",
      (await p.isVisible(".tree-book-invite")) && new URL(p.url()).hash === "",
      p.url(),
    );
    await p.screenshot({ path: OUT + "d8-back-on-invitation.png" });
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
    // Since TREE-RANDOM a tap on the Konteur opens a tale at random, straight on its first page.
    const k = await findKonteur(p);
    if (k) await p.touchscreen.tap(k.x, k.y);
    const opened = k
      ? await p
          .waitForFunction(() => document.querySelector(".app")?.dataset.book, null, {
            timeout: 15000,
          })
          .then(() => p.evaluate(() => document.querySelector(".app").dataset.book))
          .catch(() => "")
      : "";
    check(
      "j3.konteur-tap-opens-random-tale-mobile",
      opened === "ti-kannot" || opened === "mila",
      k ? `at ${k.x},${k.y}: ${opened}` : "not found",
    );
    if (opened) {
      await wait(2500);
      await p.screenshot({ path: OUT + "m2-konteur-random-tale.png" });
      await p.keyboard.press("Escape");
      await p.waitForFunction(() => !document.querySelector(".app")?.dataset.book, null, {
        timeout: 15000,
      });
      await wait(2200);
    }
    await p.locator(".tree-shelf-book.is-invitation").tap();
    await wait(2600);
    check("j5.mobile-invitation-card-entry", await p.isVisible(".tree-book-invite"));
    await p.screenshot({ path: OUT + "m5-near-invitation.png" });
    await p.locator(".tree-shelf-book.is-invitation").tap();
    await p.waitForURL(/\/contes-des-classes\/$/, { timeout: 10000 }).catch(() => {});
    await p.evaluate(() => document.fonts.ready);
    const first = await p.evaluate(() => {
      const h = document.querySelector("h1").getBoundingClientRect();
      return {
        h1Top: h.top,
        h1Bottom: h.bottom,
        hScroll: document.documentElement.scrollWidth > innerWidth,
      };
    });
    check(
      "j5.mobile-page-title-in-first-screen",
      first.h1Top >= 0 && first.h1Bottom <= H && !first.hScroll,
      JSON.stringify(first),
    );
    await p.screenshot({ path: OUT + "m6-classes-page.png" });
    // Raw touch events: synthesizeScrollGesture does not scroll here headless.
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, y) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: y === null ? [] : [{ x: W / 2, y }],
      });
    for (let swipe = 0; swipe < 6; swipe++) {
      await touch("touchStart", H * 0.8);
      for (let i = 1; i <= 16; i++) {
        await touch("touchMove", H * 0.8 - i * 36);
        await wait(16);
      }
      await touch("touchEnd", null);
      await wait(500);
    }
    await wait(800);
    const end = await p.evaluate(() => {
      const c = document.querySelector(".cc-cta").getBoundingClientRect();
      return { scrollY, ctaSeen: c.top >= 0 && c.bottom <= innerHeight };
    });
    check(
      "j5.mobile-swipe-scrolls-page-to-cta",
      end.scrollY > 0 && end.ctaSeen,
      JSON.stringify(end),
    );
    await p.screenshot({ path: OUT + "m7-classes-page-cta.png" });
    await p.goBack();
    await p.waitForSelector(".tree-shelf", { timeout: 20000 });
    await wait(1500);
    await p.locator(".tree-shelf-book").nth(0).tap();
    await wait(2600);
    check("j1.mobile-shelf-near-card", await p.isVisible("button.tree-book"));
    await p.screenshot({ path: OUT + "m3-near-ready-book.png" });
    const card = await p.locator("button.tree-book").boundingBox();
    await p.touchscreen.tap(card.x + card.width / 2, card.y + card.height / 2);
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
    await p.click(".tree-shelf-book.is-invitation");
    await wait(2600);
    await p.click(".tree-shelf-book.is-invitation");
    await p.waitForURL(/\/contes-des-classes\/$/, { timeout: 10000 }).catch(() => {});
    const behavior = await p.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    check("j5.reduced-motion-page-no-smooth-scroll", behavior === "auto", behavior);
    await p.screenshot({ path: OUT + "r1-classes-reduced.png" });
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
