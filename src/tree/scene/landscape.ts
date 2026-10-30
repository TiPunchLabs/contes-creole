import * as THREE from "three";
import { clamp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { Count } from "../lite";
import { createFlora } from "./flora";
import { groundHeight } from "./ground";
import { LIGHTS } from "./palette";

const MORNES: [number, number, string, number][] = [
  [62, 14, "#c9a7b4", 9],
  [88, 24, "#b9a6cc", 7],
];

/** Late-afternoon clearing around the tree: low sun, lilac fill, green relief, lavender hills, flora, grass, pool. */
export function createLandscape(
  rng: Rng,
  count: Count,
): { group: THREE.Group; update(time: number): void } {
  const group = new THREE.Group();

  const { hemisphere, rim: sun, key: fill } = LIGHTS;
  group.add(new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity));
  const canopyLight = new THREE.PointLight(LIGHTS.canopy, 26, 30, 1.6);
  canopyLight.position.set(0, 11, 0);
  const baseLight = new THREE.PointLight(LIGHTS.base, 14, 22, 1.6);
  baseLight.position.set(1, 2, -3);
  const rim = new THREE.DirectionalLight(sun.color, sun.intensity);
  rim.position.set(-30, 26, 60);
  const key = new THREE.DirectionalLight(fill.color, fill.intensity);
  key.position.set(10, 20, -40);
  group.add(canopyLight, baseLight, rim, key);

  {
    const geo = new THREE.PlaneGeometry(200, 200, 90, 90);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cA = new THREE.Color("#7ea552");
    const cB = new THREE.Color("#b8c96c");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        y = groundHeight(x, z);
      p.setY(i, y);
      const t = clamp((y + 1) / 2, 0, 1) * (0.5 + 0.5 * rng());
      const c = cA.clone().lerp(cB, t);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    group.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
      ),
    );
  }

  for (const [r, hh, color, n] of MORNES) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
      );
      m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r);
      m.scale.set(18 + rng() * 20, hh * (0.6 + rng() * 0.7), 14 + rng() * 14);
      group.add(m);
    }
  }

  const flora = createFlora(rng, group);

  const grass = glowPoints(
    rng,
    count(600),
    () => {
      const a = rng() * Math.PI * 2,
        r = 3 + rng() * 14,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      return [x, groundHeight(x, z) + 0.1 + rng() * 0.3, z];
    },
    { size: 0.14, drift: 0.06, a: "#6f9e42", b: "#9cbf58" },
  );
  grass.material.blending = THREE.NormalBlending;
  grass.material.uniforms.uOpacity.value = 0.7;
  const pool = softSprite(LIGHTS.pool, 14, 0.22);
  pool.position.set(0, -0.4, 0);
  group.add(grass, pool);

  return {
    group,
    update(time) {
      grass.material.uniforms.uTime.value = time;
      canopyLight.intensity = 24 + Math.sin(time * 0.9) * 4;
      pool.material.opacity = 0.2 + Math.sin(time * 1.3) * 0.04;
      flora.update(time);
    },
  };
}
