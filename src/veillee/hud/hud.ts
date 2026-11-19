import "./hud.css";
import type { BookManifest } from "@app/contract";
import { classify } from "../gesture";
import { sectionOf, type Page, type Section } from "../pages";

/** Destinations of the permanent menu (existing pages first; see design.md §6). */
export const PROJECT_PAGE = "/le-projet/";
export const CONTACT_URL = "https://xgueret.tipunchlabs.fr/#tp-contact";
export const CATALOGUE_HASH = "#contes";
const NEW_TAB = "(s'ouvre dans un nouvel onglet)";

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HudPlacement {
  /** The selected tale's illustration on screen; null on a portrait. */
  art: ScreenRect | null;
  /** Top-left of the left page's title area. */
  title: { x: number; y: number };
  /** The right page (portrait text). */
  text: ScreenRect;
  /** Bookmark tips, in section order. */
  ribbons: { x: number; y: number }[];
}

export interface HudActions {
  /** Enter a tale with the shell's transition. */
  enter(bookId: string): void;
  /** Select a page of the book (the leaf turns towards it). */
  go(index: number): void;
}

export interface Hud {
  /** The selected page changed (at once, even while the leaf still turns). */
  select(index: number): void;
  /** A leaf is moving: the page-bound labels fade and stop taking clicks. */
  setTurning(turning: boolean): void;
  place(placement: HudPlacement): void;
  /** While false (a dive), nothing takes input. */
  setActive(active: boolean): void;
  /** The entry control of a tale, focused again on return from it. */
  entryOf(bookId: string): HTMLElement | null;
  /** The scene could not start: the book's pages show as plain HTML images. */
  showFlat(): void;
  dispose(): void;
}

