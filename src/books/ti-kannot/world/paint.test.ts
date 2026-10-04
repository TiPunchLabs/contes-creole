import { describe, expect, it } from "vitest";
import { paintQuality } from "./paint";

describe("paintQuality", () => {
  it("keeps the full brush on desktops", () => {
    expect(paintQuality(false, 1)).toBe("high");
    expect(paintQuality(false, 2)).toBe("high");
  });

  it("lightens the pass on touch screens and very dense displays", () => {
    expect(paintQuality(true, 1)).toBe("low");
    expect(paintQuality(false, 3)).toBe("low");
  });
});
