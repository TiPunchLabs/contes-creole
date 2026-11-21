// @vitest-environment happy-dom
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import type { BookManifest } from "@app/contract";
import dataA from "../assets/flamboyant-a.glb?inline";
import dataB from "../assets/flamboyant-b.glb?inline";
import { cardT, hubCam } from "../scene/camera";
import { createCards } from "../scene/cards";
import { readProposal, type Proposal } from "./proposal";

const MODELS = { a: dataA, b: dataB };

/** Parses a model inlined as a data URL. */
async function load(data: string): Promise<Proposal> {
  const bytes = Uint8Array.from(atob(data.slice(data.indexOf(",") + 1)), (c) => c.charCodeAt(0));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
  return readProposal(gltf.scene);
}

const book = (id: string, order: number): BookManifest => ({
  id,
  order,
  ready: true,
  card: { title: id, sub: "", theme: "" },
});

describe.each(["a", "b"] as const)("flamboyant proposal %s", (variant) => {
  it("carries the meshes and the five attach points the scene expects", async () => {
    const { group, rest } = await load(MODELS[variant]);
    const meshes: string[] = [];
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o.name);
    });
    expect(meshes.sort()).toEqual(["bloom", "boughs", "foliage", "roots", "twigs", "wood"]);
    expect(rest).toHaveLength(5);
    // Rooted at the scene's origin, standing on the lawn (y = -0.6), no taller than the opening
    // view's crown points allow (camera.ts `CROWN`, top 13.6).
    const box = new THREE.Box3().setFromObject(group);
    expect(box.min.y).toBeLessThan(-0.6);
    expect(box.max.y).toBeLessThan(13.6);
    expect(
      Math.hypot(box.getCenter(new THREE.Vector3()).x, box.getCenter(new THREE.Vector3()).z),
    ).toBeLessThan(3);
  });

  it("hangs each of the three cards from its own attach point, by a short thread", async () => {
    const { rest } = await load(MODELS[variant]);
    const cards = createCards([book("b1", 1), book("b2", 2), book("b3", 3)], rest);
    const lengths = [0, 1, 2].map((i) => {
      const top = cards
        .position(i)
        .clone()
        .add(new THREE.Vector3(0, 1.05, 0));
      const nearest = rest.reduce((best, p) =>
        p.distanceTo(cards.position(i)) < best.distanceTo(cards.position(i)) ? p : best,
      );
      // Slots 1, 2, 3 of a 3-card tree hang under attach-1, attach-3 and attach-5.
      expect(nearest).toBe(rest[i * 2]);
      return nearest.distanceTo(top);
    });
    // The published tree's threads run 6.9 to 8.5 m (evidence/reference, probe).
    for (const length of lengths) expect(length).toBeLessThan(5.5);
  });

  it("leaves the cards unhidden from their near camera", async () => {
    const { group, rest } = await load(MODELS[variant]);
    const cards = createCards([book("b1", 1), book("b2", 2), book("b3", 3)], rest);
    const blockers: THREE.Object3D[] = [];
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) blockers.push(o);
    });
    const cam = new THREE.Vector3();
    const ray = new THREE.Raycaster();
    const target = new THREE.Vector3();
    cards.planes.forEach((plane, index) => {
      hubCam(cardT(index, 3), cam, new THREE.Vector3());
      cards.update(0, cardT(index, 3), null, cam, () => ({ x: 0, y: 0, visible: true }));
      cards.group.updateMatrixWorld(true);
      let hidden = 0;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 8; j++) {
          target.set(-0.75 + (i + 0.5) * 0.25, -1.05 + (j + 0.5) * 0.2625, 0);
          plane.localToWorld(target);
          const dir = target.clone().sub(cam);
          ray.set(cam, dir.clone().normalize());
          ray.far = dir.length() - 0.05;
          if (ray.intersectObjects(blockers, false).length > 0) hidden++;
        }
      }
      expect(hidden).toBe(0);
    });
  });
});
