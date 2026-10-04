import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { islandHeight, riverDistance } from "./terrain";

const SIZE = 64;
const SEGMENTS = 128;
const PALETTE = {
  bed: new THREE.Color("#cdb88e"),
  sand: new THREE.Color("#f6e6b8"),
  lush: new THREE.Color("#8fd27a"),
  grass: new THREE.Color("#ade07c"),
  forest: new THREE.Color("#6aae6c"),
  high: new THREE.Color("#7c9a72"),
  rock: new THREE.Color("#b3a99c"),
};
const DRY = new THREE.Color("#e8d39a");
const WHITE = new THREE.Color("#ffffff");

/** Paint colour of a ground face from its height, steepness (normal y) and river distance. */
function faceColor(h: number, up: number, toRiver: number): THREE.Color {
  if (toRiver < 0.9 && h < 6) return PALETTE.bed;
  if (h < 0.9) return PALETTE.sand;
  if (up < 0.72) return PALETTE.rock;
  if (h > 6) return PALETTE.high;
  if (h > 2.6) return PALETTE.forest;
  if (toRiver < 1.8) return PALETTE.lush;
  return PALETTE.grass;
}

/** Softly lit island ground painted in patches; the drought tints it towards dry straw. */
export function createGround(rng: Rng): { mesh: THREE.Mesh; update(env: MixedEnv): void } {
  const relief = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2);
  const heights = relief.getAttribute("position");
  for (let i = 0; i < heights.count; i++) {
    heights.setY(i, islandHeight(heights.getX(i), heights.getZ(i)));
  }
  relief.computeVertexNormals();
  // Smooth light over the relief, but one paint colour per face.
  const geometry = relief.toNonIndexed();
  relief.dispose();
  const pos = geometry.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    va.fromBufferAttribute(pos, i);
    vb.fromBufferAttribute(pos, i + 1);
    vc.fromBufferAttribute(pos, i + 2);
    normal.subVectors(vc, vb).cross(edge.subVectors(va, vb)).normalize();
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const h = (va.y + vb.y + vc.y) / 3;
    tint.copy(faceColor(h, Math.abs(normal.y), riverDistance(cx, cz)));
    tint.offsetHSL(0, 0, (rng() - 0.5) * 0.05);
    for (let k = 0; k < 3; k++) tint.toArray(colors, (i + k) * 3);
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
