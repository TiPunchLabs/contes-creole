import { clamp } from "@shared/math";
import type { Rng } from "@shared/random";

/** Circular obstacle on the ground plane: centre x, centre z, radius. */
export type Obstacle = readonly [x: number, z: number, r: number];

export type CritterName = "lapen" | "zanba";

export interface CritterState {
  name: CritterName;
  /** Footprint radius. */
  r: number;
  /** Cruising speed, units per second. */
  speed: number;
  /** How the critter gets about: Lapen hops, Zanba walks. */
  gait: "hop" | "walk";
  /** Gait rate: radians of `phase` per second for a hop, per metre walked for a walk. */
  step: number;
  /** How fast the speed and the heading follow what the critter wants (1 / s). */
  accel: number;
  turn: number;
  /** Fastest the heading may change, radians per second: nobody snaps round. */
  spin: number;
  /** Seconds spent on the current walk; a walk that drags on is dropped. */
  since: number;
  /** Current speed. */
  v: number;
  pos: [number, number];
  yaw: number;
  /** Seconds left before picking a new target. */
  wait: number;
  tgt: [number, number] | null;
  /** 0 = standing, 1 = at cruising speed. */
  moving: number;
  /** Gait cycle: one hop per 2π (the first `HOP_GROUND` of it on the ground), two steps per 2π. */
  phase: number;
  /** Reaction to a touch, 1 → 0 over one second. */
  react: number;
  /** Whether the critter looks at the camera while waiting. */
  look: boolean;
}

export const TREE_OBSTACLE: Obstacle = [0, 0, 4.2];
export const RING = { min: 5.2, max: 13.7 } as const;
export const MAX_DT = 0.05;
/** Share of a hop spent gathering on the ground before the leap. */
export const HOP_GROUND = 0.3;
const TWO_PI = Math.PI * 2;
/** Ground Zanba covers in one full cycle of his four legs, in metres. */
export const WALK_CYCLE = 0.56;
/** Tightest arc Zanba walks, in metres: his planted feet cannot pivot. */
const WALK_ARC = 2;
/** Seconds after which a walk that has not arrived is given up. */
const WALK_PATIENCE = 28;
/** Distance from its target at which a critter starts to slow down, in seconds of cruising. */
const BRAKE_SECONDS = 0.9;
const TREE_PATH_CLEARANCE = 4.4;
/** Rough place of the opening camera on the z axis, for the critters' first pose. */
const OPENING_CAMERA_Z = -22;
/** Room a critter leaves round the other one when it picks where to go. */
const COMPANY = 1;
/** Azimuth of the opening view around the trunk: the stage faces it. */
const STAGE_AZIMUTH = -Math.PI / 2;

/** Whether a disc of radius `r` at (x, z) stands where the critters are meant to be seen. */
export type StageTest = (x: number, z: number, r: number) => boolean;

/** Where the opening finds a critter: wide screens, then portrait ones (a narrower stage). */
const STARTS: Record<CritterName, { wide: [number, number]; tall: [number, number] }> = {
  lapen: { wide: [0.8, -10.9], tall: [-0.5, -11.0] },
  zanba: { wide: [-3.4, -8.3], tall: [-2.5, -8.4] },
};

/**
 * Initial states: Lapen small and quick, Zanba big and slow, gathered at the foot of the tree
 * in front of the opening view and turned to the Konteur at `teller` (x, z). `tall` picks the
 * portrait places.
 */
export function createCritterStates(
  tall = false,
  teller: readonly [number, number] = [4.4, -12.5],
): CritterState[] {
  const base = { tgt: null, moving: 0, phase: 0, react: 0, look: false, v: 0, since: 0 };
  const at = (name: CritterName): { pos: [number, number]; yaw: number } => {
    const [x, z] = tall ? STARTS[name].tall : STARTS[name].wide;
    // Three quarters: turned to the Konteur, but enough towards the opening view to show a face.
    const listening = Math.atan2(teller[0] - x, teller[1] - z);
    const facing = Math.atan2(-x, OPENING_CAMERA_Z - z) - listening;
    return {
      pos: [x, z],
      yaw: listening + Math.atan2(Math.sin(facing), Math.cos(facing)) * 0.45,
    };
  };
  return [
    {
      ...base,
      name: "lapen",
      r: 0.55,
      speed: 1.9,
      gait: "hop",
      step: TWO_PI * 2.1,
      accel: 9,
      turn: 6,
      spin: 5.5,
      ...at("lapen"),
      wait: 6.5,
    },
    {
      ...base,
      name: "zanba",
      r: 1.5,
      speed: 0.62,
      gait: "walk",
      // One full cycle of his four legs covers `WALK_CYCLE` metres (zanba.ts sets the stride on it).
      step: TWO_PI / WALK_CYCLE,
      accel: 1.8,
      turn: 1.5,
      spin: 1.1,
      ...at("zanba"),
      wait: 9,
    },
  ];
}

