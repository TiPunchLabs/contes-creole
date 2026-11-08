import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import type { Count } from "../lite";
import { bendInstancedNormals, bezier, hash, lumpyBall, tubesGeometry, type Tube } from "./organic";

interface Branch {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  r: number;
  /** Index of the branch this one grows from; -1 for the trunk and the roots. */
  parent: number;
  depth: number;
}

const V = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);
const GREENS = ["#6fae4a", "#86bf55", "#a2cd62", "#5c9d42"];

/**
 * Pyébwa a Konesans (v14): straight trunk, balanced crown of round puffs that breathes and rustles,
 * buttress roots. The bark is one smooth mesh of curved tapered tubes: each branch leaves along its
 * parent's direction, so forks blend, and the roots are flat buttresses sinking into the ground.
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
    parent = -1,
  ): void => {
    const end = p.clone().add(dir.clone().multiplyScalar(len));
    const self = branches.length;
    branches.push({ p0: p, p1: end, r: rad, parent, depth });
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
          self,
        );
      }
      grow(end, V(0, 1, 0), len * 0.55, rad * 0.55, 2, self);
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
      grow(end, d, len * (0.62 + rng() * 0.14), rad * 0.6, depth + 1, self);
    }
  };
  grow(V(0, -0.8, 0), V(0, 1, 0), 4.6, 1.05, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.3;
    const L = 1.7 + rng() * 0.4;
    branches.push({
      p0: V(0, 0.9, 0),
      p1: V(Math.cos(a) * L, -0.9, Math.sin(a) * L),
      r: 0.5,
      parent: -1,
      depth: -1,
    });
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
  const bark = new THREE.Mesh(
    barkGeometry(branches),
    new THREE.MeshStandardMaterial({ color: "#9a6a46", roughness: 0.9, vertexColors: true }),
  );
  group.add(bark);

  const canopy = new THREE.Group();
  group.add(canopy);
  const puffCount = tips.length + 26;
  const puffMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.85,
    emissive: "#3a5a1c",
    emissiveIntensity: 0.25,
  });
  const crownCentre = tips
    .reduce((acc, t) => acc.add(t), V())
    .multiplyScalar(1 / tips.length)
    .add(V(0, -0.6, 0));
  bendInstancedNormals(puffMaterial, crownCentre, 0.62, 1.5);
  const puffs = new THREE.InstancedMesh(
    lumpyBall(1, opts.lite ? 1 : 2, 0.7),
    puffMaterial,
    puffCount,
  );
  {
    const colour = new THREE.Color();
    const turn = new THREE.Euler();
    for (let i = 0; i < puffCount; i++) {
      turn.set((hash(i, 1) - 0.5) * 0.5, hash(i, 2) * Math.PI * 2, (hash(i, 3) - 0.5) * 0.5);
      q.setFromEuler(turn);
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

/**
 * Branch-collar profile: the hidden first ring starts inside the parent, the base swells just past
 * the fork so it covers the parent's rim, then settles to the plain taper.
 */
function collar(s: number): number {
  return s < 0.2 ? 0.85 + 0.25 * (s / 0.2) : 1.1 - 0.1 * Math.min(1, (s - 0.2) / 0.3);
}

/** Smooth bark: one curved tapered tube per branch, flat buttress roots, darker forks and feet. */
function barkGeometry(branches: readonly Branch[]): THREE.BufferGeometry {
  const forks = new Set(branches.map((b) => b.parent));
  const tubes: Tube[] = branches.map((b, i) => {
    const d = b.p1.clone().sub(b.p0);
    const len = d.length();
    const own = d.clone().normalize();
    if (b.depth < 0) {
      const out = V(b.p1.x, 0, b.p1.z).normalize();
      return {
        at: bezier(
          V(out.x * 0.7, 0.55, out.z * 0.7),
          V(out.x * 1.05, -0.15, out.z * 1.05),
          V(b.p1.x * 0.6, -0.4, b.p1.z * 0.6),
          V(b.p1.x * 1.05, -1.05, b.p1.z * 1.05),
        ),
        radius: (s) =>
          0.4 * (0.55 + 0.45 * Math.sin(Math.min(1, s * 2.5) * Math.PI * 0.5)) * (1 - 0.6 * s),
        rings: 10,
        sides: 8,
        stretch: 1.35,
        normal0: out,
        shade: (s) => 1 - 0.2 * s,
        seed: i,
      };
    }
    const from = b.parent >= 0 ? branches[b.parent] : null;
    const lead = from ? from.p1.clone().sub(from.p0).normalize() : own;
    const thick = b.r > 0.3;
    const wobble = b.depth === 0 ? 0.12 : 0;
    return {
      at: bezier(
        b.p0.clone().addScaledVector(lead, -Math.min(b.r * 0.6, len * 0.2)),
        b.p0
          .clone()
          .addScaledVector(lead, len * 0.38)
          .add(V(wobble, 0, -wobble * 0.6)),
        b.p1
          .clone()
          .addScaledVector(own, -len * 0.3)
          .add(V(-wobble * 0.7, 0, wobble)),
        b.p1,
      ),
      radius:
        b.depth === 0
          ? (s) => b.r * (1 - 0.38 * s) * (1 + 0.5 * Math.exp(-s * 7))
          : (s) => b.r * (1 - 0.38 * s) * collar(s),
      rings: thick ? 8 : b.r > 0.1 ? 4 : forks.has(i) ? 3 : 2,
      sides: thick ? 12 : b.r > 0.1 ? 7 : 5,
      cap: forks.has(i) ? 0.45 : true,
      ridges: thick ? 0.05 : 0,
      shade:
        b.depth === 0
          ? (s) => 0.82 + 0.18 * Math.min(1, s * 4)
          : (s) => 0.92 + 0.08 * Math.min(1, s * 4),
      seed: i,
    };
  });
  return tubesGeometry(tubes, "#ffffff");
}
