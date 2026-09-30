import type { Stories, Story } from "./contract";

/** Reading modes of the language switch; `bi` shows Kréyòl with French underneath. */
export type ReadingLang = "gcf" | "bi" | "fr" | "en";

export const LANG_NAMES: Record<ReadingLang, string> = {
  gcf: "Kréyòl",
  bi: "Bileng",
  fr: "Français",
  en: "English",
};

/** Modes available for a book, in switch order. */
export function readingLangs(stories: Stories): ReadingLang[] {
  const langs: ReadingLang[] = ["gcf"];
  if (stories.fr) langs.push("bi", "fr");
  if (stories.en) langs.push("en");
  return langs;
}

/** Story shown (and given to the world) for a mode; Kréyòl for Bileng or a missing language. */
export function storyFor(stories: Stories, lang: ReadingLang): Story {
  if (lang === "fr" && stories.fr) return stories.fr;
  if (lang === "en" && stories.en) return stories.en;
  return stories.gcf;
}
