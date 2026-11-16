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
/** Distance from its target at which a critter starts to slow down, in seconds of cruising. */
const BRAKE_SECONDS = 0.9;
const TREE_PATH_CLEARANCE = 4.4;
/** Rough place of the opening camera on the z axis, for the critters' first pose. */
const OPENING_CAMERA_Z = -22;
/** Room a critter leaves round the other one when it picks where to go. */
const COMPANY = 1.6;
/** Azimuth of the opening view around the trunk: the stage faces it. */
const STAGE_AZIMUTH = -Math.PI / 2;

/** Whether a disc of radius `r` at (x, z) stands where the critters are meant to be seen. */
export type StageTest = (x: number, z: number, r: number) => boolean;

/** Where the opening finds a critter: wide screens, then portrait ones (a narrower stage). */
const STARTS: Record<CritterName, { wide: [number, number]; tall: [number, number] }> = {
  lapen: { wide: [1.1, -11.7], tall: [-1.0, -11.6] },
  zanba: { wide: [-3.4, -8.3], tall: [-3.3, -8.2] },
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
  const base = { tgt: null, moving: 0, phase: 0, react: 0, look: false, v: 0 };
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
      ...at("lapen"),
      wait: 6.5,
    },
    {
      ...base,
      name: "zanba",
      r: 1.5,
      speed: 0.62,
      gait: "walk",
      // One full cycle of his four legs covers 0.72 m (zanba.ts: leg length and swing).
      step: TWO_PI / 0.72,
      accel: 1.8,
      turn: 1.5,
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
    if (
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
 * covers, turning included, so his feet do not slide. With `still`, nobody sets off.
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
    if (c.react > 0) {
      turned = angleTo(c, camera.x, camera.z) * Math.min(1, h * 5);
    } else if (c.wait > 0 || still) {
      c.wait -= h;
      if (c.look) turned = angleTo(c, camera.x, camera.z) * Math.min(1, h * c.turn * 0.4);
      if (c.wait <= 0 && !still) {
        c.tgt = pickTarget(c, obstacles, rng, onStage, list);
        if (!c.tgt) c.wait = 1;
      }
    } else if (c.tgt) {
      const d = Math.hypot(c.tgt[0] - c.pos[0], c.tgt[1] - c.pos[1]);
      if (d < 0.25) {
        c.tgt = null;
        c.wait = 2.5 + rng() * 5;
        c.look = rng() < 0.6;
      } else {
        const turn = angleTo(c, c.tgt[0], c.tgt[1]);
        turned = turn * Math.min(1, h * c.turn);
        const facing = Math.abs(turn) < 0.7 ? 1 : 0.25;
        want = c.speed * facing * clamp(d / (c.speed * BRAKE_SECONDS), 0.3, 1);
      }
    } else {
      c.wait = 0.4;
    }
    c.yaw += turned;
    c.v += (want - c.v) * Math.min(1, h * c.accel);
    if (c.v < 0.01 && want === 0) c.v = 0;

    let travel = c.v * h;
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
      // Half a metre of turning circle: a turn on the spot is walked, not slid.
      c.phase += (travel + Math.abs(turned) * 0.5) * c.step;
      if (c.v === 0 && turned === 0) {
        const rest = Math.round(c.phase / Math.PI) * Math.PI;
        c.phase += (rest - c.phase) * Math.min(1, h * 4);
      }
    }
    if (travel > 0) {
      const nx = c.pos[0] + Math.sin(c.yaw) * travel,
        nz = c.pos[1] + Math.cos(c.yaw) * travel;
      if (blocked(c, nx, nz, list)) {
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
