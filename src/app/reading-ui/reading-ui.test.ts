// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Stories } from "../contract";
import { parseStory } from "../story/parse";
import { createReadingUI, type ReadingEvents } from "./reading-ui";

const GCF = `---
lang: gcf
title: Liv
---

## Paj en {#en}

<!-- label: En -->

Tèks <b>en</b>.

– Bonjou !

## Paj dé {#de}

<!-- label: Dé -->

Tèks dé.
`;
const FR = GCF.replace("lang: gcf", "lang: fr")
  .replace("Paj en", "Page un")
  .replace("Tèks <b>en</b>.", "Texte un.")
  .replace("Paj dé", "Page deux")
  .replace("Tèks dé.", "Texte deux.");

let root: HTMLElement;
let events: ReadingEvents;
let stories: Stories;

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.append(root);
  events = { onPage: vi.fn(), onLang: vi.fn(), onBack: vi.fn() };
  stories = { gcf: parseStory(GCF, "gcf.md"), fr: parseStory(FR, "fr.md") };
});

const $ = (sel: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

describe("reading UI", () => {
  it("shows the page label, number, title and escaped body", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 0, lang: "gcf", showHint: true });
    expect($(".reading").hidden).toBe(false);
    expect($(".reading-label").textContent).toBe("En");
    expect($(".reading-num").textContent).toBe("1 / 2");
    expect($(".reading-title").textContent).toBe("Paj en");
    expect($(".reading-body").innerHTML).toContain("Tèks &lt;b&gt;en&lt;/b&gt;.");
    expect(root.querySelectorAll(".reading-body .reading-dialogue")).toHaveLength(1);
    expect($(".reading-hint").hidden).toBe(false);
    expect($(".reading-hint").textContent).toBe("Défilez pour continuer");
  });

  it("shows the French text under the Kréyòl text in Bileng", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 0, lang: "bi", showHint: false });
    expect($(".reading-title").textContent).toBe("Paj en");
    expect($(".reading-gloss").hidden).toBe(false);
    expect($(".reading-gloss").textContent).toContain("Texte un.");
    expect($(".reading-hint").hidden).toBe(true);
  });

  it("offers Kréyòl only when the book has no translation", () => {
    const ui = createReadingUI(root, events);
    ui.open({ gcf: stories.gcf });
    expect([...root.querySelectorAll(".reading-langs button")].map((b) => b.textContent)).toEqual([
      "Kréyòl",
    ]);
  });

  it("marks the language and the dots, and reports clicks", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 1, lang: "fr", showHint: false });
    expect($('.reading-langs [data-lang="fr"]').getAttribute("aria-pressed")).toBe("true");
    const dots = root.querySelectorAll(".reading-dot");
    expect(dots[0].classList.contains("is-done")).toBe(true);
    expect(dots[1].classList.contains("is-current")).toBe(true);
    ($('.reading-langs [data-lang="bi"]') as HTMLButtonElement).click();
    (dots[0] as HTMLButtonElement).click();
    ($(".reading-prev") as HTMLButtonElement).click();
    ($(".reading-back") as HTMLButtonElement).click();
    expect(events.onLang).toHaveBeenCalledWith("bi");
    expect(events.onPage).toHaveBeenCalledWith(0);
    expect(events.onPage).toHaveBeenCalledTimes(2);
    expect(events.onBack).toHaveBeenCalledOnce();
  });

  it("hides itself on close", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.close();
    expect($(".reading").hidden).toBe(true);
  });
});
