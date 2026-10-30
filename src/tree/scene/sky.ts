import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { Count } from "../lite";
import { FLORA_OBSTACLES } from "./flora";
import { SKY } from "./palette";

const DOME_VERTEX = `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const DOME_FRAGMENT = `uniform vec3 uHorizon, uMiddle, uTop; varying vec3 vP; void main(){ float h=normalize(vP).y;
  vec3 c=mix(uHorizon,uMiddle,smoothstep(-.02,.18,h)); c=mix(c,uTop,smoothstep(.15,.7,h)); gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`;

/**
 * Late-afternoon sky ("Veillée claire"): apricot-rose-lilac dome following the camera, low pale sun,
 * a few faint stars, mist and golden fireflies hovering low around the plants. Must be called after
 * `createLightTree` to keep the mockup's random order.
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
      uniforms: {
        uHorizon: { value: new THREE.Color(SKY.horizon) },
        uMiddle: { value: new THREE.Color(SKY.middle) },
        uTop: { value: new THREE.Color(SKY.top) },
      },
      vertexShader: DOME_VERTEX,
      fragmentShader: DOME_FRAGMENT,
    }),
  );
  const fireflies = glowPoints(
    rng,
    count(110),
    () => {
      // One draw picks the plant (integer part) and the bearing around it (fractional part).
      const u = rng() * FLORA_OBSTACLES.length,
        [x, z] = FLORA_OBSTACLES[Math.floor(u)],
        a = (u % 1) * Math.PI * 2,
        r = 0.6 + rng() * 2.4;
      return [x + Math.cos(a) * r, 0.2 + rng() ** 2 * 3.5, z + Math.sin(a) * r];
    },
    { size: 0.22, drift: 0.6, a: "#fff2a8", b: "#ffcf6a" },
  );
  const stars = glowPoints(
    rng,
    count(90),
    () => {
      const th = rng() * Math.PI * 2,
        ph = 0.15 + rng() * 0.5;
      return [
        Math.cos(th) * Math.cos(ph) * 220,
        Math.sin(ph) * 220 + 10,
        Math.sin(th) * Math.cos(ph) * 220,
      ];
    },
    { size: 4, a: "#ffffff", b: "#fff6dc" },
  );
  stars.material.uniforms.uOpacity.value = SKY.starOpacity;
  const moon = softSprite(SKY.sunHalo, 34, 1, false);
  moon.position.set(-46, 30, 120);
  moon.material.fog = false;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(7, 40),
    new THREE.MeshBasicMaterial({ color: SKY.sunDisc, fog: false }),
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
