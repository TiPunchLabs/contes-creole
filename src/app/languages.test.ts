import { describe, expect, it } from "vitest";
import type { Stories, Story } from "./contract";
import { readingLangs, storyFor } from "./languages";

const story = (lang: Story["lang"]): Story => ({ lang, title: "Liv", pages: [] });

describe("reading languages", () => {
  it("offers Kréyòl alone when there is no translation", () => {
    expect(readingLangs({ gcf: story("gcf") })).toEqual(["gcf"]);
  });

  it("offers Bileng and Français with fr.md, English with en.md", () => {
    const stories: Stories = { gcf: story("gcf"), fr: story("fr"), en: story("en") };
    expect(readingLangs(stories)).toEqual(["gcf", "bi", "fr", "en"]);
  });

  it("uses Kréyòl for Bileng and for any missing language", () => {
    const stories: Stories = { gcf: story("gcf"), fr: story("fr") };
    expect(storyFor(stories, "bi").lang).toBe("gcf");
    expect(storyFor(stories, "fr").lang).toBe("fr");
    expect(storyFor(stories, "en").lang).toBe("gcf");
  });
});
