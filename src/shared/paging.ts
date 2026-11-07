export interface Pager {
  /** Feeds a wheel/drag delta; returns the page step to take (v13: 60 px, then 750 ms lock). */
  step(dy: number, now: number): -1 | 0 | 1;
  reset(): void;
}

/** Turns continuous scroll input into one page turn per gesture. */
export function createPager(threshold = 60, lockMs = 750): Pager {
  let acc = 0;
  let lockUntil = 0;
  return {
    step(dy, now) {
      if (now < lockUntil) return 0;
      acc += dy;
      if (Math.abs(acc) <= threshold) return 0;
      const direction = acc > 0 ? 1 : -1;
      acc = 0;
      lockUntil = now + lockMs;
      return direction;
    },
    reset() {
      acc = 0;
      lockUntil = 0;
    },
  };
}

/** Restricts a page index to [0, count - 1]. */
export function clampPage(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index));
}
