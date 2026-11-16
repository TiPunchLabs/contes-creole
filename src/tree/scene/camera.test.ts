import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fitFov } from "@shared/three/stage";
import {
  BAND_ASPECT,
  OPENING_END,
  cardT,
  clearances,
  hubCam,
  konteurSpot,
  openingShot,
  openingStage,
  shortness,
  treeCam,
} from "./camera";
import { groundHeight } from "./ground";

describe("cardT", () => {
  it("puts a single book in the middle of the climb", () => {
    expect(cardT(0, 1)).toBe(0.5);
  });

  it.each([2, 3, 5])("spreads %i books over [0.2, 0.88], strictly increasing", (count) => {
    const ts = Array.from({ length: count }, (_, i) => cardT(i, count));
    expect(ts[0]).toBeCloseTo(0.2);
    expect(ts[count - 1]).toBeCloseTo(0.88);
    ts.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(ts[i]));
  });
});

describe("hubCam", () => {
  it("starts low and far, ends high and closer (v14 path)", () => {
    const out = new THREE.Vector3();
    const look = new THREE.Vector3();
    hubCam(0, out, look);
    expect(out.y).toBeCloseTo(1.3);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(20);
    hubCam(1, out, look);
    expect(out.y).toBeCloseTo(7.7);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(16);
  });
});

describe("treeCam", () => {
  const at = (
    t: number,
    aspect: number,
    height = 900,
  ): { cam: THREE.Vector3; look: THREE.Vector3 } => {
    const cam = new THREE.Vector3();
    const look = new THREE.Vector3();
    treeCam(t, aspect, cam, look, height);
    return { cam, look };
  };

  it("follows the spiral exactly once the climb has started", () => {
    for (const t of [OPENING_END, 0.2, 0.54, 0.88, 1]) {
      const cam = new THREE.Vector3();
      const look = new THREE.Vector3();
      hubCam(t, cam, look);
      for (const aspect of [0.46, 1.6]) {
        const shot = at(t, aspect);
        expect(shot.cam.distanceTo(cam)).toBeCloseTo(0, 9);
        expect(shot.look.distanceTo(look)).toBeCloseTo(0, 9);
      }
    }
  });

  it("opens on the composition of the screen", () => {
    for (const [aspect, height] of [
      [1.6, 900],
      [0.46, 844],
      [844 / 390, 390],
    ]) {
      const shot = openingShot(aspect, height);
      const { cam, look } = at(0, aspect, height);
      expect(cam.x).toBeCloseTo(shot.truck);
      expect(cam.y).toBeCloseTo(1.3 + shot.lift);
      expect(cam.z).toBeCloseTo(-20 - shot.back);
      expect(look.x).toBeCloseTo(shot.lookPan);
      expect(look.y).toBeCloseTo(3.5 + shot.lookLift);
    }
  });

  it("eases from the opening into the spiral without a jump", () => {
    let last = at(0, 1.6).cam;
    for (let t = 0.002; t <= 0.2; t += 0.002) {
      const next = at(t, 1.6).cam;
      expect(next.distanceTo(last)).toBeLessThan(0.25);
      last = next;
    }
  });

  it("never jumps when a window is resized, across the layout limit either way", () => {
    const pose = (width: number, height: number): THREE.Vector3[] => {
      const { cam, look } = at(0, width / height, height);
      return [cam, look];
    };
    const step = (a: THREE.Vector3[], b: THREE.Vector3[]): number =>
      Math.max(a[0].distanceTo(b[0]), a[1].distanceTo(b[1]));
    // One CSS pixel of width at a time on a 1000 px high window, 400 to 2400 px wide, and back.
    let worst = 0;
    let last = pose(400, 1000);
    for (let width = 401; width <= 2400; width++) {
      const next = pose(width, 1000);
      worst = Math.max(worst, step(next, last));
      last = next;
    }
    for (let width = 2399; width >= 400; width--) {
      const next = pose(width, 1000);
      worst = Math.max(worst, step(next, last));
      last = next;
    }
    expect(worst).toBeLessThan(0.12);
    // The two sides of the limit as the review measured them: 6.5 m apart before.
    expect(step(pose(1200, 1000), pose(1201, 1000))).toBeLessThan(0.12);
    expect(step(pose(720, 600), pose(721, 600))).toBeLessThan(0.2);
    // One CSS pixel of height at a time on a 900 px wide window, down to a phone on its side.
    worst = 0;
    last = pose(900, 1100);
    for (let height = 1099; height >= 340; height--) {
      const next = pose(900, height);
      worst = Math.max(worst, step(next, last));
      last = next;
    }
    expect(worst).toBeLessThan(0.3);
  });

  it("keeps the crown under the intro and the Konteur's feet above the shelf, at any size", () => {
    const sizes: [number, number][] = [
      [1440, 900],
      [1920, 1080],
      [1280, 720],
      [1024, 768],
      [800, 600],
      [1200, 1000],
      [1201, 1000],
      [1280, 1024],
      [1024, 540],
      [900, 900],
      [768, 1024],
      [430, 932],
      [390, 844],
      [360, 640],
      [844, 390],
      [932, 430],
      [667, 375],
      [2560, 1080],
    ];
    for (const [width, height] of sizes) {
      const aspect = width / height;
      const { cam, look } = at(0, aspect, height);
      const camera = new THREE.PerspectiveCamera(fitFov(50, aspect), aspect, 0.1, 600);
      camera.position.copy(cam);
      camera.lookAt(look);
      camera.updateMatrixWorld();
      const y = (p: THREE.Vector3): number => ((1 - p.project(camera).y) / 2) * height;
      const [kx, kz] = konteurSpot(aspect);
      const feet = y(new THREE.Vector3(kx, groundHeight(kx, kz), kz));
      const top = y(new THREE.Vector3(0, 13.6, 0));
      const free = clearances(aspect, height);
      // The shelf is 66 px high above a margin of 12 to 26 px.
      const shelfTop = height - 66 - Math.min(26, Math.max(12, height * 0.03));
      expect(feet).toBeLessThan(shelfTop - 10);
      expect(feet).toBeCloseTo((1 - free.bottom) * height, 0);
      expect(top).toBeGreaterThan(free.top * height - 1);
      // No more distant than it needs to be: something of the crown touches its limit.
      expect(top).toBeLessThan(free.top * height + height * 0.12);
    }
  });

  it("reads a phone on its side, and only that, as short", () => {
    expect(shortness(844 / 390, 390)).toBe(1);
    expect(shortness(932 / 430, 430)).toBeCloseTo(0.93, 2);
    expect(shortness(1440 / 900, 900)).toBe(0);
    expect(shortness(390 / 844, 400)).toBe(0);
    expect(clearances(BAND_ASPECT, 1000).top).toBeCloseTo(clearances(BAND_ASPECT + 1e-9, 1000).top);
  });
});

