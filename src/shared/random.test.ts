import { describe, expect, it } from "vitest";
import { createRng } from "./random";

describe("createRng", () => {
  it("reproduces the v13 Park–Miller sequence", () => {
    const rng = createRng(11);
    expect(rng()).toBeCloseTo((11 * 16807 - 1) / 2147483646, 12);
  });

  it("is deterministic per seed and independent per instance", () => {
    const a = createRng(11);
    const b = createRng(11);
    const draws = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(draws);
  });

  it("stays within [0, 1)", () => {
    const rng = createRng(3);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
