import type { BookManifest } from "@app/contract";

export type ShelfAction = "enter" | "climb";

const DOT_COLOURS = ["#c4572e", "#4f8a3a", "#3f8fa0", "#b07a2a", "#8a5aa8"];
const LOCKED_DOT = "#b39a7a";
/** Whether an input event started inside the shelf (the wheel scrolls it instead of climbing). */
export function isShelfEvent(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".tree-shelf") !== null;
}

/** A press on the highlighted (near) ready book enters it; any other press brings the camera to the book. */
export function shelfAction(index: number, near: number, ready: boolean): ShelfAction {
  return ready && index === near ? "enter" : "climb";
}

/** "Sé kont-la": direct access to every book of the tree, touch and keyboard friendly. */
export function createShelf(
  parent: HTMLElement,
  books: BookManifest[],
  onSelect: (index: number, action: ShelfAction) => void,
): { setNear(index: number): void; dispose(): void } {
  const nav = document.createElement("nav");
  nav.className = "tree-shelf";
  nav.setAttribute("aria-label", "Les contes de l'arbre");
  const label = document.createElement("div");
  label.className = "tree-shelf-label";
  label.textContent = "Sé kont-la";
  nav.append(label);

  let near = -1;
  const buttons = books.map((book, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-shelf-book";
    button.style.setProperty(
      "--dot",
      book.ready ? DOT_COLOURS[i % DOT_COLOURS.length] : LOCKED_DOT,
    );
    const dot = document.createElement("span");
    dot.className = "tree-shelf-dot";
    dot.textContent = String(i + 1);
    const text = document.createElement("span");
    text.className = "tree-shelf-text";
    const title = document.createElement("span");
    title.className = "tree-shelf-title";
    title.textContent = book.card.title;
    const sub = document.createElement("span");
    sub.className = "tree-shelf-sub";
    sub.textContent = book.ready ? book.card.theme : "Talè · bientôt";
    text.append(title, sub);
    button.append(dot, text);
    button.addEventListener("click", () => onSelect(i, shelfAction(i, near, book.ready)));
    nav.append(button);
    return button;
  });

  /** Accessible name: title, lock state and the hint to press again on the current book. */
  const describe = (i: number, current: boolean): string => {
    const book = books[i];
    return (
      book.card.title +
      (book.ready ? "" : ", bientôt") +
      (current && book.ready ? ", sélectionné — touche encore pour ouvrir" : "")
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
