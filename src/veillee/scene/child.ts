import * as THREE from "three";
import { canvasTexture } from "./paint";

/** Seconds per breath of the sleeping child. */
export const BREATH_SECONDS = 4.6;

export interface Child {
  group: THREE.Group;
  update(time: number, calm: boolean): void;
}

/** A capsule of radius `r` and straight length `len`, placed at (x, y, z), rotated by `rot`. */
function limb(
  material: THREE.Material,
  r: number,
  len: number,
  pos: [number, number, number],
  rot: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), material);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  return mesh;
}

/**
 * A child asleep in the armchair, curled on its side, head on an orange cushion: striped T-shirt,
 * blue shorts, bare feet. Only the chest and shoulders move: a slow breath against the cushion.
 * Built in the chair's frame (seat top at y = 0.45, front towards +z).
 */
export function createChild(): Child {
  const group = new THREE.Group();
  group.name = "child";
  const skin = new THREE.MeshStandardMaterial({ color: "#6e4331", roughness: 0.75 });
  const hair = new THREE.MeshStandardMaterial({ color: "#1d1411", roughness: 0.95 });
  const shorts = new THREE.MeshStandardMaterial({ color: "#3f5f96", roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({
    map: canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = "#f4efe6";
      c.fillRect(0, 0, w, h);
      for (const [y, col] of [
        [0.42, "#e08a3c"],
        [0.5, "#3d6fa8"],
        [0.58, "#e08a3c"],
      ] as const) {
        c.fillStyle = col;
        c.fillRect(0, h * y, w, h * 0.05);
      }
    }),
    roughness: 0.85,
  });
  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    new THREE.MeshStandardMaterial({ color: "#d9573a", roughness: 0.9 }),
  );
  cushion.scale.set(0.2, 0.16, 0.1);
  cushion.position.set(0.2, 0.6, -0.12);
  cushion.rotation.set(0.2, 0, -0.5);

  const chest = new THREE.Group();
  chest.position.set(0.02, 0.56, 0.02);
  chest.add(limb(shirt, 0.105, 0.16, [0, 0, 0], [0, 0, Math.PI / 2 - 0.35]));
  chest.add(limb(shirt, 0.04, 0.08, [0.1, 0.05, 0.06], [0.9, 0, 0.6]));
  chest.add(limb(skin, 0.035, 0.18, [0.02, 0.0, 0.12], [1.2, 0, 1.2]));

  const head = new THREE.Group();
  head.position.set(0.19, 0.66, 0.02);
  head.rotation.set(0, 0.3, -0.45);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), skin);
  const curls = new THREE.Mesh(new THREE.SphereGeometry(0.107, 20, 16), hair);
  curls.position.set(-0.012, 0.018, -0.022);
  curls.scale.set(1, 0.95, 0.9);
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skin);
  ear.position.set(0, 0, 0.095);
  head.add(face, curls, ear);

  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), shorts);
  hips.scale.set(1, 0.85, 1);
  hips.position.set(-0.14, 0.53, 0.03);
  group.add(
    cushion,
    chest,
    head,
    hips,
    limb(shorts, 0.06, 0.12, [-0.12, 0.52, 0.14], [1.35, 0, 0.25]),
    limb(skin, 0.045, 0.16, [-0.2, 0.5, 0.21], [0, 0, Math.PI / 2 + 0.15]),
    limb(skin, 0.045, 0.16, [-0.21, 0.55, 0.17], [0.2, 0, Math.PI / 2 + 0.35]),
  );
  for (const [x, y, z] of [
    [-0.3, 0.5, 0.22],
    [-0.31, 0.56, 0.18],
  ] as const) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), skin);
    foot.scale.set(1.5, 0.8, 1);
    foot.position.set(x, y, z);
    group.add(foot);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.receiveShadow = true;
  });

  return {
    group,
    update(time, calm) {
      const b = calm ? 0 : Math.sin((time / BREATH_SECONDS) * Math.PI * 2);
      chest.scale.set(1, 1 + b * 0.035, 1 + b * 0.04);
      head.position.y = 0.66 + b * 0.004;
    },
  };
}
