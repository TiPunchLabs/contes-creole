export type LangCode = "kr" | "fr";

/** A tale hanging from the Pyébwa a Sav. Only `ready` tales can be entered. */
export interface Tale {
  id: string;
  title: string;
  sub: string;
  theme: string;
  ready: boolean;
}

/** Page text: `t` title, `b` body (dialogue lines start with "– "), `g` short French gloss. */
export interface PageText {
  t: string;
  b: string;
  g?: string;
}

/** Moon placement: x, y, z offset from camera, colour, scale. */
export type Moon = [number, number, number, string, number];

/**
 * Scene parameters for one page. The world interpolates them between pages.
 * Numeric fields are 0..1 weights unless noted.
 */
export interface PageEnv {
  /** Sky gradient: [top, bottom]. */
  sky: [string, string];
  /** Water level offset (world units, negative = river drying up). */
  water: number;
  moon: Moon;
  stars: number;
  rain: number;
  glow: number;
  /** Ti Kannot position relative to the river station: [x, y, z]. */
  bird: [number, number, number];
  /** Gwo Rako position relative to the river station: [x, z], or absent. */
  crab: [number, number] | null;
  /** Number of calabashes stacked next to Gwo Rako. */
  kalbas: number;
  dam: number;
  warm: number;
  spring?: number;
  tank?: number;
  empty?: number;
}

export interface Page {
  label: string;
  kr: PageText;
  fr: PageText;
  env: PageEnv;
}