/** Whether a disc of radius `r` at (x, z) touches no obstacle. */
export function isFree(x: number, z: number, r: number, obstacles: readonly Obstacle[]): boolean {
  return obstacles.every(([ox, oz, or]) => Math.hypot(x - ox, z - oz) > or + r);
}

/** Whether the straight segment a → b keeps clear of the trunk axis. */
export function clearOfTree(a: readonly [number, number], b: readonly [number, number]): boolean {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const t = clamp(-(a[0] * dx + a[1] * dz) / l2, 0, 1);
  return Math.hypot(a[0] + dx * t, a[1] + dz * t) > TREE_PATH_CLEARANCE;
}

/**
 * Up to 40 random draws in the ring for a free target reachable without crossing the trunk; with
 * `onStage`, the draws keep to the half of the ring facing the opening view and to the stage.
 * A target never lands in the company of one of the `others`.
 */
export function pickTarget(
  c: CritterState,
  obstacles: readonly Obstacle[],
  rng: Rng,
  onStage?: StageTest,
  others: readonly CritterState[] = [],
): [number, number] | null {
  for (let k = 0; k < 40; k++) {
    const a = onStage ? STAGE_AZIMUTH + (rng() - 0.5) * Math.PI : rng() * 6.28,
      r = RING.min + rng() * (RING.max - RING.min),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    // A walker first looks for somewhere ahead of it: it turns in wide arcs only.
    const ahead = c.gait === "hop" || k >= 28 || Math.abs(angleTo(c, x, z)) < 0.9;
    if (
      ahead &&
      (!onStage || onStage(x, z, c.r)) &&
      others.every(
        (o) => o === c || Math.hypot(x - o.pos[0], z - o.pos[1]) > c.r + o.r + COMPANY,
      ) &&
      isFree(x, z, c.r, obstacles) &&
      clearOfTree(c.pos, [x, z]) &&
      Math.hypot(x - c.pos[0], z - c.pos[1]) > 2.5
    )
      return [x, z];
  }
  return null;
}

/** Signed heading change needed to face (x, z), in (-π, π]. */
function angleTo(c: CritterState, x: number, z: number): number {
  const d = Math.atan2(x - c.pos[0], z - c.pos[1]) - c.yaw;
  return Math.atan2(Math.sin(d), Math.cos(d));
}

/**
 * How freely `c` may walk on, 1 to 0: it slows down over 1.5 m as it nears another critter that
 * stands ahead of it, and stops short of the distance at which `blocked` would halt it dead.
 */
function roomAhead(c: CritterState, list: readonly CritterState[]): number {
  let room = 1;
  for (const o of list) {
    if (o === c) continue;
    const dx = o.pos[0] - c.pos[0];
    const dz = o.pos[1] - c.pos[1];
    const gap = Math.hypot(dx, dz);
    const ahead = (dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw)) / (gap || 1);
    if (ahead > 0.3) room = Math.min(room, clamp((gap - (c.r + o.r + 0.6)) / 1.5, 0, 1));
  }
  return room;
}

/** Whether moving `c` to (x, z) would bump into another critter or into the trunk. */
function blocked(c: CritterState, x: number, z: number, list: readonly CritterState[]): boolean {
  if (Math.hypot(x, z) <= TREE_OBSTACLE[2] + c.r * 0.5) return true;
  return list.some((o) => o !== c && Math.hypot(x - o.pos[0], z - o.pos[1]) < c.r + o.r + 0.4);
}

/**
 * Advances every critter by `dt` (clamped): wait → walk → wait, reactions, mutual avoidance;
 * `onStage` keeps their walks where the opening view shows them. Speed and heading ease towards
 * what the critter wants, so starts, stops and turns have weight. Lapen only travels while a hop
 * has him in the air and always lands the hop he started; Zanba's steps follow the ground he
 * covers and he never turns on the spot, so his feet do not slide. Headings change at a bounded
 * rate. With `still`, nobody sets off.
 */
