# 🗣️ Lang kréyòl — language notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each tale an optional "Lang kréyòl" panel, opened only from a burger button, that explains Kréyòl features with sentences quoted from the tale — without changing the tale's mechanics.

**Architecture:** Each book may ship `src/books/<id>/langue/fr.md`. The registry loads and parses it (`parseNotes`) lazily; `app.ts` loads it in parallel with the world and, once the book is open, attaches it to a shell-owned `LanguagePanel` (burger + dialog). While the panel is open, the shell's existing input handlers ignore the tale; Escape is routed only in `app.ts`.

**Tech Stack:** Vite 8, TypeScript 6 (strict), vanilla DOM + CSS, vitest (+ happy-dom for DOM tests), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-04-kreyol-language-notes-design.md`

## Global Constraints

- Package manager: `pnpm` only.
- English identifiers, comments, commit messages (Conventional Commits). Tale content stays in Kréyòl / French — never re-spell Kréyòl quoted from `story/gcf.md`.
- Strict TypeScript, no `any`. Docstrings on functions, no obvious inline comments.
- `src/books/<id>/` may only hold the content file `langue/fr.md`; no code import between the shell and books except through the registry glob (ESLint `no-restricted-imports`).
- No change to `BookManifest`, to paging, to worlds, or to input handling while the panel is closed.
- Desktop/mobile breakpoint: `max-width: 600px` (the one `reading-ui.css` uses).
- Panel: `role="dialog"`, `aria-modal="true"`, focus to ✕ on open, Tab trapped, focus back to the burger on close, no animation under `prefers-reduced-motion: reduce`.
- No headless browser runs: manual checks happen in the user's own browser.
- Gate before finishing: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- Commits: on branch `feat/kreyol-language-notes` only, and only once the user has agreed to commits for this execution.

## Review Focus

- Escape pressed while the panel is open → only the panel closes, the reader stays in the book (pinned in Task 5).
- Wheel over the open panel → the panel scrolls; the tale must not call `preventDefault` or turn a page (pinned in Task 5).
- `hidden` attribute defeated by a `display: flex/grid` rule → burger or panel visible on the tree; CSS must restate `[hidden] { display: none }` (rule in Task 4, checked manually in Task 6 — happy-dom does not apply CSS).
- A notes file with raw HTML or a typo'd `{page-id}` → text is escaped, the source reference is dropped with a warning, nothing crashes (pinned in Task 4; typo'd ids in shipped content fail in Task 3).
- A broken notes file → the tale still opens, simply without a burger (pinned in Task 5).

---

## File structure

| File                                            | Status | Responsibility                                                                       |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `src/app/contract.ts`                           | modify | `InlineText`, `LanguageExample`, `LanguageNote`, `LanguageNotes` types               |
| `src/app/story/parse.ts`                        | modify | export `HEADING` and a shared `readHeader()` (front matter + lang/file/title checks) |
| `src/app/language/parse.ts`                     | create | `parseNotes(source, file)`, `NotesParseError`                                        |
| `src/app/language/parse.test.ts`                | create | parser tests                                                                         |
| `src/app/registry.ts`                           | modify | notes glob + `loadNotes(bookId)`                                                     |
| `src/app/registry.test.ts`                      | modify | `loadNotes` tests                                                                    |
| `src/books/ti-kannot/langue/fr.md`              | create | first draft of 8 notes, `draft: true`                                                |
| `src/books/books.test.ts`                       | modify | verbatim guard: examples vs `story/gcf.md`                                           |
| `src/app/language-panel/language-panel.ts`      | create | burger + dialog, `createLanguagePanel(root)`                                         |
| `src/app/language-panel/language-panel.css`     | create | burger, scrim, drawer / sheet, notes styling                                         |
| `src/app/language-panel/language-panel.test.ts` | create | panel tests                                                                          |
| `src/app/app.ts`                                | modify | load notes, attach/detach panel, input guard, Escape routing                         |
| `src/app/app.test.ts`                           | modify | shell integration tests                                                              |
| `src/main.ts`                                   | modify | pass `registry.loadNotes`                                                            |
| `CLAUDE.md`, `doc/development.md`               | modify | document `langue/fr.md` and the new modules                                          |

---

### Task 1: Notes types and parser

**Files:**

- Modify: `src/app/contract.ts` (append after `Stories`)
- Modify: `src/app/story/parse.ts` (extract `readHeader`, export `HEADING`)
- Create: `src/app/language/parse.ts`
- Test: `src/app/language/parse.test.ts` (new), `src/app/story/parse.test.ts` (must keep passing unchanged)

**Interfaces:**

- Consumes: `renderInline(source): { text: string; html: string }` from `src/app/story/parse.ts`.
- Produces:
  - `contract.ts`: `InlineText { text; html }`, `LanguageExample { pageId: string; gcf: InlineText; translation: InlineText }`, `LanguageNote { id; title; summary: InlineText[]; examples: LanguageExample[]; more?: InlineText[]; moreExamples?: LanguageExample[] }`, `LanguageNotes { lang: Lang; title: string; draft: boolean; notes: LanguageNote[] }`.
  - `story/parse.ts`: `export const HEADING: RegExp`, `export function readHeader(lines: string[], file: string, fail: (line: number, message: string) => never): { lang: Lang; title: string; meta: Map<string, string>; end: number }`.
  - `language/parse.ts`: `export class NotesParseError extends Error`, `export function parseNotes(source: string, file: string): LanguageNotes`.

- [ ] **Step 1: Write the failing parser tests**

Create `src/app/language/parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NotesParseError, parseNotes } from "./parse";

