import type { BookManifest } from "@app/contract";
import { INVITATION_FICHE, isInvitation } from "../invitation";

export type ShelfAction = "enter" | "climb";

const DOT_COLOURS = ["#c4572e", "#4f8a3a", "#3f8fa0", "#b07a2a", "#8a5aa8"];
/** Whether an input event started inside the shelf (the wheel scrolls it instead of climbing). */
export function isShelfEvent(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".tree-shelf") !== null;
}

/**
 * A press on the highlighted (near) slot opens it (enters the book, or opens the invitation); any
 * other press brings the camera to the slot.
 */
export function shelfAction(index: number, near: number): ShelfAction {
  return index === near ? "enter" : "climb";
}

/** "Sé kont-la": direct access to every slot of the tree, touch and keyboard friendly. */
export function createShelf(
  parent: HTMLElement,
  books: BookManifest[],
  onSelect: (index: number, action: ShelfAction) => void,
): { setNear(index: number): void; dispose(): void } {
  const nav = document.createElement("nav");
  nav.className = "tree-shelf";
  nav.setAttribute("aria-label", "Les contes de l'arbre");
  nav.lang = "fr";
  const label = document.createElement("div");
  label.className = "tree-shelf-label";
  label.textContent = "Sé kont-la";
  label.lang = "gcf";
  nav.append(label);

  let near = -1;
  const buttons = books.map((book, i) => {
    const inviting = isInvitation(book);
    const button = document.createElement("button");
    button.type = "button";
    button.className = inviting ? "tree-shelf-book is-invitation" : "tree-shelf-book";
    button.lang = inviting ? "fr" : "gcf";
    button.style.setProperty("--dot", DOT_COLOURS[i % DOT_COLOURS.length]);
    const dot = document.createElement("span");
    dot.className = "tree-shelf-dot";
    dot.textContent = inviting ? "+" : String(i + 1);
    if (inviting) dot.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "tree-shelf-text";
    const title = document.createElement("span");
    title.className = "tree-shelf-title";
    title.textContent = book.card.title;
    const sub = document.createElement("span");
    sub.className = "tree-shelf-sub";
    if (inviting) {
      sub.textContent = INVITATION_FICHE.kicker;
    } else {
      // "Kréyòl · Français": the French half gets its own lang.
      const [gcf, fr] = book.card.theme.split(" · ");
      const french = document.createElement("span");
      french.lang = "fr";
      french.textContent = fr ?? "";
      sub.append(gcf, ...(fr ? [" · ", french] : []));
    }
    text.append(title, sub);
    button.append(dot, text);
    button.addEventListener("click", () => onSelect(i, shelfAction(i, near)));
    nav.append(button);
    return button;
  });

  /** Accessible name: title, the invitation's nature and the hint to press again on the current slot. */
  const describe = (i: number, current: boolean): string => {
    const book = books[i];
    return (
      book.card.title +
      (isInvitation(book) ? ", invitation aux classes" : "") +
      (current ? ", sélectionné — touche encore pour ouvrir" : "")
    );
  };

  const setNear = (index: number): void => {
    near = index;
    buttons.forEach((button, i) => {
      const current = i === index;
      button.setAttribute("aria-current", current ? "true" : "false");
      button.classList.toggle("is-near", current);
      button.setAttribute("aria-label", describe(i, current));
    });
  };
  setNear(-1);
  parent.append(nav);

  return {
    setNear,
    dispose() {
      nav.remove();
    },
  };
}
