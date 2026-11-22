import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fitFov } from "@shared/three/stage";
import {
  BAND_ASPECT,
  OPENING_END,
  cardT,
  clearances,
  climbPitch,
  climbStops,
  hubCam,
  konteurSpot,
  lensShift,
  openingShot,
  openingStage,
  ringCam,
  ringStop,
  shortness,
  treeCam,
} from "./camera";
import { groundHeight } from "./ground";

/** Screens the camera is checked on: aspect, height in CSS px. */
const SCREENS: [number, number][] = [
  [1440 / 900, 900],
  [1920 / 1080, 1080],
  [1280 / 720, 720],
  [1024 / 768, 768],
  [768 / 1024, 1024],
  [390 / 844, 844],
  [360 / 640, 640],
  [844 / 390, 390],
  [932 / 430, 430],
  [667 / 375, 375],
];

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

describe("climbStops", () => {
  it("lists the opening view, then each card", () => {
    expect(climbStops(3)).toEqual([0, cardT(0, 3), cardT(1, 3), cardT(2, 3)]);
  });
});

describe("ringCam", () => {
  const stops = climbStops(3);
  const [aspect, height] = [390 / 844, 844];
  /** The ring's camera at `turn`: position, look-at height, lens shift and climb value. */
  const at = (turn: number) => {
    const out = new THREE.Vector3();
    const look = new THREE.Vector3();
    const shot = ringCam(turn, stops, aspect, out, look, height);
    return { out, look, ...shot };
  };

  it("rests on the climb's own views at the opening and on each card", () => {
    stops.forEach((t, i) => {
      const out = new THREE.Vector3();
      const look = new THREE.Vector3();
      treeCam(t, aspect, out, look, height);
      const ring = at(i);
      expect(ring.out.distanceTo(out)).toBeLessThan(1e-9);
      expect(ring.look.distanceTo(look)).toBeLessThan(1e-9);
      expect(ring.t).toBeCloseTo(t, 12);
      expect(ring.shift).toBeCloseTo(lensShift(t, aspect, height), 12);
    });
  });

  it("repeats every turn, forwards and backwards, without end", () => {
    for (const turn of [0, 1, 2.4, 3, 3.5]) {
      for (const laps of [-7, -1, 1, 5]) {
        const [a, b] = [at(turn), at(turn + laps * stops.length)];
        expect(b.out.distanceTo(a.out)).toBeLessThan(1e-6);
        expect(b.look.y).toBeCloseTo(a.look.y, 6);
      }
    }
  });

  it("never jumps: a small step is a small move, across the closing of the ring too", () => {
    const step = 0.01;
    for (let turn = -4; turn < 4; turn += step) {
      const [a, b] = [at(turn), at(turn + step)];
      expect(b.out.distanceTo(a.out)).toBeLessThan(0.5);
      expect(Math.abs(b.look.y - a.look.y)).toBeLessThan(0.2);
      expect(Math.abs(b.shift - a.shift)).toBeLessThan(0.05);
    }
  });

  it("keeps turning the same way round the back, above the ground, no card near", () => {
    let angle = Math.atan2(at(3).out.z, at(3).out.x);
    for (let f = 0.02; f <= 1; f += 0.02) {
      const { out, t } = at(3 + f);
      let next = Math.atan2(out.z, out.x);
      while (next < angle - 1e-9) next += Math.PI * 2;
      expect(next - angle).toBeLessThan(0.2);
      angle = next;
      expect(out.y).toBeGreaterThan(groundHeight(out.x, out.z) + 1);
      if (f > 0.4 && f < 0.6)
        for (const s of stops.slice(1)) expect(Math.abs(t - s)).toBeGreaterThan(0.22);
    }
    expect(angle - Math.atan2(at(3).out.z, at(3).out.x)).toBeLessThan(Math.PI);
  });
});

