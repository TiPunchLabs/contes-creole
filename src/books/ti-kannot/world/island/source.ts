import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { soften } from "../soft";
import { SPOTS } from "./spots";
import { islandHeight, riverPoint } from "./terrain";

/** Where Gwo Rako's dam stands along the river (0 = source, 1 = mouth), and its half width. */
export const DAM = { t: 0.06, half: 1.4 } as const;

/** Flat-shaded Lambert material (wood). */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

const ROCK_TOP = new THREE.Color("#c2b29a");
const ROCK_BASE = new THREE.Color("#8a7d6c");
const MOSS = new THREE.Color("#8aa25e");

/**
 * Paints a boulder like the poster's: pale where the light falls, darker and damp at its foot, with
 * moss patches on its upper slopes (deterministic, no RNG draw).
 */
function mottled(g: THREE.BufferGeometry): THREE.BufferGeometry {
  g.computeBoundingBox();
  const box = g.boundingBox ?? new THREE.Box3();
  const p = g.getAttribute("position");
  const n = g.getAttribute("normal");
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = (p.getY(i) - box.min.y) / Math.max(box.max.y - box.min.y, 1e-3);
    c.copy(ROCK_BASE).lerp(ROCK_TOP, THREE.MathUtils.smoothstep(y, 0.15, 0.85));
    const patch =
      Math.sin(p.getX(i) * 2.3 + p.getZ(i) * 1.6) * Math.cos(p.getZ(i) * 2.9 - p.getY(i));
    if (n.getY(i) > 0.35 && patch > 0.25) c.lerp(MOSS, Math.min((patch - 0.25) * 2.5, 0.7));
    c.toArray(colors, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Smooth stone material: rounded, water-worn rocks as on the poster. */
const stoneMaterial = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color });

/** A rounded boulder of radius `r` with a few gentle lumps (deterministic, no RNG draw). */
function boulder(r: number, detail: number): THREE.BufferGeometry {
  const g = soften(new THREE.IcosahedronGeometry(r, detail));
  const p = g.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const lump = 1 + 0.07 * Math.sin(v.x * 3.1 + v.z * 1.7) * Math.cos(v.y * 2.3 - v.x);
    p.setXYZ(i, v.x * lump, v.y * lump, v.z * lump);
  }
  g.computeVertexNormals();
  return g;
}

/** The source behind the big rock: pool, dead branches choking it and Gwo Rako's dam. */
export function createSource(rng: Rng): {
  group: THREE.Group;
  update(env: MixedEnv, time: number): void;
} {
  const [rx, rz] = SPOTS.rock;
  const rock = new THREE.Mesh(
    mottled(boulder(1.6, 2).scale(1.3, 1.1, 1)),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  rock.position.set(rx, islandHeight(rx, rz) + 0.8, rz);
  rock.rotation.set(0.2, 0.7, 0.1);

  const head = riverPoint(0);
  const poolMaterial = new THREE.MeshBasicMaterial({
    color: "#7fd6cf",
    transparent: true,
    opacity: 0.9,
  });
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 12).rotateX(-Math.PI / 2),
    poolMaterial,
  );
  pool.position.set(head.x, islandHeight(head.x, head.y) + 0.2, head.y);

  const wood = paint("#6b4a32");
  const branches = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6 + rng(), 4), wood);
    stick.position.set((rng() - 0.5) * 1.6, 0.2 + rng() * 0.3, (rng() - 0.5) * 1.6);
    stick.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.6, rng() * 6.28, (rng() - 0.5) * 0.6);
    branches.add(stick);
  }
  branches.position.copy(pool.position);

  const damAt = riverPoint(DAM.t);
  const ahead = riverPoint(DAM.t + 0.01).sub(damAt);
  const stone = stoneMaterial("#a69885");
  const dam = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(boulder(0.35, 1), stone);
    s.position.set((i - 2) * 0.55, 0.2, 0);
    dam.add(s);
  }
  for (const y of [0.45, 0.75]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(DAM.half * 2, 0.22, 0.12), wood);
    plank.position.y = y;
    dam.add(plank);
  }
  dam.position.set(damAt.x, islandHeight(damAt.x, damAt.y), damAt.y);
  dam.rotation.y = Math.atan2(ahead.x, ahead.y);

  const group = new THREE.Group();
  group.add(rock, pool, branches, dam);
  return {
    group,
    update(env, time) {
      branches.visible = env.branches > 0.01;
      branches.scale.setScalar(Math.max(0.001, env.branches));
      dam.visible = env.dam > 0.01;
      dam.scale.set(1, Math.max(0.001, env.dam), 1);
      pool.scale.setScalar(1 - env.branches * 0.6);
      poolMaterial.opacity = 0.8 + Math.sin(time * 1.7) * 0.08;
    },
  };
}
