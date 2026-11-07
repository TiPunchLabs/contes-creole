import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { soilAt } from "./landscape";
import { islandHeight, riverDistance } from "./terrain";

const SIZE = 64;
const SEGMENTS = 128;
const PALETTE = {
  bed: new THREE.Color("#d6c49a"),
  sand: new THREE.Color("#f4dfae"),
  lush: new THREE.Color("#8cc46a"),
  grass: new THREE.Color("#a8cf72"),
  forest: new THREE.Color("#5f9e5c"),
  high: new THREE.Color("#7a9866"),
  rock: new THREE.Color("#b6a48e"),
  earth: new THREE.Color("#d8b98a"),
  bank: new THREE.Color("#8fb46a"),
};
const DRY = new THREE.Color("#e8d39a");
const WHITE = new THREE.Color("#ffffff");

export type Paint = keyof typeof PALETTE;

/**
 * Paint of the ground face a–b–c from its centre, height, steepness (normal y) and river distance;
 * the scenery's yards, paths and banks first.
 */
export function facePaint(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, up: number): Paint {
  const x = (a.x + b.x + c.x) / 3;
  const z = (a.z + b.z + c.z) / 3;
  const h = (a.y + b.y + c.y) / 3;
  const toRiver = riverDistance(x, z);
  const soil = soilAt(x, z, toRiver, h);
  if (soil) return soil;
  if (toRiver < 0.9 && h < 6) return "bed";
  if (h < 0.9) return "sand";
  if (up < 0.72) return "rock";
  if (h > 6) return "high";
  if (h > 2.6) return "forest";
  if (toRiver < 1.8) return "lush";
  return "grass";
}

/**
 * Softly lit island ground: each face picks its paint, and each vertex blends the paints of the
 * faces around it, so patches meet in soft washes; the drought tints it towards dry straw.
 */
export function createGround(rng: Rng): { mesh: THREE.Mesh; update(env: MixedEnv): void } {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, islandHeight(pos.getX(i), pos.getZ(i)));
  }
  geometry.computeVertexNormals();
  const index = geometry.getIndex();
  if (!index) throw new Error("ground: indexed plane expected");
  const sums = new Float32Array(pos.count * 3);
  const weights = new Float32Array(pos.count);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let f = 0; f < index.count; f += 3) {
    const corners = [index.getX(f), index.getX(f + 1), index.getX(f + 2)];
    va.fromBufferAttribute(pos, corners[0]);
    vb.fromBufferAttribute(pos, corners[1]);
    vc.fromBufferAttribute(pos, corners[2]);
    normal.subVectors(vc, vb).cross(edge.subVectors(va, vb)).normalize();
    tint.copy(PALETTE[facePaint(va, vb, vc, Math.abs(normal.y))]);
    tint.offsetHSL(0, 0, (rng() - 0.5) * 0.05);
    for (const v of corners) {
      sums[v * 3] += tint.r;
      sums[v * 3 + 1] += tint.g;
      sums[v * 3 + 2] += tint.b;
      weights[v] += 1;
    }
  }
  const colors = new Float32Array(pos.count * 3);
  for (let v = 0; v < pos.count; v++) {
    const w = Math.max(weights[v], 1);
    colors.set([sums[v * 3] / w, sums[v * 3 + 1] / w, sums[v * 3 + 2] / w], v * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  return {
    mesh: new THREE.Mesh(geometry, material),
    update(env) {
      material.color.copy(WHITE).lerp(DRY, env.wilt * 0.55);
    },
  };
}