export function stepCritters(
  list: CritterState[],
  dt: number,
  camera: { x: number; z: number },
  obstacles: readonly Obstacle[],
  rng: Rng,
  onStage?: StageTest,
  still = false,
): void {
  const h = clamp(dt, 0, MAX_DT);
  for (const c of list) {
    c.react = Math.max(0, c.react - h);
    let want = 0;
    let turned = 0;
    // A walker's planted feet cannot pivot: Zanba only turns as he walks, his head does the rest.
    const pivots = c.gait === "hop";
    if (c.react > 0) {
      if (pivots) turned = angleTo(c, camera.x, camera.z) * Math.min(1, h * 5);
    } else if (c.wait > 0 || still) {
      c.wait -= h;
      if (c.look && pivots) turned = angleTo(c, camera.x, camera.z) * Math.min(1, h * c.turn * 0.4);
      if (c.wait <= 0 && !still) {
        c.tgt = pickTarget(c, obstacles, rng, onStage, list);
        c.since = 0;
        if (!c.tgt) {
          // Nowhere to go (a narrow stage on a phone): Lapen hops where he stands, Zanba stays.
          c.wait = 1 + rng() * 1.5;
          if (pivots && rng() < 0.7) c.phase = 1e-3;
        }
      }
    } else if (c.tgt) {
      const d = Math.hypot(c.tgt[0] - c.pos[0], c.tgt[1] - c.pos[1]);
      c.since += h;
      // A walker turns in arcs and may circle a spot it cannot quite reach: near enough will do.
      if (d < (pivots ? 0.25 : 0.7) || c.since > WALK_PATIENCE) {
        c.tgt = null;
        c.wait = 2.5 + rng() * 5;
        c.look = rng() < 0.6;
      } else {
        const turn = angleTo(c, c.tgt[0], c.tgt[1]);
        turned = turn * Math.min(1, h * c.turn);
        // Inside its own turning circle a walker would go round its target for ever: let it go.
        if (!pivots && Math.abs(turn) > 0.35 && d < 2 * WALK_ARC * Math.abs(Math.sin(turn)))
          c.since = WALK_PATIENCE;
        const facing = Math.abs(turn) < 0.7 ? 1 : pivots ? 0.25 : 0.75;
        const room = roomAhead(c, list);
        if (room <= 0) {
          // The other one is in the way: give up this walk in good time rather than bump into it.
          c.tgt = null;
          c.wait = 0.9 + rng();
          c.look = true;
        } else {
          want = c.speed * facing * clamp(d / (c.speed * BRAKE_SECONDS), 0.3, 1) * room;
        }
      }
    } else {
      c.wait = 0.4;
    }
    c.v += (want - c.v) * Math.min(1, h * c.accel);
    if (c.v < 0.01 && want === 0) c.v = 0;

    let travel = c.v * h;
    // A walker turns only as far as the ground it covers allows (arcs of `WALK_ARC` at least).
    const most = pivots ? c.spin * h : Math.min(c.spin * h, travel / WALK_ARC);
    turned = clamp(turned, -most, most);
    c.yaw += turned;
    if (c.gait === "hop") {
      const hopping = c.phase > 0 || want > 0;
      const airborne = c.phase / TWO_PI >= HOP_GROUND;
      travel = airborne ? travel / (1 - HOP_GROUND) : 0;
      if (hopping) {
        c.phase += h * c.step;
        // A hop under way is always landed; the next one starts only if he still wants to go.
        if (c.phase >= TWO_PI) c.phase = want > 0 ? c.phase - TWO_PI : 0;
      }
    } else {
      // The legs turn over with the ground covered; when he stops they stay where they stand.
      c.phase += travel * c.step;
    }
    if (travel > 0) {
      const nx = c.pos[0] + Math.sin(c.yaw) * travel,
        nz = c.pos[1] + Math.cos(c.yaw) * travel;
      if (blocked(c, nx, nz, list)) {
        // Held where it stands: a walker does not turn either.
        if (!pivots) c.yaw -= turned;
        c.tgt = null;
        c.v = 0;
        c.wait = 0.9 + rng();
        c.look = true;
      } else {
        c.pos = [nx, nz];
      }
    }
    c.moving = clamp(c.v / c.speed, 0, 1);
  }
}

/** Starts the touch reaction, unless one is already running. */
export function poke(c: CritterState): void {
  if (c.react <= 0) c.react = 1;
}
