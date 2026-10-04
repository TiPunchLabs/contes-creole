import { describe, expect, it } from "vitest";
import { SPOTS, spotPoint } from "./spots";
import { islandHeight, riverDistance } from "./terrain";

describe("spots", () => {
  it("are all on dry land, off the river", () => {
    for (const [x, z] of Object.values(SPOTS)) {
      expect(islandHeight(x, z)).toBeGreaterThan(0.2);
      expect(riverDistance(x, z)).toBeGreaterThan(1);
    }
  });

  it("returns the ground point of a spot", () => {
    const [x, z] = SPOTS.yard;
    expect(spotPoint("yard").toArray()).toEqual([x, islandHeight(x, z), z]);
  });

  it("gives every spot a distinct place", () => {
    const keys = new Set(Object.values(SPOTS).map(([x, z]) => `${x},${z}`));
    expect(keys.size).toBe(Object.keys(SPOTS).length);
  });
});
