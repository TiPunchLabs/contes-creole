import * as THREE from "three";
import { clamp, lerp } from "@shared/math";
import { smooth } from "@shared/mila/noise";
import type { KeyName } from "./keys";
import { restPose, type Pose } from "./puppet";

/** Where the hero calabash can be: on its branch, in Mila's hands, on her bedside table. */
export type Anchor = "branch" | "carry" | "table";

/** How a figure carries a fruit: its centre in her body space (x to her left, z forward). */
export interface Carry {
  side: number;
  height: number;
  forward: number;
}

/**
 * The whole state of the tale at one instant of one page. A page's timeline fills it from the
 * page's own clock only, so any page can be entered directly, left and entered again.
 */
export interface Frame {
  keyFrom: KeyName;
  keyTo: KeyName;
  keyMix: number;
  mila: Pose;
  ninon: Pose;
  /** Hero calabash: it sits at `from`, moves to `to` as `k` goes 0 → 1; never two of it. */
  gourd: { from: Anchor; to: Anchor; k: number; glow: number };
  /** Mila's hands on the hero calabash (0 free, 1 holding). */
  hold: number;
  carry: Carry;
  /** Bend of the low branches (0 at rest, 1 offering the fruit). */
  branchA: number;
  branchB: number;
  /** The fruit the tree gives at dawn: 0 on branch B, 1 in Man Ninon's hands; her hands on it. */
  gift: { k: number; hold: number };
  /** Bedroom shutters: 0 closed, 1 open. */
  shutters: number;
  /** Calabashes in the branches: share that is lit, and their look (0 green, 1 lit gold). */
  lit: number;
  gold: number;
  /** Share of the stars that shine. */
  stars: number;
  /** The light running up the trunk (page 11). */
  treeGlow: number;
  /** Man Ninon's lantern (0 absent, else its brightness). */
  lamp: number;
  /** Rooster clips, as progress 0..1 (−1 when not playing). */
  stir: number;
  crow: number;
  /** Sparks dancing on the calabash's shell (page 5). */
  sparks: number;
  breakfast: boolean;
}

/** Fixed places of the garden the timelines refer to (the world measures them once at mount). */
export interface Places {
  /** Centre of the hero calabash when branch A offers it, and of the gift when branch B does. */
  giveA: THREE.Vector3;
  giveB: THREE.Vector3;
  /** Floor height of Mila's house. */
  floor: number;
  /** Mila's house local point (x along the façade, z out of it) to world x, z. */
  house(x: number, z: number): [number, number];
  /** Heading of the façade's outward normal. */
  houseYaw: number;
  /** Where the page-9 root crosses the path, as distance along `P9`. */
  root: [number, number];
}

/** Creates a frame; `resetFrame` gives it the tale's resting state. */
export function createFrame(): Frame {
  return resetFrame({ mila: restPose(), ninon: restPose() } as Frame);
}

/** Puts a frame back to the resting state every page starts from. */
export function resetFrame(f: Frame): Frame {
  f.keyFrom = "night";
  f.keyTo = "night";
  f.keyMix = 0;
  Object.assign(f.mila, restPose());
  Object.assign(f.ninon, restPose(), { visible: false });
  f.gourd = { from: "branch", to: "branch", k: 0, glow: 1 };
  f.hold = 0;
  f.carry = { side: 0, height: 0.85, forward: 0.24 };
  f.branchA = 0;
  f.branchB = 0;
  f.gift = { k: 0, hold: 0 };
  f.shutters = 1;
  f.lit = 1;
  f.gold = 1;
  f.stars = 1;
  f.treeGlow = 0;
  f.lamp = 0;
  f.stir = -1;
  f.crow = -1;
  f.sparks = 0;
  f.breakfast = false;
  return f;
}

/** Smooth 0 → 1 between two instants. */
const ramp = (t: number, a: number, b: number): number => smooth(a, b, t);
/** 0 → 1 → 0: up over [a, b], down over [c, d]. */
const pulse = (t: number, a: number, b: number, c: number, d: number): number =>
  smooth(a, b, t) * (1 - smooth(c, d, t));

/** A walked line through points (x, z): position and heading at a distance along it. */
export interface Route {
  length: number;
  at(d: number): { x: number; z: number; yaw: number };
}

