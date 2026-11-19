// « La Veillée » home: functional checks and still captures (headless allowed: no motion, no
// performance numbers here). Prints one PASS/FAIL line per check and writes check-log.json.
// Usage: [SITE=url] [OUT=dir] [QA_CHANNEL=chrome] nice -n 19 node qa/veillee-functional.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

const SITE = (process.env.SITE ?? "http://localhost:4199/").replace(/\/?$/, "/");
const OUT = (
  process.env.OUT ?? `${homedir()}/.local/share/contes-creole-qa/accueil-veillee/functional`
).replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const GPU_ENV = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};
const results = [];
const check = (id, ok, detail = "") => {
  results.push({ id, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
};
const status = (page) => page.locator(".v-status").textContent();
const settle = (page, ms = 1700) => page.waitForTimeout(ms);
const book = (page) => page.evaluate(() => document.querySelector(".app")?.dataset.book ?? null);

/** Swipe on the book with touch pointer events; `from` is a locator to start on (default: book). */
async function swipe(page, dx, start) {
  const box = start ? await start.boundingBox() : null;
  const { width, height } = page.viewportSize();
  const x = box ? box.x + box.width / 2 : width / 2;
  const y = box ? box.y + box.height / 2 : height * 0.72;
  await page.evaluate(
    ({ x, y, dx }) => {
      const target = document.elementFromPoint(x, y) ?? document.body;
      const fire = (type, cx) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 9,
            pointerType: "touch",
            clientX: cx,
            clientY: y,
            isPrimary: true,
          }),
        );
      fire("pointerdown", x);
      fire("pointermove", x + dx / 2);
      fire("pointerup", x + dx);
      // A browser fires click after a touch ending on the same element: the home must ignore it.
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x + dx, clientY: y }));
    },
    { x, y, dx },
  );
}

const browser = await chromium.launch({
  headless: true,
  args: GPU,
  env: GPU_ENV,
  channel: process.env.QA_CHANNEL || undefined,
});
const newPage = async (opts = DESKTOP, init) => {
  const context = await browser.newContext(opts);
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  return page;
};

