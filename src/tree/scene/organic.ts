import * as THREE from "three";

/**
 * Organic geometry for the tree scene's vegetation: curved tapered tubes merged into one smooth mesh,
 * lumpy foliage balls, and normals bent towards a crown's centre so overlapping lumps shade as one
 * mass. Nothing here draws from a scene RNG: variation comes from `hash`, so the createRng(11)
 * layout is untouched.
 */

/** Deterministic value in [0, 1) from up to three numbers (no RNG state). */
export function hash(a: number, b = 0, c = 0): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** One tube: an axis curve, a radius profile and a ring resolution. */
export interface Tube {
  /** Point on the axis at s ∈ [0, 1]. */
  at(s: number, out: THREE.Vector3): THREE.Vector3;
  radius(s: number): number;
  rings: number;
  sides: number;
  /** Explicit ring positions in [0, 1] (ascending, ending at 1); replaces the even `rings` split. */
  stations?: readonly number[];
  /** Cross-section stretch along the transported normal (flat buttress roots). */
  stretch?: number;
  /** First normal of the transported frame (the stretch direction at s = 0). */
  normal0?: THREE.Vector3;
  /** Rounded tip after s = 1; a number scales its length (a short dome seals a fork). */
  cap?: boolean | number;
  /** Closes the start with a short dome pointing backwards (a side branch rooted in a limb). */
  startCap?: boolean;
  /** Vertex shade multiplier along the tube (darker crevices and feet). */
  shade?(s: number): number;
  /** Amplitude of soft bark ridges, as a share of the radius. */
  ridges?: number;
  /** Seed of the ridge and bulge pattern. */
  seed?: number;
}

/** Cubic Bézier through four points, as a `Tube.at`. */
export function bezier(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
): (s: number, out: THREE.Vector3) => THREE.Vector3 {
  return (s, out) => {
    const u = 1 - s;
    return out
      .copy(a)
      .multiplyScalar(u * u * u)
      .addScaledVector(b, 3 * u * u * s)
      .addScaledVector(c, 3 * u * s * s)
      .addScaledVector(d, s * s * s);
  };
}

/**
 * Merges tubes into one indexed geometry (rings wrap without a seam vertex, so smooth normals have no
 * crease). Frames are parallel-transported, so a tube never twists. `color` gets a shade attribute
 * for a `vertexColors` material. Every vertex also carries `aBark` (cos and sin of its angle around
 * the axis, length along the axis, radius) for `withBark`.
 */
export function tubesGeometry(
  tubes: readonly Tube[],
  color?: THREE.ColorRepresentation,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const bark: number[] = [];
  const index: number[] = [];
  const base = new THREE.Color(color ?? "#ffffff");
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const t = new THREE.Vector3();
  const prevT = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (const tube of tubes) {
    const start = pos.length / 3;
    const { sides } = tube;
    const stations =
      tube.stations ?? Array.from({ length: tube.rings + 1 }, (_, i) => i / tube.rings);
    let along = (tube.seed ?? 0) * 3.7;
    const last = new THREE.Vector3();
    const stretch = tube.stretch ?? 1;
    const seed = tube.seed ?? 0;
    const ridges = tube.ridges ?? 0;
    const tangent = (s: number): THREE.Vector3 =>
      t
        .copy(tube.at(Math.min(1, s + 1e-3), q))
        .sub(tube.at(Math.max(0, s - 1e-3), p))
        .normalize();
    tangent(0);
    if (tube.normal0) n.copy(tube.normal0).addScaledVector(t, -tube.normal0.dot(t));
    else n.set(0, 0, 0);
    if (n.lengthSq() < 1e-6) {
      n.set(Math.abs(t.y) < 0.9 ? 0 : 1, Math.abs(t.y) < 0.9 ? 1 : 0, 0);
      n.addScaledVector(t, -n.dot(t));
    }
    n.normalize();
    prevT.copy(t);
    const back = t.clone();
    /** Pushes one ring at `centre` with radius `r` in the current frame. */
    const ring = (centre: THREE.Vector3, r: number, s: number, shade: number): void => {
      b.crossVectors(t, n).normalize();
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const bump =
          1 +
          ridges * Math.sin(a * 5 + s * 3 + seed) +
          0.05 * Math.sin(a * 2 + seed * 1.7) * Math.sin(Math.PI * Math.min(1, s));
        v.copy(centre)
          .addScaledVector(n, Math.cos(a) * r * stretch * bump)
          .addScaledVector(b, Math.sin(a) * r * bump);
        pos.push(v.x, v.y, v.z);
        col.push(base.r * shade, base.g * shade, base.b * shade);
        bark.push(Math.cos(a), Math.sin(a), along, r);
      }
    };
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      tangent(s);
      const angle = prevT.angleTo(t);
      if (angle > 1e-5) {
        axis.crossVectors(prevT, t).normalize();
        n.applyAxisAngle(axis, angle);
      }
      prevT.copy(t);
      tube.at(s, p);
      if (i) along += p.distanceTo(last);
      last.copy(p);
      ring(p, tube.radius(s), s, tube.shade?.(s) ?? 1);
    }
    let count = stations.length;
    if (tube.cap) {
      const end = tube.at(1, q).clone();
      const r = tube.radius(1);
      const reach = tube.cap === true ? 1 : tube.cap;
      ring(p.copy(end).addScaledVector(t, r * 0.45 * reach), r * 0.72, 1, tube.shade?.(1) ?? 1);
      count++;
      const tip = end.addScaledVector(t, r * 0.8 * reach);
      pos.push(tip.x, tip.y, tip.z);
      bark.push(1, 0, along, r * 0.5);
      const shade = tube.shade?.(1) ?? 1;
      col.push(base.r * shade, base.g * shade, base.b * shade);
      const apex = start + count * sides;
      for (let k = 0; k < sides; k++) {
        index.push(
          start + (count - 1) * sides + k,
          start + (count - 1) * sides + ((k + 1) % sides),
          apex,
        );
      }
    }
    for (let i = 0; i < count - 1; i++) {
      for (let k = 0; k < sides; k++) {
        const a = start + i * sides + k;
        const c = start + i * sides + ((k + 1) % sides);
        const d = a + sides;
        const e = c + sides;
        index.push(a, c, d, c, e, d);
      }
    }
    if (tube.startCap) {
      const r = tube.radius(0);
      const foot = tube.at(0, q).addScaledVector(back, -r * 0.5);
      pos.push(foot.x, foot.y, foot.z);
      const shade = tube.shade?.(0) ?? 1;
      col.push(base.r * shade, base.g * shade, base.b * shade);
      bark.push(1, 0, (tube.seed ?? 0) * 3.7, r * 0.5);
      const apex = pos.length / 3 - 1;
      for (let k = 0; k < sides; k++) index.push(start + ((k + 1) % sides), start + k, apex);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  if (color !== undefined) geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("aBark", new THREE.Float32BufferAttribute(bark, 4));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Foliage lump: an icosphere with soft low-frequency bulges and a flatter underside, so instances
 * turned to different headings never repeat one sphere.
 */
export function lumpyBall(
  radius: number,
  detail: number,
  seed = 0,
  underside = 0.78,
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = bulge(x, y, z, seed) * radius;
    p.setXYZ(i, x * k, y * k * (y < 0 ? underside : 1), z * k);
  }
  return mergeAndSmooth(geo);
}

