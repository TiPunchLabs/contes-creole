/** Linear interpolation from `a` to `b`. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Restricts `value` to [min, max]. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Hermite ease of a t already in [0, 1] (v13 `sm`). */
export const smoothstep = (t: number): number => t * t * (3 - 2 * t);
