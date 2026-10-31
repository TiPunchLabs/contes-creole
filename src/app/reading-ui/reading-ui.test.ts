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
  .replace("label: En", "label: Un")
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
  events = { onPage: vi.fn(), onLang: vi.fn(), onBack: vi.fn(), onToggleText: vi.fn() };
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
    ui.render({ page: 0, lang: "gcf", showHint: true, textHidden: false });
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
    ui.render({ page: 0, lang: "bi", showHint: false, textHidden: false });
    expect($(".reading-title").textContent).toBe("Paj en");
    expect($(".reading-gloss").hidden).toBe(false);
    expect($(".reading-gloss").textContent).toContain("Texte un.");
    expect($(".reading-card").lang).toBe("gcf");
    expect($(".reading-gloss").lang).toBe("fr");
    expect($(".reading-label").hasAttribute("lang")).toBe(false);
    expect($(".reading-hint").hidden).toBe(true);
  });

  it("offers Kréyòl only when the book has no translation", () => {
    const ui = createReadingUI(root, events);
    ui.open({ gcf: stories.gcf });
    expect([...root.querySelectorAll(".reading-langs button")].map((b) => b.textContent)).toEqual([
      "Kréyòl",
    ]);
  });

  it("marks the language and the page, and reports clicks", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 1, lang: "fr", showHint: false, textHidden: false });
    expect($('.reading-langs [data-lang="fr"]').getAttribute("aria-pressed")).toBe("true");
    expect($(".reading-card").lang).toBe("fr");
    expect($(".reading-label").lang).toBe("gcf");
    expect(
      [...root.querySelectorAll<HTMLElement>(".reading-langs button")].map((b) => b.lang),
    ).toEqual(["gcf", "gcf", "fr"]);
    expect($(".reading-count").textContent).toBe("2 / 2");
    expect($(".reading-count").getAttribute("aria-hidden")).toBe("true");
    expect($(".reading-count").querySelector("button")).toBeNull();
    ($('.reading-langs [data-lang="bi"]') as HTMLButtonElement).click();
    ($(".reading-next") as HTMLButtonElement).click();
    ($(".reading-prev") as HTMLButtonElement).click();
    ($(".reading-back") as HTMLButtonElement).click();
    expect(events.onLang).toHaveBeenCalledWith("bi");
    expect(events.onPage).toHaveBeenNthCalledWith(1, 2);
    expect(events.onPage).toHaveBeenNthCalledWith(2, 0);
    expect(events.onBack).toHaveBeenCalledOnce();
    expect($(".reading-prev").getAttribute("aria-label")).toBe("Page précédente");
    expect($(".reading-next").getAttribute("aria-label")).toBe("Page suivante");
    expect($(".reading-back").lang).toBe("gcf");
    // Phones hide the visible text, so the name must not depend on it.
    expect($(".reading-back").getAttribute("aria-label")).toBe("Pyébwa a Konesans");
    ui.render({ page: 0, lang: "fr", showHint: false, textHidden: false });
    expect($(".reading-label").textContent).toBe("Un");
    expect($(".reading-label").hasAttribute("lang")).toBe(false);
  });

  it("hides the card in scène seule and names the toggle after its action", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 1, lang: "fr", showHint: false, textHidden: true });
    expect($(".reading-card").hidden).toBe(true);
    expect($(".reading-arrows").hidden).toBe(false);
    expect($(".reading-toggle").getAttribute("aria-label")).toBe("Afficher le texte");
    expect($(".reading-toggle").lang).toBe("fr");
    // The counter takes over the progress the hidden card was announcing.
    expect($(".reading-count").getAttribute("aria-hidden")).toBe("false");
    expect($(".reading-count").getAttribute("aria-live")).toBe("polite");
    ($(".reading-toggle") as HTMLButtonElement).click();
    expect(events.onToggleText).toHaveBeenCalledOnce();
    ui.render({ page: 1, lang: "fr", showHint: false, textHidden: false });
    expect($(".reading-card").hidden).toBe(false);
    expect($(".reading-title").textContent).toBe("Page deux");
    expect($(".reading-toggle").getAttribute("aria-label")).toBe("Masquer le texte");
  });

  it("hides itself on close", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.close();
    expect($(".reading").hidden).toBe(true);
  });
});
