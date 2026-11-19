import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { leafAngle, pageHeight } from "./book";
import { DIVE_FOV, divePose, emptyPose, restPose, tallness } from "./camera";
import { PAGE_H, PAGE_W, artPlacement, onSide } from "./page-art";

describe("leafAngle", () => {
  it("lies flat at both ends of the turn and stays within [0, π]", () => {
    for (const u of [0, 0.5, 1]) {
      expect(leafAngle(0, u, 0.5)).toBeCloseTo(0);
      expect(leafAngle(1, u, 0.5)).toBeCloseTo(Math.PI);
    }
    for (let p = 0; p <= 1; p += 0.1)
      for (let u = 0; u <= 1; u += 0.25)
        for (const v of [0, 1]) {
          const a = leafAngle(p, u, v);
          expect(a).toBeGreaterThanOrEqual(0);
          expect(a).toBeLessThanOrEqual(Math.PI);
        }
  });

  it("curls: mid-turn, the free edge lags behind the spine side", () => {
    expect(leafAngle(0.5, 1, 0.5)).toBeLessThan(leafAngle(0.5, 0, 0.5));
  });
});

describe("pageHeight", () => {
  it("dips into the gutter and is flat beyond a quarter of the page", () => {
    expect(pageHeight(0)).toBeLessThan(pageHeight(0.25));
    expect(pageHeight(0.3)).toBeCloseTo(pageHeight(1));
  });
});

describe("artPlacement", () => {
  it("keeps the art's own proportions, landscape across the gutter, portrait on the right page", () => {
    const wide = artPlacement(960, 640);
    expect(((wide.x1 - wide.x0) * PAGE_W) / ((wide.y1 - wide.y0) * PAGE_H)).toBeCloseTo(1.5);
    expect(wide.x0).toBeLessThan(0);
    expect(wide.x1).toBeGreaterThan(0);
    const tall = artPlacement(640, 960);
    expect(((tall.x1 - tall.x0) * PAGE_W) / ((tall.y1 - tall.y0) * PAGE_H)).toBeCloseTo(2 / 3);
    expect(onSide(tall, "left")).toBeNull();
    expect(onSide(wide, "left")).not.toBeNull();
  });
});

describe("camera", () => {
  it("frames wide screens and upright phones differently", () => {
    expect(tallness(16 / 10)).toBe(0);
    expect(tallness(390 / 844)).toBe(1);
    const wide = restPose(1.6, emptyPose());
    const tall = restPose(0.46, emptyPose());
    expect(tall.fov).toBeGreaterThan(wide.fov);
  });

  it("dives like the tree: still at 0, at the target's far side with fov 95 at 1", () => {
    const rest = restPose(1.6, emptyPose());
    const target = new THREE.Vector3(0.3, 0.8, 0.8);
    const start = divePose(rest, target, 0.7, 0, emptyPose());
    expect(start.position.distanceTo(rest.position)).toBeCloseTo(0);
    const end = divePose(rest, target, 0.7, 1, emptyPose());
    expect(end.fov).toBe(DIVE_FOV);
    expect(end.position.distanceTo(target)).toBeCloseTo((0.6 * 0.7) / 2.1);
    // Beyond the target: farther from the rest position than the target is.
    expect(end.position.distanceTo(rest.position)).toBeGreaterThan(
      target.distanceTo(rest.position),
    );
  });
});
