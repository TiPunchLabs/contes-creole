import { describe, expect, it } from "vitest";
import type { BookManifest } from "./contract";
import { createRegistry } from "./registry";

const manifest = (id: string, order: number): { default: BookManifest } => ({
  default: { id, order, ready: false, card: { title: id, sub: "", theme: "" } },
});
const gcf = "---\nlang: gcf\ntitle: Liv\n---\n\n## Paj {#paj}\n\n<!-- label: Paj en -->\n\nTèks.\n";
const fr = "---\nlang: fr\ntitle: Liv\n---\n\n## Page {#paj}\n\nTexte.\n";

describe("createRegistry", () => {
  it("discovers books and sorts them by order", () => {
    const registry = createRegistry(
      { "../books/b/book.ts": manifest("b", 2), "../books/a/book.ts": manifest("a", 1) },
      {},
    );
    expect(registry.books.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("rejects a manifest whose id differs from its folder", () => {
    expect(() => createRegistry({ "../books/a/book.ts": manifest("z", 1) }, {})).toThrow(
      /must match its folder "a"/,
    );
  });

  it("rejects duplicate order values", () => {
    expect(() =>
      createRegistry(
        { "../books/a/book.ts": manifest("a", 1), "../books/b/book.ts": manifest("b", 1) },
        {},
      ),
    ).toThrow(/order/);
  });

  it("loads a book's stories and fills missing labels from Kréyòl", async () => {
    const registry = createRegistry(
      { "../books/a/book.ts": manifest("a", 1) },
      {
        "../books/a/story/gcf.md": async () => gcf,
        "../books/a/story/fr.md": async () => fr,
        "../books/b/story/gcf.md": async () => gcf,
      },
    );
    const stories = await registry.loadStories("a");
    expect(stories.gcf.pages[0].title).toBe("Paj");
    expect(stories.fr?.pages[0]).toMatchObject({ title: "Page", label: "Paj en" });
    expect(stories.en).toBeUndefined();
  });

  it("rejects a book without story/gcf.md", async () => {
    const registry = createRegistry({ "../books/a/book.ts": manifest("a", 1) }, {});
    await expect(registry.loadStories("a")).rejects.toThrow(/story\/gcf\.md/);
  });
});
