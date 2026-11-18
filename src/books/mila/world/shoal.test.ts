import { describe, expect, it } from "vitest";
import {
  gapToLimb,
  gapToSolid,
  overFloor,
  steer,
  swimmer,
  type Limb,
  type Solid,
  type Swimmer,
} from "./shoal";

const DT = 1 / 60;
const flat = (): number => -10;
const SURFACE = 0;

/** A swimmer of radius `r` whose route is at (x, y, z). */
function at(x: number, y: number, z: number, r = 0.1, side = 1): Swimmer {
  const f = swimmer(side);
  f.hx = x;
  f.hy = y;
  f.hz = z;
  f.r = r;
  return f;
}

describe("the shoal", () => {
  it("keeps a swimmer on its route when nothing is in the way", () => {
    const f = at(1, -3, 2);
    for (let i = 0; i < 120; i++) {
      f.hx += 0.01;
      steer([f], DT, [], [], flat, SURFACE);
    }
    expect(f.x).toBeCloseTo(f.hx, 9);
    expect(f.y).toBeCloseTo(-3, 9);
    expect(f.z).toBeCloseTo(2, 9);
  });

  it("goes around a rock that lies on its route, without a jump, and comes back to the route", () => {
    for (const lane of [0, 0.05, -0.4, 0.7]) {
      const rock: Solid = { x: 0, y: -9.6, z: 0, r: 1, ry: 0.7, grounded: true };
      const f = at(-4, -9.4, lane);
      let closest = Infinity;
      let longest = 0;
      for (let i = 0; i < 60 * 14; i++) {
        const px = f.x;
        const py = f.y;
        const pz = f.z;
        f.hx += 0.6 * DT;
        steer([f], DT, [rock], [], flat, SURFACE);
        closest = Math.min(closest, gapToSolid(f, rock));
        if (i > 0) longest = Math.max(longest, Math.hypot(f.x - px, f.y - py, f.z - pz));
      }
      expect(closest).toBeGreaterThanOrEqual(-1e-6);
      // its route moves 0.01 m a frame: going around never costs more than a few times that
      expect(longest).toBeLessThan(0.06);
      expect(Math.hypot(f.x - f.hx, f.y - f.hy, f.z - f.hz)).toBeLessThan(0.02);
    }
  });

  it("gives way to a limb that comes at it, the sooner the wider its berth", () => {
    const limb: Limb = {
      ax: -3,
      ay: -3.5,
      az: 0,
      bx: -3,
      by: -2.5,
      bz: 0,
      r: 0.3,
      wide: 1,
      vx: 2,
      vy: 0,
      vz: 0,
    };
    const f = at(0, -3, 0.02);
    let closest = Infinity;
    for (let i = 0; i < 60 * 4; i++) {
      limb.ax += 2 * DT;
      limb.bx += 2 * DT;
      steer([f], DT, [], [limb], flat, SURFACE);
      closest = Math.min(closest, gapToLimb(f, limb));
    }
    expect(closest).toBeGreaterThanOrEqual(-1e-6);
  });

  it("keeps two swimmers that cross apart, and a queue behind a slower one", () => {
    const a = at(-2, -3, 0, 0.1, 1);
    const b = at(2, -3, 0.01, 0.1, -1);
    const c = at(-2.5, -3, 0, 0.1, 1);
    let closest = Infinity;
    for (let i = 0; i < 60 * 8; i++) {
      a.hx += 0.5 * DT;
      b.hx -= 0.5 * DT;
      c.hx += 0.9 * DT;
      steer([a, b, c], DT, [], [], flat, SURFACE);
      for (const [p, q] of [
        [a, b],
        [a, c],
        [b, c],
      ])
        closest = Math.min(closest, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) - p.r - q.r);
    }
    expect(closest).toBeGreaterThanOrEqual(-1e-6);
  });

  it("stays above the sea floor and under the surface", () => {
    const low = at(0, -12, 0);
    const high = at(1, 3, 0);
    steer([low, high], DT, [], [], flat, SURFACE);
    expect(low.y).toBeCloseTo(-10 + low.r, 9);
    expect(high.y).toBeCloseTo(SURFACE - high.r, 9);
  });

  it("leaves a swimmer that is not in the sea yet out of its neighbours' way", () => {
    const hidden = at(0, -3, 0, 0);
    const f = at(0.05, -3, 0);
    steer([hidden, f], DT, [], [], flat, SURFACE);
    expect(f.x).toBeCloseTo(0.05, 9);
  });

  it("does the same thing twice from the same start, and nothing when time stands still", () => {
    const run = (): number[] => {
      const rock: Solid = { x: 0, y: -3, z: 0, r: 0.6, ry: 0.6, grounded: false };
      const shoal = [at(-2, -3, 0.1), at(-2.3, -3.1, -0.1, 0.12, -1), at(2, -2.9, 0, 0.1, -1)];
      for (let i = 0; i < 400; i++) {
        shoal[0].hx += 0.4 * DT;
        shoal[1].hx += 0.5 * DT;
        shoal[2].hx -= 0.4 * DT;
        steer(shoal, DT, [rock], [], flat, SURFACE);
      }
      const before = shoal.flatMap((f) => [f.x, f.y, f.z]);
      steer(shoal, 0, [rock], [], flat, SURFACE);
      expect(shoal.flatMap((f) => [f.x, f.y, f.z])).toEqual(before);
      return before;
    };
    expect(run()).toEqual(run());
  });
});