/** Builds a route; headings turn smoothly at its corners. */
export function route(points: readonly (readonly [number, number])[]): Route {
  const lengths: number[] = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(l);
    length += l;
  }
  const yawOf = (i: number): number =>
    Math.atan2(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  return {
    length,
    at(d) {
      let rest = clamp(d, 0, length);
      let i = 0;
      while (i < lengths.length - 1 && rest > lengths[i]) rest -= lengths[i++];
      const u = lengths[i] > 0 ? rest / lengths[i] : 0;
      let yaw = yawOf(i);
      // Ease the heading into the next leg over the last 0.35 m of this one.
      if (i < lengths.length - 1) {
        const k = smooth(lengths[i] - 0.35, lengths[i] + 0.35, rest) * 0.5;
        yaw = turn(yaw, yawOf(i + 1), k * 2 > 1 ? 1 : k * 2);
      }
      return {
        x: lerp(points[i][0], points[i + 1][0], u),
        z: lerp(points[i][1], points[i + 1][1], u),
        yaw,
      };
    },
  };
}

/** Interpolates two headings the short way round. */
export function turn(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

/** Constant pace with a gentle start and stop (the underwater tale's `walkEase`). */
function pace(k: number): number {
  const a = 0.2;
  if (k < a) return (k * k) / (2 * a * (1 - a));
  if (k > 1 - a) return 1 - ((1 - k) * (1 - k)) / (2 * a * (1 - a));
  return (k - a / 2) / (1 - a);
}

/** Walks a figure along `r` between two instants; outside them she stands at an end. */
function stroll(
  p: Pose,
  r: Route,
  t: number,
  t0: number,
  t1: number,
  from = 0,
  to = r.length,
): void {
  const u = clamp((t - t0) / (t1 - t0), 0, 1);
  const d = lerp(from, to, pace(u));
  const here = r.at(d);
  p.x = here.x;
  p.z = here.z;
  p.yaw = here.yaw;
  p.walked = d;
  p.gait = smooth(0, 0.12, u) * (1 - smooth(0.88, 1, u));
}

/** Stands a figure at a point, facing a heading. */
function stand(p: Pose, x: number, z: number, yaw: number, y = 0): void {
  p.x = x;
  p.y = y;
  p.z = z;
  p.yaw = yaw;
}

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
/** Heading from one point towards another. */
const facing = (x: number, z: number, tx: number, tz: number): number => Math.atan2(tx - x, tz - z);

// Routes of the garden (x, z), all on the stepping-stone path of the master layout.
const P1_COME = route([
  [4.7, 1.7],
  [6.75, 1.6],
]);
const P1_GO = route([
  [6.75, 1.6],
  [5.4, 1.68],
  [4.5, 1.7],
]);
const P2 = route([
  [1.7, 1.5],
  [-0.7, 0.95],
  [-1.55, 0.05],
]);
const P4_MILA = route([
  [7.15, 1.75],
  [8.3, 1.8],
  [9.6, 1.45],
  [10.55, 0.75],
]);
const P4_NINON = route([
  [8.35, 1.2],
  [9.9, 0.75],
  [11.05, -0.05],
]);
const P5_COME = route([
  [2.5, 1.6],
  [0.75, 1.45],
]);
const P5_GO = route([
  [0.75, 1.45],
  [-0.6, 1.0],
  [-1.5, 0.3],
]);
export const P9 = route([
  [-0.7, 1.0],
  [0.5, 1.28],
  [1.2, 1.45],
  [2.4, 1.66],
]);
const P10_NINON = route([
  [7.3, 1.6],
  [4.75, 1.72],
]);
const P10_BACK_MILA = route([
  [3.5, 1.65],
  [2.3, 1.58],
]);
const P10_BACK_NINON = route([
  [4.75, 1.72],
  [3.5, 1.95],
]);

export interface PageScript {
  /** Length of the page's action in seconds; after it the scene holds its last state. */
  seconds: number;
  run(t: number, f: Frame, at: Places): void;
}

/** Mila's standing spot under branch A, facing the fruit (pages 3 and 11). */
function underBranchA(f: Frame, at: Places): void {
  stand(f.mila, at.giveA.x - 0.34, at.giveA.z, EAST);
}

/** The carry that puts the fruit exactly where the bent branch holds it. */
const OFFER: Carry = { side: 0, height: 1.0, forward: 0.34 };

/** The twelve pages, in reading order. */
export const PAGES: Record<string, PageScript> = {
  // Dusk at the gate: Man Ninon hesitates, Mila comes, promises a light and sets off for the tree.
  p01: {
    seconds: 10,
    run(t, f) {
      f.keyFrom = f.keyTo = "dusk";
      f.lit = 0.14;
      f.stars = 0.08;
      f.ninon.visible = true;
      stand(f.ninon, 8.5, 1.9, turn(1.9, WEST + 0.25, ramp(t, 3, 4.4)));
      f.ninon.headYaw = pulse(t, 0.3, 1.2, 1.8, 2.8) * 0.5 - pulse(t, 1.8, 2.8, 3.2, 4) * 0.3;
      f.ninon.headPitch = 0.12 + 0.1 * ramp(t, 3.4, 4.6);
      if (t < 6.4) {
        stroll(f.mila, P1_COME, t, 0.4, 3.6);
        f.mila.headPitch = -0.2 * ramp(t, 2.6, 3.8);
        // "Attendez-moi": an open hand raised towards her.
        const wave = pulse(t, 4.2, 5, 5.8, 6.4);
        if (wave > 0.01) {
          const here = new THREE.Vector3(f.mila.x + 0.24, lerp(0.7, 1.02, wave), f.mila.z - 0.13);
          f.mila.right = { at: here, face: new THREE.Vector3(8.5, 1.3, 1.9), up: [0, 1, 0.2] };
        }
      } else {
        stroll(f.mila, P1_GO, t, 6.4, 10);
        f.mila.yaw = turn(EAST, f.mila.yaw, ramp(t, 6.4, 7.2));
      }
    },
  },
  // The tree at nightfall: Mila walks under it while its calabashes light up one group at a time.
  p02: {
    seconds: 9,
    run(t, f) {
      f.keyFrom = "dusk";
      f.keyTo = "night";
      f.keyMix = ramp(t, 1, 7.5);
      f.lit = lerp(0.14, 1, ramp(t, 1.5, 7));
      f.stars = lerp(0.08, 1, ramp(t, 3, 8.5));
      stroll(f.mila, P2, t, 0, 5);
      f.mila.yaw = turn(f.mila.yaw, facing(-1.55, 0.05, -0.6, -3), ramp(t, 4.4, 5.6));
      f.mila.headPitch = -0.52 * ramp(t, 3.2, 5.6);
      f.mila.headYaw = 0.25 * pulse(t, 5.8, 6.6, 7.2, 8.2);
    },
  },
  // The promise: branch A bends to her hands, she takes the fruit, the branch goes back up.
  p03: {
    seconds: 11,
    run(t, f, at) {
      underBranchA(f, at);
      const back = 0.45 * ramp(t, 5.6, 8.2);
      f.branchA = ramp(t, 0.6, 3.2) * (1 - back);
      f.hold = ramp(t, 2.6, 3.8);
      const k = ramp(t, 4.4, 5.8);
      f.gourd = { from: "branch", to: "carry", k, glow: 1 };
      // Her hands meet the fruit where the branch holds it, then bring it to her chest.
      f.carry = {
        side: 0,
        height: lerp(OFFER.height, 0.9, ramp(t, 5.8, 7.2)),
        forward: lerp(OFFER.forward, 0.24, ramp(t, 5.8, 7.2)),
      };
      f.mila.headPitch =
        lerp(-0.42, 0.1, ramp(t, 2.2, 3.6)) -
        0.4 * pulse(t, 6.6, 7.6, 8.8, 9.4) +
        0.16 * pulse(t, 9.6, 10, 10.3, 10.8);
    },
  },
  // A light for two: from the gate to Man Ninon's house, at the old lady's pace.
  p04: {
    seconds: 10,
    run(t, f) {
      f.ninon.visible = true;
      f.gourd = { from: "carry", to: "carry", k: 1, glow: 1 };
      f.hold = 1;
      f.carry = { side: 0.1, height: 0.9, forward: 0.22 };
      stroll(f.mila, P4_MILA, t, 2.4, 9.4);
      stroll(f.ninon, P4_NINON, t, 2.6, 9.6);
      f.ninon.yaw = turn(WEST + 0.3, f.ninon.yaw, ramp(t, 1.2, 2.8));
      f.mila.headYaw = 0.35 * (1 - ramp(t, 2, 3.2)) + 0.4 * ramp(t, 8.6, 9.8);
      f.mila.headPitch = -0.22 * (1 - ramp(t, 2, 3.2)) - 0.25 * ramp(t, 8.6, 9.8);
      f.ninon.headYaw = -0.5 * ramp(t, 7.6, 9.4);
      f.ninon.headPitch = 0.22 * ramp(t, 3, 4) * (1 - ramp(t, 7.6, 9)) + 0.2 * ramp(t, 8, 9.6);
    },
  },
  // Just for tonight: she stops, watches the sparks on the shell, glances at the tree, turns home.
  p05: {
    seconds: 10,
    run(t, f) {
      f.gourd = { from: "carry", to: "carry", k: 1, glow: 1 };
      f.hold = 1;
      f.sparks = ramp(t, 2.4, 4);
      if (t < 7.8) {
        stroll(f.mila, P5_COME, t, 0, 2.6);
        f.mila.yaw = turn(f.mila.yaw, WEST + 0.6, ramp(t, 2, 3.2));
        f.carry = { side: 0, height: lerp(0.9, 0.97, ramp(t, 2.4, 3.6)), forward: 0.25 };
        f.mila.headPitch = 0.34 * ramp(t, 2.6, 3.6) - 0.5 * pulse(t, 4.8, 5.6, 6.2, 7);
        f.mila.headYaw = -0.9 * pulse(t, 4.8, 5.6, 6.2, 7);
      } else {
        stroll(f.mila, P5_GO, t, 8.2, 10, 0, 0.55);
        f.mila.yaw = turn(WEST + 0.6, WEST + 0.4, ramp(t, 7.8, 8.8));
        f.carry = { side: 0, height: 0.97, forward: 0.25 };
        f.mila.headPitch = 0.3;
      }
    },
  },
  // Her bedroom: the calabash by the bed, the walls turning gold, the shutters pulled closed.
  p06: {
    seconds: 11,
    run(t, f, at) {
      f.keyFrom = f.keyTo = "inside";
      const yaw = at.houseYaw;
      const side = route([at.house(-1.55, 1.25), at.house(-2.5, 1.1)]);
      const toWindow = route([at.house(-2.5, 1.1), at.house(-2.45, 1.92)]);
      f.mila.y = at.floor;
      if (t < 4.6) {
        stroll(f.mila, side, t, 0, 2);
        f.mila.yaw = turn(f.mila.yaw, yaw + WEST, ramp(t, 1.4, 2.2));
      } else {
        stroll(f.mila, toWindow, t, 4.6, 6.2);
        f.mila.yaw = turn(yaw + WEST, yaw, ramp(t, 4.6, 5.6));
        f.mila.yaw = turn(f.mila.yaw, yaw - 2.1, ramp(t, 9, 10.2));
      }
      f.gourd = { from: "carry", to: "table", k: ramp(t, 2.3, 3.7), glow: 1 };
      f.hold = 1 - ramp(t, 3.5, 4.3);
      f.carry = { side: 0, height: 0.88, forward: lerp(0.24, 0.36, ramp(t, 2, 3)) };
      f.shutters = 1 - ramp(t, 6.9, 8.8);
      f.mila.headPitch = 0.3 * pulse(t, 2, 3, 4, 4.6) + 0.2 * ramp(t, 9.4, 10.4);
      f.stars = 1 - 0.08 * ramp(t, 9.6, 10.6);
    },
  },
  // The night without paths: stars, calabashes, flowers and gate go out, group after group.
  p07: {
    seconds: 10,
    run(t, f) {
      f.keyFrom = "night";
      f.keyTo = "dark";
      f.keyMix = ramp(t, 1, 8.5);
      f.stars = lerp(0.92, 0.1, ramp(t, 0.4, 7));
      f.lit = lerp(1, 0.06, ramp(t, 1.4, 8.6));
      f.mila.visible = false;
      f.shutters = 0;
      // Her little moon trembles behind the closed shutters.
      const tremble = 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 2.3);
      f.gourd = {
        from: "table",
        to: "table",
        k: 1,
        glow: lerp(0.95, 0.4 + 0.25 * tremble, ramp(t, 5, 8.5)),
      };
    },
  },
  // What Mila had kept: she opens the shutters on an emptied night, then takes the calabash back.
  p08: {
    seconds: 12,
    run(t, f, at) {
      f.keyFrom = f.keyTo = "inside";
      f.stars = 0.1;
      f.lit = 0.06;
      const yaw = at.houseYaw;
      const back = route([at.house(-2.45, 1.92), at.house(-2.52, 1.12)]);
      f.mila.y = at.floor;
      stroll(f.mila, back, t, 7.4, 8.9);
      f.mila.yaw = turn(
        turn(yaw, yaw + Math.PI * 0.99, ramp(t, 6.9, 7.8)),
        yaw + WEST,
        ramp(t, 8.2, 9),
      );
      f.shutters = ramp(t, 0.8, 2.8);
      f.mila.lean = 0.16 * pulse(t, 2.8, 3.6, 6.4, 7);
      f.mila.headYaw = -0.6 * pulse(t, 3.2, 4, 4.4, 5) + 0.6 * pulse(t, 4.6, 5.4, 5.8, 6.4);
      f.mila.headPitch = -0.38 * pulse(t, 5.8, 6.4, 6.8, 7.2) + 0.3 * ramp(t, 9, 10);
      const tremble = 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 2.3);
      f.hold = ramp(t, 9, 9.8);
      f.gourd = { from: "table", to: "carry", k: ramp(t, 9.8, 10.9), glow: 0.5 + 0.2 * tremble };
      f.carry = { side: 0, height: 0.86, forward: lerp(0.34, 0.165, ramp(t, 10.2, 11.2)) };
    },
  },
  // One step after another: she trips on the root, holds the fruit against her, goes on slowly.
  p09: {
    seconds: 11,
    run(t, f, at) {
      f.keyFrom = f.keyTo = "dark";
      f.stars = 0.1;
      f.lit = 0.05;
      f.gourd = { from: "carry", to: "carry", k: 1, glow: 0.42 };
      f.hold = 1;
      const [before, after] = at.root;
      if (t < 3.4) stroll(f.mila, P9, t, 0, 3.4, 0, before);
      else if (t < 4.4) stroll(f.mila, P9, t, 3.4, 4.4, before, after);
      else stroll(f.mila, P9, t, 5.8, 10.6, after, after + 0.85);
      // The foot catches: she pitches forward, bends, and draws the calabash in.
      const trip = pulse(t, 3.3, 3.75, 4.3, 5.4);
      f.mila.lean = 0.5 * trip;
      f.mila.crouch = 0.38 * trip;
      f.mila.gait = Math.max(f.mila.gait, t > 3.3 && t < 4.4 ? 1 : 0);
      f.carry = {
        side: 0,
        height: lerp(0.84, 0.78, trip),
        forward: lerp(0.2, 0.15, ramp(t, 3.3, 4)),
      };
      f.mila.headPitch = 0.3 + 0.2 * trip;
    },
  },
  // The light given back: Man Ninon comes from the gate with her lamp, and they turn to the tree.
  p10: {
    seconds: 11.5,
    run(t, f) {
      f.keyFrom = f.keyTo = "dark";
      f.stars = 0.1;
      f.lit = 0.05;
      f.ninon.visible = true;
      f.lamp = 1;
      f.gourd = { from: "carry", to: "carry", k: 1, glow: 0.42 };
      f.hold = 1;
      f.carry = { side: 0, height: 0.84, forward: 0.17 };
      if (t < 8.6) {
        stand(f.mila, 3.5, 1.65, EAST);
        stroll(f.ninon, P10_NINON, t, 0.6, 5);
        f.mila.headPitch = lerp(0.3, -0.2, ramp(t, 1.4, 2.6)) + 0.5 * pulse(t, 5.8, 6.6, 7.4, 8.2);
        f.ninon.headPitch = 0.22 * ramp(t, 4, 5.2);
      } else {
        stroll(f.mila, P10_BACK_MILA, t, 9, 11.5);
        f.mila.yaw = turn(EAST, f.mila.yaw, ramp(t, 8.6, 9.6));
        stroll(f.ninon, P10_BACK_NINON, t, 9.3, 11.5);
        f.ninon.yaw = turn(WEST, f.ninon.yaw, ramp(t, 9.3, 9.8));
        f.ninon.headPitch = 0.15;
      }
    },
  },
  // Before the rooster crows: the fruit goes back, light runs up the trunk and out to the stars.
  p11: {
    seconds: 14,
    run(t, f, at) {
      f.keyFrom = "dark";
      f.keyTo = "night";
      f.keyMix = ramp(t, 7.4, 10.5);
      underBranchA(f, at);
      f.ninon.visible = true;
      f.lamp = 1 - 0.5 * ramp(t, 8, 10);
      stand(f.ninon, at.giveA.x - 1.2, at.giveA.z + 1.0, facing(-1.2, 1.0, 0.5, 0));
      f.ninon.headPitch = -0.3 * ramp(t, 7, 9);
      f.stir = t > 0.3 && t < 1.8 ? (t - 0.3) / 1.5 : -1;
      f.crow = t > 11.6 ? clamp((t - 11.6) / 2.4, 0, 1) : -1;
      const up = ramp(t, 6.8, 9.2);
      f.branchA = ramp(t, 2.4, 5) * (1 - up);
      const k = ramp(t, 5, 6.2);
      f.gourd = { from: "carry", to: "branch", k, glow: lerp(0.42, 1, ramp(t, 6, 7.2)) };
      f.hold = 1 - ramp(t, 6.2, 7);
      f.carry = {
        side: 0,
        height: lerp(0.86, OFFER.height, ramp(t, 1.4, 3)),
        forward: lerp(0.17, OFFER.forward, ramp(t, 1.4, 3)),
      };
      f.treeGlow = pulse(t, 6.8, 7.8, 9, 10.5);
      f.lit = lerp(0.05, 1, ramp(t, 7.6, 10));
      f.stars = lerp(0.1, 1, ramp(t, 9, 11.6));
      f.mila.headPitch = lerp(0.2, -0.1, ramp(t, 1.4, 3)) - 0.42 * ramp(t, 6.6, 8.6);
    },
  },
  // What stays in the hands: at dawn the tree lowers a green calabash to Man Ninon.
  p12: {
    seconds: 13,
    run(t, f, at) {
      f.keyFrom = f.keyTo = "dawn";
      f.gold = 0;
      f.lit = 0;
      f.stars = 0;
      f.breakfast = true;
      f.gourd = { from: "branch", to: "branch", k: 1, glow: 0 };
      f.ninon.visible = true;
      const nx = at.giveB.x - 0.47;
      const nz = at.giveB.z;
      const mx = nx - 0.25;
      const mz = nz + 0.8;
      const up = ramp(t, 5.4, 7.8);
      f.branchB = ramp(t, 0.8, 3.4) * (1 - up);
      f.gift = { k: ramp(t, 4.4, 5.6), hold: ramp(t, 2.8, 4) };
      if (t < 9.4) {
        stand(f.ninon, nx, nz, turn(EAST, EAST + 1.15, ramp(t, 6.6, 8)));
        stand(f.mila, mx, mz, facing(mx, mz, at.giveB.x, at.giveB.z) + 0.2 * ramp(t, 6.6, 8));
        f.ninon.headPitch = lerp(-0.32, 0.12, ramp(t, 2.4, 3.6)) + 0.1 * ramp(t, 7, 8);
        f.mila.headPitch = -0.3 + 0.12 * ramp(t, 7, 8);
        f.mila.headYaw = 0.4 * ramp(t, 7, 8.2);
      } else {
        const west = facing(nx, nz, -3, -2.6);
        const ninon = route([
          [nx, nz],
          [nx - 1.9, nz - 0.25],
        ]);
        const mila = route([
          [mx, mz],
          [mx - 2.1, mz - 0.5],
        ]);
        stroll(f.ninon, ninon, t, 9.6, 13);
        f.ninon.yaw = turn(EAST + 1.15, west, ramp(t, 9.2, 10.2));
        stroll(f.mila, mila, t, 9.4, 12.8);
        f.mila.headYaw = -0.3;
        f.mila.headPitch = -0.2;
      }
    },
  },
};