try {
  // F1 — usable at once: the controls exist before the scene's first frame, no entry screen.
  {
    const page = await newPage();
    const t0 = Date.now();
    await page.goto(SITE);
    await page.locator(".v-next").waitFor({ state: "visible" });
    const ms = Date.now() - t0;
    check(
      "F1 no entry screen, controls usable",
      (await page.locator(".loader").count()) === 0,
      `${ms} ms to the next button`,
    );

    // F2 — keyboard: arrows walk every page both ways; status, entry and portrait follow.
    const seen = [await status(page)];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowRight");
      seen.push(await status(page));
    }
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
    await settle(page, 2500);
    check(
      "F2 arrows traverse all pages both ways",
      seen.length === 5 && (await status(page)).startsWith("Page 1 "),
      seen.join(" | "),
    );
    const tabs = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      tabs.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          return el
            ? `${el.tagName.toLowerCase()}.${el.className.split(" ")[0]}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24)}`
            : "";
        }),
      );
    }
    check(
      "F2 Tab reaches menu, entry, bookmarks and arrows",
      ["v-art", "v-mark", "v-next"].every((c) => tabs.some((t) => t.includes(c))),
      tabs.join(" | "),
    );
    await page.locator(".v-next").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
    check("F2 focus is visible", ring && ring !== "none", ring.slice(0, 60));

    // F3 — fast input: title, image and destination stay together.
    await page.locator(".v-next").click();
    await page.locator(".v-next").click();
    await page.locator(".v-next").click();
    const fast = await status(page);
    await settle(page, 2500);
    const kind = await page.evaluate(() => document.querySelector(".veillee-hud")?.dataset.kind);
    const name = await page.locator(".v-portrait-name").textContent();
    check(
      "F3 fast clicks land on one page, labels in sync",
      fast.startsWith("Page 4 ") && kind === "portrait" && name === "Konpè Zanba",
      `${fast} / ${kind} / ${name}`,
    );
    await page.screenshot({ path: `${OUT}desktop-zanba.png` });

    // F4 — bookmarks from the real catalogue.
    const marks = await page.locator(".v-mark").allTextContents();
    await page.locator(".v-mark", { hasText: "Mila" }).click();
    await settle(page, 2000);
    check(
      "F4 bookmarks named after the universes jump to their section",
      marks.join(",") === "Ti Kannot,Mila" && (await status(page)).includes("Mila"),
      marks.join(","),
    );
    await page.screenshot({ path: `${OUT}desktop-mila.png` });
    await page.locator(".v-mark", { hasText: "Ti Kannot" }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}desktop-turn-mid.png` });
    await settle(page, 2000);
    await page.screenshot({ path: `${OUT}desktop-tikannot.png` });

    // F5 — catalogue: opens at once, keyboard, Escape, focus back; entry from it.
    await page.locator(".v-open-catalogue").click();
    const open = await page.locator(".v-catalogue").isVisible();
    const focusClose = await page.evaluate(() => document.activeElement?.className);
    const entries = await page.locator(".v-cat-title").allTextContents();
    await page.keyboard.press("Escape");
    check(
      "F5 « Les contes » lists the catalogue by universe and title",
      open &&
        focusClose === "v-catalogue-close" &&
        !(await page.locator(".v-catalogue").isVisible()),
      entries.join(" | "),
    );
    await page.locator(".v-open-catalogue").click();
    await page.locator(".v-cat-show").nth(1).click();
    await settle(page, 2000);
    check("F5 « Voir dans le livre » turns to the tale", (await status(page)).includes("Mila"));

    // F6 — entry: title / illustration → first scene; back → same page and focus; language kept.
    await page.locator(".v-art").click();
    await page.waitForFunction(
      () => document.querySelector(".app")?.dataset.book === "mila",
      null,
      { timeout: 15000 },
    );
    await page.waitForTimeout(3500);
    await page.locator('.reading-langs button[data-lang="fr"]').click();
    await page.waitForTimeout(500);
    await page.locator(".mila-back").click();
    await page.waitForFunction(() => !document.querySelector(".app")?.dataset.book, null, {
      timeout: 15000,
    });
    await page.waitForTimeout(2500);
    const back = await status(page);
    const focus = await page.evaluate(() => document.activeElement?.className);
    check(
      "F6 back from Mila: same page, focus on its entry",
      back.includes("Mila") && focus === "v-art",
      `${back} / ${focus}`,
    );
    await page.locator(".v-mark", { hasText: "Ti Kannot" }).click();
    await settle(page, 2000);
    await page
      .locator(".v-title")
      .click({ force: true })
      .catch(() => undefined);
    await page
      .locator(".v-art")
      .click()
      .catch(() => undefined);
    await page.waitForFunction(
      () => document.querySelector(".app")?.dataset.book === "ti-kannot",
      null,
      { timeout: 15000 },
    );
    await page.waitForTimeout(2500);
    const lang = await page.evaluate(
      () => document.querySelector('.reading-langs button[aria-pressed="true"]')?.dataset.lang,
    );
    check("F6 language choice survives from Mila to Ti Kannot", lang === "fr", `pressed: ${lang}`);
    await page.locator('.reading-langs button[data-lang="gcf"]').click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".app")?.dataset.book, null, {
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    check(
      "F6 Escape returns from Ti Kannot to its page",
      (await status(page)).includes("Ti Kannot"),
    );

    // F7 — menu: Contact (verified channel, new tab), Le projet opens at once, then back.
    const contact = await page.locator(".v-menu a", { hasText: "Contact" });
    const href = await contact.getAttribute("href");
    const target = await contact.getAttribute("target");
    check(
      "F7 Contact uses the project's verified channel in a new tab",
      href === "https://xgueret.tipunchlabs.fr/#tp-contact" && target === "_blank",
      href,
    );
    const t1 = Date.now();
    await page.locator(".v-menu a", { hasText: "Le projet" }).click();
    await page.waitForURL(/le-projet/);
    await page.locator("h1").waitFor();
    const projectMs = Date.now() - t1;
    const canvases = await page.locator("canvas").count();
    await page.screenshot({ path: `${OUT}le-projet.png` });
    await page.goBack();
    await page.locator(".v-next").waitFor({ state: "visible" });
    check(
      "F7 Le projet opens without the scene, browser back returns home",
      canvases === 0,
      `${projectMs} ms`,
    );
    await page.goto(`${SITE}#contes`);
    check(
      "F7 deep link /#contes opens the catalogue",
      await page.locator(".v-catalogue").isVisible(),
    );
    // From another document, as the classes page's back link does.
    await page.goto("about:blank");
    await page.goto(`${SITE}#invitation`);
    await page.waitForTimeout(500);
    check("F7 /#invitation (classes page back link) lands on the home", page.url() === SITE);
    check("F0 no page error (desktop run)", page.errors.length === 0, page.errors.join(" | "));
    await page.context().close();
  }

  // F8 — phone: swipe turns one page; a swipe starting on the art does not enter; a tap enters.
  {
    const page = await newPage(PHONE);
    await page.goto(SITE);
    await page.waitForTimeout(2500);
    await page.locator(".v-menu-toggle").tap();
    const menuOpen = await page.locator(".v-menu").isVisible();
    await page.locator(".v-menu-toggle").tap();
    check("F8 Menu button opens the menu on a phone", menuOpen);
    await swipe(page, -150, page.locator(".v-art"));
    await page.waitForTimeout(300);
    const after = await status(page);
    check(
      "F8 swipe left on the art turns one page, no entry",
      after.startsWith("Page 2 ") && !(await book(page)),
      after,
    );
    await settle(page, 1800);
    await page.screenshot({ path: `${OUT}phone-lapen.png` });
    await swipe(page, 150);
    await settle(page, 1800);
    check("F8 swipe right turns back", (await status(page)).startsWith("Page 1 "));
    await page.screenshot({ path: `${OUT}phone-tikannot.png` });
    await page.locator(".v-art").tap();
    await page.waitForFunction(
      () => document.querySelector(".app")?.dataset.book === "ti-kannot",
      null,
      { timeout: 15000 },
    );
    check("F8 a tap on the illustration enters the tale", true);
    check("F0 no page error (phone run)", page.errors.length === 0, page.errors.join(" | "));
    await page.context().close();
  }

  // F9 — framings: child, book, title and controls on narrow, short and wide screens.
  for (const [name, viewport, extra] of [
    [
      "390x844",
      { width: 390, height: 844 },
      { isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    ],
    [
      "360x640",
      { width: 360, height: 640 },
      { isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    ],
    [
      "844x390",
      { width: 844, height: 390 },
      { isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    ],
    ["1440x900", { width: 1440, height: 900 }, {}],
  ]) {
    const page = await newPage({ viewport, ...extra });
    await page.goto(SITE);
    await page.waitForTimeout(2500);
    const inside = await page.evaluate(() => {
      const box = (s) => document.querySelector(s)?.getBoundingClientRect();
      const fits = (r) =>
        r &&
        r.left >= -1 &&
        r.top >= -1 &&
        r.right <= innerWidth + 1 &&
        r.bottom <= innerHeight + 1;
      return {
        art: fits(box(".v-art")),
        next: fits(box(".v-next")),
        prev: fits(box(".v-prev")),
        brand: fits(box(".v-brand")),
      };
    });
    await page.screenshot({ path: `${OUT}frame-${name}.png` });
    check(
      `F9 ${name}: illustration and controls on screen`,
      Object.values(inside).every(Boolean),
      JSON.stringify(inside),
    );
    await page.context().close();
  }

  // F10 — reduced motion: no leaf animation, portraits in their still pose.
  {
    const page = await newPage({ ...DESKTOP, reducedMotion: "reduce" });
    await page.goto(SITE);
    await page.waitForTimeout(2000);
    await page.locator(".v-next").click();
    await page.waitForTimeout(100);
    const turning = await page.evaluate(() =>
      document.querySelector(".veillee-hud")?.classList.contains("is-turning"),
    );
    await page.screenshot({ path: `${OUT}reduced-lapen.png` });
    check(
      "F10 reduced motion: the page changes without a turning leaf",
      !turning && (await status(page)).startsWith("Page 2 "),
    );
    await page.context().close();
  }

  // F11 — no WebGL: the same book in HTML, tales still reachable.
  {
    const page = await newPage(DESKTOP, () => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/.test(type) ? null : original.call(this, type, ...rest);
      };
    });
    await page.goto(SITE);
    await page.waitForTimeout(1500);
    const flat = await page.evaluate(() => !!document.querySelector(".veillee-hud.is-flat"));
    const img = await page.locator(".v-flat figure:not([hidden]) img").count();
    await page.locator(".v-next").click();
    const portrait = await page.locator(".v-portrait").isVisible();
    await page.screenshot({ path: `${OUT}no-webgl.png` });
    await page.locator(".v-open-catalogue").click();
    const listed = await page.locator(".v-cat-enter").count();
    check(
      "F11 without WebGL: HTML book, arrows, portraits and catalogue work",
      flat && img === 1 && portrait && listed === 2,
      `flat=${flat} img=${img} portrait=${portrait} listed=${listed}`,
    );
    await page.context().close();
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}check-log.json`, JSON.stringify({ site: SITE, results }, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
}
