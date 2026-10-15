// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { BookManifest } from "@app/contract";
import { createShelf, shelfAction } from "./shelf";

const book = (id: string, ready: boolean, title: string): BookManifest => ({
  id,
  order: 1,
  ready,
  card: { title, sub: "Dlo · L'eau", theme: "Kont pou lékòl" },
});
const BOOKS = [book("a", true, "Ti Kannot"), book("b", false, "Zanba")];

describe("shelfAction", () => {
  it("climbs to a book that is not the near one", () => {
    expect(shelfAction(0.2, 0.88, true)).toBe("climb");
  });

  it("enters a ready book already in front of the camera", () => {
    expect(shelfAction(0.875, 0.88, true)).toBe("enter");
  });

  it("never enters a locked book, even in front of the camera", () => {
    expect(shelfAction(0.88, 0.88, false)).toBe("climb");
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

  it("reports the pressed book (click, Enter and Space all fire click on a native button)", () => {
    const { buttons, onSelect } = mount();
    buttons[1].click();
    expect(onSelect).toHaveBeenCalledWith(1);
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
