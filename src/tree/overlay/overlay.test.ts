// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookManifest } from "@app/contract";
import { INVITATION } from "../invitation";
import { cardBox, createTreeOverlay, tellerBox } from "./overlay";

const mila: BookManifest = {
  id: "mila",
  order: 4,
  ready: true,
  card: { title: "Mila et le lambi qui avait perdu son chant", sub: "", theme: "", lang: "fr" },
};

/** Mounts the overlay with spied handlers. */
function mount() {
  const container = document.createElement("div");
  document.body.append(container);
  const handlers = {
    onEnter: vi.fn(),
    onShelf: vi.fn(),
    onCardFocus: vi.fn(),
    onTeller: vi.fn(),
    onTellerFocus: vi.fn(),
  };
  const overlay = createTreeOverlay(container, [mila, INVITATION], handlers);
  return { container, handlers, overlay };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("cardBox and tellerBox", () => {
  it("covers the 1.5 × 2.1 card around its projected centre", () => {
    // 1.25 units = 125 px: one unit is 100 px
    expect(cardBox({ x: 500, y: 525, cy: 400 })).toEqual({
      left: 425,
      top: 295,
      width: 150,
      height: 210,
    });
  });

  it("covers the storyteller from head to feet", () => {
    expect(tellerBox({ x: 300, top: 400, bottom: 600 })).toEqual({
      left: 240,
      top: 400,
      width: 120,
      height: 200,
    });
  });
});

describe("tree overlay", () => {
  it("has no floating fiche, leader line or duplicated title any more", () => {
    const { container } = mount();
    expect(container.querySelector(".tree-label, .tree-filet, .tree-enter")).toBeNull();
  });

  it("makes the near book a focusable entry point named after its tale", () => {
    const { container, handlers, overlay } = mount();
    overlay.update(0.2, { index: 0, x: 500, y: 525, cy: 400, opacity: 1, book: mila }, 0, null);
    const card = container.querySelector<HTMLButtonElement>("button.tree-book");
    expect(card?.hidden).toBe(false);
    expect(card?.textContent).toContain(mila.card.title);
    expect(card?.textContent).toContain("Antré adan kont-la");
    expect(card?.querySelector("[lang=fr]")?.textContent).toBe(mila.card.title);
    expect(card?.style.width).toBe("150px");
    card?.focus();
    expect(handlers.onCardFocus).toHaveBeenLastCalledWith(true);
    card?.click();
    expect(handlers.onEnter).toHaveBeenCalledWith("mila");
  });

  it("makes the invitation's card a link to the classes page", () => {
    const { container, overlay } = mount();
    overlay.update(
      0.9,
      { index: 1, x: 500, y: 525, cy: 400, opacity: 1, book: INVITATION },
      1,
      null,
    );
    const link = container.querySelector<HTMLAnchorElement>(".tree-book-invite");
    expect(link?.hidden).toBe(false);
    expect(link?.getAttribute("href")).toBe("/contes-des-classes/");
    expect(container.querySelector<HTMLButtonElement>("button.tree-book")?.hidden).toBe(true);
  });

  it("hides the card's entry point when no card is near", () => {
    const { container, overlay } = mount();
    overlay.update(0.5, null, -1, null);
    expect(container.querySelector<HTMLButtonElement>("button.tree-book")?.hidden).toBe(true);
    expect(container.querySelector<HTMLAnchorElement>(".tree-book-invite")?.hidden).toBe(true);
  });

  it("gives the storyteller a named entry point while he is on screen", () => {
    const { container, handlers, overlay } = mount();
    overlay.setTeller("Cliquez ici pour accéder à un conte au hasard.", true);
    overlay.update(0, null, -1, { x: 300, top: 400, bottom: 600 });
    const teller = container.querySelector<HTMLButtonElement>(".tree-teller");
    expect(teller?.hidden).toBe(false);
    expect(teller?.textContent).toBe("Cliquez ici pour accéder à un conte au hasard.");
    expect(teller?.getAttribute("aria-disabled")).toBe("false");
    teller?.click();
    expect(handlers.onTeller).toHaveBeenCalledTimes(1);
    overlay.update(0.6, null, -1, null);
    expect(teller?.hidden).toBe(true);
  });
});
