import { describe, expect, it } from "vitest";
import { ISLAND_RADIUS, islandHeight, riverDistance, riverPoint } from "./terrain";

describe("islandHeight", () => {
  it("is land in the middle and sea floor beyond the coast", () => {
    expect(islandHeight(0, 0)).toBeGreaterThan(0);
    expect(islandHeight(ISLAND_RADIUS * 1.3, 0)).toBeLessThan(0);
    expect(islandHeight(0, ISLAND_RADIUS * 1.3)).toBeLessThan(0);
  });

  it("flows downhill from the source to the mouth", () => {
    const src = riverPoint(0.02);
    const mid = riverPoint(0.5);
    const low = riverPoint(0.85);
    expect(islandHeight(src.x, src.y)).toBeGreaterThan(islandHeight(mid.x, mid.y));
    expect(islandHeight(mid.x, mid.y)).toBeGreaterThan(islandHeight(low.x, low.y));
  });

  it("carves the riverbed below its banks", () => {
    for (const t of [0.3, 0.5, 0.7]) {
      const p = riverPoint(t);
      const banks = (islandHeight(p.x - 4, p.y) + islandHeight(p.x + 4, p.y)) / 2;
      expect(islandHeight(p.x, p.y)).toBeLessThan(banks);
    }
  });

  it("keeps the inland riverbed above sea level", () => {
    for (let t = 0; t <= 0.7; t += 0.05) {
      const p = riverPoint(t);
      expect(islandHeight(p.x, p.y)).toBeGreaterThan(0);
    }
  });
});

describe("riverDistance", () => {
  it("is zero on the centre line and grows away from it", () => {
    const p = riverPoint(0.4);
    expect(riverDistance(p.x, p.y)).toBeLessThan(0.15);
    expect(riverDistance(p.x + 5, p.y)).toBeGreaterThan(3);
  });
});
