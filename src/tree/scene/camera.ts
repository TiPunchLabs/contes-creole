import type * as THREE from "three";

/** Climb progress (t ∈ [0, 1]) at which each card hangs, cycling for more than three books. */
export const CARD_T = [0.24, 0.55, 0.84] as const;

/** Climb progress of the card at `index`. */
export const cardT = (index: number): number => CARD_T[index % CARD_T.length];

/** Spiral camera path around the tree; writes position and look-at target, returns the angle. */
export function hubCam(t: number, out: THREE.Vector3, look: THREE.Vector3): number {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 21 - t * 4;
  const y = 1.4 + t * 8.6;
  out.set(Math.cos(a) * r, y, Math.sin(a) * r);
  look.set(0, y + 2.2 - t * 1.2, 0);
  return a;
}
