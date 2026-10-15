import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { cardT, hubCam } from "./camera";

describe("cardT", () => {
  it("puts a single book in the middle of the climb", () => {
    expect(cardT(0, 1)).toBe(0.5);
  });

  it.each([2, 3, 5])("spreads %i books over [0.2, 0.88], strictly increasing", (count) => {
    const ts = Array.from({ length: count }, (_, i) => cardT(i, count));
    expect(ts[0]).toBeCloseTo(0.2);
    expect(ts[count - 1]).toBeCloseTo(0.88);
    ts.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(ts[i]));
  });
});

describe("hubCam", () => {
  it("starts low and far, ends high and closer (v14 path)", () => {
    const out = new THREE.Vector3();
    const look = new THREE.Vector3();
    hubCam(0, out, look);
    expect(out.y).toBeCloseTo(1.3);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(20);
    hubCam(1, out, look);
    expect(out.y).toBeCloseTo(7.7);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(16);
  });
});
