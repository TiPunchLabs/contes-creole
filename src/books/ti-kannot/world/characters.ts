import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clamp, lerp, smoothstep } from "@shared/math";
import type { MixedEnv } from "./env";
import { SPOTS, spotPoint, type Spot } from "./island/spots";
import { islandHeight } from "./island/terrain";
import type { CharacterName } from "./speech";

const FLIGHT_SECONDS = 1.6;
const FLIGHT_HEIGHT = 2.5;

/** Smoothly lit material in one colour. */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color });

/** Mesh at a local position. */
function part(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Colour of a vertex from its position and normal (both in the geometry's own frame). */
type Dye = (p: THREE.Vector3, n: THREE.Vector3, out: THREE.Color) => void;

/** Paints `geometry` vertex by vertex, so plumage and shell markings blend like wet paint. */
function tinted(geometry: THREE.BufferGeometry, dye: Dye): THREE.BufferGeometry {
  const pos = geometry.getAttribute("position");
  const nor = geometry.getAttribute("normal");
  const colors = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    dye(p.fromBufferAttribute(pos, i), n.fromBufferAttribute(nor, i), c);
    c.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** 0 below `a`, 1 above `b`, eased in between. */
const ramp = (v: number, a: number, b: number): number =>
  smoothstep(clamp((v - a) / (b - a), 0, 1));

const UP = new THREE.Vector3(0, 1, 0);

/** A tapered limb segment from `a` (radius `ra`) to `b` (radius `rb`), with a round joint at `a`. */
function segment(
  a: readonly number[],
  b: readonly number[],
  ra: number,
  rb: number,
): THREE.BufferGeometry {
  const from = new THREE.Vector3(a[0], a[1], a[2]);
  const dir = new THREE.Vector3(b[0], b[1], b[2]).sub(from);
  const length = dir.length();
  const shaft = new THREE.CylinderGeometry(rb, ra, length, 10)
    .translate(0, length / 2, 0)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()))
    .translate(from.x, from.y, from.z);
  const joint = new THREE.SphereGeometry(ra, 10, 8).translate(from.x, from.y, from.z);
  const merged = mergeGeometries([shaft, joint]);
  shaft.dispose();
  joint.dispose();
  return merged;
}

/** A cone along +z from the origin, `length` long, its tip curling down by `curl`. */
function horn(radius: number, length: number, curl: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(radius, length, 12, 6).rotateX(Math.PI / 2);
  g.translate(0, 0, length / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const t = p.getZ(i) / length;
    p.setY(i, p.getY(i) - curl * t * t);
  }
  g.computeVertexNormals();
  return g;
}

const SLATE = new THREE.Color("#4b4954");
const SOOT = new THREE.Color("#2c2a33");
const YELLOW = new THREE.Color("#f7c520");
const GOLD = new THREE.Color("#e9a91c");
const THROAT = new THREE.Color("#a3a2ab");
const BROW = new THREE.Color("#f8f4ea");

/** Wing angle when folded against the flank. */
const WING_FOLD = 1.15;

interface Bird {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
  tail: THREE.Mesh;
  wings: THREE.Object3D[];
}

/**
 * Ti Kannot as a sucrier (bananaquit): slate back, yellow breast and rump, grey throat, white brow
 * and a slender curved bill; faces local +x.
 */
function buildBird(): Bird {
  const root = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ink = paint("#141216");
  const glint = new THREE.MeshBasicMaterial({ color: "#ffffff" });

  const body = part(
    tinted(new THREE.SphereGeometry(0.3, 28, 20).scale(1.3, 0.95, 0.95), (p, n, c) => {
      c.copy(SLATE).lerp(YELLOW, 1 - ramp(n.y, -0.3, 0.25));
      c.lerp(GOLD, ramp(-n.y, 0.75, 1) * 0.5);
      // Grey throat under the bill, yellow rump over the tail.
      c.lerp(THROAT, ramp(p.x, 0.16, 0.34) * (1 - ramp(n.y, 0.1, 0.5)) * ramp(p.y, -0.16, 0));
      c.lerp(YELLOW, ramp(-p.x, 0.2, 0.34) * ramp(n.y, 0.2, 0.7) * 0.85);
    }),
    skin,
    0,
    0,
    0,
  );

  const head = new THREE.Group();
  head.position.set(0.36, 0.2, 0);
  head.add(
    part(
      tinted(new THREE.SphereGeometry(0.2, 24, 18), (p, _n, c) => {
        c.copy(SOOT).lerp(THROAT, 1 - ramp(p.y, -0.1, -0.02));
        // The white brow runs from the bill over the eye to the nape.
        const brow = ramp(p.y, 0.035, 0.06) * (1 - ramp(p.y, 0.1, 0.13)) * ramp(p.x, -0.15, -0.05);
        c.lerp(BROW, brow * ramp(Math.abs(p.z), 0.05, 0.1));
      }),
      skin,
      0,
      0,
      0,
    ),
  );
  const bill = part(horn(0.045, 0.3, 0.085).rotateY(Math.PI / 2), paint("#1e1b20"), 0.16, -0.02, 0);
  head.add(bill);
  for (const side of [-1, 1]) {
    head.add(
      part(new THREE.SphereGeometry(0.036, 12, 10), ink, 0.115, 0.012, side * 0.155),
      part(new THREE.SphereGeometry(0.012, 8, 6), glint, 0.135, 0.03, side * 0.178),
    );
  }

  const tail = part(
    tinted(
      new THREE.ConeGeometry(0.15, 0.46, 14, 4).rotateZ(-Math.PI / 2).scale(1, 0.24, 1),
      (p, _n, c) => c.copy(SOOT).lerp(BROW, ramp(-p.x, 0.17, 0.23) * 0.7),
    ),
    skin,
    -0.52,
    0.04,
    0,
  );
  tail.rotation.z = -0.22;

  const legMaterial = paint("#4d4038");
  for (const side of [-1, 1]) {
    root.add(
      part(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 6), legMaterial, 0, -0.33, side * 0.08),
      part(
        new THREE.SphereGeometry(0.05, 10, 6).scale(1.5, 0.3, 1),
        legMaterial,
        0.03,
        -0.435,
        side * 0.08,
      ),
    );
  }

  const wings = [-1, 1].map((side) => {
    const wing = new THREE.Group();
    wing.position.set(0.04, 0.1, side * 0.19);
    wing.add(
      part(
        tinted(
          new THREE.SphereGeometry(0.25, 20, 12)
            .scale(1.05, 0.13, 0.62)
            .translate(-0.1, 0, side * 0.15),
          (p, _n, c) => {
            c.copy(SOOT).lerp(SLATE, ramp(p.x, -0.3, 0.1));
            // The bananaquit's white wing spot.
            const spot = 1 - ramp(Math.hypot(p.x + 0.02, p.z - side * 0.13), 0.03, 0.07);
            c.lerp(BROW, spot * 0.9);
          },
        ),
        skin,
        0,
        0,
        0,
      ),
    );
    wing.rotation.x = side * WING_FOLD;
    root.add(wing);
    return wing;
  });

  root.add(body, head, tail);
  root.scale.setScalar(1.4);
  return { root, body, head, tail, wings };
}

