// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { BookManifest } from "@app/contract";
import { INVITATION } from "../invitation";
import { createShelf, isShelfEvent, shelfAction } from "./shelf";

const book = (id: string, title: string): BookManifest => ({
  id,
  order: 1,
  ready: true,
  card: { title, sub: "Dlo · L'eau", theme: "Kont pou lékòl" },
});
const BOOKS = [book("a", "Ti Kannot"), INVITATION];

describe("shelfAction", () => {
  it("climbs to a slot that is not the highlighted one", () => {
    expect(shelfAction(0, -1)).toBe("climb");
    expect(shelfAction(0, 1)).toBe("climb");
  });

  it("opens the highlighted slot (same rule as aria-current)", () => {
    expect(shelfAction(0, 0)).toBe("enter");
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

  it("is a labelled nav with one button per slot and the Kréyòl label", () => {
    const { parent, buttons } = mount();
    const nav = parent.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBeTruthy();
    expect(nav?.lang).toBe("fr");
    expect(buttons[0].lang).toBe("gcf");
    expect(nav?.textContent).toContain("Sé kont-la");
    expect(nav?.textContent).not.toContain("Kont-yo");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain("Ti Kannot");
    expect(buttons[0].querySelector(".tree-shelf-dot")?.textContent).toBe("1");
  });

  it("shows the invitation in French, dashed and numberless, never as a locked book", () => {
    const { buttons } = mount();
    const invite = buttons[1];
    expect(invite.lang).toBe("fr");
    expect(invite.classList.contains("is-invitation")).toBe(true);
    expect(invite.textContent).toContain("Le prochain conte");
    expect(invite.textContent).toContain("Histoire à inventer");
    expect(invite.textContent).not.toMatch(/Talè|bientôt/);
    expect(invite.querySelector(".tree-shelf-dot")?.getAttribute("aria-hidden")).toBe("true");
    expect(invite.getAttribute("aria-label")).toBe("Le prochain conte, invitation aux classes");
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

  it("opens the highlighted invitation, as its label promises", () => {
    const { shelf, buttons, onSelect } = mount();
    shelf.setNear(1);
    expect(buttons[1].getAttribute("aria-label")).toContain("touche encore pour ouvrir");
    buttons[1].click();
    expect(onSelect).toHaveBeenCalledWith(1, "enter");
  });

  it("renders book titles as text, never as HTML", () => {
    const parent = document.createElement("div");
    createShelf(parent, [book("x", "<img src=x onerror=alert(1)>")], vi.fn());
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
