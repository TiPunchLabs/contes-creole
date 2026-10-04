import { registry } from "@app/registry";
import { describe, expect, it } from "vitest";

const storyFolders = new Set(
  Object.keys(import.meta.glob("./*/story/gcf.md")).map((p) => p.split("/")[1]),
);
const stagings = import.meta.glob<{ STAGING: Record<string, unknown> }>("./*/staging.ts", {
  eager: true,
});
const notesFolders = new Set(
  Object.keys(import.meta.glob("./*/langue/fr.md")).map((p) => p.split("/")[1]),
);

/** Folds spacing (incl. no-break spaces) and apostrophes so quotes compare on words only. */
const normalize = (text: string): string => text.replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

describe("books", () => {
  it("have unique ids and order values", () => {
    const { books } = registry;
    expect(new Set(books.map((b) => b.id)).size).toBe(books.length);
    expect(new Set(books.map((b) => b.order)).size).toBe(books.length);
  });

  describe.each(registry.books.map((b) => [b.id, b] as const))("%s", (id, book) => {
    it("is enterable only with a world, a cover, a story and a staging", () => {
      if (!book.ready) return;
      expect(book.world).toBeTypeOf("function");
      expect(book.cover).toBeTypeOf("function");
      expect(storyFolders.has(id)).toBe(true);
      expect(stagings[`./${id}/staging.ts`]).toBeDefined();
    });

    it("shares its page ids across languages and labels every Kréyòl page", async () => {
      if (!storyFolders.has(id)) return;
      const stories = await registry.loadStories(id);
      const ids = stories.gcf.pages.map((p) => p.id);
      for (const translation of [stories.fr, stories.en]) {
        if (translation) expect(translation.pages.map((p) => p.id)).toEqual(ids);
      }
      expect(stories.gcf.pages.every((p) => p.label !== "")).toBe(true);
      const staging = stagings[`./${id}/staging.ts`];
      if (staging) expect(Object.keys(staging.STAGING).sort()).toEqual([...ids].sort());
    });

    it("quotes its language examples verbatim from its Kréyòl pages", async () => {
      if (!notesFolders.has(id)) return;
      const [stories, notes] = await Promise.all([
        registry.loadStories(id),
        registry.loadNotes(id),
      ]);
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
  });
});
