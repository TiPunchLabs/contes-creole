# Universes per book — design

- **Date**: 2026-09-29
- **Branch**: `feat/universes-per-book`
- **Status**: awaiting review

## 1. Goal

Split the app into independent **universes**:

- the **tree of tales** (Pyébwa a Sav) is one universe;
- **each book** hanging from the tree is its own universe, in its own folder.

Each universe can be iterated on (look, staging, interactions) without touching the others. A
universe may use any JS rendering library (Three.js, raw WebGL, other). Tale **text** is authored
in Markdown, one file per language.

This first iteration delivers the structure **and a faithful port of the v13 mockup**
(`design/mockup-v13-standalone.html`, sources in `design/v13/`). Behaviour and look must match the
mockup. Known issues from `doc/architecture.md` are fixed only where the new structure requires it.

### Success criteria

1. The site behaves like the v13 mockup (see the visual checklist in §9).
2. Changing files under `src/tree/` never requires changing `src/books/**`, and vice versa —
   enforced by lint.
3. Adding a book = adding a folder under `src/books/`; no central list to edit.
4. Tale text lives in `story/<lang>.md`; the existing Kréyòl and French text is converted without
   changing a word.

### Out of scope

- The 8 issues listed in `doc/architecture.md` §4, except those the structure fixes (per-book world,
  per-universe seeded random).
- Writing `en.md` (authored content — provided separately).
- New books' worlds (Zanba é Lapen, Konpè Lapen stay locked with a manifest only).
- Moving the tree's own texts (intro, Konteur bubble) to Markdown.

## 2. Decisions

| Topic          | Decision                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Structure      | One folder per universe, books auto-discovered with `import.meta.glob` (approach A)                                |
| Rendering tech | Free per universe; the app hands a universe a DOM container, never a Three.js scene                                |
| Loading        | Book manifests load eagerly (tree needs every card); a book's world, theme and story load with `import()` on entry |
| Reading UI     | Shared (text card, language switch, dots, arrows, back button, bubble), restylable per book                        |
| Tale text      | Markdown, one file per language, pages linked across languages by a stable id                                      |
| Staging        | TypeScript, private to the book's world, keyed by page id                                                          |
| Transitions    | Tree plays its dive, a flash covers the screen, the book mounts behind it, the flash fades                         |

## 3. Structure

```
src/
  main.ts                     boot
  app/                        shell — shared by every universe
    app.ts                    state machine: tree | dive | book | rise; transitions; global keys
    contract.ts               TreeUniverse, BookManifest, BookWorld, Story types + defineBook()
    registry.ts               discovers books/*/book.ts, sorts by `order`, loads stories lazily
    story/parse.ts            Markdown story parser (no dependency)
    reading-ui/               text card, language switch, page dots, arrows, back button, bubble
      reading-ui.ts
      reading-ui.css          exposes --reading-* CSS variables
    transition.ts             flash overlay
    fallback.ts               "Pyébwa-la pa ka limé…" WebGL failure screen
  shared/                     optional toolbox — universes MAY import, never required
    random.ts                 createRng(seed) — one instance per universe
    math.ts                   lerp, clamp, smoothstep
    three/                    glowPoints, softSprite (Three.js helpers)
  tree/                       TREE universe (Three.js)
    index.ts                  mountTree()
    scene/                    landscape.ts, tree.ts, konteur.ts, cards.ts, camera.ts, locked-cover.ts
    overlay/                  tree DOM: title, intro, card label, climb bar, Konteur bubble text
    assets/konteur.png
  books/
    ti-kannot/                Ti Kannot universe (Three.js)
      book.ts                 manifest
      cover.ts                paints the card cover (moon, river, bird, crab)
      story/gcf.md            Kréyòl (required)
      story/fr.md             Français
      staging.ts              `env` per page id (sky, water, moon, characters…)
      theme.css               reading-UI overrides, scoped to [data-book="ti-kannot"]
      world/                  index.ts (mount) + sky.ts, valley.ts, water.ts, props.ts, characters.ts
    zanba/book.ts             manifest only, ready: false
    konpe-lapen/book.ts       manifest only, ready: false
```

The current `src/content/` (typed data extracted from v13) is replaced: text moves to
`books/ti-kannot/story/*.md`, `env` moves to `books/ti-kannot/staging.ts`, tale metadata moves to
each `book.ts`.

### Isolation rules (ESLint `no-restricted-imports`, fails lint and pre-commit)

- `src/tree/**` must not import `src/books/**`.
- `src/books/<x>/**` must not import `src/tree/**` nor `src/books/<y>/**`.
- `src/app/**` may import universes only through `contract.ts` and `registry.ts` (the registry
  globs books; `main.ts` wires the tree).
- `src/shared/**` must not import `app/`, `tree/` or `books/`.
- Every module may import `src/shared/**` and `src/app/contract.ts`.

