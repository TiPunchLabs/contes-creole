// @vitest-environment happy-dom
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createRng } from "@shared/random";
import { STAGING } from "../staging";
import { mixEnv } from "./env";
import { createSky, shadowReach } from "./sky";

const ENVS = Object.values(STAGING);

/** The sun of a sky: its only light that can cast shadows. */
function sunOf(sky: ReturnType<typeof createSky>): THREE.DirectionalLight {
  const lights = sky.group.children.filter(
    (c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight,
  );
  return lights[0];
}

describe("shadowReach", () => {
  it("covers the whole island on the wide shots and stays tight on the close ones", () => {
    expect(shadowReach(46)).toBeGreaterThanOrEqual(30);
    expect(shadowReach(12)).toBeLessThan(15);
    expect(shadowReach(2)).toBe(shadowReach(12));
  });
});

describe("createSky", () => {
  it("casts no shadow unless asked for a shadow map", () => {
    expect(sunOf(createSky(createRng(1))).castShadow).toBe(false);
    const sun = sunOf(createSky(createRng(1), { shadows: 1024 }));
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.x).toBe(1024);
  });

  it("moves the shadow frustum in whole texels as the shot glides", () => {
    const sky = createSky(createRng(1), { shadows: 1024 });
    const sun = sunOf(sky);
    const camera = new THREE.Vector3(0, 10, 30);
    const right = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const texel = (shadowReach(ENVS[1].shot.distance) * 2) / 1024;
    for (const f of [0, 0.013, 0.02]) {
      const env = mixEnv(ENVS, 1, 1, 0);
      env.shot.focus.x += f;
      sky.update(env, 0, camera);
      dir.subVectors(sun.position, sun.target.position).normalize();
      right.crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
      const steps = sun.target.position.dot(right) / texel;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-3);
    }
  });

  it("keeps the motes still and unseen when asked", () => {
    const sky = createSky(createRng(1), { motes: false });
    sky.update(mixEnv(ENVS, 1, 1, 0), 0, new THREE.Vector3());
    const clouds = sky.group.children.filter((c): c is THREE.Points => c instanceof THREE.Points);
    const opacities = clouds.map(
      (p) => (p.material as THREE.ShaderMaterial).uniforms.uOpacity.value as number,
    );
    // Rain, fireflies and motes: none shows on a dry day page without motes.
    expect(opacities).toEqual([0, 0, 0]);
  });
});
