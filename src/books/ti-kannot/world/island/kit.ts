import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const tint = new THREE.Color();

/** `geometry` painted in one colour (vertex colours), unindexed and without uv, ready to merge. */
export function painted(geometry: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.deleteAttribute("uv");
  g.clearGroups();
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  tint.set(color);
  const count = g.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) tint.toArray(colors, i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** `geometry` with one normal per face, for hard-edged shapes (roofs, stones). */
export function faceted(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geometry.dispose();
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  return g;
}

/** Widest horizontal distance from the y axis to any vertex of `geometry`. */
export function reach(geometry: THREE.BufferGeometry): number {
  const p = geometry.getAttribute("position");
  let r = 0;
  for (let i = 0; i < p.count; i++) r = Math.max(r, Math.hypot(p.getX(i), p.getZ(i)));
  return r;
}

/** One geometry from painted parts (each part is disposed). */
export function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  return geometry;
}

/** Collects painted parts and merges them into a single vertex-coloured geometry. */
export class Kit {
  readonly parts: THREE.BufferGeometry[] = [];

  /**
   * Adds `geometry` in `color`, rotated then moved to (x, y, z). Rotation order YXZ: a part lying
   * along +z is tilted by `rx` around its own width, then turned by `ry`.
   */
  add(
    geometry: THREE.BufferGeometry,
    color: string,
    [x, y, z]: readonly number[] = [0, 0, 0],
    [rx, ry, rz]: readonly number[] = [0, 0, 0],
  ): this {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
      new THREE.Vector3(1, 1, 1),
    );
    this.parts.push(painted(geometry, color).applyMatrix4(m));
    return this;
  }

  /** Box of size (w, h, d) centred at `at`. */
  box(w: number, h: number, d: number, color: string, at: readonly number[], rot?: number[]): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, at, rot);
  }

  /** Merges every part added so far. */
  build(): THREE.BufferGeometry {
    return merged(this.parts.splice(0));
  }
}
