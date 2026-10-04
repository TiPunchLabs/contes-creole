import { describe, expect, it } from "vitest";
import { MAX_STOCK, pileSlot } from "./stock";

describe("pileSlot", () => {
  it("fills rows, then rows of the next layer", () => {
    expect(pileSlot(0, 10, 3)).toEqual([0, 0, 0]);
    expect(pileSlot(12, 10, 3)).toEqual([2, 0, 1]);
    expect(pileSlot(31, 10, 3)).toEqual([1, 1, 0]);
  });

  it("stacks the biggest pile on two layers at most", () => {
    expect(pileSlot(MAX_STOCK.kalbas - 1, 10, 3)[1]).toBeLessThanOrEqual(1);
  });
});