/** Radial scale of a `lumpyBall` in the unit direction (x, y, z). */
function bulge(x: number, y: number, z: number, seed: number): number {
  return (
    1 +
    0.1 * Math.sin(x * 2.6 + seed) * Math.sin(y * 2.3 + seed * 1.3) * Math.sin(z * 2.9 + 1.1) +
    0.06 * Math.sin(x * 5.1 + 2 + seed) * Math.sin(z * 4.7 + seed * 0.7) +
    0.05 * Math.sin(y * 4.3 + seed * 2.1)
  );
}

/** Welds the seams of a non-indexed sphere so its normals are smooth across them. */
function mergeAndSmooth(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  const pos = geo.attributes.position;
  const keys = new Map<string, number>();
  const out: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let at = keys.get(key);
    if (at === undefined) {
      at = out.length / 3;
      keys.set(key, at);
      out.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    index.push(at);
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  merged.setIndex(index);
  merged.computeVertexNormals();
  geo.dispose();
  return merged;
}

/**
 * Bends the normals of a crown's lumps towards the direction from the crown's centre, so the lumps
 * light as one foliage mass instead of a pile of balls. `mesh` must own its geometry and already sit
 * in the crown's space (position and scale set). `squash` flattens the radial field vertically.
 */
export function bendNormals(
  mesh: THREE.Mesh,
  centre: THREE.Vector3,
  amount: number,
  squash = 1,
): void {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const s = mesh.scale;
  const local = new THREE.Vector3();
  const world = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const own = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    local.fromBufferAttribute(pos, i);
    world.copy(local).multiply(s).add(mesh.position);
    radial.copy(world).sub(centre);
    radial.y *= squash;
    radial.normalize();
    own.fromBufferAttribute(nor, i).divide(s).normalize();
    own.lerp(radial, amount).normalize().multiply(s).normalize();
    nor.setXYZ(i, own.x, own.y, own.z);
  }
  nor.needsUpdate = true;
}

/**
 * Restrained procedural bark on a `tubesGeometry` material: fine wavy vertical fissures and a faint
 * mottling, only darkening the colour (no texture, no normal change). It fades out on thin branches,
 * so twigs stay plain. `strength` is the darkest a fissure gets.
 */
export function withBark<T extends THREE.MeshStandardMaterial>(material: T, strength = 0.16): T {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aBark;\nvarying vec4 vBark;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBark = aBark;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec4 vBark;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  float a = atan(vBark.y, vBark.x);
  float v = vBark.z;
  float grain = smoothstep(0.07, 0.4, vBark.w);
  float wave = a * 7.0 + 1.3 * sin(v * 1.4 + a * 2.0) + 0.6 * sin(v * 3.9 - a);
  float fissure = 1.0 - smoothstep(0.0, 0.22, abs(sin(wave)));
  float mottle = sin(v * 0.8 + a * 1.5) * sin(v * 2.1 - a * 0.7);
  diffuseColor.rgb *= 1.0 - grain * (${strength.toFixed(3)} * fissure + 0.04 * (0.5 + 0.5 * mottle));
}`,
      );
  };
  material.customProgramCacheKey = () => `bark-${strength}`;
  return material;
}
