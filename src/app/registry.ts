import type { BookManifest, Lang, Stories, Story } from "./contract";
import { parseStory } from "./story/parse";

type ManifestModules = Record<string, { default: BookManifest }>;
type StoryLoaders = Record<string, () => Promise<string>>;

export interface Registry {
  books: BookManifest[];
  loadStories(bookId: string): Promise<Stories>;
}

const BOOK_PATH = /\/books\/([^/]+)\/book\.ts$/;
const STORY_PATH = /\/books\/([^/]+)\/story\/[^/]+\.md$/;

/** Copies Kréyòl labels onto pages of a translation that do not set their own. */
function withLabels(story: Story, source: Story): Story {
  const labels = new Map(source.pages.map((p) => [p.id, p.label]));
  return {
    ...story,
    pages: story.pages.map((p) => (p.label ? p : { ...p, label: labels.get(p.id) ?? "" })),
  };
}

/** Builds the book registry from glob results; validates folder ids and unique order values. */
export function createRegistry(manifests: ManifestModules, stories: StoryLoaders): Registry {
  const books = Object.entries(manifests).map(([path, module]) => {
    const folder = BOOK_PATH.exec(path)?.[1];
    const book = module.default;
    if (book.id !== folder) {
      throw new Error(`${path}: id "${book.id}" must match its folder "${folder ?? "?"}"`);
    }
    return book;
  });
  if (new Set(books.map((b) => b.order)).size !== books.length) {
    throw new Error("book order values must be unique");
  }
  books.sort((a, b) => a.order - b.order);

  return {
    books,
    async loadStories(bookId) {
      const files = Object.entries(stories).filter(
        ([path]) => STORY_PATH.exec(path)?.[1] === bookId,
      );
      const parsed = await Promise.all(
        files.map(async ([path, load]) => parseStory(await load(), path)),
      );
      const byLang: Partial<Record<Lang, Story>> = {};
      for (const story of parsed) byLang[story.lang] = story;
      const gcf = byLang.gcf;
      if (!gcf) throw new Error(`book "${bookId}" has no story/gcf.md`);
      return {
        gcf,
        fr: byLang.fr && withLabels(byLang.fr, gcf),
        en: byLang.en && withLabels(byLang.en, gcf),
      };
    },
  };
}

export const registry = createRegistry(
  import.meta.glob<{ default: BookManifest }>("../books/*/book.ts", { eager: true }),
  import.meta.glob<string>("../books/*/story/*.md", { query: "?raw", import: "default" }),
);
