import * as THREE from "three";
import { SPOTS, spotPoint, type Spot } from "./spots";

const ABOVE = 60;
const DOWN = new THREE.Vector3(0, -1, 0);

/**
 * Where a small creature stands at each spot: on top of whatever prop is there (rock, roof,
 * reservoir, tree crown), else on the ground. Call it before any prop is animated or scaled.
 */
export function restingPoints(props: THREE.Object3D[]): Record<Spot, THREE.Vector3> {
  for (const prop of props) prop.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3();
  const points = {} as Record<Spot, THREE.Vector3>;
  for (const spot of Object.keys(SPOTS) as Spot[]) {
    const point = spotPoint(spot);
    ray.set(from.set(point.x, ABOVE, point.z), DOWN);
    const hit = ray.intersectObjects(props, true)[0];
    if (hit) point.y = Math.max(point.y, hit.point.y);
    points[spot] = point;
  }
  return points;
}
