import * as THREE from "three";
import { clamp, smoothstep } from "@shared/math";

/** Island radius in world units; the coast sits at about 0.85 of it. */
export const ISLAND_RADIUS = 20;

const MOUNTAIN = { x: -1, z: -15 };

/** River centre line from the source (back, on the mountain) to the mouth (front, in the sea). */
const RIVER = new THREE.SplineCurve(
  [
    [-2, -11],
    [-3.5, -7],
    [-2, -3],
    [0.5, 0.5],
    [0, 4],
    [1.5, 8],
    [3, 12],
    [4.5, 17],
    [6, 22],
  ].map(([x, z]) => new THREE.Vector2(x, z)),
);
const RIVER_SAMPLES = RIVER.getSpacedPoints(200);

/** River centre at `t` in [0, 1] (0 = source, 1 = mouth); `x` is world x, `y` is world z. */
export function riverPoint(t: number, out = new THREE.Vector2()): THREE.Vector2 {
  return RIVER.getPointAt(clamp(t, 0, 1), out);
}

/** Horizontal distance from (x, z) to the river centre line. */
export function riverDistance(x: number, z: number): number {
  let best = Infinity;
  for (const p of RIVER_SAMPLES) best = Math.min(best, (p.x - x) ** 2 + (p.y - z) ** 2);
  return Math.sqrt(best);
}

/** Low-frequency rolling hills in [-1.35, 1.35]. */
const ridges = (x: number, z: number): number =>
  Math.sin(x * 0.45 + z * 0.3) * 0.5 +
  Math.sin(x * 1.1 - z * 0.8) * 0.25 +
  Math.sin(x * 0.2 - z * 0.37) * 0.6;

/** Ground height: a plateau falling into the sea, a mountain at the back and the carved riverbed. */
export function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z * 1.1) / ISLAND_RADIUS;
  const land = 1 - smoothstep(clamp((r - 0.6) / 0.45, 0, 1));
  const toRiver = riverDistance(x, z);
  const mountain = 9 * Math.exp(-((x - MOUNTAIN.x) ** 2 + (z - MOUNTAIN.z) ** 2) / 40);
  const hills = ridges(x, z) * 0.5 * land * smoothstep(clamp(toRiver / 4, 0, 1));
  const carve = (1 - smoothstep(clamp(toRiver / 2.2, 0, 1))) * land;
  return land * 3 - 1.3 + mountain + hills - carve;
}
