import * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";
import type { PageEnv, Shot } from "../staging";
import { spotPoint, type Spot } from "./island/spots";
import { islandHeight } from "./island/terrain";

const WEIGHTS = [
  "night",
  "mist",
  "water",
  "rain",
  "rainbow",
  "wilt",
  "empty",
  "branches",
  "dam",
  "tank",
  "helpers",
] as const;
type Weight = (typeof WEIGHTS)[number];

export interface MixedShot {
  focus: THREE.Vector3;
  azimuth: number;
  elevation: number;
  distance: number;
}

export interface MixedEnv extends Record<Weight, number> {
  shot: MixedShot;
  zenith: THREE.Color;
  horizon: THREE.Color;
  sunAzimuth: number;
  sunElevation: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  kalbas: number;
  barrels: number;
  jars: number;
  bird: { spot: Spot; lift: number };
  crab: Spot | null;
  /** Page whose characters apply (switches at mid-way). */
  anchorPage: number;
}

const ISLAND_FOCUS = new THREE.Vector3(0, 2, 0);
const PORTRAIT_PULLBACK = 1.25;
const CAMERA_CLEARANCE = 1.2;
const scratch = new THREE.Vector3();

/** Pages around a fractional page: the two to blend and the eased blend factor. */
export function pageSpan(count: number, pageF: number): { i0: number; i1: number; f: number } {
  const last = count - 1;
  const i0 = Math.floor(clamp(pageF, 0, last));
  const i1 = Math.min(i0 + 1, last);
  return { i0, i1, f: i0 === i1 ? 0 : smoothstep(clamp(pageF - i0, 0, 1)) };
}

/** Interpolates two angles in degrees along the shortest arc. */
export function lerpAngle(from: number, to: number, f: number): number {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta * f;
}

/** Point a shot looks at: the island centre or one unit above a spot. */
function focusPoint(focus: Shot["focus"], out: THREE.Vector3): THREE.Vector3 {
  if (focus === "island") return out.copy(ISLAND_FOCUS);
  spotPoint(focus, out);
  return out.setY(out.y + 1);
}

/** Interpolated staging between pages `i0` and `i1` at blend `f`. */
export function mixEnv(envs: PageEnv[], i0: number, i1: number, f: number): MixedEnv {
  const pa = envs[i0];
  const pb = envs[i1];
  const num = (va: number, vb: number): number => lerp(va, vb, f);
  const col = (ca: string, cb: string): THREE.Color =>
    new THREE.Color(ca).lerp(new THREE.Color(cb), f);
  const anchorPage = f < 0.5 ? i0 : i1;
  const anchor = envs[anchorPage];
  const weights = Object.fromEntries(WEIGHTS.map((k) => [k, num(pa[k], pb[k])])) as Record<
    Weight,
    number
  >;
  return {
    ...weights,
    shot: {
      focus: focusPoint(pa.shot.focus, new THREE.Vector3()).lerp(
        focusPoint(pb.shot.focus, scratch),
        f,
      ),
      azimuth: lerpAngle(pa.shot.azimuth, pb.shot.azimuth, f),
      elevation: num(pa.shot.elevation, pb.shot.elevation),
      distance: num(pa.shot.distance, pb.shot.distance),
    },
    zenith: col(pa.sky[0], pb.sky[0]),
    horizon: col(pa.sky[1], pb.sky[1]),
    sunAzimuth: lerpAngle(pa.sun[0], pb.sun[0], f),
    sunElevation: num(pa.sun[1], pb.sun[1]),
    sunColor: col(pa.sun[2], pb.sun[2]),
    sunIntensity: num(pa.sun[3], pb.sun[3]),
    kalbas: Math.round(num(pa.kalbas, pb.kalbas)),
    barrels: Math.round(num(pa.barrels, pb.barrels)),
    jars: Math.round(num(pa.jars, pb.jars)),
    bird: { spot: anchor.bird[0], lift: anchor.bird[1] },
    crab: anchor.crab,
    anchorPage,
  };
}

/** Unit vector for an azimuth/elevation pair in degrees (0° azimuth = towards +z). */
function orbit(azimuth: number, elevation: number, out: THREE.Vector3): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
}

/** Camera position and look-at for a shot; portrait screens step back, never under the ground. */
export function shotCamera(
  shot: MixedShot,
  aspect: number,
  out: THREE.Vector3,
  look: THREE.Vector3,
): void {
  const distance = shot.distance * (aspect < 1 ? PORTRAIT_PULLBACK : 1);
  look.copy(shot.focus);
  orbit(shot.azimuth, shot.elevation, out).multiplyScalar(distance).add(shot.focus);
  out.y = Math.max(out.y, islandHeight(out.x, out.z) + CAMERA_CLEARANCE);
}

/** Direction towards the sun (or moon) of a mixed env. */
export function sunDirection(env: MixedEnv, out: THREE.Vector3): THREE.Vector3 {
  return orbit(env.sunAzimuth, env.sunElevation, out);
}

const CARD_SHIFT_WIDE = 0.14;
const CARD_SHIFT_TALL = 0.16;

/**
 * View offset (pixels) that slides the framed subject away from the reading card:
 * right of it on landscape screens, above it on portrait ones (card at the bottom).
 */
export function frameOffset(width: number, height: number): [number, number] {
  return width >= height ? [-width * CARD_SHIFT_WIDE, 0] : [0, height * CARD_SHIFT_TALL];
}