const CRAB_RED = new THREE.Color("#d9432c");
const CRAB_DEEP = new THREE.Color("#b12c20");
const CRAB_RIM = new THREE.Color("#f08a4e");
const CRAB_CREAM = new THREE.Color("#f4e0c2");

/** Shell red, deeper in blotches, warm at the rim and cream underneath. */
const shellDye: Dye = (p, n, c) => {
  c.copy(CRAB_RED);
  const blotch = Math.sin(p.x * 6.3 + p.z * 2.9) * Math.cos(p.z * 7.1 - p.x * 2.3);
  c.lerp(CRAB_DEEP, ramp(blotch, 0.15, 0.7) * ramp(n.y, 0.2, 0.8) * 0.75);
  c.lerp(CRAB_RIM, (1 - ramp(Math.abs(n.y), 0.05, 0.45)) * 0.55);
  c.lerp(CRAB_CREAM, ramp(-n.y, 0.25, 0.6));
};

/** Limb red, paling to cream towards the tip (along `axis` from `from` to `to`). */
const limbDye =
  (axis: "y" | "z", from: number, to: number): Dye =>
  (p, _n, c) =>
    c.copy(CRAB_RED).lerp(CRAB_CREAM, ramp(p[axis], from, to) * 0.8);

interface Crab {
  root: THREE.Group;
  shell: THREE.Group;
  eyes: THREE.Group[];
  jaws: THREE.Object3D[];
  legs: THREE.Object3D[];
}

