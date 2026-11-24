import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { STAGING } from "../staging";
import { KEYS, createMixedKey, mixKeys } from "./keys";
import {
  PAGES,
  createFrame,
  resetFrame,
  route,
  turn,
  type Anchor,
  type Frame,
  type Places,
} from "./pages";

const IDS = Array.from({ length: 12 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);

/** The measured places of the build, rounded: enough to run the timelines without WebGL. */
const places: Places = {
  giveA: new THREE.Vector3(-2.03, 1.02, -1.76),
  giveB: new THREE.Vector3(1.95, 1.04, -1.58),
  floor: 0.305,
  house: (x, z) => [-11.5 + x * 0.47 + z * 0.88, -8.2 - x * 0.88 + z * 0.47],
  houseYaw: 1.082,
  root: [1.6, 2.22],
};

/** The state of a page at an instant, on a fresh frame. */
function at(id: string, t: number): Frame {
  const f = createFrame();
  PAGES[id].run(t, f, places);
  return f;
}

/** Who holds the hero calabash in a frame. */
const owner = (f: Frame): Anchor => (f.gourd.k >= 0.5 ? f.gourd.to : f.gourd.from);

/** Every number of a frame, to compare two evaluations. */
const numbers = (f: Frame): number[] =>
  JSON.stringify(f)
    .match(/-?\d+(\.\d+)?(e-?\d+)?/g)!
    .map(Number);

describe("pages", () => {
  it("script the twelve pages of the staging, each with a bounded action", () => {
    expect(Object.keys(PAGES).sort()).toEqual(IDS);
    expect(Object.keys(STAGING).sort()).toEqual(IDS);
    for (const id of IDS) {
      expect(PAGES[id].seconds).toBeGreaterThan(5);
      expect(PAGES[id].seconds).toBeLessThanOrEqual(15);
    }
  });

  it("depend on the page clock only: the same instant gives the same state, in any order", () => {
    for (const id of IDS) {
      const { seconds } = PAGES[id];
      for (const t of [0, seconds * 0.37, seconds]) {
        const first = numbers(at(id, t));
        // Another page and another instant in between must leave no trace.
        const f = createFrame();
        PAGES[IDS[(IDS.indexOf(id) + 5) % 12]].run(3, f, places);
        PAGES[id].run(seconds, f, places);
        PAGES[id].run(t, resetFrame(f), places);
        expect(numbers(f), `${id} at ${t}`).toEqual(first);
        expect(first.every(Number.isFinite), `${id} at ${t}`).toBe(true);
      }
    }
  });

  it("hold their last state after the action: a long wait never replays the gift", () => {
    for (const id of IDS) {
      const { seconds } = PAGES[id];
      const end = at(id, seconds);
      const later = at(id, seconds + 120);
      // The trembling light of pages 7 and 8 is the only thing still alive.
      end.gourd.glow = later.gourd.glow = 0;
      expect(numbers(later), id).toEqual(numbers(end));
    }
  });

  it("pass the hero calabash from page to page without a jump: branch, hands, table, hands, branch", () => {
    const start = IDS.map((id) => owner(at(id, 0)));
    const end = IDS.map((id) => owner(at(id, PAGES[id].seconds)));
    expect(end).toEqual([
      "branch",
      "branch",
      "carry",
      "carry",
      "carry",
      "table",
      "table",
      "carry",
      "carry",
      "carry",
      "branch",
      "branch",
    ]);
    for (let i = 1; i < 12; i++) expect(start[i], IDS[i]).toBe(end[i - 1]);
  });

  it("keep Mila's hands on the fruit whenever she carries it, and off it once it is put down", () => {
    for (const id of IDS) {
      const { seconds } = PAGES[id];
      for (let t = 0; t <= seconds; t += 0.25) {
        const f = at(id, t);
        const moving = f.gourd.k > 0.02 && f.gourd.k < 0.98;
        const carried = owner(f) === "carry" || (moving && f.gourd.from === "carry");
        if (carried && f.mila.visible) expect(f.hold, `${id} at ${t}`).toBeGreaterThan(0.85);
      }
    }
    expect(at("p06", PAGES.p06.seconds).hold).toBe(0);
    expect(at("p11", PAGES.p11.seconds).hold).toBe(0);
  });

  it("bend branch A only to give and to take back, and give another fruit at dawn", () => {
    expect(Math.max(...[2, 3.2, 4.4].map((t) => at("p03", t).branchA))).toBeGreaterThan(0.99);
    expect(at("p11", 5).branchA).toBeGreaterThan(0.99);
    expect(at("p11", PAGES.p11.seconds).branchA).toBe(0);
    for (const id of IDS.filter((p) => p !== "p03" && p !== "p11")) {
      expect(at(id, PAGES[id].seconds / 2).branchA, id).toBe(0);
    }
    const dawn = at("p12", PAGES.p12.seconds);
    expect(dawn.gift).toEqual({ k: 1, hold: 1 });
    expect(owner(dawn)).toBe("branch");
    expect(dawn.gold).toBe(0);
    expect(dawn.breakfast).toBe(true);
    for (const id of IDS.slice(0, 11)) expect(at(id, 3).gift.k, id).toBe(0);
  });

  it("close the shutters on page 6, keep them closed on page 7, open them on page 8", () => {
    expect(at("p06", 0).shutters).toBe(1);
    expect(at("p06", PAGES.p06.seconds).shutters).toBe(0);
    expect(at("p07", 4).shutters).toBe(0);
    expect(at("p08", 0).shutters).toBe(0);
    expect(at("p08", PAGES.p08.seconds).shutters).toBe(1);
  });

  it("put the lights out through page 7 and bring them back on page 11", () => {
    const fade = [0, 2, 4, 6, 8, 10].map((t) => at("p07", t));
    for (let i = 1; i < fade.length; i++) {
      expect(fade[i].stars).toBeLessThanOrEqual(fade[i - 1].stars);
      expect(fade[i].lit).toBeLessThanOrEqual(fade[i - 1].lit);
    }
    expect(at("p06", PAGES.p06.seconds).stars).toBeLessThan(1);
    expect(at("p09", 5).stars).toBeLessThan(0.2);
    const back = at("p11", PAGES.p11.seconds);
    expect(back.stars).toBe(1);
    expect(back.lit).toBe(1);
    // The rooster stirs first and crows only once the light is back.
    expect(at("p11", 1).stir).toBeGreaterThan(0);
    expect(at("p11", 9).crow).toBe(-1);
    expect(back.crow).toBe(1);
  });
});

describe("route", () => {
  it("walks its points at the asked distance and faces the way it goes", () => {
    const r = route([
      [0, 0],
      [3, 0],
      [3, 4],
    ]);
    expect(r.length).toBe(7);
    expect(r.at(0)).toMatchObject({ x: 0, z: 0 });
    expect(r.at(1.5)).toMatchObject({ x: 1.5, z: 0 });
    expect(r.at(1.5).yaw).toBeCloseTo(Math.PI / 2);
    expect(r.at(7)).toMatchObject({ x: 3, z: 4 });
    expect(r.at(6).yaw).toBeCloseTo(0);
    expect(r.at(99)).toMatchObject({ x: 3, z: 4 });
  });

  it("turns the short way round", () => {
    expect(turn(3, -3, 0.5)).toBeCloseTo(Math.PI, 1);
    expect(turn(0, 1, 0.25)).toBeCloseTo(0.25);
  });
});

describe("staging", () => {
  it("gives every page a landscape and a portrait lens that a camera can use", () => {
    for (const id of IDS) {
      const page = STAGING[id];
      for (const shot of [page.wide, page.tall]) {
        expect(shot.seconds, id).toBeLessThanOrEqual(PAGES[id].seconds);
        for (const lens of [shot.from, shot.to]) {
          expect([...lens.pos, ...lens.look].every(Number.isFinite), id).toBe(true);
          expect(lens.fov, id).toBeGreaterThanOrEqual(30);
          expect(lens.fov, id).toBeLessThanOrEqual(66);
          const reach = Math.hypot(...lens.pos.map((v, i) => v - lens.look[i]));
          expect(reach, id).toBeGreaterThan(1);
          // Painted cut-outs stand upright: the lens never tips far from the horizon.
          expect(Math.abs(Math.asin((lens.look[1] - lens.pos[1]) / reach)), id).toBeLessThan(0.45);
        }
      }
      expect(page.tall.to.fov, id).toBeGreaterThan(page.wide.to.fov);
    }
  });

  it("films the garden from its south-east side only, and the bedroom from inside the room", () => {
    for (const id of IDS) {
      const page = STAGING[id];
      for (const shot of [page.wide, page.tall]) {
        for (const lens of [shot.from, shot.to]) {
          if (page.space === "garden") {
            // South of the line Mila's house – tree – gate: the 180° axis is never crossed.
            expect(lens.pos[2], id).toBeGreaterThan(0);
            expect(lens.look[2], id).toBeLessThan(lens.pos[2]);
          } else {
            expect(lens.pos[0], id).toBeGreaterThan(-3.5);
            expect(lens.pos[0], id).toBeLessThan(-0.2);
            expect(Math.abs(lens.pos[2]), id).toBeLessThan(2.4);
          }
        }
      }
    }
    expect(IDS.filter((id) => STAGING[id].space === "house")).toEqual(["p06", "p08"]);
  });
});

describe("light keys", () => {
  it("mix from one key to another", () => {
    const out = createMixedKey();
    mixKeys("night", "dark", 0, out);
    expect(out.hemi).toBe(KEYS.night.hemi);
    mixKeys("night", "dark", 1, out);
    expect(out.hemi).toBe(KEYS.dark.hemi);
    expect(`#${out.top.getHexString()}`).toBe(KEYS.dark.top);
    mixKeys("night", "dark", 0.5, out);
    expect(out.hemi).toBeCloseTo((KEYS.night.hemi + KEYS.dark.hemi) / 2);
    expect(out.sunFrom.length()).toBeCloseTo(1);
  });
});
