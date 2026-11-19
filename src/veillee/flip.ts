/** A leaf in flight from one spread to another. */
export interface Turn {
  from: number;
  to: number;
  /** +1 forward (the leaf lifts from the right), -1 backward. */
  dir: 1 | -1;
  /** 0 → 1 over the turn. */
  progress: number;
}

export interface Flip {
  /** The selected page: title, link and destination always follow it. */
  readonly target: number;
  /** The spread lying flat (the one under the leaf when a turn is in flight). */
  readonly shown: number;
  readonly turn: Turn | null;
  /** Selects a page; the leaf turns towards it, or hurries when another turn is in flight. */
  request(index: number): void;
  /** Shows a page at once, without turning (back from a tale, reduced motion). */
  jump(index: number): void;
  /** Advances the turn by `dt` seconds; returns true while a leaf is moving. */
  step(dt: number): boolean;
}

/** Turn length in seconds, and how much faster a turn ends when the reader asks for more. */
export const TURN_SECONDS = 1.15;
export const HURRY = 4;

/**
 * Page-turn state for `count` pages: one leaf at a time, always turning from the flat spread
 * straight to the latest target (a multi-page jump turns a single leaf), so fast gestures never
 * queue a storm of leaves and the selection never lags behind the input.
 */
export function createFlip(count: number, start = 0): Flip {
  const clampIndex = (i: number): number => Math.max(0, Math.min(count - 1, Math.round(i)));
  let target = clampIndex(start);
  let shown = target;
  let turn: Turn | null = null;
  let hurry = false;

  const begin = (): void => {
    if (target === shown) return;
    turn = { from: shown, to: target, dir: target > shown ? 1 : -1, progress: 0 };
    hurry = false;
  };

  return {
    get target() {
      return target;
    },
    get shown() {
      return shown;
    },
    get turn() {
      return turn;
    },
    request(index) {
      const next = clampIndex(index);
      if (next === target) return;
      target = next;
      if (turn) hurry = true;
      else begin();
    },
    jump(index) {
      target = shown = clampIndex(index);
      turn = null;
      hurry = false;
    },
    step(dt) {
      if (!turn) return false;
      turn.progress = Math.min(1, turn.progress + (dt / TURN_SECONDS) * (hurry ? HURRY : 1));
      if (turn.progress >= 1) {
        shown = turn.to;
        turn = null;
        begin();
      }
      return turn !== null;
    },
  };
}
