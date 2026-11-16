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
 * Opening compositions by screen aspect. Up to `BAND_ASPECT` the intro is a band at the top
 * (overlay.css): `tall` and `square` bring the whole tree down under it. Above, the intro is a
 * column on the right: `column` and `wide` leave it the sky beside the crown.
 */
export const OPENING: Record<"tall" | "square" | "column" | "wide", OpeningShot> = {
  tall: { back: 2, lift: 0.3, truck: 0, lookLift: 3.9, lookPan: 0 },
  square: { back: 11, lift: 0.3, truck: 0, lookLift: 6.3, lookPan: 0 },
  column: { back: 4.5, lift: 0.3, truck: 1.2, lookLift: 2, lookPan: -2.4 },
  wide: { back: 2, lift: 0.2, truck: 1.5, lookLift: 1.5, lookPan: -2.8 },
};

const TALL_ASPECT = 0.8;
/** Same limit as the intro band's media query in overlay.css. */
export const BAND_ASPECT = 1.2;
const WIDE_ASPECT = 1.6;
/** Climb value from which the camera is back on the spiral (the first card hangs at 0.2). */
export const OPENING_END = 0.14;

/** Blends two shots. */
function mix(a: OpeningShot, b: OpeningShot, k: number): OpeningShot {
  return {
    back: lerp(a.back, b.back, k),
    lift: lerp(a.lift, b.lift, k),
    truck: lerp(a.truck, b.truck, k),
    lookLift: lerp(a.lookLift, b.lookLift, k),
    lookPan: lerp(a.lookPan, b.lookPan, k),
  };
}

/** The opening composition for a screen aspect; it changes layout, hence shot, at `BAND_ASPECT`. */
export function openingShot(aspect: number): OpeningShot {
  if (aspect <= BAND_ASPECT) {
    const k = clamp((aspect - TALL_ASPECT) / (BAND_ASPECT - TALL_ASPECT), 0, 1);
    return mix(OPENING.tall, OPENING.square, k);
  }
  const k = clamp((aspect - BAND_ASPECT) / (WIDE_ASPECT - BAND_ASPECT), 0, 1);
  return mix(OPENING.column, OPENING.wide, k);
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
 * inside 0.8 of the horizontal field, far enough from the camera to clear the shelf, not deep
 * under the crown, and not behind one of the `screens` (x, z, radius: plants, the Konteur) as
 * seen from the camera.
 */
export function openingStage(
  aspect: () => number,
  screens: readonly (readonly [number, number, number])[] = [],
): StageTest {
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
    if (z > -6.2 || depth < 8.5 || side + r > depth * Math.tan(half) * 0.8) return false;
    const reach = Math.hypot(x - cx, z - cz);
    return screens.every(([sx, sz, sr]) => {
      const along = ((sx - cx) * (x - cx) + (sz - cz) * (z - cz)) / reach;
      if (along <= 0 || along >= reach) return true;
      const off = Math.abs(((sx - cx) * (z - cz) - (sz - cz) * (x - cx)) / reach);
      // What matters is the gap on screen: scale the miss to the target's distance.
      return (off * reach) / along > sr + r;
    });
  };
}
