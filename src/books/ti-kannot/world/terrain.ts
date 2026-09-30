/** Distance between two page stations along the river. */
export const STEP = 17;

/** River centre line x at depth z. */
export const meander = (z: number): number => Math.sin(z * 0.028) * 4 + Math.sin(z * 0.011) * 2;

const noise = (x: number, z: number): number =>
  Math.sin(x * 0.9 + z * 0.7) * 0.5 +
  Math.sin(x * 2.3 - z * 1.7) * 0.25 +
  Math.sin(x * 0.3 + z * 0.21) * 0.8;

/** Valley floor height (v13 `H`): a riverbed rising into bumpy banks. */
export function valleyHeight(x: number, z: number): number {
  const u = Math.abs(x - meander(z));
  return 0.12 * Math.pow(u, 1.7) - 2.7 + noise(x, z) * 0.45 * Math.min(1, u / 4);
}

/** Depth of page `index`'s station. */
export const station = (index: number): number => -index * STEP;
