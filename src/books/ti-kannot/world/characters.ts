import * as THREE from "three";
import { lerp, smoothstep } from "@shared/math";
import type { MixedEnv } from "./env";
import { SPOTS, spotPoint } from "./island/spots";
import { islandHeight } from "./island/terrain";
import type { CharacterName } from "./speech";

const FLIGHT_SECONDS = 1.6;
const FLIGHT_HEIGHT = 2.5;

/** Flat-shaded Lambert material. */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

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

/** Ti Kannot as a sucrier (bananaquit): dark back, yellow belly, white brow; faces local +x. */
function buildBird(): { root: THREE.Group; wings: THREE.Mesh[] } {
  const root = new THREE.Group();
  const dark = paint("#55525c");
  const ink = paint("#151316");
  root.add(
    part(new THREE.IcosahedronGeometry(0.3, 1).scale(1.35, 0.95, 0.95), dark, 0, 0, 0),
    part(
      new THREE.IcosahedronGeometry(0.26, 1).scale(1.1, 0.75, 0.85),
      paint("#f4c21b"),
      0.06,
      -0.08,
      0,
    ),
    part(new THREE.IcosahedronGeometry(0.2, 1), dark, 0.38, 0.2, 0),
    part(new THREE.BoxGeometry(0.16, 0.035, 0.3), paint("#f7f3e8"), 0.42, 0.29, 0),
    part(new THREE.ConeGeometry(0.12, 0.4, 4).rotateZ(Math.PI / 2), dark, -0.5, 0.05, 0),
  );
  const beak = part(new THREE.ConeGeometry(0.05, 0.24, 5), paint("#2a2629"), 0.6, 0.15, 0);
  beak.rotation.z = -Math.PI / 2 - 0.35;
  root.add(beak);
  const legMaterial = paint("#5a4a3a");
  for (const side of [-1, 1]) {
    root.add(part(new THREE.SphereGeometry(0.035, 6, 6), ink, 0.5, 0.24, side * 0.13));
    root.add(
      part(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4), legMaterial, 0, -0.33, side * 0.08),
    );
  }
  const wings = [-1, 1].map((side) => {
    const wing = part(
      new THREE.BoxGeometry(0.45, 0.04, 0.26).translate(0, 0, 0.13 * side),
      dark,
      -0.02,
      0.1,
      side * 0.2,
    );
    root.add(wing);
    return wing;
  });
  root.scale.setScalar(1.4);
  return { root, wings };
}

/** Gwo Rako as a red land crab: big right claw, stalk eyes, eight legs; faces local +z. */
function buildCrab(): {
  root: THREE.Group;
  shell: THREE.Group;
  jaws: THREE.Mesh[];
  legs: THREE.Mesh[];
} {
  const root = new THREE.Group();
  const shell = new THREE.Group();
  const red = paint("#d8452f");
  shell.add(
    part(new THREE.IcosahedronGeometry(0.9, 1).scale(1.25, 0.5, 0.95), red, 0, 0.55, 0),
    part(new THREE.IcosahedronGeometry(0.8, 1).scale(1.15, 0.3, 0.85), paint("#f1dcc0"), 0, 0.4, 0),
  );
  const white = paint("#fbf6ea");
  const ink = paint("#151316");
  for (const side of [-1, 1]) {
    shell.add(
      part(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 4), red, side * 0.25, 0.95, 0.55),
      part(new THREE.SphereGeometry(0.1, 8, 6), white, side * 0.25, 1.12, 0.55),
      part(new THREE.SphereGeometry(0.05, 6, 6), ink, side * 0.25, 1.13, 0.64),
    );
  }
  const jaws = [-1, 1].map((side) => {
    const size = side > 0 ? 1.35 : 1;
    const arm = part(new THREE.CylinderGeometry(0.09, 0.12, 0.8, 5), red, side * 0.95, 0.5, 0.55);
    arm.rotation.set(0.9, 0, side * -0.6);
    const pincer = part(
      new THREE.IcosahedronGeometry(0.3 * size, 0).scale(1.3, 0.7, 0.8),
      red,
      side * 1.25,
      0.75,
      0.95,
    );
    const jaw = part(new THREE.BoxGeometry(0.4 * size, 0.08, 0.14), red, side * 1.25, 0.58, 1.05);
    shell.add(arm, pincer, jaw);
    return jaw;
  });
  const legs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const leg = part(
        new THREE.CylinderGeometry(0.05, 0.035, 1, 4),
        red,
        side * 1.05,
        0.35,
        0.3 - i * 0.28,
      );
      leg.rotation.z = side * 1.0;
      legs.push(leg);
      root.add(leg);
    }
  }
  root.add(shell);
  return { root, shell, jaws, legs };
}

