import type { BookManifest } from "@app/contract";
import { createShelf, type ShelfAction } from "./shelf";

export interface CardLabel {
  x: number;
  y: number;
  opacity: number;
  book: BookManifest;
}

const BRAND_ICON = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="11" r="9" fill="#7fb24e"/><circle cx="9" cy="14" r="6" fill="#6aa043"/><circle cx="21" cy="14" r="6" fill="#8cc05a"/><rect x="13" y="16" width="4" height="11" rx="2" fill="#9a6a46"/><circle cx="15" cy="20" r="1.6" fill="#ffcf7e"/></svg>`;
const MOUSE = `<svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8"/><circle cx="9" cy="8" r="2" fill="currentColor"/></svg>`;
const BOOK_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5c2.5-1 4.8-.8 7 .8 2.2-1.6 4.5-1.8 7-.8v11c-2.5-1-4.8-.8-7 .8-2.2-1.6-4.5-1.8-7-.8z"/><path d="M10 5.3v11"/></svg>`;

const SHELF_GAP = 10;

/** Top of the near-card label: the card's y, lifted so the label never slides under the shelf. */
export function labelTop(y: number, labelHeight: number, shelfTop: number): number {
  return Math.min(y, shelfTop - labelHeight - SHELF_GAP);
}

/** Tree HUD (v14): brand badge, intro panel, near-card label and enter button, climb bar, shelf. */
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
        <div class="tree-brand-title">Pyébwa a Sav</div>
        <div class="tree-brand-sub">Kont Gwadloup</div>
      </div>
    </div>
    <a class="tree-credit" href="https://xgueret.tipunchlabs.fr/" target="_blank" rel="noopener">Imaginé par xgueret</a>
    <div class="tree-intro"><div class="tree-intro-inner">
      <p class="tree-intro-title">Chak fèy sé on kont.</p>
      <p class="tree-intro-text">Chaque feuille est un conte. Tourne autour de l'arbre pour trouver le tien !</p>
      <div class="tree-intro-hint">${MOUSE}<span>Fais défiler · Glisse avec le doigt</span></div>
    </div></div>
    <div class="tree-label">
      <div class="tree-label-title"></div>
      <button type="button" class="tree-enter" hidden>${BOOK_ICON}<span>Antré adan kont-la</span></button>
      <div class="tree-locked" hidden>Talè · bientôt dans l'arbre</div>
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
  const title = part(".tree-label-title");
  const enter = part(".tree-enter");
  const locked = part(".tree-locked");
  const thumb = part(".tree-climb-thumb");
  const shelf = createShelf(el, books, handlers.onShelf);
  const shelfEl = part(".tree-shelf");
  let current: BookManifest | null = null;
  let shownNear = -2;
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
        enter.hidden = true;
        locked.hidden = true;
        return;
      }
      const half = label.offsetWidth / 2;
      const edge = 12;
      label.style.left = `${Math.max(half + edge, Math.min(container.clientWidth - half - edge, next.x))}px`;
      label.style.top = `${labelTop(next.y, label.offsetHeight, shelfEl.offsetTop)}px`;
      label.style.opacity = String(next.opacity);
      title.textContent = next.book.card.title;
      enter.hidden = !next.book.ready;
      locked.hidden = next.book.ready;
    },
    dispose() {
      shelf.dispose();
      el.remove();
    },
  };
}
