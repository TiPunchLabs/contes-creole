import * as THREE from "three";
import { groundHeight } from "../ground";
import type { CritterName, CritterState } from "./wander";

export interface CritterView {
  group: THREE.Group;
  /** Bubble anchor height above the ground, world units. */
  top: number;
  pose(c: CritterState, time: number): void;
}

export const SPHERE = new THREE.SphereGeometry(1, 22, 16);

/** Soft standard material (v14 `MT`). */
export const mat = (
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...extra });

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

/** Glossy round eye with a highlight. */
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
export function blobShadow(r: number): THREE.Mesh {
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

/** Puts the critter on the ground at its walk position and heading. */
export function place(group: THREE.Group, c: CritterState): void {
  group.position.set(c.pos[0], groundHeight(c.pos[0], c.pos[1]), c.pos[1]);
  group.rotation.y = c.yaw;
}
