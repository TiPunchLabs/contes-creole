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
      if (!book.ready || book.immersive) return;
      expect(book.world).toBeTypeOf("function");
      expect(book.cover).toBeTypeOf("function");
      expect(storyFolders.has(id)).toBe(true);
      expect(stagings[`./${id}/staging.ts`]).toBeDefined();
    });

    it("brings its own reading interface with a cover and a story, without a staging", () => {
      if (!book.ready || !book.immersive) return;
      expect(book.immersive).toBeTypeOf("function");
      expect(book.cover).toBeTypeOf("function");
      expect(book.world).toBeUndefined();
      expect(storyFolders.has(id)).toBe(true);
      expect(stagings[`./${id}/staging.ts`]).toBeUndefined();
    });

    it("shares its page ids across languages and labels every Kréyòl page of the shared card", async () => {
      if (!storyFolders.has(id)) return;
      const stories = await registry.loadStories(id);
      const ids = stories.gcf.pages.map((p) => p.id);
      for (const translation of [stories.fr, stories.en]) {
        if (translation) expect(translation.pages.map((p) => p.id)).toEqual(ids);
      }
      // Labels are the shared reading card's kicker; a book with its own interface has none.
      if (!book.immersive) expect(stories.gcf.pages.every((p) => p.label !== "")).toBe(true);
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

describe("mila", () => {
  it("tells its twelve pages in Kréyòl (owner's working translation) and in the prototype's French", async () => {
    const stories = await registry.loadStories("mila");
    expect(stories.gcf.pages.map((p) => p.title)).toEqual([
      "Koté vag-la ka pran sonmèy",
      "Vwa-la adan espiral-la",
      "Swa-la lanmè-la pé bouch a-y",
      "Chimen-la ponmoun pa té ka vwè",
      "Son a sé ti pa-la",
      "Douvan dlo-la",
      "Jaden-la ou pa ka pòté ay",
      "Séla ki ka najé ansanm",
      "Pèl a dèmen",
      "Finèt a lalin",
      "Twa vwa pou on lanmè",
      "Sa Mila pòté wouvin",
    ]);
    expect(stories.fr?.pages.map((p) => p.title)).toEqual([
      "Là où la vague s'endort",
      "La voix dans la spirale",
      "Le soir où la mer se tut",
      "Le chemin que personne ne voyait",
      "Le bruit des petits pas",
      "Le seuil de l'eau",
      "Le jardin qu'on n'emporte pas",
      "Ceux qui nagent ensemble",
      "La perle de demain",
      "La fenêtre de lune",
      "Trois voix pour une mer",
      "Ce que Mila rapporta",
    ]);
    expect(stories.en).toBeUndefined();
  });
});