/** Gwo Rako as a red land crab: big right claw, stalk eyes, eight jointed legs; faces local +z. */
function buildCrab(): Crab {
  const root = new THREE.Group();
  const shell = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ vertexColors: true });
  const white = paint("#fdf9ee");
  const ink = paint("#151316");
  const glint = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  shell.add(
    part(
      tinted(new THREE.SphereGeometry(0.9, 36, 24).scale(1.25, 0.5, 0.95), shellDye),
      skin,
      0,
      0.55,
      0,
    ),
  );
  const mouth = part(
    new THREE.TorusGeometry(0.13, 0.02, 6, 16, Math.PI),
    paint("#7a2018"),
    0,
    0.5,
    0.845,
  );
  mouth.rotation.z = Math.PI;
  shell.add(mouth);

  const eyes = [-1, 1].map((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.27, 0.85, 0.55);
    eye.add(
      part(
        tinted(new THREE.CapsuleGeometry(0.04, 0.26, 4, 10), (_p, _n, c) => c.copy(CRAB_RED)),
        skin,
        0,
        0.15,
        0,
      ),
      part(new THREE.SphereGeometry(0.13, 18, 14), white, 0, 0.36, 0),
      part(new THREE.SphereGeometry(0.066, 14, 10), ink, 0, 0.365, 0.085),
      part(new THREE.SphereGeometry(0.024, 8, 6), glint, 0.03, 0.4, 0.135),
    );
    shell.add(eye);
    return eye;
  });

  const jaws = [-1, 1].map((side) => {
    const size = side > 0 ? 1.35 : 1;
    const arm = part(
      tinted(new THREE.CapsuleGeometry(0.105, 0.6, 6, 12), (_p, _n, c) => c.copy(CRAB_RED)),
      skin,
      side * 0.95,
      0.5,
      0.55,
    );
    arm.rotation.set(0.9, 0, side * -0.6);
    const claw = new THREE.Group();
    claw.position.set(side * 1.25, 0.75, 0.95);
    claw.add(
      part(
        tinted(new THREE.SphereGeometry(0.3 * size, 24, 16).scale(1.2, 0.75, 0.95), shellDye),
        skin,
        0,
        0,
        0,
      ),
      part(
        tinted(horn(0.15 * size, 0.5 * size, 0.1 * size), limbDye("z", 0.1 * size, 0.5 * size)),
        skin,
        0,
        0.06 * size,
        0.16 * size,
      ),
    );
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.1 * size, 0.14 * size);
    jaw.add(
      part(
        tinted(horn(0.11 * size, 0.42 * size, -0.07 * size), limbDye("z", 0.1 * size, 0.42 * size)),
        skin,
        0,
        0,
        0,
      ),
    );
    claw.add(jaw);
    shell.add(arm, claw);
    return jaw;
  });

  const legs: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const reach = 0.5 + (i === 0 || i === 3 ? 0 : 0.08);
      const knee = [side * reach, 0.3, 0];
      const upper = segment([0, 0, 0], knee, 0.075, 0.055);
      const lower = segment(knee, [side * (reach + 0.28), -0.42, 0], 0.055, 0.015);
      const geometry = tinted(mergeGeometries([upper, lower]), limbDye("y", 0.1, -0.42));
      upper.dispose();
      lower.dispose();
      const leg = part(geometry, skin, side * 0.92, 0.42, 0.34 - i * 0.27);
      leg.rotation.y = side * (0.45 - i * 0.3);
      legs.push(leg);
      root.add(leg);
    }
  }
  root.add(shell);
  return { root, shell, eyes, jaws, legs };
}

/** Where the helpers work, as offsets from the spring: two egrets, the agouti and the turtle. */
export const HELPERS: readonly (readonly [number, number])[] = [
  [1.8, 1.6],
  [-1.6, 2.2],
  [2.6, -0.6],
  [-2.4, 0.4],
];