/** The smallest gap between any two of these swimmers (negative: they overlap). */
function tightest(shoal: readonly Swimmer[]): number {
  let gap = Infinity;
  for (let i = 0; i < shoal.length; i++)
    for (let j = i + 1; j < shoal.length; j++) {
      const p = shoal[i];
      const q = shoal[j];
      gap = Math.min(gap, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) - p.r - q.r);
    }
  return gap;
}

describe("a crowd of swimmers", () => {
  it("untangles three on the same spot in one step, even when time stands still", () => {
    const shoal = [at(0, -3, 0), at(0, -3, 0), at(0, -3, 0)];
    steer(shoal, 0, [], [], flat, SURFACE);
    expect(tightest(shoal)).toBeGreaterThanOrEqual(-5e-4);
  });

  it("keeps two on the same spot apart right under the surface", () => {
    const shoal = [at(0, -0.15, 0), at(0, -0.15, 0)];
    steer(shoal, 0, [], [], flat, SURFACE);
    expect(tightest(shoal)).toBeGreaterThanOrEqual(-5e-4);
    for (const f of shoal) expect(f.y).toBeLessThanOrEqual(SURFACE - f.r + 1e-9);
  });

  it("untangles a dozen on the same spot against the floor, a rock and a limb", () => {
    const rock: Solid = { x: 0.3, y: -9.7, z: 0, r: 0.5, ry: 0.4, grounded: true };
    const limb: Limb = {
      ax: -0.4,
      ay: -9.9,
      az: -1,
      bx: -0.4,
      by: -9.9,
      bz: 1,
      r: 0.2,
      wide: 0.3,
      vx: 0,
      vy: 0,
      vz: 0,
    };
    const shoal = Array.from({ length: 12 }, (_, i) => at(0, -9.95, 0, 0.08 + (i % 3) * 0.02));
    steer(shoal, 0, [rock], [limb], flat, SURFACE);
    for (let i = 0; i < 3 && tightest(shoal) < -5e-4; i++)
      steer(shoal, DT, [rock], [limb], flat, SURFACE);
    expect(tightest(shoal)).toBeGreaterThanOrEqual(-5e-4);
    for (const f of shoal) {
      expect(gapToSolid(f, rock)).toBeGreaterThanOrEqual(-1e-6);
      expect(gapToLimb(f, limb)).toBeGreaterThanOrEqual(-1e-6);
      expect(f.y).toBeGreaterThanOrEqual(-10 + f.r - 1e-9);
    }
  });

  it("keeps a packed school apart while it travels over a rock", () => {
    const rock: Solid = { x: 0, y: -9.6, z: 0, r: 1, ry: 0.7, grounded: true };
    const shoal = Array.from({ length: 60 }, (_, i) =>
      at(
        -3 + (i % 5) * 0.16,
        -9.5 + (((i / 5) % 4) | 0) * 0.16,
        -0.24 + ((i / 20) | 0) * 0.16,
        0.07,
        i % 2 ? 1 : -1,
      ),
    );
    let worst = Infinity;
    let inRock = Infinity;
    for (let i = 0; i < 60 * 12; i++) {
      for (const f of shoal) f.hx += 0.5 * DT;
      steer(shoal, DT, [rock], [], flat, SURFACE);
      worst = Math.min(worst, tightest(shoal));
      for (const f of shoal) inRock = Math.min(inRock, gapToSolid(f, rock));
    }
    expect(worst).toBeGreaterThanOrEqual(-5e-4);
    expect(inRock).toBeGreaterThanOrEqual(-1e-6);
  });
});

describe("a route over the sea floor", () => {
  it("is left alone in deep water, lifted where it would run aground, and never under the floor", () => {
    expect(overFloor(-3, -10, 0.3)).toBeCloseTo(-3, 2);
    expect(overFloor(-12, -10, 0.3)).toBeCloseTo(-10, 1);
    for (let y = -14; y < -6; y += 0.1) {
      expect(overFloor(y, -10, 0.3)).toBeGreaterThanOrEqual(Math.max(y, -10));
      // no kink: the height never changes faster than the route does
      expect(overFloor(y + 0.1, -10, 0.3) - overFloor(y, -10, 0.3)).toBeLessThanOrEqual(0.1 + 1e-9);
    }
  });
});
