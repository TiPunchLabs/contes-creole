# 🗣️ Lang kréyòl — language notes per tale

> **Status**: draft for review — 2026-10-04
> **Branch**: `feat/kreyol-language-notes`
> **Scope**: new shared shell feature (`src/app/language/`, `src/app/language-panel/`), small hooks in
> `src/app/registry.ts`, `src/app/app.ts`, `src/app/contract.ts`, `reading-ui.css` spacing; content in
> `src/books/ti-kannot/langue/fr.md`.

---

## 🧠 Mental Model

```
 src/books/<id>/langue/fr.md ──► registry.loadNotes(id) ──► parseNotes() ──► LanguageNotes
                                         │ (lazy, in parallel with world + stories; failure ⇒ null)
                                         ▼
 app.ts enter() ──► panel.attach(notes, stories.gcf) ──► ☰ burger visible (top-right)
                                                            │ click
                                                            ▼
                         ┌──────────── language panel (dialog) ────────────┐
   tale (unchanged) ◄─── │ notes · examples « … » p. N · label · details  │
   input ignored while   └──────────────────────────────────────────────────┘
   panel is open; Escape closes the panel only
```

The language section sits **on top of** the tale. It is reachable **only** through the burger menu and
**never changes the tale's mechanics**: paging, scroll, keys, 3D world, language switch and reading card
stay exactly as they are. Closing the panel gives back the same page, the same language, the same view.

---

## 🎯 1. Goals & non-goals

**Goals**

- Each tale can ship a short, example-driven presentation of Kréyòl features, using the tale's own
  sentences as examples.
- Two reading depths for a mixed audience (learners, children with a parent, Creole speakers): a short
  takeaway visible to everyone, and an optional collapsed "Pou alé pli lwen" level.
- Works on desktop and mobile; accessible (dialog semantics, focus trap, keyboard).
- Examples cannot silently drift from the tale: a test checks each one against `story/gcf.md`.
- A first draft of 6–8 notes for Ti Kannot, written by Claude and flagged `draft: true` until a Creole
  speaker validates it.

**Non-goals**

- No annotation, highlight, underline or glossary inside the reading card.
- No link from a note to a page (no jump), no highlighting of notes for the current page.
- No change to paging, input handling (when the panel is closed), worlds, or `BookManifest`.
- No real menu with several entries: the burger opens the language panel directly (YAGNI).
- No English notes yet (the format allows `langue/en.md` later; only `fr.md` is loaded).
- No notes on the tree screen.

---

## 📝 2. Content format — `src/books/<id>/langue/fr.md`

```markdown
---
lang: fr
title: Lang kréyòl
draft: true
---

## « té ka » : ce qui durait {#te-ka}

Devant le verbe, **té ka** raconte ce qui se passait et durait : c'est l'imparfait.

> Bonmaten, larivyè-la **té ka** chanté. {ye-krik}
> Le matin, la rivière chantait.

### Pou alé pli lwen

_té_ marque le passé, _ka_ l'action en cours. Seul, _ka chanté_ = « chante (en ce moment) ».
```

### 2.1 Rules

| Element      | Syntax                                                                            | Meaning                                                           |
| ------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Front matter | `lang`, `title` required; `draft: true` optional                                  | `lang` must match the file name (`fr.md`)                         |
| Note         | `## Title {#id}`                                                                  | id: kebab-case, unique in the file                                |
| Summary      | paragraphs after the heading, before `### Pou alé pli lwen`                       | short takeaway, always visible; ≥ 1 paragraph                     |
| Example      | `>` blockquote of **exactly two lines**                                           | line 1: Kréyòl ending with `{page-id}`; line 2: translation       |
| More         | `### Pou alé pli lwen` then paragraphs (and examples allowed) up to the next `##` | collapsed detail level                                            |
| Inline       | `**bold**`, `*italic*`                                                            | rendered through the story parser's `renderInline` (escaped HTML) |