interface Helper {
  /** The whole animal, scaled in as the helpers arrive. */
  root: THREE.Group;
  /** The part that dips to the ground as the animal works. */
  bob: THREE.Group;
  /** How far it dips (radians). */
  dip: number;
}

/** A cattle egret: white, S-curved neck, yellow bill, long dark legs. */
function egret(): { bob: THREE.Group; still: THREE.Object3D[]; dip: number } {
  const white = paint("#f8f5ee");
  const bob = new THREE.Group();
  bob.position.y = 0.62;
  const neck = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      [
        [0, 0.24, 0.26],
        [0, 0.46, 0.37],
        [0, 0.66, 0.29],
        [0, 0.82, 0.36],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    ),
    16,
    0.045,
    10,
  );
  const plume = part(
    new THREE.SphereGeometry(0.1, 12, 8).scale(0.7, 0.5, 1.6),
    white,
    0,
    0.2,
    -0.3,
  );
  plume.rotation.x = 0.35;
  bob.add(
    part(new THREE.SphereGeometry(0.25, 22, 16).scale(0.85, 0.85, 1.5), white, 0, 0.16, 0),
    plume,
    part(neck, white, 0, 0, 0),
    part(new THREE.SphereGeometry(0.095, 16, 12).scale(0.9, 0.9, 1.25), white, 0, 0.83, 0.4),
    part(horn(0.032, 0.27, 0.02), paint("#eab530"), 0, 0.82, 0.49),
  );
  const ink = paint("#151316");
  for (const side of [-1, 1]) {
    bob.add(part(new THREE.SphereGeometry(0.016, 8, 6), ink, side * 0.07, 0.86, 0.45));
  }
  const dark = paint("#34302f");
  const still = [-1, 1].flatMap((side) => [
    part(new THREE.CylinderGeometry(0.018, 0.018, 0.64, 6), dark, side * 0.07, 0.32, 0),
    part(new THREE.SphereGeometry(0.05, 8, 6).scale(1, 0.25, 1.7), dark, side * 0.07, 0.012, 0.04),
  ]);
  return { bob, still, dip: 0.55 };
}

const FUR = new THREE.Color("#9c6b3b");
const FUR_DARK = new THREE.Color("#7a4f2a");
const FUR_PALE = new THREE.Color("#d8b98c");

/** An agouti: glossy brown rump, pale belly, small round ears, on four slim legs. */
function agouti(): { bob: THREE.Group; still: THREE.Object3D[]; dip: number } {
  const skin = new THREE.MeshLambertMaterial({ vertexColors: true });
  const fur: Dye = (p, n, c) => {
    c.copy(FUR).lerp(FUR_DARK, ramp(n.y, 0.3, 0.9) * 0.6 + ramp(-p.z, 0.1, 0.4) * 0.3);
    c.lerp(FUR_PALE, ramp(-n.y, 0.3, 0.8) * 0.8);
  };
  const ink = paint("#151316");
  const bob = new THREE.Group();
  bob.position.set(0, 0.3, -0.2);
  bob.add(
    part(
      tinted(new THREE.SphereGeometry(0.3, 22, 16).scale(0.85, 0.8, 1.45), fur),
      skin,
      0,
      0.06,
      0.2,
    ),
    part(
      tinted(new THREE.SphereGeometry(0.16, 18, 14).scale(0.9, 0.9, 1.3), fur),
      skin,
      0,
      0.16,
      0.66,
    ),
    part(new THREE.SphereGeometry(0.03, 8, 6), ink, 0, 0.14, 0.87),
  );
  for (const side of [-1, 1]) {
    bob.add(
      part(
        tinted(new THREE.SphereGeometry(0.055, 10, 8).scale(1, 1.1, 0.45), fur),
        skin,
        side * 0.1,
        0.3,
        0.58,
      ),
      part(new THREE.SphereGeometry(0.022, 8, 6), ink, side * 0.115, 0.2, 0.74),
    );
  }
  const legMaterial = paint("#6f4826");
  const still = [-1, 1].flatMap((side) =>
    [-0.22, 0.22].map((z) =>
      part(new THREE.CylinderGeometry(0.035, 0.025, 0.26, 8), legMaterial, side * 0.14, 0.13, z),
    ),
  );
  return { bob, still, dip: 0.22 };
}

