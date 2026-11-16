import * as THREE from "three";
import { clamp } from "@shared/math";
import { groundHeight } from "../ground";
import type { CritterName, CritterState } from "./wander";

/** What a critter can look at and how lively it may be, given to `pose` every frame. */
export interface Surroundings {
  /** World positions on the ground plane: the camera, the Konteur, the other critter. */
  camera: THREE.Vector3;
  teller: THREE.Vector3;
  other: THREE.Vector3;
  /** Reduced motion: the critter keeps still but for its breath and its eyes. */
  calm: boolean;
}

export interface CritterView {
  group: THREE.Group;
  /** Bubble anchor height above the ground, world units. */
  top: number;
  pose(c: CritterState, time: number, around: Surroundings): void;
}

/** Small parts (eyes, nails, cheeks). */
export const SPHERE = new THREE.SphereGeometry(1, 22, 16);
/** Large parts: enough segments for a round outline at twice the displayed size. */
export const SMOOTH = new THREE.SphereGeometry(1, 44, 30);

/**
 * Matte painted material: a warm light catches the edges turned away from the camera, so the
 * outline holds against the lawn and the bark.
 */
export const mat = (
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial => {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float critterRim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.4);
       outgoingLight += vec3(1.0, 0.82, 0.6) * critterRim * 0.3 * (0.3 + 0.7 * diffuseColor.rgb);
       #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => "critter-rim";
  return material;
};

/**
 * A copy of `geo` painted per vertex: `paint` gets the vertex position and writes its colour
 * (linear). Used for bellies, inner ears and tips, which are part of the skin, not separate shells.
 */
export function painted(
  geo: THREE.BufferGeometry,
  paint: (p: THREE.Vector3, out: THREE.Color) => void,
): THREE.BufferGeometry {
  const copy = geo.clone();
  const position = copy.attributes.position;
  const colours = new Float32Array(position.count * 3);
  const p = new THREE.Vector3();
  const colour = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    paint(p.fromBufferAttribute(position, i), colour);
    colours.set([colour.r, colour.g, colour.b], i * 3);
  }
  copy.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return copy;
}

/** One piece of a fused shape: a geometry, its flat colour, its place and its scale. */
export type Piece = readonly [
  geo: THREE.BufferGeometry,
  colour: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy?: number,
  sz?: number,
];

/**
 * Welds rigid pieces into one vertex-coloured geometry, so a head with its muzzle and cheeks or a
 * leg with its nails costs one draw call. Pieces must be indexed; texture coordinates are dropped.
 */