describe("ringStop", () => {
  it("names the landmark's position on the turn under way", () => {
    expect(ringStop(2, 0, 4)).toBe(2);
    expect(ringStop(2, 9, 4)).toBe(10);
    expect(ringStop(1, -6, 4)).toBe(-7);
    expect(ringStop(3, 0.4, 4)).toBe(-1);
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

  it("follows the spiral's path exactly once the climb has started", () => {
    for (const t of [OPENING_END, 0.2, 0.54, 0.88, 1]) {
      const cam = new THREE.Vector3();
      const look = new THREE.Vector3();
      hubCam(t, cam, look);
      for (const [aspect, height] of SCREENS) {
        const shot = at(t, aspect, height);
        expect(shot.cam.distanceTo(cam)).toBeCloseTo(0, 9);
        expect(Math.hypot(shot.look.x, shot.look.z)).toBe(0);
      }
    }
  });

  it("settles without a rebound: pitch, height, distance and lens only ever go one way", () => {
    for (const [aspect, height] of SCREENS) {
      let last = { pitch: Infinity, y: -Infinity, reach: Infinity, shift: -Infinity };
      for (let t = 0; t <= 1.0001; t += 0.002) {
        const { cam, look } = at(t, aspect, height);
        const reach = Math.hypot(cam.x, cam.z);
        const now = {
          pitch: Math.atan2(look.y - cam.y, reach),
          y: cam.y,
          reach,
          shift: -Math.abs(lensShift(t, aspect, height)),
        };
        const where = `t ${t.toFixed(3)} at ${aspect.toFixed(2)}`;
        expect(now.pitch, where).toBeLessThanOrEqual(last.pitch + 1e-6);
        expect(now.pitch).toBeCloseTo(climbPitch(t, aspect, height), 6);
        expect(now.y, where).toBeGreaterThanOrEqual(last.y);
        expect(now.reach, where).toBeLessThanOrEqual(last.reach + 1e-9);
        expect(now.shift, where).toBeGreaterThanOrEqual(last.shift - 1e-12);
        last = now;
      }
    }
  });

  it("turns about the trunk: it looks at the trunk axis all along the climb, on every screen", () => {
    for (const [aspect, height] of SCREENS) {
      let angle = -Infinity;
      for (let t = 0; t <= 1.0001; t += 0.005) {
        const { cam, look } = at(t, aspect, height);
        expect(Math.hypot(look.x, look.z)).toBe(0);
        // The camera goes round the axis one way, never back.
        const now = Math.atan2(cam.z, cam.x);
        const turned = now < angle - Math.PI ? now + 2 * Math.PI : now;
        expect(turned).toBeGreaterThan(angle);
        angle = now;
      }
    }
  });

  it("lets the trunk drift across the screen far slower than the scene turns", () => {
    for (const [aspect, height] of SCREENS) {
      const tanHalfWidth = Math.tan((fitFov(50, aspect) * Math.PI) / 360) * aspect;
      for (let t = 0; t < 1; t += 0.01) {
        // The drift of the lens over a step, as an angle, against the turn of the spiral over it.
        const drift = Math.atan(
          Math.abs(lensShift(t + 0.01, aspect, height) - lensShift(t, aspect, height)) *
            tanHalfWidth,
        );
        expect(drift / (0.01 * Math.PI * 1.55)).toBeLessThan(0.04);
      }
      expect(lensShift(1, aspect, height)).toBeCloseTo(0, 12);
    }
  });

  it("never shows the Konteur lower on screen than the plain spiral would", () => {
    const camera = new THREE.PerspectiveCamera();
    const feet = new THREE.Vector3();
    const plain = { cam: new THREE.Vector3(), look: new THREE.Vector3() };
    for (const [aspect, height] of SCREENS) {
      camera.aspect = aspect;
      camera.fov = fitFov(50, aspect);
      camera.updateProjectionMatrix();
      const [x, z] = konteurSpot(aspect);
      const heightOf = (cam: THREE.Vector3, look: THREE.Vector3): number => {
        camera.position.copy(cam);
        camera.lookAt(look);
        camera.updateMatrixWorld();
        return (1 - feet.set(x, groundHeight(x, z), z).project(camera).y) / 2;
      };
      for (let t = OPENING_END; t <= 1.0001; t += 0.01) {
        const { cam, look } = at(t, aspect, height);
        hubCam(t, plain.cam, plain.look);
        // Within what the sampling of the pitch over t leaves (a fifth of a percent of the height).
        expect(heightOf(cam, look)).toBeLessThanOrEqual(heightOf(plain.cam, plain.look) + 0.002);
      }
    }
  });

  it("opens at the opening's own pitch and tilts smoothly from there", () => {
    for (const [aspect, height] of SCREENS) {
      const shot = openingShot(aspect, height);
      expect(at(0, aspect, height).look.y).toBeCloseTo(3.5 + shot.lookLift, 3);
      for (let t = 0; t < 1; t += 0.002) {
        const step = climbPitch(t, aspect, height) - climbPitch(t + 0.002, aspect, height);
        expect(step).toBeLessThan(0.012);
      }
    }
  });

  it("keeps the cards under the top of the screen while it looks lower", () => {
    const camera = new THREE.PerspectiveCamera();
    const spot = new THREE.Vector3();
    const top = new THREE.Vector3();
    for (const [aspect, height] of SCREENS) {
      camera.aspect = aspect;
      camera.fov = fitFov(50, aspect);
      camera.updateProjectionMatrix();
      for (const count of [2, 3, 4, 5]) {
        for (let index = 0; index < count; index++) {
          const t = cardT(index, count);
          const a = hubCam(t, spot, top) + (index % 2 ? 0.06 : -0.06);
          // The card's top edge at its largest (cards.ts: 2.1 high, scale 1.18, 1.1 when near).
          top.set(Math.cos(a) * 12.2, spot.y + 0.3 + 1.05 * 1.18 * 1.1, Math.sin(a) * 12.2);
          const { cam, look } = at(t, aspect, height);
          camera.position.copy(cam);
          camera.lookAt(look);
          camera.updateMatrixWorld();
          expect((1 - top.project(camera).y) / 2).toBeGreaterThan(0.015);
        }
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
      expect(look.x).toBe(0);
      expect(look.z).toBe(0);
      expect(lensShift(0, aspect, height)).toBe(shot.shift);
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
      const { truck } = openingShot(aspect);
      // On the view axis, between the trunk and the camera.
      expect(onStage(truck * 0.5, -9, 0.55)).toBe(true);
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
