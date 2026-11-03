import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { KAZ, type KazStyle } from "./kaz";

const COLORS = { wall: "#f1d9a8", shutter: "#2f7f86", roof: "#b4553b" };

/** Points (local x, z) that must stand on a support: body corners and gallery front posts. */
const SUPPORTED: Record<KazStyle, [number, number][]> = {
  galerie: [
    [-1.3, -1],
    [1.3, 1],
    [-1.25, 1.97],
    [-0.42, 1.97],
    [0.42, 1.97],
    [1.25, 1.97],
  ],
  katpan: [
    [-1.25, -1.1],
    [1.25, 1.1],
    [-1.2, 1.98],
    [1.2, 1.98],
  ],
  pignon: [
    [-1.05, -1.2],
    [1.05, 1.2],
  ],
};

describe("kaz", () => {
  it("stands every corner and gallery post on a support reaching down into the slope", () => {
    const ray = new THREE.Raycaster();
    for (const style of Object.keys(SUPPORTED) as KazStyle[]) {
      const mesh = new THREE.Mesh(
        KAZ[style](COLORS).geometry,
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      );
      for (const [x, z] of SUPPORTED[style]) {
        ray.set(new THREE.Vector3(x, 0.45, z), new THREE.Vector3(0, -1, 0));
        const lowest = Math.min(...ray.intersectObject(mesh).map((hit) => hit.point.y));
        expect(lowest, `${style} at ${x}, ${z}`).toBeLessThan(-1);
      }
    }
  });

  it("keeps the footprint of each style around its walls, steps included", () => {
    for (const style of Object.keys(SUPPORTED) as KazStyle[]) {
      const { geometry, footprint } = KAZ[style](COLORS);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      expect(box && box.max.z).toBeLessThanOrEqual(footprint.front + 0.05);
      expect(box && box.min.z).toBeGreaterThanOrEqual(footprint.back - 0.05);
    }
  });
});