const FILE = "langue/fr.md";
const md = (body: string, front = "lang: fr\ntitle: Lang kréyòl"): string =>
  `---\n${front}\n---\n\n${body}`;
const NOTE =
  "## « té ka » {#te-ka}\n\nL'**imparfait**.\n\n> Larivyè-la **té ka** chanté. {ye-krik}\n> La rivière chantait.\n";

describe("parseNotes", () => {
  it("reads the front matter; draft defaults to false", () => {
    expect(parseNotes(md(NOTE), FILE)).toMatchObject({
      lang: "fr",
      title: "Lang kréyòl",
      draft: false,
    });
    expect(parseNotes(md(NOTE, "lang: fr\ntitle: T\ndraft: true"), FILE).draft).toBe(true);
  });

  it("reads a note: id, title, summary and a two-line example", () => {
    const [note] = parseNotes(md(NOTE), FILE).notes;
    expect(note).toMatchObject({ id: "te-ka", title: "« té ka »" });
    expect(note.summary).toEqual([
      { text: "L'imparfait.", html: "L&#39;<strong>imparfait</strong>." },
    ]);
    expect(note.examples).toEqual([
      {
        pageId: "ye-krik",
        gcf: {
          text: "Larivyè-la té ka chanté.",
          html: "Larivyè-la <strong>té ka</strong> chanté.",
        },
        translation: { text: "La rivière chantait.", html: "La rivière chantait." },
      },
    ]);
    expect(note.more).toBeUndefined();
    expect(note.moreExamples).toBeUndefined();
  });

  it("joins wrapped lines, keeps several paragraphs and several examples", () => {
    const [note] = parseNotes(
      md(
        "## A {#a}\n\nUn\ndeux.\n\nTrois.\n\n> Tèks en. {p1}\n> Texte un.\n\n> Tèks dé. {p2}\n> Texte deux.\n",
      ),
      FILE,
    ).notes;
    expect(note.summary.map((s) => s.text)).toEqual(["Un deux.", "Trois."]);
    expect(note.examples.map((e) => e.pageId)).toEqual(["p1", "p2"]);
  });

  it("reads the Pou alé pli lwen level and several notes", () => {
    const { notes } = parseNotes(
      md(
        `${NOTE}\n### Pou alé pli lwen\n\nPlis.\n\n> Tèks. {p3}\n> Texte.\n\n## B {#b}\n\nS.\n\n> T. {p1}\n> T.\n`,
      ),
      FILE,
    );
    expect(notes.map((n) => n.id)).toEqual(["te-ka", "b"]);
    expect(notes[0].more?.map((m) => m.text)).toEqual(["Plis."]);
    expect(notes[0].moreExamples?.map((e) => e.pageId)).toEqual(["p3"]);
    expect(notes[1].more).toBeUndefined();
  });

  it("escapes HTML in every text", () => {
    const [note] = parseNotes(
      md("## A {#a}\n\n<b>x</b>\n\n> <i>y</i> {p}\n> <script>z</script>\n"),
      FILE,
    ).notes;
    expect(note.summary[0].html).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(note.examples[0].gcf.html).toBe("&lt;i&gt;y&lt;/i&gt;");
    expect(note.examples[0].translation.html).toBe("&lt;script&gt;z&lt;/script&gt;");
  });

  it("reports errors as NotesParseError with file and line", () => {
    expect(() => parseNotes(md("## A\n"), FILE)).toThrow(NotesParseError);
    expect(() => parseNotes(md("## A\n"), FILE)).toThrow(
      /^langue\/fr\.md:6: note heading needs an id/,
    );
  });

  it.each([
    ["missing front matter", "## A {#a}\n", /:1: missing front matter/],
    ["lang not matching the file", md(NOTE, "lang: gcf\ntitle: T"), /does not match the file name/],
    ["missing title", md(NOTE, "lang: fr"), /missing title/],
    ["duplicate id", md(`${NOTE}\n${NOTE}`), /duplicate note id "te-ka"/],
    ["text before the first note", md(`Tèks.\n\n${NOTE}`), /:6: text before the first note/],
    ["one-line example", md("## A {#a}\n\nS.\n\n> Tèks. {p}\n"), /:10: an example is two lines/],
    [
      "three-line example",
      md("## A {#a}\n\nS.\n\n> T. {p}\n> T.\n> T.\n"),
      /an example is two lines/,
    ],
    [
      "example without page id",
      md("## A {#a}\n\nS.\n\n> Tèks.\n> Texte.\n"),
      /example needs its source page/,
    ],
    ["note without summary", md("## A {#a}\n\n> T. {p}\n> T.\n"), /:6: note "a" has no summary/],
    ["note without example", md("## A {#a}\n\nS.\n"), /note "a" has no example/],
    ["unknown subheading", md(`${NOTE}\n### Autre\n`), /unknown subheading "### Autre"/],
    [
      "duplicate more",
      md(`${NOTE}\n### Pou alé pli lwen\n\nX.\n\n### Pou alé pli lwen\n`),
      /duplicate "### Pou alé pli lwen"/,
    ],
    [
      "empty more",
      md(`${NOTE}\n### Pou alé pli lwen\n`),
      /note "te-ka": "Pou alé pli lwen" is empty/,
    ],
    ["no note at all", md(""), /:1: no note/],
  ])("rejects %s", (_name, source, error) => {
    expect(() => parseNotes(source, FILE)).toThrow(error);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/app/language/parse.test.ts`
Expected: FAIL — `Failed to resolve import "./parse"`.

- [ ] **Step 3: Add the types to the contract**

In `src/app/contract.ts`, after the `Stories` interface, add:

```ts
/** Plain text plus escaped HTML with <em>/<strong> only. */
export interface InlineText {
  text: string;
  html: string;
}

/** A sentence quoted from the tale, with its source page and translation. */
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

/** A book's `langue/<lang>.md`: language notes illustrated by the tale. */
export interface LanguageNotes {
  lang: Lang;
  title: string;
  /** Not yet validated by a Creole speaker. */
  draft: boolean;
  notes: LanguageNote[];
}
```

- [ ] **Step 4: Extract the shared header reader in the story parser**

In `src/app/story/parse.ts`:

1. Change `const HEADING = …` to `export const HEADING = /^##\s+(.+?)\s+\{#([a-z0-9]+(?:-[a-z0-9]+)*)\}$/;` (same regex, now exported).
2. Add, after `isLang`:

```ts
/** Front matter shared by story and notes files. */
export interface Header {
  lang: Lang;
  title: string;
  meta: Map<string, string>;
  /** Index of the closing `---` line. */
  end: number;
}

/** Reads the `---` front matter and checks lang (matching the file name) and title. */
export function readHeader(
  lines: string[],
  file: string,
  fail: (line: number, message: string) => never,
): Header {
  if (lines[0]?.trim() !== "---") fail(1, "missing front matter");
  const meta = new Map<string, string>();
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const match = META.exec(line);
    if (!match) return fail(i + 1, `invalid front matter line "${line}"`);
    meta.set(match[1], match[2].trim());
  }
  if (i >= lines.length) fail(1, "unterminated front matter");
  const lang = meta.get("lang");
  if (!isLang(lang)) return fail(1, `unknown lang "${lang ?? ""}"`);
  if (file.split("/").pop() !== `${lang}.md`)
    fail(1, `lang "${lang}" does not match the file name`);
  const title = meta.get("title");
  if (!title) return fail(1, "missing title");
  return { lang, title, meta, end: i };
}
```

3. In `parseStory`, replace everything from `if (lines[0]?.trim() !== "---")` down to `if (!title) return fail(1, "missing title");` with:

```ts
const { lang, title, end } = readHeader(lines, file, fail);
```

and change the page loop header `for (i += 1; i < lines.length; i++) {` to `for (let i = end + 1; i < lines.length; i++) {`.

- [ ] **Step 5: Run the story parser tests to verify the refactor**

Run: `pnpm vitest run src/app/story/parse.test.ts`
Expected: PASS (unchanged tests).

- [ ] **Step 6: Write the notes parser**

Create `src/app/language/parse.ts`:

```ts
import type { InlineText, LanguageExample, LanguageNote, LanguageNotes } from "../contract";
import { HEADING, readHeader, renderInline } from "../story/parse";

/** Thrown for a malformed `langue/<lang>.md` file; the message starts with `file:line:`. */
export class NotesParseError extends Error {}

const MORE = "### Pou alé pli lwen";
const SOURCE = /^(.+?)\s+\{([a-z0-9]+(?:-[a-z0-9]+)*)\}$/;

interface QuoteLine {
  line: number;
  text: string;
}

/** Parses one `langue/<lang>.md` file; `file` names errors and must end with `<lang>.md`. */
export function parseNotes(source: string, file: string): LanguageNotes {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const fail = (line: number, message: string): never => {
    throw new NotesParseError(`${file}:${line}: ${message}`);
  };
  const { lang, title, meta, end } = readHeader(lines, file, fail);

  const notes: LanguageNote[] = [];
  const ids = new Set<string>();
  let note = null as LanguageNote | null;
  let noteLine = 0;
  let inMore = false;
  let paragraph: string[] = [];
  let quote: QuoteLine[] = [];

  const flushParagraph = (): void => {
    if (!note || paragraph.length === 0) return;
    const text: InlineText = renderInline(paragraph.join(" "));
    if (inMore) (note.more ??= []).push(text);
    else note.summary.push(text);
    paragraph = [];
  };
  const flushQuote = (): void => {
    if (!note || quote.length === 0) return;
    const [kreyol, translation] = quote;
    if (quote.length !== 2 || !translation) {
      return fail(kreyol.line, "an example is two lines: Kréyòl {page-id}, then the translation");
    }
    const match = SOURCE.exec(kreyol.text);
    if (!match) return fail(kreyol.line, "example needs its source page: Kréyòl text {page-id}");
    const example: LanguageExample = {
      pageId: match[2],
      gcf: renderInline(match[1]),
      translation: renderInline(translation.text),
    };
    if (inMore) (note.moreExamples ??= []).push(example);
    else note.examples.push(example);
    quote = [];
  };
  const closeNote = (): void => {
    flushParagraph();
    flushQuote();
    if (!note) return;
    if (note.summary.length === 0) fail(noteLine, `note "${note.id}" has no summary`);
    if (note.examples.length === 0) fail(noteLine, `note "${note.id}" has no example`);
    if (inMore && !note.more && !note.moreExamples) {
      fail(noteLine, `note "${note.id}": "Pou alé pli lwen" is empty`);
    }
    notes.push(note);
    note = null;
  };

  for (let i = end + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const n = i + 1;
    if (line.startsWith("## ")) {
      closeNote();
      const match = HEADING.exec(line);
      if (!match) return fail(n, "note heading needs an id: ## Title {#id}");
      const [, noteTitle, id] = match;
      if (ids.has(id)) fail(n, `duplicate note id "${id}"`);
      ids.add(id);
      note = { id, title: noteTitle, summary: [], examples: [] };
      noteLine = n;
      inMore = false;
      continue;
    }
    if (line === "") {
      flushParagraph();
      flushQuote();
      continue;
    }
    if (!note) return fail(n, "text before the first note");
    if (line.startsWith("### ")) {
      if (line !== MORE) return fail(n, `unknown subheading "${line}", only "${MORE}"`);
      if (inMore) return fail(n, `duplicate "${MORE}"`);
      flushParagraph();
      flushQuote();
      inMore = true;
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      quote.push({ line: n, text: line.replace(/^>\s?/, "") });
      continue;
    }
    flushQuote();
    paragraph.push(line);
  }
  closeNote();
  if (notes.length === 0) fail(1, "no note");
  return { lang, title, draft: meta.get("draft") === "true", notes };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run src/app/language src/app/story && pnpm typecheck`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/contract.ts src/app/story/parse.ts src/app/language
git commit -m "feat(app): parse per-book Kréyòl language notes"
```

---

### Task 2: Registry `loadNotes`

**Files:**

- Modify: `src/app/registry.ts`
- Test: `src/app/registry.test.ts`

**Interfaces:**

- Consumes: `parseNotes(source, file)` (Task 1), `LanguageNotes` (Task 1).
- Produces: `Registry.loadNotes(bookId: string): Promise<LanguageNotes | null>`; `createRegistry(manifests, stories, notes: NotesLoaders = {})`.

- [ ] **Step 1: Write the failing tests**

Append inside the `describe("createRegistry", …)` block of `src/app/registry.test.ts`:

```ts
const notes =
  "---\nlang: fr\ntitle: Lang\n---\n\n## Not {#not}\n\nRézimé.\n\n> Tèks. {paj}\n> Texte.\n";

it("loads a book's language notes, null when it has none", async () => {
  const registry = createRegistry(
    { "../books/a/book.ts": manifest("a", 1), "../books/b/book.ts": manifest("b", 2) },
    {},
    { "../books/a/langue/fr.md": async () => notes },
  );
  expect((await registry.loadNotes("a"))?.notes.map((n) => n.id)).toEqual(["not"]);
  expect(await registry.loadNotes("b")).toBeNull();
});

it("rejects malformed notes, naming the file", async () => {
  const registry = createRegistry(
    { "../books/a/book.ts": manifest("a", 1) },
    {},
    { "../books/a/langue/fr.md": async () => "oops" },
  );
  await expect(registry.loadNotes("a")).rejects.toThrow(/langue\/fr\.md:1: missing front matter/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/app/registry.test.ts`
Expected: FAIL — `registry.loadNotes is not a function`.

- [ ] **Step 3: Implement**

In `src/app/registry.ts`:

1. Imports become:

```ts
import type { BookManifest, Lang, LanguageNotes, Stories, Story } from "./contract";
import { parseNotes } from "./language/parse";
import { parseStory } from "./story/parse";
```

2. After `type StoryLoaders = …;` add `type NotesLoaders = Record<string, () => Promise<string>>;`
3. `Registry` gains:

```ts
  /** The book's `langue/fr.md`, parsed; null when the book has none. */
  loadNotes(bookId: string): Promise<LanguageNotes | null>;
```

4. After `STORY_PATH` add `const NOTES_PATH = /\/books\/([^/]+)\/langue\/fr\.md$/;`
5. Signature: `export function createRegistry(manifests: ManifestModules, stories: StoryLoaders, notes: NotesLoaders = {}): Registry {` and update its docstring to `/** Builds the book registry from glob results; validates folder ids and unique order values. */` (unchanged text).
6. In the returned object, after `loadStories`, add:

```ts
    async loadNotes(bookId) {
      const entry = Object.entries(notes).find(([path]) => NOTES_PATH.exec(path)?.[1] === bookId);
      if (!entry) return null;
      const [path, load] = entry;
      return parseNotes(await load(), path);
    },
```

7. The exported instance gets a third glob:

```ts
export const registry = createRegistry(
  import.meta.glob<{ default: BookManifest }>("../books/*/book.ts", { eager: true }),
  import.meta.glob<string>("../books/*/story/*.md", { query: "?raw", import: "default" }),
  import.meta.glob<string>("../books/*/langue/fr.md", { query: "?raw", import: "default" }),
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/app/registry.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/registry.ts src/app/registry.test.ts
git commit -m "feat(app): load each book's langue/fr.md through the registry"
```

---

### Task 3: Ti Kannot draft notes + verbatim guard

**Files:**

- Create: `src/books/ti-kannot/langue/fr.md`
- Modify: `src/books/books.test.ts`

**Interfaces:**

- Consumes: `registry.loadNotes(id)` (Task 2), `registry.loadStories(id)` (existing).
- Produces: shipped content; the guard test every future `langue/fr.md` must pass.

- [ ] **Step 1: Write the guard test**

In `src/books/books.test.ts`, after the `stagings` constant add:

```ts
const notesFolders = new Set(
  Object.keys(import.meta.glob("./*/langue/fr.md")).map((p) => p.split("/")[1]),
);

/** Folds spacing (incl. no-break spaces) and apostrophes so quotes compare on words only. */
const normalize = (text: string): string => text.replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
```

Inside `describe.each(…)("%s", …)`, after the last `it`, add:

```ts
it("quotes its language examples verbatim from its Kréyòl pages", async () => {
  if (!notesFolders.has(id)) return;
  const [stories, notes] = await Promise.all([registry.loadStories(id), registry.loadNotes(id)]);
  const pages = new Map(
    stories.gcf.pages.map((p) => [
      p.id,
      normalize([p.title, p.label, ...p.blocks.map((b) => b.text)].join(" ")),
    ]),
  );
  expect(notes).not.toBeNull();
  for (const note of notes?.notes ?? []) {
    for (const example of [...note.examples, ...(note.moreExamples ?? [])]) {
      const page = pages.get(example.pageId);
      expect(page, `${note.id}: unknown page "${example.pageId}"`).toBeDefined();
      expect(page, `${note.id}: "${example.gcf.text}"`).toContain(normalize(example.gcf.text));
    }
  }
});
```

- [ ] **Step 2: Write the draft content**

Create `src/books/ti-kannot/langue/fr.md`. Every Kréyòl line is copied character for character from `src/books/ti-kannot/story/gcf.md` (same `…`, same `«»` spacing); only `**…**` markers are added.

```markdown
---
lang: fr
title: Lang kréyòl
draft: true
---

## « Yé krik ! » : ouvrir le conte {#ye-krik}

Le conteur lance **Yé krik !** pour réveiller son public, qui répond **Yé krak !** pour dire qu'il écoute. Ti Kannot s'ouvre sur cet appel, et sa dernière page porte **Yé mistrikrik !**, une autre forme de l'appel.

> **Yé krik !** {ye-krik}
> Le conteur appelle son public.

> **Yé mistrikrik !** {ye-mistrikrik}
> L'appel revient pour la dernière page.

### Pou alé pli lwen

Le conte se disait traditionnellement le soir, pendant les veillées. Ces appels rythment la parole : le conteur peut les relancer au milieu de l'histoire pour vérifier que personne ne s'endort.

## « on » : un, une {#on}

**on** se place devant le nom, comme « un » ou « une ». Il ne change jamais, quel que soit le nom.

> Pa two lwen té ka rété Gwo Rako, **on** gwo krab {ti-kannot-e-gwo-rako}
> Non loin vivait Gwo Rako, un énorme crabe

### Pou alé pli lwen

**on** sert aussi à compter. Attention : ce n'est pas le « on » du français (« on dit que… »).

> **On** kalbas, dé, dis, venn… tout vid. {denye-leson-la}
> Une calebasse, deux, dix, vingt… toutes vides.

## « -la » : le nom bien connu {#la}

Pour dire « la source », le créole place **-la** _après_ le nom : _sous-la_. Au pluriel, c'est **-yo** : _ti ma-yo_, « les petites mares ».

> Sous**-la** té toujou la ! {sa-ti-kannot-jwenn}
> La source était toujours là !

> Sous-la plen, ti ma**-yo** plen {ye-mistrikrik}
> La source est pleine, les petites mares aussi

### Pou alé pli lwen

Pour montrer du doigt (« cette eau-là »), on ajoute **-tala** ou **-lasa**. Dans _larivyè_ ou _lapli_, le « la » est l'ancien article français collé au mot : « la rivière » se dit donc _larivyè-la_.

> poukwa ou ka pran tout dlo**-tala** ? {on-lide-gwo-rako}
> pourquoi tu prends toute cette eau ?

> Sous**-lasa** sé pou mwen ! {gwo-rako-vle-sous-la}
> Cette source est à moi !

## « té ka » : ce qui durait {#te-ka}

Devant le verbe, **té ka** raconte ce qui se passait et durait : c'est l'imparfait du conte.

> Bonmaten, larivyè-la **té ka** chanté. {ye-krik}
> Le matin, la rivière chantait.

> Tout moun **té ka** travay ansanm. {sa-dlo-la-ka-aprann}
> Tout le monde travaillait ensemble.

### Pou alé pli lwen

Le verbe ne change jamais de forme : ce sont les petits mots placés devant qui disent le temps. **té** marque le passé, **ka** l'action en train de se faire. Seul, **té** suffit pour un état passé. Et pour insister, on répète le mot : _piti, piti_ = « tout petit ».

> Ti Kannot **té** piti, piti anpil. {ti-kannot-e-gwo-rako}
> Ti Kannot était tout petit.

## « ka » : en ce moment {#ka}

**ka** devant le verbe : l'action est en train de se faire, maintenant.

> Gwo Rako, poukwa ou **ka** pran tout dlo-tala ? {on-lide-gwo-rako}
> Gwo Rako, pourquoi tu prends toute cette eau ?

> Chak gout dlo **ka** konté ! {ye-mistrikrik}
> Chaque goutte compte !

## « ké » : demain {#ke}

**ké** devant le verbe annonce ce qui va arriver : c'est le futur.

> Dèmen, nou **ké** gadé kilès ki **ké** ni plis dlo. {on-mache}
> Demain, nous regarderons qui aura le plus d'eau.

### Pou alé pli lwen

À la forme négative, **pa** et **ké** se fondent en **pé ké** : « ne… plus », « ne… pas » au futur.

> talè **pé ké** ni dlo ankò. {on-lide-gwo-rako}
> bientôt, il n'y aura plus d'eau.

## « pa » et « pon » : dire non {#pa}

**pa** se place devant le verbe, et devant **té**, **ka** ou **ké** quand il y en a.

> Lapli **pa** té ka tonbé. {larivye-la-ka-desann}
> La pluie ne tombait pas.

### Pou alé pli lwen

**pon** veut dire « aucun » : _pon moun_, « personne ». Il s'emploie avec **pa**, comme « ne… personne » en français.

> **pon** moun **pa** té bizwen pè pou dlo. {ye-krik}
> personne n'avait besoin d'avoir peur de manquer d'eau.

## « a-y », « a-w » : à qui ? {#posesif}

Pour dire à qui est une chose, on la fait suivre de **a** et de la personne : _kaz a-y_, « sa maison » ; _dlo a-w_, « ton eau ».

> senkant kalbas dlo dèyè kaz **a-y**. {larivye-la-ka-desann}
> cinquante calebasses d'eau derrière sa maison.

> Gwo Rako, konmen tan dlo **a-w** ké diré ? {demen-maten}
> Gwo Rako, combien de temps ton eau va-t-elle durer ?

### Pou alé pli lwen

Avec **mwen** (moi), on entend **an mwen** : _dlo an mwen_, « mon eau ». Les mêmes pronoms servent partout : **mwen** (je, moi), **ou** ou **vou** (tu, toi), **i** (il, elle), **nou** (nous), **zòt** (vous), **yo** (ils, elles).

> sé dlo **an mwen** ! {on-nouvo-rezev}
> c'est mon eau !
```

- [ ] **Step 3: Run the guard and check it passes**

Run: `pnpm vitest run src/books/books.test.ts`
Expected: PASS. If a quote fails, copy the Kréyòl again from `story/gcf.md` — never change `gcf.md`.

- [ ] **Step 4: Prove the guard bites**

Temporarily change `Lapli **pa** té ka tonbé.` to `Lapli **pa** té tonbé.` in `langue/fr.md`, run `pnpm vitest run src/books/books.test.ts`, expect FAIL with `pa: "Lapli pa té tonbé."`, then restore the line and re-run: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/books/ti-kannot/langue/fr.md src/books/books.test.ts
git commit -m "feat(ti-kannot): draft Kréyòl language notes quoted from the tale"
```

---

### Task 4: Language panel (burger + dialog)

**Files:**

- Create: `src/app/language-panel/language-panel.ts`
- Create: `src/app/language-panel/language-panel.css`
- Test: `src/app/language-panel/language-panel.test.ts`

**Interfaces:**

- Consumes: `LanguageNotes`, `LanguageExample`, `LanguageNote`, `Story` from `src/app/contract.ts`.
- Produces:

```ts
export interface LanguagePanel {
  attach(notes: LanguageNotes, story: Story): void;
  detach(): void;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  dispose(): void;
}
export function createLanguagePanel(root: HTMLElement): LanguagePanel;
```

DOM classes used by Task 5 tests: `.lang-burger`, `.lang-panel`, `.lang-scrim`, `.lang-close`. While attached, `root.dataset.notes` is set (empty string).

- [ ] **Step 1: Write the failing tests**

Create `src/app/language-panel/language-panel.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/app/language-panel`
Expected: FAIL — `Failed to resolve import "./language-panel"`.

- [ ] **Step 3: Implement the module**

Create `src/app/language-panel/language-panel.ts`:

```ts
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

  const hide = (): void => {
    isOpen = false;
    scrim.hidden = true;
    panel.hidden = true;
    burger.setAttribute("aria-expanded", "false");
  };
  const open = (): void => {
    if (burger.hidden || isOpen) return;
    isOpen = true;
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
```

- [ ] **Step 4: Write the stylesheet**

Create `src/app/language-panel/language-panel.css`:

```css
/* Restated: the display rules below would otherwise defeat the hidden attribute. */
.lang-burger[hidden],
.lang-scrim[hidden],
.lang-panel[hidden],
.lang-draft[hidden] {
  display: none;
}

.lang-burger {
  position: absolute;
  right: 22px;
  top: 22px;
  z-index: 30;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(238, 243, 238, 0.12);
  background: rgba(5, 12, 18, 0.5);
  backdrop-filter: blur(8px);
  color: rgba(238, 243, 238, 0.85);
  cursor: pointer;
  transition: color 0.25s;
}

.lang-burger:hover,
.lang-burger:focus-visible {
  color: var(--reading-accent);
}

/* The language switch steps aside for the burger; it keeps working the same way. */
[data-notes] .reading-langs {
  right: 70px;
}

.lang-scrim {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(5, 12, 18, 0.45);
}

.lang-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 31;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: min(440px, 92vw);
  background: var(--reading-card-bg);
  backdrop-filter: blur(14px);
  border-left: 1px solid var(--reading-card-border);
  box-shadow: -18px 0 40px rgba(0, 0, 0, 0.3);
  color: var(--reading-text);
  font: 400 15px/1.55 var(--reading-font-body);
  animation: lang-slide-in 0.32s ease-out;
}

.lang-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 14px 24px;
  border-bottom: 1px solid var(--reading-card-border);
}

.lang-title {
  margin: 0;
  color: var(--reading-title);
  font: italic 600 28px/1.1 var(--reading-font-display);
}

.lang-draft {
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid var(--reading-accent);
  color: var(--reading-accent);
  font: 600 10px/1 var(--reading-font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.lang-close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.lang-close:hover,
.lang-close:focus-visible {
  color: var(--reading-accent);
}

.lang-notes {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 24px 32px;
}

.lang-note {
  padding: 20px 0;
}

.lang-note + .lang-note {
  border-top: 1px dashed var(--reading-card-border);
}

.lang-note-title {
  margin: 0 0 6px;
  color: var(--reading-title);
  font: italic 600 22px/1.2 var(--reading-font-display);
}

.lang-text {
  margin: 0 0 8px;
}

.lang-example {
  margin: 12px 0;
  padding-left: 12px;
  border-left: 2px solid var(--reading-accent);
}

.lang-gcf {
  margin: 0;
  color: var(--reading-title);
  font: italic 500 20px/1.3 var(--reading-font-display);
}

.lang-gcf strong {
  color: var(--reading-accent);
  font-weight: 600;
}

.lang-tr {
  margin: 2px 0 0;
  font-style: italic;
  opacity: 0.75;
}

.lang-source {
  margin-top: 4px;
  font: 600 10px/1.4 var(--reading-font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.6;
}

.lang-more summary {
  cursor: pointer;
  color: var(--reading-accent);
  font: 600 11px/2 var(--reading-font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

@keyframes lang-slide-in {
  from {
    transform: translateX(100%);
  }
}

@keyframes lang-rise {
  from {
    transform: translateY(100%);
  }
}

/* Phones: a full-screen sheet rising from the bottom; nothing of the tale shows behind it. */
@media (max-width: 600px) {
  .lang-burger {
    right: 12px;
    top: 14px;
    width: 34px;
    height: 34px;
  }

  [data-notes] .reading-langs {
    right: 54px;
  }

  .lang-panel {
    width: 100%;
    border-left: 0;
    animation-name: lang-rise;
  }

  .lang-head {
    padding: 14px 12px 12px 18px;
  }

  .lang-notes {
    padding: 0 18px 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lang-panel {
    animation: none;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/app/language-panel && pnpm typecheck && pnpm lint`
Expected: PASS, no type or lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/language-panel
git commit -m "feat(app): add the Lang kréyòl burger and panel"
```

---

### Task 5: Shell integration

**Files:**

- Modify: `src/app/app.ts`
- Modify: `src/main.ts:41`
- Test: `src/app/app.test.ts`

**Interfaces:**

- Consumes: `createLanguagePanel(root)` and `LanguagePanel` (Task 4); `LanguageNotes` (Task 1); `registry.loadNotes` (Task 2).
- Produces: `AppDeps.loadNotes(bookId: string): Promise<LanguageNotes | null>` (required).

- [ ] **Step 1: Write the failing tests**

In `src/app/app.test.ts`:

1. Add the import `import { parseNotes } from "./language/parse";`.
2. After `STORIES`, add:

```ts
const NOTES = parseNotes(
  "---\nlang: fr\ntitle: Lang kréyòl\n---\n\n## Not {#not}\n\nRézimé.\n\n> Paj dé tèks. {p1}\n> Page deux.\n",
  "langue/fr.md",
);
```

3. In `start()`, add `loadNotes: vi.fn(async () => null),` after the `loadStories` line.
4. At the end of the file, add:

```ts
describe("app language panel", () => {
  const openBook = async (overrides: Partial<AppDeps> = {}): Promise<void> => {
    start({ loadNotes: vi.fn(async () => NOTES), ...overrides });
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
  };

  it("shows the burger only inside a book that has notes", async () => {
    start({ loadNotes: vi.fn(async () => NOTES) });
    expect($(".lang-burger")?.hidden).toBe(true);
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect($(".lang-burger")?.hidden).toBe(false);
  });

  it("shows no burger for a book without notes", async () => {
    await openBook({ loadNotes: vi.fn(async () => null) });
    expect(root.dataset.book).toBe("liv");
    expect($(".lang-burger")?.hidden).toBe(true);
  });

  it("opens the book without a burger when its notes fail to load", async () => {
    await openBook({ loadNotes: vi.fn().mockRejectedValue(new Error("bad notes")) });
    expect(root.dataset.book).toBe("liv");
    expect($(".app-notice")).toBeNull();
    expect($(".lang-burger")?.hidden).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it("leaves the tale untouched while open: no paging from keys, wheel or swipe", async () => {
    await openBook();
    $(".lang-burger")?.click();
    key("ArrowRight");
    key(" ");
    key("PageDown");
    const wheel = new WheelEvent("wheel", { deltaY: 120, cancelable: true });
    root.dispatchEvent(wheel);
    root.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", clientY: 400 }));
    root.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientY: 100 }));
    root.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch" }));
    expect(wheel.defaultPrevented).toBe(false);
    expect(handle.setPage).not.toHaveBeenCalled();
    expect($(".reading-title")?.textContent).toBe("Paj en");
  });

  it("closes only the panel on Escape; a second Escape leaves the book", async () => {
    await openBook();
    $(".lang-burger")?.click();
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect($(".lang-panel")?.hidden).toBe(true);
    expect(handle.dispose).not.toHaveBeenCalled();
    expect(root.dataset.book).toBe("liv");
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect(handle.dispose).toHaveBeenCalledOnce();
  });

  it("pages again once the panel is closed, from the same page", async () => {
    await openBook();
    $(".lang-burger")?.click();
    $(".lang-close")?.click();
    key("ArrowRight");
    expect(handle.setPage).toHaveBeenLastCalledWith(1);
    expect($(".reading-title")?.textContent).toBe("Paj dé");
  });

  it("closes the panel and hides the burger when the book closes", async () => {
    await openBook();
    $(".lang-burger")?.click();
    $(".reading-back")?.click();
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect(root.dataset.book).toBeUndefined();
    expect($(".lang-panel")?.hidden).toBe(true);
    expect($(".lang-burger")?.hidden).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/app/app.test.ts`
Expected: FAIL on the new `app language panel` tests (no `.lang-burger`), and a type error on `loadNotes` in `pnpm typecheck`. The existing tests still pass.

If happy-dom lacks `PointerEvent`, replace the three pointer lines with `new Event("pointerdown")` objects given `Object.assign(event, { pointerType: "touch", clientY: … })` — the handlers only read `pointerType` and `clientY`.

- [ ] **Step 3: Implement**

In `src/app/app.ts`:

1. Imports: add `LanguageNotes` to the `./contract` type import, and `import { createLanguagePanel } from "./language-panel/language-panel";`.
2. `AppDeps` gains:

```ts
  /** The book's language notes; null when it has none. */
  loadNotes(bookId: string): Promise<LanguageNotes | null>;
```

3. After `const reading = createReadingUI(…);` add `const panel = createLanguagePanel(root);`.
4. After `mountTree(attempt)` (the function), add:

```ts
/** Loads a book's language notes; a broken file only costs the burger, never the tale. */
async function loadNotes(bookId: string): Promise<LanguageNotes | null> {
  try {
    return await deps.loadNotes(bookId);
  } catch (err) {
    console.error(`Language notes of "${bookId}" failed to load`, err);
    return null;
  }
}
```

5. In `closeBook()`, right after `bubble.hide();`, add `panel.detach();`.
6. In `enter()`, the loading line becomes:

```ts
const loading = Promise.resolve().then(() =>
  Promise.all([manifest.world?.(), deps.loadStories(bookId), loadNotes(bookId)]),
);
```

and `const [world, stories] = await loading;` becomes `const [world, stories, notes] = await loading;`. After `render();` (inside the `try`), add `if (notes) panel.attach(notes, stories.gcf);`.

7. Input guards — `onWheel`:

```ts
  const onWheel = (e: WheelEvent): void => {
    if (mode !== "book" || panel.isOpen) return;
```

`onPointerMove`:

```ts
if (mode !== "book" || touchY === null || panel.isOpen) return;
```

`onKey` starts with:

```ts
  const onKey = (e: KeyboardEvent): void => {
    if (mode !== "book") return;
    if (panel.isOpen) {
      if (e.key === "Escape") panel.close();
      return;
    }
```

8. In `dispose()`, before `root.replaceChildren();`, add `panel.dispose();`.
9. Update the `startApp` docstring to: `/** Shell: mounts the tree, runs tree ⇄ book transitions, owns reading UI, language panel and book-mode input. */`

In `src/main.ts`, the `startApp` call becomes:

```ts
if (root)
  startApp(root, {
    mountTree,
    books: registry.books,
    loadStories: registry.loadStories,
    loadNotes: registry.loadNotes,
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/app && pnpm typecheck && pnpm lint`
Expected: PASS — old and new app tests, no type or lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.ts src/app/app.test.ts src/main.ts
git commit -m "feat(app): open the language panel from books without touching the tale"
```

---

### Task 6: Docs, full gate and manual check

**Files:**

- Modify: `CLAUDE.md` (Structure + Code style)
- Modify: `doc/development.md` (new section before `## Troubleshooting`)

**Interfaces:**

- Consumes: everything above.
- Produces: documented format; verified build.

- [ ] **Step 1: Update `CLAUDE.md`**

In the `Structure` block, under `src/app/`, after the `story/parse.ts` line add:

```
    language/parse.ts          # langue/<lang>.md parser (language notes)
    language-panel/            # "Lang kréyòl" burger + dialog, over the tale
```

and change the ti-kannot line to:

```
    ti-kannot/                 # book.ts, cover.ts, staging.ts, theme.css, story/{gcf,fr}.md, langue/fr.md, world/
```

In `Code style`, after the "Tale text lives in…" bullet add:

```markdown
- Language notes live in `src/books/<id>/langue/fr.md` (optional), format in
  `docs/superpowers/specs/2026-10-04-kreyol-language-notes-design.md` §2. Every Kréyòl example is
  quoted verbatim from `story/gcf.md` (enforced by `books.test.ts`); `draft: true` until a Creole
  speaker validates it. The panel never changes the tale's mechanics.
```

- [ ] **Step 2: Update `doc/development.md`**

Insert before `## Troubleshooting`:

````markdown
## Language notes

A book may ship `src/books/<id>/langue/fr.md`, shown in the "Lang kréyòl" panel (burger, top right):

```markdown
---
lang: fr
title: Lang kréyòl
draft: true
---

## « té ka » : ce qui durait {#te-ka}

Short takeaway, visible to everyone.

> Bonmaten, larivyè-la **té ka** chanté. {ye-krik}
> Le matin, la rivière chantait.

### Pou alé pli lwen

Optional detail, collapsed.
```

An example is two `>` lines: the Kréyòl sentence ending with the `{page-id}` it comes from, then its
translation. `pnpm test` fails if the sentence is not found verbatim on that page of `story/gcf.md`.
Remove `draft: true` only after a Creole speaker has reviewed the notes.
````

- [ ] **Step 3: Run the full gate**

Run: `pnpm format && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all succeed; `pnpm format` may reformat the new files (commit them as-is).

- [ ] **Step 4: Manual check in the user's browser**

Run `pnpm dev`, then ask the user to check in their own browser (no headless run):

1. Tree screen: no burger.
2. Open Ti Kannot: burger top-right, language switch beside it, no overlap — desktop, then devtools responsive mode at 360 × 740 and 740 × 360.
3. Burger → panel slides in (desktop drawer with scrim; mobile full-screen sheet), "brouyon — à valider" badge, 8 notes, "Pou alé pli lwen" expands.
4. With the panel open: wheel / arrows / Space scroll the panel, the page behind does not change; Escape closes the panel only.
5. After closing: same page, same language, paging and Escape-to-tree work as before.
6. Zanba / Konpé Lapen cards: unchanged (locked).
7. Hand the draft notes to a Creole speaker for review.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md doc/development.md
git add -u
git commit -m "docs: document per-book Kréyòl language notes"
```
