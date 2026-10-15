import { describe, expect, it } from "vitest";
import { createRng } from "@shared/random";
import {
  RING,
  TREE_OBSTACLE,
  clearOfTree,
  createCritterStates,
  isFree,
  pickTarget,
  poke,
  stepCritters,
  type Obstacle,
} from "./wander";

const OBSTACLES: Obstacle[] = [TREE_OBSTACLE, [5.2, -12.5, 1.9], [-12, 4, 1.4], [3, 11.5, 0.9]];
const CAMERA = { x: 0, z: -20 };

describe("clearOfTree", () => {
  it("rejects a straight path through the trunk", () => {
    expect(clearOfTree([-8, 0], [8, 0])).toBe(false);
  });

  it("accepts a path that stays away from the trunk", () => {
    expect(clearOfTree([-8, 8], [8, 8])).toBe(true);
  });
});

describe("pickTarget", () => {
  it("returns free points inside the ring, away from the critter", () => {
    const rng = createRng(3);
    const [lapen] = createCritterStates();
    for (let i = 0; i < 200; i++) {
      const tgt = pickTarget(lapen, OBSTACLES, rng);
      if (!tgt) continue;
      const d = Math.hypot(tgt[0], tgt[1]);
      expect(d).toBeGreaterThanOrEqual(RING.min);
      expect(d).toBeLessThanOrEqual(RING.max);
      expect(isFree(tgt[0], tgt[1], lapen.r, OBSTACLES)).toBe(true);
      expect(clearOfTree(lapen.pos, tgt)).toBe(true);
      expect(Math.hypot(tgt[0] - lapen.pos[0], tgt[1] - lapen.pos[1])).toBeGreaterThan(2.5);
    }
  });
});

describe("stepCritters", () => {
  /** Runs `steps` frames of `dt` seconds and calls `check` after each. */
  function simulate(
    steps: number,
    dt: number,
    check: (list: ReturnType<typeof createCritterStates>) => void,
  ): void {
    const rng = createRng(17);
    const list = createCritterStates();
    for (let i = 0; i < steps; i++) {
      stepCritters(list, dt, CAMERA, OBSTACLES, rng);
      check(list);
    }
  }

  it("never lets the two critters overlap", () => {
    simulate(4000, 1 / 60, ([a, b]) => {
      expect(Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1])).toBeGreaterThanOrEqual(
        a.r + b.r,
      );
    });
  });

  it("never lets a critter walk into the trunk", () => {
    simulate(4000, 1 / 60, (list) => {
      for (const c of list)
        expect(Math.hypot(c.pos[0], c.pos[1])).toBeGreaterThan(TREE_OBSTACLE[2]);
    });
  });

  it("stops at the trunk even when its target lies behind it", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    const lapen = list[0];
    Object.assign(lapen, { pos: [5, 0], yaw: -Math.PI / 2, wait: 0, tgt: [-8, 0] });
    for (let i = 0; i < 120; i++) {
      stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng);
      expect(Math.hypot(lapen.pos[0], lapen.pos[1])).toBeGreaterThan(TREE_OBSTACLE[2]);
    }
  });

  it("actually walks", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    const start = [...list[0].pos];
    for (let i = 0; i < 1200; i++) stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng);
    expect(Math.hypot(list[0].pos[0] - start[0], list[0].pos[1] - start[1])).toBeGreaterThan(1);
  });

  it("clamps a huge dt (tab coming back from the background)", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    list[0].wait = 0;
    list[0].tgt = [list[0].pos[0] + 5, list[0].pos[1]];
    const before = [...list[0].pos];
    stepCritters(list, 30, CAMERA, OBSTACLES, rng);
    expect(Math.hypot(list[0].pos[0] - before[0], list[0].pos[1] - before[1])).toBeLessThanOrEqual(
      list[0].speed * 0.05 + 1e-9,
    );
  });
});

describe("poke", () => {
  it("starts a one-second reaction that stops the walk, then the walk resumes", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    const lapen = list[0];
    poke(lapen);
    expect(lapen.react).toBe(1);
    const at = [...lapen.pos];
    for (let i = 0; i < 30; i++) stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng);
    expect(lapen.pos).toEqual(at);
    for (let i = 0; i < 40; i++) stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng);
    expect(lapen.react).toBe(0);
  });

  it("does not restart a reaction already running", () => {
    const [lapen] = createCritterStates();
    poke(lapen);
    lapen.react = 0.4;
    poke(lapen);
    expect(lapen.react).toBe(0.4);
  });
});
