import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  BAND_ASPECT,
  OPENING,
  OPENING_END,
  cardT,
  hubCam,
  openingShot,
  openingStage,
  treeCam,
} from "./camera";

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
  const at = (t: number, aspect: number): { cam: THREE.Vector3; look: THREE.Vector3 } => {
    const cam = new THREE.Vector3();
    const look = new THREE.Vector3();
    treeCam(t, aspect, cam, look);
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

  it("opens on the composition of the screen's aspect", () => {
    const wide = at(0, 1.6);
    expect(wide.cam.x).toBeCloseTo(OPENING.wide.truck);
    expect(wide.cam.y).toBeCloseTo(1.3 + OPENING.wide.lift);
    expect(wide.cam.z).toBeCloseTo(-20 - OPENING.wide.back);
    expect(wide.look.x).toBeCloseTo(OPENING.wide.lookPan);
    expect(wide.look.y).toBeCloseTo(3.5 + OPENING.wide.lookLift);
    const tall = at(0, 0.46);
    expect(tall.cam.z).toBeCloseTo(-20 - OPENING.tall.back);
    expect(tall.look.y).toBeCloseTo(3.5 + OPENING.tall.lookLift);
  });

  it("eases from the opening into the spiral without a jump", () => {
    let last = at(0, 1.6).cam;
    for (let t = 0.002; t <= 0.2; t += 0.002) {
      const next = at(t, 1.6).cam;
      expect(next.distanceTo(last)).toBeLessThan(0.25);
      last = next;
    }
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
      expect(onStage(truck, -19, 0.55)).toBe(false);
    }
  });

  it("changes shot where the intro changes layout", () => {
    expect(openingShot(BAND_ASPECT)).toEqual(OPENING.square);
    expect(openingShot(BAND_ASPECT + 1e-6).lookPan).toBeCloseTo(OPENING.column.lookPan, 3);
    expect(openingShot(0.46)).toEqual(OPENING.tall);
    expect(openingShot(2.2)).toEqual(OPENING.wide);
  });

  it("is narrower on a portrait screen", () => {
    expect(openingStage(() => 1.6)(5, -9, 0.55)).toBe(true);
    expect(openingStage(() => 0.46)(5, -9, 0.55)).toBe(false);
  });
});
