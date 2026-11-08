// Page-by-page staging of « Ti Kannot é Gwo Rako » on the island, keyed by story page id.
import type { Spot } from "./world/island/spots";

/** Camera shot: orbit around `focus` (degrees, 0° = from the front/south; world units). */
export interface Shot {
  focus: Spot | "island";
  azimuth: number;
  elevation: number;
  distance: number;
}

/** Scene parameters of one page; the world interpolates them between pages. Weights are 0..1. */
export interface PageEnv {
  shot: Shot;
  /** Sky gradient: [zenith, horizon], the poster's peach and gold by day. */
  sky: [string, string];
  /** Sun: azimuth°, elevation°, colour, intensity (the moon on night pages). */
  sun: [number, number, string, number];
  night: number;
  mist: number;
  /** River level offset: 0 = full, -1.35 = a thread, 0.25 = swollen by the rain. */
  water: number;
  rain: number;
  rainbow: number;
  /** Drought: dries the grass and the leaves. */
  wilt: number;
  kalbas: number;
  barrels: number;
  jars: number;
  /** Gwo Rako's stock is empty (pale, tipped over). */
  empty: number;
  /** Dead branches choking the source. */
  branches: number;
  dam: number;
  /** Shared reservoir in the village. */
  tank: number;
  /** Other animals working at the source. */
  helpers: number;
  /** Ti Kannot's spot; he stands on whatever is there (rock, roof, crown, ground). */
  bird: Spot;
  /** Gwo Rako's spot, or null when absent. */
  crab: Spot | null;
}

/** Defaults shared by every page; each page lists only what differs. */
const BASE: Omit<PageEnv, "shot" | "sky" | "sun" | "bird" | "crab"> = {
  night: 0,
  mist: 0,
  water: 0,
  rain: 0,
  rainbow: 0,
  wilt: 0,
  kalbas: 0,
  barrels: 0,
  jars: 0,
  empty: 0,
  branches: 0,
  dam: 0,
  tank: 0,
  helpers: 0,
};

export const STAGING: Record<string, PageEnv> = {
  "ye-krik": {
    ...BASE,
    shot: { focus: "island", azimuth: 20, elevation: 28, distance: 46 },
    sky: ["#f2b59a", "#fbe3b4"],
    sun: [-60, 22, "#ffd6a0", 1.4],
    mist: 0.45,
    branches: 1,
    bird: "perch",
    crab: null,
  },
  "ti-kannot-e-gwo-rako": {
    ...BASE,
    shot: { focus: "perch", azimuth: 35, elevation: 18, distance: 16 },
    sky: ["#f6c4a2", "#fdebc4"],
    sun: [-30, 40, "#fff0cc", 1.4],
    mist: 0.2,
    branches: 1,
    bird: "perch",
    crab: "ford",
  },
  "on-lide-gwo-rako": {
    ...BASE,
    shot: { focus: "yard", azimuth: 140, elevation: 26, distance: 15 },
    sky: ["#c98a8f", "#ffb27a"],
    sun: [80, 6, "#ff9a5a", 1.1],
    night: 0.25,
    water: -0.15,
    kalbas: 20,
    branches: 1,
    bird: "roof",
    crab: "yard",
  },
  "larivye-la-ka-desann": {
    ...BASE,
    shot: { focus: "bank", azimuth: 10, elevation: 30, distance: 18 },
    sky: ["#f8d9b0", "#fff0cf"],
    sun: [10, 70, "#fff6dc", 1.8],
    water: -0.85,
    wilt: 0.4,
    kalbas: 50,
    branches: 1,
    bird: "bank",
    crab: "ford",
  },
  "sa-ti-kannot-jwenn": {
    ...BASE,
    shot: { focus: "spring", azimuth: -20, elevation: 16, distance: 12 },
    sky: ["#f3c7a4", "#f9efcc"],
    sun: [-40, 35, "#fff3d2", 1.3],
    mist: 0.5,
    water: -1,
    wilt: 0.4,
    kalbas: 50,
    helpers: 1,
    bird: "rock",
    crab: null,
  },
  "gwo-rako-vle-sous-la": {
    ...BASE,
    shot: { focus: "spring", azimuth: 25, elevation: 22, distance: 13 },
    sky: ["#cdbcb2", "#ece2d2"],
    sun: [30, 40, "#f4ece0", 1],
    water: -1.05,
    wilt: 0.5,
    kalbas: 50,
    dam: 1,
    bird: "rock",
    crab: "spring",
  },
  "on-mache": {
    ...BASE,
    shot: { focus: "bank", azimuth: -35, elevation: 12, distance: 14 },
    sky: ["#22365e", "#66709a"],
    sun: [150, 35, "#d4dcff", 1.2],
    night: 1,
    water: -1.1,
    wilt: 0.5,
    kalbas: 50,
    dam: 1,
    bird: "bank",
    crab: "ford",
  },
  "demen-maten": {
    ...BASE,
    shot: { focus: "yard", azimuth: 70, elevation: 32, distance: 17 },
    sky: ["#f7d2a8", "#fff0c8"],
    sun: [40, 55, "#fff0c8", 1.8],
    water: -1.35,
    wilt: 0.8,
    kalbas: 50,
    barrels: 8,
    jars: 10,
    dam: 1,
    bird: "roof",
    crab: "yard",
  },
  "sa-dlo-la-ka-aprann": {
    ...BASE,
    shot: { focus: "spring", azimuth: 0, elevation: 26, distance: 16 },
    sky: ["#f1c6a6", "#f8eecb"],
    sun: [-20, 45, "#fff4d8", 1.4],
    water: -0.9,
    wilt: 0.5,
    kalbas: 50,
    barrels: 8,
    jars: 10,
    helpers: 1,
    bird: "rock",
    crab: "spring",
  },
  "denye-leson-la": {
    ...BASE,
    shot: { focus: "yard", azimuth: 130, elevation: 30, distance: 17 },
    sky: ["#f5e1c0", "#fff6dc"],
    sun: [0, 78, "#fffaf0", 2],
    water: -1,
    wilt: 0.7,
    kalbas: 50,
    barrels: 8,
    jars: 10,
    empty: 1,
    bird: "roof",
    crab: "yard",
  },
  "on-nouvo-rezev": {
    ...BASE,
    shot: { focus: "tank", azimuth: -40, elevation: 20, distance: 14 },
    sky: ["#f4b896", "#fde2b6"],
    sun: [-70, 30, "#ffd9a8", 1.3],
    water: -0.4,
    wilt: 0.2,
    tank: 1,
    bird: "tank",
    crab: "tap",
  },
  "ye-mistrikrik": {
    ...BASE,
    shot: { focus: "island", azimuth: -10, elevation: 24, distance: 44 },
    sky: ["#d6c2c0", "#f1e4d6"],
    sun: [-50, 25, "#fff0dc", 1],
    mist: 0.4,
    water: 0.25,
    rain: 1,
    rainbow: 1,
    tank: 1,
    bird: "perch",
    crab: "tap",
  },
};
