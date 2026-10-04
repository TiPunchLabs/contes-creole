// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseNotes } from "../language/parse";
import { parseStory } from "../story/parse";
import { createLanguagePanel, type LanguagePanel } from "./language-panel";

const STORY = parseStory(
  "---\nlang: gcf\ntitle: Liv\n---\n\n## Paj en {#en}\n\n<!-- label: En -->\n\nTèks en.\n\n" +
    "## Paj dé {#de}\n\n<!-- label: Dé -->\n\nTèks dé.\n",
  "gcf.md",
);
const notes = (draft: boolean, page = "de"): ReturnType<typeof parseNotes> =>
  parseNotes(
    `---\nlang: fr\ntitle: Lang kréyòl\ndraft: ${draft}\n---\n\n` +
      "## « té ka » {#te-ka}\n\nL'**imparfait** <b>x</b>.\n\n" +
      `> Tèks **dé**. {${page}}\n> Texte deux.\n\n` +
      "### Pou alé pli lwen\n\nPlis.\n\n" +
      "## « ka » {#ka}\n\nMaintenant.\n\n> Tèks en. {en}\n> Texte un.\n\n" +
      "### Pou alé pli lwen\n\nEncore.\n",
    "langue/fr.md",
  );

let root: HTMLElement;
let panel: LanguagePanel;
const $ = (sel: string): HTMLElement | null => root.querySelector<HTMLElement>(sel);
const tab = (shiftKey = false): void => {
  $(".lang-panel")?.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true }),
  );
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.querySelector<HTMLElement>("#app") as HTMLElement;
  panel = createLanguagePanel(root);
});

afterEach(() => {
  panel.dispose();
  vi.restoreAllMocks();
});

describe("language panel", () => {
  it("shows the burger only while notes are attached", () => {
    expect($(".lang-burger")?.hidden).toBe(true);
    panel.attach(notes(false), STORY);
    expect($(".lang-burger")?.hidden).toBe(false);
    expect(root.dataset.notes).toBe("");
    panel.detach();
    expect($(".lang-burger")?.hidden).toBe(true);
    expect(root.dataset.notes).toBeUndefined();
  });

  it("opens from the burger as a labelled dialog and focuses the close button", () => {
    panel.attach(notes(false), STORY);
    $(".lang-burger")?.click();
    const dialog = $(".lang-panel");
    expect(panel.isOpen).toBe(true);
    expect(dialog?.hidden).toBe(false);
    expect(dialog?.getAttribute("role")).toBe("dialog");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect($(`#${dialog?.getAttribute("aria-labelledby") ?? ""}`)?.textContent).toBe("Lang kréyòl");
    expect($(".lang-burger")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe($(".lang-close"));
  });

  it("renders notes, escaped summaries, examples with their page and the more level", () => {
    panel.attach(notes(false), STORY);
    panel.open();
    const first = $(".lang-note");
    expect(first?.querySelector("h3")?.textContent).toBe("« té ka »");
    expect(first?.querySelector("b")).toBeNull();
    expect(first?.textContent).toContain("<b>x</b>");
    expect(first?.querySelector(".lang-gcf strong")?.textContent).toBe("dé");
    expect(first?.querySelector(".lang-tr")?.textContent).toBe("Texte deux.");
    expect(first?.querySelector(".lang-source")?.textContent).toBe("p. 2 · Dé");
    expect(first?.querySelector("details summary")?.textContent).toBe("Pou alé pli lwen");
    expect(first?.querySelector("details")?.textContent).toContain("Plis.");
    expect(root.querySelectorAll(".lang-note")).toHaveLength(2);
  });

  it("shows the draft badge only for draft notes", () => {
    panel.attach(notes(false), STORY);
    expect($(".lang-draft")?.hidden).toBe(true);
    panel.attach(notes(true), STORY);
    expect($(".lang-draft")?.hidden).toBe(false);
    expect($(".lang-draft")?.textContent).toBe("brouyon — à valider");
  });

  it("drops the page reference of an unknown page with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    panel.attach(notes(false, "nope"), STORY);
    expect($(".lang-note")?.querySelector(".lang-source")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope"'));
  });

  it("closes from the close button and the scrim, giving focus back to the burger", () => {
    panel.attach(notes(false), STORY);
    panel.open();
    $(".lang-close")?.click();
    expect(panel.isOpen).toBe(false);
    expect($(".lang-panel")?.hidden).toBe(true);
    expect($(".lang-burger")?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe($(".lang-burger"));
    panel.open();
    $(".lang-scrim")?.click();
    expect(panel.isOpen).toBe(false);
  });

  it("keeps Tab inside the panel", () => {
    panel.attach(notes(false), STORY);
    panel.open();
    const summaries = root.querySelectorAll<HTMLElement>(".lang-panel summary");
    const last = summaries[summaries.length - 1];
    last.focus();
    tab();
    expect(document.activeElement).toBe($(".lang-close"));
    tab(true);
    expect(document.activeElement).toBe(last);
  });

  it("cannot open without notes and closes on detach", () => {
    panel.open();
    expect(panel.isOpen).toBe(false);
    panel.attach(notes(false), STORY);
    panel.open();
    panel.detach();
    expect(panel.isOpen).toBe(false);
    expect($(".lang-panel")?.hidden).toBe(true);
    expect($(".lang-scrim")?.hidden).toBe(true);
  });

  it("removes its elements on dispose", () => {
    panel.attach(notes(false), STORY);
    panel.dispose();
    expect($(".lang-burger")).toBeNull();
    expect($(".lang-panel")).toBeNull();
    expect(root.dataset.notes).toBeUndefined();
  });
});
