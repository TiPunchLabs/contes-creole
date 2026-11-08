import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createRng } from "@shared/random";
import { STAGING } from "../../staging";
import { mixEnv } from "../env";
import { createStock } from "../stock";
import { FLORA, type Flora } from "./flora";
import { createGround, facePaint } from "./ground";
import { reach } from "./kit";
import {
  blocked,
  FOREST_LINE,
  GWO_RAKO,
  hitsHouse,
  hitsStock,
  islandPlan,
  KEEP_BARE,
  LAKOU,
  onStage,
  PATH_HALF,
  SHORE,
  STOCK_AREA,
  sightlines,
  stages,
  toSegment,
  YARD,
  type HousePlan,
  type Placement,
} from "./landscape";
import { SPOTS } from "./spots";
import { islandHeight, riverDistance } from "./terrain";

const plan = islandPlan();
const SIZE = Object.fromEntries(
  (Object.keys(FLORA) as Flora[]).map((name) => {
    const p = FLORA[name]();
    const size = { ...p, reach: reach(p.geometry) };
    p.geometry.dispose();
    return [name, size];
  }),
) as Record<Flora, ReturnType<(typeof FLORA)[Flora]> & { reach: number }>;
/** Roof overhang beyond a katpan's walls (scale 1), and the radius of a hoard item. */
const EAVE = 0.4;
const ITEM_RADIUS = 0.33;
const gwoRako = plan.houses.find((h) => h.yard === YARD) as HousePlan;

/** World corners of a case's footprint. */
function corners(h: HousePlan): [number, number][] {
  const f = h.footprint;
  return [
    [f.left, f.back],
    [f.right, f.back],
    [f.left, f.front],
    [f.right, f.front],
  ].map(([lx, lz]) => [
    h.x + lx * Math.cos(h.yaw) + lz * Math.sin(h.yaw),
    h.z - lx * Math.sin(h.yaw) + lz * Math.cos(h.yaw),
  ]);
}

