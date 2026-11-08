// Tree covers, no fiche, the storyteller's random tale and the classes-page footer link, on the GPU:
// every card in Mila's layout, the book as the only entry point (pointer and keyboard), the bubble's
// call and the storyteller opening a tale at random straight on page 1, the way back, and the footer.
// Usage: [SITE=url] [OUT=dir] [VPS=desktop,mobile,...] [QA_INJECT_CSS=css] node qa/tree.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { focusIndicator } from "./focus.mjs";

const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = (process.env.OUT ?? new URL("./out/tree/", import.meta.url).pathname).replace(
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
};
const VPS = (process.env.VPS ?? "desktop,mobile").split(",");
const ACTION = "Cliquez ici pour accéder à un conte au hasard.";
const TITLES = ["Ti Kannot é Gwo Rako", "Mila et le lambi qui avait perdu son chant"];
const results = { site: SITE, checks: [] };

/** Records one check; `pass` false fails the run. */
function check(run, name, pass, detail = "") {
  results.checks.push({ run, name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${run} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Opens the tree in a fresh context; the random draw is pinned through `window.__qaRandom`. */
async function newPage(browser, vp, path = "") {
  const ctx = await browser.newContext(VIEWPORTS[vp]);
  await ctx.addInitScript(() => {
    const real = Math.random;
    Math.random = () => (typeof window.__qaRandom === "number" ? window.__qaRandom : real());
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  await p.goto(SITE + path);
  // Negative controls: a style injected into the page under test, never into the app.
  if (process.env.QA_INJECT_CSS) await p.addStyleTag({ content: process.env.QA_INJECT_CSS });
  if (!path) {
    await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 20000 });
    await p.waitForTimeout(1500);
  }
  return { ctx, p, errors };
}

const touchOf = (vp) => Boolean(VIEWPORTS[vp].hasTouch);
const press = async (loc, touch) => (touch ? loc.tap() : loc.click());
/** Taps or clicks a screen point (the 3D scene under a transparent entry point). */
const pressAt = async (p, x, y, touch) => (touch ? p.touchscreen.tap(x, y) : p.mouse.click(x, y));

/** Brings the camera to the shelf slot at `index`. */
async function approach(p, index, touch) {
  const shelf = p.locator(".tree-shelf-book").nth(index);
  if (!(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
    await press(shelf, touch);
    await p.waitForTimeout(3200);
  }
}

/** Climbs back down to the foot of the tree, where the storyteller sits. */
async function foot(p) {
  await p.mouse.move(2, 2);
  for (let i = 0; i < 12; i++) await p.mouse.wheel(0, -900);
  await p.waitForTimeout(2500);
}

/** Waits for a tale on its first page: Ti Kannot's reader at 1 / 12, or Mila's "Page 01". */
async function waitFirstPage(p, id) {
  await p.waitForFunction(
    (id) => {
      if (document.querySelector(".app")?.dataset.book !== id) return false;
      if (id === "mila")
        return (
          document.querySelector(".mila-story")?.classList.contains("is-on") &&
          document.querySelector(".mila-num")?.textContent === "Page 01"
        );
      return /^1\s*\/\s*12$/.test(document.querySelector(".reading-count")?.textContent ?? "");
    },
    id,
    { timeout: 25000, polling: 50 },
  );
}

/** Leaves the tale with Escape and waits for the tree. */
async function back(p) {
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !document.querySelector(".app")?.dataset.book, null, {
    timeout: 15000,
  });
  await p.waitForTimeout(2200);
}

/** Box of a visible element, or null. */
const box = (p, sel) =>
  p.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => !e.hidden);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);

/** Tabs until `sel` holds the focus (at most 30 presses). */
async function tabTo(p, sel) {
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press("Tab");
    if (await p.evaluate((sel) => document.activeElement?.matches(sel), sel)) return true;
  }
  return false;
}

/** Number of tale openings so far (the shell's book layer appearing). */
const openings = (p) => p.evaluate(() => window.__qaOpenings ?? 0);