export function fused(pieces: readonly Piece[]): THREE.BufferGeometry {
  const total = pieces.reduce((n, [geo]) => n + geo.attributes.position.count, 0);
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const colours = new Float32Array(total * 3);
  const index: number[] = [];
  const colour = new THREE.Color();
  const n = new THREE.Vector3();
  let base = 0;
  for (const [geo, hex, x, y, z, sx, sy = sx, sz = sx] of pieces) {
    const p = geo.attributes.position;
    const from = geo.attributes.normal;
    colour.set(hex);
    for (let i = 0; i < p.count; i++) {
      const k = (base + i) * 3;
      position[k] = p.getX(i) * sx + x;
      position[k + 1] = p.getY(i) * sy + y;
      position[k + 2] = p.getZ(i) * sz + z;
      n.set(from.getX(i) / sx, from.getY(i) / sy, from.getZ(i) / sz).normalize();
      normal.set([n.x, n.y, n.z], k);
      colours.set([colour.r, colour.g, colour.b], k);
    }
    const own = geo.index;
    if (own) for (let i = 0; i < own.count; i++) index.push(base + own.getX(i));
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(position, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  out.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  out.setIndex(index);
  return out;
}

/** Smooth 0 → 1 step of `x` between `a` and `b`. */
export const ramp = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A damped spring: position and speed. */
export interface Spring {
  x: number;
  v: number;
}

/** Moves a spring towards `target` (stiffness `k`, damping `d`) and returns its position. */
export function springTo(s: Spring, target: number, k: number, d: number, dt: number): number {
  s.v += ((target - s.x) * k - s.v * d) * dt;
  s.x += s.v * dt;
  return s.x;
}

/** Repeatable noise in [0, 1) from two numbers. */
export const noise = (a: number, b = 0): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Eyelids on an irregular clock: 1 with the eyes open, down to 0.08 during a blink of 0.14 s.
 * Blinks come every 2 to 6.5 s, sometimes twice in a row; `seed` sets each critter's own rhythm.
 */
export function blink(time: number, seed: number): number {
  const slot = Math.floor(time / 2.3);
  for (const k of [slot - 2, slot - 1, slot]) {
    const start = k * 2.3 + noise(k, seed) * 4.2;
    const twice = noise(k, seed + 7) < 0.25 ? 0.3 : 0;
    for (const at of twice ? [start, start + twice] : [start]) {
      const u = (time - at) / 0.14;
      if (u > 0 && u < 1) return 1 - Math.sin(u * Math.PI) * 0.92;
    }
  }
  return 1;
}

/** A limb of one skin bent along a few points: trunk, ears, tail. */
export interface Bendy {
  mesh: THREE.Mesh;
  /** Lays the limb along `points` (mesh-local, root first); its width runs along local x. */
  update(points: readonly THREE.Vector3[]): void;
}

/**
 * Builds a bendable limb: `rings` elliptical rings of `sides` vertices along the Catmull-Rom curve
 * through the `joints` points given to `update`. `radius(u)` returns the half widths across and
 * through the limb at u ∈ [0, 1]; `paint(u, facing)` colours it (facing: 1 on the front line, −1 on
 * the back one). The curve's weights and the radii are worked out once; a frame only blends the
 * points and writes one buffer.
 */
export function bendy(
  material: THREE.Material,
  joints: number,
  rings: number,
  sides: number,
  radius: (u: number) => readonly [number, number],
  paint: (u: number, facing: number, out: THREE.Color) => void,
): Bendy {
  const count = (rings + 1) * sides + 1;
  // Position and normal share one buffer: a single upload per limb and per frame.
  const data = new Float32Array(count * 6);
  const colours = new Float32Array(count * 3);
  const colour = new THREE.Color();
  const index: number[] = [];
  /** Per ring: the four control points it blends, their weights for the point and the tangent. */
  const blend: { at: number[]; w: number[]; d: number[]; rx: number; rz: number }[] = [];
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;
    const span = Math.min(joints - 2, Math.floor(u * (joints - 1)));
    const t = u * (joints - 1) - span;
    const [rx, rz] = radius(u);
    blend.push({
      at: [-1, 0, 1, 2].map((k) => Math.min(joints - 1, Math.max(0, span + k))),
      w: [
        (-t * t * t + 2 * t * t - t) / 2,
        (3 * t * t * t - 5 * t * t + 2) / 2,
        (-3 * t * t * t + 4 * t * t + t) / 2,
        (t * t * t - t * t) / 2,
      ],
      d: [
        (-3 * t * t + 4 * t - 1) / 2,
        (9 * t * t - 10 * t) / 2,
        (-9 * t * t + 8 * t + 1) / 2,
        (3 * t * t - 2 * t) / 2,
      ],
      rx,
      rz,
    });
    for (let j = 0; j < sides; j++) {
      paint(u, Math.sin((j / sides) * Math.PI * 2), colour);
      colours.set([colour.r, colour.g, colour.b], (i * sides + j) * 3);
      if (i < rings) {
        const a = i * sides + j;
        const b = i * sides + ((j + 1) % sides);
        index.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
  }
  const tip = count - 1;
  paint(1, 0, colour);
  colours.set([colour.r, colour.g, colour.b], tip * 3);
  for (let j = 0; j < sides; j++)
    index.push(rings * sides + j, tip, rings * sides + ((j + 1) % sides));
  /** cos and sin of each side's angle, flat. */
  const circle = new Float32Array(sides * 2);
  for (let j = 0; j < sides; j++) {
    circle[j * 2] = Math.cos((j / sides) * Math.PI * 2);
    circle[j * 2 + 1] = Math.sin((j / sides) * Math.PI * 2);
  }
  const buffer = new THREE.InterleavedBuffer(data, 6);
  buffer.setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute("normal", new THREE.InterleavedBufferAttribute(buffer, 3, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  geometry.setIndex(index);
  // The limb moves every frame: one generous sphere serves culling and picking.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  return {
    mesh,
    update(points) {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      let tx = 0;
      let ty = 1;
      let tz = 0;
      for (let i = 0; i <= rings; i++) {
        const ring = blend[i];
        cx = cy = cz = tx = ty = tz = 0;
        for (let k = 0; k < 4; k++) {
          const p = points[ring.at[k]];
          const w = ring.w[k];
          const d = ring.d[k];
          cx += p.x * w;
          cy += p.y * w;
          cz += p.z * w;
          tx += p.x * d;
          ty += p.y * d;
          tz += p.z * d;
        }
        const tl = 1 / (Math.sqrt(tx * tx + ty * ty + tz * tz) || 1);
        tx *= tl;
        ty *= tl;
        tz *= tl;
        // Width axis: local x made square to the tangent; front axis: width × tangent.
        let sx = 1 - tx * tx;
        let sy = -tx * ty;
        let sz = -tx * tz;
        const sl = 1 / (Math.sqrt(sx * sx + sy * sy + sz * sz) || 1);
        sx *= sl;
        sy *= sl;
        sz *= sl;
        const fx = sy * tz - sz * ty;
        const fy = sz * tx - sx * tz;
        const fz = sx * ty - sy * tx;
        const { rx, rz } = ring;
        let k = i * sides * 6;
        for (let j = 0; j < sides; j++, k += 6) {
          const cos = circle[j * 2];
          const sin = circle[j * 2 + 1];
          data[k] = cx + sx * rx * cos + fx * rz * sin;
          data[k + 1] = cy + sy * rx * cos + fy * rz * sin;
          data[k + 2] = cz + sz * rx * cos + fz * rz * sin;
          // Normal of the ellipse, good enough for a matte skin.
          const a = cos / rx;
          const b = sin / rz;
          const nx = a * sx + b * fx;
          const ny = a * sy + b * fy;
          const nz = a * sz + b * fz;
          const l = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
          data[k + 3] = nx * l;
          data[k + 4] = ny * l;
          data[k + 5] = nz * l;
        }
      }
      const reach = blend[rings].rz;
      const k = tip * 6;
      data[k] = cx + tx * reach;
      data[k + 1] = cy + ty * reach;
      data[k + 2] = cz + tz * reach;
      data[k + 3] = tx;
      data[k + 4] = ty;
      data[k + 5] = tz;
      buffer.needsUpdate = true;
    },
  };
}

/** Positioned, scaled mesh (v14 `mk`). */
export function part(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = sx,
  sz = sx,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

const eyeMat = new THREE.MeshStandardMaterial({ roughness: 0.25, vertexColors: true });
const EYE = new THREE.SphereGeometry(1, 14, 10);
let eyeGeo: THREE.BufferGeometry | null = null;

/** Glossy round eye with a highlight, one mesh in a holder; scale the holder's y to close the lid. */
export function eye(x: number, y: number, z: number, r: number): THREE.Group {
  eyeGeo ??= fused([
    [EYE, "#2a1d16", 0, 0, 0, 1, 1.2, 0.8],
    [EYE, "#ffffff", 0.35, 0.45, 0.6, 0.32],
  ]);
  const ball = new THREE.Mesh(eyeGeo, eyeMat);
  ball.scale.setScalar(r);
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.add(ball);
  return holder;
}

/** Yellow / red / green madras check, repeated around Lapen's scarf. */
export function madrasTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  if (x) {
    x.fillStyle = "#e8b23a";
    x.fillRect(0, 0, 64, 64);
    x.globalAlpha = 0.85;
    for (const [col, p, w] of [
      ["#d2432c", 0, 14],
      ["#d2432c", 32, 14],
      ["#3f8a4a", 18, 5],
      ["#3f8a4a", 50, 5],
    ] as const) {
      x.fillStyle = col;
      x.fillRect(p, 0, w, 64);
      x.fillRect(0, p, 64, w);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let blobTexture: THREE.CanvasTexture | null = null;

/** Soft brown contact shadow of radius `r`. */
export function blobShadow(r: number): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  if (!blobTexture) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    if (x) {
      const g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
      g.addColorStop(0, "rgba(70,40,20,.45)");
      g.addColorStop(1, "rgba(70,40,20,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
    }
    blobTexture = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

/** Tags the group for picking. */
export function tag(group: THREE.Group, who: CritterName): void {
  group.userData.who = who;
}

/** Shrinks and fades a contact shadow as its owner leaves the ground by `height` (in own units). */
export function liftShadow(
  shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>,
  height: number,
): void {
  const k = 1 / (1 + height * 1.6);
  shadow.scale.setScalar(k);
  shadow.material.opacity = k;
}

/** Yaw, within ±`limit`, that turns a head on a body of heading `yaw` at `from` towards `to`. */
export function gazeYaw(
  from: THREE.Vector3,
  yaw: number,
  to: THREE.Vector3,
  limit: number,
): number {
  const d = Math.atan2(to.x - from.x, to.z - from.z) - yaw;
  return clamp(Math.atan2(Math.sin(d), Math.cos(d)), -limit, limit);
}

/** Puts the critter on the ground at its walk position and heading. */
export function place(group: THREE.Group, c: CritterState): void {
  group.position.set(c.pos[0], groundHeight(c.pos[0], c.pos[1]), c.pos[1]);
  group.rotation.y = c.yaw;
}
