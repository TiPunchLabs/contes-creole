/** Scales a particle / instance count to the current quality level. */
export type Count = (n: number) => number;

export interface LiteEnv {
  cores: number;
  coarsePointer: boolean;
  /** `location.search`; `?lite=1` / `?lite=0` force the mode. */
  search: string;
}

export const LITE_FACTOR = 0.45;

/** Lite mode for tablets and small CPUs: ≤ 4 cores or a coarse pointer, unless forced by the URL. */
export function detectLite(env: LiteEnv): boolean {
  const forced = new URLSearchParams(env.search).get("lite");
  if (forced === "1") return true;
  if (forced === "0") return false;
  return env.cores <= 4 || env.coarsePointer;
}

/** Reads the browser facts `detectLite` needs. */
export function readLiteEnv(): LiteEnv {
  return {
    cores: navigator.hardwareConcurrency || 8,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    search: location.search,
  };
}

/** `n` in full mode, `n × 0.45` in lite mode, never below 1. */
export function scaleCount(n: number, lite: boolean): number {
  return Math.max(1, Math.round(n * (lite ? LITE_FACTOR : 1)));
}
