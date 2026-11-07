// Mila in Kréyòl and French through the shell's language switch: text against story/*.md on all
// twelve pages, the scene untouched by a switch (paused frames compared), switching mid-flight and
// during the crab's clearing, pause and sound kept, replay, reopen, layout at four sizes, overflow
// scrolling, and Ti Kannot's switch. GPU only, real time.
// Usage: [SITE=url] [OUT=dir] [ONLY=text,scene,flight,session,layout,overflow,kannot] node qa/mila-lang.mjs
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/mila-lang/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "text,scene,flight,session,layout,overflow,kannot").split(",");
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
  mobile: touchVp(390, 844),
  narrow: touchVp(320, 568),
  landscape: touchVp(844, 390),
};
const results = { site: SITE, checks: [], layout: {} };
/** Time the paused scene takes to come to rest after a page turn (measured: under 8 s). */
const SETTLE_MS = 8000;

/** Records one check; `pass` false fails the run. */
function check(run, name, pass, detail = "") {
  results.checks.push({ run, name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${run} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Titles and paragraphs of a story file, as the shell's parser joins them. */
function storyFile(lang) {
  const source = readFileSync(
    new URL(`../src/books/mila/story/${lang}.md`, import.meta.url),
    "utf8",
  );
  return source
    .split(/^---$/m)[2]
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const [head, ...rest] = chunk.split("\n");
      const paragraphs = rest
        .join("\n")
        .trim()
        .split(/\n\s*\n/)
        .map((p) =>
          p
            .split("\n")
            .map((l) => l.trim())
            .join(" "),
        );
      return { title: head.replace(/\s*\{#[a-z0-9-]+\}$/, "").trim(), paragraphs };
    });
}
const EXPECTED = { gcf: storyFile("gcf"), fr: storyFile("fr") };

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
const pad = (n) => String(n).padStart(2, "0");

/** Opens a book from the tree (0 Ti Kannot, 1 Mila). */
async function openBook(p, index, touch) {
  const shelf = p.locator(".tree-shelf-book").nth(index);
  if (!(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
    await press(shelf, touch);
    await p.waitForTimeout(2800);
  }
  await press(shelf, touch);
  if (index === 1) await settled(p, 1);
  else {
    await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
    await p.waitForTimeout(3000);
  }
}

/** Waits until Mila shows page `n` with its text and resting controls. */
async function settled(p, n, timeout = 40000) {
  await p.waitForFunction(
    (num) => {
      const prev = document.querySelector(".mila-prev");
      const next = document.querySelector(".mila-next");
      return (
        document.querySelector(".mila-story")?.classList.contains("is-on") &&
        document.querySelector(".mila-num")?.textContent === num &&
        prev?.disabled === (num === "Page 01") &&
        next?.disabled === (num === "Page 12")
      );
    },
    `Page ${pad(n)}`,
    { timeout, polling: 50 },
  );
}

/** What the reader sees of the tale's text right now. */
const shown = (p) =>
  p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      num: q(".mila-num")?.textContent,
      lang: q(".mila-story")?.lang,
      title: q(".mila-heading")?.textContent,
      paragraphs: [...document.querySelectorAll(".mila-text p")].map((e) => e.textContent),
      gloss: q(".mila-gloss")?.hidden
        ? null
        : [...document.querySelectorAll(".mila-gloss p")].map((e) => e.textContent),
      pressed: q('.reading-langs [aria-pressed="true"]')?.dataset.lang,
    };
  });

const setLang = async (p, lang, touch) =>
  press(p.locator(`.reading-langs [data-lang="${lang}"]`), touch);

/** Checks the text against story/<lang>.md for page n (Bileng: Kréyòl with the French gloss). */
function matches(s, mode, n) {
  const main = EXPECTED[mode === "fr" ? "fr" : "gcf"][n - 1];
  const okMain =
    s.num === `Page ${pad(n)}` &&
    s.lang === (mode === "fr" ? "fr" : "gcf") &&
    s.title === main.title &&
    JSON.stringify(s.paragraphs) === JSON.stringify(main.paragraphs);
  const okGloss =
    mode === "bi"
      ? JSON.stringify(s.gloss) === JSON.stringify(EXPECTED.fr[n - 1].paragraphs)
      : s.gloss === null;
  return okMain && okGloss && s.pressed === mode;
}

/** All twelve pages: Kréyòl, then French, then Bileng, then Kréyòl again, on the same page. */
async function text(browser) {
  const run = "text";
  const { ctx, p, errors } = await newPage(browser, "desktop");
  await openBook(p, 1, false);
  const first = await shown(p);
  check(run, "opens-on-page-1-in-kreyol", matches(first, "gcf", 1), JSON.stringify(first.title));
  const switchBox = await p.locator(".reading-langs").boundingBox();
  const others = await p.evaluate(() =>
    [...document.querySelectorAll(".reading > *")]
      .filter((e) => !e.classList.contains("reading-langs") && e.getClientRects().length)
      .map((e) => e.className),
  );
  check(run, "only-the-shell-switch", switchBox && others.length === 0, others.join(","));
  const names = await p.$$eval(".reading-langs button", (bs) => bs.map((b) => b.textContent));
  check(run, "switch-modes", names.join("|") === "Kréyòl|Bileng|Français", names.join("|"));
  for (let n = 1; n <= 12; n++) {
    const bad = [];
    for (const mode of ["fr", "bi", "gcf", "fr", "gcf"]) {
      await setLang(p, mode, false);
      await p.waitForTimeout(80);
      const s = await shown(p);
      if (!matches(s, mode, n)) bad.push(`${mode}: ${JSON.stringify(s)}`);
    }
    check(run, `page-${pad(n)}-fr-bi-gcf`, bad.length === 0, bad.join(" | "));
    if (n === 5) {
      const hint = await p.evaluate(() => ({
        hidden: document.querySelector(".mila-hint").hidden,
        lang: document.querySelector(".mila-hint").lang,
      }));
      check(
        run,
        "crab-hint-kept-and-french",
        !hint.hidden && hint.lang === "fr",
        JSON.stringify(hint),
      );
    }
    if (n < 12) {
      await p.keyboard.press("ArrowRight");
      await settled(p, n + 1);
    }
  }
  const end = await p.evaluate(() => ({
    reread: document.querySelector(".mila-end").hidden === false,
    lang: document.querySelector(".mila-end").lang,
  }));
  check(run, "replay-shown-french", end.reread && end.lang === "fr", JSON.stringify(end));
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Share of differing pixels (fuzz 2 %) between two captures; ImageMagick prints it on stderr. */
function pixelDiff(a, b) {
  const run = spawnSync("compare", ["-metric", "AE", "-fuzz", "2%", a, b, "null:"]);
  const m = /\(([\d.e-]+)\)/.exec(run.stderr.toString());
  return m ? Number(m[1]) : NaN;
}

/**
 * Motion paused: a switch leaves the scene outside the text as it was; sound and pause kept. The
 * paused scene still eases to rest for a few seconds after a page turn, so each page first settles,
 * and a capture pair without a switch (control) measures what is left of that motion.
 */
async function scene(browser) {
  const run = "scene";
  const { ctx, p, errors } = await newPage(browser, "desktop");
  await openBook(p, 1, false);
  await p.locator(".mila-sound").click();
  await p.locator(".mila-pause").click();
  // right of the text, above the controls
  const clip = { x: 760, y: 120, width: 640, height: 640 };
  for (const n of [1, 5, 7, 12]) {
    if (n > 1) {
      while ((await p.locator(".mila-num").textContent()) !== `Page ${pad(n)}`) {
        const cur = Number((await p.locator(".mila-num").textContent()).slice(5));
        await p.keyboard.press("ArrowRight");
        await settled(p, cur + 1);
      }
    }
    await p.waitForTimeout(SETTLE_MS);
    const c = `${OUT}scene-p${pad(n)}-control.png`;
    const a = `${OUT}scene-p${pad(n)}-a.png`;
    const b = `${OUT}scene-p${pad(n)}-b.png`;
    await p.screenshot({ path: c, clip });
    await p.waitForTimeout(1400);
    await p.screenshot({ path: a, clip });
    await setLang(p, "fr", false);
    await p.waitForTimeout(400);
    await setLang(p, "bi", false);
    await p.waitForTimeout(400);
    await setLang(p, "gcf", false);
    await p.waitForTimeout(600);
    await p.screenshot({ path: b, clip });
    const control = pixelDiff(c, a);
    const diff = pixelDiff(a, b);
    check(
      run,
      `page-${pad(n)}-scene-unchanged`,
      Number.isFinite(diff) && diff <= control + 1e-4,
      `switch diff=${diff}, control diff=${control}`,
    );
  }
  const state = await p.evaluate(() => ({
    sound: document.querySelector(".mila-sound").getAttribute("aria-pressed"),
    paused: document.querySelector(".mila-pause").getAttribute("aria-pressed"),
    rootPaused: document.querySelector(".mila").classList.contains("is-paused"),
  }));
  check(
    run,
    "sound-off-and-pause-kept",
    state.sound === "false" && state.paused === "true" && state.rootPaused,
    JSON.stringify(state),
  );
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Records the pages the text shows. */
const track = (p) =>
  p.evaluate(() => {
    window.__seen = [];
    const num = document.querySelector(".mila-num");
    new MutationObserver(() => {
      const t = `${num.textContent}:${document.querySelector(".mila-story").lang}`;
      if (window.__seen.at(-1) !== t) window.__seen.push(t);
    }).observe(num, { childList: true, characterData: true, subtree: true });
  });

/** Switching mid-flight and during the crab's clearing: no restart, no extra page. */
async function flight(browser, reduced) {
  const run = `flight${reduced ? "-reduced" : ""}`;
  const { ctx, p, errors } = await newPage(
    browser,
    "desktop",
    reduced ? { reducedMotion: "reduce" } : {},
  );
  await openBook(p, 1, false);
  await track(p);
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(reduced ? 20 : 600);
  await setLang(p, "fr", false);
  await setLang(p, "bi", false);
  await settled(p, 2);
  await p.waitForTimeout(1500);
  const s2 = await shown(p);
  const seen1 = await p.evaluate(() => window.__seen);
  check(
    run,
    "switch-mid-flight-lands-once",
    matches(s2, "bi", 2) &&
      !seen1.some((t) => t.startsWith("Page 01")) &&
      !seen1.includes("Page 03:gcf"),
    JSON.stringify(seen1),
  );
  for (let n = 3; n <= 5; n++) {
    await p.keyboard.press("ArrowRight");
    await settled(p, n);
  }
  await track(p);
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(400);
  const busy = await p.evaluate(() => document.querySelector(".mila-next").disabled);
  await setLang(p, "fr", false);
  await p.waitForTimeout(300);
  const during = await shown(p);
  await setLang(p, "gcf", false);
  await settled(p, 6);
  await p.waitForTimeout(2500);
  const seen = await p.evaluate(() => window.__seen);
  check(
    run,
    "switch-during-crab-clearing",
    busy &&
      matches(during, "fr", 5) &&
      matches(await shown(p), "gcf", 6) &&
      !seen.includes("Page 07:gcf"),
    JSON.stringify({ during: during.title, seen }),
  );
  await p.keyboard.press("ArrowRight");
  await settled(p, 7);
  check(run, "navigation-responsive-after", (await shown(p)).num === "Page 07");
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Entry, replay, close, reopen and reload follow the shell's rules for the language. */
async function session(browser) {
  const run = "session";
  const { ctx, p, errors } = await newPage(browser, "desktop");
  await openBook(p, 1, false);
  await setLang(p, "fr", false);
  for (let n = 2; n <= 12; n++) {
    await p.keyboard.press("ArrowRight");
    await settled(p, n);
  }
  await p.locator(".mila-reread").click();
  await settled(p, 1, 60000);
  check(run, "replay-page-1-same-language", matches(await shown(p), "fr", 1));
  await p.locator(".mila-back").click();
  await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
  check(run, "switch-gone-in-tree", await p.locator(".reading").isHidden());
  await p.waitForTimeout(2600);
  await openBook(p, 1, false);
  check(run, "reopen-page-1-same-language", matches(await shown(p), "fr", 1));
  await p.keyboard.press("Escape");
  await p.waitForSelector(".app-tree:not([hidden])", { timeout: 10000 });
  await p.waitForTimeout(2600);
  await openBook(p, 0, false);
  const kannot = await p.evaluate(() => ({
    pressed: document.querySelector('.reading-langs [aria-pressed="true"]')?.dataset.lang,
    card: document.querySelector(".reading-card")?.lang,
    langsOnly: document.querySelector(".reading").classList.contains("is-langs-only"),
  }));
  check(
    run,
    "language-carries-to-ti-kannot",
    kannot.pressed === "fr" && kannot.card === "fr" && !kannot.langsOnly,
    JSON.stringify(kannot),
  );
  await p.reload();
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  await p.waitForTimeout(1500);
  await openBook(p, 1, false);
  check(run, "reload-starts-in-kreyol", matches(await shown(p), "gcf", 1));
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Boxes of the text, the switch, the back button and the controls; overlaps and overflow. */
const layoutOf = (p) =>
  p.evaluate(() => {
    const r = (e) => {
      const b = e.getBoundingClientRect();
      return {
        x: Math.round(b.x),
        y: Math.round(b.y),
        w: Math.round(b.width),
        h: Math.round(b.height),
      };
    };
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const scroll = document.querySelector(".mila-story-scroll");
    const text = r(scroll);
    const sw = r(document.querySelector(".reading-langs"));
    const back = r(document.querySelector(".mila-back"));
    const controls = [...document.querySelectorAll(".mila-ui .mila-btn, .mila-count")].map(r);
    const inView = (b) =>
      b.x >= 0 && b.y >= 0 && b.x + b.w <= innerWidth && b.y + b.h <= innerHeight;
    return {
      text,
      overflow: scroll.scrollHeight - scroll.clientHeight,
      scrollable: scroll.classList.contains("is-scrollable"),
      fontPx: parseFloat(getComputedStyle(document.querySelector(".mila-text")).fontSize),
      switchOverText: hit(sw, text),
      switchOverBack: hit(sw, back),
      switchOverControls: controls.some((c) => hit(sw, c)),
      textOverControls: controls.some((c) => hit(text, c)),
      inView: inView(text) && inView(sw) && controls.every(inView),
    };
  });

async function layout(browser, vp) {
  const run = `layout-${vp}`;
  const touch = vp !== "desktop";
  const { ctx, p, errors } = await newPage(browser, vp);
  await openBook(p, 1, touch);
  const bad = [];
  let maxOverflow = { px: 0 };
  for (let n = 1; n <= 12; n++) {
    for (const mode of ["gcf", "bi", "fr"]) {
      await setLang(p, mode, touch);
      await p.waitForTimeout(120);
      const l = await layoutOf(p);
      results.layout[`${vp}-p${pad(n)}-${mode}`] = l;
      if (
        l.switchOverText ||
        l.switchOverBack ||
        l.switchOverControls ||
        l.textOverControls ||
        !l.inView
      )
        bad.push(`p${n}-${mode} ${JSON.stringify(l)}`);
      if (l.overflow > 1 !== l.scrollable)
        bad.push(`p${n}-${mode} scrollable=${l.scrollable} overflow=${l.overflow}`);
      if (l.overflow > maxOverflow.px) maxOverflow = { px: l.overflow, at: `p${n}-${mode}` };
      if ([1, 5, 12].includes(n) || (mode === "bi" && n === 6)) {
        await p.waitForTimeout(500);
        await p.screenshot({ path: `${OUT}${run}-p${pad(n)}-${mode}.png` });
      }
    }
    if (n < 12) {
      await press(p.locator(".mila-next"), touch);
      await settled(p, n + 1);
    }
  }
  check(
    run,
    "no-overlap-in-view-scroll-when-needed",
    bad.length === 0,
    bad.slice(0, 4).join(" | "),
  );
  check(run, "max-overflow", true, JSON.stringify(maxOverflow));
  check(run, "no-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Overflowing text: the wheel and the finger scroll it to its end and never turn the page. */
async function overflow(browser) {
  for (const vp of ["narrow", "landscape"]) {
    const run = `overflow-${vp}`;
    const { ctx, p, errors } = await newPage(browser, vp);
    await openBook(p, 1, true);
    await setLang(p, "bi", true);
    let n = 1;
    while (!(await p.locator(".mila-story-scroll.is-scrollable").count()) && n < 12) {
      await p.locator(".mila-next").tap();
      n++;
      await settled(p, n);
    }
    const scroll = p.locator(".mila-story-scroll");
    const box = await scroll.boundingBox();
    const cdp = await ctx.newCDPSession(p);
    const x = box.x + box.width / 2;
    const y0 = box.y + box.height * 0.8;
    for (let k = 0; k < 6; k++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y: y0 }],
      });
      for (let i = 1; i <= 6; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y0 - (box.height * 0.5 * i) / 6 }],
        });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(300);
    }
    await p.waitForTimeout(800);
    const after = await p.evaluate(() => {
      const s = document.querySelector(".mila-story-scroll");
      return {
        num: document.querySelector(".mila-num").textContent,
        top: Math.round(s.scrollTop),
        max: s.scrollHeight - s.clientHeight,
      };
    });
    check(
      run,
      "swipe-scrolls-text-to-end-same-page",
      after.num === `Page ${pad(n)}` && after.top >= after.max - 2 && after.max > 0,
      JSON.stringify({ page: n, ...after }),
    );
    await p.screenshot({ path: `${OUT}${run}-scrolled.png` });
    await p.mouse.move(x, box.y + box.height / 2);
    for (let i = 0; i < 6; i++) await p.mouse.wheel(0, -200);
    await p.waitForTimeout(800);
    const back = await p.evaluate(() => ({
      num: document.querySelector(".mila-num").textContent,
      top: Math.round(document.querySelector(".mila-story-scroll").scrollTop),
    }));
    check(
      run,
      "wheel-scrolls-text-back-same-page",
      back.num === `Page ${pad(n)}` && back.top === 0,
      JSON.stringify(back),
    );
    check(run, "no-errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}

/** Ti Kannot's own switch: card text and language follow, pages still turn. */
async function kannot(browser) {
  const run = "kannot";
  const { ctx, p, errors } = await newPage(browser, "desktop");
  await openBook(p, 0, false);
  const card = () =>
    p.evaluate(() => ({
      lang: document.querySelector(".reading-card").lang,
      title: document.querySelector(".reading-title").textContent,
      gloss: !document.querySelector(".reading-gloss").hidden,
      count: document.querySelector(".reading-count").textContent,
    }));
  const gcf = await card();
  await setLang(p, "fr", false);
  await p.waitForTimeout(300);
  const fr = await card();
  await setLang(p, "bi", false);
  await p.waitForTimeout(300);
  const bi = await card();
  check(
    run,
    "switch-gcf-fr-bi",
    gcf.lang === "gcf" && fr.lang === "fr" && fr.title !== gcf.title && bi.gloss && !fr.gloss,
    JSON.stringify({ gcf, fr, bi }),
  );
  await p.locator(".reading-next").click();
  await p.waitForTimeout(1200);
  check(run, "pages-still-turn", /^2 \//.test((await card()).count));
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
  const probe = await browser.newPage();
  const renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  await probe.close();
  check("gpu", "nvidia-renderer", /NVIDIA/i.test(renderer), renderer);
  if (!/NVIDIA/i.test(renderer)) throw new Error("not on the GPU, abort");
  if (ONLY.includes("text")) await guarded("text", () => text(browser));
  if (ONLY.includes("scene")) await guarded("scene", () => scene(browser));
  if (ONLY.includes("flight")) {
    await guarded("flight", () => flight(browser, false));
    await guarded("flight-reduced", () => flight(browser, true));
  }
  if (ONLY.includes("session")) await guarded("session", () => session(browser));
  if (ONLY.includes("layout"))
    for (const vp of Object.keys(VIEWPORTS))
      await guarded(`layout-${vp}`, () => layout(browser, vp));
  if (ONLY.includes("overflow")) await guarded("overflow", () => overflow(browser));
  if (ONLY.includes("kannot")) await guarded("kannot", () => kannot(browser));
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
  const failed = results.checks.filter((c) => !c.pass);
  console.log(`\n${results.checks.length - failed.length}/${results.checks.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}
