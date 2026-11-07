// Layout of the island's scenery: the lakou of three cases with their gardens, Gwo Rako's case above
// his yard and his hoard, the banks of the river, the coast, the open ground and the forest of the
// mountain. Pure data, no Three.js objects beyond vectors, so the placement rules can be tested.
import * as THREE from "three";
import { createRng, type Rng } from "@shared/random";
import { STAGING } from "../../staging";
import { HELPERS } from "../characters";
import { shotCamera, shotVector, vectorShot, type MixedShot } from "../env";
import { FLORA, STONES, type Flora, type Stratum } from "./flora";
import { KAZ, type Footprint, type KazColors, type KazStyle } from "./kaz";
import { reach } from "./kit";
import { HOUSE, SPOTS, STOCK, spotPoint, type Spot } from "./spots";
import { DAM } from "./source";
import { islandHeight, riverDistance, riverPoint } from "./terrain";

/** A round open yard of beaten earth. */
export interface Yard {
  x: number;
  z: number;
  radius: number;
}

export interface CaseSpec {
  style: KazStyle;
  colors: KazColors;
  x: number;
  z: number;
  /** Turn away from facing its yard straight on (radians). */
  turn: number;
  /** Uniform size of the case (1 for the village cases). */
  scale?: number;
}

export interface HousePlan extends CaseSpec {
  /** Ground level the case is built on: just under the highest ground beneath its walls. */
  y: number;
  yaw: number;
  scale: number;
  footprint: Footprint;
  /** Height of the roof top above `y`. */
  top: number;
  /** Foot of the steps (world x, z). */
  door: [number, number];
  /** The yard the case faces. */
  yard: Yard;
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

export type Path = [[number, number], [number, number]];

export interface IslandPlan {
  houses: HousePlan[];
  /** Earth paths: from each door to its yard, and from Gwo Rako's yard down to the ford. */
  paths: Path[];
  plants: Placement[];
  stones: StonePlacement[];
}

/** The beaten-earth yard shared by the village cases. */
export const LAKOU: Yard = { x: -9.5, z: 2.25, radius: 1.6 };
/** Gwo Rako's yard, where he stands on the yard pages. */
export const YARD: Yard = { x: SPOTS.yard[0], z: SPOTS.yard[1], radius: 1.5 };
export const PATH_HALF = 0.45;

/** Gwo Rako's hoard behind his case (world x, z bounds), as the stock piles fill it at most. */
export const STOCK_AREA = {
  left: STOCK[0] - 5.8,
  right: STOCK[0] + 7.6,
  back: STOCK[1] - 1.7,
  front: STOCK[1] + 0.6,
} as const;

const CASES: CaseSpec[] = [
  {
    style: "galerie",
    colors: { wall: "#f2dcae", shutter: "#3f8a8a", roof: "#c6643f" },
    x: -10.5,
    z: 6.5,
    turn: -0.3,
  },
  {
    style: "katpan",
    colors: { wall: "#efe0c0", shutter: "#4a78a0", roof: "#7f9a6c" },
    x: -11.5,
    z: -2.3,
    turn: 0.6,
  },
  {
    style: "pignon",
    colors: { wall: "#d2ad82", shutter: "#3a8a5a", roof: "#b8683f" },
    x: -13.5,
    z: 1.5,
    turn: -0.3,
  },
];

const GWO_RAKO_SCALE = 1.15;
/** Hip-roof ridge centre of a katpan case, in its local z (Ti Kannot stands on it). */
const KATPAN_RIDGE = 0.45;

/** Gwo Rako's case keeps the old one's orientation. */
const GWO_RAKO_YAW = -0.25;
const gwoRakoX = HOUSE[0] - Math.sin(GWO_RAKO_YAW) * KATPAN_RIDGE * GWO_RAKO_SCALE;
const gwoRakoZ = HOUSE[1] - Math.cos(GWO_RAKO_YAW) * KATPAN_RIDGE * GWO_RAKO_SCALE;

/**
 * Gwo Rako's case: the biggest, a katpan in his old colours. It sits back from the roof spot so Ti
 * Kannot lands on the ridge.
 */
export const GWO_RAKO: CaseSpec = {
  style: "katpan",
  colors: { wall: "#ecc27a", shutter: "#3f8f5a", roof: "#c8553a" },
  x: gwoRakoX,
  z: gwoRakoZ,
  turn: GWO_RAKO_YAW - Math.atan2(YARD.x - gwoRakoX, YARD.z - gwoRakoZ),
  scale: GWO_RAKO_SCALE,
};

/** (x, z) moved into the local frame of a case (front towards +z), unscaled. */
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

/** True when the disc (x, z, r) overlaps Gwo Rako's hoard. */
export function hitsStock(x: number, z: number, r: number): boolean {
  const cx = THREE.MathUtils.clamp(x, STOCK_AREA.left, STOCK_AREA.right);
  const cz = THREE.MathUtils.clamp(z, STOCK_AREA.back, STOCK_AREA.front);
  return Math.hypot(x - cx, z - cz) < r;
}

/** Distance from (x, z) to the segment a–b. */
export function toSegment(x: number, z: number, [ax, az]: number[], [bx, bz]: number[]): number {
  const vx = bx - ax;
  const vz = bz - az;
  const t = THREE.MathUtils.clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(x - ax - vx * t, z - az - vz * t);
}

const shapes = new Map<KazStyle, { footprint: Footprint; top: number }>();
const SINK = 0.2;
/** How far the stone steps of a case reach below its floor base. */
const STEPS_REACH = 0.5;

/** Footprint and roof top of a case style at scale 1 (colours do not change them). */
function shapeOf(style: KazStyle, colors: KazColors): { footprint: Footprint; top: number } {
  let shape = shapes.get(style);
  if (!shape) {
    const kaz = KAZ[style](colors);
    kaz.geometry.computeBoundingBox();
    shape = { footprint: kaz.footprint, top: kaz.geometry.boundingBox?.max.y ?? 3 };
    kaz.geometry.dispose();
    shapes.set(style, shape);
  }
  return shape;
}

/** A case facing its yard, set on the highest ground under its walls. */
export function placeHouse(c: CaseSpec, yard: Yard = LAKOU): HousePlan {
  const scale = c.scale ?? 1;
  const yaw = Math.atan2(yard.x - c.x, yard.z - c.z) + c.turn;
  const shape = shapeOf(c.style, c.colors);
  const s = shape.footprint;
  const f = {
    left: s.left * scale,
    right: s.right * scale,
    back: s.back * scale,
    front: s.front * scale,
  };
  const frame = { x: c.x, z: c.z, yaw };
  let y = -Infinity;
  for (const lx of [f.left + 0.4, 0, f.right - 0.4]) {
    for (const lz of [f.back + 0.4, 0, f.front - 1]) {
      y = Math.max(y, islandHeight(...toWorld(frame, lx, lz)));
    }
  }
  const doorX = c.style === "katpan" ? -0.45 * scale : 0;
  const door = toWorld(frame, doorX, f.front);
  // Sink the case a little so the uphill ground covers the foot of its plinth, and lower it further
  // where the ground falls away in front, so its stone steps still reach the ground.
  y = Math.min(y - SINK, islandHeight(...door) + STEPS_REACH * scale);
  return {
    ...c,
    y,
    yaw,
    scale,
    footprint: f,
    top: shape.top * scale,
    door,
    yard,
  };
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

/** Depth of open background kept behind Ti Kannot. */
const BACKDROP = 3;
/** Height Ti Kannot stands at above a spot's ground, where something lifts him. */
const BIRD_LIFT: Partial<Record<Spot, number>> = { perch: 3.9, rock: 2.7, tank: 1.8 };
/** Half width of the stage kept open around a page's subject, across the camera's view. */
const STAGE_HALF_WIDTH = 2.5;
/** Pages that show the village cases around the lakou. */
const VILLAGE_PAGES = new Set(["ti-kannot-e-gwo-rako", "larivye-la-ka-desann"]);

/**
 * Lines of sight of every page (landscape and portrait framing) to its focus and characters, to the
 * village cases on the pages that show them, and to Gwo Rako's case and hoard on the yard pages.
 * Pages with a subject also keep a fan of lines across its stage, so no crown stands in front of it.
 */
export function sightlines(houses: HousePlan[]): Sightline[] {
  const lines: Sightline[] = [];
  const v: number[] = [];
  const shot: MixedShot = { focus: new THREE.Vector3(), azimuth: 0, elevation: 0, distance: 1 };
  const own = houses.find((h) => h.yard === YARD);
  for (const [page, env] of Object.entries(STAGING)) {
    vectorShot(shotVector(env.shot, 0, v), shot);
    const targets: [string, THREE.Vector3][] = [
      ["focus", shot.focus.clone().setY(shot.focus.y + 0.3)],
    ];
    const lift = (spot: Spot, y: number): THREE.Vector3 => {
      const p = spotPoint(spot);
      return p.setY(p.y + y);
    };
    const bird =
      env.bird === "roof" && own
        ? lift("roof", 0).setY(own.y + own.top + 0.3)
        : lift(env.bird, BIRD_LIFT[env.bird] ?? 0.4);
    targets.push(["bird", bird]);
    // Nothing right behind him either, so his silhouette reads against open ground or sky.
    const backdrop = bird.clone().sub(shot.focus).setY(0);
    targets.push(["bird", bird.clone().add(backdrop.setLength(BACKDROP).setY(0.3))]);
    if (env.crab) targets.push(["crab", lift(env.crab, 0.6)]);
    if (env.helpers > 0) {
      for (const [dx, dz] of HELPERS) {
        const x = SPOTS.spring[0] + dx;
        const z = SPOTS.spring[1] + dz;
        targets.push(["helper", new THREE.Vector3(x, islandHeight(x, z) + 0.6, z)]);
      }
    }
    for (const [i, h] of houses.entries()) {
      const shown = h.yard === YARD ? env.shot.focus === "yard" : VILLAGE_PAGES.has(page);
      if (shown) targets.push([`house ${i}`, new THREE.Vector3(h.x, h.y + 2, h.z)]);
    }
    if (env.dam > 0 && env.shot.focus === "spring") {
      const [mid, across] = damLine();
      for (const k of [-0.8, 0, 0.8]) {
        const p = mid.clone().addScaledVector(across, k * DAM.half);
        targets.push(["dam", p.setY(islandHeight(p.x, p.z) + 0.45)]);
      }
    }
    if (env.shot.focus === "yard") {
      targets.push(["stock", new THREE.Vector3(STOCK[0], islandHeight(...STOCK) + 0.8, STOCK[1])]);
    }
    for (const aspect of [16 / 10, 9 / 19.5]) {
      const from = new THREE.Vector3();
      shotCamera(shot, aspect, from, new THREE.Vector3());
      for (const [what, to] of targets) lines.push({ page, what, from, to });
      if (env.shot.focus === "island") continue;
      const across = new THREE.Vector3(shot.focus.z - from.z, 0, from.x - shot.focus.x).normalize();
      for (const k of [-1, -0.5, 0.5, 1]) {
        const to = shot.focus.clone().addScaledVector(across, k * STAGE_HALF_WIDTH);
        lines.push({ page, what: "stage", from, to: to.setY(to.y + 0.3) });
      }
    }
  }
  return lines;
}

/** Middle of Gwo Rako's dam on the ground and the horizontal direction across the river. */
export function damLine(): [THREE.Vector3, THREE.Vector3] {
  const at = riverPoint(DAM.t);
  const ahead = riverPoint(DAM.t + 0.01)
    .sub(at)
    .normalize();
  return [new THREE.Vector3(at.x, 0, at.y), new THREE.Vector3(ahead.y, 0, -ahead.x)];
}

/** A page with a subject: the camera and what it frames. */
export interface Stage {
  camera: THREE.Vector3;
  focus: THREE.Vector3;
}

/** Story cameras (landscape and portrait) of every page framing a subject, not the whole island. */
export function stages(): Stage[] {
  const out: Stage[] = [];
  const v: number[] = [];
  const shot: MixedShot = { focus: new THREE.Vector3(), azimuth: 0, elevation: 0, distance: 1 };
  for (const env of Object.values(STAGING)) {
    if (env.shot.focus === "island") continue;
    vectorShot(shotVector(env.shot, 0, v), shot);
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
/** Largest angular radius (radians) a crown may show in a page's frame: about a quarter of its height. */
const MAX_CROWN_ANGLE = 0.19;

/**
 * True when a plant stands in front of a page's subject, inside its field of view: the ground
 * between the camera and the subject stays open (grass and ferns only, and no big low plant up
 * close). A tree is only refused when its crown would look too big in the frame; the stage's
 * sightlines keep trees from hiding the subject.
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
    if (stratum === "tree") {
      const mass = massOf(p);
      return !!mass && mass.radius.x / mass.center.distanceTo(camera) > MAX_CROWN_ANGLE;
    }
    return stratum === "low" ? d < NEAR_LOW : d < Math.hypot(fx, fz) - 0.5;
  });
}

/** Sightlines a plant would block (Ti Kannot's own tree may stand under him, on his stage). */
export function blocked(p: Placement, lines: Sightline[]): Sightline[] {
  const mass = massOf(p);
  if (!mass) return [];
  const perched = Math.hypot(p.x - SPOTS.perch[0], p.z - SPOTS.perch[1]) < 1.5;
  return lines.filter(
    (l) => !(perched && (l.what === "bird" || l.what === "stage")) && crosses(l.from, l.to, mass),
  );
}

/** Narrative sightlines a stone would block (it may lie on a page's stage, not across a target). */
export function stoneBlocks(s: StonePlacement, lines: Sightline[]): Sightline[] {
  const r = STONE_REACH[s.kind] * s.scale;
  const mass = {
    center: new THREE.Vector3(s.x, islandHeight(s.x, s.z) + r * 0.3, s.z),
    radius: new THREE.Vector3(r, r * 0.5, r),
  };
  return lines.filter((l) => l.what !== "stage" && crosses(l.from, l.to, mass));
}

/** Placement sizes of each plant. */
const PLANTS = Object.fromEntries(
  (Object.keys(FLORA) as Flora[]).map((name) => {
    const plant = FLORA[name]();
    const size = {
      crown: plant.crown,
      base: plant.base,
      height: plant.height,
      stratum: plant.stratum,
    };
    plant.geometry.dispose();
    return [name, size];
  }),
) as Record<Flora, { crown: number; base: number; height: number; stratum: Stratum }>;

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

/** Staged spots kept clear of every plant but grass (the rock, and the helpers round the spring). */
export const KEEP_BARE: [Spot, number][] = [
  ["spring", 3.4],
  ["rock", 2.6],
];

/** Lowest ground a plant grows on: the sand and the sea stay bare. */
export const SHORE = 0.3;
/** Ground height where the open ground turns into the forest of the mountain. */
export const FOREST_LINE = 2.8;
/** Radius of the disc the scatter draws from (the coast sits at about 17). */
const SCATTER_RADIUS = 19;

/** Island layout, built once (the ground and the scenery both read it). */
let cached: IslandPlan | null = null;

export function islandPlan(): IslandPlan {
  cached ??= planIsland(createRng(23));
  return cached;
}

/** Path from `from` to the edge of `yard`, or null when `from` already stands in it. */
function toYard(from: [number, number], yard: Yard): Path | null {
  const [dx, dz] = from;
  const d = Math.hypot(yard.x - dx, yard.z - dz);
  if (d < yard.radius) return null;
  const k = 1 - (yard.radius - 0.3) / d;
  return [from, [dx + (yard.x - dx) * k, dz + (yard.z - dz) * k]];
}

/** Places the cases, paths, gardens, banks, coast, open ground and forest of the island. */
function planIsland(rng: Rng): IslandPlan {
  const houses = [...CASES.map((c) => placeHouse(c)), placeHouse(GWO_RAKO, YARD)];
  const paths = houses.map((h) => toYard(h.door, h.yard)).filter((p) => p !== null);
  // Gwo Rako's track from his yard down to the ford, where he waits on pages 2, 4 and 7.
  const [fx, fz] = SPOTS.ford;
  const k = (YARD.radius - 0.3) / Math.hypot(fx - YARD.x, fz - YARD.z);
  paths.push([
    [YARD.x + (fx - YARD.x) * k, YARD.z + (fz - YARD.z) * k],
    [fx, fz],
  ]);
  const lines = sightlines(houses);
  const framed = stages();
  const plants: Placement[] = [];

  /** Accepts `p` if it keeps every rule; returns whether it was placed. */
  const tryPlace = (p: Placement): boolean => {
    const plant = PLANTS[p.flora];
    const r = plant.crown * p.scale;
    const foot = plant.stratum === "low" ? r * 0.6 : 0.35;
    if (islandHeight(p.x, p.z) < SHORE) return false;
    if (riverDistance(p.x, p.z) < 1.25 + foot) return false;
    if ([LAKOU, YARD].some((y) => Math.hypot(p.x - y.x, p.z - y.z) < y.radius + foot)) return false;
    if (paths.some(([a, b]) => toSegment(p.x, p.z, a, b) < PATH_HALF + foot)) return false;
    if (
      plant.stratum !== "low" &&
      KEEP_CLEAR.some(([s, d]) => Math.hypot(p.x - SPOTS[s][0], p.z - SPOTS[s][1]) < d + foot)
    )
      return false;
    if (
      p.flora !== "tuft" &&
      KEEP_BARE.some(([s, d]) => Math.hypot(p.x - SPOTS[s][0], p.z - SPOTS[s][1]) < d + foot)
    )
      return false;
    // Foliage above the eaves must clear the roofs; low plants may touch the walls, not the roof edge.
    const reach = plant.stratum === "low" ? r * 0.6 : r + 0.1;
    if (houses.some((h) => hitsHouse(h, p.x, p.z, reach, plant.stratum === "low" ? -0.3 : 0)))
      return false;
    if (hitsStock(p.x, p.z, plant.stratum === "low" ? foot + 0.2 : reach)) return false;
    // Palm fronds and forest crowns interlock; on the open ground the groves stay airy.
    const close = p.flora === "coconut" || islandHeight(p.x, p.z) > FOREST_LINE;
    const tree = plant.stratum === "tree" ? (close ? 0.6 : 0.85) : 0;
    for (const q of plants) {
      const other = PLANTS[q.flora];
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < 0.3) return false;
      const spacing = tree || 0.72;
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

  // Banks: stones at the water's edge, ferns, malanga and balisiers along it, a few bushes and trees
  // further up, from the source to the mouth.
  const stones: StonePlacement[] = [];
  // The dam's own stones sit low in the bed: bank stones keep their distance.
  const [dam] = damLine();
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
      if (islandHeight(...along(half)) < 0) continue;
      if (rng() < 0.32) {
        const [x, z] = along(half - 0.15 + rng() * 0.5);
        const kind = Math.floor(rng() * 3);
        const scale = 0.45 + rng() * rng() * 1.1;
        const stone = { kind, x, z, scale, yaw: yaw(), sink: 0.25 + rng() * 0.3 };
        if (
          !KEEP_CLEAR.slice(0, 2).some(
            ([s, d]) => Math.hypot(x - SPOTS[s][0], z - SPOTS[s][1]) < d * 0.6,
          ) &&
          Math.hypot(x - dam.x, z - dam.z) > DAM.half + 1.2 &&
          !stoneBlocks(stone, lines).length
        ) {
          stones.push(stone);
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

  /** Random points of the island above `low`, handed to `place` with their ground height. */
  const scatter = (
    tries: number,
    place: (x: number, z: number, h: number) => void,
    low = SHORE,
  ) => {
    for (let i = 0; i < tries; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * SCATTER_RADIUS;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const h = islandHeight(x, z);
      if (h > low) place(x, z, h);
    }
  };

  // Coast: weathered rocks along the waterline, half in the sea.
  scatter(
    500,
    (x, z, h) => {
      if (h > 0.35) return;
      const kind = Math.floor(rng() * 3);
      const scale = 0.7 + rng() * 0.9;
      const r = STONE_REACH[kind] * scale;
      if (stones.some((s) => Math.hypot(x - s.x, z - s.z) < r + STONE_REACH[s.kind] * s.scale))
        return;
      const stone = { kind, x, z, scale, yaw: yaw(), sink: 0.3 + rng() * 0.2 };
      if (!stoneBlocks(stone, lines).length) stones.push(stone);
    },
    -0.45,
  );

  // Trees of several heights: first the island's landmarks, flamboyants on the open ground and a
  // row of coconuts along the low coast; then fruit trees, and a second pass that thickens the
  // forest on the mountain. Shrubs only grow in the trees' shade, so the meadows stay open.
  let landmarks = 0;
  scatter(300, (x, z, h) => {
    if (landmarks >= 6 || h < 1.3 || h > FOREST_LINE) return;
    if (tryPlace({ flora: "flamboyant", x, z, scale: 0.9 + rng() * 0.25, yaw: yaw() })) landmarks++;
  });
  scatter(900, (x, z, h) => {
    if (h > 1.3) return;
    tryPlace({ flora: "coconut", x, z, scale: 0.8 + rng() * 0.4, yaw: yaw() });
  });
  scatter(1100, (x, z, h) => {
    const flora =
      h < 1.3
        ? "coconut"
        : h < FOREST_LINE
          ? pick(["mango", "breadfruit", "mango", "flamboyant"] as const)
          : pick(["breadfruit", "mango", "breadfruit"] as const);
    tryPlace({ flora, x, z, scale: 0.8 + rng() * 0.4, yaw: yaw() });
  });
  scatter(
    900,
    (x, z) => {
      tryPlace({
        flora: pick(["breadfruit", "mango"] as const),
        x,
        z,
        scale: 0.75 + rng() * 0.3,
        yaw: yaw(),
      });
    },
    FOREST_LINE,
  );
  const trees = plants.filter((p) => PLANTS[p.flora].stratum === "tree");
  scatter(1600, (x, z) => {
    const shade = trees.some(
      (t) => Math.hypot(x - t.x, z - t.z) < PLANTS[t.flora].crown * t.scale + 0.8,
    );
    if (!shade) return;
    const flora = pick(["hibiscus", "balisier", "fern", "malanga", "banana", "papaya"] as const);
    tryPlace({ flora, x, z, scale: 0.8 + rng() * 0.35, yaw: yaw() });
  });
  scatter(2200, (x, z) => tryPlace({ flora: "tuft", x, z, scale: 0.8 + rng() * 0.5, yaw: yaw() }));

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

/** Ground paint of the scenery: beaten earth of the yards, paths and house sites, damp bank soil. */
export function soilAt(x: number, z: number, toRiver: number, h: number): "earth" | "bank" | null {
  const { paths, houses } = islandPlan();
  if ([LAKOU, YARD].some((y) => Math.hypot(x - y.x, z - y.z) < y.radius + 0.4)) return "earth";
  if (paths.some(([a, b]) => toSegment(x, z, a, b) < PATH_HALF + 0.15)) return "earth";
  if (houses.some((hp) => hitsHouse(hp, x, z, 0.05, 0.25))) return "earth";
  if (toRiver > 0.85 && toRiver < 1.45 && h > 0.9) return "bank";
  return null;
}
