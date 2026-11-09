import type * as THREE from "three";

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
