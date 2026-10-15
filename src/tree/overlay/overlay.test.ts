import { describe, expect, it } from "vitest";
import { labelTop } from "./overlay";

describe("labelTop", () => {
  it("keeps the card's own y when the label clears the shelf", () => {
    expect(labelTop(300, 120, 632)).toBe(300);
  });

  it("lifts the label so its bottom stays above the shelf", () => {
    expect(labelTop(560, 120, 632)).toBe(632 - 120 - 10);
  });
});
