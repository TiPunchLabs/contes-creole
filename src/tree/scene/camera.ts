import type * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";
import { fitFov } from "@shared/three/stage";
import { groundHeight } from "./ground";

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

/** Same limit as the intro band's media query in overlay.css. */
export const BAND_ASPECT = 1.2;
/** Climb value from which the camera is back on the spiral (the first card hangs at 0.2). */
export const OPENING_END = 0.14;

const KONTEUR_Z = -12.5;
/** Where the Konteur sits on the ground (x, z) for a screen aspect: further in on narrow screens. */
export function konteurSpot(aspect: number): [number, number] {
  return [lerp(1.9, 4.4, clamp((aspect - 0.5) / 1.1, 0, 1)), KONTEUR_Z];
}

/** A value keyed on the screen aspect, blended between its keys. */
function keyed(aspect: number, keys: readonly (readonly [number, number])[]): number {
  if (aspect <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [to, value] = keys[i];
    if (aspect <= to) {
      const [from, before] = keys[i - 1];
      return lerp(before, value, (aspect - from) / (to - from));
    }
  }
  return keys[keys.length - 1][1];
}

/** How much a screen is a phone on its side: 0 on tall or portrait screens, 1 at 420 px high. */
export function shortness(aspect: number, height: number): number {
  return clamp((560 - height) / 140, 0, 1) * clamp((aspect - 1.3) / 0.3, 0, 1);
}

/**
 * Share of the screen's height kept clear above the crown and below the Konteur's feet. Above:
 * the intro band (about 270 px) up to `BAND_ASPECT`, then less and less as the column layout
 * widens, so the two layouts agree where they meet. Below: the shelf, its margin and a gap.
 */
export function clearances(aspect: number, height: number): { top: number; bottom: number } {
  const band = Math.min(0.42, 270 / height);
  const top = lerp(band, 0.05, clamp((aspect - BAND_ASPECT) / 0.25, 0, 1));
  const bottom = Math.min(0.4, (66 + clamp(height * 0.03, 12, 26) + 18) / height);
  return { top, bottom };
}

/** Crown points that must stay in view: its top, and its near rim, lower but closer. */
const CROWN: readonly (readonly [number, number, number])[] = [
  [0, 13.6, 0],
  [0, 11.6, -6.5],
  [-5.5, 11.4, -3],
  [5.5, 11.4, -3],
];

/** Height on screen (0 top, 1 bottom) of a world point for a camera at `cam` looking at `look`. */
function screenY(
  p: readonly [number, number, number],
  cam: readonly [number, number, number],
  look: readonly [number, number, number],
  tanHalf: number,
): number {
  let fx = look[0] - cam[0];
  let fy = look[1] - cam[1];
  let fz = look[2] - cam[2];
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = forward × up, up' = right × forward.
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const vx = p[0] - cam[0];
  const vy = p[1] - cam[1];
  const vz = p[2] - cam[2];
  const depth = vx * fx + vy * fy + vz * fz;
  return (1 - (vx * ux + vy * uy + vz * uz) / depth / tanHalf) / 2;
}

let solved: { aspect: number; height: number; shot: OpeningShot } | null = null;

/**
 * The opening composition for a screen (aspect, height in CSS px). The sideways placement is keyed
 * on the aspect: centred under the band, left of the column. Distance and tilt are solved: the
 * camera backs off until the whole crown fits under what the intro needs, with the Konteur's feet
 * resting just above the shelf. Everything is continuous in width and height, so resizing a
 * window never makes the camera jump, across the change of layout included.
 */
export function openingShot(aspect: number, height = 900): OpeningShot {
  if (solved && solved.aspect === aspect && solved.height === height) return solved.shot;
  const short = shortness(aspect, height);
  const lift = 0.3;
  const truck = lerp(
    keyed(aspect, [
      [1, 0],
      [BAND_ASPECT, 0.8],
      [1.3, 1.2],
      [1.6, 1.5],
    ]),
    1.5,
    short,
  );
  const lookPan = lerp(
    keyed(aspect, [
      [1, 0],
      [BAND_ASPECT, -1.8],
      [1.3, -2.4],
      [1.6, -2.8],
    ]),
    -3.2,
    short,
  );
  const { top, bottom } = clearances(aspect, height);
  const tanHalf = Math.tan((fitFov(50, aspect) * Math.PI) / 360);
  const [kx, kz] = konteurSpot(aspect);
  const feet: [number, number, number] = [kx, groundHeight(kx, kz), kz];
  const y = 1.3 + lift;
  /** For a camera `back` metres further, the tilt that puts the Konteur's feet on their line. */
  const tilt = (back: number): number => {
    const cam: [number, number, number] = [truck, y, -(20 + back)];
    let lo = -12;
    let hi = 30;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (screenY(feet, cam, [lookPan, 3.5 + mid, 0], tanHalf) < 1 - bottom) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  /** Whether the whole crown then sits below the top clearance. */
  const fits = (back: number): boolean => {
    const cam: [number, number, number] = [truck, y, -(20 + back)];
    const look: [number, number, number] = [lookPan, 3.5 + tilt(back), 0];
    return CROWN.every((p) => screenY(p, cam, look, tanHalf) >= top);
  };
  let near = -4;
  let far = 60;
  for (let i = 0; i < 26; i++) {
    const mid = (near + far) / 2;
    if (fits(mid)) far = mid;
    else near = mid;
  }
  const shot: OpeningShot = { back: far, lift, truck, lookLift: tilt(far), lookPan };
  solved = { aspect, height, shot };
  return shot;
}

/**
 * The camera of the tree: the opening composition at the foot of the climb, easing into the
 * spiral, which it follows exactly from `OPENING_END` on. Same outputs as `hubCam`. `height` is
 * the screen's, in CSS px.
 */
export function treeCam(
  t: number,
  aspect: number,
  out: THREE.Vector3,
  look: THREE.Vector3,
  height = 900,
): number {
  const a = hubCam(t, out, look);
  const w = 1 - smoothstep(clamp(t / OPENING_END, 0, 1));
  if (w <= 0) return a;
  const shot = openingShot(aspect, height);
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
 * inside 0.8 of the horizontal field, no nearer the camera than the Konteur (the shelf), not deep
 * under the crown, and not behind one of the `screens` (x, z, radius: plants, the Konteur) as
 * seen from the camera. `height` is the screen's, in CSS px (short landscape screens).
 */
export function openingStage(
  aspect: () => number,
  screens: readonly (readonly [number, number, number])[] = [],
  height: () => number = () => 900,
): StageTest {
  return (x, z, r) => {
    const a = aspect();
    const shot = openingShot(a, height());
    const half = Math.atan(Math.tan((fitFov(50, a) * Math.PI) / 360) * a);
    const cx = shot.truck;
    const cz = -(20 + shot.back);
    const dx = shot.lookPan - cx;
    const dz = -cz;
    const len = Math.hypot(dx, dz);
    const depth = ((x - cx) * dx + (z - cz) * dz) / len;
    const side = Math.abs(((x - cx) * dz - (z - cz) * dx) / len);
    // Nearer the camera than the Konteur, a critter would stand lower on screen than he does:
    // behind the shelf.
    if (z > -6.2 || z < KONTEUR_Z + r || side + r > depth * Math.tan(half) * 0.8) return false;
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
