import { describe, expect, it } from "vitest";
import { islandPlan, sightlines, stages, stoneBlocks } from "./landscape";
import { shorePlan } from "./shore";
import { islandHeight, riverDistance } from "./terrain";

const { houses } = islandPlan();
const rocks = shorePlan(houses);

describe("shore rocks", () => {
  it("ring the coast in the shallows, away from the river mouth", () => {
    expect(rocks.length).toBeGreaterThanOrEqual(20);
    for (const r of rocks) {
      expect(islandHeight(r.x, r.z)).toBeLessThan(0);
      expect(islandHeight(r.x, r.z)).toBeGreaterThan(-1.2);
      expect(riverDistance(r.x, r.z)).toBeGreaterThan(3);
    }
  });

  it("never block a page's sightlines or crowd a story camera", () => {
    const lines = sightlines(houses);
    const cameras = stages().map((s) => s.camera);
    for (const r of rocks) {
      expect(stoneBlocks(r, lines)).toEqual([]);
      for (const c of cameras) expect(Math.hypot(c.x - r.x, c.z - r.z)).toBeGreaterThan(8);
    }
  });

  it("are the same on every visit", () => {
    expect(shorePlan(houses)).toEqual(rocks);
  });
});
