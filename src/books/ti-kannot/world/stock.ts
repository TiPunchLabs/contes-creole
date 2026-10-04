import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "./env";
import { STOCK } from "./island/spots";
import { islandHeight } from "./island/terrain";

export const MAX_STOCK = { kalbas: 50, barrels: 8, jars: 10 } as const;

/** Slot of the i-th item of a pile: [column, layer, row], rows of `cols`, layers of cols × rows. */
export function pileSlot(i: number, cols: number, rows: number): [number, number, number] {
  const perLayer = cols * rows;
  const k = i % perLayer;
  return [k % cols, Math.floor(i / perLayer), Math.floor(k / cols)];
}

const PALE = new THREE.Color("#c9bfa9");
const KINDS = [
  {
    key: "kalbas",
    geometry: new THREE.SphereGeometry(0.3, 7, 5).scale(1, 1.15, 1),
    color: "#c99f55",
    cols: 10,
    rows: 3,
    gap: 0.62,
    height: 0.55,
    origin: [0, 0],
  },
  {
    key: "barrels",
    geometry: new THREE.CylinderGeometry(0.32, 0.32, 0.75, 8),
    color: "#8a5a36",
    cols: 4,
    rows: 2,
    gap: 0.75,
    height: 0.75,
    origin: [6.4, 0.2],
  },
  {
    key: "jars",
    geometry: new THREE.CylinderGeometry(0.18, 0.32, 0.75, 7),
    color: "#c26b43",
    cols: 5,
    rows: 2,
    gap: 0.7,
    height: 0.75,
    origin: [-3.6, 0.2],
  },
] as const;

/** Gwo Rako's hoard behind his house: calabashes, barrels and jars; pale and tipped when empty. */
export function createStock(rng: Rng): { group: THREE.Group; update(env: MixedEnv): void } {
  const group = new THREE.Group();
  const piles = KINDS.map((kind) => {
    const material = new THREE.MeshLambertMaterial({ color: kind.color, flatShading: true });
    const max = MAX_STOCK[kind.key];
    const mesh = new THREE.InstancedMesh(kind.geometry, material, max);
    mesh.count = 0;
    const jitter = Array.from({ length: max }, () => [rng() - 0.5, rng() - 0.5, rng() * 6.28]);
    group.add(mesh);
    return { kind, material, mesh, jitter, base: new THREE.Color(kind.color) };
  });
  const m4 = new THREE.Matrix4();
  const at = new THREE.Vector3();
  const rot = new THREE.Euler();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  let key = "";
  return {
    group,
    update(env) {
      const next = `${env.kalbas}/${env.barrels}/${env.jars}/${Math.round(env.empty * 20)}`;
      if (next === key) return;
      key = next;
      for (const { kind, material, mesh, jitter, base } of piles) {
        mesh.count = Math.min(env[kind.key], MAX_STOCK[kind.key]);
        material.color.copy(base).lerp(PALE, env.empty * 0.7);
        for (let i = 0; i < mesh.count; i++) {
          const [col, layer, row] = pileSlot(i, kind.cols, kind.rows);
          const [jx, jz, yaw] = jitter[i];
          const x = STOCK[0] + kind.origin[0] + (col - kind.cols / 2) * kind.gap + jx * 0.12;
          const z = STOCK[1] + kind.origin[1] - row * kind.gap + jz * 0.12;
          const tip = env.empty * 1.3 * (jx > 0 ? 1 : -1) * (layer === 0 ? 1 : 0.4);
          at.set(x, islandHeight(x, z) + kind.height / 2 + layer * kind.height * 0.9, z);
          m4.compose(at, q.setFromEuler(rot.set(0, yaw, tip)), one);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
