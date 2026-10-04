import "./language-panel.css";
import type { LanguageExample, LanguageNote, LanguageNotes, Story } from "../contract";

export interface LanguagePanel {
  /** Shows the burger for this book; `story` (Kréyòl) resolves page references. */
  attach(notes: LanguageNotes, story: Story): void;
  /** Closes the panel and hides the burger. */
  detach(): void;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  dispose(): void;
}

const BURGER = `<svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M1 1h16M1 7h16M1 13h16"/></svg>`;
const CROSS = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m1 1 12 12M13 1 1 13"/></svg>`;
const PANEL_ID = "lang-panel";
const TITLE_ID = "lang-panel-title";
const FOCUSABLE = "button, summary, a[href], [tabindex]:not([tabindex='-1'])";

/** Creates an element with a class and optional plain text. */
function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Creates an element from parser HTML, which is already escaped. */
function fromHtml<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  html: string,
): HTMLElementTagNameMap[K] {
  const el = make(tag, className);
  el.innerHTML = html;
  return el;
}

/** "p. N · label" for an example's source page; empty when the page id is unknown. */
function pageRef(story: Story, example: LanguageExample): string {
  const index = story.pages.findIndex((p) => p.id === example.pageId);
  if (index === -1) {
    console.warn(`language notes: unknown page "${example.pageId}"`);
    return "";
  }
  return `p. ${index + 1} · ${story.pages[index].label}`;
}

/** One quoted sentence: Kréyòl, translation, source page. */
function exampleEl(example: LanguageExample, story: Story): HTMLElement {
  const figure = make("figure", "lang-example");
  figure.append(
    fromHtml("p", "lang-gcf", example.gcf.html),
    fromHtml("p", "lang-tr", example.translation.html),
  );
  const ref = pageRef(story, example);
  if (ref) figure.append(make("figcaption", "lang-source", ref));
  return figure;
}

/** One note: title, summary, examples, then the collapsed "Pou alé pli lwen" level. */
function noteEl(note: LanguageNote, story: Story): HTMLElement {
  const section = make("section", "lang-note");
  section.append(
    make("h3", "lang-note-title", note.title),
    ...note.summary.map((p) => fromHtml("p", "lang-text", p.html)),
    ...note.examples.map((e) => exampleEl(e, story)),
  );
  if (note.more || note.moreExamples) {
    const details = make("details", "lang-more");
    details.append(
      make("summary", "", "Pou alé pli lwen"),
      ...(note.more ?? []).map((p) => fromHtml("p", "lang-text", p.html)),
      ...(note.moreExamples ?? []).map((e) => exampleEl(e, story)),
    );
    section.append(details);
  }
  return section;
}

/** Shell-owned "Lang kréyòl" burger and dialog, laid over the tale without touching it. */
export function createLanguagePanel(root: HTMLElement): LanguagePanel {
  const burger = make("button", "lang-burger");
  burger.type = "button";
  burger.hidden = true;
  burger.innerHTML = BURGER;
  burger.setAttribute("aria-label", "Lang kréyòl");
  burger.setAttribute("aria-controls", PANEL_ID);
  burger.setAttribute("aria-expanded", "false");

  const scrim = make("div", "lang-scrim");
  scrim.hidden = true;

  const panel = make("div", "lang-panel");
  panel.id = PANEL_ID;
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", TITLE_ID);
  const head = make("header", "lang-head");
  const title = make("h2", "lang-title");
  title.id = TITLE_ID;
  const draft = make("span", "lang-draft", "brouyon — à valider");
  const closeButton = make("button", "lang-close");
  closeButton.type = "button";
  closeButton.innerHTML = CROSS;
  closeButton.setAttribute("aria-label", "Fèmé");
  head.append(title, draft, closeButton);
  const list = make("div", "lang-notes");
  panel.append(head, list);
  root.append(burger, scrim, panel);

  let isOpen = false;
  let inerted: Element[] = [];

  /** Keeps keyboard and pointer out of the tale (and the burger) while the dialog is open. */
  const setBackgroundInert = (on: boolean): void => {
    if (on) {
      inerted = [...root.children].filter(
        (el) => el !== panel && el !== scrim && !el.hasAttribute("inert"),
      );
      for (const el of inerted) el.setAttribute("inert", "");
    } else {
      for (const el of inerted) el.removeAttribute("inert");
      inerted = [];
    }
  };

  const hide = (): void => {
    if (isOpen) setBackgroundInert(false);
    isOpen = false;
    scrim.hidden = true;
    panel.hidden = true;
    burger.setAttribute("aria-expanded", "false");
  };
  const open = (): void => {
    if (burger.hidden || isOpen) return;
    isOpen = true;
    setBackgroundInert(true);
    scrim.hidden = false;
    panel.hidden = false;
    burger.setAttribute("aria-expanded", "true");
    closeButton.focus();
  };
  const close = (): void => {
    if (!isOpen) return;
    hide();
    burger.focus();
  };

  burger.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  scrim.addEventListener("click", close);
  panel.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return {
    attach(notes, story) {
      hide();
      title.textContent = notes.title;
      draft.hidden = !notes.draft;
      list.replaceChildren(...notes.notes.map((n) => noteEl(n, story)));
      list.scrollTop = 0;
      burger.hidden = false;
      root.dataset.notes = "";
    },
    detach() {
      hide();
      burger.hidden = true;
      list.replaceChildren();
      delete root.dataset.notes;
    },
    open,
    close,
    get isOpen() {
      return isOpen;
    },
    dispose() {
      burger.remove();
      scrim.remove();
      panel.remove();
      delete root.dataset.notes;
    },
  };
}
