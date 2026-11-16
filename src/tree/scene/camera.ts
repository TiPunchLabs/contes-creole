import type * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";
import { fitFov } from "@shared/three/stage";

/** Climb progress (t ∈ [0, 1]) at which the card of book `index` hangs, spread over [0.2, 0.88]. */
export const cardT = (index: number, count: number): number =>
  count <= 1 ? 0.5 : 0.2 + index * (0.68 / (count - 1));

/** Spiral camera path around the tree (v14); writes position and look-at target, returns the angle. */
export function hubCam(t: number, out: THREE.Vector3, look: THREE.Vector3): number {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 20 - t * 4;
  const y = 1.3 + t * 6.4;
  out.set(Math.cos(a) * r, y, Math.sin(a) * r);
  look.set(0, y + 2.2 - t * 1.2, 0);
  return a;
}

/** How the opening view departs from the spiral's first shot, in metres. */
export interface OpeningShot {
  /** Camera pulled back from the trunk. */
  back: number;
  /** Camera raised. */
  lift: number;
  /** Camera moved sideways, towards the Konteur's side of the clearing. */
  truck: number;
  /** Look-at point raised: the tree comes down in the frame. */
  lookLift: number;
  /** Look-at point moved sideways; negative puts the tree left of the centre. */
  lookPan: number;
}

/**
 * Opening compositions: `wide` leaves the right of the frame to the intro column, `tall` brings the
 * tree down under the intro band of portrait screens. Aspects in between blend the two.
 */
export const OPENING: { wide: OpeningShot; tall: OpeningShot } = {
  wide: { back: 2, lift: 0.2, truck: 1.5, lookLift: 1.5, lookPan: -2.8 },
  tall: { back: 2, lift: 0.3, truck: 0, lookLift: 3.9, lookPan: 0 },
};

const TALL_ASPECT = 0.8;
const WIDE_ASPECT = 1.4;
/** Climb value from which the camera is back on the spiral (the first card hangs at 0.2). */
export const OPENING_END = 0.14;

/** The opening composition for a screen aspect. */
export function openingShot(aspect: number): OpeningShot {
  const k = clamp((aspect - TALL_ASPECT) / (WIDE_ASPECT - TALL_ASPECT), 0, 1);
  const { wide, tall } = OPENING;
  return {
    back: lerp(tall.back, wide.back, k),
    lift: lerp(tall.lift, wide.lift, k),
    truck: lerp(tall.truck, wide.truck, k),
    lookLift: lerp(tall.lookLift, wide.lookLift, k),
    lookPan: lerp(tall.lookPan, wide.lookPan, k),
  };
}

/**
 * The camera of the tree: the opening composition at the foot of the climb, easing into the
 * spiral, which it follows exactly from `OPENING_END` on. Same outputs as `hubCam`.
 */
export function treeCam(
  t: number,
  aspect: number,
  out: THREE.Vector3,
  look: THREE.Vector3,
): number {
  const a = hubCam(t, out, look);
  const w = 1 - smoothstep(clamp(t / OPENING_END, 0, 1));
  if (w <= 0) return a;
  const shot = openingShot(aspect);
  // Radial (away from the trunk) and tangent axes of the spiral at this angle.
  const rx = Math.cos(a);
  const rz = Math.sin(a);
  out.x += (rx * shot.back - rz * shot.truck) * w;
  out.z += (rz * shot.back + rx * shot.truck) * w;
  out.y += shot.lift * w;
  look.x += -rz * shot.lookPan * w;
  look.z += rx * shot.lookPan * w;
  look.y += shot.lookLift * w;
  return a;
}

/** Whether a disc of radius `r` at (x, z) stands on the stage (see `openingStage`). */
export type StageTest = (x: number, z: number, r: number) => boolean;

/**
 * The part of the clearing the opening view shows in front of the trunk, for the current aspect:
 * inside 0.8 of the horizontal field, far enough from the camera to clear the shelf.
 */
export function openingStage(aspect: () => number): StageTest {
  return (x, z, r) => {
    const a = aspect();
    const shot = openingShot(a);
    const half = Math.atan(Math.tan((fitFov(50, a) * Math.PI) / 360) * a);
    const cx = shot.truck;
    const cz = -(20 + shot.back);
    const dx = shot.lookPan - cx;
    const dz = -cz;
    const len = Math.hypot(dx, dz);
    const depth = ((x - cx) * dx + (z - cz) * dz) / len;
    const side = Math.abs(((x - cx) * dz - (z - cz) * dx) / len);
    return z < -4 && depth > 8.5 && side + r < depth * Math.tan(half) * 0.8;
  };
}
