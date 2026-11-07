import { describe, expect, it } from "vitest";
import { clampPage, createPager } from "./paging";

describe("createPager", () => {
  it("accumulates small deltas until 60 px", () => {
    const pager = createPager();
    expect(pager.step(30, 0)).toBe(0);
    expect(pager.step(40, 10)).toBe(1);
  });

  it("pages backwards on negative deltas", () => {
    expect(createPager().step(-80, 0)).toBe(-1);
  });

  it("locks for 750 ms after a turn and ignores deltas meanwhile", () => {
    const pager = createPager();
    expect(pager.step(100, 0)).toBe(1);
    expect(pager.step(100, 700)).toBe(0);
    expect(pager.step(30, 751)).toBe(0);
    expect(pager.step(40, 760)).toBe(1);
  });

  it("forgets everything on reset", () => {
    const pager = createPager();
    pager.step(100, 0);
    pager.reset();
    expect(pager.step(100, 1)).toBe(1);
  });
});

describe("clampPage", () => {
  it("keeps the index within the book", () => {
    expect(clampPage(-1, 12)).toBe(0);
    expect(clampPage(12, 12)).toBe(11);
    expect(clampPage(5, 12)).toBe(5);
  });
});
