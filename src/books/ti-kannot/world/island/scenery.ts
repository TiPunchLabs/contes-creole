import * as THREE from "three";
import { createRng } from "@shared/random";
import type { MixedEnv } from "../env";
import { FLORA, STONES, type Flora } from "./flora";
import { KAZ } from "./kaz";
import { FOREST_LINE, islandPlan, YARD } from "./landscape";
import { shorePlan } from "./shore";
import { islandHeight } from "./terrain";

const DRY = new THREE.Color("#e6d38f");
const WHITE = new THREE.Color("#ffffff");
const STONE_TINTS = ["#b3a491", "#a3937f", "#9c9a86", "#bfae94"];
/** Shore rocks, darker where the sea wets them. */
const WET_TINTS = ["#8f8273", "#9b8c79", "#857e70"];
/** The mountain forest reads a shade deeper than the open ground. */
const FOREST_SHADE = 0.88;

// Wind in the foliage: the parts of a plant above its base sway, more the higher they are, each
// plant in its own phase (from its position). Local space, before the instance transform.
const WIND = `#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec3 windRoot = instanceMatrix[3].xyz;
  #else
  vec3 windRoot = vec3(0.);
  #endif
  float windH = max(transformed.y - .6, 0.);
  float windPhase = uWindTime * 1.1 + windRoot.x * .37 + windRoot.z * .29;
  float windAmp = uWind * windH * windH * .012;
  transformed.x += sin(windPhase) * windAmp + sin(uWindTime * 2.3 + windRoot.z + transformed.y * 1.7) * windAmp * .35;
  transformed.z += cos(windPhase * .8) * windAmp * .6;`;

/** A foliage material that sways in a shared wind of strength `strength` (0 = still). */
function windy(time: THREE.IUniform<number>, strength: number): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = time;
    shader.uniforms.uWind = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "uniform float uWindTime; uniform float uWind;\nvoid main() {")
      .replace("#include <begin_vertex>", WIND);
  };
  material.customProgramCacheKey = () => `tk-wind-${strength}`;
  return material;
}

/** Slight per-instance tint so repeated plants never look stamped, `shade` darker. */
function jitter(rng: () => number, out: THREE.Color, shade = 1): THREE.Color {
  const k = (0.9 + rng() * 0.14) * shade;
  return out.setRGB(k * (0.97 + rng() * 0.06), k, k * (0.95 + rng() * 0.06));
}

/**
 * The island's cases, gardens, banks, trees, stones and shore rocks; the foliage sways in a light
 * wind (still when `calm`) and the drought dries it.
 */
export function createScenery({ calm = false }: { calm?: boolean } = {}): {
  group: THREE.Group;
  /** Ti Kannot's resting places among the scenery: the flamboyants and Gwo Rako's roof. */
  perches: THREE.Object3D[];
  update(env: MixedEnv, time?: number): void;
} {
  const plan = islandPlan();
  const rng = createRng(29);
  const group = new THREE.Group();
  const perches: THREE.Object3D[] = [];
  const windTime: THREE.IUniform<number> = { value: 0 };
  const foliage = windy(windTime, calm ? 0 : 1);
  // Ti Kannot perches on the flamboyants: their crowns barely move under him.
  const perchFoliage = windy(windTime, calm ? 0 : 0.2);
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
    mesh.scale.setScalar(house.scale);
    group.add(mesh);
    if (house.yard === YARD) perches.push(mesh);
  }

  const bySpecies = new Map<Flora, typeof plan.plants>();
  for (const p of plan.plants) bySpecies.set(p.flora, [...(bySpecies.get(p.flora) ?? []), p]);
  for (const [name, list] of bySpecies) {
    const material = name === "flamboyant" ? perchFoliage : foliage;
    const mesh = new THREE.InstancedMesh(FLORA[name]().geometry, material, list.length);
    const tree = name === "mango" || name === "breadfruit";
    list.forEach((p, i) => {
      const ground = islandHeight(p.x, p.z);
      at.set(p.x, ground - 0.05, p.z);
      mesh.setMatrixAt(i, m4.compose(at, q.setFromAxisAngle(up, p.yaw), size.setScalar(p.scale)));
      mesh.setColorAt(i, jitter(rng, tint, tree && ground > FOREST_LINE ? FOREST_SHADE : 1));
    });
    group.add(mesh);
    if (name === "flamboyant") perches.push(mesh);
  }

  const rock = new THREE.MeshLambertMaterial();
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

  const shore = shorePlan(plan.houses);
  if (shore.length) {
    const geometry = STONES[shore[0].kind]();
    geometry.computeBoundingBox();
    const height = geometry.boundingBox?.max.y ?? 0.3;
    const mesh = new THREE.InstancedMesh(geometry, rock, shore.length);
    shore.forEach((s, i) => {
      at.set(s.x, islandHeight(s.x, s.z) + height * s.scale * (1 - 2 * s.sink), s.z);
      mesh.setMatrixAt(i, m4.compose(at, q.setFromAxisAngle(up, s.yaw), size.setScalar(s.scale)));
      mesh.setColorAt(i, tint.set(WET_TINTS[i % WET_TINTS.length]));
    });
    group.add(mesh);
  }

  return {
    group,
    perches,
    update(env, time = 0) {
      foliage.color.copy(WHITE).lerp(DRY, env.wilt * 0.6);
      perchFoliage.color.copy(foliage.color);
      windTime.value = time;
    },
  };
}
