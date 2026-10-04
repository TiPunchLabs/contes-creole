import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { SPOTS } from "./spots";
import { islandHeight, riverPoint } from "./terrain";

/** Flat-shaded Lambert material. */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

/** The source behind the big rock: pool, dead branches choking it and Gwo Rako's dam. */
export function createSource(rng: Rng): {
  group: THREE.Group;
  update(env: MixedEnv, time: number): void;
} {
  const [rx, rz] = SPOTS.rock;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.6, 0).scale(1.3, 1.1, 1),
    paint("#8f877c"),
  );
  rock.position.set(rx, islandHeight(rx, rz) + 0.8, rz);
  rock.rotation.set(0.2, 0.7, 0.1);

  const head = riverPoint(0);
  const poolMaterial = new THREE.MeshBasicMaterial({
    color: "#7fd6cf",
    transparent: true,
    opacity: 0.9,
  });
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 12).rotateX(-Math.PI / 2),
    poolMaterial,
  );
  pool.position.set(head.x, islandHeight(head.x, head.y) + 0.2, head.y);

  const wood = paint("#6b4a32");
  const branches = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6 + rng(), 4), wood);
    stick.position.set((rng() - 0.5) * 1.6, 0.2 + rng() * 0.3, (rng() - 0.5) * 1.6);
    stick.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.6, rng() * 6.28, (rng() - 0.5) * 0.6);
    branches.add(stick);
  }
  branches.position.copy(pool.position);

  const damAt = riverPoint(0.06);
  const ahead = riverPoint(0.07).sub(damAt);
  const stone = paint("#9b9284");
  const dam = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), stone);
    s.position.set((i - 2) * 0.55, 0.2, 0);
    dam.add(s);
  }
  for (const y of [0.45, 0.75]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 0.12), wood);
    plank.position.y = y;
    dam.add(plank);
  }
  dam.position.set(damAt.x, islandHeight(damAt.x, damAt.y), damAt.y);
  dam.rotation.y = Math.atan2(ahead.x, ahead.y);

  const group = new THREE.Group();
  group.add(rock, pool, branches, dam);
  return {
    group,
    update(env, time) {
      branches.visible = env.branches > 0.01;
      branches.scale.setScalar(Math.max(0.001, env.branches));
      dam.visible = env.dam > 0.01;
      dam.scale.set(1, Math.max(0.001, env.dam), 1);
      pool.scale.setScalar(1 - env.branches * 0.6);
      poolMaterial.opacity = 0.8 + Math.sin(time * 1.7) * 0.08;
    },
  };
}
