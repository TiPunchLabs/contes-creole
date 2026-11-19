export type Gesture = "tap" | "next" | "prev" | "none";

/** A press shorter and stiller than this is a tap. */
export const TAP_DISTANCE = 10;
export const TAP_MS = 450;
/** A horizontal move longer than this, and clearly more horizontal than vertical, turns a page. */
export const SWIPE_DISTANCE = 40;
const SWIPE_RATIO = 1.4;

/**
 * Classifies a finished press by its displacement (`dx`, `dy`, px) and duration (ms): a tap, a
 * swipe to the next page (finger moving left, like lifting the right-hand page), to the previous
 * one, or nothing (a scroll, a hesitation).
 */
export function classify(dx: number, dy: number, ms: number): Gesture {
  const distance = Math.hypot(dx, dy);
  if (distance < TAP_DISTANCE && ms < TAP_MS) return "tap";
  if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > SWIPE_RATIO * Math.abs(dy))
    return dx < 0 ? "next" : "prev";
  return "none";
}
