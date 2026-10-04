import * as THREE from "three";
import { islandHeight } from "./terrain";

/** Named places where the characters stand and the camera looks. */
export type Spot = "perch" | "bank" | "ford" | "rock" | "spring" | "yard" | "roof" | "tank" | "tap";

export const SPOTS: Record<Spot, readonly [number, number]> = {
  perch: [-4.2, 0.5],
  bank: [-1.6, 4.5],
  ford: [2.4, 6.5],
  rock: [-0.2, -12.4],
  spring: [-3.8, -10.4],
  yard: [7, 4.6],
  roof: [7, 1.6],
  tank: [-7, 7.5],
  tap: [-5.3, 8.9],
};

/** Gwo Rako's house, centre of the village and pile behind the house (x, z). */
export const HOUSE = SPOTS.roof;
export const VILLAGE: readonly [number, number] = [-9.5, 3.5];
export const STOCK: readonly [number, number] = [HOUSE[0] - 2.4, HOUSE[1] - 2.8];

/** Ground point of `spot`, never below sea level. */
export function spotPoint(spot: Spot, out = new THREE.Vector3()): THREE.Vector3 {
  const [x, z] = SPOTS[spot];
  return out.set(x, Math.max(0, islandHeight(x, z)), z);
}
