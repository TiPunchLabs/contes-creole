/**
 * "Veillée claire" 3D palette (M5): late afternoon, no time dependence. Hex values are sRGB; three.js
 * converts them to linear. Board values are the phase 3 board 10 oklch stops; CSS twins live in
 * src/shared/theme/tokens.css. Only colours and intensities live here: positions and counts stay in
 * the builders, so the createRng(11) layout is untouched (guard: layout.test.ts).
 */
export const SKY = {
  /** Low sky, near the horizon: between "ciel bas" oklch(.88 .08 65) and the glow oklch(.92 .07 80). */
  horizon: "#fdd6a8",
  /** Rose band, oklch(.86 .07 30). */
  middle: "#fcc1b6",
  /** "Ciel haut", oklch(.82 .05 300); CSS twin --color-sky-high. */
  top: "#c9bde0",
  /** Stars fade out in daylight (was 0.55). */
  starOpacity: 0.3,
  /** Low sun (was a moon): pale warm core and halo; position unchanged. */
  sunDisc: "#fff3c8",
  sunHalo: "#ffe7b8",
} as const;

/** Distance haze matches the horizon so far hills melt into the sky; lighter than v14 (0.0105). */
export const FOG = { color: SKY.horizon, density: 0.009 } as const;

export const LIGHTS = {
  /** Sky fill tinted lilac so shaded sides read lilac, never black; ground bounce unchanged. */
  hemisphere: { sky: "#efe2f0", ground: "#86a35a", intensity: 1.6 },
  /** Warm foyer of the canopy and the hollow (lamp family, CSS twin --color-lamp); unchanged. */
  canopy: "#ffd890",
  base: "#ffb878",
  pool: "#ffd890",
  /** Low grazing sun. */
  rim: { color: "#ffc98f", intensity: 1.9 },
  key: { color: "#fff3e2", intensity: 0.9 },
} as const;

/** Tone-mapping exposure of the tree stage. */
export const EXPOSURE = 1.05;
