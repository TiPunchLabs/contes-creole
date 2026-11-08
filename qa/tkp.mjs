// Ti Kannot poster redesign (TKP) on the GPU: Ti Kannot's card in the tree (Mila's layout since TREE-COVER), no language panel in the
// tale, the three languages, all twelve pages, the way back, the foliage wind and its stillness under
// reduced motion, and Mila still opening on page 1. Real time.
// Usage: [SITE=url] [OUT=dir] [ONLY=cover,cards,tale,wind,mila] [VPS=desktop,mobile,...] node qa/tkp.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/tkp/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "cover,cards,tale,wind,mila").split(",");
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
};
const VPS = (process.env.VPS ?? "desktop,mobile").split(",");
const results = { site: SITE, checks: [] };

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

const touchOf = (vp) => Boolean(VIEWPORTS[vp].hasTouch);
const press = async (loc, touch) => (touch ? loc.tap() : loc.click());

/** Brings the camera to the shelf book at `index` (0 Ti Kannot, 1 Mila). */
async function approach(p, index, touch) {
  const shelf = p.locator(".tree-shelf-book").nth(index);
  if (!(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
    await press(shelf, touch);
    await p.waitForTimeout(3200);
  }
  return shelf;
}

/** Share of pixels that differ by more than `tol` (0..255 per channel) between two PNG buffers. */
async function changed(page, a, b, tol = 10) {
  return page.evaluate(
    async ({ a, b, tol }) => {
      const load = async (s) => {
        const blob = await (await fetch(`data:image/png;base64,${s}`)).blob();
        const img = await createImageBitmap(blob);
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, img.width, img.height).data;
      };
      const [x, y] = await Promise.all([load(a), load(b)]);
      let n = 0;
      for (let i = 0; i < x.length; i += 4) {
        const d = Math.max(
          Math.abs(x[i] - y[i]),
          Math.abs(x[i + 1] - y[i + 1]),
          Math.abs(x[i + 2] - y[i + 2]),
        );
        if (d > tol) n++;
      }
      return n / (x.length / 4);
    },
    { a: a.toString("base64"), b: b.toString("base64"), tol },
  );
}

const docked = (vp) => VIEWPORTS[vp].viewport.width < 900;

/**
 * The near card whole on screen, above the shelf (since TREE-PANEL there is no fiche to clear): its
 * keyboard entry point covers the card, so its box is the card's.
 */
async function clears(p, run, name, knownLimit = false) {
  const fit = await p.evaluate(() => {
    const el = [...document.querySelectorAll(".tree-book")].find((e) => !e.hidden);
    const r = el?.getBoundingClientRect();
    const shelf = document.querySelector(".tree-shelf").getBoundingClientRect();
    return r
      ? { top: Math.round(r.top), bottom: Math.round(r.bottom), shelfTop: Math.round(shelf.top) }
      : null;
  });
  const pass = fit !== null && fit.top >= 0 && fit.bottom <= fit.shelfTop + 1;
  if (!pass && knownLimit) {
    // Owner ruling TKP-R2: on very short phones the invitation's card may not fit whole; recorded,
    // not failed, until the tree's book layout is reworked.
    results.checks.push({ run, name, pass: true, known: true, detail: JSON.stringify(fit) });
    console.log(`KNOWN ${run} ${name} — ${JSON.stringify(fit)} (TKP-R2)`);
    return;
  }
  check(run, name, pass, JSON.stringify(fit));
}