- A note has **at least one example** (in the summary part).
- Blank lines separate paragraphs and examples, as in `story/*.md`.
- Errors are thrown as `NotesParseError` with a `file:line: message` text, like `StoryParseError`.

### 2.2 Data (added to `src/app/contract.ts`)

```ts
/** Plain text plus escaped HTML with <em>/<strong> only. */
export interface InlineText {
  text: string;
  html: string;
}

export interface LanguageExample {
  /** Id of the source page in story/gcf.md. */
  pageId: string;
  gcf: InlineText;
  translation: InlineText;
}

export interface LanguageNote {
  id: string;
  title: string;
  summary: InlineText[];
  examples: LanguageExample[];
  /** "Pou alé pli lwen" paragraphs; absent when the note has none. */
  more?: InlineText[];
  moreExamples?: LanguageExample[];
}

export interface LanguageNotes {
  lang: Lang;
  title: string;
  draft: boolean;
  notes: LanguageNote[];
}
```

The page reference `p. N · label` is computed at display time from the index of `pageId` in
`stories.gcf.pages`. It is **plain text, not a link**.

### 2.3 Ti Kannot first draft (6–8 notes)

Candidate topics, all taken from `story/gcf.md`: _Yé krik ! / Yé krak !_ (opening a tale), _té ka_
(imperfect), _ka_ (progressive present), _ké_ (future, _nou ké gadé_), determiner _-la / -a_
(_larivyè-la_, _dlo-la_), _on_ (indefinite article), pronouns and possessives (_kaz a-y_, _dlo a-w_),
negation _pa / pon_. Final selection depends on what the tale actually illustrates. The file starts with
`draft: true`; the Kréyòl in examples is copied from the tale, never re-spelled.

---

## 🏗️ 3. UI — burger and panel

### 3.1 Burger

- Top-right corner; the existing language switch shifts left by one button width (CSS only, behaviour
  unchanged). Same translucent style as the language switch.
- Present only while a book is open **and** that book has notes. Hidden on the tree.
- `button`, `aria-label="Lang kréyòl"`, `aria-expanded`, `aria-controls` → panel id. Three-line SVG icon.

### 3.2 Panel

|        | Desktop (> 600 px, the existing `reading-ui` breakpoint) | Mobile (≤ 600 px)            |
| ------ | -------------------------------------------------------- | ---------------------------- |
| Shape  | right drawer, `min(440px, 92vw)`, full height            | full-screen sheet sliding up |
| Behind | translucent scrim over the tale; clicking it closes      | fully covered                |
| Scroll | internal, `overscroll-behavior: contain`                 | same                         |

- Style: the reading card's "old page" look through the `--reading-*` custom properties, so each book's
  `theme.css` themes its panel too.
- Content: header (title from front matter, **brouyon — à valider** badge when `draft`, close ✕), then one
  section per note: title, summary paragraphs, examples (Kréyòl large with bold key part, translation in
  muted italic, source `p. 1 · Yé krik !`), then `<details><summary>Pou alé pli lwen</summary>` when
  `more` exists.
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title; on open focus goes to ✕;
  Tab / Shift+Tab are trapped in the panel; on close focus returns to the burger.
- `prefers-reduced-motion`: no slide animation.

### 3.3 Module

`src/app/language-panel/language-panel.ts` + `language-panel.css`, separate from `reading-ui`:

```ts
export interface LanguagePanel {
  /** Shows the burger for this book; `story` resolves page references. */
  attach(notes: LanguageNotes, story: Story): void;
  /** Closes the panel and hides the burger. */
  detach(): void;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  dispose(): void;
}
export function createLanguagePanel(root: HTMLElement): LanguagePanel;
```

The panel handles its own clicks (burger, ✕, scrim) and the Tab focus trap. It does **not** listen to
Escape (see §4.3).

---

## 🔀 4. Shell integration

### 4.1 Loading — `src/app/registry.ts`

