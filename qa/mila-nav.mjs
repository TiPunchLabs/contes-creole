// Mila's navigation against Ti Kannot's: control inventory and captures per viewport (survey), then
// boundaries, return and replay, keys, wheel, swipe and rapid input on the GPU. Real time.
// Usage: [SITE=url] [OUT=dir] [ONLY=survey,journey,rapid,crab,swipe,kannot] [VPS=desktop,mobile,...] node qa/mila-nav.mjs
// `survey` alone also runs on a build from before the alignment (no assertions on the controls).
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/mila-nav/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "survey,journey,rapid,crab,swipe,kannot").split(",");
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
const VPS = (process.env.VPS ?? Object.keys(VIEWPORTS).join(",")).split(",");
const results = { site: SITE, checks: [], survey: {} };

/** Records one check; `pass` false fails the run. */
function check(run, name, pass, detail = "") {
  results.checks.push({ run, name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${run} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function newPage(browser, vp, extra = {}) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp], ...extra });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  await p.waitForTimeout(1500);
  return { ctx, p, errors };
}

const press = async (loc, touch) => (touch ? loc.tap() : loc.click());

/** Opens the book on the shelf at `index` (0 Ti Kannot, 1 Mila) from the tree. */
async function openBook(p, index, touch) {
  const shelf = p.locator(".tree-shelf-book").nth(index);
  if (!(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
    await press(shelf, touch);
    await p.waitForTimeout(2800);
  }
  await press(shelf, touch);
  if (index === 1) await waitMila(p, "Page 01");
  else {
    await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
    await p.waitForTimeout(3000);
  }
}

/** Waits until Mila shows the page `num` ("Page 05") with its text, settled. */
async function waitMila(p, num, timeout = 25000) {
  await p.waitForFunction(
    (num) =>
      document.querySelector(".mila-story")?.classList.contains("is-on") &&
      document.querySelector(".mila-num")?.textContent === num,
    num,
    { timeout, polling: 50 },
  );
}

const milaNum = (p) => p.locator(".mila-num").textContent();

/** Waits for the scene to finish moving (both page buttons back in their resting state). */
async function settled(p, timeout = 25000) {
  await p.waitForFunction(
    () => {
      const n = document.querySelector(".mila-num")?.textContent;
      const prev = document.querySelector(".mila-prev");
      const next = document.querySelector(".mila-next");
      return (
        document.querySelector(".mila-story")?.classList.contains("is-on") &&
        prev.disabled === (n === "Page 01") &&
        next.disabled === (n === "Page 12")
      );
    },
    null,
    { timeout, polling: 50 },
  );
}

/** Navigation controls on screen, with their names, boxes and states; plus the text's box. */
const inventory = (p, book) =>
  p.evaluate((book) => {
    const sel =
      book === "mila"
        ? ".mila-back, .mila-ui button, .mila-count"
        : ".reading-back, .reading-arrows button, .reading-count, .tk-sound";
    const textSel = book === "mila" ? ".mila-story-scroll" : ".reading-card";
    const r = (e) => {
      const b = e.getBoundingClientRect();
      return {
        x: Math.round(b.x),
        y: Math.round(b.y),
        w: Math.round(b.width),
        h: Math.round(b.height),
      };
    };
    const controls = [...document.querySelectorAll(sel)]
      .filter((e) => e.getClientRects().length)
      .map((e) => ({
        cls: e.className.split(" ")[0] === "mila-btn" ? e.className : e.className.split(" ")[0],
        name: e.getAttribute("aria-label"),
        text: e.textContent.trim(),
        disabled: e.disabled ?? null,
        ...r(e),
      }));
    const text = document.querySelector(textSel);
    const tb = text && r(text);
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    return {
      controls,
      text: tb,
      overlaps: tb ? controls.filter((c) => hit(c, tb)).map((c) => c.cls) : [],
      offscreen: controls
        .filter((c) => c.x < 0 || c.y < 0 || c.x + c.w > innerWidth || c.y + c.h > innerHeight)
        .map((c) => c.cls),
      small: controls
        .filter((c) => !/count/.test(c.cls) && (c.w < 44 || c.h < 44))
        .map((c) => `${c.cls} ${c.w}x${c.h}`),
    };
  }, book);

async function survey(browser, vp) {
  const touch = vp !== "desktop" && vp !== "laptop";
  for (const [index, book] of [
    [1, "mila"],
    [0, "kannot"],
  ]) {
    const run = `survey-${book}-${vp}`;
    const { ctx, p, errors } = await newPage(browser, vp);
    await openBook(p, index, touch);
    await p.waitForTimeout(1500);
    if (book === "mila") await settled(p);
    const inv = await inventory(p, book);
    results.survey[run] = inv;
    await p.screenshot({ path: `${OUT}${run}-p01.png` });
    check(run, "controls-clear-of-text", inv.overlaps.length === 0, inv.overlaps.join(","));
    check(run, "controls-on-screen", inv.offscreen.length === 0, inv.offscreen.join(","));
    check(run, "touch-targets-44px", inv.small.length === 0, inv.small.join(","));
    if (book === "mila") {
      // the last page carries the replay button inside the text
      for (let i = 2; i <= 12; i++) {
        await p.keyboard.press("ArrowRight");
        // page 5 -> 6 first waits for the crab's debris to clear by themselves
        await waitMila(p, `Page ${String(i).padStart(2, "0")}`, 40000);
        await settled(p, 40000);
      }
      const end = await inventory(p, book);
      results.survey[`${run}-p12`] = end;
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}${run}-p12.png` });
      check(run, "p12-controls-clear-of-text", end.overlaps.length === 0, end.overlaps.join(","));
    }
    check(run, "no-errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}

async function journey(browser, vp) {
  const run = `journey-${vp}`;
  const touch = vp !== "desktop";
  const { ctx, p, errors } = await newPage(browser, vp);
  await openBook(p, 1, touch);
  check(run, "opens-on-page-1", (await milaNum(p)) === "Page 01");
  await settled(p);
  const first = await p.evaluate(() => ({
    prev: document.querySelector(".mila-prev").disabled,
    next: document.querySelector(".mila-next").disabled,
    count: document.querySelector(".mila-count").textContent,
    focus: document.activeElement?.getAttribute("aria-label"),
  }));
  check(
    run,
    "first-page-state",
    first.prev && !first.next && first.count === "1 / 12" && first.focus === "Page suivante",
    JSON.stringify(first),
  );
  for (let i = 2; i <= 12; i++) {
    await press(p.locator(".mila-next"), touch);
    await waitMila(p, `Page ${String(i).padStart(2, "0")}`, 40000);
    await settled(p, 40000);
    const count = await p.locator(".mila-count").textContent();
    if (count !== `${i} / 12`) check(run, `count-${i}`, false, count);
  }
  const last = await p.evaluate(() => ({
    prev: document.querySelector(".mila-prev").disabled,
    next: document.querySelector(".mila-next").disabled,
    count: document.querySelector(".mila-count").textContent,
    reread: !document.querySelector(".mila-end").hidden,
    focus: document.activeElement?.className,
  }));
  check(
    run,
    "last-page-state",
    !last.prev && last.next && last.count === "12 / 12" && last.reread,
    JSON.stringify(last),
  );
  await press(p.locator(".mila-prev"), touch);
  await waitMila(p, "Page 11", 40000);
  await settled(p, 40000);
  check(run, "previous-turns-back", (await milaNum(p)) === "Page 11");
  await press(p.locator(".mila-next"), touch);
  await waitMila(p, "Page 12", 40000);
  await settled(p, 40000);
  await press(p.locator(".mila-reread"), touch);
  await waitMila(p, "Page 01", 60000);
  await settled(p, 60000);
  check(run, "reread-returns-to-page-1", (await milaNum(p)) === "Page 01");
  await press(p.locator(".mila-back"), touch);
  await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
  check(run, "back-returns-to-tree", (await p.locator(".mila").count()) === 0);
  await p.waitForTimeout(2600);
  await openBook(p, 1, touch);
  check(run, "reopens-on-page-1", (await milaNum(p)) === "Page 01");
  if (!touch) {
    await settled(p);
    await p.keyboard.press("Escape");
    await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
    check(run, "escape-returns-to-tree", (await p.locator(".mila").count()) === 0);
  }
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Records every page the text shows, to catch a skipped one. */
const trackPages = (p) =>
  p.evaluate(() => {
    window.__pages = [];
    window.__pageObserver?.disconnect();
    const num = document.querySelector(".mila-num");
    window.__pageObserver = new MutationObserver(() => {
      if (window.__pages.at(-1) !== num.textContent) window.__pages.push(num.textContent);
    });
    window.__pageObserver.observe(num, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
const seen = (p) => p.evaluate(() => window.__pages);

const pageNo = async (p) => Number((await milaNum(p)).slice(5));

/**
 * Runs a burst of `inputs` inputs and checks the pages it shows: consecutive, never a skipped one,
 * at most one per input. In motion a page refuses input while it flies: the burst turns one page.
 */
async function burst(p, run, name, inputs, fire, reduced) {
  const from = await pageNo(p);
  await trackPages(p);
  await fire();
  await p.waitForTimeout(300);
  await settled(p, 40000);
  const pages = (await seen(p)).map((t) => Number(t.slice(5)));
  const turns = pages.length;
  const consecutive = pages.every((n, i) => n === from + i + 1);
  check(
    run,
    `${name}-${reduced ? "consecutive" : "one-page"}`,
    consecutive && (reduced ? turns >= 1 && turns <= inputs : turns === 1),
    `from ${from}: ${JSON.stringify(pages)} for ${inputs} inputs`,
  );
}

async function rapid(browser, reduced) {
  const run = `rapid${reduced ? "-reduced" : ""}`;
  const extra = reduced ? { reducedMotion: "reduce" } : {};
  const { ctx, p, errors } = await newPage(browser, "desktop", extra);
  await openBook(p, 1, false);
  await settled(p);
  const next = p.locator(".mila-next");
  await burst(
    p,
    run,
    "click-burst",
    5,
    async () => {
      for (let i = 0; i < 5; i++)
        await next.click({ force: true, noWaitAfter: true }).catch(() => {});
    },
    reduced,
  );
  await p.locator("body").evaluate(() => document.activeElement?.blur());
  await burst(
    p,
    run,
    "key-burst",
    6,
    async () => {
      for (let i = 0; i < 6; i++) await p.keyboard.press("ArrowDown", { delay: 15 });
    },
    reduced,
  );
  await p.mouse.move(900, 300);
  // 20 notches over about 0.5 s: the shell's pager lets one turn through per 750 ms
  await burst(
    p,
    run,
    "wheel-flick",
    2,
    async () => {
      for (let i = 0; i < 20; i++) {
        await p.mouse.wheel(0, 120);
        await p.waitForTimeout(25);
      }
    },
    reduced,
  );
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Page 5 with its debris: the turn waits for them to clear, and input meanwhile is refused. */
async function crab(browser, reduced) {
  const run = `crab${reduced ? "-reduced" : ""}`;
  const extra = reduced ? { reducedMotion: "reduce" } : {};
  const { ctx, p, errors } = await newPage(browser, "desktop", extra);
  await openBook(p, 1, false);
  await settled(p);
  await p.locator("body").evaluate(() => document.activeElement?.blur());
  // ArrowRight also works on builds from before the alignment (negative control)
  for (let i = 2; i <= 5; i++) {
    await p.keyboard.press("ArrowRight");
    await waitMila(p, `Page 0${i}`, 40000);
    await settled(p, 40000);
  }
  await trackPages(p);
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(400);
  const during = await p.evaluate(() => ({
    next: document.querySelector(".mila-next").disabled,
    prev: document.querySelector(".mila-prev").disabled,
  }));
  check(
    run,
    "controls-wait-while-debris-clear",
    during.next && during.prev,
    JSON.stringify(during),
  );
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowLeft");
  await p.mouse.move(900, 300);
  await p.mouse.wheel(0, -200);
  await p.mouse.wheel(0, 200);
  await waitMila(p, "Page 06", 40000);
  await settled(p, 40000);
  await p.waitForTimeout(2500);
  const pages = await seen(p);
  check(
    run,
    "no-skip-while-debris-clear",
    (await milaNum(p)) === "Page 06" && pages.join() === "Page 06",
    JSON.stringify(pages),
  );
  // not stuck afterwards: one more page each way
  await p.keyboard.press("ArrowDown");
  await waitMila(p, "Page 07", 40000);
  await settled(p, 40000);
  await p.keyboard.press("ArrowUp");
  await waitMila(p, "Page 06", 40000);
  await settled(p, 40000);
  check(run, "navigation-not-stuck", (await milaNum(p)) === "Page 06");
  // Space on a focused tool button presses it and does not turn the page
  await p.locator(".mila-pause").focus();
  await p.keyboard.press(" ");
  await p.waitForTimeout(600);
  const space = await p.evaluate(() => ({
    num: document.querySelector(".mila-num").textContent,
    paused: document.querySelector(".mila-pause").getAttribute("aria-pressed"),
  }));
  check(
    run,
    "space-on-button-presses-it",
    space.num === "Page 06" && space.paused === "true",
    JSON.stringify(space),
  );
  await p.keyboard.press(" ");
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** A real finger swipe through CDP touch events (Playwright's touchscreen only taps). */
async function swipe(cdp, x, y0, y1) {
  const pt = (y) => [{ x, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(y0) });
  for (let i = 1; i <= 8; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: pt(y0 + ((y1 - y0) * i) / 8),
    });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function swipes(browser, vp) {
  const run = `swipe-${vp}`;
  const { ctx, p, errors } = await newPage(browser, vp);
  await openBook(p, 1, true);
  await settled(p);
  const cdp = await ctx.newCDPSession(p);
  const { width, height } = p.viewportSize();
  // on the scene, clear of the text and the controls
  const y0 = vp === "landscape" ? height * 0.75 : height * 0.82;
  const x = vp === "landscape" ? width * 0.8 : width * 0.5;
  const target = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className, [x, y0]);
  await swipe(cdp, x, y0, y0 - height * 0.25);
  await waitMila(p, "Page 02", 40000);
  await settled(p, 40000);
  check(run, "swipe-up-turns-forward", (await milaNum(p)) === "Page 02", target);
  await p.waitForTimeout(800);
  await swipe(cdp, x, y0 - height * 0.25, y0);
  await waitMila(p, "Page 01", 40000);
  await settled(p, 40000);
  check(run, "swipe-down-turns-back", (await milaNum(p)) === "Page 01");
  await p.waitForTimeout(800);
  await trackPages(p);
  for (let i = 0; i < 3; i++) await swipe(cdp, x, y0, y0 - height * 0.25);
  await p.waitForTimeout(300);
  await settled(p, 40000);
  check(
    run,
    "swipe-burst-one-page",
    (await milaNum(p)) === "Page 02",
    JSON.stringify(await seen(p)),
  );
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function kannot(browser, vp) {
  const run = `kannot-${vp}`;
  const touch = vp !== "desktop";
  const { ctx, p, errors } = await newPage(browser, vp);
  await openBook(p, 0, touch);
  const count = () => p.locator(".reading-count").textContent();
  check(run, "opens-on-page-1", /^1 \//.test(await count()));
  await press(p.locator(".reading-next"), touch);
  await p.waitForTimeout(1200);
  check(run, "next-button", /^2 \//.test(await count()));
  await press(p.locator(".reading-prev"), touch);
  await p.waitForTimeout(1200);
  check(run, "prev-button", /^1 \//.test(await count()));
  if (touch) {
    const cdp = await ctx.newCDPSession(p);
    const { width, height } = p.viewportSize();
    await swipe(cdp, width * 0.5, height * 0.3, height * 0.05);
    await p.waitForTimeout(1200);
    check(run, "swipe", /^2 \//.test(await count()));
  } else {
    // the previous button keeps the focus after a click: Space would press it (as designed)
    await p.locator("body").evaluate(() => document.activeElement?.blur());
    for (const [k, want] of [
      ["ArrowDown", 2],
      ["PageDown", 3],
      [" ", 4],
      ["ArrowRight", 5],
      ["ArrowUp", 4],
      ["PageUp", 3],
      ["ArrowLeft", 2],
    ]) {
      await p.keyboard.press(k);
      await p.waitForTimeout(250);
      if (!new RegExp(`^${want} /`).test(await count()))
        check(run, `key-${k}`, false, await count());
    }
    check(run, "keys", /^2 \//.test(await count()));
    await p.mouse.move(900, 300);
    await p.mouse.wheel(0, 200);
    await p.waitForTimeout(900);
    check(run, "wheel", /^3 \//.test(await count()));
    await p.keyboard.press("Escape");
    await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
    check(run, "escape-returns-to-tree", true);
  }
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function guarded(run, fn) {
  try {
    await fn();
  } catch (err) {
    check(run, "completed", false, String(err).split("\n")[0]);
    for (const ctx of browser.contexts()) {
      for (const page of ctx.pages())
        await page.screenshot({ path: `${OUT}${run}-crash.png` }).catch(() => undefined);
      await ctx.close();
    }
  }
}

const browser = await chromium.launch({ args: GPU, env: GPU_ENV });
try {
  const renderer = await (async () => {
    const p = await browser.newPage();
    const r = await p.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
    });
    await p.close();
    return r;
  })();
  check("gpu", "nvidia-renderer", /NVIDIA/i.test(renderer), renderer);
  if (ONLY.includes("survey"))
    for (const vp of VPS) await guarded(`survey-${vp}`, () => survey(browser, vp));
  if (ONLY.includes("journey"))
    for (const vp of ["desktop", "mobile"])
      await guarded(`journey-${vp}`, () => journey(browser, vp));
  if (ONLY.includes("rapid")) {
    await guarded("rapid", () => rapid(browser, false));
    await guarded("rapid-reduced", () => rapid(browser, true));
  }
  if (ONLY.includes("crab")) {
    await guarded("crab", () => crab(browser, false));
    await guarded("crab-reduced", () => crab(browser, true));
  }
  if (ONLY.includes("swipe"))
    for (const vp of ["mobile", "landscape"])
      await guarded(`swipe-${vp}`, () => swipes(browser, vp));
  if (ONLY.includes("kannot"))
    for (const vp of ["desktop", "mobile"])
      await guarded(`kannot-${vp}`, () => kannot(browser, vp));
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
  const failed = results.checks.filter((c) => !c.pass);
  console.log(`\n${results.checks.length - failed.length}/${results.checks.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}
