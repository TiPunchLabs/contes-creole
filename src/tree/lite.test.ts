import { describe, expect, it } from "vitest";
import { detectLite, scaleCount } from "./lite";

const env = (cores: number, coarsePointer: boolean, search = "") => ({
  cores,
  coarsePointer,
  search,
});

describe("detectLite", () => {
  it.each([
    [env(8, false), false],
    [env(4, false), true],
    [env(2, false), true],
    [env(16, true), true],
  ])("%o → %s", (input, expected) => {
    expect(detectLite(input)).toBe(expected);
  });

  it("obeys ?lite=1 and ?lite=0 over detection", () => {
    expect(detectLite(env(16, false, "?lite=1"))).toBe(true);
    expect(detectLite(env(2, true, "?lite=0"))).toBe(false);
    expect(detectLite(env(16, false, "?lite=maybe"))).toBe(false);
  });
});

describe("scaleCount", () => {
  it("keeps full counts outside lite mode", () => {
    expect(scaleCount(600, false)).toBe(600);
  });

  it("scales by 0.45 and never drops below one", () => {
    expect(scaleCount(600, true)).toBe(270);
    expect(scaleCount(1, true)).toBe(1);
    expect(scaleCount(0, true)).toBe(1);
  });
});
