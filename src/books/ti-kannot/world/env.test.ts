import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { PageEnv } from "../staging";
import { frameOffset, lerpAngle, mixEnv, pageSpan, shotCamera, type MixedShot } from "./env";
import { spotPoint } from "./island/spots";

const env = (over: Partial<PageEnv>): PageEnv => ({
  shot: { focus: "island", azimuth: 0, elevation: 20, distance: 40 },
  sky: ["#000000", "#ffffff"],
  sun: [0, 30, "#ffffff", 1],
  night: 0,
  mist: 0,
  water: 0,
  rain: 0,
  rainbow: 0,
  wilt: 0,
  kalbas: 0,
  barrels: 0,
  jars: 0,
  empty: 0,
  branches: 0,
  dam: 0,
  tank: 0,
  helpers: 0,
  bird: ["perch", 2.6],
  crab: null,
  ...over,
});
const ENVS = [
  env({}),
  env({
    shot: { focus: "yard", azimuth: 350, elevation: 30, distance: 14 },
    water: -1,
    kalbas: 20,
    crab: "yard",
    night: 1,
  }),
];

describe("pageSpan", () => {
  it("clamps to the book and eases the blend", () => {
    expect(pageSpan(2, 0)).toEqual({ i0: 0, i1: 1, f: 0 });
    expect(pageSpan(2, 5)).toEqual({ i0: 1, i1: 1, f: 0 });
    expect(pageSpan(2, 0.5).f).toBeCloseTo(0.5);
  });
});

describe("lerpAngle", () => {
  it("turns the short way across 0°", () => {
    const mid = lerpAngle(350, 10, 0.5);
    expect(((mid % 360) + 360) % 360).toBeCloseTo(0);
    expect(lerpAngle(10, 350, 0.5)).toBeCloseTo(0);
  });
});

describe("mixEnv", () => {
  it("returns the page itself on a whole page", () => {
    const e = mixEnv(ENVS, 1, 1, 0);
    expect(e).toMatchObject({ water: -1, kalbas: 20, night: 1, crab: "yard", anchorPage: 1 });
    const yard = spotPoint("yard");
    expect(e.shot.focus.toArray()).toEqual([yard.x, yard.y + 1, yard.z]);
  });

  it("interpolates weights and switches characters at mid-way", () => {
    expect(mixEnv(ENVS, 0, 1, 0.25)).toMatchObject({ water: -0.25, kalbas: 5, crab: null });
    expect(mixEnv(ENVS, 0, 1, 0.75).crab).toBe("yard");
  });

  it("orbits the short way between pages", () => {
    expect(mixEnv(ENVS, 0, 1, 0.5).shot.azimuth).toBeCloseTo(-5);
  });
});

describe("shotCamera", () => {
  const far: MixedShot = {
    focus: new THREE.Vector3(200, 0, 200),
    azimuth: 0,
    elevation: 0,
    distance: 10,
  };

  it("places the camera on the shot's sphere", () => {
    const out = new THREE.Vector3();
    const look = new THREE.Vector3();
    shotCamera(far, 1.6, out, look);
    expect(out.x).toBeCloseTo(200);
    expect(out.z).toBeCloseTo(210);
    expect(look.toArray()).toEqual([200, 0, 200]);
  });

  it("steps back on portrait screens", () => {
    const out = new THREE.Vector3();
    shotCamera(far, 0.6, out, new THREE.Vector3());
    expect(out.z - 200).toBeCloseTo(12.5);
  });

  it("never goes under the ground", () => {
    const out = new THREE.Vector3();
    shotCamera(
      { focus: new THREE.Vector3(0, 0, 0), azimuth: 0, elevation: -30, distance: 6 },
      1.6,
      out,
      new THREE.Vector3(),
    );
    expect(out.y).toBeGreaterThan(1);
  });
});

describe("frameOffset", () => {
  it("moves the subject right of the reading card on wide screens", () => {
    const [x, y] = frameOffset(1440, 900);
    expect(x).toBeLessThan(0);
    expect(y).toBe(0);
  });

  it("moves the subject above the reading card on portrait screens", () => {
    const [x, y] = frameOffset(390, 844);
    expect(x).toBe(0);
    expect(y).toBeGreaterThan(0);
  });
});
