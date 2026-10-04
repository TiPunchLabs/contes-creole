import "./reading-ui.css";
import type { Stories, StoryPage } from "../contract";
import { LANG_NAMES, readingLangs, storyFor, type ReadingLang } from "../languages";

export interface ReadingState {
  page: number;
  lang: ReadingLang;
  showHint: boolean;
}

export interface ReadingEvents {
  onPage(index: number): void;
  onLang(lang: ReadingLang): void;
  onBack(): void;
}

export interface ReadingUI {
  open(stories: Stories): void;
  render(state: ReadingState): void;
  close(): void;
}

const ARROW = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M8 2v12M3 9l5 5 5-5"/></svg>`;
const BACK = `<svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M7 1 2 6l5 5M2 6h17"/></svg>`;
const FADE_MS = 320;

/** Page blocks as paragraphs; block HTML is already escaped by the story parser. */
const blocksHtml = (page: StoryPage): string =>
  page.blocks.map((b) => `<p class="reading-${b.kind}">${b.html}</p>`).join("");

/** Shared reading overlay: text card, language switch, page dots, arrows, back button, hint. */
export function createReadingUI(root: HTMLElement, events: ReadingEvents): ReadingUI {
  const el = document.createElement("div");
  el.className = "reading";
  el.hidden = true;
  el.innerHTML = `
    <button type="button" class="reading-back">${BACK}<span>Pyébwa a Sav</span></button>
    <div class="reading-langs" role="group"></div>
    <article class="reading-card" aria-live="polite">
      <div class="reading-head"><div class="reading-label"></div><div class="reading-num"></div></div>
      <h2 class="reading-title"></h2>
      <div class="reading-body"></div>
      <div class="reading-gloss" hidden></div>
    </article>
    <nav class="reading-dots"></nav>
    <div class="reading-arrows">
      <button type="button" class="reading-prev" aria-label="←">${ARROW}</button>
      <button type="button" class="reading-next" aria-label="→">${ARROW}</button>
    </div>
    <div class="reading-hint" aria-hidden="true"><span>Défilez pour continuer</span>${ARROW}</div>`;
  root.append(el);

  const part = <T extends HTMLElement>(selector: string): T => {
    const found = el.querySelector<T>(selector);
    if (!found) throw new Error(`reading UI: missing ${selector}`);
    return found;
  };
  const langs = part(".reading-langs");
  const card = part(".reading-card");
  const label = part(".reading-label");
  const num = part(".reading-num");
  const title = part(".reading-title");
  const body = part(".reading-body");
  const gloss = part(".reading-gloss");
  const dots = part(".reading-dots");
  const hint = part(".reading-hint");

  let stories: Stories | null = null;
  let current: ReadingState = { page: 0, lang: "gcf", showHint: false };
  let shown = -1;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;

  part(".reading-back").addEventListener("click", () => events.onBack());
  part(".reading-prev").addEventListener("click", () => events.onPage(current.page - 1));
  part(".reading-next").addEventListener("click", () => events.onPage(current.page + 1));

  const button = (className: string, text: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  };

  return {
    open(next) {
      stories = next;
      shown = -1;
      el.hidden = false;
      langs.replaceChildren(
        ...readingLangs(next).map((lang) => {
          const b = button("", LANG_NAMES[lang], () => events.onLang(lang));
          b.dataset.lang = lang;
          return b;
        }),
      );
      dots.replaceChildren(
        ...next.gcf.pages.map((p, i) => {
          const b = button("reading-dot", "", () => events.onPage(i));
          b.title = p.label;
          b.setAttribute("aria-label", p.label);
          return b;
        }),
      );
    },
    render(state) {
      if (!stories) return;
      current = state;
      const story = storyFor(stories, state.lang);
      const page = story.pages[state.page];
      if (!page) return;
      label.textContent = page.label;
      num.textContent = `${state.page + 1} / ${story.pages.length}`;
      title.textContent = page.title;
      body.innerHTML = blocksHtml(page);
      const french = state.lang === "bi" ? stories.fr?.pages[state.page] : undefined;
      gloss.hidden = !french;
      gloss.innerHTML = french ? blocksHtml(french) : "";
      for (const b of langs.children) {
        b.setAttribute("aria-pressed", String((b as HTMLElement).dataset.lang === state.lang));
      }
      [...dots.children].forEach((d, i) => {
        d.classList.toggle("is-current", i === state.page);
        d.classList.toggle("is-done", i < state.page);
      });
      hint.hidden = !state.showHint;
      if (shown !== -1 && shown !== state.page) {
        card.classList.add("is-changing");
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => card.classList.remove("is-changing"), FADE_MS);
      }
      shown = state.page;
    },
    close() {
      el.hidden = true;
      stories = null;
      clearTimeout(fadeTimer);
      card.classList.remove("is-changing");
    },
  };
}
