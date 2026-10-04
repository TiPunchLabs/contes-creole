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
