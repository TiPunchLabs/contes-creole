import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { describe, expect, it } from "vitest";
import { STAGING } from "../staging";
import { mixEnv } from "./env";
import { createWater } from "./water";

const ENVS = Object.values(STAGING);

/** Highest y of the river ribbon. */
function riverTop(water: ReturnType<typeof createWater>): number {
  const river = water.group.children[1] as THREE.Mesh;
  const pos = river.geometry.getAttribute("position");
  let top = -Infinity;
  for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i));
  return top;
}

describe("createWater", () => {
  it("shapes the river on the first frame", () => {
    const water = createWater({ reflect: false });
    water.update(mixEnv(ENVS, 0, 0, 0), 0, new THREE.Vector3(0, 10, 30));
    expect(riverTop(water)).toBeGreaterThan(0.5);
  });

  it("lowers the river as it dries", () => {
    const water = createWater({ reflect: false });
    water.update(mixEnv(ENVS, 0, 0, 0), 0, new THREE.Vector3());
    const full = riverTop(water);
    water.update(mixEnv(ENVS, 7, 7, 0), 0, new THREE.Vector3());
    expect(riverTop(water)).toBeLessThan(full);
  });
});

describe("the sea", () => {
  it("mirrors the island only when reflections are on", () => {
    const has = (w: ReturnType<typeof createWater>): boolean =>
      w.group.children.some((c) => c instanceof Reflector);
    expect(has(createWater({ reflect: false }))).toBe(false);
    const reflective = createWater({ reflect: true });
    expect(has(reflective)).toBe(true);
    reflective.dispose();
  });
});
