import * as THREE from "three";
import type { MixedEnv } from "../env";
import { SPOTS } from "./spots";
import { islandHeight } from "./terrain";

/** Flat-shaded mesh at a local position. */
function part(
  geometry: THREE.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ color, flatShading: true }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

/** Places `object` on the ground at (x, z), turned by `yaw`. */
function settle<T extends THREE.Object3D>(object: T, x: number, z: number, yaw: number): T {
  object.position.set(x, islandHeight(x, z), z);
  object.rotation.y = yaw;
  return object;
}

/** Shared reservoir: stone tank, water top and three taps facing +z. */
function reservoir(): THREE.Group {
  const tank = new THREE.Group();
  tank.add(
    part(new THREE.CylinderGeometry(1.3, 1.4, 1.4, 10), "#b9b2a4", 0, 0.7, 0),
    part(new THREE.CylinderGeometry(1.15, 1.15, 0.05, 10), "#7fd6cf", 0, 1.42, 0),
  );
  for (const angle of [-0.5, 0, 0.5]) {
    const tap = part(
      new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6).rotateX(Math.PI / 2),
      "#c9a24a",
      Math.sin(angle) * 1.45,
      0.45,
      Math.cos(angle) * 1.45,
    );
    tap.rotation.y = angle;
    tank.add(tap);
  }
  return tank;
}

/** The shared reservoir of page 11, shown as the tale builds it. */
export function createReservoir(): { group: THREE.Group; update(env: MixedEnv): void } {
  const group = new THREE.Group();
  const tank = settle(reservoir(), SPOTS.tank[0], SPOTS.tank[1], 0.4);
  group.add(tank);
  return {
    group,
    update(env) {
      tank.visible = env.tank > 0.01;
      tank.scale.set(1, Math.max(0.001, env.tank), 1);
    },
  };
}
