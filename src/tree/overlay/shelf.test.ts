// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { BookManifest } from "@app/contract";
import { createShelf, isShelfEvent, shelfAction } from "./shelf";

const book = (id: string, ready: boolean, title: string): BookManifest => ({
  id,
  order: 1,
  ready,
  card: { title, sub: "Dlo · L'eau", theme: "Kont pou lékòl" },
});
const BOOKS = [book("a", true, "Ti Kannot"), book("b", false, "Zanba")];

describe("shelfAction", () => {
  it("climbs to a book that is not the highlighted one", () => {
    expect(shelfAction(0, -1, true)).toBe("climb");
    expect(shelfAction(0, 1, true)).toBe("climb");
  });

  it("enters the highlighted ready book (same rule as aria-current)", () => {
    expect(shelfAction(0, 0, true)).toBe("enter");
  });

  it("never enters a locked book, even when highlighted", () => {
    expect(shelfAction(1, 1, false)).toBe("climb");
  });
});

describe("createShelf", () => {
  /** Mounts a shelf in a fresh container. */
  function mount(onSelect = vi.fn()) {
    const parent = document.createElement("div");
    const shelf = createShelf(parent, BOOKS, onSelect);
    const buttons = [...parent.querySelectorAll<HTMLButtonElement>("button")];
    return { parent, shelf, buttons, onSelect };
  }

  it("is a labelled nav with one button per book and the Kréyòl label", () => {
    const { parent, buttons } = mount();
    const nav = parent.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBeTruthy();
    expect(nav?.textContent).toContain("Sé kont-la");
    expect(nav?.textContent).not.toContain("Kont-yo");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain("Ti Kannot");
    expect(buttons[1].textContent).toContain("Talè · bientôt");
    expect(buttons[1].getAttribute("aria-label")).toContain("bientôt");
  });

  it("marks the near book as current", () => {
    const { shelf, buttons } = mount();
    shelf.setNear(1);
    expect(buttons[1].getAttribute("aria-current")).toBe("true");
    expect(buttons[0].getAttribute("aria-current")).toBe("false");
    shelf.setNear(-1);
    expect(buttons.every((b) => b.getAttribute("aria-current") === "false")).toBe(true);
  });

  it("asks to climb to a book that is not highlighted (click, Enter and Space all fire click)", () => {
    const { buttons, onSelect } = mount();
    buttons[0].click();
    expect(onSelect).toHaveBeenCalledWith(0, "climb");
  });

  it("asks to enter the highlighted ready book, as its label promises", () => {
    const { shelf, buttons, onSelect } = mount();
    shelf.setNear(0);
    expect(buttons[0].getAttribute("aria-label")).toContain("touche encore pour ouvrir");
    buttons[0].click();
    expect(onSelect).toHaveBeenCalledWith(0, "enter");
  });

  it("only climbs to a highlighted locked book", () => {
    const { shelf, buttons, onSelect } = mount();
    shelf.setNear(1);
    buttons[1].click();
    expect(onSelect).toHaveBeenCalledWith(1, "climb");
  });

  it("renders book titles as text, never as HTML", () => {
    const parent = document.createElement("div");
    createShelf(parent, [book("x", true, "<img src=x onerror=alert(1)>")], vi.fn());
    expect(parent.querySelector("img")).toBeNull();
  });

  it("removes itself on dispose", () => {
    const { parent, shelf } = mount();
    shelf.dispose();
    expect(parent.querySelector("nav")).toBeNull();
  });
});

describe("isShelfEvent", () => {
  it("is true inside the shelf only, so the wheel still climbs over the enter button", () => {
    const parent = document.createElement("div");
    createShelf(parent, BOOKS, vi.fn());
    const enter = document.createElement("button");
    enter.className = "tree-enter";
    parent.append(enter);
    const shelfButton = parent.querySelector(".tree-shelf button");
    expect(isShelfEvent(shelfButton)).toBe(true);
    expect(isShelfEvent(enter)).toBe(false);
    expect(isShelfEvent(null)).toBe(false);
  });
});