## 4. Story format (Markdown)

One file per language, in reading order: `story/<lang>.md`, `lang` ∈ `gcf` (Guadeloupean Creole,
ISO 639-3), `fr`, `en`. Only `gcf.md` is required.

```md
---
lang: gcf
title: Ti Kannot é Gwo Rako
---

## Larivyè Klè {#ye-krik}

<!-- label: Yé krik ! -->

On lè, adan on ti bouk ki té ant gwo pyébwa, flè wouj é montangn vè…

## « Poukwa lésé tout dlo-tala alé an lanmè ? » {#on-lide-gwo-rako}

<!-- label: On lidé Gwo Rako -->

Gwo Rako pran on gran kalbas, i plen-y…

– Gwo Rako, poukwa ou ka pran tout dlo-tala ?
– Pou jou ké rivé épi pé ké ni dlo ankò !
```

Rules:

- Front matter: `lang` (must match the file name) and `title`.
- `## <title> {#<id>}` starts a page. `id` is kebab-case, identical in every language file, and is
  the key used by `staging.ts`.
- `<!-- label: … -->` right after the heading: the small label above the page title. Labels are
  taken from the `gcf` file (in v13 they are Kréyòl-only), other languages may override.
- `> …` blockquote: optional short summary of the page, in the file's language. The v13 French
  gloss `kr.g` becomes the `>` summary of the matching page in `fr.md`, kept verbatim.
- Paragraphs are separated by blank lines. A paragraph starting with `– ` (en dash) is a dialogue
  line.
- Inline formatting: `*italic*`, `**bold**`. All other text is escaped (no raw HTML).

Parsed shape:

```ts
type Lang = "gcf" | "fr" | "en";
interface StoryPage {
  id: string;
  label: string;
  title: string;
  blocks: { kind: "text" | "dialogue"; html: string }[];
  summary?: string;
}
interface Story {
  lang: Lang;
  title: string;
  pages: StoryPage[];
}
```

### v13 → Markdown conversion

- 12 pages; ids are the kebab-cased, accent-stripped v13 labels (`Yé krik !` → `ye-krik`,
  `On lidé Gwo Rako` → `on-lide-gwo-rako`), and are the keys of `staging.ts`.
- v13 bodies inline dialogue as `–` inside one string; the mockup's display splits them with
  `s.replace(/\s–\s/g, "\n– ")`. The conversion applies the same split: narration before the first
  `–` is a text block, each ` – …` segment is a dialogue block. Words are unchanged.

### Languages in the reading UI

- The switch offers: **Kréyòl**, **Bileng**, **Français**, and **English** when `en.md` exists.
- Bileng shows the `gcf` page, then the `fr` page body underneath (v13 behaviour).
- Default language: Kréyòl.

## 5. Contract

```ts
// app/contract.ts
interface BookManifest {
  id: string;
  order: number;
  ready: boolean;
  card: { title: string; sub: string; theme: string };
  /** Paints the card cover; the tree calls it on a 512×720 canvas. Locked books omit it. */
  cover?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Lazy world module; its import also pulls the book's theme.css. Absent when !ready. */
  world?: () => Promise<{ default: BookWorld }>;
}

interface BookWorld {
  mount(container: HTMLElement, ctx: BookContext): BookHandle | Promise<BookHandle>;
}
interface BookContext {
  story: Story; // current language (gcf when Bileng)
  page: number;
  bubble: {
    show(text: string, anchor: () => { x: number; y: number; visible: boolean }): void;
    hide(): void;
  };
}
interface BookHandle {
  setPage(index: number): void; // the world animates towards the page itself
  setStory(story: Story): void; // language change
  dispose(): void; // must release GPU resources and stop its loop
}

interface TreeContext {
  books: BookManifest[];
  onEnter(bookId: string): void;
}
interface TreeHandle {
  dive(bookId: string): Promise<void>; // resolves when the flash may cover the screen
  pause(): void; // stop loop, keep state
  resume(fromBookId?: string): void; // camera back at that book's card
  dispose(): void;
}
```

- Each universe owns its canvas, its render loop, and its pointer input on its container
  (tree: wheel/touch climb, hover, card and Konteur picking; book world: character picking).
- The app owns global keys and the reading UI: wheel/touch paging in book mode (60 px accumulator,
  750 ms lock as in v13), arrow keys, Space, PageUp/PageDown, Escape, dots, prev/next buttons.
- `defineBook()` is an identity helper giving type checking to `book.ts`.

## 6. Flow

```
TREE   tree handles climb/hover; card click or "Antré adan kont-la" → ctx.onEnter(id)
DIVE   app: tree.dive(id)  ‖  Promise.all([manifest.world(), registry.loadStories(id)])
       → flash in → tree.pause() → world.mount(bookContainer) → root[data-book=id]
       → reading UI shown → flash out (1.2 s)
BOOK   reading UI → handle.setPage(i); language switch → handle.setStory(story)
RISE   Escape / back button → flash in (1.1 s) → handle.dispose() → remove data-book
       → tree.resume(id) → flash out
```