- New lazy glob `../books/*/langue/*.md` (`?raw`).
- `Registry.loadNotes(bookId): Promise<LanguageNotes | null>`: parses `langue/fr.md`, `null` when the
  book has none. `AppDeps` gains the same `loadNotes`.
- New parser `src/app/language/parse.ts` (`parseNotes(source, file)`), reusing `renderInline`.

### 4.2 Book lifecycle — `src/app/app.ts`

- In `enter()`, notes load in parallel with world and stories. Their failure is caught **separately**
  (`console.error`, notes = `null`): a broken notes file never prevents the tale from opening.
- After the book is mounted: `panel.attach(notes, stories.gcf)` when notes exist.
- In `closeBook()`: `panel.detach()`. In `dispose()`: `panel.dispose()`.
- An unknown `pageId` at display time drops the `p. N` reference and logs `console.warn` (the test in
  §5.2 prevents it from shipping).

### 4.3 Input while the panel is open

One extra check, `panel.isOpen`, in the existing handlers. Nothing changes when the panel is closed.

| Input                | Panel closed (unchanged)       | Panel open                                                            |
| -------------------- | ------------------------------ | --------------------------------------------------------------------- |
| Wheel                | turns pages (`preventDefault`) | ignored by the tale, **no** `preventDefault` → panel scrolls natively |
| Touch swipe          | turns pages                    | ignored by the tale                                                   |
| ←→↑↓ Space PgUp PgDn | turns pages                    | ignored by the tale → native panel scrolling                          |
| Escape               | leaves the book                | **closes the panel only**                                             |

Escape is routed in **one place**, `onKey` in `app.ts`. A second Escape listener on the panel would close
it first and the window listener would then see `isOpen === false` and leave the book. That design is
ruled out.

The back button and language switch are under the scrim / sheet while the panel is open, so leaving or
switching language is not possible from there.

---

## 🧪 5. Tests (TDD, vitest; happy-dom where DOM is needed)

1. **Parser** — `src/app/language/parse.test.ts`: front matter, notes, summary, two-line examples with
   `{page-id}`, "Pou alé pli lwen", `draft`, inline markup; errors with `file:line:` for missing front
   matter, lang/file mismatch, heading without id, duplicate id, example without `{page-id}` or not two
   lines, note without example, text before the first note.
2. **Book consistency** — in `src/books/books.test.ts`: for every book with `langue/`, each `pageId`
   exists in `gcf.md`, and each Kréyòl example (markers removed, whitespace and `'`/`’` normalised)
   appears **verbatim** in that page's text.
3. **Panel** — `src/app/language-panel/language-panel.test.ts`: burger visible after `attach`, hidden
   after `detach`; open sets `aria-expanded` and focuses ✕; renders notes, examples, `p. N · label`,
   `<details>`; badge only when `draft`; ✕ and scrim close and refocus the burger; Tab trapped; content
   is escaped.
4. **Shell** — in `src/app/app.test.ts`: with the panel open, wheel / keys / swipe do not call `setPage`
   and the wheel is not prevented; Escape closes the panel without leaving the book, a second Escape
   leaves it; a throwing `loadNotes` still opens the book without a burger; `closeBook()` closes the
   panel.
5. **Manual** — in the user's own browser (no headless Chromium): desktop and mobile (devtools
   responsive mode); the tale behaves the same after closing the panel; the Ti Kannot draft is read by a
   Creole speaker before `draft: true` is removed.

Gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

---

## ⚠️ 6. Risks

| Risk                                         | Mitigation                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Inaccurate Kréyòl explanations               | `draft: true` badge, review by a Creole speaker before removing it; examples copied verbatim from the tale |
| Notes drifting from the tale after edits     | verbatim test (§5.2)                                                                                       |
| Panel input leaking into the tale            | `isOpen` guard + Escape routed in one place, covered by shell tests                                        |
| Burger crowding the top bar on small screens | burger and language switch tested in responsive mode; switch shifts left only                              |

---

> **Document created on**: 2026-10-04
> **Author**: Claude (with Xavier Gueret)
> **Version**: 0.1 — draft for review
