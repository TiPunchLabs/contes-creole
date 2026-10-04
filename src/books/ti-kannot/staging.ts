// Page-by-page staging of « Ti Kannot é Gwo Rako », keyed by story page id (from mockup v13).

/** Moon placement: x, y, z offset from the camera, colour, scale. */
export type Moon = [number, number, number, string, number];

/** Scene parameters of one page; the world interpolates them between pages. Weights are 0..1. */
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
  /** Gwo Rako position relative to the river station: [x, z], or null when absent. */
  crab: [number, number] | null;
  /** Number of calabashes stacked next to Gwo Rako. */
  kalbas: number;
  dam: number;
  warm: number;
  spring?: number;
  tank?: number;
  empty?: number;
}

export const STAGING: Record<string, PageEnv> = {
  "ye-krik": {
    sky: ["#0b1f33", "#2f8a8c"],
    water: 0,
    moon: [-14, 9, -60, "#f6d38a", 1],
    stars: 0.35,
    rain: 0,
    glow: 1,
    bird: [-3.4, 1.9, -4.5],
    crab: null,
    kalbas: 0,
    dam: 0,
    warm: 0.4,
  },
  "ti-kannot-e-gwo-rako": {
    sky: ["#0d2b3e", "#3aa2a0"],
    water: 0,
    moon: [16, 12, -70, "#fff1c8", 0.8],
    stars: 0.1,
    rain: 0,
    glow: 0.8,
    bird: [-3, 1.7, -3.5],
    crab: [4.8, -5],
    kalbas: 0,
    dam: 0,
    warm: 0.5,
  },
  "on-lide-gwo-rako": {
    sky: ["#1a1633", "#c36a3f"],
    water: -0.15,
    moon: [10, 5, -70, "#ffb266", 1.3],
    stars: 0.3,
    rain: 0,
    glow: 0.6,
    bird: [-2.8, 1.8, -3.5],
    crab: [4.6, -5.5],
    kalbas: 6,
    dam: 0,
    warm: 0.8,
  },
  "larivye-la-ka-desann": {
    sky: ["#2a1c18", "#d08a45"],
    water: -0.85,
    moon: [0, 16, -80, "#fff0c0", 1.1],
    stars: 0,
    rain: 0,
    glow: 0.2,
    bird: [-2.6, 1.4, -3],
    crab: [5, -6],
    kalbas: 14,
    dam: 0,
    warm: 1,
  },
  "sa-ti-kannot-jwenn": {
    sky: ["#0b2a2e", "#4aa08a"],
    water: -1,
    moon: [-18, 10, -60, "#f6e2a8", 0.9],
    stars: 0.2,
    rain: 0,
    glow: 0.9,
    bird: [-4.4, 1.6, -8],
    crab: null,
    kalbas: 0,
    dam: 0,
    warm: 0.3,
    spring: 1,
  },
  "gwo-rako-vle-sous-la": {
    sky: ["#132433", "#5a8a80"],
    water: -1.05,
    moon: [-10, 13, -70, "#f6e2a8", 0.9],
    stars: 0.2,
    rain: 0,
    glow: 0.6,
    bird: [-4.4, 1.5, -8],
    crab: [-1.6, -6.5],
    kalbas: 6,
    dam: 1,
    warm: 0.4,
    spring: 1,
  },
  "on-mache": {
    sky: ["#06101f", "#213a5a"],
    water: -1.1,
    moon: [12, 14, -70, "#e8e6ff", 1],
    stars: 1,
    rain: 0,
    glow: 1,
    bird: [-3.2, 1.6, -3.5],
    crab: [4.2, -5],
    kalbas: 6,
    dam: 0,
    warm: 0.1,
  },
  "demen-maten": {
    sky: ["#2e1d14", "#e0995a"],
    water: -1.35,
    moon: [-6, 18, -80, "#fff4d0", 1.2],
    stars: 0,
    rain: 0,
    glow: 0.1,
    bird: [-2.8, 1.3, -3],
    crab: [4.8, -5.5],
    kalbas: 20,
    dam: 0,
    warm: 1,
  },
  "sa-dlo-la-ka-aprann": {
    sky: ["#0c2b33", "#3f9c8e"],
    water: -0.9,
    moon: [-16, 11, -60, "#f6e2a8", 0.9],
    stars: 0.25,
    rain: 0,
    glow: 1,
    bird: [-4.4, 1.6, -8],
    crab: [-1.2, -7],
    kalbas: 0,
    dam: 0,
    warm: 0.4,
    spring: 1,
  },
  "denye-leson-la": {
    sky: ["#2c1a10", "#e6a45a"],
    water: -1,
    moon: [4, 19, -80, "#fff8dc", 1.3],
    stars: 0,
    rain: 0,
    glow: 0.15,
    bird: [-2.8, 1.6, -3.5],
    crab: [4.8, -5.5],
    kalbas: 20,
    dam: 0,
    warm: 1,
    empty: 1,
  },
  "on-nouvo-rezev": {
    sky: ["#12283a", "#4d9ea4"],
    water: -0.4,
    moon: [14, 12, -70, "#fff1c8", 0.8],
    stars: 0.15,
    rain: 0,
    glow: 0.7,
    bird: [-2.6, 1.9, -3.5],
    crab: [3.4, -7.5],
    kalbas: 0,
    dam: 0,
    warm: 0.5,
    tank: 1,
  },
  "ye-mistrikrik": {
    sky: ["#0a1e33", "#2f7f8f"],
    water: 0.25,
    moon: [-8, 12, -70, "#dfe9ff", 0.7],
    stars: 0,
    rain: 1,
    glow: 1,
    bird: [-2.8, 2, -3.5],
    crab: [4.4, -5.5],
    kalbas: 0,
    dam: 0,
    warm: 0.3,
  },
};
