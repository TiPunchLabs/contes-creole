import { describe, expect, it } from "vitest";
import { createRng } from "@shared/random";
import {
  HOP_GROUND,
  WALK_CYCLE,
  RING,
  TREE_OBSTACLE,
  clearOfTree,
  createCritterStates,
  isFree,
  pickTarget,
  poke,
  stepCritters,
  type Obstacle,
  type StageTest,
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
    // A hop covers its ground during its airborne share only, hence the faster instants.
    expect(Math.hypot(list[0].pos[0] - before[0], list[0].pos[1] - before[1])).toBeLessThanOrEqual(
      (list[0].speed * 0.05) / (1 - HOP_GROUND) + 1e-9,
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

describe("the stage", () => {
  const onStage: StageTest = (x, z, r) => z < -4 && Math.abs(x) + r < 7;

  it("starts both critters in front of the opening view, turned to the Konteur", () => {
    for (const tall of [false, true]) {
      const teller: [number, number] = tall ? [1.9, -12.5] : [4.4, -12.5];
      for (const c of createCritterStates(tall, teller)) {
        expect(c.pos[1]).toBeLessThan(-4);
        expect(Math.hypot(c.pos[0], c.pos[1])).toBeGreaterThan(TREE_OBSTACLE[2] + c.r);
        // Between the Konteur and the opening camera: listening, face still showing.
        const listening = Math.atan2(teller[0] - c.pos[0], teller[1] - c.pos[1]);
        const off = Math.atan2(Math.sin(c.yaw - listening), Math.cos(c.yaw - listening));
        expect(Math.abs(off)).toBeLessThan(1.5);
        expect(Math.hypot(teller[0] - c.pos[0], teller[1] - c.pos[1])).toBeGreaterThan(1.9 + c.r);
      }
    }
  });

  it("only picks targets on the stage", () => {
    const rng = createRng(5);
    const [lapen] = createCritterStates();
    let found = 0;
    for (let i = 0; i < 200; i++) {
      const tgt = pickTarget(lapen, OBSTACLES, rng, onStage);
      if (!tgt) continue;
      found++;
      expect(onStage(tgt[0], tgt[1], lapen.r)).toBe(true);
    }
    expect(found).toBeGreaterThan(100);
  });

  it("keeps the critters on it over a long walk", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    for (let i = 0; i < 6000; i++) {
      stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng, onStage);
      for (const c of list) expect(c.pos[1]).toBeLessThan(-2.5);
    }
  });
});

describe("gaits", () => {
  it("Lapen only travels while a hop has him in the air, and lands the hop he started", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    const lapen = list[0];
    Object.assign(lapen, { wait: 0, tgt: [lapen.pos[0] - 6, lapen.pos[1] + 3] });
    let last = [...lapen.pos];
    for (let i = 0; i < 400; i++) {
      const before = lapen.phase / (Math.PI * 2);
      // From frame 200 on nobody sets off again: the hop under way must still be landed.
      stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng, undefined, i > 200);
      const moved = Math.hypot(lapen.pos[0] - last[0], lapen.pos[1] - last[1]);
      if (before < HOP_GROUND) expect(moved).toBe(0);
      last = [...lapen.pos];
      if (i === 200) lapen.tgt = [lapen.pos[0], lapen.pos[1]];
    }
    expect(lapen.phase).toBe(0);
    expect(lapen.v).toBe(0);
  });

  it("Zanba's legs turn over once per cycle of ground, and he eases in and out of his walk", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    const zanba = list[1];
    Object.assign(zanba, { wait: 0, yaw: Math.PI / 2, tgt: [zanba.pos[0] + 3, zanba.pos[1]] });
    const start = [...zanba.pos];
    const phase = zanba.phase;
    let top = 0;
    for (let i = 0; i < 240; i++) {
      const v = zanba.v;
      stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng);
      expect(Math.abs(zanba.v - v)).toBeLessThan(zanba.speed * 0.05);
      top = Math.max(top, zanba.v);
    }
    const walked = Math.hypot(zanba.pos[0] - start[0], zanba.pos[1] - start[1]);
    expect(top).toBeGreaterThan(zanba.speed * 0.9);
    expect((zanba.phase - phase) / (Math.PI * 2)).toBeCloseTo(walked / WALK_CYCLE, 1);
  });

  it("keeps everybody in place with `still`", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    const at = list.map((c) => [...c.pos]);
    for (let i = 0; i < 1200; i++)
      stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng, undefined, true);
    expect(list.map((c) => c.pos)).toEqual(at);
  });
});

describe("turns", () => {
  it("nobody turns faster than its own limit, and Zanba never turns on the spot", () => {
    const rng = createRng(17);
    const list = createCritterStates();
    let yaws = list.map((c) => c.yaw);
    let places = list.map((c) => [...c.pos]);
    for (let i = 0; i < 9000; i++) {
      if (i === 3000) list.forEach(poke);
      stepCritters(list, 1 / 60, CAMERA, OBSTACLES, rng);
      list.forEach((c, k) => {
        const turned = Math.abs(Math.atan2(Math.sin(c.yaw - yaws[k]), Math.cos(c.yaw - yaws[k])));
        expect(turned).toBeLessThanOrEqual(c.spin / 60 + 1e-9);
        const moved = Math.hypot(c.pos[0] - places[k][0], c.pos[1] - places[k][1]);
        // No pivot: a turn needs ground covered (arcs of 2 m at the tightest).
        if (c.gait === "walk") expect(turned).toBeLessThanOrEqual(moved / 2 + 1e-9);
      });
      yaws = list.map((c) => c.yaw);
      places = list.map((c) => [...c.pos]);
    }
  });
});
