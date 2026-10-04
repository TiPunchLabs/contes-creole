import { describe, expect, it } from "vitest";
import fr from "./story/fr.md?raw";
import gcf from "./story/gcf.md?raw";
import { STAGING } from "./staging";
import { MAX_STOCK } from "./world/stock";

/** Page ids of a story file, in reading order. */
const ids = (md: string): string[] => [...md.matchAll(/\{#([\w-]+)\}/g)].map((m) => m[1]);

describe("STAGING", () => {
  it("stages exactly the pages of every language", () => {
    expect(Object.keys(STAGING)).toEqual(ids(gcf));
    expect(ids(fr)).toEqual(ids(gcf));
  });

  it("never asks for more stock than the pile can show", () => {
    for (const env of Object.values(STAGING)) {
      expect(env.kalbas).toBeLessThanOrEqual(MAX_STOCK.kalbas);
      expect(env.barrels).toBeLessThanOrEqual(MAX_STOCK.barrels);
      expect(env.jars).toBeLessThanOrEqual(MAX_STOCK.jars);
    }
  });

  it("follows the tale's piles: 20, then 50, then empty", () => {
    expect(STAGING["on-lide-gwo-rako"].kalbas).toBe(20);
    expect(STAGING["larivye-la-ka-desann"].kalbas).toBe(50);
    expect(STAGING["denye-leson-la"].empty).toBe(1);
  });
});