/** Escapes text for innerHTML. */
const esc = (s: string): string =>
  s.replace(
    /[&<>"]/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] ?? ch,
  );

/** The tale's language for its title (`card.lang`, Kréyòl when absent). */
const langOf = (book: BookManifest): string => book.card.lang ?? "gcf";

/**
 * The home's HTML: brand and permanent menu (a Menu button on phones), the catalogue panel, the
 * book's real controls (previous / next, bookmarks named after the universes, the tale's entry
 * over its illustration, the portrait's text) and a polite live region. Painted pages never carry
 * an action: every title, arrow and link is an element here.
 */
export function createHud(
  container: HTMLElement,
  pages: readonly Page[],
  sections: readonly Section[],
  actions: HudActions,
): Hud {
  const root = document.createElement("div");
  root.className = "veillee-hud";
  const tales = pages.flatMap((p, i) => (p.kind === "tale" ? [{ page: p, index: i }] : []));
  const groups = new Map<string, typeof tales>();
  for (const t of tales) {
    const key = t.page.book.card.theme;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  root.innerHTML = `
    <header class="v-header">
      <a class="v-brand" href="/" aria-label="Contes Créoles, accueil">
        <span class="v-brand-flower" aria-hidden="true"></span>
        <span class="v-brand-name">Contes Créoles</span>
      </a>
      <button type="button" class="v-menu-toggle" aria-expanded="false" aria-controls="v-menu">Menu</button>
      <nav class="v-menu" id="v-menu" aria-label="Menu principal">
        <ul>
          <li><a href="/" aria-current="page">Accueil</a></li>
          <li><a href="${CATALOGUE_HASH}" class="v-open-catalogue">Les contes</a></li>
          <li><a href="${PROJECT_PAGE}">Le projet</a></li>
          <li><a href="${CONTACT_URL}" target="_blank" rel="noopener">Contact<span class="v-sr"> ${NEW_TAB}</span></a></li>
        </ul>
      </nav>
    </header>
    <h1 class="v-sr">Contes Créoles — un grand livre de contes de Guadeloupe</h1>
    <div class="v-stage" aria-label="Le livre des contes" role="group">
      <p class="v-title" aria-hidden="true"></p>
      <button type="button" class="v-art"></button>
      <article class="v-portrait" hidden aria-live="off">
        <h2 class="v-portrait-name" lang="gcf"></h2>
        <p class="v-portrait-fr" lang="fr"></p>
        <p class="v-portrait-text" lang="fr"></p>
      </article>
      <nav class="v-marks" aria-label="Marque-pages">
        ${sections
          .map(
            (s) =>
              `<button type="button" class="v-mark" data-page="${s.page}" lang="${esc(s.lang)}">${esc(s.label)}</button>`,
          )
          .join("")}
      </nav>
      <div class="v-flat" hidden></div>
      <div class="v-turns">
        <button type="button" class="v-prev" aria-label="Page précédente"><span aria-hidden="true">‹</span></button>
        <p class="v-status" aria-live="polite"></p>
        <button type="button" class="v-next" aria-label="Page suivante"><span aria-hidden="true">›</span></button>
      </div>
    </div>
    <div class="v-catalogue" role="dialog" aria-modal="true" aria-labelledby="v-catalogue-title" hidden>
      <div class="v-catalogue-card">
        <button type="button" class="v-catalogue-close" aria-label="Fermer la liste des contes">×</button>
        <h2 id="v-catalogue-title">Les contes</h2>
        ${[...groups.entries()]
          .map(
            ([universe, list]) => `
          <section class="v-universe">
            <h3>${esc(universe)}</h3>
            <ul>
              ${list
                .map(
                  ({ page, index }) => `
                <li>
                  <span class="v-cat-title" lang="${esc(langOf(page.book))}">${esc(page.book.card.title)}</span>
                  <span class="v-cat-actions">
                    <button type="button" class="v-cat-enter" data-book="${esc(page.id)}">Ouvrir le conte</button>
                    <button type="button" class="v-cat-show" data-page="${index}">Voir dans le livre</button>
                  </span>
                </li>`,
                )
                .join("")}
            </ul>
          </section>`,
          )
          .join("")}
      </div>
    </div>`;
  container.append(root);

  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel) as T;
  const menu = q<HTMLElement>(".v-menu");
  const toggle = q<HTMLButtonElement>(".v-menu-toggle");
  const catalogue = q<HTMLElement>(".v-catalogue");
  const title = q<HTMLElement>(".v-title");
  const art = q<HTMLButtonElement>(".v-art");
  const portrait = q<HTMLElement>(".v-portrait");
  const status = q<HTMLElement>(".v-status");
  const prev = q<HTMLButtonElement>(".v-prev");
  const next = q<HTMLButtonElement>(".v-next");
  const marks = [...root.querySelectorAll<HTMLButtonElement>(".v-mark")];
  const marksNav = q<HTMLElement>(".v-marks");
  const flat = q<HTMLElement>(".v-flat");
  let index = 0;
  let active = true;
  let catalogueReturn: HTMLElement | null = null;
  let placedKey = "";

  const page = (): Page | undefined => pages[index];

  /** The entry of the selected tale, from its title or illustration. */
  const enterSelected = (): void => {
    const p = page();
    if (active && p?.kind === "tale") actions.enter(p.id);
  };

  const openCatalogue = (): void => {
    catalogueReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    catalogue.hidden = false;
    q<HTMLButtonElement>(".v-catalogue-close").focus();
  };
  const closeCatalogue = (): void => {
    if (catalogue.hidden) return;
    catalogue.hidden = true;
    if (location.hash === CATALOGUE_HASH)
      history.replaceState(null, "", location.pathname + location.search);
    catalogueReturn?.focus();
    catalogueReturn = null;
  };
  const setMenu = (open: boolean): void => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
  };

  const onClick = (e: MouseEvent): void => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest(".v-menu-toggle"))
      return setMenu(toggle.getAttribute("aria-expanded") !== "true");
    if (target.closest(".v-open-catalogue")) {
      e.preventDefault();
      setMenu(false);
      return openCatalogue();
    }
    if (target.closest(".v-catalogue-close") || target === catalogue) return closeCatalogue();
    const enterBtn = target.closest<HTMLElement>(".v-cat-enter");
    if (enterBtn?.dataset.book) {
      const i = pages.findIndex((p) => p.id === enterBtn.dataset.book);
      catalogue.hidden = true;
      catalogueReturn = null;
      actions.go(i);
      return actions.enter(enterBtn.dataset.book);
    }
    const show = target.closest<HTMLElement>(".v-cat-show, .v-mark");
    if (show?.dataset.page) {
      if (show.classList.contains("v-cat-show")) {
        catalogue.hidden = true;
        catalogueReturn = null;
        art.focus();
      }
      return actions.go(Number(show.dataset.page));
    }
    if (target.closest(".v-prev")) return actions.go(index - 1);
    if (target.closest(".v-next")) return actions.go(index + 1);
    if (target.closest(".v-art, .v-title, .v-flat img")) {
      if (swipedAt && performance.now() - swipedAt < 400) return;
      enterSelected();
    }
  };

  // Swipe on the book: a horizontal swipe turns one page; a tap stays a click.
  let press: { x: number; y: number; t: number; id: number } | null = null;
  let swipedAt = 0;
  const onDown = (e: PointerEvent): void => {
    if (!active || e.button > 0) return;
    if (
      e.target instanceof Element &&
      e.target.closest(".v-header, .v-catalogue, .v-turns, .v-marks, .v-portrait")
    )
      return;
    press = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  };
  const onUp = (e: PointerEvent): void => {
    if (!press || e.pointerId !== press.id) return;
    const gesture = classify(e.clientX - press.x, e.clientY - press.y, performance.now() - press.t);
    press = null;
    if (gesture === "next" || gesture === "prev") {
      swipedAt = performance.now();
      actions.go(index + (gesture === "next" ? 1 : -1));
    }
  };
  const onCancel = (): void => {
    press = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!active) return;
    if (!catalogue.hidden) {
      if (e.key === "Escape") closeCatalogue();
      else if (e.key === "Tab") {
        // Keep the focus inside the open panel (aria-modal).
        const items = [...catalogue.querySelectorAll<HTMLElement>("button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
      return;
    }
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      actions.go(index + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      actions.go(index - 1);
    }
  };
  const onHash = (): void => {
    if (location.hash === CATALOGUE_HASH && catalogue.hidden) openCatalogue();
  };

  root.addEventListener("click", onClick);
  container.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", onHash);

  const hud: Hud = {
    select(i) {
      index = i;
      const p = pages[i];
      if (!p) return;
      const section = sectionOf(sections, i);
      marks.forEach((m, k) => {
        if (k === section) m.setAttribute("aria-current", "true");
        else m.removeAttribute("aria-current");
      });
      prev.disabled = i === 0;
      next.disabled = i === pages.length - 1;
      root.dataset.kind = p.kind;
      if (p.kind === "tale") {
        const { card } = p.book;
        const lang = langOf(p.book);
        title.textContent = card.title;
        title.lang = lang;
        title.hidden = p.art.titleInArt;
        art.hidden = false;
        art.lang = lang;
        art.dataset.book = p.id;
        art.setAttribute("aria-label", `${card.title} — entrer dans le conte`);
        portrait.hidden = true;
        status.textContent = `Page ${i + 1} sur ${pages.length} : ${card.title}`;
      } else {
        title.hidden = true;
        art.hidden = true;
        portrait.hidden = false;
        q<HTMLElement>(".v-portrait-name").textContent = p.portrait.name;
        q<HTMLElement>(".v-portrait-fr").textContent = p.portrait.frenchName;
        q<HTMLElement>(".v-portrait-text").textContent = p.portrait.text;
        status.textContent = `Page ${i + 1} sur ${pages.length} : portrait de ${p.portrait.name}`;
      }
      flat.querySelectorAll("figure").forEach((f, k) => {
        (f as HTMLElement).hidden = k !== i;
      });
    },
    setTurning(turning) {
      root.classList.toggle("is-turning", turning);
    },
    place(placement) {
      // Writes styles only when the projected places move (no layout work on a still frame).
      const key = JSON.stringify(placement, (_, v) => (typeof v === "number" ? Math.round(v) : v));
      if (key === placedKey) return;
      placedKey = key;
      const { art: rect, title: t, text, ribbons } = placement;
      if (rect) {
        art.style.cssText = `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`;
      }
      title.style.cssText = `left:${t.x}px;top:${t.y}px`;
      root.style.setProperty("--text-x", `${text.x}px`);
      root.style.setProperty("--text-y", `${text.y}px`);
      root.style.setProperty("--text-w", `${text.w}px`);
      root.style.setProperty("--text-h", `${text.h}px`);
      // The bookmarks' labels sit in one row just above their ribbons' tips.
      if (ribbons.length) {
        const x = ribbons.reduce((sum, r) => sum + r.x, 0) / ribbons.length;
        const y = Math.min(...ribbons.map((r) => r.y));
        marksNav.style.cssText = `left:${x}px;top:${y}px`;
      }
    },
    setActive(value) {
      active = value;
      root.classList.toggle("is-inactive", !value);
    },
    entryOf(bookId) {
      const i = pages.findIndex((p) => p.id === bookId);
      return i === index && !art.hidden ? art : null;
    },
    showFlat() {
      root.classList.add("is-flat");
      flat.hidden = false;
      flat.innerHTML = pages
        .map((p) => {
          if (p.kind === "tale")
            return `<figure hidden><img src="${esc(p.art.url)}" alt="" width="${p.art.width}" height="${p.art.height}" /></figure>`;
          return `<figure hidden class="v-flat-portrait"><canvas width="500" height="675"></canvas></figure>`;
        })
        .join("");
      flat.querySelectorAll("figure").forEach((figure, k) => {
        const p = pages[k];
        const canvas = figure.querySelector("canvas");
        const c = canvas?.getContext("2d");
        if (p?.kind !== "portrait" || !canvas || !c) return;
        c.fillStyle = "#f1e4c8";
        c.fillRect(0, 0, canvas.width, canvas.height);
        p.portrait.paint(c, canvas.width, canvas.height, 0, true);
      });
      hud.select(index);
    },
    dispose() {
      root.removeEventListener("click", onClick);
      container.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
      root.remove();
    },
  };
  if (location.hash === CATALOGUE_HASH) queueMicrotask(openCatalogue);
  return hud;
}
