import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { Count } from "../lite";

const DOME_VERTEX = `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const DOME_FRAGMENT = `varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 hz=vec3(1.,.87,.66), mid=vec3(.98,.76,.66), top=vec3(.66,.64,.86);
  vec3 c=mix(hz,mid,smoothstep(-.02,.18,h)); c=mix(c,top,smoothstep(.15,.7,h)); gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`;

/**
 * Evening sky (v14): lavender-to-peach dome following the camera, rising moon, a few stars, mist and
 * golden fireflies. Must be called after `createLightTree` to keep the mockup's random order.
 */
export function createSky(
  rng: Rng,
  count: Count,
): { group: THREE.Group; update(time: number, cameraPosition: THREE.Vector3): void } {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: DOME_VERTEX,
      fragmentShader: DOME_FRAGMENT,
    }),
  );
  const fireflies = glowPoints(
    rng,
    count(340),
    () => {
      const a = rng() * Math.PI * 2,
        r = 3 + rng() * 13;
      return [Math.cos(a) * r, rng() * 15, Math.sin(a) * r];
    },
    { size: 0.24, drift: 1.2, a: "#fff2a8", b: "#ffcf6a" },
  );
  const stars = glowPoints(
    rng,
    count(90),
    () => {
      const th = rng() * Math.PI * 2,
        ph = 0.55 + rng() * 0.8;
      return [
        Math.cos(th) * Math.cos(ph) * 220,
        Math.sin(ph) * 220 + 10,
        Math.sin(th) * Math.cos(ph) * 220,
      ];
    },
    { size: 1.2, a: "#ffffff", b: "#fff6dc" },
  );
  stars.material.uniforms.uOpacity.value = 0.55;
  const moon = softSprite("#fff6dc", 34, 1, false);
  moon.position.set(-46, 30, 120);
  moon.material.fog = false;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(7, 40),
    new THREE.MeshBasicMaterial({ color: "#fff8e6", fog: false }),
  );
  disc.position.copy(moon.position).add(new THREE.Vector3(0, 0, 2));
  disc.lookAt(0, 8, 0);
  const mists = Array.from({ length: count(12) }, () => {
    const sprite = softSprite("#fff0dc", 14 + rng() * 14, 0.16, false);
    sprite.position.set((rng() - 0.5) * 40, -0.2 + rng() * 1.5, (rng() - 0.5) * 40);
    return { sprite, phase: rng() * 6.28 };
  });
  group.add(dome, fireflies, stars, moon, disc, ...mists.map((m) => m.sprite));

  return {
    group,
    update(time, cameraPosition) {
      dome.position.copy(cameraPosition);
      fireflies.material.uniforms.uTime.value = time;
      stars.material.uniforms.uTime.value = time;
      for (const { sprite, phase } of mists) {
        sprite.position.x += Math.sin(time * 0.1 + phase) * 0.004;
        sprite.material.opacity = 0.12 + Math.sin(time * 0.3 + phase) * 0.05;
      }
    },
  };
}