async function runViewport(browser, vp) {
  const touch = touchOf(vp);
  const { ctx, p, errors } = await newPage(browser, vp);
  await p.evaluate(() => {
    window.__qaOpenings = 0;
    new MutationObserver(() => {
      const book = document.querySelector(".app")?.dataset.book;
      if (book && book !== window.__qaLast) window.__qaOpenings++;
      window.__qaLast = book;
    }).observe(document.querySelector(".app"), { attributes: true });
  });

  check(
    vp,
    "no-fiche-or-leader",
    (await p.locator(".tree-label, .tree-filet, .tree-enter, .tree-invite-open").count()) === 0,
  );

  // The storyteller's bubble near the foot of the tree, with the owner's sentence as a button. Where
  // it would cover the intro (phones), it waits for the first steps of the climb.
  const shown = () =>
    p.evaluate(() => getComputedStyle(document.querySelector(".app-bubble")).opacity === "1");
  let steps = 0;
  if (!(await shown())) {
    await p.screenshot({ path: `${OUT}${vp}-foot-intro.png` });
    for (; steps < 8 && !(await shown()); steps++) {
      await p.mouse.move(VIEWPORTS[vp].viewport.width / 2, 200);
      await p.mouse.wheel(0, 60);
      await p.waitForTimeout(700);
    }
  }
  const overlap = await p.evaluate(() => {
    const b = document.querySelector(".app-bubble").getBoundingClientRect();
    const introEl = document.querySelector(".tree-intro");
    const i = document.querySelector(".tree-intro-inner").getBoundingClientRect();
    const readable = Number(getComputedStyle(introEl).opacity) >= 0.3;
    const hit = b.left < i.right && i.left < b.right && b.top < i.bottom && i.top < b.bottom;
    return { readable, hit, opacity: getComputedStyle(introEl).opacity };
  });
  check(
    vp,
    "bubble-leaves-intro-readable",
    !(overlap.readable && overlap.hit),
    `${JSON.stringify(overlap)} after ${steps} wheel steps`,
  );
  const bubble = await p.evaluate(() => {
    const b = document.querySelector(".app-bubble");
    const a = b?.querySelector(".app-bubble-action");
    return {
      opacity: b ? getComputedStyle(b).opacity : null,
      inert: b?.inert,
      action: a?.textContent,
      lang: a?.lang,
      kreyol: b?.querySelector("[lang=gcf]")?.textContent,
    };
  });
  check(
    vp,
    "bubble-action-shown",
    bubble.opacity === "1" && !bubble.inert && bubble.action === ACTION && bubble.lang === "fr",
    JSON.stringify(bubble),
  );
  const bb = await box(p, ".app-bubble");
  const vpSize = p.viewportSize();
  check(
    vp,
    "bubble-inside-screen",
    bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.w <= vpSize.width,
    JSON.stringify(bb),
  );
  await p.screenshot({ path: `${OUT}${vp}-storyteller.png` });
  const teller = p.locator(".tree-teller");
  check(
    vp,
    "teller-entry-named",
    (await teller.isVisible()) && (await teller.textContent()) === ACTION,
  );

  // 1. The bubble's action, random draw pinned to the last tale (Mila).
  await p.evaluate(() => (window.__qaRandom = 0.99));
  const action = p.locator(".app-bubble-action");
  if (touch) await action.tap();
  else await action.dblclick();
  await waitFirstPage(p, "mila");
  await p.waitForTimeout(800);
  check(
    vp,
    "action-opens-mila-page-1-once",
    (await openings(p)) === 1,
    `openings ${await openings(p)}`,
  );
  check(
    vp,
    "no-cover-screen",
    (await p.locator(".mila-cover, .mila-enter, .mila-tocover").count()) === 0,
  );
  await back(p);
  check(
    vp,
    "back-to-tree",
    !(await p.evaluate(() => document.querySelector(".app")?.dataset.book)),
  );

  // 2. The storyteller himself (the 3D figure under his entry point), pinned to Ti Kannot.
  await foot(p);
  const tb = await box(p, ".tree-teller");
  check(vp, "teller-on-screen-after-return", Boolean(tb), JSON.stringify(tb));
  if (tb) {
    await p.evaluate(() => (window.__qaRandom = 0));
    await pressAt(p, tb.x + tb.w / 2, tb.y + tb.h * 0.55, touch);
    await waitFirstPage(p, "ti-kannot");
    check(vp, "storyteller-opens-ti-kannot-page-1", true);
    await back(p);
  }

  // 3. Every card in Mila's layout: captures of each near card and its entry point's name.
  for (const [i, title] of TITLES.entries()) {
    await approach(p, i, touch);
    const name = await p.locator("button.tree-book").textContent();
    check(vp, `card-${i}-entry-named`, name?.includes(title), name ?? "");
    const cb = await box(p, "button.tree-book");
    check(
      vp,
      `card-${i}-on-screen`,
      cb && cb.y >= 0 && cb.y + cb.h <= vpSize.height && cb.x >= 0,
      JSON.stringify(cb),
    );
    await p.screenshot({ path: `${OUT}${vp}-card-${i}.png` });
  }
  await approach(p, 2, touch);
  check(vp, "invitation-entry-is-link", await p.locator(".tree-book-invite").isVisible());
  await p.screenshot({ path: `${OUT}${vp}-card-invitation.png` });

  // 4. Pointer on the book itself opens its tale (Mila's card).
  await approach(p, 1, touch);
  const mb = await box(p, "button.tree-book");
  await pressAt(p, mb.x + mb.w / 2, mb.y + mb.h / 2, touch);
  await waitFirstPage(p, "mila");
  check(vp, "card-press-opens-its-tale", true);
  await back(p);

  // 5. Keyboard: the near card and the storyteller, each focused with a visible ring, then Enter.
  if (!touch) {
    await p.mouse.move(2, 2);
    await approach(p, 0, touch);
    await p.locator("body").focus();
    check(vp, "tab-reaches-card", await tabTo(p, "button.tree-book"));
    const ring = await focusIndicator(p, p.locator("button.tree-book"));
    check(vp, "card-focus-ring", ring.visible, JSON.stringify(ring));
    await p.keyboard.press("Enter");
    await waitFirstPage(p, "ti-kannot");
    check(vp, "enter-on-card-opens-it", true);
    await back(p);
    const refocus = await p.evaluate(() => document.activeElement?.className);
    check(vp, "focus-back-on-card", /tree-book/.test(refocus ?? ""), refocus);

    await foot(p);
    await p.locator("body").focus();
    check(vp, "tab-reaches-storyteller", await tabTo(p, ".tree-teller"));
    const tring = await focusIndicator(p, p.locator(".tree-teller"));
    check(vp, "storyteller-focus-ring", tring.visible, JSON.stringify(tring));
    await p.evaluate(() => (window.__qaRandom = 0.5));
    await p.keyboard.press("Enter");
    await waitFirstPage(p, "mila");
    check(vp, "enter-on-storyteller-opens-random-tale", true);
    await back(p);
    // The focus comes back to the storyteller while he is still on screen, else to the tale's card.
    const after = await p.evaluate(() => {
      const a = document.activeElement;
      return { cls: a?.className, hidden: a?.hidden };
    });
    check(
      vp,
      "focus-after-random-tale-on-a-visible-entry",
      /tree-book|tree-teller/.test(after.cls ?? "") && !after.hidden,
      JSON.stringify(after),
    );
  }

  // 6. The invitation still leads to the classes page (shelf: select, then open).
  await approach(p, 2, touch);
  await press(p.locator(".tree-shelf-book").nth(2), touch);
  await p.waitForURL(/\/contes-des-classes\/$/, { timeout: 10000 });
  check(vp, "invitation-opens-classes-page", true, p.url());

  check(vp, "no-console-errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** The classes page's footer: only "TiPunchLabs" links to the site, focus ring, inside the screen. */
async function runFooter(browser, vp) {
  const { ctx, p, errors } = await newPage(browser, vp, "contes-des-classes/");
  await p.waitForLoadState("networkidle");
  // The page scrolls smoothly; the focus captures need a page that stays put between them.
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(300);
  const sign = await p.evaluate(() => {
    const s = document.querySelector(".cc-sign");
    const links = [...(s?.querySelectorAll("a") ?? [])];
    const r = links[0]?.getBoundingClientRect();
    return {
      text: s?.textContent?.replace(/\s+/g, " ").trim(),
      links: links.length,
      href: links[0]?.getAttribute("href"),
      target: links[0]?.target,
      rel: links[0]?.rel,
      label: links[0]?.firstChild?.textContent,
      right: r ? r.right : null,
      height: r ? r.height : null,
    };
  });
  check(
    `footer-${vp}`,
    "only-tipunchlabs-links",
    sign.links === 1 &&
      sign.href === "https://xgueret.tipunchlabs.fr/" &&
      sign.label === "TiPunchLabs" &&
      sign.target === "_blank" &&
      /noopener/.test(sign.rel) &&
      sign.text?.startsWith("Contes Créoles, un projet TiPunchLabs"),
    JSON.stringify(sign),
  );
  check(
    `footer-${vp}`,
    "link-inside-screen",
    sign.right !== null && sign.right <= p.viewportSize().width,
    JSON.stringify(sign),
  );
  const link = p.locator(".cc-sign-link");
  await link.scrollIntoViewIfNeeded();
  const ring = await focusIndicator(p, link);
  check(`footer-${vp}`, "focus-ring", ring.visible, JSON.stringify(ring));
  await link.focus();
  await p.screenshot({ path: `${OUT}${vp}-footer.png` });
  check(`footer-${vp}`, "no-console-errors", errors.length === 0, errors.join(" | "));
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
  for (const vp of VPS) {
    await runViewport(browser, vp);
    await runFooter(browser, vp);
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
}
const failed = results.checks.filter((c) => !c.pass);
console.log(`${results.checks.length - failed.length}/${results.checks.length} PASS`);
process.exit(failed.length ? 1 : 0);
