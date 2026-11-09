import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { GROUND_SEGMENTS, GROUND_SIZE, groundHeight, groundMeshHeight } from "./ground";

/** Height of the rendered ground plane at (x, z), by raycasting the same geometry landscape.ts builds. */
function rendered(mesh: THREE.Mesh, x: number, z: number): number {
  const hit = new THREE.Raycaster(
    new THREE.Vector3(x, 50, z),
    new THREE.Vector3(0, -1, 0),
  ).intersectObject(mesh)[0];
  return hit.point.y;
}

describe("groundMeshHeight", () => {
  const geo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundHeight(p.getX(i), p.getZ(i)));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

  it("matches the rendered ground at grid vertices and inside both triangles of a cell", () => {
    for (const [x, z] of [
      [0, 0],
      [-28, -5],
      [-27.3, -4.1],
      [12.2, -5.8],
      [3.9, 14.4],
      [-6.7, 30.6],
    ]) {
      expect(groundMeshHeight(x, z)).toBeCloseTo(rendered(mesh, x, z), 4);
    }
  });
});
