import { registry } from "@app/registry";
import type { StoryPage } from "@app/contract";
import { describe, expect, it } from "vitest";
import v13Source from "../../design/v13/kont-data.js?raw";
import { STAGING } from "./ti-kannot/staging";

interface V13Text {
  t: string;
  b: string;
  g?: string;
}
interface V13Page {
  label: string;
  kr: V13Text;
  fr: V13Text;
  env: unknown;
}

/** Reads PAGES from the mockup data file (a JSON array literal). */
function v13Pages(): V13Page[] {
  const match = /export const PAGES = (\[[\s\S]*\]);?\s*$/.exec(v13Source);
  if (!match) throw new Error("PAGES not found in kont-data.js");
  return JSON.parse(match[1]) as V13Page[];
}

const plain = (page: StoryPage | undefined): string =>
  page ? page.blocks.map((b) => b.text).join(" ") : "";

const IDS = [
  "ye-krik",
  "ti-kannot-e-gwo-rako",
  "on-lide-gwo-rako",
  "larivye-la-ka-desann",
  "sa-ti-kannot-jwenn",
  "gwo-rako-vle-sous-la",
  "on-mache",
  "demen-maten",
  "sa-dlo-la-ka-aprann",
  "denye-leson-la",
  "on-nouvo-rezev",
  "ye-mistrikrik",
];

describe("Ti Kannot conversion from v13", () => {
  it("uses the ids derived from the v13 labels", async () => {
    const { gcf } = await registry.loadStories("ti-kannot");
    expect(gcf.pages.map((p) => p.id)).toEqual(IDS);
  });

  it("keeps every Kréyòl and French word, label and gloss", async () => {
    const { gcf, fr } = await registry.loadStories("ti-kannot");
    const pages = v13Pages();
    expect(gcf.pages).toHaveLength(pages.length);
    pages.forEach((v13, i) => {
      expect(gcf.pages[i].label).toBe(v13.label);
      expect(gcf.pages[i].title).toBe(v13.kr.t);
      expect(plain(gcf.pages[i])).toBe(v13.kr.b);
      expect(fr?.pages[i].title).toBe(v13.fr.t);
      expect(plain(fr?.pages[i])).toBe(v13.fr.b);
      expect(fr?.pages[i].summary).toBe(v13.kr.g);
    });
  });

  it("keeps every page's staging", () => {
    v13Pages().forEach((v13, i) => expect(STAGING[IDS[i]]).toEqual(v13.env));
  });
});
