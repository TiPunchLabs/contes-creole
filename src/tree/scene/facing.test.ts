import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { hubCam } from "./camera";
import { FACING } from "./tree";

describe("FACING (CANOPY-FACE)", () => {
  it("turns the side the top of the climb saw towards the opening view at its foot", () => {
    const eye = new THREE.Vector3();
    const look = new THREE.Vector3();
    const top = hubCam(1, eye, look);
    const side = new THREE.Vector3(Math.cos(top), 0, Math.sin(top));
    const tree = new THREE.Object3D();
    tree.rotation.y = FACING;
    tree.updateMatrixWorld();
    side.applyMatrix4(tree.matrixWorld);
    hubCam(0, eye, look);
    const toOpening = eye.setY(0).normalize();
    expect(side.dot(toOpening)).toBeCloseTo(1, 6);
  });

  it("keeps the trunk's foot in place", () => {
    const tree = new THREE.Object3D();
    tree.rotation.y = FACING;
    tree.updateMatrixWorld();
    expect(new THREE.Vector3(0, -0.8, 0).applyMatrix4(tree.matrixWorld).toArray()).toEqual([
      expect.closeTo(0, 9),
      -0.8,
      expect.closeTo(0, 9),
    ]);
  });
});
