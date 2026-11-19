import type { BookArt, BookManifest } from "@app/contract";

/**
 * Paints one frame of a portrait's drawing on its page canvas. `t` is the gesture clock in seconds;
 * `calm` (reduced motion) asks for the expressive still pose.
 */
export type PortraitPainter = (
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  calm: boolean,
) => void;

/** A character of the Antillean oral tradition, presented on a double page of the book. */
export interface Portrait {
  id: string;
  /** Name in Kréyòl (GEREC), shown as the page title. */
  name: string;
  /** French name, shown under the Kréyòl one. */
  frenchName: string;
  /** Two or three child-level sentences, in French. */
  text: string;
  /** The portrait comes right after this tale's page (a book id); at the end when it is absent. */
  after?: string;
  paint: PortraitPainter;
}

export interface TalePage {
  kind: "tale";
  id: string;
  book: BookManifest;
  art: BookArt;
}

export interface PortraitPage {
  kind: "portrait";
  id: string;
  portrait: Portrait;
}

export type Page = TalePage | PortraitPage;

/** A bookmark: a tale universe's section of the book (its tale page and the portraits after it). */
export interface Section {
  id: string;
  label: string;
  /** Language of the label. */
  lang: string;
  /** First page of the section. */
  page: number;
}

/**
 * The book's page sequence: the catalogue's published tales with an official visual, in catalogue
 * order, each followed by the portraits placed after it; portraits without a known anchor close the
 * book. The page-turn component only ever sees this list.
 */
export function buildPages(books: readonly BookManifest[], portraits: readonly Portrait[]): Page[] {
  const tales: TalePage[] = books
    .filter((b) => b.ready && b.art && (b.world || b.immersive))
    .map((b) => ({ kind: "tale", id: b.id, book: b, art: b.art as BookArt }));
  const ids = new Set(tales.map((t) => t.id));
  const pages: Page[] = [];
  for (const tale of tales) {
    pages.push(tale);
    for (const p of portraits)
      if (p.after === tale.id) pages.push({ kind: "portrait", id: p.id, portrait: p });
  }
  for (const p of portraits)
    if (!p.after || !ids.has(p.after)) pages.push({ kind: "portrait", id: p.id, portrait: p });
  return pages;
}

/** Bookmarks: one per tale universe, named by its short name, in page order. */
export function buildSections(pages: readonly Page[]): Section[] {
  const sections: Section[] = [];
  pages.forEach((page, index) => {
    if (page.kind !== "tale") return;
    const { card } = page.book;
    sections.push({
      id: page.id,
      label: card.short ?? card.title,
      lang: card.lang ?? "gcf",
      page: index,
    });
  });
  return sections;
}

/** Index of the section a page belongs to (the last one starting at or before it), or -1. */
export function sectionOf(sections: readonly Section[], page: number): number {
  let found = -1;
  sections.forEach((s, i) => {
    if (s.page <= page) found = i;
  });
  return found;
}
