import * as THREE from "three";
import { hash } from "./organic";

/**
 * Leaf geometry for the clearing's plants, in the frame the old plane leaves used (base at the
 * origin, growing along +y, arching towards -z). Every vertex carries `aSway` (0 at the stem, 1 at
 * the tip) for `withSway`, and a shade colour for `vertexColors`: leaflet bases darker, tips lighter.
 */

/** Shape of a pinnate frond (palms, tree ferns, ground ferns). */
export interface FrondSpec {
  /** Rachis length. */
  length: number;
  /** Leaflet pairs along the rachis. */
  pairs: number;
  /** Longest leaflet, as a share of the length. */
  leaflet: number;
  /** Leaflet width, as a share of its length. */
  width: number;
  /** How far the arch falls towards -z at the tip. */
  arch: number;
  /** Sideways sweep of the tip (+x). */
  sweep: number;
  /** Leaflets fold down from the rachis (a V seen end-on), 0 = flat. */
  fold: number;
  /** Forward angle of the leaflets from the rachis's side (radians). */
  angle: number;
  /** Segments along each leaflet (1 for distant, instanced blades). */
  segments: number;
  /** Share of leaflets dropped to make splits and gaps. */
  gaps: number;
  seed: number;
}

/** Point on a frond's rachis at s ∈ [0, 1]. */
function rachis(spec: FrondSpec, s: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(spec.sweep * s * s, s * spec.length, 0.25 * s - spec.arch * s * s);
}

/**
 * Pinnate frond: a tapering rachis carrying pairs of narrow leaflets that leave it at an angle,
 * fold down into a shallow V and droop towards their tips, longest in the lower middle. A few
 * leaflets are missing (splits), and each leaflet varies in length and tone.
 */
