import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FLORA, type Flora } from "./flora";
import { createRng } from "@shared/random";
import { createGround, facePaint } from "./ground";
import { reach } from "./kit";
import {
  blocked,
  hitsHouse,
  inPilot,
  LAKOU,
  onStage,
  PATH_HALF,
  pilotPlan,
  sightlines,
  stages,
  STONE_REACH,
  toSegment,
  type HousePlan,
  type Placement,
} from "./landscape";
import { SPOTS } from "./spots";
import { islandHeight, riverDistance } from "./terrain";
import { createVegetation } from "./vegetation";

const plan = pilotPlan();
const SIZE = Object.fromEntries(
  (Object.keys(FLORA) as Flora[]).map((name) => {
    const p = FLORA[name]();
    const size = { ...p, reach: reach(p.geometry) };
    p.geometry.dispose();
    return [name, size];
  }),
) as Record<Flora, ReturnType<(typeof FLORA)[Flora]> & { reach: number }>;

/** Old plants as mounted (same RNG order as the world: ground, then vegetation), one per instance. */
function oldInstances(): { x: number; z: number; extent: number }[] {
  const rng = createRng(17);
  createGround(rng);
  const { group } = createVegetation(rng);
  const byPlace = new Map<string, { x: number; z: number; extent: number }>();
  const m = new THREE.Matrix4();
  const at = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (const mesh of group.children as THREE.InstancedMesh[]) {
    const r = reach(mesh.geometry);
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m);
      m.decompose(at, q, s);
      const key = `${at.x},${at.z}`;
      const extent = Math.max(byPlace.get(key)?.extent ?? 0, r * s.x);
      byPlace.set(key, { x: at.x, z: at.z, extent });
    }
  }
  return [...byPlace.values()];
}

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