/** The animals clearing the source: two egrets, an agouti, a turtle and a small flock. */
function buildHelpers(): { root: THREE.Group; peckers: THREE.Group[]; flock: THREE.Mesh[] } {
  const root = new THREE.Group();
  const white = paint("#f6f3ec");
  const peckers: THREE.Group[] = [];
  /** Adds an animal at an offset from the spring, facing the spring. */
  const animal = (dx: number, dz: number, ...parts: THREE.Mesh[]): void => {
    const g = new THREE.Group();
    g.add(...parts);
    const x = SPOTS.spring[0] + dx;
    const z = SPOTS.spring[1] + dz;
    g.position.set(x, islandHeight(x, z), z);
    g.rotation.y = Math.atan2(-dx, -dz);
    peckers.push(g);
    root.add(g);
  };
  const legs = paint("#2a2629");
  const yellow = paint("#e8b52a");
  for (const [dx, dz] of [
    [1.8, 1.6],
    [-1.6, 2.2],
  ]) {
    animal(
      dx,
      dz,
      part(new THREE.IcosahedronGeometry(0.25, 0).scale(0.9, 0.9, 1.4), white, 0, 0.75, 0),
      part(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4), white, 0, 1.05, 0.25),
      part(new THREE.SphereGeometry(0.1, 6, 5), white, 0, 1.3, 0.3),
      part(new THREE.ConeGeometry(0.03, 0.22, 4).rotateX(Math.PI / 2), yellow, 0, 1.3, 0.48),
      part(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 3), legs, 0, 0.3, 0),
    );
  }
  animal(
    2.6,
    -0.6,
    part(new THREE.IcosahedronGeometry(0.3, 0).scale(0.9, 0.9, 1.5), paint("#9a6a3c"), 0, 0.3, 0),
    part(new THREE.SphereGeometry(0.17, 6, 5), paint("#8a5c32"), 0, 0.42, 0.42),
  );
  animal(
    -2.4,
    0.4,
    part(
      new THREE.SphereGeometry(0.35, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      paint("#5f7a3a"),
      0,
      0.05,
      0,
    ),
    part(new THREE.SphereGeometry(0.1, 6, 5), paint("#8a9a5a"), 0, 0.12, 0.42),
  );
  const dark = paint("#2e2b30");
  const flock = Array.from({ length: 5 }, () => {
    const bird = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4).rotateX(Math.PI / 2), dark);
    root.add(bird);
    return bird;
  });
  return { root, peckers, flock };
}

/** Ti Kannot, Gwo Rako and the helpers; the bird flies in an arc between spots. */
export function createCharacters(): {
  group: THREE.Group;
  snap(env: MixedEnv): void;
  update(env: MixedEnv, time: number, dt: number, camera: THREE.Vector3): void;
  pick(ray: THREE.Raycaster): CharacterName | null;
  anchor(name: CharacterName, out: THREE.Vector3): { point: THREE.Vector3; visible: boolean };
} {
  const bird = buildBird();
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

  /** Ground point of the bird's spot plus its lift. */
  const birdSpot = (env: MixedEnv, out: THREE.Vector3): THREE.Vector3 => {
    spotPoint(env.bird.spot, out);
    return out.setY(out.y + env.bird.lift);
  };

  return {
    group,
    snap(env) {
      birdSpot(env, birdTarget);
      from.copy(birdTarget);
      bird.root.position.copy(birdTarget);
      birdKey = `${env.bird.spot}/${env.bird.lift}`;
      flight = 1;
      if (env.crab) crabPos.copy(spotPoint(env.crab, crabTarget));
      crabVisible = env.crab ? 1 : 0;
    },
    update(env, time, dt, camera) {
      const key = `${env.bird.spot}/${env.bird.lift}`;
      if (key !== birdKey) {
        birdKey = key;
        from.copy(bird.root.position);
        birdSpot(env, birdTarget);
        flight = 0;
      }
      flight = Math.min(1, flight + dt / FLIGHT_SECONDS);
      const flying = flight < 1;
      bird.root.position.lerpVectors(from, birdTarget, smoothstep(flight));
      bird.root.position.y += Math.sin(Math.PI * flight) * FLIGHT_HEIGHT;
      const hopping = !flying && Math.sin(time * 0.7) > 0.6;
      if (hopping) bird.root.position.y += Math.max(0, Math.sin(time * 6)) * 0.06;
      const flap = flying ? Math.sin(time * 30) * 0.8 : hopping ? Math.sin(time * 9) * 0.12 : 0;
      bird.wings.forEach((w, i) => (w.rotation.x = (i === 0 ? -1 : 1) * flap));
      bird.root.rotation.y =
        Math.atan2(-(camera.z - bird.root.position.z), camera.x - bird.root.position.x) +
        0.6 +
        Math.sin(time * 0.5) * 0.15;

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
      crab.jaws.forEach(
        (j, i) =>
          (j.rotation.z = Math.max(0, Math.sin(time * 2.4 + i * 1.7)) * 0.4 * (i === 0 ? 1 : -1)),
      );
      crab.legs.forEach((l, i) => (l.rotation.x = Math.sin(time * (moving ? 14 : 4) + i) * 0.18));

      const size = Math.max(0.001, env.helpers);
      helpers.root.visible = env.helpers > 0.01;
      helpers.peckers.forEach((p, i) => {
        p.scale.setScalar(size);
        p.rotation.x = Math.max(0, Math.sin(time * 2 + i * 1.3)) * 0.4;
      });
      helpers.flock.forEach((b, i) => {
        const a = time * 0.8 + (i / helpers.flock.length) * Math.PI * 2;
        b.position.set(
          spring.x + Math.cos(a) * 3,
          spring.y + 3.5 + Math.sin(a * 2) * 0.3,
          spring.z + Math.sin(a) * 3,
        );
        b.rotation.y = -a;
        b.scale.setScalar(size);
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
