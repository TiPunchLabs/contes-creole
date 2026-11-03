// Layout of the landscape pilot: a lakou of three cases with their gardens, the banks of the river
// and the woods around, inside one disc of the island (`PILOT`). Pure data, no Three.js objects
// beyond vectors, so the placement rules can be tested.
import * as THREE from "three";
import { createRng, type Rng } from "@shared/random";
import { STAGING } from "../../staging";
import { shotCamera, shotVector, vectorShot, type MixedShot } from "../env";
import { FLORA, STONES, type Flora, type Stratum } from "./flora";
import { KAZ, type Footprint, type KazColors, type KazStyle } from "./kaz";
import { reach } from "./kit";
import { SPOTS, spotPoint, type Spot } from "./spots";
import { islandHeight, riverDistance, riverPoint } from "./terrain";

/** Disc where the new landscape replaces the old one, until the owner validates it. */
export const PILOT = { x: -7, z: 2.8, radius: 10 } as const;

/** True when (x, z) lies `margin` or more inside the pilot disc. */
export const inPilot = (x: number, z: number, margin = 0): boolean =>
  Math.hypot(x - PILOT.x, z - PILOT.z) < PILOT.radius - margin;

export interface HousePlan {
  style: KazStyle;
  colors: KazColors;
  x: number;
  z: number;
  /** Ground level the case is built on: just under the highest ground beneath its walls. */
  y: number;
  yaw: number;
  footprint: Footprint;
  /** Foot of the steps (world x, z). */
  door: [number, number];
}

export interface Placement {
  flora: Flora;
  x: number;
  z: number;
  scale: number;
  yaw: number;
}

export interface StonePlacement {
  kind: number;
  x: number;
  z: number;
  scale: number;
  yaw: number;
  /** How deep the stone sinks, as a fraction of its height. */
  sink: number;
}

export interface PilotPlan {
  houses: HousePlan[];
  /** Earth paths from each door to the lakou: [from, to]. */
  paths: [[number, number], [number, number]][];
  plants: Placement[];
  stones: StonePlacement[];
}

/** Centre and radius of the beaten-earth yard shared by the cases. */
export const LAKOU = { x: -9.5, z: 2.25, radius: 1.6 } as const;
export const PATH_HALF = 0.45;

const CASES: CaseSpec[] = [
  {
    style: "galerie",
    colors: { wall: "#f1d9a8", shutter: "#2f7f86", roof: "#b4553b" },
    x: -10.5,
    z: 6.5,
    turn: -0.3,
  },
  {
    style: "katpan",
    colors: { wall: "#cfe2cf", shutter: "#3d6fa6", roof: "#6f8f6a" },
    x: -11.5,
    z: -2.3,
    turn: 0.6,
  },
  {
    style: "pignon",
    colors: { wall: "#b58f69", shutter: "#3a8a5a", roof: "#a0705a" },
    x: -13.5,
    z: 1.5,
    turn: -0.3,
  },
];

/** (x, z) moved into the local frame of a case (front towards +z). */
function toLocal(h: { x: number; z: number; yaw: number }, x: number, z: number): [number, number] {
  const dx = x - h.x;
  const dz = z - h.z;
  const c = Math.cos(h.yaw);
  const s = Math.sin(h.yaw);
  return [dx * c - dz * s, dx * s + dz * c];
}

