import { describe, expect, it } from "vitest";
import type { BookManifest } from "@app/contract";
import { createFlip } from "./flip";
import { buildPages, buildSections, sectionOf, type Portrait } from "./pages";
import { PORTRAITS } from "./portraits/index";

const art = (w: number, h: number) => ({
  url: `/${w}x${h}.webp`,
  width: w,
  height: h,
  titleInArt: false,
});
const world = () =>
  Promise.resolve({ default: { mount: () => ({ setPage() {}, setStory() {}, dispose() {} }) } });

/** A catalogue like the real one: two published tales, two pending manifests, out of order. */
const BOOKS: BookManifest[] = [
  {
    id: "ti-kannot",
    order: 1,
    ready: true,
    card: { short: "Ti Kannot", title: "Ti Kannot é Gwo Rako", sub: "", theme: "Dlo" },
    art: art(640, 960),
    world,
  },
  { id: "zanba", order: 2, ready: false, card: { title: "Zanba é Lapen", sub: "", theme: "Riz" } },
  {
    id: "mila",
    order: 4,
    ready: true,
    card: { short: "Mila", title: "Mila", sub: "", theme: "La mer", lang: "fr" },
    art: art(960, 640),
    world,
  },
];

const painter = (): void => undefined;

describe("buildPages", () => {
  it("lists the published tales of the catalogue, each followed by its portraits", () => {
    const pages = buildPages(BOOKS, PORTRAITS);
    expect(pages.map((p) => p.id)).toEqual(["ti-kannot", "konpe-lapen", "mila", "konpe-zanba"]);
    expect(pages.map((p) => p.kind)).toEqual(["tale", "portrait", "tale", "portrait"]);
  });

  it("skips pending books and tales without an official visual", () => {
    const noArt = { ...BOOKS[2], id: "x", art: undefined } as BookManifest;
    expect(buildPages([...BOOKS, noArt], []).map((p) => p.id)).toEqual(["ti-kannot", "mila"]);
  });

  it("adds a portrait from editorial data alone: the page turn walks it both ways", () => {
    const extra: Portrait = {
      id: "manman-dlo",
      name: "Manman Dlo",
      frenchName: "Maman de l'eau",
      text: "…",
      after: "ti-kannot",
      paint: painter,
    };
    const pages = buildPages(BOOKS, [...PORTRAITS, extra]);
    expect(pages.map((p) => p.id)).toEqual([
      "ti-kannot",
      "konpe-lapen",
      "manman-dlo",
      "mila",
      "konpe-zanba",
    ]);
    const flip = createFlip(pages.length);
    for (let i = 0; i < pages.length; i++) {
      flip.request(flip.target + 1);
      while (flip.step(0.1));
    }
    expect(flip.shown).toBe(pages.length - 1);
    for (let i = 0; i < pages.length; i++) {
      flip.request(flip.target - 1);
      while (flip.step(0.1));
    }
    expect(flip.shown).toBe(0);
  });

  it("puts a portrait with an unknown anchor at the end", () => {
    const lost: Portrait = {
      id: "lost",
      name: "L",
      frenchName: "L",
      text: "",
      after: "nope",
      paint: painter,
    };
    expect(buildPages(BOOKS, [lost]).map((p) => p.id)).toEqual(["ti-kannot", "mila", "lost"]);
  });
});

describe("buildSections", () => {
  it("names one bookmark per tale universe, pointing at its tale page", () => {
    const pages = buildPages(BOOKS, PORTRAITS);
    const sections = buildSections(pages);
    expect(sections).toEqual([
      { id: "ti-kannot", label: "Ti Kannot", lang: "gcf", page: 0 },
      { id: "mila", label: "Mila", lang: "fr", page: 2 },
    ]);
    expect([0, 1, 2, 3].map((i) => sectionOf(sections, i))).toEqual([0, 0, 1, 1]);
  });
});

describe("PORTRAITS", () => {
  it("presents Konpè Lapen and Konpè Zanba with two or three sentences each", () => {
    expect(PORTRAITS.map((p) => p.name)).toEqual(["Konpè Lapen", "Konpè Zanba"]);
    for (const p of PORTRAITS) {
      const sentences = p.text.split(/[.!?…](?:\s|$)/).filter((s) => s.trim());
      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences.length).toBeLessThanOrEqual(3);
    }
  });
});
