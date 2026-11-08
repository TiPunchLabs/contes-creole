import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import type { Count } from "../lite";
import {
  bendInstancedNormals,
  bezier,
  hash,
  leafyClump,
  tubesGeometry,
  withBark,
  type Tube,
} from "./organic";

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
    withBark(
      new THREE.MeshStandardMaterial({ color: "#9a6a46", roughness: 0.9, vertexColors: true }),
    ),
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
    leafyClump(opts.lite ? 1 : 2, opts.lite ? 12 : 24, 0.7),
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
 * Smooth bark. Each branch continues into its most aligned child as one unbroken tube (continuous
 * curve, tangent and radius), so a limb never shows a ring where a segment ends; only the other
 * children leave it as side branches, starting slimmer inside the limb and widening as they emerge.
 * The roots are flat buttresses sinking into the ground.
 */
function barkGeometry(branches: readonly Branch[]): THREE.BufferGeometry {
  const dir = (b: Branch): THREE.Vector3 => b.p1.clone().sub(b.p0).normalize();
  const next = branches.map((b, i) => {
    let best = -1;
    let dot = -2;
    branches.forEach((c, k) => {
      if (c.parent !== i) return;
      const d = dir(c).dot(dir(b));
      if (d > dot) {
        dot = d;
        best = k;
      }
    });
    return best;
  });
  const continued = new Set(next.filter((k) => k >= 0));
  const tubes: Tube[] = [];
  branches.forEach((b, i) => {
    if (b.depth < 0) tubes.push(rootTube(b, i));
    else if (!continued.has(i)) {
      const chain = [i];
      while (next[chain[chain.length - 1]] >= 0) chain.push(next[chain[chain.length - 1]]);
      tubes.push(limbTube(branches, chain, i));
    }
  });
  return tubesGeometry(tubes, "#ffffff");
}

/** One unbroken limb through `chain` (a branch and its successive most aligned children). */
function limbTube(branches: readonly Branch[], chain: readonly number[], seed: number): Tube {
  const head = branches[chain[0]];
  const side = head.parent >= 0;
  const m = chain.length;
  const curves = chain.map((index, k) => {
    const b = branches[index];
    const len = b.p0.distanceTo(b.p1);
    const own = b.p1.clone().sub(b.p0).normalize();
    const from = k > 0 ? branches[chain[k - 1]] : side ? branches[head.parent] : null;
    const lead = from ? from.p1.clone().sub(from.p0).normalize() : own;
    const back = k === 0 && side ? Math.min(b.r * 0.9, len * 0.25) : 0;
    const wobble = b.depth === 0 ? 0.12 : 0;
    return bezier(
      b.p0.clone().addScaledVector(lead, -back),
      b.p0
        .clone()
        .addScaledVector(lead, len * 0.38)
        .add(V(wobble, 0, -wobble * 0.6)),
      b.p1
        .clone()
        .addScaledVector(own, -len * 0.3)
        .add(V(-wobble * 0.7, 0, wobble)),
      b.p1,
    );
  });
  const ends = chain.map((index) => branches[index].r * 0.62);
  const starts = chain.map((index, k) => (k ? ends[k - 1] : branches[index].r * (side ? 0.7 : 1)));
  const locate = (s: number): [number, number] => {
    const k = Math.min(m - 1, Math.floor(s * m));
    return [k, s * m - k];
  };
  const stations: number[] = [];
  chain.forEach((index, k) => {
    const r = branches[index].r;
    const n = r > 0.3 ? 8 : r > 0.1 ? 4 : 2;
    for (let j = 0; j < n; j++) stations.push((k + j / n) / m);
  });
  stations.push(1);
  const trunk = head.depth === 0;
  return {
    at: (s, out) => {
      const [k, u] = locate(s);
      return curves[k](u, out);
    },
    radius: (s) => {
      const [k, u] = locate(s);
      const r = starts[k] + (ends[k] - starts[k]) * u;
      return trunk && k === 0 ? r * (1 + 0.5 * Math.exp(-u * 7)) : r;
    },
    rings: stations.length - 1,
    stations,
    sides: head.r > 0.3 ? 12 : head.r > 0.1 ? 7 : 5,
    cap: true,
    startCap: side,
    ridges: head.r > 0.3 ? 0.04 : 0,
    shade: (s) => {
      const [k, u] = locate(s);
      if (k) return 1;
      return trunk ? 0.82 + 0.18 * Math.min(1, u * 4) : 0.9 + 0.1 * Math.min(1, u * 3);
    },
    seed,
  };
}

/** A flat buttress root from the trunk's foot into the ground. */
function rootTube(b: Branch, seed: number): Tube {
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
    cap: true,
    startCap: true,
    shade: (s) => 1 - 0.2 * s,
    seed,
  };
}
