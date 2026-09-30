import { registry } from "@app/registry";
import { describe, expect, it } from "vitest";

const storyFolders = new Set(
  Object.keys(import.meta.glob("./*/story/gcf.md")).map((p) => p.split("/")[1]),
);
const stagings = import.meta.glob<{ STAGING: Record<string, unknown> }>("./*/staging.ts", {
  eager: true,
});

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
  });
});
