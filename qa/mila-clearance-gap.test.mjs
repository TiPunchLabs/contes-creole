import { describe, expect, it } from "vitest";
import { clearanceGeometry } from "./mila-clearance-gap.mjs";

const { gap, overGround, surface, box } = clearanceGeometry();
const TOL = 0.02;

/** A seeded generator, so that the random shapes are the same on every run. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Is the point p inside the shape S, by at least `margin` metres (ellipsoids: in their own metric)? */
function inside(S, p, margin = 0) {
  if (!S.c) {
    const d = [S.b[0] - S.a[0], S.b[1] - S.a[1], S.b[2] - S.a[2]];
    const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    const t =
      l2 > 1e-12
        ? Math.min(
            1,
            Math.max(
              0,
              ((p[0] - S.a[0]) * d[0] + (p[1] - S.a[1]) * d[1] + (p[2] - S.a[2]) * d[2]) / l2,
            ),
          )
        : 0;
    return (
      Math.hypot(p[0] - S.a[0] - d[0] * t, p[1] - S.a[1] - d[1] * t, p[2] - S.a[2] - d[2] * t) <=
      S.r - margin
    );
  }
  const q = [p[0] - S.c[0], p[1] - S.c[1], p[2] - S.c[2]];
  return Math.hypot(q[0] / (S.r - margin), q[1] / (S.ry - margin), q[2] / (S.r - margin)) <= 1;
}

describe("the gap between two stand-in shapes", () => {
  it("finds the two overlaps the earlier predicate missed (review 2, F2)", () => {
    // two flattened spheres side by side: 0.10 m into each other, reported +0.20 m before
    const flats = gap({ c: [0, 0, 0], r: 0.45, ry: 0.15 }, { c: [0.8, 0, 0], r: 0.45, ry: 0.15 });
    expect(flats.g).toBeLessThan(-TOL);
    expect(flats.g).toBeCloseTo(-0.1, 3);
    // a ball resting 0.03 m into the top of a flattened sphere, reported +0.141 m before
    const ball = gap(
      { a: [0, 0.25, 0], b: [0, 0.25, 0], r: 0.1 },
      { c: [0, 0, 0], r: 0.62, ry: 0.18 },
    );
    expect(ball.g).toBeLessThan(-TOL);
    expect(ball.g).toBeCloseTo(-0.03, 3);
    // the same whichever shape comes first, and with the early exit the checker uses
    const swapped = gap(
      { c: [0, 0, 0], r: 0.62, ry: 0.18 },
      { a: [0, 0.25, 0], b: [0, 0.25, 0], r: 0.1 },
      -TOL,
    );
    expect(swapped.g).toBeLessThan(-TOL);
  });

  it("is exact for balls and for capsules", () => {
    const a = { c: [0, 0, 0], r: 0.5, ry: 0.5 };
    expect(gap(a, { c: [1.3, 0, 0], r: 0.5, ry: 0.5 }).g).toBeCloseTo(0.3, 4);
    expect(gap(a, { c: [0.6, 0.6, 0.3], r: 0.5, ry: 0.5 }).g).toBeCloseTo(-0.1, 4);
    expect(gap(a, { a: [1, -1, 0], b: [1, 1, 0], r: 0.2 }).g).toBeCloseTo(0.3, 4);
    expect(gap(a, { a: [0.6, -1, 0], b: [0.6, 1, 0], r: 0.2 }).g).toBeCloseTo(-0.1, 4);
    expect(
      gap({ a: [0, 0, 0], b: [1, 0, 0], r: 0.1 }, { a: [0.5, 0.15, -1], b: [0.5, 0.15, 1], r: 0.1 })
        .g,
    ).toBeCloseTo(-0.05, 9);
  });

  it("handles a tilted ellipsoid", () => {
    // a 0.4 x 0.1 x 0.2 ellipsoid turned a quarter turn about z: its long axis is now upright
    const tilted = {
      c: [0, 0, 0],
      ax: [
        [0, 0.4, 0],
        [-0.1, 0, 0],
        [0, 0, 0.2],
      ],
    };
    expect(gap(tilted, { a: [0, 0.6, 0], b: [0, 0.6, 0], r: 0.1 }).g).toBeCloseTo(0.1, 4);
    expect(gap(tilted, { a: [0.15, 0, 0], b: [0.15, 0, 0], r: 0.1 }).g).toBeCloseTo(-0.05, 4);
    expect(box(tilted)).toEqual([-0.1, -0.4, -0.2, 0.1, 0.4, 0.2]);
  });

  it("never reports a pair clear when a point of one lies well inside the other, and stays close to the true distance when they are apart", () => {
    const rand = rng(20261118);
    const shape = () => {
      const c = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
      if (rand() < 0.5) return { c, r: 0.15 + rand() * 0.6, ry: 0.08 + rand() * 0.5 };
      const d = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
      return { a: c, b: [c[0] + d[0], c[1] + d[1], c[2] + d[2]], r: 0.03 + rand() * 0.2 };
    };
    let overlapping = 0;
    let apart = 0;
    for (let i = 0; i < 1500; i++) {
      const A = shape();
      const B = shape();
      if (!A.c && !B.c) continue;
      const g = gap(A, B).g;
      const quick = gap(A, B, -TOL).g;
      const pa = surface(A);
      const pb = surface(B);
      // a surface point of one, more than the tolerance inside the other: an overlap to report
      const deep =
        pa.some((p) => inside(B, p, TOL * 1.5)) || pb.some((p) => inside(A, p, TOL * 1.5));
      if (deep) {
        overlapping++;
        expect(g).toBeLessThan(-TOL);
        expect(quick).toBeLessThan(-TOL);
      }
      // the gap is never more than the distance between any two points of the two surfaces
      let nearest = Infinity;
      for (const p of pa)
        for (const q of pb)
          nearest = Math.min(nearest, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
      expect(g).toBeLessThanOrEqual(nearest + 1e-9);
      if (g > 0.05) {
        apart++;
        // and not far under it (the sampled points are up to about 0.1 m apart on the largest shapes)
        expect(g).toBeGreaterThan(nearest - 0.15);
      }
      if (pa.some((p) => inside(B, p)) || pb.some((p) => inside(A, p)))
        expect(g).toBeLessThan(1e-9);
    }
    expect(overlapping).toBeGreaterThan(100);
    expect(apart).toBeGreaterThan(100);
  }, 30_000);
});

describe("the depth of a shape under the ground", () => {
  it("measures a ball and a flattened sphere on flat ground", () => {
    const flat = () => 1;
    expect(overGround({ a: [0, 1.5, 0], b: [0, 1.5, 0], r: 0.2 }, flat).g).toBeCloseTo(0.3, 3);
    expect(overGround({ c: [0, 1.1, 0], r: 0.6, ry: 0.15 }, flat).g).toBeCloseTo(-0.05, 3);
  });

  it("sees a slope that the height under the centre alone would miss", () => {
    // ground rising 1 for 1 along x: a ball whose centre is 0.25 over it is 0.25/sqrt(2) = 0.177 from it
    const slope = (x) => x;
    const h = overGround({ a: [0, 0.25, 0], b: [0, 0.25, 0], r: 0.2 }, slope);
    expect(h.g).toBeLessThan(-TOL);
    // straight down, the depth is never less than across the slope (0.2 - 0.177 = 0.023)
    expect(-h.g).toBeGreaterThanOrEqual(0.023);
  });
});