export function pinnateFrond(spec: FrondSpec): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const sway: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const t = new THREE.Vector3();
  const d = new THREE.Vector3();
  const w = new THREE.Vector3();
  const v = new THREE.Vector3();
  const down = new THREE.Vector3(0, 0, -1);
  const push = (at: THREE.Vector3, shade: number, s: number): number => {
    pos.push(at.x, at.y, at.z);
    col.push(shade, shade, shade);
    sway.push(Math.min(1, s));
    return pos.length / 3 - 1;
  };
  const tangent = (s: number): THREE.Vector3 =>
    t
      .copy(rachis(spec, Math.min(1, s + 0.01), q))
      .sub(rachis(spec, Math.max(0, s - 0.01), p))
      .normalize();

  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    rachis(spec, s, p);
    tangent(s);
    w.crossVectors(t, down).normalize();
    const r = spec.length * 0.012 * (1 - 0.7 * s);
    push(v.copy(p).addScaledVector(w, r), 0.8, s);
    push(v.copy(p).addScaledVector(w, -r), 0.8, s);
    if (i) {
      const a = pos.length / 3 - 4;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  for (let i = 0; i < spec.pairs; i++) {
    const s = 0.1 + (0.88 * (i + 0.5)) / spec.pairs;
    rachis(spec, s, p);
    tangent(s);
    for (const side of [-1, 1]) {
      if (hash(spec.seed, i, side) < spec.gaps) continue;
      const grow = Math.sin(Math.PI * Math.min(1, 0.18 + s * 0.95)) ** 0.7;
      const len = spec.length * spec.leaflet * grow * (0.85 + 0.3 * hash(spec.seed, i, side + 3));
      w.crossVectors(down, t).normalize().multiplyScalar(side);
      d.copy(t)
        .multiplyScalar(Math.cos(spec.angle))
        .addScaledVector(w, Math.sin(spec.angle))
        .addScaledVector(down, spec.fold)
        .normalize();
      const across = new THREE.Vector3().copy(t).addScaledVector(d, -t.dot(d)).normalize();
      const tone = 0.9 + 0.2 * hash(spec.seed, i, side + 7);
      const first = pos.length / 3;
      for (let k = 0; k <= spec.segments; k++) {
        const u = k / spec.segments;
        const width = len * spec.width * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.95)) ** 0.6;
        v.copy(p)
          .addScaledVector(d, len * u)
          .addScaledVector(down, len * 0.22 * u * u);
        const shade = tone * (0.72 + 0.38 * u);
        push(q.copy(v).addScaledVector(across, width * 0.5), shade, s + 0.25 * u);
        push(q.copy(v).addScaledVector(across, -width * 0.5), shade, s + 0.25 * u);
      }
      for (let k = 0; k < spec.segments; k++) {
        const a = first + k * 2;
        if (side > 0) index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        else index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("aSway", new THREE.Float32BufferAttribute(sway, 1));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** Shape of a broad leaf (banana, balisier). */
export interface BroadLeafSpec {
  length: number;
  width: number;
  /** Backward arch towards -z at the tip. */
  arch: number;
  /** Droop of the two halves from the raised midrib. */
  fold: number;
  /** Tears from the edge towards the midrib (banana leaves split in the wind). */
  tears: number;
  seed: number;
}

/**
 * Broad leaf: a narrow stalk, an oblong blade with a blunt tip, its halves folded down from a raised
 * midrib, an arch backwards, a gently waving edge and a few tears running in along the lateral
 * veins. `aLeaf` (signed share of the half-width, share of the length) feeds the painted veins.
 */
export function broadLeaf(spec: BroadLeafSpec): THREE.BufferGeometry {
  const rows = 22;
  const cols = 4;
  const pos: number[] = [];
  const col: number[] = [];
  const sway: number[] = [];
  const leaf: number[] = [];
  const index: number[] = [];
  const tearRows = new Map<number, number>();
  for (let k = 0; k < spec.tears; k++) {
    const row = 7 + Math.floor(hash(spec.seed, k, 1) * (rows - 9));
    const side = hash(spec.seed, k, 2) < 0.5 ? -1 : 1;
    tearRows.set(row * side, 0.25 + 0.5 * hash(spec.seed, k, 3));
  }
  const point = (y: number, x: number, out: THREE.Vector3): THREE.Vector3 => {
    const blade = Math.sqrt(Math.max(0, 1 - ((y - 0.58) / 0.45) ** 2));
    const half = (spec.width / 2) * (0.08 + 0.92 * blade ** 0.85);
    const across = x * half;
    const edge = x * x;
    return out.set(
      across + 0.06 * y * y,
      y * spec.length,
      0.15 * y -
        spec.arch * y * y -
        Math.abs(across) * spec.fold +
        0.05 * Math.sin(y * 31 + x * 2) * edge,
    );
  };
  const v = new THREE.Vector3();
  // Each half is its own grid (x from the midrib outwards); a torn row has two copies of its
  // vertices beyond the tear's start, pulled apart along the leaf so the tear opens at the edge.
  for (const side of [-1, 1]) {
    const lower: number[][] = [];
    const upper: number[][] = [];
    for (let j = 0; j <= rows; j++) {
      const y = j / rows;
      const tear = tearRows.get(j * side);
      const make = (gap: number): number[] => {
        const row: number[] = [];
        for (let i = 0; i <= cols; i++) {
          const x = (i / cols) * side;
          const open = tear !== undefined ? Math.max(0, (i / cols - tear) / (1 - tear)) : 0;
          point(y + gap * open * 0.06, x, v);
          pos.push(v.x, v.y, v.z);
          const shade = 0.82 + 0.22 * y - 0.08 * (i / cols);
          col.push(shade, shade, shade);
          sway.push(Math.min(1, y * 1.1 + 0.2 * (i / cols)));
          leaf.push(x, y);
          row.push(pos.length / 3 - 1);
        }
        return row;
      };
      const below = make(-1);
      lower.push(below);
      upper.push(tear !== undefined ? make(1) : below);
    }
    for (let j = 0; j < rows; j++) {
      const a = upper[j];
      const b = lower[j + 1];
      for (let i = 0; i < cols; i++) {
        if (side > 0) index.push(a[i], a[i + 1], b[i], a[i + 1], b[i + 1], b[i]);
        else index.push(a[i], b[i], a[i + 1], a[i + 1], b[i], b[i + 1]);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("aSway", new THREE.Float32BufferAttribute(sway, 1));
  geo.setAttribute("aLeaf", new THREE.Float32BufferAttribute(leaf, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
