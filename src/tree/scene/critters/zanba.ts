import * as THREE from "three";
import { lerp } from "@shared/math";
import { SPHERE, blobShadow, eye, mat, part, place, tag, type CritterView } from "./parts";

/** Konpè Zanba: big, greedy, bakoua hat; heavy swaying steps, raises his trunk when touched. */
export function createZanba(): CritterView {
  const group = new THREE.Group();
  const skin = mat("#b0a2b9"),
    light = mat("#cdbfd2"),
    pink = mat("#e9b3ad"),
    nail = mat("#f3e6d2"),
    straw = mat("#e2c07a");
  const body = new THREE.Group();
  group.add(body);
  body.add(
    part(SPHERE, skin, 0, 1.18, -0.1, 0.86, 0.74, 1.0),
    part(SPHERE, light, 0, 1.0, 0.35, 0.62, 0.52, 0.55),
    part(SPHERE, skin, 0, 1.25, -1.05, 0.07, 0.22, 0.07),
  );
  const legGeo = new THREE.CapsuleGeometry(0.23, 0.42, 6, 14);
  const legs = (
    [
      [0.44, 0.5],
      [-0.44, 0.5],
      [0.44, -0.6],
      [-0.44, -0.6],
    ] as const
  ).map(([x, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0.78, z);
    g.add(part(legGeo, skin, 0, -0.4, 0));
    for (const k of [-1, 0, 1]) g.add(part(SPHERE, nail, k * 0.1, -0.72, 0.18, 0.055, 0.045, 0.04));
    group.add(g);
    return { g, phase: i === 0 || i === 3 ? 0 : Math.PI };
  });
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0.8);
  body.add(head);
  head.add(
    part(SPHERE, skin, 0, 0, 0, 0.56, 0.52, 0.5),
    part(SPHERE, pink, 0.3, -0.12, 0.34, 0.09, 0.06, 0.04),
    part(SPHERE, pink, -0.3, -0.12, 0.34, 0.09, 0.06, 0.04),
    eye(0.21, 0.1, 0.4, 0.07),
    eye(-0.21, 0.1, 0.4, 0.07),
  );
  const ears = [-1, 1].map((side) => {
    const e = new THREE.Group();
    e.position.set(side * 0.5, 0.05, -0.08);
    e.add(
      part(SPHERE, skin, side * 0.2, -0.05, 0, 0.42, 0.5, 0.07),
      part(SPHERE, pink, side * 0.2, -0.05, 0.05, 0.3, 0.38, 0.03),
    );
    e.rotation.y = side * 0.5;
    head.add(e);
    return e;
  });
  const trunk: THREE.Group[] = [];
  {
    let parent = new THREE.Group();
    parent.position.set(0, -0.12, 0.44);
    head.add(parent);
    for (let k = 0; k < 5; k++) {
      const r = 0.17 - k * 0.022;
      parent.add(part(SPHERE, skin, 0, -0.1, 0, r, 0.15, r));
      if (k === 4) parent.add(part(SPHERE, light, 0, -0.24, 0, r * 0.9, 0.05, r * 0.9));
      trunk.push(parent);
      const next = new THREE.Group();
      next.position.set(0, -0.19, 0.015);
      parent.add(next);
      parent = next;
    }
  }
  const hat = new THREE.Group();
  hat.position.set(0.06, 0.5, -0.05);
  hat.rotation.set(-0.12, 0, -0.12);
  head.add(hat);
  hat.add(
    part(new THREE.ConeGeometry(0.34, 0.34, 18), straw, 0, 0.17, 0),
    part(new THREE.CylinderGeometry(0.58, 0.6, 0.035, 24), straw, 0, 0.01, 0),
    part(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 18), mat("#c4572e"), 0, 0.06, 0),
  );
  group.add(blobShadow(1.3));
  group.scale.setScalar(0.8);
  tag(group, "zanba");

  return {
    group,
    top: 2.55,
    pose(c, time) {
      place(group, c);
      const up = c.react > 0 ? Math.sin((1 - c.react) * Math.PI) : 0;
      for (const leg of legs) leg.g.rotation.x = Math.sin(c.phase + leg.phase) * 0.32 * c.moving;
      body.rotation.z = Math.sin(c.phase) * 0.045 * c.moving;
      body.position.y =
        Math.abs(Math.cos(c.phase)) * 0.05 * c.moving + Math.sin(time * 1.1) * 0.012;
      ears.forEach((e, i) => {
        const side = i ? 1 : -1;
        e.rotation.y = side * (0.5 + Math.sin(time * 1.6 + i * 0.4) * 0.16 + up * 0.3);
      });
      trunk.forEach((t, k) => {
        t.rotation.x = lerp(Math.sin(time * 1.3 - k * 0.7) * 0.14 + 0.06, -0.62, up);
      });
      head.rotation.x = -up * 0.18 + Math.sin(time * 0.7) * 0.03;
    },
  };
}
