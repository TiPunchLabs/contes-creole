// @vitest-environment happy-dom
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { BookManifest } from "@app/contract";
import { createRng } from "@shared/random";
import { scaleCount } from "../lite";
import { cardT, hubCam } from "./camera";
import { createCards } from "./cards";
import { createLandscape } from "./landscape";
import { createSky } from "./sky";
import { createLightTree } from "./tree";

const book = (id: string, order: number): BookManifest => ({
  id,
  order,
  ready: order === 1,
  card: { title: id, sub: "", theme: "" },
});

/**
 * Share of each card hidden from the camera parked on it (the near state): a grid of rays from the
 * camera to points of the card, counting those that hit an opaque scene mesh first. Glows, sprites,
 * lines and the cards themselves are ignored.
 */
function hiddenShare(lite: boolean, books: number): number[] {
  const count = (n: number): number => scaleCount(n, lite);
  const rng = createRng(11);
  const landscape = createLandscape(rng, count);
  const tree = createLightTree(rng, { lite, count });
  createSky(rng, count);
  const cards = createCards(
    Array.from({ length: books }, (_, i) => book(`b${i}`, i + 1)),
    tree.tips,
  );
  const scene = new THREE.Group().add(landscape.group, tree.group, cards.group);
  const blockers: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh && !cards.planes.includes(o) && !o.material.transparent) {
      blockers.push(o);
    }
  });
  scene.updateMatrixWorld(true);
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const target = new THREE.Vector3();
  return cards.planes.map((plane, index) => {
    hubCam(cardT(index, books), cam, look);
    cards.update(0, cardT(index, books), null, cam, () => ({ x: 0, y: 0, visible: true }));
    scene.updateMatrixWorld(true);
    let hidden = 0;
    let total = 0;
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 16; j++) {
        target.set(-0.75 + (i + 0.5) * (1.5 / 12), -1.05 + (j + 0.5) * (2.1 / 16), 0);
        plane.localToWorld(target);
        const dir = target.clone().sub(cam);
        const distance = dir.length();
        ray.set(cam, dir.normalize());
        ray.far = distance - 0.05;
        total++;
        if (ray.intersectObjects(blockers, false).length > 0) hidden++;
      }
    }
    return hidden / total;
  });
}

describe("hanging cards seen from their near camera", () => {
  it.each([false, true])("stay mostly unhidden by the scene (lite %s)", (lite) => {
    // Before the fix a palm trunk hid 16 % of book 1 and tree-fern fronds 5 % of book 2.
    for (const share of hiddenShare(lite, 3)) expect(share).toBeLessThan(0.02);
  });
});

describe("flora and mornes", () => {
  it("never plants a trunk inside a hill", () => {
    // Before the fix two far breadfruits stood inside a morne: only their crowns showed.
    const landscape = createLandscape(createRng(11), (n) => n);
    const plants = landscape.group.children.filter((o) => o.type === "Group");
    const hills = landscape.group.children.filter(
      (o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.SphereGeometry,
    );
    for (const plant of plants) {
      for (const hill of hills) {
        const inside =
          ((plant.position.x - hill.position.x) / hill.scale.x) ** 2 +
          ((plant.position.y - hill.position.y) / hill.scale.y) ** 2 +
          ((plant.position.z - hill.position.z) / hill.scale.z) ** 2;
        expect(inside).toBeGreaterThan(1);
      }
    }
  });
});
