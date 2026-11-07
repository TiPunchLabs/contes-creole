import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  ARM_CLEARANCE,
  AROUND_ROCKS,
  clearOfDress,
  conchGroove,
  DRESS,
  dressRadius,
  flounce,
  HOME,
  M4,
  SHORE_ROCKS,
  turtleCourse,
} from "./scene";

/** The prototype's expression, copied as written (mila-monde-v3.html, `conchGeometry` → `surf`). */
// prettier-ignore
const prototypeFactor = (th: number, y: number, sp: number): number =>
  1-.14*sp*(((th/(Math.PI*2))+(1-y)*4.4)%1+1)%1;

describe("conchGroove", () => {
  it("keeps the prototype's operator grouping over the whole shell", () => {
    for (let i = 0; i <= 72; i++) {
      const th = -Math.PI + (i / 72) * Math.PI * 2;
      for (const y of [-0.82, -0.3, 0, 0.44, 0.58, 0.64, 0.7, 1]) {
        for (const sp of [0, 0.5, 1]) {
          expect(1 - conchGroove(th, y, sp)).toBeCloseTo(prototypeFactor(th, y, sp), 12);
        }
      }
    }
  });
});

describe("Mila's arms and dress", () => {
  it("bounds every flounce of the dress with the envelope the hands are kept out of", () => {
    for (const layer of DRESS) {
      const pos = flounce(...layer).attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y > layer[0] || y < layer[1]) continue;
        expect(Math.hypot(pos.getX(i), pos.getZ(i))).toBeLessThanOrEqual(dressRadius(y) + 1e-9);
      }
    }
  });

  it("moves a hand target that sinks into the dress out to its surface, and only such a target", () => {
    const sunk = clearOfDress(new THREE.Vector3(-0.135, 0.67, 0.06));
    expect(Math.hypot(sunk.x, sunk.z)).toBeCloseTo(dressRadius(0.67) + ARM_CLEARANCE, 9);
    expect(sunk.x).toBeLessThan(0);
    const raised = new THREE.Vector3(0.18, 1.05, -0.05);
    expect(clearOfDress(raised.clone())).toEqual(raised);
  });
});

describe("the turtle", () => {
  it("swims head first all along its lap, turns included", () => {
    for (let ta = 0; ta < Math.PI * 4; ta += 0.05) {
      const a = turtleCourse(ta - 1e-4);
      const b = turtleCourse(ta + 1e-4);
      const v = new THREE.Vector2(b.x - a.x, b.z - a.z).normalize();
      const { heading } = turtleCourse(ta);
      // its head is on local +z, so a yaw `heading` points it at (sin, cos)
      expect(Math.sin(heading) * v.x + Math.cos(heading) * v.y).toBeGreaterThan(0.999);
    }
  });
});

describe("the walk to page 4", () => {
  it("passes the shore rocks with room for Mila's dress", () => {
    // as the scene builds it: centripetal Catmull-Rom from HOME through the via point to page 4
    const walk = new THREE.CatmullRomCurve3([HOME, AROUND_ROCKS, M4], false, "centripetal");
    // a rock is an icosahedron scaled up to 1.4 x its size and bulged by noise up to 1.275
    const hem = dressRadius(0.455);
    for (const [x, z, s] of SHORE_ROCKS) {
      for (let k = 0; k <= 200; k++) {
        const p = walk.getPoint(k / 200);
        expect(Math.hypot(p.x - x, p.z - z)).toBeGreaterThan(s * 1.4 * 1.275 + hem);
      }
    }
  });
});
