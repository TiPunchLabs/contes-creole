import * as THREE from "three";
import { createRng } from "@shared/random";
import type { MixedEnv } from "../env";
import { FLORA, STONES, type Flora } from "./flora";
import { KAZ } from "./kaz";
import { pilotPlan } from "./landscape";
import { islandHeight } from "./terrain";

const DRY = new THREE.Color("#e6d38f");
const WHITE = new THREE.Color("#ffffff");
const STONE_TINTS = ["#b8b2a6", "#a89f90", "#9fa38f", "#c2b49c"];

/** Slight per-instance tint so repeated plants never look stamped. */
function jitter(rng: () => number, out: THREE.Color): THREE.Color {
  const k = 0.9 + rng() * 0.14;
  return out.setRGB(k * (0.97 + rng() * 0.06), k, k * (0.95 + rng() * 0.06));
}

/** The pilot's cases, gardens, bank plants and stones; the drought dries the foliage. */
export function createPilot(): {
  group: THREE.Group;
  /** Ti Kannot's tree, for the resting points. */
  canopies: THREE.Object3D[];
  update(env: MixedEnv): void;
} {
  const plan = pilotPlan();
  const rng = createRng(29);
  const group = new THREE.Group();
  const canopies: THREE.Object3D[] = [];
  const foliage = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const at = new THREE.Vector3();
  const size = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();

  for (const house of plan.houses) {
    const mesh = new THREE.Mesh(
      KAZ[house.style](house.colors).geometry,
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    );
    mesh.position.set(house.x, house.y, house.z);
    mesh.rotation.y = house.yaw;
    group.add(mesh);
  }

  const bySpecies = new Map<Flora, typeof plan.plants>();
  for (const p of plan.plants) bySpecies.set(p.flora, [...(bySpecies.get(p.flora) ?? []), p]);
  for (const [name, list] of bySpecies) {
    const mesh = new THREE.InstancedMesh(FLORA[name]().geometry, foliage, list.length);
    list.forEach((p, i) => {
      at.set(p.x, islandHeight(p.x, p.z) - 0.05, p.z);
      mesh.setMatrixAt(i, m4.compose(at, q.setFromAxisAngle(up, p.yaw), size.setScalar(p.scale)));
      mesh.setColorAt(i, jitter(rng, tint));
    });
    group.add(mesh);
    if (name === "flamboyant") canopies.push(mesh);
  }

  const rock = new THREE.MeshLambertMaterial({ flatShading: true });
  STONES.forEach((make, kind) => {
    const list = plan.stones.filter((s) => s.kind === kind);
    if (!list.length) return;
    const geometry = make();
    geometry.computeBoundingBox();
    const height = geometry.boundingBox?.max.y ?? 0.3;
    const mesh = new THREE.InstancedMesh(geometry, rock, list.length);
    list.forEach((s, i) => {
      at.set(s.x, islandHeight(s.x, s.z) + height * s.scale * (1 - 2 * s.sink), s.z);
      mesh.setMatrixAt(i, m4.compose(at, q.setFromAxisAngle(up, s.yaw), size.setScalar(s.scale)));
      mesh.setColorAt(i, tint.set(STONE_TINTS[Math.floor(rng() * STONE_TINTS.length)]));
    });
    group.add(mesh);
  });

  return {
    group,
    canopies,
    update(env) {
      foliage.color.copy(WHITE).lerp(DRY, env.wilt * 0.6);
    },
  };
}
