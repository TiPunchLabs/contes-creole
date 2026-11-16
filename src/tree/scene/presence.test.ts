import { describe, expect, it } from "vitest";
import { HIDE_ABOVE, hiddenShare, stepPresence, type Presence } from "./presence";

const SHELF = { left: 8, top: 312, right: 836, bottom: 378 };

describe("hiddenShare", () => {
  it("is 0 for a figure whole on screen above the shelf", () => {
    expect(hiddenShare({ left: 300, top: 250, right: 340, bottom: 305 }, 844, 390, [SHELF])).toBe(
      0,
    );
  });

  it("counts what the shelf covers", () => {
    // The review's case at 844×390: ears above the shelf, the body behind it.
    const share = hiddenShare({ left: 300, top: 300, right: 340, bottom: 360 }, 844, 390, [SHELF]);
    expect(share).toBeCloseTo(0.8);
    expect(share).toBeGreaterThan(HIDE_ABOVE);
  });

  it("counts what lies beyond the edges of the screen", () => {
    expect(hiddenShare({ left: -20, top: 100, right: 20, bottom: 200 }, 844, 390, [SHELF])).toBe(
      0.5,
    );
    expect(hiddenShare({ left: 900, top: 100, right: 940, bottom: 200 }, 844, 390, [SHELF])).toBe(
      1,
    );
  });

  it("counts the intro text too while it shows, and no cover at all when there is none", () => {
    const intro = { left: 500, top: 20, right: 800, bottom: 150 };
    const box = { left: 480, top: 100, right: 520, bottom: 200 };
    expect(hiddenShare(box, 844, 390, [SHELF, intro])).toBeCloseTo(0.25);
    expect(hiddenShare(box, 844, 390, [SHELF, null])).toBe(0);
  });

  it("does not count a shelf the figure stands beside", () => {
    const narrow = { left: 260, top: 808, right: 1180, bottom: 874 };
    expect(hiddenShare({ left: 60, top: 600, right: 200, bottom: 830 }, 1440, 900, [narrow])).toBe(
      0,
    );
  });
});

describe("stepPresence", () => {
  const run = (p: Presence, hidden: number, frames: number): Presence => {
    for (let i = 0; i < frames; i++) stepPresence(p, hidden, 1 / 60);
    return p;
  };

  it("fades a cut figure out in a fifth of a second, and back in once it is whole", () => {
    const p: Presence = { opacity: 1, shown: true };
    run(p, 0.8, 6);
    expect(p.opacity).toBeGreaterThan(0);
    expect(p.opacity).toBeLessThan(1);
    run(p, 0.8, 8);
    expect(p.opacity).toBe(0);
    run(p, 0, 13);
    expect(p.opacity).toBe(1);
  });

  it("leaves a figure alone while little of it is cut, and does not flicker at the limit", () => {
    const p: Presence = { opacity: 1, shown: true };
    run(p, HIDE_ABOVE - 0.01, 30);
    expect(p.opacity).toBe(1);
    run(p, HIDE_ABOVE + 0.01, 30);
    expect(p.opacity).toBe(0);
    // Back just under the limit is not enough to come back: it must nearly all show.
    run(p, HIDE_ABOVE - 0.01, 30);
    expect(p.opacity).toBe(0);
  });

  it("can skip the fade", () => {
    const p: Presence = { opacity: 1, shown: true };
    stepPresence(p, 1, 0, true);
    expect(p.opacity).toBe(0);
  });
});
