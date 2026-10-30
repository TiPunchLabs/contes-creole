// @vitest-environment happy-dom
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createRng } from "@shared/random";
import { scaleCount } from "../lite";
import { createLandscape } from "./landscape";
import { createSky } from "./sky";
import { createLightTree } from "./tree";

/** Rounds to 1e-4 so the sample survives float noise but not a moved object. */
const r = (n: number): number => Math.round(n * 1e4) / 1e4;
const v = (p: THREE.Vector3): number[] => [r(p.x), r(p.y), r(p.z)];

/** Object count and summed position + scale of a subtree: any moved or added object changes it. */
function digest(group: THREE.Object3D): { objects: number; sum: number[] } {
  let objects = 0;
  const sum = new THREE.Vector3();
  group.traverse((o) => {
    objects++;
    sum.add(o.position).add(o.scale);
  });
  return { objects, sum: v(sum) };
}

/** Builds the tree universe's scene in the v13 order (index.ts) and samples its layout. */
function sample(lite: boolean): unknown {
  const count = (n: number): number => scaleCount(n, lite);
  const rng = createRng(11);
  const landscape = createLandscape(rng, count);
  const tree = createLightTree(rng, { lite, count });
  const sky = createSky(rng, count);
  const next = rng();
  const flora = landscape.group.children.filter((o) => o.type === "Group");
  const hills = landscape.group.children.filter(
    (o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.SphereGeometry,
  );
  const fireflies = sky.group.children.find((o) => o instanceof THREE.Points) as THREE.Points;
  const ff = fireflies.geometry.attributes.position;
  const sprites = sky.group.children.filter((o) => o instanceof THREE.Sprite);
  return {
    next: r(next),
    tips: {
      count: tree.tips.length,
      first: tree.tips.slice(0, 3).map(v),
      last: v(tree.tips[tree.tips.length - 1]),
    },
    flora: { count: flora.length, first: flora.slice(0, 4).map((g) => v(g.position)) },
    hills: {
      count: hills.length,
      first: hills.slice(0, 2).map((m) => [...v(m.position), ...v(m.scale)]),
    },
    fireflies: {
      count: ff.count,
      first: [0, 1].map((i) => [r(ff.getX(i)), r(ff.getY(i)), r(ff.getZ(i))]),
    },
    mists: sprites.slice(2, 4).map((s) => v(s.position)),
    digest: {
      landscape: digest(landscape.group),
      tree: digest(tree.group),
      sky: digest(sky.group),
    },
  };
}

// Expected values were recorded from the scene before the M5 re-grade (commit 23f8735). A colour,
// intensity or uniform change must keep them; a new rng() call, a reordered builder or a changed
// count() moves them. Never regenerate them to make a visual change pass.
// Owner-requested exceptions (2026-10-30): a palm and a tree fern moved off the near cards' lines of
// sight (fixed positions, no rng; see occlusion.test.ts) and the hollow on the trunk removed (four
// objects). Random draws (next, tips, hills, fireflies) are unchanged.
const FULL = {
  next: 0.4855,
  tips: {
    count: 301,
    first: [
      [-1.8622, 11.8293, -1.3068],
      [-2.1619, 11.7452, -1.0101],
      [-2.4288, 11.7869, -1.9013],
    ],
    last: [2.1002, 10.1399, -0.9454],
  },
  flora: {
    count: 22,
    first: [
      [-9.5, -0.5589, -10],
      [12.2, -0.4942, -5.8],
      [-28, -0.949, 22],
      [30, -0.4766, 8],
    ],
  },
  hills: {
    count: 16,
    first: [
      [55.5975, -2, 27.4394, 33.5387, 18.0394, 22.9492],
      [34.7439, -2, 51.3504, 26.4918, 9.3579, 24.6295],
    ],
  },
  fireflies: {
    count: 340,
    first: [
      [15.2818, 5.3253, -2.7959],
      [-10.9888, 3.0912, 11.1015],
    ],
  },
  mists: [
    [-13.7936, 0.9513, -17.7935],
    [7.9262, 1.1371, -12.8755],
  ],
  digest: {
    landscape: { objects: 388, sum: [713.8192, 834.1137, 789.9735] },
    tree: { objects: 5, sum: [5, 5, 5] },
    sky: { objects: 18, sum: [168.5138, 343.1593, 227.6373] },
  },
};
const LITE = {
  next: 0.5875,
  tips: {
    count: 266,
    first: [
      [0.8434, 11.0323, -5.0447],
      [1.1097, 10.9692, -4.8911],
      [0.3328, 11.1652, -5.1801],
    ],
    last: [-0.8705, 10.4157, 0.8771],
  },
  flora: {
    count: 22,
    first: [
      [-9.5, -0.5589, -10],
      [12.2, -0.4942, -5.8],
      [-28, -0.949, 22],
      [30, -0.4766, 8],
    ],
  },
  hills: {
    count: 16,
    first: [
      [55.5975, -2, 27.4394, 33.5387, 18.0394, 22.9492],
      [34.7439, -2, 51.3504, 26.4918, 9.3579, 24.6295],
    ],
  },
  fireflies: {
    count: 153,
    first: [
      [-12.6481, 11.2064, -4.6818],
      [1.0071, 12.3737, 3.4217],
    ],
  },
  mists: [
    [-14.4939, 0.6131, -19.7806],
    [3.1591, 1.1061, 19.8227],
  ],
  digest: {
    landscape: { objects: 388, sum: [713.8192, 834.1137, 789.9735] },
    tree: { objects: 5, sum: [5, 5, 5] },
    sky: { objects: 11, sum: [39.6977, 200.5959, 242.3065] },
  },
};

describe("tree layout guard (createRng(11))", () => {
  it("keeps the full-mode layout of the v13 random order", () => {
    expect(sample(false)).toEqual(FULL);
  });

  it("keeps the lite-mode layout of the v13 random order", () => {
    expect(sample(true)).toEqual(LITE);
  });
});
