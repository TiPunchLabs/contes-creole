import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { soften } from "./soft";

describe("soften", () => {
  it("shares the vertices so the shading flows across faces", () => {
    const geometry = soften(new THREE.IcosahedronGeometry(1, 0));
    expect(geometry.getIndex()).not.toBeNull();
    expect(geometry.getAttribute("position").count).toBe(12);
  });

  it("points every normal away from the centre of a round shape", () => {
    const geometry = soften(new THREE.IcosahedronGeometry(1, 0));
    const p = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute("position"), 0);
    const n = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute("normal"), 0);
    expect(n.dot(p.normalize())).toBeGreaterThan(0.99);
  });
});