Timings match v13: dive 1.7 s (flash ramps over its last 45 %), rise 1.1 s, fade 1.2 s.

## 7. Per-book styling

- `reading-ui.css` defines defaults for `--reading-accent`, `--reading-text`, `--reading-card-bg`,
  `--reading-card-border`, `--reading-font-display`, `--reading-font-body`.
- A book's `theme.css` only overrides these variables (or adds rules) under
  `[data-book="<id>"]`. It is imported by `world/index.ts`, so it loads with the world.
- Ti Kannot's `theme.css` holds the v13 colours (`#7af0dc`, `#f6ead0`, …), so the result is
  identical to the mockup.

## 8. Error handling

| Failure                           | Behaviour                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------- |
| WebGL unavailable at tree mount   | Retry up to 5 times, 1.2 s apart (v13), then the fallback screen with _Rechaje_ |
| Book world or story fails to load | Flash fades back to the tree, short message "Kont-la pa ka chajé" for 4 s       |
| Book world mount throws           | Same as above, world disposed if partially mounted                              |
| Invalid story file                | Parser throws with file + line; caught at build time by tests                   |

## 9. Testing

**Vitest**

- `app/story/parse.test.ts`: front matter, pages, ids, labels, summary, dialogue, inline
  formatting, HTML escaping, error on missing id / duplicate id / lang mismatch.
- `books/books.test.ts` (globs every book): `gcf.md` present; all language files share the same
  ids in the same order; ready books have `world`, `cover`, and a `staging.ts` entry for every id;
  book ids and `order` values unique.
- `app/registry.test.ts`: discovery and sort by `order`.
- Ti Kannot conversion: for every page, the plain text of its blocks joined with a single space
  equals the v13 `kr.b` / `fr.b` string, titles equal `kr.t` / `fr.t`, and the `fr.md` summary
  equals `kr.g` (guards "not a word changed"; v13 data read from `design/v13/kont-data.js`).

**Lint**: isolation rules (§3).

**Manual visual checklist** — side by side with `design/mockup-v13-standalone.html`:

1. Tree: landscape, tree, leaves, fireflies, mist, Konteur with lantern; intro text fades on climb.
2. Climbing by wheel, touch drag and arrow keys; climb bar follows.
3. Card label appears near a card; locked cards show "Talè · bientôt".
4. Konteur hover: lantern brightens, bubble "Yé krik !…".
5. Entering Ti Kannot: zoom into the card, flash, river world appears.
6. 12 pages: sky, water level, moon, rain, calabashes, dam, spring, tank change as in v13.
7. Paging by wheel, arrows, dots, buttons; scroll hint on page 1.
8. Clicking the bird / crab shows their dialogue line.
9. Kréyòl / Bileng / Français switch.
10. Escape / back: flash, back on the tree at Ti Kannot's card.

## 10. Porting map (v13 → new structure)

| v13 (`design/v13/scene13.js`)                                                   | Destination                                           |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| l. 1–40 PRNG, math, `glowPoints`, `softSprite`                                  | `shared/random.ts`, `shared/math.ts`, `shared/three/` |
| l. 41–84 `coverTex` — ready branch                                              | `books/ti-kannot/cover.ts`                            |
| l. 41–84 `coverTex` — locked branch, frame, title                               | `tree/scene/locked-cover.ts`, `tree/scene/cards.ts`   |
| l. 95–181 hub (ground, mornes, vegetation, tree, Konteur, camera spiral, cards) | `tree/scene/*`                                        |
| l. 182–267 world (sky, valley, water, banks, spring, dam, tank, characters)     | `books/ti-kannot/world/*`                             |
| l. 268–296 state, `mixEnv`, `worldCam`                                          | `books/ti-kannot/world/index.ts`                      |
| l. 297–371 `frame`, `pick` — hub branch                                         | `tree/index.ts`                                       |
| l. 297–371 `frame`, `pick` — world branch                                       | `books/ti-kannot/world/index.ts`                      |
| `template.html` hub overlay                                                     | `tree/overlay/`                                       |
| `template.html` reading UI, bubble, fallback                                    | `app/reading-ui/`, `app/fallback.ts`                  |
| `template.html` `DCLogic` state machine                                         | `app/app.ts`                                          |
| `kont-data.js` `TALES`                                                          | `books/*/book.ts`                                     |
| `kont-data.js` `PAGES[].kr/fr`                                                  | `books/ti-kannot/story/{gcf,fr}.md`                   |
| `kont-data.js` `PAGES[].env`                                                    | `books/ti-kannot/staging.ts`                          |

Three.js is the npm `three` package (r186 instead of r160): port API differences if any arise.