/** Local (x, z) of a case back to the world. */
function toWorld(
  h: { x: number; z: number; yaw: number },
  lx: number,
  lz: number,
): [number, number] {
  const c = Math.cos(h.yaw);
  const s = Math.sin(h.yaw);
  return [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
}

/** True when the disc (x, z, r) overlaps the footprint of `house`, grown by `margin`. */
export function hitsHouse(house: HousePlan, x: number, z: number, r: number, margin = 0): boolean {
  const [lx, lz] = toLocal(house, x, z);
  const f = house.footprint;
  const cx = THREE.MathUtils.clamp(lx, f.left - margin, f.right + margin);
  const cz = THREE.MathUtils.clamp(lz, f.back - margin, f.front + margin);
  return Math.hypot(lx - cx, lz - cz) < r;
}

/** Distance from (x, z) to the segment a–b. */
export function toSegment(x: number, z: number, [ax, az]: number[], [bx, bz]: number[]): number {
  const vx = bx - ax;
  const vz = bz - az;
  const t = THREE.MathUtils.clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
}

export interface CaseSpec {
  style: KazStyle;
  colors: KazColors;
  x: number;
  z: number;
  /** Turn away from facing the lakou straight on (radians). */
  turn: number;
}

const footprints = new Map<KazStyle, Footprint>();
const SINK = 0.2;

/** Footprint of a case style (colours do not change it). */
function footprintOf(c: CaseSpec): Footprint {
  let f = footprints.get(c.style);
  if (!f) {
    const kaz = KAZ[c.style](c.colors);
    kaz.geometry.dispose();
    f = kaz.footprint;
    footprints.set(c.style, f);
  }
  return f;
}

/** A case facing the lakou, set on the highest ground under its walls. */
export function placeHouse(c: CaseSpec, lakou: { x: number; z: number } = LAKOU): HousePlan {
  const yaw = Math.atan2(lakou.x - c.x, lakou.z - c.z) + c.turn;
  const f = footprintOf(c);
  const frame = { x: c.x, z: c.z, yaw };
  let y = -Infinity;
  for (const lx of [f.left + 0.4, 0, f.right - 0.4]) {
    for (const lz of [f.back + 0.4, 0, f.front - 1]) {
      y = Math.max(y, islandHeight(...toWorld(frame, lx, lz)));
    }
  }
  // Sink the case a little so the uphill ground covers the foot of its plinth.
  y -= SINK;
  const doorX = c.style === "katpan" ? -0.45 : 0;
  return { ...c, y, yaw, footprint: f, door: toWorld(frame, doorX, f.front) };
}

/** A foliage mass seen by the cameras: an ellipsoid. */
interface Mass {
  center: THREE.Vector3;
  radius: THREE.Vector3;
}

/** Foliage ellipsoid of a placed plant (trees and shrubs only; low plants never hide anything). */
export function massOf(p: Placement): Mass | null {
  const plant = PLANTS[p.flora];
  if (plant.stratum === "low") return null;
  const base = plant.base * p.scale;
  const top = plant.height * p.scale;
  return {
    center: new THREE.Vector3(p.x, islandHeight(p.x, p.z) + (base + top) / 2, p.z),
    radius: new THREE.Vector3(plant.crown * p.scale, (top - base) / 2 + 0.1, plant.crown * p.scale),
  };
}

/** True when the segment a–b passes through the ellipsoid. */
export function crosses(a: THREE.Vector3, b: THREE.Vector3, m: Mass): boolean {
  const p = a.clone().sub(m.center).divide(m.radius);
  const d = b.clone().sub(m.center).divide(m.radius).sub(p);
  const t = THREE.MathUtils.clamp(-p.dot(d) / d.lengthSq(), 0, 1);
  return p.addScaledVector(d, t).lengthSq() < 1;
}

/** Sightline from a story camera to something the reader must see. */
export interface Sightline {
  page: string;
  what: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
}

const BIRD_ON_PERCH = 3.9;

/** Lines of sight of every page (landscape and portrait framing) to its focus and characters. */
export function sightlines(houses: HousePlan[]): Sightline[] {
  const lines: Sightline[] = [];
  const v: number[] = [];
  const shot: MixedShot = { focus: new THREE.Vector3(), azimuth: 0, elevation: 0, distance: 1 };
  for (const [page, env] of Object.entries(STAGING)) {
    vectorShot(shotVector(env.shot, 0, v), shot);
    const targets: [string, THREE.Vector3][] = [
      ["focus", shot.focus.clone().setY(shot.focus.y + 0.3)],
    ];
    const lift = (spot: Spot, y: number): THREE.Vector3 => {
      const p = spotPoint(spot);
      return p.setY(p.y + y);
    };
    targets.push(["bird", lift(env.bird, env.bird === "perch" ? BIRD_ON_PERCH : 0.4)]);
    if (env.crab) targets.push(["crab", lift(env.crab, 0.6)]);
    if (page === "ti-kannot-e-gwo-rako" || page === "larivye-la-ka-desann") {
      houses.forEach((h, i) => targets.push([`house ${i}`, new THREE.Vector3(h.x, h.y + 2, h.z)]));
    }
    for (const aspect of [16 / 10, 9 / 19.5]) {
      const from = new THREE.Vector3();
      shotCamera(shot, aspect, from, new THREE.Vector3());
      for (const [what, to] of targets) lines.push({ page, what, from, to });
    }
  }
  return lines;
}

/** A page whose subject is inside the pilot: the camera and what it frames. */
export interface Stage {
  camera: THREE.Vector3;
  focus: THREE.Vector3;
}

/** Story cameras (landscape and portrait) of the pages framing a subject inside the pilot. */
export function stages(): Stage[] {
  const out: Stage[] = [];
  const v: number[] = [];
  const shot: MixedShot = { focus: new THREE.Vector3(), azimuth: 0, elevation: 0, distance: 1 };
  for (const env of Object.values(STAGING)) {
    vectorShot(shotVector(env.shot, 0, v), shot);
    if (!inPilot(shot.focus.x, shot.focus.z)) continue;
    for (const aspect of [16 / 10, 9 / 19.5]) {
      const camera = new THREE.Vector3();
      shotCamera(shot, aspect, camera, new THREE.Vector3());
      out.push({ camera, focus: shot.focus.clone() });
    }
  }
  return out;
}

const STAGE_HALF_ANGLE = 0.7;
const NEAR_LOW = 12;

/**
 * True when `p` stands in front of a page's subject, inside its field of view: the stage between
 * the camera and the subject stays open (grass and ferns only, and no big low plant up close).
 */
export function onStage(p: Placement, stratum: Stratum, list: Stage[]): boolean {
  if (p.flora === "tuft" || p.flora === "fern") return false;
  return list.some(({ camera, focus }) => {
    const tx = p.x - camera.x;
    const tz = p.z - camera.z;
    const fx = focus.x - camera.x;
    const fz = focus.z - camera.z;
    const d = Math.hypot(tx, tz);
    const angle = Math.acos(
      THREE.MathUtils.clamp((tx * fx + tz * fz) / (d * Math.hypot(fx, fz)), -1, 1),
    );
    if (angle > STAGE_HALF_ANGLE) return false;
    return stratum === "low" ? d < NEAR_LOW : d < Math.hypot(fx, fz) - 0.5;
  });
}

/** Sightlines a plant would block (Ti Kannot's own tree may stand under him). */
export function blocked(p: Placement, lines: Sightline[]): Sightline[] {
  const mass = massOf(p);
  if (!mass) return [];
  const perched = Math.hypot(p.x - SPOTS.perch[0], p.z - SPOTS.perch[1]) < 1.5;
  return lines.filter((l) => !(perched && l.what === "bird") && crosses(l.from, l.to, mass));
}

/** Placement sizes of each plant; `reach` is the true horizontal extent of its geometry. */
const PLANTS = Object.fromEntries(
  (Object.keys(FLORA) as Flora[]).map((name) => {
    const plant = FLORA[name]();
    const size = {
      crown: plant.crown,
      base: plant.base,
      height: plant.height,
      stratum: plant.stratum,
      reach: reach(plant.geometry),
    };
    plant.geometry.dispose();
    return [name, size];
  }),
) as Record<
  Flora,
  { crown: number; base: number; height: number; stratum: Stratum; reach: number }
>;

/** True horizontal extent of each stone shape at scale 1. */
export const STONE_REACH = STONES.map((make) => {
  const geometry = make();
  const r = reach(geometry);
  geometry.dispose();
  return r;
});

/** Staged spots kept clear of anything taller than grass: [spot, radius]. */
const KEEP_CLEAR: [Spot, number][] = [
  ["bank", 1.3],
  ["ford", 2.3],
  ["tank", 2.4],
  ["tap", 1.8],
];

/** Pilot layout, built once (the ground and the scenery both read it). */
let cached: PilotPlan | null = null;

export function pilotPlan(): PilotPlan {
  cached ??= planPilot(createRng(23));
  return cached;
}

/** Places the cases, paths, gardens, banks and woods of the pilot. */
function planPilot(rng: Rng): PilotPlan {
  const houses = CASES.map((c) => placeHouse(c));
  const paths = houses.map((h): [[number, number], [number, number]] => {
    const [dx, dz] = h.door;
    const k = 1 - (LAKOU.radius - 0.3) / Math.hypot(LAKOU.x - dx, LAKOU.z - dz);
    return [h.door, [dx + (LAKOU.x - dx) * k, dz + (LAKOU.z - dz) * k]];
  });
  const lines = sightlines(houses);
  const framed = stages();
  const plants: Placement[] = [];

  /** Accepts `p` if it keeps every rule; returns whether it was placed. */
  const tryPlace = (p: Placement): boolean => {
    const plant = PLANTS[p.flora];
    const r = plant.crown * p.scale;
    const foot = plant.stratum === "low" ? r * 0.6 : 0.35;
    // The whole plant stays inside the pilot, not just its trunk.
    if (!inPilot(p.x, p.z, plant.reach * p.scale)) return false;
    if (riverDistance(p.x, p.z) < 1.25 + foot) return false;
    if (Math.hypot(p.x - LAKOU.x, p.z - LAKOU.z) < LAKOU.radius + foot) return false;
    if (paths.some(([a, b]) => toSegment(p.x, p.z, a, b) < PATH_HALF + foot)) return false;
    if (
      plant.stratum !== "low" &&
      KEEP_CLEAR.some(([s, d]) => Math.hypot(p.x - SPOTS[s][0], p.z - SPOTS[s][1]) < d + foot)
    )
      return false;
    // Foliage above the eaves must clear the roofs; low plants may touch the walls, not the roof edge.
    const reach = plant.stratum === "low" ? r * 0.6 : r + 0.1;
    if (houses.some((h) => hitsHouse(h, p.x, p.z, reach, plant.stratum === "low" ? -0.3 : 0)))
      return false;
    for (const q of plants) {
      const other = PLANTS[q.flora];
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < 0.3) return false;
      const spacing = plant.stratum === "tree" ? 0.85 : 0.72;
      if (other.stratum === plant.stratum && d < (r + other.crown * q.scale) * spacing)
        return false;
    }
    if (blocked(p, lines).length || onStage(p, plant.stratum, framed)) return false;
    plants.push(p);
    return true;
  };
  const yaw = (): number => rng() * Math.PI * 2;
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rng() * list.length)];

  // Ti Kannot's tree stands where the tale puts it; the cases are composed around it.
  plants.push({
    flora: "flamboyant",
    x: SPOTS.perch[0] - 0.6,
    z: SPOTS.perch[1] - 0.4,
    scale: 1.25,
    yaw: 0.6,
  });

  // Gardens: a fruit tree behind each case, papaya and bananas at the back corners, flowers in front.
  houses.forEach((h, i) => {
    const f = h.footprint;
    const garden: [Flora, number, number, number][] = [
      [i === 1 ? "breadfruit" : "mango", (i - 1) * 0.8, f.back - 2.3, 0.95],
      ["papaya", f.right + 0.7, f.back + 0.6, 1],
      ["papaya", f.left - 0.6, f.back + 1.4, 0.9],
      ["banana", f.left - 0.8, f.back - 0.3, 1],
      ["banana", f.right + 0.6, f.back - 0.9, 0.9],
      ["banana", f.left - 1.6, f.back + 0.4, 0.85],
      ["hibiscus", f.right + 0.25, 0.2, 0.9],
      ["hibiscus", f.left - 0.25, -0.2, 1],
      ["balisier", f.right + 0.3, f.back + 0.2, 1],
      ["balisier", f.left - 0.3, f.front - 0.9, 0.9],
    ];
    for (const [flora, lx, lz, s] of garden) {
      for (let k = 0; k < 6; k++) {
        const [x, z] = toWorld(h, lx + (rng() - 0.5) * 0.5 * k, lz + (rng() - 0.5) * 0.5 * k);
        if (tryPlace({ flora, x, z, scale: s * (0.92 + rng() * 0.16), yaw: yaw() })) break;
      }
    }
  });

  // Banks: ferns, malanga and balisiers along the water, a few bushes and trees further up.
  const stones: StonePlacement[] = [];
  const at = new THREE.Vector2();
  const ahead = new THREE.Vector2();
  for (let t = 0; t <= 1; t += 0.004) {
    riverPoint(t, at);
    riverPoint(Math.min(1, t + 0.004), ahead)
      .sub(at)
      .normalize();
    const half = 0.75 + t * 0.6;
    for (const side of [-1, 1]) {
      const along = (d: number): [number, number] => [
        at.x + ahead.y * side * d,
        at.y - ahead.x * side * d,
      ];
      if (!inPilot(...along(half))) continue;
      if (rng() < 0.32) {
        const [x, z] = along(half - 0.15 + rng() * 0.5);
        const kind = Math.floor(rng() * 3);
        const scale = 0.45 + rng() * rng() * 1.1;
        if (
          inPilot(x, z, STONE_REACH[kind] * scale) &&
          !KEEP_CLEAR.slice(0, 2).some(
            ([s, d]) => Math.hypot(x - SPOTS[s][0], z - SPOTS[s][1]) < d * 0.6,
          )
        ) {
          stones.push({
            kind,
            x,
            z,
            scale,
            yaw: yaw(),
            sink: 0.25 + rng() * 0.3,
          });
        }
      }
      if (rng() < 0.35) {
        const [x, z] = along(half + 0.6 + rng() * 1.2);
        tryPlace({
          flora: pick(["fern", "fern", "malanga", "malanga", "balisier", "hibiscus"] as const),
          x,
          z,
          scale: 0.8 + rng() * 0.45,
          yaw: yaw(),
        });
      }
      if (rng() < 0.12) {
        const [x, z] = along(half + 2.4 + rng() * 1.6);
        tryPlace({
          flora: pick(["mango", "breadfruit", "banana", "papaya"] as const),
          x,
          z,
          scale: 0.85 + rng() * 0.3,
          yaw: yaw(),
        });
      }
    }
  }

  // Woods and open ground: trees of several heights first, then shrubs only in their shade, so
  // the meadows between the groves stay open; coconuts on the low coast.
  const scatter = (tries: number, place: (x: number, z: number, h: number) => void): void => {
    for (let i = 0; i < tries; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * PILOT.radius;
      const x = PILOT.x + Math.cos(a) * d;
      const z = PILOT.z + Math.sin(a) * d;
      const h = islandHeight(x, z);
      if (h > 0.3) place(x, z, h);
    }
  };
  scatter(320, (x, z, h) => {
    const flora = h < 1.3 ? "coconut" : pick(["mango", "breadfruit", "mango"] as const);
    tryPlace({ flora, x, z, scale: 0.8 + rng() * 0.4, yaw: yaw() });
  });
  const trees = plants.filter((p) => PLANTS[p.flora].stratum === "tree");
  scatter(500, (x, z) => {
    const shade = trees.some(
      (t) => Math.hypot(x - t.x, z - t.z) < PLANTS[t.flora].crown * t.scale + 0.8,
    );
    if (!shade) return;
    const flora = pick(["hibiscus", "balisier", "fern", "fern", "malanga", "banana"] as const);
    tryPlace({ flora, x, z, scale: 0.8 + rng() * 0.35, yaw: yaw() });
  });
  scatter(700, (x, z) => tryPlace({ flora: "tuft", x, z, scale: 0.8 + rng() * 0.5, yaw: yaw() }));

  // Stepping stones on the paths, flat and half sunk.
  for (const [[ax, az], [bx, bz]] of paths) {
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 0.6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      stones.push({
        kind: 0,
        x: ax + (bx - ax) * t + (rng() - 0.5) * 0.15,
        z: az + (bz - az) * t + (rng() - 0.5) * 0.15,
        scale: 0.5 + rng() * 0.12,
        yaw: yaw(),
        sink: 0.55,
      });
    }
  }
  return { houses, paths, plants, stones };
}

/** Ground paint inside the pilot: beaten earth of the lakou and paths, damp bank soil, or null. */
export function pilotSoil(x: number, z: number, toRiver: number): "earth" | "bank" | null {
  if (!inPilot(x, z)) return null;
  const { paths, houses } = pilotPlan();
  if (Math.hypot(x - LAKOU.x, z - LAKOU.z) < LAKOU.radius + 0.4) return "earth";
  if (paths.some(([a, b]) => toSegment(x, z, a, b) < PATH_HALF + 0.15)) return "earth";
  if (houses.some((h) => hitsHouse(h, x, z, 0.05, 0.25))) return "earth";
  if (toRiver > 0.85 && toRiver < 1.45) return "bank";
  return null;
}
