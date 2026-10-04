import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "./env";
import type { CharacterName } from "./speech";
import { valleyHeight } from "./terrain";

const MAX_KALBAS = 24;

/** Ti Kannot (golden bird on a perch), Gwo Rako (red crab) and his stacked calabashes. */
export function createCharacters(rng: Rng): {
  group: THREE.Group;
  snap(env: MixedEnv): void;
  update(env: MixedEnv, time: number): void;
  pick(ray: THREE.Raycaster): CharacterName | null;
  anchor(name: CharacterName, out: THREE.Vector3): { point: THREE.Vector3; visible: boolean };
} {
  const gold = new THREE.MeshStandardMaterial({
    color: "#f2c46d",
    emissive: "#a86a20",
    emissiveIntensity: 0.35,
    roughness: 0.6,
  });
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), gold);
  body.scale.set(1.3, 0.9, 0.9);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), gold);
  head.position.set(0.42, 0.22, 0);
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.26, 6),
    new THREE.MeshStandardMaterial({ color: "#e07a3a" }),
  );
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.68, 0.2, 0);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: "#0b1a1c" });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMaterial);
    eye.position.set(0.54, 0.28, s * 0.12);
    bird.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), gold);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.55, 0.05, 0);
  const wingGeometry = new THREE.PlaneGeometry(0.6, 0.35);
  wingGeometry.translate(0, 0, 0.3);
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: "#f2c46d",
    emissive: "#a86a20",
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const wings = [-1, 1].map((side) => {
    const mesh = new THREE.Mesh(wingGeometry, wingMaterial);
    mesh.rotation.x = side > 0 ? 0 : Math.PI;
    mesh.rotation.y = 0.1;
    mesh.position.set(-0.05, 0.18, 0);
    bird.add(mesh);
    return { mesh, side };
  });
  const perch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 3.2, 6),
    new THREE.MeshStandardMaterial({ color: "#4a2e1e", roughness: 1 }),
  );
  perch.rotation.z = Math.PI / 2 + 0.25;
  perch.position.set(-1.2, -0.5, 0);
  const birdLegs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4),
    new THREE.MeshStandardMaterial({ color: "#e07a3a" }),
  );
  birdLegs.position.set(0, -0.4, 0);
  bird.add(body, head, beak, tail, perch, birdLegs);
  bird.scale.setScalar(0.8);

  const crabMaterial = new THREE.MeshStandardMaterial({
    color: "#d9603a",
    emissive: "#7a2a10",
    emissiveIntensity: 0.35,
    roughness: 0.7,
  });
  const crab = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), crabMaterial);
  shell.scale.set(1.1, 0.5, 0.8);
  shell.position.y = 0.5;
  const claws = [-1, 1].map((side) => {
    const group = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 6), crabMaterial);
    arm.rotation.z = side * -0.9;
    arm.position.set(side * 0.4, 0.1, 0);
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), crabMaterial);
    claw.scale.set(1.2, 0.8, 0.9);
    claw.position.set(side * 0.75, 0.4, 0);
    group.add(arm, claw);
    group.position.set(side * 0.9, 0.5, 0.45);
    crab.add(group);
    return { group, side };
  });
  const legs: { mesh: THREE.Mesh; phase: number }[] = [];
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 1.1, 5), crabMaterial);
      mesh.position.set(side * 1.05, 0.35, -0.25 + i * 0.35);
      mesh.rotation.z = side * 1.0;
      legs.push({ mesh, phase: i });
      crab.add(mesh);
    }
  }
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: "#f6e3b0",
    emissive: "#f6e3b0",
    emissiveIntensity: 0.5,
  });
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4), crabMaterial);
    stalk.position.set(side * 0.25, 1.0, 0.55);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeWhite);
    eye.position.set(side * 0.25, 1.17, 0.55);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMaterial);
    pupil.position.set(side * 0.25, 1.17, 0.64);
    crab.add(stalk, eye, pupil);
  }
  crab.add(shell);

  const kalbasMaterial = new THREE.MeshStandardMaterial({ color: "#c9a061", roughness: 0.8 });
  const kalbas = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    kalbasMaterial,
    MAX_KALBAS,
  );
  kalbas.count = 0;
  const offsets = Array.from(
    { length: MAX_KALBAS },
    (_, i) => [(rng() - 0.5) * 3.2, (rng() - 0.5) * 2.4, 0.28 + Math.floor(i / 12) * 0.45] as const,
  );

  const group = new THREE.Group();
  group.add(bird, crab, kalbas);
  const birdPos = new THREE.Vector3();
  const crabPos = new THREE.Vector3();
  let crabVisible = 0;
  const m4 = new THREE.Matrix4();
  const identity = new THREE.Quaternion();
  const kalbasScale = new THREE.Vector3(1, 1.2, 1);
  const tmp = new THREE.Vector3();

  return {
    group,
    snap(env) {
      birdPos.copy(env.bird);
      if (env.crab) {
        crabPos.copy(env.crab);
        crabVisible = 1;
      } else {
        crabVisible = 0;
      }
    },
    update(env, time) {
      birdPos.lerp(env.bird, 0.06);
      bird.position.copy(birdPos);
      bird.position.y += Math.sin(time * 2.2) * 0.04;
      bird.rotation.y = Math.PI * 0.15 + Math.sin(time * 0.5) * 0.2;
      for (const w of wings)
        w.mesh.rotation.x = (w.side > 0 ? 0 : Math.PI) + Math.sin(time * 9) * 0.35 * w.side;
      if (env.crab) {
        crabPos.lerp(env.crab, 0.06);
        crabVisible = lerp(crabVisible, 1, 0.08);
      } else {
        crabVisible = lerp(crabVisible, 0, 0.1);
      }
      crab.position.copy(crabPos);
      crab.scale.setScalar(Math.max(0.001, crabVisible));
      crab.rotation.y = -0.5 + Math.sin(time * 0.4) * 0.15;
      crab.position.y += Math.abs(Math.sin(time * 3)) * 0.03;
      for (const c of claws) c.group.rotation.z = Math.sin(time * 1.4 + c.side) * 0.18 * c.side;
      for (const l of legs) l.mesh.rotation.x = Math.sin(time * 4 + l.phase * 2) * 0.18;
      const count = env.crab ? Math.min(env.kalbas, MAX_KALBAS) : 0;
      kalbas.count = count;
      kalbasMaterial.color.set(env.empty > 0.5 ? "#7a6a55" : "#c9a061");
      for (let i = 0; i < count; i++) {
        const o = offsets[i];
        const x = crabPos.x + 2.2 + o[0],
          z = crabPos.z + o[1];
        const y = Math.max(valleyHeight(x, z), env.water - 0.2) + o[2];
        m4.compose(tmp.set(x, y, z), identity, kalbasScale);
        kalbas.setMatrixAt(i, m4);
      }
      kalbas.instanceMatrix.needsUpdate = true;
    },
    pick(ray) {
      let object: THREE.Object3D | null =
        ray.intersectObjects([bird, crab], true)[0]?.object ?? null;
      while (object) {
        if (object === bird) return "bird";
        if (object === crab) return "crab";
        object = object.parent;
      }
      return null;
    },
    anchor(name, out) {
      if (name === "bird")
        return { point: out.copy(bird.position).setY(bird.position.y + 0.6), visible: true };
      return {
        point: out.copy(crab.position).setY(crab.position.y + 1.5),
        visible: crabVisible > 0.5,
      };
    },
  };
}
