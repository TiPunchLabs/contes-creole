import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { PageEnv } from "../staging";
import { mixEnv, worldCam } from "./env";
import { meander, station } from "./terrain";

const env = (over: Partial<PageEnv>): PageEnv => ({
  sky: ["#000000", "#ffffff"],
  water: 0,
  moon: [0, 10, -60, "#ffffff", 1],
  stars: 0,
  rain: 0,
  glow: 1,
  bird: [-3, 1.7, -3.5],
  crab: null,
  kalbas: 0,
  dam: 0,
  warm: 0,
  ...over,
});
const ENVS = [
  env({}),
  env({ water: -1, kalbas: 20, crab: [4.8, -5], rain: 1, moon: [0, 10, -60, "#ffffff", 0.5] }),
];

describe("worldCam", () => {
  it("stands above the water, downstream of the page's station", () => {
    const out = new THREE.Vector3();
    const look = new THREE.Vector3();
    expect(worldCam(ENVS, 0, out, look)).toEqual({ i0: 0, i1: 1, f: 0 });
    expect(out.toArray()).toEqual([meander(0) + 1.4, 2.6, 8.5]);
    expect(look.z).toBe(station(0) - 10);
  });

  it("clamps fractional pages to the book", () => {
    const out = new THREE.Vector3();
    expect(worldCam(ENVS, 5, out, new THREE.Vector3())).toEqual({ i0: 1, i1: 1, f: 1 });
    expect(out.y).toBe(-1 + 2.6);
  });
});

describe("mixEnv", () => {
  it("returns the page itself on a whole page", () => {
    const e = mixEnv(ENVS, 1, 1, 0);
    expect(e).toMatchObject({ water: -1, kalbas: 20, rain: 1, anchorPage: 1 });
    expect(e.moon[3]).toBe(0.5);
    expect(e.crab).not.toBeNull();
  });

  it("interpolates numbers and switches characters at mid-way", () => {
    expect(mixEnv(ENVS, 0, 1, 0.25)).toMatchObject({
      water: -0.25,
      kalbas: 5,
      anchorPage: 0,
      crab: null,
    });
    expect(mixEnv(ENVS, 0, 1, 0.75).anchorPage).toBe(1);
  });
});
