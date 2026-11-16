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
 * Builds a bendable limb: `rings` elliptical rings of `sides` vertices along a curve through the
 * points given to `update`. `radius(u)` returns the half widths across and through the limb at
 * u ∈ [0, 1]; `paint(u, facing)` colours it (facing: 1 on the front line, −1 on the back one).
 */
export function bendy(
  material: THREE.Material,
  rings: number,
  sides: number,
  radius: (u: number) => readonly [number, number],
  paint: (u: number, facing: number, out: THREE.Color) => void,
): Bendy {
  const count = (rings + 1) * sides + 1;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const colour = new THREE.Color();
  const index: number[] = [];
  for (let i = 0; i <= rings; i++) {
    for (let j = 0; j < sides; j++) {
      paint(i / rings, Math.sin((j / sides) * Math.PI * 2), colour);
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  geometry.setIndex(index);
  // The limb moves every frame: one generous sphere serves culling and picking.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const curve = new THREE.CatmullRomCurve3([], false, "centripetal");
  const c = new THREE.Vector3();
  const t = new THREE.Vector3();
  const s = new THREE.Vector3();
  const f = new THREE.Vector3();
  const across = new THREE.Vector3(1, 0, 0);

  return {
    mesh,
    update(points) {
      curve.points = points as THREE.Vector3[];
      for (let i = 0; i <= rings; i++) {
        const u = i / rings;
        curve.getPoint(u, c);
        curve.getTangent(u, t);
        s.copy(across).addScaledVector(t, -across.dot(t)).normalize();
        f.crossVectors(s, t);
        const [rx, rz] = radius(u);
        for (let j = 0; j < sides; j++) {
          const a = (j / sides) * Math.PI * 2;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          const k = (i * sides + j) * 3;
          position[k] = c.x + s.x * cos * rx + f.x * sin * rz;
          position[k + 1] = c.y + s.y * cos * rx + f.y * sin * rz;
          position[k + 2] = c.z + s.z * cos * rx + f.z * sin * rz;
          // Normal of the ellipse, good enough for a matte skin.
          const nx = (cos / rx) * s.x + (sin / rz) * f.x;
          const ny = (cos / rx) * s.y + (sin / rz) * f.y;
          const nz = (cos / rx) * s.z + (sin / rz) * f.z;
          const l = Math.hypot(nx, ny, nz) || 1;
          normal[k] = nx / l;
          normal[k + 1] = ny / l;
          normal[k + 2] = nz / l;
        }
      }
      const [, rz] = radius(1);
      const k = tip * 3;
      position[k] = c.x + t.x * rz;
      position[k + 1] = c.y + t.y * rz;
      position[k + 2] = c.z + t.z * rz;
      normal[k] = t.x;
      normal[k + 1] = t.y;
      normal[k + 2] = t.z;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
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

const eyeMat = mat("#2a1d16", { roughness: 0.25 });
const shineMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });

/** Glossy round eye with a highlight; scale its y to close the lid. */
export function eye(x: number, y: number, z: number, r: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(
    part(SPHERE, eyeMat, 0, 0, 0, r, r * 1.2, r * 0.8),
    part(SPHERE, shineMat, r * 0.35, r * 0.45, r * 0.6, r * 0.32),
  );
  return g;
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
