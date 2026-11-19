import { describe, expect, it } from "vitest";
import { createFlip, HURRY, TURN_SECONDS } from "./flip";
import { classify } from "./gesture";

describe("createFlip", () => {
  it("selects at once and turns one leaf towards the target", () => {
    const flip = createFlip(4);
    flip.request(1);
    expect(flip.target).toBe(1);
    expect(flip.shown).toBe(0);
    expect(flip.turn).toMatchObject({ from: 0, to: 1, dir: 1 });
    flip.step(TURN_SECONDS);
    expect(flip.shown).toBe(1);
    expect(flip.turn).toBeNull();
  });

  it("keeps the selection in step with fast input: the next leaf goes straight to the last target", () => {
    const flip = createFlip(5);
    flip.request(1);
    flip.step(0.1);
    flip.request(2);
    flip.request(3);
    expect(flip.target).toBe(3);
    // The leaf in flight hurries, then a single leaf turns 1 → 3.
    flip.step(TURN_SECONDS / HURRY);
    expect(flip.turn).toMatchObject({ from: 1, to: 3 });
    flip.step(TURN_SECONDS);
    expect(flip.shown).toBe(3);
  });

  it("turns backwards and clamps to the book", () => {
    const flip = createFlip(3, 2);
    flip.request(-5);
    expect(flip.target).toBe(0);
    expect(flip.turn?.dir).toBe(-1);
    flip.request(0);
    flip.step(TURN_SECONDS);
    expect(flip.shown).toBe(0);
  });

  it("jumps without turning (back from a tale, reduced motion)", () => {
    const flip = createFlip(4);
    flip.request(3);
    flip.jump(2);
    expect([flip.target, flip.shown, flip.turn]).toEqual([2, 2, null]);
  });
});

describe("classify", () => {
  it("tells a tap from a swipe and a scroll", () => {
    expect(classify(3, 2, 120)).toBe("tap");
    expect(classify(-80, 10, 200)).toBe("next");
    expect(classify(90, -12, 300)).toBe("prev");
    expect(classify(30, 80, 300)).toBe("none");
    expect(classify(4, 3, 900)).toBe("none");
  });
});