describe("island scenery", () => {
  it("keeps the village cases and Gwo Rako's apart, off the river and the staged spots", () => {
    expect(plan.houses).toHaveLength(4);
    expect(gwoRako.style).toBe(GWO_RAKO.style);
    for (const h of plan.houses) {
      for (const [x, z] of corners(h)) expect(riverDistance(x, z)).toBeGreaterThan(2);
      for (const spot of ["tank", "tap", "perch", "bank", "ford", "spring", "rock"] as const) {
        expect(hitsHouse(h, SPOTS[spot][0], SPOTS[spot][1], 1.6)).toBe(false);
      }
      for (const o of plan.houses) {
        if (o !== h) expect(corners(o).some(([x, z]) => hitsHouse(h, x, z, 0.3))).toBe(false);
      }
    }
  });

  it("builds Gwo Rako's case as the biggest, its ridge under the roof spot, its hoard behind", () => {
    for (const h of plan.houses) if (h !== gwoRako) expect(gwoRako.top).toBeGreaterThan(h.top);
    // The roof spot lies on the ridge line, in the case's local frame.
    const dx = SPOTS.roof[0] - gwoRako.x;
    const dz = SPOTS.roof[1] - gwoRako.z;
    const c = Math.cos(gwoRako.yaw);
    const s = Math.sin(gwoRako.yaw);
    expect(Math.abs(dx * c - dz * s)).toBeLessThan(0.05);
    expect(dx * s + dz * c).toBeCloseTo(0.45 * gwoRako.scale, 1);
    expect(Math.hypot(...gwoRako.door.map((v, i) => v - SPOTS.yard[i]))).toBeLessThan(2);
  });

  it("keeps Gwo Rako's walls clear of every item of his full hoard, all of it inside STOCK_AREA", () => {
    const envs = Object.values(STAGING);
    const full = envs.findIndex((e) => e.kalbas > 0 && e.barrels > 0 && e.jars > 0);
    const stock = createStock(createRng(1));
    stock.update(mixEnv(envs, full, full, 0));
    const m = new THREE.Matrix4();
    const at = new THREE.Vector3();
    let items = 0;
    for (const mesh of stock.group.children as THREE.InstancedMesh[]) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        at.setFromMatrixPosition(m);
        items++;
        expect(hitsStock(at.x, at.z, 1e-6)).toBe(true);
        // The walls and piers: the footprint less the roof's eave overhang.
        expect(hitsHouse(gwoRako, at.x, at.z, ITEM_RADIUS, -EAVE * gwoRako.scale)).toBe(false);
      }
    }
    expect(items).toBe(68);
    // Controls: the house centre is inside its walls, a hoard item touches the hoard.
    expect(hitsHouse(gwoRako, gwoRako.x, gwoRako.z, ITEM_RADIUS, -EAVE * gwoRako.scale)).toBe(true);
    expect(hitsStock(STOCK_AREA.left + 0.1, STOCK_AREA.back + 0.1, 1e-6)).toBe(true);
  });

  it("seats every case on its piers: no floating floor, no buried steps", () => {
    for (const h of plan.houses) {
      for (const [x, z] of corners(h)) expect(h.y - islandHeight(x, z)).toBeLessThan(1.6);
      const foot = islandHeight(...h.door);
      expect(h.y - foot).toBeLessThan(0.6);
      expect(foot - h.y).toBeLessThan(0.3);
    }
  });

  it("grows plants on land only, off the river, the yards, the hoard and the staged spots", () => {
    for (const p of plan.plants) {
      const s = SIZE[p.flora];
      expect(islandHeight(p.x, p.z)).toBeGreaterThanOrEqual(SHORE);
      expect(riverDistance(p.x, p.z)).toBeGreaterThan(1.25);
      for (const y of [LAKOU, YARD])
        expect(Math.hypot(p.x - y.x, p.z - y.z)).toBeGreaterThan(y.radius);
      expect(hitsStock(p.x, p.z, 0.2)).toBe(false);
      if (s.stratum !== "low") {
        for (const h of plan.houses) expect(hitsHouse(h, p.x, p.z, s.crown * p.scale)).toBe(false);
        expect(hitsStock(p.x, p.z, s.crown * p.scale)).toBe(false);
      }
      if (p.flora !== "tuft") {
        for (const [spot, d] of KEEP_BARE) {
          expect(Math.hypot(p.x - SPOTS[spot][0], p.z - SPOTS[spot][1])).toBeGreaterThan(d);
        }
      }
    }
  });

  it("lets crowns of one height layer overlap only a little, palms and forest a little more", () => {
    const tall = plan.plants.filter((p) => SIZE[p.flora].stratum !== "low");
    for (const a of tall) {
      for (const b of tall) {
        if (a === b || SIZE[a.flora].stratum !== SIZE[b.flora].stratum) continue;
        const reach = SIZE[a.flora].crown * a.scale + SIZE[b.flora].crown * b.scale;
        const min = SIZE[a.flora].stratum === "tree" ? 0.6 : 0.72;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(reach * min - 1e-9);
      }
    }
  });

  it("never hides a page's focus, characters, helpers, cases or hoard, nor crowds its stage", () => {
    const lines = sightlines(plan.houses);
    const what = new Set(lines.map((l) => l.what));
    for (const w of ["focus", "bird", "crab", "helper", "stock", "stage", "house 3"]) {
      expect(what.has(w)).toBe(true);
    }
    for (const p of plan.plants)
      expect(blocked(p, lines).map((l) => `${l.page} ${l.what}`)).toEqual([]);
    const list = stages();
    for (const p of plan.plants.slice(1))
      expect(onStage(p, SIZE[p.flora].stratum, list)).toBe(false);
  });

  it("puts Ti Kannot's flamboyant under his perch, and wooded mountain, palms and flamboyants", () => {
    const tree = plan.plants[0];
    expect(tree.flora).toBe("flamboyant");
    expect(Math.hypot(tree.x - SPOTS.perch[0], tree.z - SPOTS.perch[1])).toBeLessThan(1);
    const count = (f: (p: Placement) => boolean): number => plan.plants.filter(f).length;
    expect(count((p) => p.flora === "flamboyant")).toBeGreaterThanOrEqual(5);
    expect(count((p) => p.flora === "coconut")).toBeGreaterThanOrEqual(10);
    expect(
      count((p) => SIZE[p.flora].stratum === "tree" && islandHeight(p.x, p.z) > FOREST_LINE),
    ).toBeGreaterThanOrEqual(10);
    for (const stratum of ["tree", "shrub", "low"] as const) {
      const kinds = new Set(
        plan.plants.filter((p) => SIZE[p.flora].stratum === stratum).map((p) => p.flora),
      );
      expect(kinds.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("builds every plant as a single merged geometry with colours", () => {
    for (const name of Object.keys(FLORA) as Flora[]) {
      const { geometry } = FLORA[name]();
      expect(geometry.getAttribute("color")).toBeInstanceOf(THREE.BufferAttribute);
      geometry.dispose();
    }
  });

  it("keeps the paths clear of everything but grass, and leads Gwo Rako's track to the ford", () => {
    for (const p of plan.plants) {
      if (p.flora === "tuft") continue;
      for (const [a, b] of plan.paths) expect(toSegment(p.x, p.z, a, b)).toBeGreaterThan(PATH_HALF);
    }
    expect(plan.paths.some(([, [x, z]]) => x === SPOTS.ford[0] && z === SPOTS.ford[1])).toBe(true);
  });

  it("detects a plant standing in a sightline, and lets one beside it through", () => {
    const lines = sightlines(plan.houses).filter((l) => l.page === "ti-kannot-e-gwo-rako");
    const line = lines.find((l) => l.what === "crab");
    expect(line).toBeDefined();
    if (!line) return;
    const mid = line.from.clone().lerp(line.to, 0.5);
    const tree: Placement = { flora: "mango", x: mid.x, z: mid.z, scale: 1, yaw: 0 };
    const ground = islandHeight(mid.x, mid.z);
    // Lift the crown onto the line by choosing a scale whose crown centre meets it.
    tree.scale = Math.max(0.5, (mid.y - ground) / ((SIZE.mango.base + SIZE.mango.height) / 2));
    expect(blocked(tree, [line])).toHaveLength(1);
    const aside = { ...tree, x: mid.x + 30 };
    expect(blocked(aside, [line])).toHaveLength(0);
  });

  it("keeps the stage open: no shrub between a camera and its subject, no crown filling the frame", () => {
    // Page 2's landscape camera on Ti Kannot (the island-wide pages have no stage).
    const page2 = stages().slice(0, 1);
    const { camera, focus } = page2[0];
    expect(Math.hypot(focus.x - SPOTS.perch[0], focus.z - SPOTS.perch[1])).toBeLessThan(0.01);
    const between = camera.clone().lerp(focus, 0.5);
    const shrub: Placement = { flora: "banana", x: between.x, z: between.z, scale: 1, yaw: 0 };
    expect(onStage(shrub, "shrub", page2)).toBe(true);
    expect(onStage({ ...shrub, flora: "tuft" }, "low", page2)).toBe(false);
    const behind = focus.clone().lerp(camera, -0.6);
    expect(onStage({ ...shrub, x: behind.x, z: behind.z }, "shrub", page2)).toBe(false);
    const near = camera.clone().lerp(focus, 0.25);
    const tree: Placement = { flora: "mango", x: near.x, z: near.z, scale: 1, yaw: 0 };
    expect(onStage(tree, "tree", page2)).toBe(true);
    expect(onStage({ ...tree, x: behind.x, z: behind.z }, "tree", page2)).toBe(false);
  });

  it("paints beaten earth on the yards, paths and house sites, and bank soil along the river", () => {
    const { mesh } = createGround(createRng(17));
    const pos = mesh.geometry.getAttribute("position");
    const index = mesh.geometry.getIndex();
    if (!index) throw new Error("indexed ground expected");
    const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    let earth = 0;
    let bank = 0;
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(pos, index.getX(i));
      b.fromBufferAttribute(pos, index.getX(i + 1));
      c.fromBufferAttribute(pos, index.getX(i + 2));
      const paint = facePaint(a, b, c, 1);
      const x = (a.x + b.x + c.x) / 3;
      const z = (a.z + b.z + c.z) / 3;
      if (paint === "earth") {
        earth++;
        const near =
          [LAKOU, YARD].some((y) => Math.hypot(x - y.x, z - y.z) < y.radius + 0.4) ||
          plan.paths.some(([p, q]) => toSegment(x, z, p, q) < PATH_HALF + 0.15) ||
          plan.houses.some((h) => hitsHouse(h, x, z, 0.05, 0.25));
        expect(near).toBe(true);
      }
      if (paint === "bank") {
        bank++;
        expect(riverDistance(x, z)).toBeLessThan(1.45);
      }
    }
    expect(earth).toBeGreaterThan(100);
    expect(bank).toBeGreaterThan(200);
  });
});
