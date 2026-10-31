/**
 * A few numbers easing towards a target in a set time. Each move is a quintic Hermite curve that
 * starts from the current value, speed and acceleration and ends at rest, so a new target given
 * mid-way bends the motion instead of restarting it.
 */
export interface Glide {
  /** Current values (read-only for callers). */
  readonly value: Float64Array;
  /** Glides from wherever the values are now to `target` in `seconds`. */
  to(target: ArrayLike<number>, seconds: number): void;
  /** Jumps to `target` and stops. */
  set(target: ArrayLike<number>): void;
  /** Advances by `dt` seconds; returns false once at rest. */
  update(dt: number): boolean;
}

/** Glide over `start.length` numbers, at rest on `start`. */
export function createGlide(start: ArrayLike<number>): Glide {
  const n = start.length;
  const value = Float64Array.from(start);
  const goal = Float64Array.from(start);
  const p0 = new Float64Array(n);
  const v0 = new Float64Array(n);
  const a0 = new Float64Array(n);
  const c3 = new Float64Array(n);
  const c4 = new Float64Array(n);
  const c5 = new Float64Array(n);
  let duration = 0;
  let t = 0;

  /** Speed (d/ds) and acceleration (d²/ds²) of component `i` at normalized time `s`. */
  const slope = (i: number, s: number): number =>
    v0[i] + s * (a0[i] + s * (3 * c3[i] + s * (4 * c4[i] + s * 5 * c5[i])));
  const bend = (i: number, s: number): number =>
    a0[i] + s * (6 * c3[i] + s * (12 * c4[i] + s * 20 * c5[i]));

  const glide: Glide = {
    value,
    to(target, seconds) {
      const moving = t < duration;
      const s = moving ? t / duration : 1;
      const k = seconds / (moving ? duration : 1);
      for (let i = 0; i < n; i++) {
        const v = moving ? slope(i, s) * k : 0;
        const a = moving ? bend(i, s) * k * k : 0;
        const d = target[i] - value[i];
        p0[i] = value[i];
        v0[i] = v;
        a0[i] = a;
        c3[i] = 10 * d - 6 * v - 1.5 * a;
        c4[i] = -15 * d + 8 * v + 1.5 * a;
        c5[i] = 6 * d - 3 * v - 0.5 * a;
      }
      goal.set(target);
      duration = seconds;
      t = 0;
      if (seconds <= 0) glide.set(target);
    },
    set(target) {
      value.set(target);
      goal.set(target);
      duration = 0;
      t = 0;
    },
    update(dt) {
      if (t >= duration) return false;
      t = Math.min(duration, t + dt);
      if (t === duration) {
        value.set(goal);
        return true;
      }
      const s = t / duration;
      for (let i = 0; i < n; i++) {
        value[i] = p0[i] + s * (v0[i] + s * (a0[i] / 2 + s * (c3[i] + s * (c4[i] + s * c5[i]))));
      }
      return true;
    },
  };
  return glide;
}
