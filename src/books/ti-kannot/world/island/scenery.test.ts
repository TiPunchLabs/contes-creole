import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createRng } from "@shared/random";
import { STAGING } from "../../staging";
import { shotCamera, shotVector, vectorShot, type MixedShot } from "../env";
import { createScenery } from "./scenery";
import { createSource } from "./source";

const scenery = createScenery();
const source = createSource(createRng(17));
scenery.group.updateMatrixWorld(true);
source.group.updateMatrixWorld(true);
// The source group holds the rock, the pool, the branches and the dam, in that order.
const dam = source.group.children[3];

describe("scenery", () => {
  it("leaves Gwo Rako's dam in view on every page framing the source, in both framings", () => {
    const parts = dam.children.map((c) => c.getWorldPosition(new THREE.Vector3()));
    expect(parts).toHaveLength(7);
    const ray = new THREE.Raycaster();
    const shot: MixedShot = { focus: new THREE.Vector3(), azimuth: 0, elevation: 0, distance: 1 };
    const v: number[] = [];
    const camera = new THREE.Vector3();
    let pages = 0;
    for (const [page, env] of Object.entries(STAGING)) {
      if (env.dam <= 0 || env.shot.focus !== "spring") continue;
      pages++;
      vectorShot(shotVector(env.shot, 0, v), shot);
      for (const aspect of [16 / 10, 9 / 19.5]) {
        shotCamera(shot, aspect, camera, new THREE.Vector3());
        const hidden = parts.filter((p) => {
          const to = p.clone().sub(camera);
          ray.set(camera, to.clone().normalize());
          ray.far = to.length() - 0.3;
          return ray.intersectObject(scenery.group, true).length > 0;
        });
        expect(hidden.length, `${page} at ${aspect.toFixed(2)}`).toBe(0);
      }
    }
    expect(pages).toBeGreaterThanOrEqual(1);
  });
});
