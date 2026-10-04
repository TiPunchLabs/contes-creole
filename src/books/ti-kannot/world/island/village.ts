import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { HOUSE, SPOTS, VILLAGE } from "./spots";
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

/** A Creole case on a stone base: walls, tin roof, door, shutters and a porch facing +z. */
function creoleCase(
  wall: string,
  shutter: string,
  roof: string,
  width = 2.4,
  depth = 2,
): THREE.Group {
  const house = new THREE.Group();
  const front = depth / 2 + 0.03;
  const roofGeometry = new THREE.ConeGeometry(1, 1.1, 4).rotateY(Math.PI / 4);
  roofGeometry.scale((width / 2 + 0.3) / Math.SQRT1_2, 1, (depth / 2 + 0.3) / Math.SQRT1_2);
  house.add(
    part(new THREE.BoxGeometry(width + 0.3, 1.4, depth + 0.3), "#a59d90", 0, -0.5, 0),
    part(new THREE.BoxGeometry(width, 1.5, depth), wall, 0, 0.95, 0),
    part(roofGeometry, roof, 0, 2.25, 0),
    part(new THREE.BoxGeometry(0.5, 0.95, 0.06), "#7a4a2c", 0, 0.68, front),
    part(new THREE.BoxGeometry(0.42, 0.55, 0.06), shutter, -width / 3, 1.05, front),
    part(new THREE.BoxGeometry(0.42, 0.55, 0.06), shutter, width / 3, 1.05, front),
    part(new THREE.BoxGeometry(width, 0.08, 0.8), "#b88a5c", 0, 0.22, depth / 2 + 0.4),
  );
  for (const side of [-1, 1]) {
    house.add(
      part(
        new THREE.CylinderGeometry(0.05, 0.05, 1.3, 5),
        "#f4ecd8",
        side * (width / 2 - 0.1),
        0.85,
        depth / 2 + 0.75,
      ),
    );
  }
  return house;
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

/** Three village cases, Gwo Rako's bigger case and the reservoir of page 11. */
export function createVillage(rng: Rng): { group: THREE.Group; update(env: MixedEnv): void } {
  const group = new THREE.Group();
  const cases: [string, string, string][] = [
    ["#f2d3a2", "#3c8fa0", "#c4553a"],
    ["#f4b7a0", "#2d7d5a", "#a8643f"],
    ["#cfe3d0", "#c8573e", "#d06a48"],
  ];
  cases.forEach(([wall, shutter, roof], i) => {
    const angle = (i / cases.length) * Math.PI * 1.2 - 0.4 + rng() * 0.2;
    const x = VILLAGE[0] + Math.sin(angle) * 3.2;
    const z = VILLAGE[1] + Math.cos(angle) * 3.2;
    const facing = Math.atan2(VILLAGE[0] - x, VILLAGE[1] - z);
    group.add(settle(creoleCase(wall, shutter, roof), x, z, facing));
  });
  group.add(
    settle(creoleCase("#e8b864", "#3f8f5a", "#c0432f", 3.2, 2.6), HOUSE[0], HOUSE[1], -0.25),
  );
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
