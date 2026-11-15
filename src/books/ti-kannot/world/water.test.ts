import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { describe, expect, it } from "vitest";
import { STAGING } from "../staging";
import { mixEnv } from "./env";
import { DAM } from "./island/source";
import { createWater, riverReach } from "./water";

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

describe("riverReach", () => {
  const up = DAM.t / 2;
  const down = 0.5;

  it("runs full and unbroken in the wet season", () => {
    const reach = riverReach(down, 0, 0);
    expect(reach.width).toBeCloseTo(1);
    expect(reach.flow).toBeCloseTo(1);
    expect(reach.dry).toBe(0);
  });

  it("is a broken thread in the drought", () => {
    const low = riverReach(down, -0.85, 0);
    const thread = riverReach(down, -1.35, 0);
    expect(low.dry).toBe(0);
    expect(thread.width).toBeLessThan(low.width / 2);
    expect(thread.flow).toBeLessThan(0.2);
    expect(thread.dry).toBeGreaterThan(0.8);
  });

  it("is all but cut below a dam, whatever the water level", () => {
    for (const water of [0, -0.7, -1.05]) {
      const free = riverReach(down, water, 0);
      const cut = riverReach(down, water, 1);
      expect(cut.width).toBeLessThan(free.width * 0.25);
      expect(cut.flow).toBeLessThan(free.flow * 0.2);
      expect(cut.level).toBeLessThan(free.level * 0.25);
      expect(cut.dry).toBeGreaterThan(0.85);
    }
  });

  it("holds the water back in a still pond above the dam", () => {
    const free = riverReach(up, -0.7, 0);
    const held = riverReach(up, -0.7, 1);
    expect(held.width).toBeGreaterThan(free.width);
    expect(held.level).toBeGreaterThan(free.level);
    expect(held.flow).toBeLessThan(free.flow / 2);
    expect(held.dry).toBe(0);
  });

  it("changes gradually as the dam goes up", () => {
    const widths = [0, 0.25, 0.5, 0.75, 1].map((dam) => riverReach(down, -0.7, dam).width);
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThan(widths[i - 1]);
  });
});
