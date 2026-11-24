import { describe, expect, it } from "vitest";
import { createTerrain, highestUnderSole, type Sole } from "./terrain";

/** A ridge 0.2 m high and 0.1 m wide along z, centred on x = `at`, from z = -1 to z = 1. */
function ridge(at: number): number[] {
  const [l, r, y] = [at - 0.05, at + 0.05, 0.2];
  // prettier-ignore
  return [
    l, y, -1,  r, y, -1,  r, y, 1,
    l, y, -1,  r, y, 1,   l, y, 1,
  ];
}
const SOLE: Sole = { front: 0.13, back: 0.05, half: 0.04 };

describe("terrain", () => {
  const terrain = createTerrain(ridge(0.5));

  it("gives the height of a solid over a place, and 0 on open ground", () => {
    expect(terrain.heightAt(0.5, 0, 0)).toBeCloseTo(0.2, 6);
    expect(terrain.heightAt(0.52, 0.9, 0)).toBeCloseTo(0.2, 6);
    expect(terrain.heightAt(0.3, 0, 0)).toBe(0);
    expect(terrain.heightAt(0.5, 1.2, 0)).toBe(0);
    expect(terrain.heightAt(40, -40, 0)).toBe(0);
  });

  it("measures from the floor asked, and ignores what is out of a step's reach", () => {
    expect(terrain.heightAt(0.5, 0, 0.15)).toBeCloseTo(0.05, 6);
    // The floor itself, and anything above the reach, are not something to step on.
    expect(terrain.heightAt(0.5, 0, 0.19)).toBe(0);
    expect(terrain.heightAt(0.5, 0, 0, 0.1)).toBe(0);
  });

  it("finds a solid under the toe or the side of a sole whose ankle is on open ground", () => {
    // Ankle 0.1 m short of the ridge, toes pointing at it (+x): the ankle is clear, the toe is not.
    const sin = 1;
    const cos = 0;
    expect(terrain.heightAt(0.36, 0, 0)).toBe(0);
    expect(highestUnderSole(terrain, SOLE, 0.36, 0, sin, cos, 0)).toBeCloseTo(0.2, 6);
    // Walking along the ridge (+z) beside it: only the side of the shoe is over it.
    expect(terrain.heightAt(0.42, 0, 0)).toBe(0);
    expect(highestUnderSole(terrain, SOLE, 0.42, 0, 0, 1, 0)).toBeCloseTo(0.2, 6);
    // Far enough, the whole sole is on open ground.
    expect(highestUnderSole(terrain, SOLE, 0.2, 0, sin, cos, 0)).toBe(0);
    expect(highestUnderSole(terrain, SOLE, 0.36, 0, 0, 1, 0)).toBe(0);
  });
});