describe("openingStage", () => {
  it("keeps to the lawn the opening view shows in front of the trunk", () => {
    for (const aspect of [0.46, 1.6]) {
      const onStage = openingStage(() => aspect);
      const { truck, lookPan } = openingShot(aspect);
      // On the view axis, between the trunk and the camera.
      expect(onStage(truck + (lookPan - truck) * 0.5, -9, 0.55)).toBe(true);
      expect(onStage(0, 9, 0.55)).toBe(false);
      expect(onStage(13, -6, 0.55)).toBe(false);
      // Nearer the camera than the Konteur: the shelf would hide it.
      expect(onStage(truck, -13.5, 0.55)).toBe(false);
    }
  });

  it("is narrower on a portrait screen", () => {
    expect(openingStage(() => 1.6)(5, -9, 0.55)).toBe(true);
    expect(openingStage(() => 0.46)(5, -9, 0.55)).toBe(false);
  });
});

describe("openingStage screens", () => {
  it("rejects a place hidden behind a plant, keeps the one beside it", () => {
    const onStage = openingStage(() => 1.6, [[-3, -14, 1.2]]);
    const { truck, back } = openingShot(1.6);
    // On the line from the camera through the plant, further away.
    const behind: [number, number] = [
      truck + (-3 - truck) * 1.5,
      -(20 + back) + (-14 + 20 + back) * 1.5,
    ];
    expect(onStage(behind[0], behind[1], 0.55)).toBe(false);
    expect(onStage(behind[0] + 4, behind[1], 0.55)).toBe(true);
    expect(openingStage(() => 1.6)(behind[0], behind[1], 0.55)).toBe(true);
  });
});
