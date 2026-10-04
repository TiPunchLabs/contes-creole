import * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";
import type { PageEnv } from "../staging";
import { meander, station, valleyHeight } from "./terrain";

type Weight = "water" | "stars" | "rain" | "glow" | "warm" | "dam" | "tank" | "spring" | "empty";

export interface MixedEnv extends Record<Weight, number> {
  kalbas: number;
  top: THREE.Color;
  bot: THREE.Color;
  /** Moon offset x, y, z and scale. */
  moon: [number, number, number, number];
  moonColor: THREE.Color;
  bird: THREE.Vector3;
  crab: THREE.Vector3 | null;
  /** Page whose characters and spring apply (switches at mid-way). */
  anchorPage: number;
  anchorHasSpring: boolean;
}

const a = new THREE.Vector3();
const b = new THREE.Vector3();

/** Camera position and look-at along the river for a fractional page (v13 `worldCam`). */
export function worldCam(
  envs: PageEnv[],
  pageF: number,
  out: THREE.Vector3,
  look: THREE.Vector3,
): { i0: number; i1: number; f: number } {
  const last = envs.length - 1;
  const i0 = Math.floor(clamp(pageF, 0, last));
  const i1 = Math.min(i0 + 1, last);
  const f = smoothstep(clamp(pageF - i0, 0, 1));
  const eye = (i: number, v: THREE.Vector3): THREE.Vector3 => {
    const z = station(i);
    return v.set(meander(z) + 1.4, envs[i].water + 2.6, z + 8.5);
  };
  const aim = (i: number, v: THREE.Vector3): THREE.Vector3 => {
    const z = station(i) - 10;
    return v.set(meander(z), envs[i].water + 0.4, z);
  };
  out.copy(eye(i0, a)).lerp(eye(i1, b), f);
  look.copy(aim(i0, a)).lerp(aim(i1, b), f);
  return { i0, i1, f };
}

/** Interpolated staging between two pages (v13 `mixEnv`). */
export function mixEnv(envs: PageEnv[], i0: number, i1: number, f: number): MixedEnv {
  const pa = envs[i0];
  const pb = envs[i1];
  const num = (k: Weight): number => lerp(pa[k] ?? 0, pb[k] ?? 0, f);
  const col = (ca: string, cb: string): THREE.Color =>
    new THREE.Color(ca).lerp(new THREE.Color(cb), f);
  const anchorPage = f < 0.5 ? i0 : i1;
  const e = envs[anchorPage];
  const z = station(anchorPage);
  let crab: THREE.Vector3 | null = null;
  if (e.crab) {
    crab = new THREE.Vector3(meander(z) + e.crab[0], 0, z + e.crab[1]);
    crab.y = Math.max(valleyHeight(crab.x, crab.z), e.water - 0.2) + 0.05;
  }
  return {
    water: num("water"),
    stars: num("stars"),
    rain: num("rain"),
    glow: num("glow"),
    warm: num("warm"),
    dam: num("dam"),
    tank: num("tank"),
    spring: num("spring"),
    empty: num("empty"),
    kalbas: Math.round(lerp(pa.kalbas, pb.kalbas, f)),
    top: col(pa.sky[0], pb.sky[0]),
    bot: col(pa.sky[1], pb.sky[1]),
    moon: [
      lerp(pa.moon[0], pb.moon[0], f),
      lerp(pa.moon[1], pb.moon[1], f),
      lerp(pa.moon[2], pb.moon[2], f),
      lerp(pa.moon[4], pb.moon[4], f),
    ],
    moonColor: col(pa.moon[3], pb.moon[3]),
    bird: new THREE.Vector3(meander(z) + e.bird[0], e.water + e.bird[1], z + e.bird[2]),
    crab,
    anchorPage,
    anchorHasSpring: Boolean(e.spring || e.dam),
  };
}
