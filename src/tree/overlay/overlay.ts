import type { BookManifest } from "@app/contract";
import { CLASSES_PAGE, INVITATION_FICHE, isInvitation } from "../invitation";
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

/** The storyteller on screen: centre x, head and feet y, in pixels. */
export interface TellerBox {
  x: number;
  top: number;
  bottom: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MOUSE = `<svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8"/><circle cx="9" cy="8" r="2" fill="currentColor"/></svg>`;

/** Kréyòl name of the way into a tale (the old fiche's button), kept for the card's accessible name. */
const ENTER_TALE = "Antré adan kont-la";

/**
 * Screen box of a card from its projected centre and under-point: the card is 1.5 × 2.1 units and
 * `y` sits 1.25 units under its centre.
 */
export function cardBox(card: { x: number; y: number; cy: number }): Box {
  const unit = Math.max(0, card.y - card.cy) / 1.25;
  const width = 1.5 * unit;
  const height = 2.1 * unit;
  return {
    left: Math.round(card.x - width / 2),
    top: Math.round(card.cy - height / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Screen box of the storyteller: as wide as his photo (0.59 of its height), head to feet. */
export function tellerBox(teller: TellerBox): Box {
  const height = Math.max(0, teller.bottom - teller.top);
  const width = height * 0.6;
  return {
    left: Math.round(teller.x - width / 2),
    top: Math.round(teller.top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Places a transparent entry point over a box of the scene. */
function place(el: HTMLElement, box: Box): void {
  el.style.left = `${box.left}px`;
  el.style.top = `${box.top}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
}

/**
 * Tree HUD: intro column with the site title, climb bar, shelf, and two keyboard entry points laid
 * over the scene: the near card (a book's tale, or the classes page for the invitation) and the
 * storyteller (a tale at random). Pointers keep hitting the 3D scene: these entry points let them
 * through and only take the focus.
 */
export function createTreeOverlay(
  container: HTMLElement,
  books: BookManifest[],
  handlers: {
    onEnter(bookId: string): void;
    onShelf(index: number, action: ShelfAction): void;
    /** The near card's entry point took or lost the focus. */
    onCardFocus(focused: boolean): void;
    onTeller(): void;
    /** The storyteller's entry point took or lost the focus. */
    onTellerFocus(focused: boolean): void;
  },
): {
  update(t: number, label: CardLabel | null, near: number, teller: TellerBox | null): void;
  /** Names the storyteller's entry point: his call to a tale, or why there is none. */
  setTeller(text: string, available: boolean): void;
  /** Reads a short message out to screen readers. */
  announce(text: string): void;
  /** Screen box of the intro column while it is still readable (not faded out), else null. */
  introBox(): Box | null;
  dispose(): void;
} {
  const el = document.createElement("div");
  el.className = "tree-overlay";
  el.innerHTML = `
    <div class="tree-intro"><div class="tree-intro-inner">
      <h1 class="tree-intro-title" lang="gcf">Pyébwa a Konesans</h1>
      <p class="tree-intro-kicker" lang="gcf">Kont Gwadloup</p>
      <p class="tree-intro-motto" lang="gcf">Chak fèy sé on kont.</p>
      <p class="tree-intro-gloss" lang="fr">Chaque feuille est un conte.</p>
      <p class="tree-intro-text" lang="fr">Tourne autour de l'arbre pour trouver le tien&nbsp;!</p>
      <div class="tree-intro-hint">${MOUSE}<span lang="fr">Fais défiler · Glisse avec le doigt</span></div>
    </div></div>
    <button type="button" class="tree-hit tree-book" hidden><span class="tree-sr"><span class="tree-book-title"></span> — <span lang="gcf">${ENTER_TALE}</span></span></button>
    <a class="tree-hit tree-book tree-book-invite" lang="fr" href="${CLASSES_PAGE}" hidden><span class="tree-sr">${INVITATION_FICHE.title} — ${INVITATION_FICHE.action}</span></a>
    <button type="button" class="tree-hit tree-teller" lang="fr" hidden><span class="tree-sr"></span></button>
    <p class="tree-sr" role="status" aria-live="polite"></p>
    <div class="tree-climb"><div class="tree-climb-thumb"></div></div>`;
  container.append(el);
  const part = <T extends HTMLElement = HTMLElement>(selector: string): T => {
    const found = el.querySelector<T>(selector);
    if (!found) throw new Error(`tree overlay: missing ${selector}`);
    return found;
  };
  const intro = part(".tree-intro");
  const introInner = part(".tree-intro-inner");
  const enter = part<HTMLButtonElement>("button.tree-book");
  const enterTitle = part(".tree-book-title");
  const invite = part<HTMLAnchorElement>(".tree-book-invite");
  const teller = part<HTMLButtonElement>(".tree-teller");
  const tellerName = part(".tree-teller .tree-sr");
  const status = part("[role=status]");
  const thumb = part(".tree-climb-thumb");
  const shelf = createShelf(el, books, handlers.onShelf);
  let current: BookManifest | null = null;
  let shownNear = -2;
  let shownBook: BookManifest | null = null;

  enter.addEventListener("click", () => {
    if (current) handlers.onEnter(current.id);
  });
  teller.addEventListener("click", () => handlers.onTeller());
  for (const card of [enter, invite]) {
    card.addEventListener("focus", () => handlers.onCardFocus(true));
    card.addEventListener("blur", () => handlers.onCardFocus(false));
  }
  teller.addEventListener("focus", () => handlers.onTellerFocus(true));
  teller.addEventListener("blur", () => handlers.onTellerFocus(false));

  return {
    update(t, next, near, tellerAt) {
      intro.style.opacity = String(Math.max(0, 1 - t * 9));
      thumb.style.top = `calc((100% - 24px) * ${t})`;
      if (near !== shownNear) {
        shownNear = near;
        shelf.setNear(near);
      }
      current = next ? next.book : null;
      if (!next) {
        enter.hidden = true;
        invite.hidden = true;
        shownBook = null;
      } else {
        if (next.book !== shownBook) {
          shownBook = next.book;
          const inviting = isInvitation(next.book);
          enter.hidden = inviting;
          invite.hidden = !inviting;
          enterTitle.lang = next.book.card.lang ?? "gcf";
          enterTitle.textContent = next.book.card.title;
        }
        place(isInvitation(next.book) ? invite : enter, cardBox(next));
      }
      // Back from a random tale the camera rests on its card, away from the storyteller: the focus
      // moves on to that card rather than falling back to the page.
      if (!tellerAt && document.activeElement === teller && next) {
        (isInvitation(next.book) ? invite : enter).focus({ preventScroll: true });
      }
      teller.hidden = !tellerAt;
      if (tellerAt) place(teller, tellerBox(tellerAt));
    },
    setTeller(text, available) {
      tellerName.textContent = text;
      teller.setAttribute("aria-disabled", String(!available));
    },
    announce(text) {
      // Emptied first so the same message is read again on a second press.
      status.textContent = "";
      requestAnimationFrame(() => {
        status.textContent = text;
      });
    },
    introBox() {
      if (Number(intro.style.opacity || "1") < 0.3) return null;
      const r = introInner.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    },
    dispose() {
      shelf.dispose();
      el.remove();
    },
  };
}