const SHELL_GREEN = new THREE.Color("#5f7a3a");
const SHELL_DARK = new THREE.Color("#3f5628");
const SHELL_RIM = new THREE.Color("#b9b06a");
const TURTLE_SKIN = new THREE.Color("#8f9d5c");

/** A turtle: domed shell marked with scutes, small head and four flippers. */
function turtle(): { bob: THREE.Group; still: THREE.Object3D[]; dip: number } {
  const skin = new THREE.MeshLambertMaterial({ vertexColors: true });
  const flesh: Dye = (_p, n, c) => c.copy(TURTLE_SKIN).lerp(SHELL_DARK, ramp(n.y, 0.2, 0.9) * 0.35);
  const dome = new THREE.SphereGeometry(0.36, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const shell = part(
    tinted(dome.scale(1, 0.75, 1.15), (p, _n, c) => {
      const lines = Math.min(
        Math.abs(Math.sin(p.x * 13)),
        Math.abs(Math.sin(p.z * 11 + Math.sin(p.x * 13) * 0.6)),
      );
      c.copy(SHELL_GREEN).lerp(SHELL_DARK, (1 - ramp(lines, 0.05, 0.3)) * 0.8);
      c.lerp(SHELL_RIM, 1 - ramp(p.y, 0.02, 0.07));
    }),
    skin,
    0,
    0.06,
    0,
  );
  const ink = paint("#151316");
  const bob = new THREE.Group();
  bob.position.set(0, 0.1, 0.3);
  bob.add(
    part(
      tinted(new THREE.SphereGeometry(0.1, 16, 12).scale(0.95, 0.85, 1.3), flesh),
      skin,
      0,
      0.04,
      0.16,
    ),
  );
  for (const side of [-1, 1]) {
    bob.add(part(new THREE.SphereGeometry(0.018, 8, 6), ink, side * 0.07, 0.07, 0.22));
  }
  const still: THREE.Object3D[] = [
    shell,
    part(
      tinted(new THREE.SphereGeometry(0.33, 20, 8).scale(1, 0.14, 1.12), flesh),
      skin,
      0,
      0.06,
      0,
    ),
  ];
  for (const side of [-1, 1]) {
    for (const z of [-0.26, 0.26]) {
      const flipper = part(
        tinted(new THREE.SphereGeometry(0.12, 12, 8).scale(1.3, 0.3, 0.8), flesh),
        skin,
        side * 0.36,
        0.04,
        z,
      );
      flipper.rotation.y = side * (z > 0 ? -0.5 : 0.5);
      still.push(flipper);
    }
  }
  return { bob, still, dip: 0.25 };
}

/** A small dark bird of the flock, wings out; faces local +z. */
function flockBird(): { root: THREE.Group; wings: THREE.Mesh[] } {
  const dark = paint("#6b6470");
  const root = new THREE.Group();
  root.add(
    part(new THREE.SphereGeometry(0.07, 12, 8).scale(0.8, 0.7, 2), dark, 0, 0, 0),
    part(new THREE.SphereGeometry(0.045, 10, 8), dark, 0, 0.02, 0.14),
  );
  const wings = [-1, 1].map((side) => {
    const wing = part(
      new THREE.SphereGeometry(0.1, 10, 6).scale(1.9, 0.12, 0.8).translate(side * 0.17, 0, 0),
      dark,
      side * 0.03,
      0.02,
      0,
    );
    root.add(wing);
    return wing;
  });
  return { root, wings };
}

/** The animals clearing the source: two egrets, an agouti, a turtle and a small flock. */
function buildHelpers(): {
  root: THREE.Group;
  animals: Helper[];
  flock: { root: THREE.Group; wings: THREE.Mesh[] }[];
} {
  const root = new THREE.Group();
  const animals = [egret(), egret(), agouti(), turtle()].map(({ bob, still, dip }, i) => {
    const [dx, dz] = HELPERS[i];
    const animal = new THREE.Group();
    animal.add(bob, ...still);
    const x = SPOTS.spring[0] + dx;
    const z = SPOTS.spring[1] + dz;
    animal.position.set(x, islandHeight(x, z), z);
    animal.rotation.y = Math.atan2(-dx, -dz);
    root.add(animal);
    return { root: animal, bob, dip };
  });
  const flock = Array.from({ length: 5 }, () => {
    const bird = flockBird();
    root.add(bird.root);
    return bird;
  });
  return { root, animals, flock };
}

/** Ti Kannot, Gwo Rako and the helpers; the bird flies in an arc between spots. */
export function createCharacters(rest: Record<Spot, THREE.Vector3>): {
  group: THREE.Group;
  snap(env: MixedEnv): void;
  update(env: MixedEnv, time: number, dt: number, camera: THREE.Vector3): void;
  pick(ray: THREE.Raycaster): CharacterName | null;
  anchor(name: CharacterName, out: THREE.Vector3): { point: THREE.Vector3; visible: boolean };
} {
  const bird = buildBird();
  const birdStand = -new THREE.Box3().setFromObject(bird.root).min.y;
  const crab = buildCrab();
  const helpers = buildHelpers();
  const group = new THREE.Group();
  group.add(bird.root, crab.root, helpers.root);

  const from = new THREE.Vector3();
  const birdTarget = new THREE.Vector3();
  const crabTarget = new THREE.Vector3();
  const crabPos = new THREE.Vector3();
  const spring = spotPoint("spring");
  let birdKey = "";
  let flight = 1;
  let crabVisible = 0;
  let spread = 0;
  const flightYaw = { value: 0 };

  /** Where the bird's body sits so that his feet touch his resting point. */
  const birdSpot = (env: MixedEnv, out: THREE.Vector3): THREE.Vector3 =>
    out.copy(rest[env.bird]).setY(rest[env.bird].y + birdStand);

  return {
    group,
    snap(env) {
      birdSpot(env, birdTarget);
      from.copy(birdTarget);
      bird.root.position.copy(birdTarget);
      birdKey = env.bird;
      flight = 1;
      if (env.crab) crabPos.copy(spotPoint(env.crab, crabTarget));
      crabVisible = env.crab ? 1 : 0;
    },
    update(env, time, dt, camera) {
      const key = env.bird;
      if (key !== birdKey) {
        birdKey = key;
        from.copy(bird.root.position);
        birdSpot(env, birdTarget);
        flight = 0;
        flightYaw.value = Math.atan2(-(birdTarget.z - from.z), birdTarget.x - from.x);
      }
      flight = Math.min(1, flight + dt / FLIGHT_SECONDS);
      const flying = flight < 1;
      bird.root.position.lerpVectors(from, birdTarget, smoothstep(flight));
      bird.root.position.y += Math.sin(Math.PI * flight) * FLIGHT_HEIGHT;
      const hopping = !flying && Math.sin(time * 0.7) > 0.6;
      if (hopping) bird.root.position.y += Math.max(0, Math.sin(time * 6)) * 0.06;
      // Wings unfold as he takes off and fold back as he lands.
      spread = lerp(spread, flying ? 1 : 0, 1 - Math.exp(-dt * 9));
      const flap = flying ? Math.sin(time * 30) * 0.8 : hopping ? Math.sin(time * 9) * 0.12 : 0;
      bird.wings.forEach((w, i) => {
        const side = i === 0 ? -1 : 1;
        w.rotation.x = side * (WING_FOLD * (1 - spread) - flap);
        w.scale.z = 1 + spread * 0.9;
      });
      const facing =
        Math.atan2(-(camera.z - bird.root.position.z), camera.x - bird.root.position.x) +
        0.6 +
        Math.sin(time * 0.5) * 0.15;
      // In the air he heads where he goes, nose up on the climb and down on the way in.
      const airborne = flying
        ? smoothstep(clamp(flight / 0.15, 0, 1)) *
          (1 - smoothstep(clamp((flight - 0.7) / 0.3, 0, 1)))
        : 0;
      const turn = Math.atan2(
        Math.sin(flightYaw.value - facing),
        Math.cos(flightYaw.value - facing),
      );
      bird.root.rotation.y = facing + turn * airborne;
      bird.root.rotation.z = airborne * Math.cos(Math.PI * flight) * 0.4;
      // At rest he breathes, cocks his head and flicks his tail.
      bird.body.scale.y = 1 + Math.sin(time * 2.4) * 0.018;
      const cock = Math.sin(time * 0.9) > 0.3 ? 1 : 0;
      bird.head.rotation.x = lerp(
        bird.head.rotation.x,
        flying ? 0 : cock * 0.3,
        1 - Math.exp(-dt * 8),
      );
      bird.head.rotation.y = Math.sin(time * 0.6 + 1) * 0.25 * (1 - spread);
      bird.tail.rotation.z = -0.22 + Math.max(0, Math.sin(time * 1.3)) ** 8 * 0.35;

      if (env.crab) spotPoint(env.crab, crabTarget);
      crabVisible = lerp(crabVisible, env.crab ? 1 : 0, 1 - Math.exp(-dt * 4));
      const moving = crabPos.distanceTo(crabTarget) > 0.05;
      crabPos.lerp(crabTarget, 1 - Math.exp(-dt * 1.5));
      crab.root.position.set(
        crabPos.x,
        Math.max(crabPos.y, islandHeight(crabPos.x, crabPos.z)),
        crabPos.z,
      );
      crab.root.scale.setScalar(Math.max(0.001, crabVisible));
      crab.root.rotation.y =
        Math.atan2(camera.x - crabPos.x, camera.z - crabPos.z) + Math.sin(time * 0.4) * 0.15;
      const stomp = env.dam > 0.5 ? Math.max(0, Math.sin(time * 5)) * 0.08 : 0;
      crab.shell.position.y = Math.abs(Math.sin(time * 3)) * 0.03 - stomp;
      crab.shell.scale.y = 1 + Math.sin(time * 1.8) * 0.02;
      crab.jaws.forEach(
        (j, i) => (j.rotation.x = Math.max(0, Math.sin(time * 2.4 + i * 1.7)) * 0.55),
      );
      crab.eyes.forEach((eye, i) => {
        eye.rotation.z = Math.sin(time * 1.3 + i * 2) * 0.09;
        eye.rotation.x = Math.sin(time * 0.9 + i) * 0.07;
      });
      crab.legs.forEach(
        (l, i) =>
          (l.rotation.x = Math.sin(time * (moving ? 14 : 3) + i * 1.9) * (moving ? 0.24 : 0.07)),
      );

      const size = Math.max(0.001, env.helpers);
      helpers.root.visible = env.helpers > 0.01;
      helpers.animals.forEach((animal, i) => {
        animal.root.scale.setScalar(size);
        animal.bob.rotation.x = Math.max(0, Math.sin(time * 2 + i * 1.3)) * animal.dip;
      });
      helpers.flock.forEach((b, i) => {
        const a = time * 0.8 + (i / helpers.flock.length) * Math.PI * 2;
        b.root.position.set(
          spring.x + Math.cos(a) * (3 + Math.sin(i * 2.4) * 0.5),
          spring.y + 3.5 + Math.sin(a * 2) * 0.3,
          spring.z + Math.sin(a) * (3 + Math.sin(i * 2.4) * 0.5),
        );
        b.root.rotation.y = -a;
        b.root.rotation.z = -0.25;
        b.root.scale.setScalar(size * 1.2);
        b.wings.forEach(
          (w, k) => (w.rotation.z = Math.sin(time * 11 + i * 1.7) * 0.7 * (k ? 1 : -1)),
        );
      });
    },
    pick(ray) {
      let object: THREE.Object3D | null =
        ray.intersectObjects([bird.root, crab.root], true)[0]?.object ?? null;
      while (object) {
        if (object === bird.root) return "bird";
        if (object === crab.root) return "crab";
        object = object.parent;
      }
      return null;
    },
    anchor(name, out) {
      if (name === "bird") {
        return {
          point: out.copy(bird.root.position).setY(bird.root.position.y + 0.6),
          visible: true,
        };
      }
      return {
        point: out.copy(crab.root.position).setY(crab.root.position.y + 1.6),
        visible: crabVisible > 0.5,
      };
    },
  };
}
