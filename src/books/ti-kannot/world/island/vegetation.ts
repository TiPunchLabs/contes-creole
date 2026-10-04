import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { soften } from "../soft";
import { HOUSE, SPOTS, VILLAGE } from "./spots";
import { islandHeight, riverDistance } from "./terrain";

interface Part {
  geometry: THREE.BufferGeometry;
  color: string;
  dry?: string;
}

type Species = "flamboyant" | "palm" | "forest" | "banana" | "grass" | "reed" | "rock";

const TRUNK = "#9a6a48";
const SPECIES: Record<Species, Part[]> = {
  palm: [
    { geometry: new THREE.CylinderGeometry(0.12, 0.2, 3.2, 5).translate(0, 1.6, 0), color: TRUNK },
    {
      geometry: soften(
        new THREE.IcosahedronGeometry(1, 1).scale(1.5, 0.35, 1.5).translate(0, 3.3, 0),
      ),
      color: "#7cc46e",
      dry: "#b5ad5c",
    },
  ],
  flamboyant: [
    { geometry: new THREE.CylinderGeometry(0.18, 0.28, 1.8, 6).translate(0, 0.9, 0), color: TRUNK },
    {
      geometry: soften(
        new THREE.IcosahedronGeometry(1.3, 1).scale(1.5, 0.45, 1.5).translate(0, 2, 0),
      ),
      color: "#6db86a",
      dry: "#a39a55",
    },
    {
      geometry: soften(
        new THREE.IcosahedronGeometry(1.4, 1).scale(1.6, 0.5, 1.6).translate(0, 2.4, 0),
      ),
      color: "#ef6a4a",
      dry: "#b8664a",
    },
  ],
  forest: [
    { geometry: new THREE.CylinderGeometry(0.2, 0.3, 2, 6).translate(0, 1, 0), color: TRUNK },
    {
      geometry: soften(
        new THREE.IcosahedronGeometry(1.3, 1).scale(1, 1.15, 1).translate(0, 2.6, 0),
      ),
      color: "#5fa868",
      dry: "#8f8a4c",
    },
    {
      geometry: soften(new THREE.IcosahedronGeometry(0.9, 1).translate(0, 3.6, 0)),
      color: "#74bd72",
      dry: "#a09a52",
    },
  ],
  banana: [
    {
      geometry: new THREE.CylinderGeometry(0.1, 0.14, 1.1, 5).translate(0, 0.55, 0),
      color: "#8fae5a",
    },
    {
      geometry: new THREE.ConeGeometry(0.9, 0.9, 5, 1, true).rotateX(Math.PI).translate(0, 1.4, 0),
      color: "#b4e27e",
      dry: "#c9c070",
    },
  ],
  grass: [
    {
      geometry: new THREE.ConeGeometry(0.12, 0.55, 3).translate(0, 0.27, 0),
      color: "#9fd478",
      dry: "#d2c27a",
    },
  ],
  reed: [
    {
      geometry: new THREE.CylinderGeometry(0.03, 0.03, 1.2, 3).translate(0, 0.6, 0),
      color: "#6f9d4f",
    },
  ],
  rock: [{ geometry: soften(new THREE.DodecahedronGeometry(0.6, 0)), color: "#b8b2a6" }],
};

const CLEAR: readonly (readonly [readonly [number, number], number])[] = [
  [HOUSE, 4.5],
  [VILLAGE, 6],
  [SPOTS.tank, 3],
  [SPOTS.spring, 5],
  [SPOTS.rock, 4],
  [SPOTS.perch, 3],
  [SPOTS.yard, 2.5],
];

/** True when (x, z) is away from every building and staged spot. */
const isClear = (x: number, z: number): boolean =>
  CLEAR.every(([[cx, cz], r]) => (x - cx) ** 2 + (z - cz) ** 2 > r * r);

/** Distance from (x, z) to the nearest dwelling (Gwo Rako's house or the village). */
const toDwelling = (x: number, z: number): number =>
  Math.min(Math.hypot(x - HOUSE[0], z - HOUSE[1]), Math.hypot(x - VILLAGE[0], z - VILLAGE[1]));

/** Up to `count` random points on the island accepted by `accept(x, z, height, toRiver)`. */
function scatter(
  rng: Rng,
  count: number,
  accept: (x: number, z: number, h: number, toRiver: number) => boolean,
): [number, number][] {
  const out: [number, number][] = [];
  for (let tries = 0; tries < count * 40 && out.length < count; tries++) {
    const x = (rng() - 0.5) * 46;
    const z = (rng() - 0.5) * 46;
    if (accept(x, z, islandHeight(x, z), riverDistance(x, z))) out.push([x, z]);
  }
  return out;
}

/** Palms, flamboyants (Ti Kannot's tree first), forest, bananas, grass, reeds and rocks. */
export function createVegetation(rng: Rng): {
  group: THREE.Group;
  /** Flamboyant meshes, Ti Kannot's tree among them. */
  canopies: THREE.Object3D[];
  update(env: MixedEnv): void;
} {
  const places: Record<Species, [number, number][]> = {
    flamboyant: [
      [SPOTS.perch[0] - 0.6, SPOTS.perch[1] - 0.4],
      ...scatter(rng, 6, (x, z, h, d) => h > 1 && h < 3 && d > 2 && isClear(x, z)),
    ],
    palm: scatter(rng, 22, (x, z, h, d) => h > 0.3 && h < 1.6 && d > 1.6 && isClear(x, z)),
    forest: scatter(rng, 70, (x, z, h, d) => h > 2.6 && h < 9.5 && d > 1.8 && isClear(x, z)),
    banana: scatter(
      rng,
      14,
      (x, z, h, d) => h > 1 && h < 2.6 && d > 1.6 && isClear(x, z) && toDwelling(x, z) < 10,
    ),
    grass: scatter(rng, 500, (x, z, h, d) => h > 0.5 && h < 7 && d > 1.2 && isClear(x, z)),
    reed: scatter(
      rng,
      120,
      (_x, _z, h, d) => (h > -0.3 && h < 0.5) || (d > 0.9 && d < 1.8 && h > 0),
    ),
    rock: scatter(rng, 50, (_x, _z, h, d) => (h > -0.6 && h < 0.6) || (d > 1 && d < 1.6)),
  };
  const group = new THREE.Group();
  const canopies: THREE.Object3D[] = [];
  const tinted: { material: THREE.MeshLambertMaterial; base: THREE.Color; dry: THREE.Color }[] = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const at = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (const name of Object.keys(SPECIES) as Species[]) {
    const transforms = places[name].map(([x, z], i) => {
      const s = name === "flamboyant" && i === 0 ? 1.25 : 0.8 + rng() * 0.45;
      return m4
        .compose(
          at.set(x, islandHeight(x, z), z),
          q.setFromAxisAngle(up, rng() * 6.28),
          scale.setScalar(s),
        )
        .clone();
    });
    for (const part of SPECIES[name]) {
      const material = new THREE.MeshLambertMaterial({ color: part.color });
      if (part.dry) {
        tinted.push({
          material,
          base: new THREE.Color(part.color),
          dry: new THREE.Color(part.dry),
        });
      }
      const mesh = new THREE.InstancedMesh(part.geometry, material, transforms.length);
      transforms.forEach((t, i) => mesh.setMatrixAt(i, t));
      group.add(mesh);
      if (name === "flamboyant") canopies.push(mesh);
    }
  }
  return {
    group,
    canopies,
    update(env) {
      for (const { material, base, dry } of tinted) material.color.copy(base).lerp(dry, env.wilt);
    },
  };
}
