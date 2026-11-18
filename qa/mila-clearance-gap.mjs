// Geometry of the clearance check of Mila's tale (qa/mila-clearance.mjs): the signed gap between two
// stand-in shapes and the depth of a shape under the ground. One self-contained function, so that
// the same code runs in the page (passed as source) and in its test (qa/mila-clearance-gap.test.mjs).
//
// Shapes (metres, world frame):
//   capsule   { a, b, r }        every point within r of the segment a-b (a ball when a = b)
//   ellipsoid { c, r, ry }       centre c, radius r in the horizontal, half-height ry
//   ellipsoid { c, ax: [u,v,w] } centre c, three perpendicular half-axes as vectors
//
// Soundness. For a direction n, `along(A, B, n)` is the width of the slab that separates the two
// shapes across n (negative: how far B has to be moved along n to be clear of A). The true signed
// gap is the largest of these over every direction, so whatever direction is tried, the value found
// is never above the true gap: an overlap is never reported shallower than it is, and never missed.
// The search only decides how tight the figure is (how few false alarms), not whether it is safe.

/** Builds the geometry helpers (no outer references: this function is also sent to the page as text). */
export function clearanceGeometry() {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mix = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  const unit = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return l > 1e-12 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
  };
  const cl = (x) => Math.min(1, Math.max(0, x));

  /** Directions spread evenly over the sphere. */
  function sphere(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const s = Math.sqrt(1 - y * y);
      const a = i * 2.399963229728653;
      out.push([Math.cos(a) * s, y, Math.sin(a) * s]);
    }
    return out;
  }
  const TRIES = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
    ...sphere(60),
  ];
  const SURFACE = sphere(160);

  /** The three half-axes of an ellipsoid, as vectors. */
  const axes = (S) =>
    S.ax ?? [
      [S.r, 0, 0],
      [0, S.ry, 0],
      [0, 0, S.r],
    ];

  /** How far a shape reaches along the direction n (`h`), and its point that reaches there (`p`). */
  function support(S, n) {
    if (S.c) {
      const A = axes(S);
      const k = [dot(A[0], n), dot(A[1], n), dot(A[2], n)];
      const l = Math.hypot(k[0], k[1], k[2]);
      if (l < 1e-12) return { h: dot(S.c, n), p: S.c };
      return {
        h: dot(S.c, n) + l,
        p: [0, 1, 2].map((i) => S.c[i] + (A[0][i] * k[0] + A[1][i] * k[1] + A[2][i] * k[2]) / l),
      };
    }
    const e = dot(S.a, n) >= dot(S.b, n) ? S.a : S.b;
    return { h: dot(e, n) + S.r, p: [e[0] + n[0] * S.r, e[1] + n[1] * S.r, e[2] + n[2] * S.r] };
  }

  /** Width of the slab between A and B across the unit direction n (from A towards B); negative: overlap. */
  function along(A, B, n) {
    const a = support(A, n);
    const b = support(B, [-n[0], -n[1], -n[2]]);
    return { g: -b.h - a.h, at: mix(a.p, b.p, 0.5) };
  }

  /** Closest points of two segments: distance and the point between them. */
  function segSeg(p1, q1, p2, q2) {
    const d1 = sub(q1, p1);
    const d2 = sub(q2, p2);
    const r = sub(p1, p2);
    const a = dot(d1, d1);
    const e = dot(d2, d2);
    const f = dot(d2, r);
    let s = 0;
    let t = 0;
    if (a <= 1e-12 && e <= 1e-12) {
      /* two points */
    } else if (a <= 1e-12) t = cl(f / e);
    else {
      const c = dot(d1, r);
      if (e <= 1e-12) s = cl(-c / a);
      else {
        const b = dot(d1, d2);
        const den = a * e - b * b;
        s = den > 1e-12 ? cl((b * f - c * e) / den) : 0;
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = cl(-c / a);
        } else if (t > 1) {
          t = 1;
          s = cl((b - c) / a);
        }
      }
    }
    const c1 = mix(p1, q1, s);
    const c2 = mix(p2, q2, t);
    const d = sub(c1, c2);
    return { d: Math.hypot(d[0], d[1], d[2]), at: mix(c1, c2, 0.5) };
  }

  /** Climbs from the direction n to a direction where the slab between A and B is wider. */
  function climb(A, B, n, best, enough) {
    let step = 0.3;
    for (let i = 0; i < 400 && step > 1e-4 && best.g < enough; i++) {
      const t1 = unit(
        Math.abs(n[1]) < 0.9 ? [n[2], 0, -n[0]] : [0, n[2], -n[1]], // any direction across n
      );
      const t2 = [
        n[1] * t1[2] - n[2] * t1[1],
        n[2] * t1[0] - n[0] * t1[2],
        n[0] * t1[1] - n[1] * t1[0],
      ];
      let better = null;
      let dir = n;
      for (const [u, v] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [0.7, 0.7],
        [-0.7, 0.7],
        [0.7, -0.7],
        [-0.7, -0.7],
      ]) {
        const m = unit([
          n[0] + step * (u * t1[0] + v * t2[0]),
          n[1] + step * (u * t1[1] + v * t2[1]),
          n[2] + step * (u * t1[2] + v * t2[2]),
        ]);
        const h = along(A, B, m);
        if (h.g > (better ?? best).g + 1e-9) {
          better = h;
          dir = m;
        }
      }
      if (better) {
        best = better;
        n = dir;
      } else step *= 0.5;
    }
    return best;
  }

  /**
   * Signed gap between two shapes (negative: overlap, by that many metres), never above the true
   * one, and the place of the contact. The search stops as soon as the gap is known to be at least
   * `enough` (the caller only cares whether it is under that).
   */
  function gap(A, B, enough = Infinity) {
    if (!A.c && !B.c) {
      const h = segSeg(A.a, A.b, B.a, B.b);
      return { g: h.d - A.r - B.r, at: h.at };
    }
    const mid = (S) => S.c ?? mix(S.a, S.b, 0.5);
    const firsts = [unit(sub(mid(B), mid(A)))];
    for (const [S, O, sign] of [
      [A, B, 1],
      [B, A, -1],
    ])
      if (!S.c) {
        // from the point of a capsule's axis nearest to the other shape's centre
        const d = sub(S.b, S.a);
        const l2 = dot(d, d);
        const t = l2 > 1e-12 ? cl(dot(sub(mid(O), S.a), d) / l2) : 0;
        const v = sub(mid(O), mix(S.a, S.b, t));
        firsts.push(unit([v[0] * sign, v[1] * sign, v[2] * sign]));
      }
    let best = { g: -Infinity, at: mid(A) };
    const tried = [];
    for (const n of [...firsts, ...TRIES]) {
      const h = along(A, B, n);
      tried.push({ n, g: h.g });
      if (h.g > best.g) best = h;
      if (best.g >= enough) return best;
    }
    tried.sort((p, q) => q.g - p.g);
    for (const t of tried.slice(0, 4)) {
      best = climb(A, B, t.n, best.g >= t.g ? best : along(A, B, t.n), enough);
      if (best.g >= enough) return best;
    }
    return best;
  }

  /** Points on the surface of a shape (160 directions; at both ends and the middle of a capsule). */
  function surface(S) {
    const out = [];
    if (S.c) {
      const A = axes(S);
      for (const u of SURFACE)
        out.push([0, 1, 2].map((i) => S.c[i] + A[0][i] * u[0] + A[1][i] * u[1] + A[2][i] * u[2]));
    } else
      for (const t of S.a === S.b ? [0] : [0, 0.5, 1]) {
        const p = mix(S.a, S.b, t);
        for (const u of SURFACE)
          out.push([p[0] + u[0] * S.r, p[1] + u[1] * S.r, p[2] + u[2] * S.r]);
      }
    return out;
  }

  /**
   * How far a shape is from the ground under it: the smallest height of its sampled surface points
   * over `groundH(x, z)` (negative: under the ground, measured straight down, which is never less
   * than the depth across the slope).
   */
  function overGround(S, groundH) {
    let g = Infinity;
    let at = null;
    // its lowest point first, so that flat ground is measured exactly
    for (const p of [support(S, [0, -1, 0]).p, ...surface(S)]) {
      const h = p[1] - groundH(p[0], p[2]);
      if (h < g) {
        g = h;
        at = p;
      }
    }
    return { g, at };
  }

  /** The box around a shape: [minX, minY, minZ, maxX, maxY, maxZ]. */
  function box(S) {
    if (S.c) {
      const A = axes(S);
      const e = [0, 1, 2].map((i) => Math.hypot(A[0][i], A[1][i], A[2][i]));
      return [
        S.c[0] - e[0],
        S.c[1] - e[1],
        S.c[2] - e[2],
        S.c[0] + e[0],
        S.c[1] + e[1],
        S.c[2] + e[2],
      ];
    }
    return [
      Math.min(S.a[0], S.b[0]) - S.r,
      Math.min(S.a[1], S.b[1]) - S.r,
      Math.min(S.a[2], S.b[2]) - S.r,
      Math.max(S.a[0], S.b[0]) + S.r,
      Math.max(S.a[1], S.b[1]) + S.r,
      Math.max(S.a[2], S.b[2]) + S.r,
    ];
  }

  return { gap, along, overGround, surface, box, support };
}
