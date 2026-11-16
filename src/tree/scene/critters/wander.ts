import { clamp, lerp } from "@shared/math";
import type { Rng } from "@shared/random";

/** Circular obstacle on the ground plane: centre x, centre z, radius. */
export type Obstacle = readonly [x: number, z: number, r: number];

export type CritterName = "lapen" | "zanba";

export interface CritterState {
  name: CritterName;
  /** Footprint radius. */
  r: number;
  /** Walking speed, units per second. */
  speed: number;
  /** Gait frequency. */
  step: number;
  pos: [number, number];
  yaw: number;
  /** Seconds left before picking a new target. */
  wait: number;
  tgt: [number, number] | null;
  /** 0 = standing, 1 = walking (eased). */
  moving: number;
  phase: number;
  /** Reaction to a touch, 1 → 0 over one second. */
  react: number;
  /** Whether the critter looks at the camera while waiting. */
  look: boolean;
}

export const TREE_OBSTACLE: Obstacle = [0, 0, 4.2];
export const RING = { min: 5.2, max: 13.7 } as const;
export const MAX_DT = 0.05;
const TREE_PATH_CLEARANCE = 4.4;
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
  const base = { tgt: null, moving: 0, phase: 0, react: 0, look: false };
  const at = (name: CritterName): { pos: [number, number]; yaw: number } => {
    const [x, z] = tall ? STARTS[name].tall : STARTS[name].wide;
    return { pos: [x, z], yaw: Math.atan2(teller[0] - x, teller[1] - z) };
  };
  return [
    { ...base, name: "lapen", r: 0.55, speed: 2.4, step: 9, ...at("lapen"), wait: 3.2 },
    { ...base, name: "zanba", r: 1.5, speed: 0.95, step: 4.2, ...at("zanba"), wait: 5.5 },
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
 */
export function pickTarget(
  c: CritterState,
  obstacles: readonly Obstacle[],
  rng: Rng,
  onStage?: StageTest,
): [number, number] | null {
  for (let k = 0; k < 40; k++) {
    const a = onStage ? STAGE_AZIMUTH + (rng() - 0.5) * Math.PI : rng() * 6.28,
      r = RING.min + rng() * (RING.max - RING.min),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (
      (!onStage || onStage(x, z, c.r)) &&
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
 * `onStage` keeps their walks where the opening view shows them.
 */
export function stepCritters(
  list: CritterState[],
  dt: number,
  camera: { x: number; z: number },
  obstacles: readonly Obstacle[],
  rng: Rng,
  onStage?: StageTest,
): void {
  const h = clamp(dt, 0, MAX_DT);
  for (const c of list) {
    c.react = Math.max(0, c.react - h);
    if (c.react > 0) {
      c.yaw += angleTo(c, camera.x, camera.z) * Math.min(1, h * 5);
      c.moving = lerp(c.moving, 0, 0.2);
    } else if (c.wait > 0) {
      c.wait -= h;
      c.moving = lerp(c.moving, 0, 0.12);
      if (c.look) c.yaw += angleTo(c, camera.x, camera.z) * Math.min(1, h * 2);
      if (c.wait <= 0) {
        c.tgt = pickTarget(c, obstacles, rng, onStage);
        if (!c.tgt) c.wait = 1;
      }
    } else if (c.tgt) {
      const d = Math.hypot(c.tgt[0] - c.pos[0], c.tgt[1] - c.pos[1]);
      if (d < 0.25) {
        c.tgt = null;
        c.wait = 1.8 + rng() * 4;
        c.look = rng() < 0.6;
      } else {
        const turn = angleTo(c, c.tgt[0], c.tgt[1]);
        c.yaw += turn * Math.min(1, h * 3.5);
        const sp = c.speed * h * (Math.abs(turn) < 0.7 ? 1 : 0.25);
        const nx = c.pos[0] + Math.sin(c.yaw) * sp,
          nz = c.pos[1] + Math.cos(c.yaw) * sp;
        if (blocked(c, nx, nz, list)) {
          c.tgt = null;
          c.wait = 0.9 + rng();
          c.look = true;
        } else {
          c.pos = [nx, nz];
        }
        c.moving = lerp(c.moving, 1, 0.12);
      }
    } else {
      c.wait = 0.4;
    }
    c.phase += h * c.step * Math.max(0.15, c.moving);
  }
}

/** Starts the touch reaction, unless one is already running. */
export function poke(c: CritterState): void {
  if (c.react <= 0) c.react = 1;
}
