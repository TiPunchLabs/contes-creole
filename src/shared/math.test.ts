import { describe, expect, it } from "vitest";
import { clamp, lerp, smoothstep } from "./math";

describe("math", () => {
  it("lerps", () => expect(lerp(2, 4, 0.25)).toBe(2.5));
  it("clamps", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });
  it("smoothsteps", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
  });
});