/** Mila's and the invitation's cards on a docked screen, as they come near and after a return. */
async function cards(browser, vp) {
  if (!docked(vp)) return;
  const touch = touchOf(vp);
  const { ctx, p, errors } = await newPage(browser, vp);
  const run = `cards.${vp}`;
  const short = VIEWPORTS[vp].viewport.height < 640;
  for (const [index, name] of [
    [1, "mila"],
    [2, "invitation"],
  ]) {
    await approach(p, index, touch);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${OUT}${vp}-${name}-near.png` });
    await clears(p, run, `${name} card whole above the shelf`, name === "invitation" && short);
  }
  // Back from Mila: the tree comes back on Mila's card.
  const mila = await approach(p, 1, touch);
  await p.waitForTimeout(1500);
  await press(mila, touch);
  await p.waitForFunction(
    () => document.querySelector(".mila-num")?.textContent === "Page 01",
    null,
    {
      timeout: 25000,
    },
  );
  await p.keyboard.press("Escape");
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${OUT}${vp}-mila-returned.png` });
  await clears(p, run, "mila card whole after the way back");
  // Back from the classes page: the tree comes back on the invitation.
  await approach(p, 2, touch);
  await p.waitForTimeout(1500);
  await press(p.locator(".tree-shelf-book.is-invitation"), touch);
  await p.waitForURL("**/contes-des-classes/");
  await press(p.locator(".cc-top .cc-back"), touch);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
  await p.waitForTimeout(7000);
  await p.screenshot({ path: `${OUT}${vp}-invitation-returned.png` });
  await clears(p, run, "invitation card whole after the way back", short);
  check(run, "no errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** The poster card in the tree, near and readable, and its accessible name. */
async function cover(browser, vp) {
  const { ctx, p, errors } = await newPage(browser, vp);
  const shelf = await approach(p, 0, touchOf(vp));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}${vp}-cover.png` });
  if (docked(vp)) await clears(p, `cover.${vp}`, "the whole card above the shelf");
  const name = await shelf.getAttribute("aria-label");
  const text = (await shelf.textContent()) ?? "";
  check(
    `cover.${vp}`,
    "shelf keeps the tale's title",
    /Ti Kannot é Gwo Rako/.test(name ?? text),
    name ?? text,
  );
  check(`cover.${vp}`, "no errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** The tale: no language panel, the three languages, all pages, the way back. */
async function tale(browser, vp) {
  const touch = touchOf(vp);
  const { ctx, p, errors } = await newPage(browser, vp);
  const shelf = await approach(p, 0, touch);
  await press(shelf, touch);
  await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
  await p.waitForTimeout(3000);
  const run = `tale.${vp}`;
  const burgers = await p.locator(".lang-burger:visible").count();
  check(run, "no language-panel burger", burgers === 0, `${burgers} visible`);
  check(run, "no language-panel dialog", (await p.locator(".lang-panel:visible").count()) === 0);
  const langs = await p
    .locator(".reading-langs button")
    .evaluateAll((bs) => bs.map((b) => b.dataset.lang));
  check(
    run,
    "language switch offers Kréyòl, Bileng, Français",
    langs.join() === "gcf,bi,fr",
    langs.join(),
  );
  const counts = [];
  for (let i = 1; i <= 12; i++) {
    counts.push(await p.locator(".reading-count").textContent());
    if (i < 12) {
      await press(p.locator(".reading-next"), touch);
      await p.waitForTimeout(900);
    }
  }
  check(
    run,
    "pages 1 to 12 in order",
    counts.join("|") === Array.from({ length: 12 }, (_, i) => `${i + 1} / 12`).join("|"),
    counts.join("|"),
  );
  const titles = {};
  for (const lang of ["gcf", "bi", "fr"]) {
    await press(p.locator(`.reading-langs button[data-lang="${lang}"]`), touch);
    await p.waitForTimeout(500);
    titles[lang] = {
      title: await p.locator(".reading-title").textContent(),
      cardLang: await p.locator(".reading-card").getAttribute("lang"),
      gloss: await p.locator(".reading-gloss").isVisible(),
      count: await p.locator(".reading-count").textContent(),
    };
  }
  await p.screenshot({ path: `${OUT}${vp}-p12-fr.png` });
  check(
    run,
    "Kréyòl card",
    titles.gcf.cardLang === "gcf" && !titles.gcf.gloss,
    JSON.stringify(titles.gcf),
  );
  check(
    run,
    "Bileng adds the French",
    titles.bi.cardLang === "gcf" && titles.bi.gloss,
    JSON.stringify(titles.bi),
  );
  check(
    run,
    "Français card",
    titles.fr.cardLang === "fr" && titles.fr.title !== titles.gcf.title,
    JSON.stringify(titles.fr),
  );
  check(
    run,
    "language change keeps the page",
    ["gcf", "bi", "fr"].every((l) => titles[l].count === "12 / 12"),
  );
  await press(p.locator(`.reading-langs button[data-lang="gcf"]`), touch);
  await press(p.locator(".reading-back"), touch);
  await p.waitForTimeout(3500);
  const back = await p.evaluate(() => ({
    tree: !document.querySelector(".app-tree")?.hidden,
    reading: !document.querySelector(".reading")?.hidden,
  }));
  check(run, "way back to the tree", back.tree && !back.reading, JSON.stringify(back));
  check(run, "no errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Foliage sways in normal motion and keeps still with reduced motion (page 2, scène seule). */
async function wind(browser, vp) {
  const shares = {};
  for (const motion of ["no-preference", "reduce"]) {
    const touch = touchOf(vp);
    const { ctx, p, errors } = await newPage(browser, vp, { reducedMotion: motion });
    const shelf = await approach(p, 0, touch);
    await press(shelf, touch);
    await p.waitForSelector(".reading:not([hidden])", { timeout: 20000 });
    await press(p.locator(".reading-next"), touch);
    await p.waitForTimeout(6000);
    await press(p.locator(".reading-toggle"), touch);
    await p.waitForTimeout(3000);
    // Upper half of the frame: crowns and houses, above the river and the sea glints.
    const clip = {
      x: 0,
      y: 0,
      width: VIEWPORTS[vp].viewport.width,
      height: VIEWPORTS[vp].viewport.height / 2,
    };
    const a = await p.screenshot({ clip });
    await p.waitForTimeout(1200);
    const b = await p.screenshot({ clip });
    shares[motion] = await changed(p, a, b);
    if (motion === "reduce") await p.screenshot({ path: `${OUT}${vp}-calm-p2.png` });
    check(`wind.${vp}.${motion}`, "no errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  const detail = `changed ${(shares["no-preference"] * 100).toFixed(2)} % vs ${(shares.reduce * 100).toFixed(2)} % calm`;
  check(`wind.${vp}`, "foliage moves", shares["no-preference"] > 0.025, detail);
  check(
    `wind.${vp}`,
    "reduced motion is stiller",
    shares.reduce < shares["no-preference"] * 0.6,
    detail,
  );
}

/** Mila still opens straight on its page 1 and goes back to the tree. */
async function mila(browser, vp) {
  const touch = touchOf(vp);
  const { ctx, p, errors } = await newPage(browser, vp);
  const shelf = await approach(p, 1, touch);
  await p.screenshot({ path: `${OUT}${vp}-mila-card.png` });
  await press(shelf, touch);
  await p.waitForFunction(
    () =>
      document.querySelector(".mila-story")?.classList.contains("is-on") &&
      document.querySelector(".mila-num")?.textContent === "Page 01",
    null,
    { timeout: 25000, polling: 50 },
  );
  check(`mila.${vp}`, "opens on page 1", true);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(3500);
  const tree = await p.evaluate(() => !document.querySelector(".app-tree")?.hidden);
  check(`mila.${vp}`, "Escape goes back to the tree", tree);
  check(`mila.${vp}`, "no errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

const browser = await chromium.launch({ args: GPU, env: GPU_ENV });
try {
  const probe = await browser.newPage();
  results.renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  await probe.close();
  console.log("renderer", results.renderer);
  if (!/NVIDIA/.test(results.renderer)) throw new Error("not on the NVIDIA GPU, abort");
  for (const vp of VPS) {
    if (ONLY.includes("cover")) await cover(browser, vp);
    if (ONLY.includes("cards")) await cards(browser, vp);
    if (ONLY.includes("tale")) await tale(browser, vp);
    if (ONLY.includes("wind")) await wind(browser, vp);
    if (ONLY.includes("mila")) await mila(browser, vp);
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
}
const failed = results.checks.filter((c) => !c.pass).length;
console.log(`${results.checks.length - failed}/${results.checks.length} checks pass`);
process.exit(failed ? 1 : 0);
