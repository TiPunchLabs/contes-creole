import type { BookManifest } from "@app/contract";
import { clamp } from "@shared/math";
import { createShelf, type ShelfAction } from "./shelf";

export interface CardLabel {
  index: number;
  /** Screen point just below the card. */
  x: number;
  y: number;
  /** Screen y of the card's centre. */
  cy: number;
  opacity: number;
  book: BookManifest;
}

const BRAND_ICON = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="11" r="9" fill="#7fb24e"/><circle cx="9" cy="14" r="6" fill="#6aa043"/><circle cx="21" cy="14" r="6" fill="#8cc05a"/><rect x="13" y="16" width="4" height="11" rx="2" fill="#9a6a46"/><circle cx="15" cy="20" r="1.6" fill="#ffcf7e"/></svg>`;
const MOUSE = `<svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8"/><circle cx="9" cy="8" r="2" fill="currentColor"/></svg>`;
const BOOK_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5c2.5-1 4.8-.8 7 .8 2.2-1.6 4.5-1.8 7-.8v11c-2.5-1-4.8-.8-7 .8-2.2-1.6-4.5-1.8-7-.8z"/><path d="M10 5.3v11"/></svg>`;

/** Viewport width under which the fiche docks above the shelf (overlay.css uses the same value). */
export const DOCK = 900;
const EDGE = 16;
/** Room kept for the climb bar on the right edge. */
const RAIL = 48;
/** Room kept for the brand badge and credit link on wide screens. */
const TOP_CLEAR = 104;
const SHELF_GAP = 14;
const LEADER = 48;

export interface FicheBox {
  left: number;
  top: number;
  /** Leader line x1, y1 (card end) and x2, y2 (fiche end), or null when there is no room for one. */
  line: [number, number, number, number] | null;
}

/**
 * Places the near-book fiche in screen pixels. Wide: beside the card on the side of the screen with
 * more room, centred on the card, with a horizontal leader from the card's edge. Narrow: docked and
 * centred above the shelf, with a vertical leader from below the card. Never under the shelf.
 */
export function placeFiche(
  card: { x: number; y: number; cy: number },
  fiche: { width: number; height: number },
  view: { width: number; shelfTop: number },
): FicheBox {
  const bottom = view.shelfTop - fiche.height - SHELF_GAP;
  if (view.width < DOCK) {
    const left = Math.round((view.width - fiche.width) / 2);
    const top = Math.round(bottom);
    const x = Math.round(clamp(card.x, left + 24, left + fiche.width - 24));
    // Decided on the card's centre, not its bottom, so a swaying card never makes the leader blink;
    // a leader that would start inside the fiche shrinks to nothing under it.
    const y = Math.round(Math.min(card.y, top));
    return { left, top, line: card.cy < top ? [x, y, x, top] : null };
  }
  // The card is 1.5 x 2.1 units and `y` sits 1.25 units under its centre: half-width = 0.6 (y - cy).
  const half = Math.max(0, (card.y - card.cy) * 0.6);
  const toRight = card.x < view.width / 2;
  const from = toRight ? card.x + half : card.x - half;
  const left = Math.round(
    clamp(
      toRight ? from + LEADER : from - LEADER - fiche.width,
      EDGE,
      view.width - fiche.width - RAIL,
    ),
  );
  const top = Math.round(Math.min(bottom, Math.max(TOP_CLEAR, card.cy - fiche.height / 2)));
  const to = toRight ? left : left + fiche.width;
  const clear = toRight ? to > from : to < from;
  const ly = clamp(card.cy, top + 20, top + fiche.height - 20);
  return {
    left,
    top,
    line: clear ? [Math.round(from), Math.round(card.cy), to, Math.round(ly)] : null,
  };
}

