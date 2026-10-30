import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import type { Count } from "../lite";

interface Branch {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  r: number;
}

const V = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);
const GREENS = ["#6fae4a", "#86bf55", "#a2cd62", "#5c9d42"];

/**
 * Pyébwa a Konesans (v14): straight trunk, balanced crown of round puffs that breathes and rustles,
 * buttress roots.
 */
export function createLightTree(
  rng: Rng,
  opts: { lite: boolean; count: Count },
): { group: THREE.Group; tips: THREE.Vector3[]; update(time: number, stirred: boolean): void } {
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
    if (depth === 0) {
      const off = rng() * 6.28;
      for (let i = 0; i < 3; i++) {
        const a = off + (i / 3) * Math.PI * 2;
        grow(
          end,
          V(Math.cos(a) * 0.7, 1, Math.sin(a) * 0.7).normalize(),
          len * 0.68,
          rad * 0.62,
          1,
        );
      }
      grow(end, V(0, 1, 0), len * 0.55, rad * 0.55, 2);
      return;
    }
    const n = depth < 2 ? 3 : rng() < 0.65 ? 2 : 3;
    const base = rng() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.6;
      const tilt = 0.35 + rng() * 0.4;
      const d = dir
        .clone()
        .multiplyScalar(1.4)
        .add(V(Math.cos(a) * tilt, 0, Math.sin(a) * tilt))
        .add(V(0, 0.18, 0))
        .normalize();
      if (d.y < 0.45) {
        d.y = 0.45;
        d.normalize();
      }
      grow(end, d, len * (0.62 + rng() * 0.14), rad * 0.6, depth + 1);
    }
  };
  grow(V(0, -0.8, 0), V(0, 1, 0), 4.6, 1.05, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.3;
    const L = 1.7 + rng() * 0.4;
    branches.push({ p0: V(0, 0.9, 0), p1: V(Math.cos(a) * L, -0.9, Math.sin(a) * L), r: 0.5 });
  }
  {
    const centre = tips
      .reduce((acc, t) => acc.add(V(t.x, 0, t.z)), V())
      .multiplyScalar(1 / tips.length);
    const y0 = 3.8;
    const seen = new Set<THREE.Vector3>();
    const shift = (p: THREE.Vector3): void => {
      if (seen.has(p)) return;
      seen.add(p);
      if (p.y <= y0) return;
      const k = Math.min(1, (p.y - y0) / 3);
      p.x -= centre.x * k;
      p.z -= centre.z * k;
    };
    for (const b of branches) {
      shift(b.p0);
      shift(b.p1);
    }
    tips.forEach(shift);
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const up = V(0, 1, 0);
  const barkGeo = new THREE.CylinderGeometry(0.62, 1, 1, 7, 1);
  barkGeo.translate(0, 0.5, 0);
  const bark = new THREE.InstancedMesh(
    barkGeo,
    new THREE.MeshStandardMaterial({ color: "#9a6a46", roughness: 0.9, flatShading: true }),
    branches.length,
  );
  branches.forEach((b, i) => {
    const d = b.p1.clone().sub(b.p0);
    const length = d.length();
    q.setFromUnitVectors(up, d.normalize());
    s3.set(b.r, length, b.r);
    m4.compose(b.p0, q, s3);
    bark.setMatrixAt(i, m4);
  });
  group.add(bark);

  const canopy = new THREE.Group();
  group.add(canopy);
  const puffCount = tips.length + 26;
  const puffs = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, opts.lite ? 1 : 2),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.85,
      emissive: "#3a5a1c",
      emissiveIntensity: 0.25,
    }),
    puffCount,
  );
  {
    const colour = new THREE.Color();
    q.identity();
    for (let i = 0; i < puffCount; i++) {
      const t = tips[i % tips.length];
      const extra = i >= tips.length;
      const r = (extra ? 0.8 : 1.05) + rng() * 0.55;
      const pos = V(
        t.x + (extra ? (rng() - 0.5) * 1.6 : 0),
        t.y + (extra ? (rng() - 0.3) * 1.2 : 0),
        t.z + (extra ? (rng() - 0.5) * 1.6 : 0),
      );
      m4.compose(pos, q, s3.set(r * 1.1, r * 0.85, r * 1.1));
      puffs.setMatrixAt(i, m4);
      puffs.setColorAt(
        i,
        colour.set(rng() < 0.1 ? "#f0793c" : GREENS[(rng() * GREENS.length) | 0]),
      );
    }
  }
  canopy.add(puffs);

  const leaves = glowPoints(
    rng,
    opts.count(tips.length * 6),
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
    { size: 0.26, drift: 0.12, a: "#fff4b8", b: "#ffd27a" },
  );
  canopy.add(leaves);

  let rustle = 0;
  return {
    group,
    tips,
    update(time, stirred) {
      leaves.material.uniforms.uTime.value = time;
      rustle = lerp(rustle, stirred ? 1 : 0, 0.06);
      const breath = 1 + Math.sin(time * 0.8) * 0.012;
      canopy.scale.set(breath, 1 + Math.sin(time * 0.8 + 0.6) * 0.01, breath);
      canopy.rotation.y = Math.sin(time * 0.25) * 0.015 + Math.sin(time * 9) * 0.006 * rustle;
      canopy.rotation.z = Math.sin(time * 0.4) * 0.006 + Math.sin(time * 11) * 0.004 * rustle;
    },
  };
}
