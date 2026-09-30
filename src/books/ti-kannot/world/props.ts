import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { PageEnv } from "../staging";
import type { MixedEnv } from "./env";
import { meander, station, valleyHeight } from "./terrain";

/** The spring, the stone dam around it and the new water tank. */
export function createProps(
  rng: Rng,
  rockGeometry: THREE.BufferGeometry,
  rockMaterial: THREE.Material,
  envs: PageEnv[],
): { group: THREE.Group; update(env: MixedEnv, time: number): void } {
  const spring = new THREE.Group();
  const dam = new THREE.Group();
  let springPage = -1;
  const placeSpring = (page: number): void => {
    springPage = page;
    const z = station(page) - 7,
      x = meander(z) - 6.8;
    spring.position.set(x, valleyHeight(x, z) + 0.3, z);
    dam.position.copy(spring.position);
  };
  const springLight = new THREE.PointLight("#7af0dc", 30, 18, 1.8);
  springLight.position.y = 1;
  const springGlow = softSprite("#9af5e6", 5, 0.8);
  const springPoints = glowPoints(
    rng,
    160,
    () => [(rng() - 0.5) * 1.6, rng() * 2.5, (rng() - 0.5) * 1.6],
    {
      size: 0.2,
      drift: 0.3,
      a: "#9af5e6",
      b: "#dffcf6",
      fall: -1.2,
    },
  );
  const springRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), rockMaterial);
  springRock.position.set(-1.2, 0.4, -1);
  spring.add(springLight, springGlow, springPoints, springRock);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(Math.cos(a) * 1.7, 0.1, Math.sin(a) * 1.7);
    rock.scale.setScalar(0.28 + rng() * 0.18);
    dam.add(rock);
  }
  dam.scale.setScalar(0);
  placeSpring(
    Math.max(
      0,
      envs.findIndex((e) => e.spring || e.dam),
    ),
  );

  const tank = new THREE.Group();
  {
    const found = envs.findIndex((e) => e.tank);
    const page = found >= 0 ? found : envs.length - 1;
    const z = station(page) - 8,
      x = meander(z) + 5.2;
    tank.position.set(x, valleyHeight(x, z) + 0.1, z);
  }
  tank.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.4, 1.5, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: 0.9, side: THREE.DoubleSide }),
    ),
  );
  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 16),
    new THREE.MeshStandardMaterial({ color: "#2e8a8c", emissive: "#1a5a5c", roughness: 0.2 }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.6;
  tank.add(surface);
  const tapMaterial = new THREE.MeshStandardMaterial({
    color: "#c19a52",
    metalness: 0.6,
    roughness: 0.4,
  });
  for (let i = 0; i < 3; i++) {
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5), tapMaterial);
    const a = -0.6 + i * 0.6;
    tap.rotation.z = Math.PI / 2;
    tap.rotation.y = a;
    tap.position.set(Math.sin(a) * 1.7, -0.1, Math.cos(a) * 1.7);
    tank.add(tap);
  }
  tank.scale.setScalar(0);

  const group = new THREE.Group();
  group.add(spring, dam, tank);
  return {
    group,
    update(env, time) {
      if (env.anchorHasSpring && springPage !== env.anchorPage) placeSpring(env.anchorPage);
      springPoints.material.uniforms.uTime.value = time;
      springLight.intensity = (18 + Math.sin(time * 2) * 6) * (0.4 + env.spring * 0.6);
      springGlow.material.opacity = 0.4 + env.spring * 0.5;
      dam.scale.setScalar(lerp(dam.scale.x, env.dam, 0.08));
      tank.scale.setScalar(lerp(tank.scale.x, env.tank, 0.08));
    },
  };
}
