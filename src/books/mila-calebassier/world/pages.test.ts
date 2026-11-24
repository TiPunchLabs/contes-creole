import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { foregroundFoot, STAGING } from "../staging";
import report from "./assets.json";
import LAYOUT from "./layout.json";
import { MASSES } from "./masses";
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

describe("the built tree", () => {
  it("hangs its calabashes in the branches and the canopy, never on the trunk", () => {
    const [tx, , tz] = LAYOUT.tree.at;
    expect(report.tree.gourds.length).toBeGreaterThanOrEqual(10);
    for (const [x, y, z] of report.tree.gourds) {
      // Away from the trunk's axis (the trunk is 0.4 m thick at the fork) and above the fork.
      expect(Math.hypot(x - tx, z - tz)).toBeGreaterThan(1.3);
      expect(y).toBeGreaterThan(LAYOUT.tree.trunkHeight);
    }
  });

  it("brings each low branch down to the height where hands can take its fruit", () => {
    for (const branch of [report.tree.A, report.tree.B]) {
      expect(branch.rest[1]).toBeGreaterThan(2.5);
      expect(branch.bent[1]).toBeGreaterThan(1.0);
      expect(branch.bent[1]).toBeLessThan(1.3);
    }
  });
});

describe("figures and the set", () => {
  /** Every place a figure stands on a page, sampled through its action: x, z and who. */
  function steps(id: string): { x: number; z: number; who: string; t: number }[] {
    const out = [];
    for (let t = 0; t <= PAGES[id].seconds; t += 0.2) {
      const f = at(id, t);
      if (f.mila.visible) out.push({ x: f.mila.x, z: f.mila.z, who: "Mila", t });
      if (f.ninon.visible) out.push({ x: f.ninon.x, z: f.ninon.z, who: "Man Ninon", t });
    }
    return out;
  }
  const GARDEN = IDS.filter((id) => STAGING[id].space === "garden");
  /** Half width of a figure with her dress and arms. */
  const BODY = 0.3;

  it("keep clear of every painted cut-out: foreground of both formats and mid-garden masses", () => {
    for (const id of GARDEN) {
      const cards: [number, number, number][] = MASSES.map(([, , x, z, h]) => [x, z, h]);
      for (const shot of [STAGING[id].wide, STAGING[id].tall]) {
        for (const f of shot.foreground) cards.push([...foregroundFoot(shot, f), f.height]);
      }
      for (const step of steps(id)) {
        for (const [x, z, height] of cards) {
          // A cut-out is as wide as it is tall; its painted mass fills about two thirds of that.
          const gap = Math.hypot(step.x - x, step.z - z) - height * 0.34 - BODY;
          expect
            .soft(
              gap,
              `${id} t=${step.t.toFixed(1)} ${step.who} and the cut-out at ${x.toFixed(1)}, ${z.toFixed(1)}`,
            )
            .toBeGreaterThan(0);
        }
      }
    }
  });

  it("never walk through the trunk, the gate posts, the garden wall or a house", () => {
    const [tx, , tz] = LAYOUT.tree.at;
    const [gx, , gz] = LAYOUT.gate.at;
    const half = LAYOUT.gate.width / 2;
    const inHouse = (spec: typeof LAYOUT.milaHouse, x: number, z: number): boolean => {
      const a = (spec.yaw * Math.PI) / 180;
      const dx = x - spec.at[0];
      const dz = z - spec.at[2];
      const lx = dx * Math.cos(a) - dz * Math.sin(a);
      const lz = dx * Math.sin(a) + dz * Math.cos(a);
      const [w, , d] = spec.size;
      return (
        Math.abs(lx) < w / 2 + 0.3 + BODY &&
        lz > -d / 2 - BODY &&
        lz < d / 2 + spec.terraceDepth + 0.3 + BODY
      );
    };
    for (const id of GARDEN) {
      let last: Record<string, number> = {};
      for (const step of steps(id)) {
        const where = `${id} t=${step.t.toFixed(1)} ${step.who}`;
        expect(Math.hypot(step.x - tx, step.z - tz), `${where} and the trunk`).toBeGreaterThan(
          0.75 + BODY,
        );
        for (const side of [-1, 1]) {
          const post = Math.hypot(step.x - gx, step.z - (gz + side * (half + 0.16)));
          expect(post, `${where} and a gate post`).toBeGreaterThan(0.2 + BODY);
        }
        // Crossing the line of the east wall is only possible through the gate's opening.
        const before = last[step.who];
        if (before !== undefined && (before - gx) * (step.x - gx) < 0) {
          expect(Math.abs(step.z - gz), `${where} crossing the wall`).toBeLessThan(half - 0.15);
        }
        last = { ...last, [step.who]: step.x };
        expect(inHouse(LAYOUT.milaHouse, step.x, step.z), `${where} in Mila's house`).toBe(false);
        expect(inHouse(LAYOUT.ninonHouse, step.x, step.z), `${where} in Man Ninon's house`).toBe(
          false,
        );
      }
    }
  });

  it("stay inside the bedroom on its two pages, off the bed and the bedside table", () => {
    const a = places.houseYaw;
    for (const id of ["p06", "p08"]) {
      for (const step of steps(id)) {
        const dx = step.x - LAYOUT.milaHouse.at[0];
        const dz = step.z - LAYOUT.milaHouse.at[2];
        const lx = dx * Math.cos(a) - dz * Math.sin(a);
        const lz = dx * Math.sin(a) + dz * Math.cos(a);
        const where = `${id} t=${step.t.toFixed(1)} at ${lx.toFixed(2)}, ${lz.toFixed(2)}`;
        const [x0, x1, z0, z1] = report.set.milaHouse.room;
        expect(lx > x0 + 0.2 && lx < x1 - 0.2 && lz > z0 + 0.2 && lz < z1 - 0.15, where).toBe(true);
        // Bed: 1.9 x 0.95 m against the left wall; table: 0.5 m square between bed and façade.
        const onBed = lx < x0 + 1.95 + 0.2 && lz > 0.05 - 0.475 - 0.2 && lz < 0.05 + 0.475 + 0.2;
        const onTable = lx < x0 + 0.63 + 0.2 && Math.abs(lz - 1.05) < 0.25 + 0.2;
        expect(onBed || onTable, where).toBe(false);
      }
    }
  });
});
