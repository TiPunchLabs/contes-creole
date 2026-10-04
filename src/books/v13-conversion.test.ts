import { registry } from "@app/registry";
import type { StoryPage } from "@app/contract";
import { describe, expect, it } from "vitest";
import v13Source from "../../design/v13/kont-data.js?raw";

interface V13Text {
  t: string;
  b: string;
  g?: string;
}
interface V13Page {
  label: string;
  kr: V13Text;
  fr: V13Text;
}

/** Reads PAGES from the mockup data file (a JSON array literal). */
function v13Pages(): V13Page[] {
  const match = /export const PAGES = (\[[\s\S]*\]);?\s*$/.exec(v13Source);
  if (!match) throw new Error("PAGES not found in kont-data.js");
  return JSON.parse(match[1]) as V13Page[];
}

/**
 * Corrections made to the tale after the v13 port (2026-10-04 Kréyòl review, see
 * docs/kreyol/2026-10-04-review-ti-kannot.md). Applied to the mockup text before comparing,
 * so any other drift from v13 still fails.
 */
const CORRECTIONS: { lang: "kr" | "fr"; from: string; to: string }[] = [
  { lang: "kr", from: "tan Larivyè Klè ka koulé", to: "toutan Larivyè Klè té ka koulé" },
  { lang: "kr", from: "Pou jou ké rivé épi pé ké", to: "Pou jou-la ki pé ké" },
  { lang: "kr", from: "dlo-tala", to: "dlo-lasa" },
  { lang: "kr", from: "Mwen sé pli fò", to: "Sé mwen ki pli fò" },
  { lang: "kr", from: "plant té ka fann,", to: "plant té ka fanné," },
  { lang: "kr", from: "bor larivyè-la", to: "bò larivyè-la" },
  { lang: "kr", from: "dis, venn…", to: "dis, ven…" },
  { lang: "kr", from: "an mitan bouk-la", to: "anmitan bouk-la" },
  { lang: "kr", from: "ti ma-yo plen", to: "sé ti ma-la plen" },
  // 2026-10-04 gcf audit, see docs/kreyol/correction-report.md
  { lang: "kr", from: "Es mwen pé édé", to: "Ès mwen pé édé" },
  { lang: "kr", from: "robinè", to: "wobinè" },
  { lang: "fr", from: "J'en ai juste assez pour moi.", to: "Cette eau est à moi." },
  { lang: "fr", from: "Mais après ? Gwo Rako", to: "Combien de temps ? Gwo Rako" },
];

/** Mockup text with the post-port corrections applied. */
const corrected = (lang: "kr" | "fr", text: string): string =>
  CORRECTIONS.filter((c) => c.lang === lang).reduce((acc, c) => acc.split(c.from).join(c.to), text);

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

  it("applies every listed correction to the mockup text", () => {
    const text = (lang: "kr" | "fr"): string =>
      v13Pages()
        .map((p) => p[lang].b)
        .join(" ");
    for (const c of CORRECTIONS) expect(text(c.lang), c.from).toContain(c.from);
  });

  it("keeps every Kréyòl and French word, label and gloss", async () => {
    const { gcf, fr } = await registry.loadStories("ti-kannot");
    const pages = v13Pages();
    expect(gcf.pages).toHaveLength(pages.length);
    pages.forEach((v13, i) => {
      expect(gcf.pages[i].label).toBe(v13.label);
      expect(gcf.pages[i].title).toBe(corrected("kr", v13.kr.t));
      expect(plain(gcf.pages[i])).toBe(corrected("kr", v13.kr.b));
      expect(fr?.pages[i].title).toBe(corrected("fr", v13.fr.t));
      expect(plain(fr?.pages[i])).toBe(corrected("fr", v13.fr.b));
      expect(fr?.pages[i].summary).toBe(v13.kr.g);
    });
  });
});
