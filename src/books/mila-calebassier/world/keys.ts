import * as THREE from "three";

/**
 * A light key: the colours a page is painted in. Intensities are in "albedo units" (1 shows a
 * surface in its painted colour); the world converts them to Three.js light intensities.
 */
export interface LightKey {
  /** Sky wash: zenith, horizon, cloud blooms and their strength. */
  top: string;
  low: string;
  cloud: string;
  cloudK: number;
  /** Tint of the painted (unlit) layers. */
  ambient: string;
  /** Hemisphere light: sky and ground colours, strength. */
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  /** Sun or moon: colour, strength, direction it comes from (x east, y up, z south). */
  sun: string;
  sunK: number;
  sunFrom: readonly [number, number, number];
  /** Aerial perspective: colour of the air and its density per metre. */
  air: string;
  airK: number;
  /** Tint and night windows of the distant hills. */
  hills: string;
  hillLights: number;
}

export type KeyName = "dusk" | "night" | "dark" | "inside" | "dawn";

/** The five keys of the tale (palette of the brief, spec 02). */
export const KEYS: Record<KeyName, LightKey> = {
  // Pages 1-2: sage, jade and lavender under an apricot horizon.
  dusk: {
    top: "#8d86b6",
    low: "#f1c09c",
    cloud: "#f3b9a6",
    cloudK: 0.75,
    ambient: "#e9d2cc",
    hemiSky: "#d9cbe6",
    hemiGround: "#a48f78",
    hemi: 0.78,
    sun: "#ffc998",
    sunK: 0.42,
    sunFrom: [-0.8, 0.35, 0.45],
    air: "#e9c9c0",
    airK: 0.013,
    hills: "#cdbfd6",
    hillLights: 0.25,
  },
  // Pages 3-6, 10-11: indigo and blue-green; the gold comes from the calabashes.
  night: {
    top: "#1b2750",
    low: "#3d5a78",
    cloud: "#6474a8",
    cloudK: 0.7,
    ambient: "#56689a",
    hemiSky: "#6f86c4",
    hemiGround: "#33485a",
    hemi: 0.42,
    sun: "#a9bdf0",
    sunK: 0.2,
    sunFrom: [0.5, 0.8, 0.4],
    air: "#3b4f86",
    airK: 0.014,
    hills: "#46588a",
    hillLights: 1,
  },
  // Pages 7-9: ink blue and slate; forms stay readable, only just.
  dark: {
    top: "#101a36",
    low: "#22304e",
    cloud: "#34446c",
    cloudK: 0.55,
    ambient: "#2c3856",
    hemiSky: "#44557f",
    hemiGround: "#1c2836",
    hemi: 0.24,
    sun: "#7f93c8",
    sunK: 0.1,
    sunFrom: [0.5, 0.8, 0.4],
    air: "#1b2744",
    airK: 0.022,
    hills: "#232f4e",
    hillLights: 0.12,
  },
  // Pages 6 and 8: the bedroom, lit only by the calabash; the night outside.
  inside: {
    top: "#16224a",
    low: "#2f4868",
    cloud: "#44527a",
    cloudK: 0.5,
    ambient: "#3e4c78",
    hemiSky: "#5a6792",
    hemiGround: "#4a3e3a",
    hemi: 0.2,
    sun: "#a9bdf0",
    sunK: 0.06,
    sunFrom: [0.5, 0.8, 0.4],
    air: "#33457a",
    airK: 0.014,
    hills: "#3a4a78",
    hillLights: 0.8,
  },
  // Page 12: peach and soft green, warm diffuse light.
  dawn: {
    top: "#a9b4dc",
    low: "#f6c7ab",
    cloud: "#fbdcc6",
    cloudK: 0.8,
    ambient: "#fff1e4",
    hemiSky: "#f3e3e0",
    hemiGround: "#b9a587",
    hemi: 0.86,
    sun: "#ffd9b0",
    sunK: 0.4,
    sunFrom: [0.85, 0.4, 0.3],
    air: "#f3d9cf",
    airK: 0.013,
    hills: "#e3d3dc",
    hillLights: 0,
  },
};

/** A key with its colours resolved, ready to be mixed and applied. */
export interface MixedKey {
  top: THREE.Color;
  low: THREE.Color;
  cloud: THREE.Color;
  cloudK: number;
  ambient: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemi: number;
  sun: THREE.Color;
  sunK: number;
  sunFrom: THREE.Vector3;
  air: THREE.Color;
  airK: number;
  hills: THREE.Color;
  hillLights: number;
}

const COLOURS = [
  "top",
  "low",
  "cloud",
  "ambient",
  "hemiSky",
  "hemiGround",
  "sun",
  "air",
  "hills",
] as const;
const NUMBERS = ["cloudK", "hemi", "sunK", "airK", "hillLights"] as const;

/** An empty mix to be filled by `mixKeys`. */
export function createMixedKey(): MixedKey {
  return {
    top: new THREE.Color(),
    low: new THREE.Color(),
    cloud: new THREE.Color(),
    cloudK: 0,
    ambient: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemi: 0,
    sun: new THREE.Color(),
    sunK: 0,
    sunFrom: new THREE.Vector3(),
    air: new THREE.Color(),
    airK: 0,
    hills: new THREE.Color(),
    hillLights: 0,
  };
}

const scratch = new THREE.Color();

/** Blends two keys (`k` 0 gives `a`, 1 gives `b`) into `out`. */
export function mixKeys(a: KeyName, b: KeyName, k: number, out: MixedKey): MixedKey {
  const ka = KEYS[a];
  const kb = KEYS[b];
  for (const name of COLOURS) out[name].set(ka[name]).lerp(scratch.set(kb[name]), k);
  for (const name of NUMBERS) out[name] = ka[name] + (kb[name] - ka[name]) * k;
  out.sunFrom
    .set(...ka.sunFrom)
    .lerp(new THREE.Vector3(...kb.sunFrom), k)
    .normalize();
  return out;
}
