import { describe, expect, it } from "vitest";
import { createGlide, type Glide } from "./glide";

const DT = 1 / 60;

/** Per-frame steps of the first value over `seconds`. */
function steps(glide: Glide, seconds: number): number[] {
  const out: number[] = [];
  for (let t = 0; t < seconds; t += DT) {
    const before = glide.value[0];
    glide.update(DT);
    out.push(glide.value[0] - before);
  }
  return out;
}

describe("createGlide", () => {
  it("eases out of rest and lands on the target at rest, in the given time", () => {
    const glide = createGlide([0, 10]);
    glide.to([10, 4], 2);
    const s = steps(glide, 2);
    expect(Math.abs(s[0])).toBeLessThan(0.001);
    expect(Math.abs(s[s.length - 1])).toBeLessThan(0.001);
    expect(Math.max(...s)).toBeGreaterThan(0.1);
    expect(Array.from(glide.value)).toEqual([10, 4]);
    expect(glide.update(DT)).toBe(false);
  });

  it("keeps its speed when a new target arrives mid-way (rapid page turns)", () => {
    const glide = createGlide([0]);
    glide.to([10], 2);
    const before = steps(glide, 0.5);
    glide.to([30], 3);
    const after = steps(glide, 3);
    expect(after[0]).toBeCloseTo(before[before.length - 1], 2);
    for (let i = 1; i < after.length; i++) expect(after[i]).toBeGreaterThanOrEqual(-1e-9);
    expect(glide.value[0]).toBe(30);
  });

  it("turns back smoothly when the target goes behind it (previous page)", () => {
    const glide = createGlide([0]);
    glide.to([10], 2);
    const before = steps(glide, 0.8);
    glide.to([0], 2);
    const after = steps(glide, 2);
    expect(after[0]).toBeCloseTo(before[before.length - 1], 2);
    const jumps = after.slice(1).map((x, i) => Math.abs(x - after[i]));
    expect(Math.max(...jumps)).toBeLessThan(0.01);
    expect(glide.value[0]).toBe(0);
  });

  it("keeps its acceleration when the new move is shorter", () => {
    const glide = createGlide([0]);
    glide.to([10], 3);
    const before = steps(glide, 0.4);
    glide.to([12], 1.6);
    const after = steps(glide, 1.6);
    const accelBefore = before[before.length - 1] - before[before.length - 2];
    expect(after[0] - before[before.length - 1]).toBeCloseTo(accelBefore, 3);
  });

  it("cuts straight to a target with set or a zero duration", () => {
    const glide = createGlide([0]);
    glide.to([5], 2);
    glide.update(DT);
    glide.set([7]);
    expect(glide.value[0]).toBe(7);
    expect(glide.update(DT)).toBe(false);
    glide.to([9], 0);
    expect(glide.value[0]).toBe(9);
  });
});