describe("landscape pilot", () => {
  it("keeps three cases inside the pilot, apart, off the river and the staged spots", () => {
    expect(plan.houses).toHaveLength(3);
    for (const h of plan.houses) {
      for (const [x, z] of corners(h)) {
        expect(inPilot(x, z)).toBe(true);
        expect(riverDistance(x, z)).toBeGreaterThan(2);
      }
      for (const spot of ["tank", "tap", "perch", "bank"] as const) {
        expect(hitsHouse(h, SPOTS[spot][0], SPOTS[spot][1], 1.6)).toBe(false);
      }
      for (const o of plan.houses) {
        if (o !== h) expect(corners(o).some(([x, z]) => hitsHouse(h, x, z, 0.3))).toBe(false);
      }
    }
  });

  it("seats every case on its stone base: no floating floor, no buried steps", () => {
    for (const h of plan.houses) {
      for (const [x, z] of corners(h)) expect(h.y - islandHeight(x, z)).toBeLessThan(1.6);
      const foot = islandHeight(...h.door);
      expect(h.y - foot).toBeLessThan(0.6);
      expect(foot - h.y).toBeLessThan(0.3);
    }
  });

  it("keeps foliage off the roofs and every plant off the paths and the lakou", () => {
    for (const p of plan.plants) {
      const s = SIZE[p.flora];
      if (s.stratum !== "low") {
        for (const h of plan.houses) expect(hitsHouse(h, p.x, p.z, s.crown * p.scale)).toBe(false);
      }
      expect(Math.hypot(p.x - LAKOU.x, p.z - LAKOU.z)).toBeGreaterThan(LAKOU.radius);
      expect(riverDistance(p.x, p.z)).toBeGreaterThan(1.25);
    }
  });

  it("lets crowns of one height layer overlap only a little", () => {
    const tall = plan.plants.filter((p) => SIZE[p.flora].stratum !== "low");
    for (const a of tall) {
      for (const b of tall) {
        if (a === b || SIZE[a.flora].stratum !== SIZE[b.flora].stratum) continue;
        const reach = SIZE[a.flora].crown * a.scale + SIZE[b.flora].crown * b.scale;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(reach * 0.72 - 1e-9);
      }
    }
  });

  it("never hides the focus, the characters or the cases from the tale's cameras", () => {
    const lines = sightlines(plan.houses);
    for (const p of plan.plants)
      expect(blocked(p, lines).map((l) => `${l.page} ${l.what}`)).toEqual([]);
  });

  it("puts Ti Kannot's flamboyant under his perch and grows several kinds in each layer", () => {
    const tree = plan.plants.find((p) => p.flora === "flamboyant");
    expect(tree && Math.hypot(tree.x - SPOTS.perch[0], tree.z - SPOTS.perch[1])).toBeLessThan(1);
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

  it("keeps every new plant and stone wholly inside the pilot disc", () => {
    for (const p of plan.plants)
      expect(inPilot(p.x, p.z, SIZE[p.flora].reach * p.scale)).toBe(true);
    for (const st of plan.stones)
      expect(inPilot(st.x, st.z, STONE_REACH[st.kind] * st.scale)).toBe(true);
  });

  it("removes only old plants lying wholly inside the pilot, and none of the kept ones reach a case", () => {
    const old = oldInstances();
    expect(old.length).toBeGreaterThan(500);
    for (const o of old) {
      expect(inPilot(o.x, o.z, o.extent)).toBe(false);
      for (const h of plan.houses) expect(hitsHouse(h, o.x, o.z, o.extent)).toBe(false);
    }
  });

  it("keeps the paths clear of everything but grass", () => {
    for (const p of plan.plants) {
      if (p.flora === "tuft") continue;
      for (const [a, b] of plan.paths) expect(toSegment(p.x, p.z, a, b)).toBeGreaterThan(PATH_HALF);
    }
  });

  it("detects a plant standing in a sightline, and lets one beside it through", () => {
    const lines = sightlines(plan.houses).filter((l) => l.page === "ti-kannot-e-gwo-rako");
    const line = lines.find((l) => l.what === "crab");
    expect(line).toBeDefined();
    if (!line) return;
    const mid = line.from.clone().lerp(line.to, 0.5);
    const tree: Placement = { flora: "mango", x: mid.x, z: mid.z, scale: 1, yaw: 0 };
    tree.x = mid.x;
    const ground = islandHeight(mid.x, mid.z);
    // Lift the crown onto the line by choosing a scale whose crown centre meets it.
    tree.scale = Math.max(0.5, (mid.y - ground) / ((SIZE.mango.base + SIZE.mango.height) / 2));
    expect(blocked(tree, [line])).toHaveLength(1);
    const aside = { ...tree, x: mid.x + 30 };
    expect(blocked(aside, [line])).toHaveLength(0);
  });

  it("keeps the stage open: a shrub between the page 2 camera and Ti Kannot is refused", () => {
    const list = stages();
    const { camera, focus } = list[0];
    const between = camera.clone().lerp(focus, 0.5);
    const shrub: Placement = { flora: "banana", x: between.x, z: between.z, scale: 1, yaw: 0 };
    expect(onStage(shrub, "shrub", list)).toBe(true);
    expect(onStage({ ...shrub, flora: "tuft" }, "low", list)).toBe(false);
    const behind = focus.clone().lerp(camera, -0.6);
    expect(onStage({ ...shrub, x: behind.x, z: behind.z }, "shrub", list)).toBe(false);
  });

  it("paints earth and bank soil only on ground faces wholly inside the pilot", () => {
    const { mesh } = createGround(createRng(17));
    const pos = mesh.geometry.getAttribute("position");
    const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    let pilotFaces = 0;
    let straddling = 0;
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      const paint = facePaint(a, b, c, 1);
      const inside = [a, b, c].filter((v) => inPilot(v.x, v.z)).length;
      if (inside > 0 && inside < 3) straddling++;
      if (paint === "earth" || paint === "bank") {
        pilotFaces++;
        expect(inside).toBe(3);
      }
    }
    expect(pilotFaces).toBeGreaterThan(100);
    expect(straddling).toBeGreaterThan(100);
  });
});
