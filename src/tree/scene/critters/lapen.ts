import * as THREE from "three";
import {
  SPHERE,
  blobShadow,
  eye,
  madrasTexture,
  mat,
  part,
  place,
  tag,
  type CritterView,
} from "./parts";

/** Konpè Lapen: small, clever, madras scarf; hops while walking, jumps for joy when touched. */
export function createLapen(): CritterView {
  const group = new THREE.Group();
  const fur = mat("#c99868"),
    cream = mat("#f5e6cc"),
    pink = mat("#eaa79a"),
    madras = mat("#ffffff", { map: madrasTexture() });
  const body = new THREE.Group();
  group.add(body);
  body.add(
    part(SPHERE, fur, 0, 0.55, 0, 0.42, 0.5, 0.38),
    part(SPHERE, cream, 0, 0.5, 0.16, 0.3, 0.37, 0.26),
    part(SPHERE, cream, 0, 0.46, -0.37, 0.14),
  );
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.065, 10, 24), madras);
  scarf.position.set(0, 0.9, 0.02);
  scarf.rotation.x = Math.PI / 2 - 0.15;
  body.add(scarf, part(SPHERE, madras, 0.1, 0.84, 0.27, 0.07, 0.1, 0.05));
  const head = new THREE.Group();
  head.position.set(0, 1.12, 0.07);
  body.add(head);
  head.add(
    part(SPHERE, fur, 0, 0, 0, 0.34, 0.31, 0.31),
    part(SPHERE, cream, 0, -0.09, 0.22, 0.17, 0.12, 0.13),
    part(SPHERE, pink, 0, -0.02, 0.33, 0.05, 0.04, 0.04),
    part(SPHERE, pink, 0.2, -0.08, 0.19, 0.06, 0.04, 0.03),
    part(SPHERE, pink, -0.2, -0.08, 0.19, 0.06, 0.04, 0.03),
    eye(0.13, 0.05, 0.25, 0.055),
    eye(-0.13, 0.05, 0.25, 0.055),
  );
  const ears = [-1, 1].map((side) => {
    const e = new THREE.Group();
    e.position.set(side * 0.11, 0.24, -0.03);
    e.add(
      part(SPHERE, fur, 0, 0.3, 0, 0.095, 0.33, 0.055),
      part(SPHERE, pink, 0, 0.3, 0.035, 0.06, 0.26, 0.02),
    );
    e.rotation.z = -side * 0.16;
    head.add(e);
    return e;
  });
  const feet = [-1, 1].map((side) => {
    const f = part(SPHERE, cream, side * 0.2, 0.07, 0.1, 0.12, 0.07, 0.22);
    group.add(f);
    return f;
  });
  const paws = [-1, 1].map((side) => {
    const p = part(SPHERE, fur, side * 0.2, 0.4, 0.27, 0.08, 0.11, 0.08);
    body.add(p);
    return p;
  });
  group.add(blobShadow(0.55));
  group.scale.setScalar(0.66);
  tag(group, "lapen");

  return {
    group,
    top: 1.55,
    pose(c, time) {
      place(group, c);
      const hop = Math.abs(Math.sin(c.phase * 0.5)) * c.moving;
      const jump = c.react > 0 ? Math.sin((1 - c.react) * Math.PI) : 0;
      body.position.y = hop * 0.32 + jump * 0.9;
      body.scale.set(
        1 + (1 - hop) * c.moving * 0.05,
        1 - (1 - hop) * c.moving * 0.07 + hop * 0.04,
        1,
      );
      for (const f of feet) f.position.y = 0.07 + hop * 0.25 + jump * 0.8;
      const twitch = Math.sin(time * 3.1) > 0.96 ? 0.25 : 0;
      ears.forEach((e, i) => {
        e.rotation.x = -0.12 - hop * 0.45 + jump * 0.5 + Math.sin(time * 1.3 + i) * 0.05;
        e.rotation.z = (i ? -1 : 1) * (0.16 + twitch * (i ? 1 : 0) + jump * 0.25);
      });
      head.rotation.z = Math.sin(time * 0.9) * 0.06 * (1 - c.moving);
      paws.forEach((p, i) => {
        p.position.y = 0.4 + jump * 0.25 + (c.react > 0 ? Math.sin(time * 14 + i) * 0.04 : 0);
      });
    },
  };
}
