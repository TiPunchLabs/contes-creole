import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";

interface Branch {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  r: number;
}

/** Pyébwa a Sav: recursive branches as instanced bark, glowing leaves at every tip, roots. */
export function createLightTree(rng: Rng): {
  group: THREE.Group;
  tips: THREE.Vector3[];
  update(time: number): void;
} {
  const group = new THREE.Group();
  const branches: Branch[] = [];
  const tips: THREE.Vector3[] = [];
  const grow = (
    p: THREE.Vector3,
    dir: THREE.Vector3,
    len: number,
    rad: number,
    depth: number,
  ): void => {
    const end = p.clone().add(dir.clone().multiplyScalar(len));
    branches.push({ p0: p, p1: end, r: rad });
    if (depth >= 6 || rad < 0.04) {
      tips.push(end);
      return;
    }
    const n = depth < 2 ? 3 : rng() < 0.65 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const axis = new THREE.Vector3(rng() - 0.5, rng() * 0.4 - 0.1, rng() - 0.5).normalize();
      const d = dir
        .clone()
        .applyAxisAngle(axis, 0.35 + rng() * 0.55)
        .add(new THREE.Vector3(0, 0.12 + depth * 0.02, 0))
        .normalize();
      grow(end, d, len * (0.66 + rng() * 0.16), rad * 0.6, depth + 1);
    }
  };
  grow(new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0, 1, 0), 5.2, 1.1, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.5;
    branches.push({
      p0: new THREE.Vector3(0, 0.2, 0),
      p1: new THREE.Vector3(Math.cos(a) * 2.6, -0.55, Math.sin(a) * 2.6),
      r: 0.34,
    });
  }
  const barkGeo = new THREE.CylinderGeometry(0.62, 1, 1, 7, 1);
  barkGeo.translate(0, 0.5, 0);
  const bark = new THREE.InstancedMesh(
    barkGeo,
    new THREE.MeshStandardMaterial({ color: "#3a2f44", roughness: 0.9, flatShading: true }),
    branches.length,
  );
  const up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  branches.forEach((b, i) => {
    const d = b.p1.clone().sub(b.p0);
    const length = d.length();
    q.setFromUnitVectors(up, d.normalize());
    s3.set(b.r, length, b.r);
    m4.compose(b.p0, q, s3);
    bark.setMatrixAt(i, m4);
  });
  const leaves = glowPoints(
    rng,
    tips.length * 26,
    (i) => {
      const t = tips[i % tips.length];
      const r = 1.25 * Math.cbrt(rng()),
        th = rng() * Math.PI * 2,
        ph = Math.acos(2 * rng() - 1);
      return [
        t.x + r * Math.sin(ph) * Math.cos(th),
        t.y + r * Math.cos(ph) * 0.8,
        t.z + r * Math.sin(ph) * Math.sin(th),
      ];
    },
    { size: 0.34, drift: 0.12 },
  );
  group.add(bark, leaves);
  return {
    group,
    tips,
    update(time) {
      leaves.material.uniforms.uTime.value = time;
    },
  };
}
