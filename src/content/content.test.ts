import { describe, expect, it } from "vitest";
import { TALES } from "./tales";
import { PAGES } from "./ti-kannot";

describe("tales", () => {
  it("have unique ids", () => {
    expect(new Set(TALES.map((t) => t.id)).size).toBe(TALES.length);
  });

  it("include Ti Kannot as a ready tale", () => {
    expect(TALES.find((t) => t.id === "ti-kannot")?.ready).toBe(true);
  });
});

describe("Ti Kannot pages", () => {
  it("have 12 pages", () => {
    expect(PAGES).toHaveLength(12);
  });

  it.each(PAGES.map((p, i) => [i, p] as const))(
    "page %i is complete in both languages",
    (_, page) => {
      for (const text of [page.kr, page.fr]) {
        expect(text.t.trim()).not.toBe("");
        expect(text.b.trim()).not.toBe("");
      }
      expect(page.kr.g?.trim()).toBeTruthy();
    },
  );

  it("use valid hex colours for sky and moon", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const { env } of PAGES) {
      env.sky.forEach((c) => expect(c).toMatch(hex));
      expect(env.moon[3]).toMatch(hex);
    }
  });
});
