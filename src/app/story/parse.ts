import { LANGS, type Lang, type Story, type StoryPage } from "../contract";

/** Thrown for a malformed story file; the message starts with `file:line:`. */
export class StoryParseError extends Error {}

export const HEADING = /^##\s+(.+?)\s+\{#([a-z0-9]+(?:-[a-z0-9]+)*)\}$/;
const LABEL = /^<!--\s*label:\s*(.*?)\s*-->$/;
const META = /^([a-z]+):\s*(.*)$/;
const DIALOGUE = "– ";
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Renders `**bold**` and `*italic*` to escaped HTML, and strips them for plain text. */
export function renderInline(source: string): { text: string; html: string } {
  const html = source
    .replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
  const text = source.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
  return { text, html };
}

const isLang = (value: string | undefined): value is Lang => LANGS.includes(value as Lang);

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

/** Parses one `story/<lang>.md` file; `file` names errors and must end with `<lang>.md`. */
export function parseStory(source: string, file: string): Story {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const fail = (line: number, message: string): never => {
    throw new StoryParseError(`${file}:${line}: ${message}`);
  };

  const { lang, title, end } = readHeader(lines, file, fail);

  const pages: StoryPage[] = [];
  const ids = new Set<string>();
  let page = null as StoryPage | null;
  let pageLine = 0;
  let paragraph: string[] = [];
  let quote: string[] = [];

  const flushParagraph = (): void => {
    if (!page || paragraph.length === 0) return;
    const text = paragraph.join(" ");
    page.blocks.push({
      kind: text.startsWith(DIALOGUE) ? "dialogue" : "text",
      ...renderInline(text),
    });
    paragraph = [];
  };
  const flushQuote = (): void => {
    if (!page || quote.length === 0) return;
    const summary = renderInline(quote.join(" ")).text;
    page.summary = page.summary ? `${page.summary} ${summary}` : summary;
    quote = [];
  };
  const closePage = (): void => {
    flushParagraph();
    flushQuote();
    if (!page) return;
    if (page.blocks.length === 0) fail(pageLine, `page "${page.id}" has no text`);
    pages.push(page);
    page = null;
  };

  for (let i = end + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const n = i + 1;
    if (line.startsWith("## ")) {
      closePage();
      const match = HEADING.exec(line);
      if (!match) return fail(n, "page heading needs an id: ## Title {#id}");
      const [, pageTitle, id] = match;
      if (ids.has(id)) fail(n, `duplicate page id "${id}"`);
      ids.add(id);
      page = { id, label: "", title: pageTitle, blocks: [] };
      pageLine = n;
      continue;
    }
    if (line === "") {
      flushParagraph();
      flushQuote();
      continue;
    }
    if (!page) return fail(n, "text before the first page heading");
    const label = LABEL.exec(line);
    if (label) {
      page.label = label[1];
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }
    flushQuote();
    if (line.startsWith(DIALOGUE)) flushParagraph();
    paragraph.push(line);
  }
  closePage();
  return { lang, title, pages };
}