/** Tree HUD: brand badge, intro panel, near-book fiche with its leader line, climb bar, shelf. */
export function createTreeOverlay(
  container: HTMLElement,
  books: BookManifest[],
  handlers: { onEnter(bookId: string): void; onShelf(index: number, action: ShelfAction): void },
): { update(t: number, label: CardLabel | null, near: number): void; dispose(): void } {
  const el = document.createElement("div");
  el.className = "tree-overlay";
  el.innerHTML = `
    <div class="tree-brand">
      ${BRAND_ICON}
      <div class="tree-brand-text">
        <div class="tree-brand-title">Pyébwa a Konesans</div>
        <div class="tree-brand-sub">Kont Gwadloup</div>
      </div>
    </div>
    <a class="tree-credit" lang="fr" href="https://xgueret.tipunchlabs.fr/" target="_blank" rel="noopener">Imaginé par xgueret</a>
    <div class="tree-intro"><div class="tree-intro-inner">
      <p class="tree-intro-title">Chak fèy sé on kont.</p>
      <p class="tree-intro-text" lang="fr">Chaque feuille est un conte. Tourne autour de l'arbre pour trouver le tien !</p>
      <div class="tree-intro-hint">${MOUSE}<span lang="fr">Fais défiler · Glisse avec le doigt</span></div>
    </div></div>
    <svg class="tree-filet" aria-hidden="true"><line /><circle r="5" /></svg>
    <div class="tree-label">
      <div class="tree-label-kicker"></div>
      <div class="tree-label-title"></div>
      <div class="tree-label-sub"></div>
      <button type="button" class="tree-enter" hidden>${BOOK_ICON}<span>Antré adan kont-la</span></button>
      <div class="tree-locked" hidden>Talè · <span lang="fr">bientôt dans l'arbre</span></div>
    </div>
    <div class="tree-climb"><div class="tree-climb-thumb"></div></div>`;
  container.append(el);
  const part = (selector: string): HTMLElement => {
    const found = el.querySelector<HTMLElement>(selector);
    if (!found) throw new Error(`tree overlay: missing ${selector}`);
    return found;
  };
  const intro = part(".tree-intro");
  const label = part(".tree-label");
  const kicker = part(".tree-label-kicker");
  const title = part(".tree-label-title");
  const sub = part(".tree-label-sub");
  const filet = part(".tree-filet");
  const leader = filet.querySelector("line");
  const dot = filet.querySelector("circle");
  const enter = part(".tree-enter");
  const locked = part(".tree-locked");
  const thumb = part(".tree-climb-thumb");
  const shelf = createShelf(el, books, handlers.onShelf);
  const shelfEl = part(".tree-shelf");
  let current: BookManifest | null = null;
  let shownNear = -2;
  let shownBook: BookManifest | null = null;
  enter.addEventListener("click", () => {
    if (current) handlers.onEnter(current.id);
  });

  return {
    update(t, next, near) {
      intro.style.opacity = String(Math.max(0, 1 - t * 9));
      thumb.style.top = `calc((100% - 24px) * ${t})`;
      if (near !== shownNear) {
        shownNear = near;
        shelf.setNear(near);
      }
      current = next ? next.book : null;
      if (!next) {
        label.style.opacity = "0";
        filet.style.opacity = "0";
        enter.hidden = true;
        locked.hidden = true;
        shownBook = null;
        return;
      }
      if (next.book !== shownBook) {
        shownBook = next.book;
        const { ready, card } = next.book;
        // Themes follow the "Kréyòl · Français" format: the French half gets its own lang.
        const [gcf, fr] = card.theme.split(" · ");
        const french = document.createElement("span");
        french.lang = "fr";
        french.textContent = fr ?? "";
        kicker.replaceChildren(`${next.index + 1} — ${gcf}`, ...(fr ? [" · ", french] : []));
        title.textContent = card.title;
        sub.textContent = card.sub;
        sub.hidden = !ready;
        enter.hidden = !ready;
        locked.hidden = ready;
        label.classList.toggle("is-locked", !ready);
      }
      const box = placeFiche(
        next,
        { width: label.offsetWidth, height: label.offsetHeight },
        { width: container.clientWidth, shelfTop: shelfEl.offsetTop },
      );
      label.style.left = `${box.left}px`;
      label.style.top = `${box.top}px`;
      label.style.opacity = String(next.opacity);
      filet.style.opacity = box.line ? String(next.opacity) : "0";
      if (box.line && leader && dot) {
        const [x1, y1, x2, y2] = box.line;
        leader.setAttribute("x1", String(x1));
        leader.setAttribute("y1", String(y1));
        leader.setAttribute("x2", String(x2));
        leader.setAttribute("y2", String(y2));
        dot.setAttribute("cx", String(x1));
        dot.setAttribute("cy", String(y1));
      }
    },
    dispose() {
      shelf.dispose();
      el.remove();
    },
  };
}
