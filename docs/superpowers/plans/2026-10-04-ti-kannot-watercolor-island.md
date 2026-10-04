# 🏝️ Ti Kannot Watercolour Island — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Ti Kannot's night-valley world with a single low-poly island diorama rendered as a
watercolour, staged page by page, with rebuilt characters, procedural ambience, a new cover and a
paper reading theme.

**Architecture:** Everything stays inside `src/books/ti-kannot/` (universe isolation), except an
optional `render` argument on the shared `createStage().start()`. Pure functions (terrain height,
spots, staging mix, camera shot, stock slots, sound levels, paint quality) are unit-tested; Three.js
builders consume them and are verified visually in the browser.

**Tech Stack:** Vite 8, TypeScript 6 (strict), Three.js r186 + `three/addons` post-processing,
WebAudio, Vitest + happy-dom, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-04-ti-kannot-watercolor-island-design.md`

## Global Constraints

- pnpm only; the only new dependency is `@fontsource/caveat`.
- Universe isolation: files under `src/books/ti-kannot/` import only their own files, `@shared/*`,
  `@app/contract`, `three`, `three/addons/*`, `@fontsource/*`.
- Strict TypeScript, no `any`; English identifiers; docstrings on every function; no obvious comments.
- No imported models, textures or audio files: everything is generated in code.
- Layout randomness uses the book's seeded RNG (`createRng`); `Math.random` only for audio timing.
- The world's mount disposes everything it built if it throws.
- Tale text (`story/*.md`) is never edited.
- **Commits:** the user's policy is "never auto-commit". Each task ends with a _checkpoint_ listing the
  suggested Conventional Commit message; commit only when the user asks.
- Verification commands: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## Review Focus

1. **Story edited so a page id has no staging** → mount must throw a clear error before creating
   anything (kept test, Task 10) and the staging test must catch it in CI (Task 3).
2. **No `AudioContext` / autoplay blocked / `localStorage` throwing (private mode)** → the world still
   mounts, the button still toggles, sound resumes on the first tap (Task 9 tests).
3. **Fast page flipping across the 0°/360° seam** → the camera turns the short way, never spins a full
   turn (`lerpAngle` wrap test, Task 3).
4. **Portrait phones** → the camera steps back so the island fits (Task 3 test), and the low paint tier
   is selected on coarse pointers (Task 8 test).
5. **Mount failure half-way** → stage, listeners, audio context and the mute button are all released
   (Task 10 test).

---

## 📁 File map

```
src/shared/three/stage.ts                 modify: start(frame, render?)
src/shared/three/stage.test.ts            create
src/books/ti-kannot/
  staging.ts                              rewrite: new PageEnv + 12 pages
  staging.test.ts                         create: staging ↔ story ids, stock caps
  cover.ts                                rewrite: watercolour cover
  theme.css                               rewrite: paper card, Caveat, sound button
  world/
    index.ts                              rewrite: wiring
    index.test.ts                         update
    env.ts / env.test.ts                  rewrite
    island/terrain.ts + terrain.test.ts   create: islandHeight, riverPoint, riverDistance
    island/spots.ts + spots.test.ts       create: named spots, landmarks
    island/ground.ts                      create
    island/vegetation.ts                  create
    island/village.ts                     create
    island/source.ts                      create
    water.ts                              rewrite: sea + river ribbon
    sky.ts                                rewrite: dome, sun, islets, rain, fireflies, mist, rainbow
    stock.ts + stock.test.ts              create
    characters.ts                         rewrite
    paint.ts + paint.test.ts              create
    sound.ts + sound.test.ts              create
    speech.ts, speech.test.ts             unchanged
    valley.ts, props.ts, terrain.ts       remove with `trash` (not rm)
```

Tasks 2–9 add new modules next to the old ones; the old world keeps compiling until Task 10 swaps the
wiring. Exception: Task 3 rewrites `staging.ts`/`env.ts`, which the old world uses, so **Task 3 and
Task 10 must land in the same commit series without a build in between being shipped** — run
`pnpm typecheck` only on the new test files until Task 10 (see Task 3, Step 6).

---

### Task 1: Optional render hook on the shared stage

**Files:**

- Modify: `src/shared/three/stage.ts` (`Stage.start` signature + loop)
- Create: `src/shared/three/stage.test.ts`

**Interfaces:**

- Produces: `Stage.start(frame: (time: number, dt: number) => void, render?: () => void): void` —
  when `render` is given it replaces `renderer.render(scene, camera)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/three/stage.test.ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

const rendered = vi.hoisted(() => vi.fn());

vi.mock("three", async (importOriginal) => {
  const THREE = await importOriginal<typeof import("three")>();
  /** WebGL-free stand-in recording draw calls. */
  class FakeRenderer {
    outputColorSpace = "";
    toneMapping = 0;
    toneMappingExposure = 1;
    render = rendered;
    /** No-op. */
    setPixelRatio(): void {}
    /** No-op. */
    setSize(): void {}
    /** No-op. */
    dispose(): void {}
    /** No-op. */
    forceContextLoss(): void {}
  }
  return { ...THREE, WebGLRenderer: FakeRenderer };
});

describe("createStage render hook", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Runs one animation frame of a freshly started stage. */
  async function oneFrame(render?: () => void): Promise<void> {
    let tick: FrameRequestCallback = () => {};
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => ((tick = cb), 1));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const { createStage } = await import("./stage");
    const stage = createStage(document.createElement("div"));
    stage.start(() => {}, render);
    tick(16);
  }

  it("renders the scene itself by default", async () => {
    rendered.mockClear();
    await oneFrame();
    expect(rendered).toHaveBeenCalledTimes(1);
  });

  it("lets a world take over rendering", async () => {
    rendered.mockClear();
    const custom = vi.fn();
    await oneFrame(custom);
    expect(custom).toHaveBeenCalledTimes(1);
    expect(rendered).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`custom` never called)

Run: `pnpm vitest run src/shared/three/stage.test.ts`

- [ ] **Step 3: Implement**

In `stage.ts`, change the interface line and the loop:

```ts
  /** Starts the loop; `render` replaces the default `renderer.render(scene, camera)`. */
  start(frame: (time: number, dt: number) => void, render?: () => void): void;
```

```ts
    start: (frame, render) => {
      stop();
      last = 0;
      const loop = (now: number): void => {
        raf = requestAnimationFrame(loop);
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        resize();
        frame((now - t0) / 1000, dt);
        if (render) render();
        else renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
    },
```

- [ ] **Step 4: Run — expect PASS**, then `pnpm test` (tree untouched).

- [ ] **Step 5: Checkpoint** — `feat(shared): let a world take over the stage render call`

---

### Task 2: Island terrain and named spots

**Files:**

- Create: `src/books/ti-kannot/world/island/terrain.ts`, `terrain.test.ts`
- Create: `src/books/ti-kannot/world/island/spots.ts`, `spots.test.ts`

**Interfaces:**

- Produces (terrain): `ISLAND_RADIUS = 20`; `riverPoint(t: number, out?: THREE.Vector2): THREE.Vector2`
  (x = world x, y = world z; t 0 = source, 1 = mouth); `riverDistance(x, z): number`;
  `islandHeight(x, z): number`.
- Produces (spots): `type Spot = "perch" | "bank" | "ford" | "rock" | "spring" | "yard" | "roof" | "tank" | "tap"`;
  `SPOTS: Record<Spot, readonly [number, number]>`; `HOUSE`, `VILLAGE`, `STOCK` (`readonly [x, z]`);
  `spotPoint(spot: Spot, out?: THREE.Vector3): THREE.Vector3` (ground point, y ≥ 0).

- [ ] **Step 1: Write the failing tests**

```ts
// src/books/ti-kannot/world/island/terrain.test.ts
import { describe, expect, it } from "vitest";
import { ISLAND_RADIUS, islandHeight, riverDistance, riverPoint } from "./terrain";

describe("islandHeight", () => {
  it("is land in the middle and sea floor beyond the coast", () => {
    expect(islandHeight(0, 0)).toBeGreaterThan(0);
    expect(islandHeight(ISLAND_RADIUS * 1.3, 0)).toBeLessThan(0);
    expect(islandHeight(0, ISLAND_RADIUS * 1.3)).toBeLessThan(0);
  });

  it("flows downhill from the source to the mouth", () => {
    const src = riverPoint(0.02);
    const mid = riverPoint(0.5);
    const low = riverPoint(0.85);
    expect(islandHeight(src.x, src.y)).toBeGreaterThan(islandHeight(mid.x, mid.y));
    expect(islandHeight(mid.x, mid.y)).toBeGreaterThan(islandHeight(low.x, low.y));
  });

  it("carves the riverbed below its banks", () => {
    for (const t of [0.3, 0.5, 0.7]) {
      const p = riverPoint(t);
      const banks = (islandHeight(p.x - 4, p.y) + islandHeight(p.x + 4, p.y)) / 2;
      expect(islandHeight(p.x, p.y)).toBeLessThan(banks);
    }
  });

  it("keeps the inland riverbed above sea level", () => {
    for (let t = 0; t <= 0.7; t += 0.05) {
      const p = riverPoint(t);
      expect(islandHeight(p.x, p.y)).toBeGreaterThan(0);
    }
  });
});

describe("riverDistance", () => {
  it("is zero on the centre line and grows away from it", () => {
    const p = riverPoint(0.4);
    expect(riverDistance(p.x, p.y)).toBeLessThan(0.15);
    expect(riverDistance(p.x + 5, p.y)).toBeGreaterThan(3);
  });
});
```

```ts
// src/books/ti-kannot/world/island/spots.test.ts
import { describe, expect, it } from "vitest";
import { SPOTS, spotPoint, type Spot } from "./spots";
import { islandHeight, riverDistance } from "./terrain";

describe("spots", () => {
  it("are all on dry land", () => {
    for (const [x, z] of Object.values(SPOTS)) {
      expect(islandHeight(x, z)).toBeGreaterThan(0.2);
      expect(riverDistance(x, z)).toBeGreaterThan(1);
    }
  });

  it("returns the ground point of a spot", () => {
    const p = spotPoint("yard");
    const [x, z] = SPOTS.yard;
    expect(p.toArray()).toEqual([x, islandHeight(x, z), z]);
  });

  it("gives every character spot a distinct place", () => {
    const keys = new Set(Object.values(SPOTS).map(([x, z]) => `${x},${z}`));
    expect(keys.size).toBe(Object.keys(SPOTS).length as number);
    const _typed: Spot[] = Object.keys(SPOTS) as Spot[];
    expect(_typed).toContain("perch");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (modules missing)

Run: `pnpm vitest run src/books/ti-kannot/world/island`

- [ ] **Step 3: Implement terrain**

```ts
// src/books/ti-kannot/world/island/terrain.ts
import * as THREE from "three";
import { clamp, smoothstep } from "@shared/math";

/** Island radius in world units; the coast sits at about 0.85 of it. */
export const ISLAND_RADIUS = 20;

const MOUNTAIN = { x: -1, z: -15 };

/** River centre line from the source (back, on the mountain) to the mouth (front, in the sea). */
const RIVER = new THREE.SplineCurve(
  [
    [-2, -11],
    [-3.5, -7],
    [-2, -3],
    [0.5, 0.5],
    [0, 4],
    [1.5, 8],
    [3, 12],
    [4.5, 17],
    [6, 22],
  ].map(([x, z]) => new THREE.Vector2(x, z)),
);
const RIVER_SAMPLES = RIVER.getSpacedPoints(200);

/** River centre at `t` in [0, 1] (0 = source, 1 = mouth); `x` is world x, `y` is world z. */
export function riverPoint(t: number, out = new THREE.Vector2()): THREE.Vector2 {
  return RIVER.getPointAt(clamp(t, 0, 1), out);
}

/** Horizontal distance from (x, z) to the river centre line. */
export function riverDistance(x: number, z: number): number {
  let best = Infinity;
  for (const p of RIVER_SAMPLES) best = Math.min(best, (p.x - x) ** 2 + (p.y - z) ** 2);
  return Math.sqrt(best);
}

/** Low-frequency rolling hills in [-1.35, 1.35]. */
const ridges = (x: number, z: number): number =>
  Math.sin(x * 0.45 + z * 0.3) * 0.5 +
  Math.sin(x * 1.1 - z * 0.8) * 0.25 +
  Math.sin(x * 0.2 - z * 0.37) * 0.6;

/** Ground height: a plateau falling into the sea, a mountain at the back and the carved riverbed. */
export function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z * 1.1) / ISLAND_RADIUS;
  const land = 1 - smoothstep(clamp((r - 0.6) / 0.45, 0, 1));
  const toRiver = riverDistance(x, z);
  const mountain = 9 * Math.exp(-((x - MOUNTAIN.x) ** 2 + (z - MOUNTAIN.z) ** 2) / 40);
  const hills = ridges(x, z) * 0.5 * land * smoothstep(clamp(toRiver / 4, 0, 1));
  const carve = (1 - smoothstep(clamp(toRiver / 2.2, 0, 1))) * land;
  return land * 3 - 1.3 + mountain + hills - carve;
}
```

- [ ] **Step 4: Implement spots**

```ts
// src/books/ti-kannot/world/island/spots.ts
import * as THREE from "three";
import { islandHeight } from "./terrain";

/** Named places where the characters stand and the camera looks. */
export type Spot = "perch" | "bank" | "ford" | "rock" | "spring" | "yard" | "roof" | "tank" | "tap";

export const SPOTS: Record<Spot, readonly [number, number]> = {
  perch: [-4.2, 0.5],
  bank: [-1.6, 4.5],
  ford: [2.4, 6.5],
  rock: [-0.2, -12.4],
  spring: [-3.8, -10.4],
  yard: [7, 4.6],
  roof: [7, 1.6],
  tank: [-7, 7.5],
  tap: [-5.3, 8.9],
};

/** Gwo Rako's house, centre of the village and pile behind the house (x, z). */
export const HOUSE = SPOTS.roof;
export const VILLAGE: readonly [number, number] = [-9.5, 3.5];
export const STOCK: readonly [number, number] = [HOUSE[0] - 2.4, HOUSE[1] - 2.8];

/** Ground point of `spot`, never below sea level. */
export function spotPoint(spot: Spot, out = new THREE.Vector3()): THREE.Vector3 {
  const [x, z] = SPOTS[spot];
  return out.set(x, Math.max(0, islandHeight(x, z)), z);
}
```

- [ ] **Step 5: Run — expect PASS.** If "carves the riverbed" or "spots on dry land" fails, move the
      offending spot ≥ 1.2 from the river or reduce `hills` amplitude (0.5 → 0.4); do not weaken the test.

- [ ] **Step 6: Checkpoint** — `feat(ti-kannot): add the island terrain and named spots`

---

### Task 3: Staging and environment mix

**Files:**

- Rewrite: `src/books/ti-kannot/staging.ts`
- Create: `src/books/ti-kannot/staging.test.ts`
- Rewrite: `src/books/ti-kannot/world/env.ts`, `src/books/ti-kannot/world/env.test.ts`

**Interfaces:**

- Consumes: `Spot`, `spotPoint` (Task 2), `islandHeight` (Task 2).
- Produces (staging): `PageEnv`, `Shot`, `STAGING: Record<string, PageEnv>`.
- Produces (env): `MixedEnv`, `MixedShot`, `pageSpan(count, pageF)`, `lerpAngle(a, b, f)`,
  `mixEnv(envs, i0, i1, f): MixedEnv`, `shotCamera(shot, aspect, out, look): void`,
  `sunDirection(env, out): THREE.Vector3`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/books/ti-kannot/staging.test.ts
import { describe, expect, it } from "vitest";
import fr from "./story/fr.md?raw";
import gcf from "./story/gcf.md?raw";
import { STAGING } from "./staging";
import { MAX_STOCK } from "./world/stock";

/** Page ids of a story file, in reading order. */
const ids = (md: string): string[] => [...md.matchAll(/\{#([\w-]+)\}/g)].map((m) => m[1]);

describe("STAGING", () => {
  it("stages exactly the pages of every language", () => {
    expect(Object.keys(STAGING)).toEqual(ids(gcf));
    expect(ids(fr)).toEqual(ids(gcf));
  });

  it("never asks for more stock than the pile can show", () => {
    for (const env of Object.values(STAGING)) {
      expect(env.kalbas).toBeLessThanOrEqual(MAX_STOCK.kalbas);
      expect(env.barrels).toBeLessThanOrEqual(MAX_STOCK.barrels);
      expect(env.jars).toBeLessThanOrEqual(MAX_STOCK.jars);
    }
  });

  it("follows the tale's piles: 20, then 50, then empty", () => {
    expect(STAGING["on-lide-gwo-rako"].kalbas).toBe(20);
    expect(STAGING["larivye-la-ka-desann"].kalbas).toBe(50);
    expect(STAGING["denye-leson-la"].empty).toBe(1);
  });
});
```

> `MAX_STOCK` comes from Task 6. If Task 6 is not done yet, temporarily inline
> `const MAX_STOCK = { kalbas: 50, barrels: 8, jars: 10 }` in the test and swap to the import in Task 6.

```ts
// src/books/ti-kannot/world/env.test.ts
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { PageEnv } from "../staging";
import { lerpAngle, mixEnv, pageSpan, shotCamera, type MixedShot } from "./env";
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
    expect(e.shot.focus.toArray()).toEqual(
      spotPoint("yard")
        .setY(spotPoint("yard").y + 1)
        .toArray(),
    );
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm vitest run src/books/ti-kannot/staging.test.ts src/books/ti-kannot/world/env.test.ts`

- [ ] **Step 3: Rewrite `staging.ts`**

```ts
// src/books/ti-kannot/staging.ts
// Page-by-page staging of « Ti Kannot é Gwo Rako » on the island, keyed by story page id.
import type { Spot } from "./world/island/spots";

/** Camera shot: orbit around `focus` (degrees, 0° = from the front/south; world units). */
export interface Shot {
  focus: Spot | "island";
  azimuth: number;
  elevation: number;
  distance: number;
}

/** Scene parameters of one page; the world interpolates them between pages. Weights are 0..1. */
export interface PageEnv {
  shot: Shot;
  /** Sky gradient: [zenith, horizon]. */
  sky: [string, string];
  /** Sun: azimuth°, elevation°, colour, intensity (the moon on night pages). */
  sun: [number, number, string, number];
  night: number;
  mist: number;
  /** River level offset: 0 = full, -1.35 = a thread, 0.25 = swollen by the rain. */
  water: number;
  rain: number;
  rainbow: number;
  /** Drought: dries the grass and the leaves. */
  wilt: number;
  kalbas: number;
  barrels: number;
  jars: number;
  /** Gwo Rako's stock is empty (pale, tipped over). */
  empty: number;
  /** Dead branches choking the source. */
  branches: number;
  dam: number;
  /** Shared reservoir in the village. */
  tank: number;
  /** Other animals working at the source. */
  helpers: number;
  /** Ti Kannot: spot and height above the ground. */
  bird: [Spot, number];
  /** Gwo Rako's spot, or null when absent. */
  crab: Spot | null;
}

/** Defaults shared by every page; each page lists only what differs. */
const BASE: Omit<PageEnv, "shot" | "sky" | "sun" | "bird" | "crab"> = {
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
};

export const STAGING: Record<string, PageEnv> = {
  "ye-krik": {
    ...BASE,
    shot: { focus: "island", azimuth: 20, elevation: 28, distance: 46 },
    sky: ["#9fd8e0", "#f6d9c0"],
    sun: [-60, 8, "#ffc9a0", 1.1],
    mist: 0.8,
    branches: 1,
    bird: ["perch", 2.6],
    crab: null,
  },
  "ti-kannot-e-gwo-rako": {
    ...BASE,
    shot: { focus: "perch", azimuth: 35, elevation: 18, distance: 16 },
    sky: ["#8fd3e6", "#fbeed2"],
    sun: [-30, 40, "#fff3d6", 1.4],
    mist: 0.2,
    branches: 1,
    bird: ["perch", 2.6],
    crab: "ford",
  },
  "on-lide-gwo-rako": {
    ...BASE,
    shot: { focus: "yard", azimuth: 60, elevation: 20, distance: 14 },
    sky: ["#4b5d8a", "#f2a46a"],
    sun: [80, 6, "#ff9a5a", 1.1],
    night: 0.25,
    water: -0.15,
    kalbas: 20,
    branches: 1,
    bird: ["roof", 2.9],
    crab: "yard",
  },
  "larivye-la-ka-desann": {
    ...BASE,
    shot: { focus: "bank", azimuth: 10, elevation: 30, distance: 18 },
    sky: ["#bfe0e6", "#fff4dc"],
    sun: [10, 70, "#fffbe8", 1.9],
    water: -0.85,
    wilt: 0.4,
    kalbas: 50,
    branches: 1,
    bird: ["bank", 0.5],
    crab: "ford",
  },
  "sa-ti-kannot-jwenn": {
    ...BASE,
    shot: { focus: "spring", azimuth: -20, elevation: 16, distance: 12 },
    sky: ["#9bd6c8", "#e8f2d0"],
    sun: [-40, 35, "#f4ffd8", 1.3],
    mist: 0.5,
    water: -1,
    wilt: 0.4,
    kalbas: 50,
    helpers: 1,
    bird: ["rock", 1.8],
    crab: null,
  },
  "gwo-rako-vle-sous-la": {
    ...BASE,
    shot: { focus: "spring", azimuth: 25, elevation: 22, distance: 13 },
    sky: ["#a9b8bf", "#dfe2da"],
    sun: [30, 40, "#f0f0e8", 1],
    water: -1.05,
    wilt: 0.5,
    kalbas: 50,
    dam: 1,
    bird: ["rock", 1.8],
    crab: "spring",
  },
  "on-mache": {
    ...BASE,
    shot: { focus: "bank", azimuth: -35, elevation: 12, distance: 14 },
    sky: ["#0d1a3a", "#3a4f7a"],
    sun: [150, 30, "#bcd0ff", 0.5],
    night: 1,
    water: -1.1,
    wilt: 0.5,
    kalbas: 50,
    dam: 1,
    bird: ["bank", 0.5],
    crab: "ford",
  },
  "demen-maten": {
    ...BASE,
    shot: { focus: "yard", azimuth: 70, elevation: 32, distance: 17 },
    sky: ["#cfe3e0", "#ffe7b8"],
    sun: [40, 55, "#fff0c8", 1.8],
    water: -1.35,
    wilt: 0.8,
    kalbas: 50,
    barrels: 8,
    jars: 10,
    dam: 1,
    bird: ["roof", 2.9],
    crab: "yard",
  },
  "sa-dlo-la-ka-aprann": {
    ...BASE,
    shot: { focus: "spring", azimuth: 0, elevation: 26, distance: 16 },
    sky: ["#a6dccf", "#f1f5dc"],
    sun: [-20, 45, "#f8ffe0", 1.4],
    water: -0.9,
    wilt: 0.5,
    kalbas: 50,
    barrels: 8,
    jars: 10,
    helpers: 1,
    bird: ["rock", 1.8],
    crab: "spring",
  },
  "denye-leson-la": {
    ...BASE,
    shot: { focus: "yard", azimuth: 45, elevation: 24, distance: 18 },
    sky: ["#e6e8d8", "#fff6d0"],
    sun: [0, 78, "#ffffff", 2.1],
    water: -1,
    wilt: 0.7,
    kalbas: 50,
    barrels: 8,
    jars: 10,
    empty: 1,
    bird: ["roof", 2.9],
    crab: "yard",
  },
  "on-nouvo-rezev": {
    ...BASE,
    shot: { focus: "tank", azimuth: -40, elevation: 20, distance: 14 },
    sky: ["#93d0e4", "#fde9cf"],
    sun: [-70, 30, "#ffe2b0", 1.3],
    water: -0.4,
    wilt: 0.2,
    tank: 1,
    bird: ["tank", 2.3],
    crab: "tap",
  },
  "ye-mistrikrik": {
    ...BASE,
    shot: { focus: "island", azimuth: -10, elevation: 24, distance: 44 },
    sky: ["#8aa3b3", "#d7e4e4"],
    sun: [-50, 25, "#fff4e0", 1],
    mist: 0.4,
    water: 0.25,
    rain: 1,
    rainbow: 1,
    tank: 1,
    bird: ["perch", 2.6],
    crab: "tap",
  },
};
```

- [ ] **Step 4: Rewrite `env.ts`**

```ts
// src/books/ti-kannot/world/env.ts
import * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";
import type { PageEnv, Shot } from "../staging";
import { spotPoint, type Spot } from "./island/spots";
import { islandHeight } from "./island/terrain";

const WEIGHTS = [
  "night",
  "mist",
  "water",
  "rain",
  "rainbow",
  "wilt",
  "empty",
  "branches",
  "dam",
  "tank",
  "helpers",
] as const;
type Weight = (typeof WEIGHTS)[number];

export interface MixedShot {
  focus: THREE.Vector3;
  azimuth: number;
  elevation: number;
  distance: number;
}

export interface MixedEnv extends Record<Weight, number> {
  shot: MixedShot;
  zenith: THREE.Color;
  horizon: THREE.Color;
  sunAzimuth: number;
  sunElevation: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  kalbas: number;
  barrels: number;
  jars: number;
  bird: { spot: Spot; lift: number };
  crab: Spot | null;
  /** Page whose characters apply (switches at mid-way). */
  anchorPage: number;
}

const ISLAND_FOCUS = new THREE.Vector3(0, 2, 0);
const PORTRAIT_PULLBACK = 1.25;
const CAMERA_CLEARANCE = 1.2;
const b = new THREE.Vector3();

/** Pages around a fractional page: the two to blend and the eased blend factor. */
export function pageSpan(count: number, pageF: number): { i0: number; i1: number; f: number } {
  const last = count - 1;
  const i0 = Math.floor(clamp(pageF, 0, last));
  const i1 = Math.min(i0 + 1, last);
  return { i0, i1, f: i0 === i1 ? 0 : smoothstep(clamp(pageF - i0, 0, 1)) };
}

/** Interpolates two angles in degrees along the shortest arc. */
export function lerpAngle(from: number, to: number, f: number): number {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta * f;
}

/** Point a shot looks at: the island centre or one metre above a spot. */
function focusPoint(focus: Shot["focus"], out: THREE.Vector3): THREE.Vector3 {
  if (focus === "island") return out.copy(ISLAND_FOCUS);
  spotPoint(focus, out);
  return out.setY(out.y + 1);
}

/** Interpolated staging between pages `i0` and `i1` at blend `f`. */
export function mixEnv(envs: PageEnv[], i0: number, i1: number, f: number): MixedEnv {
  const pa = envs[i0];
  const pb = envs[i1];
  const num = (va: number, vb: number): number => lerp(va, vb, f);
  const col = (ca: string, cb: string): THREE.Color =>
    new THREE.Color(ca).lerp(new THREE.Color(cb), f);
  const anchorPage = f < 0.5 ? i0 : i1;
  const anchor = envs[anchorPage];
  const weights = Object.fromEntries(WEIGHTS.map((k) => [k, num(pa[k], pb[k])])) as Record<
    Weight,
    number
  >;
  return {
    ...weights,
    shot: {
      focus: focusPoint(pa.shot.focus, new THREE.Vector3()).lerp(focusPoint(pb.shot.focus, b), f),
      azimuth: lerpAngle(pa.shot.azimuth, pb.shot.azimuth, f),
      elevation: num(pa.shot.elevation, pb.shot.elevation),
      distance: num(pa.shot.distance, pb.shot.distance),
    },
    zenith: col(pa.sky[0], pb.sky[0]),
    horizon: col(pa.sky[1], pb.sky[1]),
    sunAzimuth: lerpAngle(pa.sun[0], pb.sun[0], f),
    sunElevation: num(pa.sun[1], pb.sun[1]),
    sunColor: col(pa.sun[2], pb.sun[2]),
    sunIntensity: num(pa.sun[3], pb.sun[3]),
    kalbas: Math.round(num(pa.kalbas, pb.kalbas)),
    barrels: Math.round(num(pa.barrels, pb.barrels)),
    jars: Math.round(num(pa.jars, pb.jars)),
    bird: { spot: anchor.bird[0], lift: anchor.bird[1] },
    crab: anchor.crab,
    anchorPage,
  };
}

/** Unit vector for an azimuth/elevation pair in degrees (0° azimuth = towards +z). */
function orbit(azimuth: number, elevation: number, out: THREE.Vector3): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
}

/** Camera position and look-at for a shot; portrait screens step back, never under the ground. */
export function shotCamera(
  shot: MixedShot,
  aspect: number,
  out: THREE.Vector3,
  look: THREE.Vector3,
): void {
  const distance = shot.distance * (aspect < 1 ? PORTRAIT_PULLBACK : 1);
  look.copy(shot.focus);
  orbit(shot.azimuth, shot.elevation, out).multiplyScalar(distance).add(shot.focus);
  out.y = Math.max(out.y, islandHeight(out.x, out.z) + CAMERA_CLEARANCE);
}

/** Direction towards the sun (or moon) of a mixed env. */
export function sunDirection(env: MixedEnv, out: THREE.Vector3): THREE.Vector3 {
  return orbit(env.sunAzimuth, env.sunElevation, out);
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm vitest run src/books/ti-kannot/staging.test.ts src/books/ti-kannot/world/env.test.ts src/books/ti-kannot/world/island`

- [ ] **Step 6: Note** — the old `world/index.ts`, `characters.ts`, `props.ts`, `water.ts`, `sky.ts`
      now fail to typecheck against the new `PageEnv`/`MixedEnv`. That is expected until Task 10; keep
      running the targeted vitest commands, not `pnpm typecheck`, until then.

- [ ] **Step 7: Checkpoint** — `feat(ti-kannot): stage the twelve pages on the island`

---

### Task 4: Ground, sea and river

**Files:**

- Create: `src/books/ti-kannot/world/island/ground.ts`
- Rewrite: `src/books/ti-kannot/world/water.ts`

**Interfaces:**

- Consumes: `islandHeight`, `riverDistance`, `riverPoint`, `ISLAND_RADIUS` (Task 2); `MixedEnv`,
  `sunDirection` (Task 3).
- Produces: `createGround(rng: Rng): { mesh: THREE.Mesh; update(env: MixedEnv): void }`;
  `createWater(): { group: THREE.Group; update(env: MixedEnv, time: number, camera: THREE.Vector3): void }`.

- [ ] **Step 1: Implement the ground**

```ts
// src/books/ti-kannot/world/island/ground.ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { islandHeight, riverDistance } from "./terrain";

const SIZE = 64;
const SEGMENTS = 128;
const PALETTE = {
  bed: new THREE.Color("#b8a47c"),
  sand: new THREE.Color("#efdcaa"),
  lush: new THREE.Color("#7cc46a"),
  grass: new THREE.Color("#9ccc6c"),
  forest: new THREE.Color("#4f9459"),
  high: new THREE.Color("#5d7f5a"),
  rock: new THREE.Color("#9a8f84"),
};
const DRY = new THREE.Color("#e8d39a");
const WHITE = new THREE.Color("#ffffff");

/** Paint colour of a ground face from its height, steepness (normal y) and river distance. */
function faceColor(h: number, up: number, toRiver: number): THREE.Color {
  if (toRiver < 0.9 && h < 6) return PALETTE.bed;
  if (h < 0.9) return PALETTE.sand;
  if (up < 0.72) return PALETTE.rock;
  if (h > 6) return PALETTE.high;
  if (h > 2.6) return PALETTE.forest;
  if (toRiver < 1.8) return PALETTE.lush;
  return PALETTE.grass;
}

/** Flat-shaded island ground; the drought tints it towards dry straw. */
export function createGround(rng: Rng): { mesh: THREE.Mesh; update(env: MixedEnv): void } {
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    .rotateX(-Math.PI / 2)
    .toNonIndexed();
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) pos.setY(i, islandHeight(pos.getX(i), pos.getZ(i)));
  const colors = new Float32Array(pos.count * 3);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    va.fromBufferAttribute(pos, i);
    vb.fromBufferAttribute(pos, i + 1);
    vc.fromBufferAttribute(pos, i + 2);
    normal.subVectors(vc, vb).cross(va.clone().sub(vb)).normalize();
    const cx = (va.x + vb.x + vc.x) / 3;
    const cz = (va.z + vb.z + vc.z) / 3;
    const h = (va.y + vb.y + vc.y) / 3;
    tint.copy(faceColor(h, Math.abs(normal.y), riverDistance(cx, cz)));
    tint.offsetHSL(0, 0, (rng() - 0.5) * 0.05);
    for (let k = 0; k < 3; k++) tint.toArray(colors, (i + k) * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  return {
    mesh: new THREE.Mesh(geometry, material),
    update(env) {
      material.color.copy(WHITE).lerp(DRY, env.wilt * 0.55);
    },
  };
}
```

> `riverDistance` per face (~33k faces × 200 samples ≈ 6.6M distance checks) runs once at mount,
> ~30–60 ms. If the mount feels slow, measure before optimising.

- [ ] **Step 2: Rewrite `water.ts`**

```ts
// src/books/ti-kannot/world/water.ts
import * as THREE from "three";
import { clamp } from "@shared/math";
import { sunDirection, type MixedEnv } from "./env";
import { ISLAND_RADIUS, islandHeight, riverPoint } from "./island/terrain";

const NOISE = `float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }`;

const SEA_VERTEX = `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const SEA_FRAGMENT = `uniform float uTime,uRadius; uniform vec3 cShallow,cDeep,cHorizon,cSun,uCam,uSunDir; varying vec3 vW;
  ${NOISE}
  void main(){
    float r=length(vW.xz*vec2(1.,1.1))/uRadius;
    float n=noise(vW.xz*.35+vec2(uTime*.05,uTime*.03))+.5*noise(vW.xz*1.3-uTime*.08);
    vec3 c=mix(cDeep,cShallow,smoothstep(1.6,.85,r));
    c=mix(c,vec3(1.),smoothstep(.07,0.,abs(r-.87-n*.04))*.75);
    c+=cShallow*smoothstep(1.,1.3,n)*.2;
    vec3 v=normalize(uCam-vW); vec3 h=normalize(v+uSunDir);
    c+=cSun*pow(max(h.y,0.),400.)*(.4+n);
    c=mix(c,cHorizon,pow(1.-max(v.y,0.),4.)*.7);
    c=mix(c,cHorizon,smoothstep(60.,220.,length(vW.xz-uCam.xz)));
    gl_FragColor=vec4(c,1.); }`;

const RIVER_VERTEX = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RIVER_FRAGMENT = `uniform float uTime; uniform vec3 cWater; varying vec2 vUv;
  void main(){ float s=abs(vUv.x-.5)*2.; vec3 c=mix(cWater*1.2,cWater,s);
    float flow=sin(vUv.y*220.-uTime*3.+sin(vUv.x*9.+vUv.y*40.)*1.5);
    c=mix(c,vec3(1.),smoothstep(.85,1.,flow)*.35); gl_FragColor=vec4(c,.9); }`;

const SEGMENTS = 120;
const SHALLOW = new THREE.Color("#7fdccc");
const DEEP = new THREE.Color("#2f9fa6");
const RIVER = new THREE.Color("#79d3cf");
const MUDDY = new THREE.Color("#a7b48a");

/** Sea around the island and the river ribbon whose width and level follow `env.water`. */
export function createWater(): {
  group: THREE.Group;
  update(env: MixedEnv, time: number, camera: THREE.Vector3): void;
} {
  const seaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: ISLAND_RADIUS },
      cShallow: { value: SHALLOW.clone() },
      cDeep: { value: DEEP.clone() },
      cHorizon: { value: new THREE.Color() },
      cSun: { value: new THREE.Color() },
      uCam: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    },
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500).rotateX(-Math.PI / 2), seaMaterial);

  const riverGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array((SEGMENTS + 1) * 2 * 3);
  const uvs = new Float32Array((SEGMENTS + 1) * 2 * 2);
  const index: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    uvs.set([0, i / SEGMENTS, 1, i / SEGMENTS], i * 4);
    if (i < SEGMENTS) {
      const k = i * 2;
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  riverGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  riverGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  riverGeometry.setIndex(index);
  const riverMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, cWater: { value: RIVER.clone() } },
    vertexShader: RIVER_VERTEX,
    fragmentShader: RIVER_FRAGMENT,
    transparent: true,
  });
  const river = new THREE.Mesh(riverGeometry, riverMaterial);
  river.frustumCulled = false;

  const p = new THREE.Vector2();
  const q = new THREE.Vector2();
  let lastWater = NaN;

  /** Rebuilds the ribbon for a water level: narrower and lower as the river dries. */
  const shape = (water: number): void => {
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      riverPoint(t, p);
      riverPoint(Math.min(1, t + 0.005), q);
      if (t >= 0.995)
        riverPoint(t - 0.005, q)
          .sub(p)
          .negate()
          .add(p);
      q.sub(p).normalize();
      const half = ((1.5 + t * 1.2) / 2) * clamp(1 + water * 0.55, 0.22, 1.2);
      const y = Math.max(islandHeight(p.x, p.y) + 0.55 + water * 0.35, 0.02);
      positions.set(
        [p.x + q.y * half, y, p.y - q.x * half, p.x - q.y * half, y, p.y + q.x * half],
        i * 6,
      );
    }
    riverGeometry.getAttribute("position").needsUpdate = true;
  };

  const group = new THREE.Group();
  group.add(sea, river);
  const u = seaMaterial.uniforms;
  return {
    group,
    update(env, time, camera) {
      if (Math.abs(env.water - lastWater) > 0.004) {
        lastWater = env.water;
        shape(env.water);
      }
      u.uTime.value = time;
      u.uCam.value.copy(camera);
      u.cHorizon.value.copy(env.horizon);
      u.cSun.value.copy(env.sunColor).multiplyScalar(1 - env.night * 0.6);
      sunDirection(env, u.uSunDir.value);
      u.cShallow.value.copy(SHALLOW).lerp(env.horizon, env.night * 0.5);
      u.cDeep.value.copy(DEEP).lerp(env.zenith, env.night * 0.6);
      riverMaterial.uniforms.uTime.value = time;
      riverMaterial.uniforms.cWater.value.copy(RIVER).lerp(MUDDY, clamp(-env.water, 0, 1) * 0.5);
    },
  };
}
```

- [ ] **Step 3: Verify it compiles in isolation**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep -E "island/ground|world/water" || echo "ground/water OK"`
Expected: `ground/water OK` (errors from the old index/characters/props are expected until Task 10).

- [ ] **Step 4: Checkpoint** — `feat(ti-kannot): add the island ground, sea and river`

---

### Task 5: Sky, light and atmosphere

**Files:**

- Rewrite: `src/books/ti-kannot/world/sky.ts`

**Interfaces:**

- Consumes: `MixedEnv`, `sunDirection` (Task 3); `glowPoints` (`@shared/three/glow-points`);
  `softSprite` (`@shared/three/soft-sprite`).
- Produces: `createSky(rng: Rng): { group: THREE.Group; fog: THREE.Fog; update(env: MixedEnv, time: number, camera: THREE.Vector3): void }`
  — the group contains the hemisphere and sun lights.

- [ ] **Step 1: Rewrite `sky.ts`**

```ts
// src/books/ti-kannot/world/sky.ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import { sunDirection, type MixedEnv } from "./env";

const DOME_VERTEX = `varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const DOME_FRAGMENT = `uniform vec3 cZenith,cHorizon,cSun,uSunDir; uniform float uNight,uCloud,uTime; varying vec3 vD;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
  void main(){ vec3 d=normalize(vD); float h=clamp(d.y,0.,1.);
    vec3 c=mix(cHorizon,cZenith,pow(h,.55));
    float s=max(dot(d,uSunDir),0.); c+=cSun*(pow(s,600.)*1.5+pow(s,12.)*.35);
    vec2 p=d.xz/(d.y+.25);
    float cl=smoothstep(.45,.85,fbm(p*1.6+vec2(uTime*.01,0.)))*smoothstep(0.,.25,d.y);
    c=mix(c,mix(vec3(1.,.98,.95),cHorizon*.8,uCloud*.6),cl*(.55+uCloud*.4));
    vec2 g=floor(d.xz/max(d.y,.05)*60.);
    c+=step(.992,hash(g))*smoothstep(.05,.3,d.y)*uNight*(1.-cl);
    gl_FragColor=vec4(c,1.); }`;

const RAINBOW_VERTEX = `varying float vR; void main(){ vR=length(position.xy); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RAINBOW_FRAGMENT = `uniform float uOpacity; varying float vR;
  void main(){ float t=clamp((vR-34.)/4.,0.,1.);
    vec3 c=clamp(abs(mod((1.-t)*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
    gl_FragColor=vec4(c*.9,smoothstep(0.,.15,t)*smoothstep(1.,.85,t)*uOpacity); }`;

const ISLET_TINT = new THREE.Color("#5f9a86");
const GROUND_LIGHT = new THREE.Color("#6a8f5a");
const NIGHT_GROUND = new THREE.Color("#1d2b45");

/** Painted sky dome, sun light, far islets, rain, fireflies, low mist and the final rainbow. */
export function createSky(rng: Rng): {
  group: THREE.Group;
  fog: THREE.Fog;
  update(env: MixedEnv, time: number, camera: THREE.Vector3): void;
} {
  const domeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      cZenith: { value: new THREE.Color() },
      cHorizon: { value: new THREE.Color() },
      cSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uNight: { value: 0 },
      uCloud: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: DOME_VERTEX,
    fragmentShader: DOME_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), domeMaterial);

  const isletMaterial = new THREE.MeshBasicMaterial({ color: ISLET_TINT });
  const isletGeometry = new THREE.IcosahedronGeometry(1, 0);
  const islets = new THREE.InstancedMesh(isletGeometry, isletMaterial, 7);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < islets.count; i++) {
    const angle = (i / islets.count) * Math.PI * 2 + rng() * 0.5;
    const r = 110 + rng() * 40;
    const size = 14 + rng() * 14;
    m4.compose(
      new THREE.Vector3(Math.sin(angle) * r, -2, Math.cos(angle) * r),
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6),
      new THREE.Vector3(size * 1.6, size * (0.35 + rng() * 0.3), size),
    );
    islets.setMatrixAt(i, m4);
  }

  const rain = glowPoints(rng, 2200, () => [(rng() - 0.5) * 50, rng() * 20, (rng() - 0.5) * 50], {
    size: 0.5,
    a: "#e6f2f7",
    b: "#ffffff",
    rain: true,
    fall: 14,
  });
  const fireflies = glowPoints(
    rng,
    260,
    () => [(rng() - 0.5) * 26, 0.8 + rng() * 3, (rng() - 0.5) * 28],
    { size: 0.25, drift: 0.8, a: "#fff2a0", b: "#c8ff9a" },
  );
  const mists = Array.from({ length: 10 }, () => {
    const sprite = softSprite("#ffffff", 14 + rng() * 10, 0, false);
    const angle = rng() * Math.PI * 2;
    sprite.position.set(Math.sin(angle) * 14, 1 + rng() * 2, Math.cos(angle) * 14);
    return { sprite, phase: rng() * 6.28 };
  });

  const rainbowMaterial = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: RAINBOW_VERTEX,
    fragmentShader: RAINBOW_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const rainbow = new THREE.Mesh(
    new THREE.RingGeometry(34, 38, 96, 1, 0, Math.PI),
    rainbowMaterial,
  );
  rainbow.position.set(0, -4, -70);

  const hemi = new THREE.HemisphereLight("#bfe6ff", GROUND_LIGHT, 0.9);
  const sun = new THREE.DirectionalLight("#ffffff", 1.4);
  const fog = new THREE.Fog("#f6d9c0", 70, 240);
  const dir = new THREE.Vector3();

  const group = new THREE.Group();
  group.add(
    dome,
    islets,
    rain,
    fireflies,
    rainbow,
    hemi,
    sun,
    sun.target,
    ...mists.map((m) => m.sprite),
  );
  const u = domeMaterial.uniforms;
  return {
    group,
    fog,
    update(env, time, camera) {
      sunDirection(env, dir);
      u.cZenith.value.copy(env.zenith);
      u.cHorizon.value.copy(env.horizon);
      u.cSun.value.copy(env.sunColor);
      u.uSunDir.value.copy(dir);
      u.uNight.value = env.night;
      u.uCloud.value = 0.25 + env.rain * 0.75;
      u.uTime.value = time;
      dome.position.copy(camera);
      fog.color.copy(env.horizon);
      isletMaterial.color.copy(ISLET_TINT).lerp(env.horizon, 0.45);
      sun.color.copy(env.sunColor);
      sun.intensity = env.sunIntensity * (1 - env.rain * 0.4);
      sun.position.copy(env.shot.focus).addScaledVector(dir, 50);
      sun.target.position.copy(env.shot.focus);
      hemi.color.copy(env.zenith);
      hemi.groundColor.copy(GROUND_LIGHT).lerp(NIGHT_GROUND, env.night);
      hemi.intensity = 0.6 + (1 - env.night) * 0.4;
      rain.position.set(env.shot.focus.x, 0, env.shot.focus.z);
      rain.material.uniforms.uTime.value = time;
      rain.material.uniforms.uOpacity.value = env.rain * 0.7;
      fireflies.material.uniforms.uTime.value = time;
      fireflies.material.uniforms.uOpacity.value = env.night;
      rainbowMaterial.uniforms.uOpacity.value = env.rainbow * 0.45;
      for (const { sprite, phase } of mists) {
        sprite.material.opacity = env.mist * (0.28 + Math.sin(time * 0.3 + phase) * 0.06);
        sprite.position.y = 1.5 + Math.sin(time * 0.2 + phase) * 0.4;
      }
    },
  };
}
```

- [ ] **Step 2: Verify** — `pnpm exec tsc --noEmit -p . 2>&1 | grep "world/sky" || echo "sky OK"`

- [ ] **Step 3: Checkpoint** — `feat(ti-kannot): paint the island sky, light and weather`

---

### Task 6: Vegetation, village, source and stock

**Files:**

- Create: `src/books/ti-kannot/world/island/vegetation.ts`, `village.ts`, `source.ts`
- Create: `src/books/ti-kannot/world/stock.ts`, `stock.test.ts`

**Interfaces:**

- Consumes: terrain + spots (Task 2), `MixedEnv` (Task 3).
- Produces: `createVegetation(rng): { group; update(env) }`, `createVillage(rng): { group; update(env) }`,
  `createSource(rng): { group; update(env, time) }`, `MAX_STOCK`, `pileSlot(i, cols, rows)`,
  `createStock(rng): { group; update(env) }`.

- [ ] **Step 1: Write the failing stock test**

```ts
// src/books/ti-kannot/world/stock.test.ts
import { describe, expect, it } from "vitest";
import { MAX_STOCK, pileSlot } from "./stock";

describe("pileSlot", () => {
  it("fills rows, then rows of the next layer", () => {
    expect(pileSlot(0, 10, 3)).toEqual([0, 0, 0]);
    expect(pileSlot(12, 10, 3)).toEqual([2, 0, 1]);
    expect(pileSlot(31, 10, 3)).toEqual([1, 1, 0]);
  });

  it("stacks the biggest pile on two layers at most", () => {
    expect(pileSlot(MAX_STOCK.kalbas - 1, 10, 3)[1]).toBeLessThanOrEqual(1);
  });
});
```

Run: `pnpm vitest run src/books/ti-kannot/world/stock.test.ts` — expect FAIL.

- [ ] **Step 2: Implement `stock.ts`**

```ts
// src/books/ti-kannot/world/stock.ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "./env";
import { STOCK } from "./island/spots";
import { islandHeight } from "./island/terrain";

export const MAX_STOCK = { kalbas: 50, barrels: 8, jars: 10 } as const;

/** Slot of the i-th item of a pile: [column, layer, row], rows of `cols`, layers of cols × rows. */
export function pileSlot(i: number, cols: number, rows: number): [number, number, number] {
  const perLayer = cols * rows;
  const k = i % perLayer;
  return [k % cols, Math.floor(i / perLayer), Math.floor(k / cols)];
}

const PALE = new THREE.Color("#c9bfa9");
const KINDS = [
  {
    key: "kalbas",
    geometry: new THREE.SphereGeometry(0.3, 7, 5).scale(1, 1.15, 1),
    color: "#c99f55",
    cols: 10,
    rows: 3,
    gap: 0.62,
    height: 0.55,
    origin: [0, 0],
  },
  {
    key: "barrels",
    geometry: new THREE.CylinderGeometry(0.32, 0.32, 0.75, 8),
    color: "#8a5a36",
    cols: 4,
    rows: 2,
    gap: 0.75,
    height: 0.75,
    origin: [6.4, 0.2],
  },
  {
    key: "jars",
    geometry: new THREE.CylinderGeometry(0.18, 0.32, 0.75, 7),
    color: "#c26b43",
    cols: 5,
    rows: 2,
    gap: 0.7,
    height: 0.75,
    origin: [-3.6, 0.2],
  },
] as const;

/** Gwo Rako's hoard behind his house: calabashes, barrels and jars; pale and tipped when empty. */
export function createStock(rng: Rng): { group: THREE.Group; update(env: MixedEnv): void } {
  const group = new THREE.Group();
  const piles = KINDS.map((kind) => {
    const material = new THREE.MeshLambertMaterial({ color: kind.color, flatShading: true });
    const max = MAX_STOCK[kind.key];
    const mesh = new THREE.InstancedMesh(kind.geometry, material, max);
    mesh.count = 0;
    const jitter = Array.from({ length: max }, () => [rng() - 0.5, rng() - 0.5, rng() * 6.28]);
    group.add(mesh);
    return { kind, material, mesh, jitter, base: new THREE.Color(kind.color) };
  });
  const m4 = new THREE.Matrix4();
  const at = new THREE.Vector3();
  const rot = new THREE.Euler();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  let key = "";
  return {
    group,
    update(env) {
      const next = `${env.kalbas}/${env.barrels}/${env.jars}/${Math.round(env.empty * 20)}`;
      if (next === key) return;
      key = next;
      for (const { kind, material, mesh, jitter, base } of piles) {
        mesh.count = env[kind.key];
        material.color.copy(base).lerp(PALE, env.empty * 0.7);
        for (let i = 0; i < mesh.count; i++) {
          const [col, layer, row] = pileSlot(i, kind.cols, kind.rows);
          const [jx, jz, yaw] = jitter[i];
          const x = STOCK[0] + kind.origin[0] + (col - kind.cols / 2) * kind.gap + jx * 0.12;
          const z = STOCK[1] + kind.origin[1] - row * kind.gap + jz * 0.12;
          const tip = env.empty * 1.3 * (jx > 0 ? 1 : -1) * (layer === 0 ? 1 : 0.4);
          at.set(x, islandHeight(x, z) + kind.height / 2 + layer * kind.height * 0.9, z);
          m4.compose(at, q.setFromEuler(rot.set(0, yaw, tip)), one);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
```

Run the stock test — expect PASS. Then switch `staging.test.ts` to import `MAX_STOCK` if it was
inlined, and rerun it.

- [ ] **Step 3: Implement `vegetation.ts`**

```ts
// src/books/ti-kannot/world/island/vegetation.ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { HOUSE, SPOTS, VILLAGE } from "./spots";
import { islandHeight, riverDistance } from "./terrain";

interface Part {
  geometry: THREE.BufferGeometry;
  color: string;
  dry?: string;
}

/** Flat-shaded Lambert material in the island's palette. */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

const TRUNK = "#8a5a3b";
const SPECIES: Record<string, Part[]> = {
  palm: [
    { geometry: new THREE.CylinderGeometry(0.12, 0.2, 3.2, 5).translate(0, 1.6, 0), color: TRUNK },
    {
      geometry: new THREE.IcosahedronGeometry(1, 0).scale(1.5, 0.35, 1.5).translate(0, 3.3, 0),
      color: "#5fae5a",
      dry: "#b5ad5c",
    },
  ],
  flamboyant: [
    { geometry: new THREE.CylinderGeometry(0.18, 0.28, 1.8, 6).translate(0, 0.9, 0), color: TRUNK },
    {
      geometry: new THREE.IcosahedronGeometry(1.3, 0).scale(1.5, 0.45, 1.5).translate(0, 2, 0),
      color: "#4f9a52",
      dry: "#a39a55",
    },
    {
      geometry: new THREE.IcosahedronGeometry(1.4, 0).scale(1.6, 0.5, 1.6).translate(0, 2.4, 0),
      color: "#e0523a",
      dry: "#b8664a",
    },
  ],
  forest: [
    { geometry: new THREE.CylinderGeometry(0.2, 0.3, 2, 6).translate(0, 1, 0), color: TRUNK },
    {
      geometry: new THREE.IcosahedronGeometry(1.3, 0).scale(1, 1.15, 1).translate(0, 2.6, 0),
      color: "#3f8a4f",
      dry: "#8f8a4c",
    },
    {
      geometry: new THREE.IcosahedronGeometry(0.9, 0).translate(0, 3.6, 0),
      color: "#4f9e58",
      dry: "#a09a52",
    },
  ],
  banana: [
    {
      geometry: new THREE.CylinderGeometry(0.1, 0.14, 1.1, 5).translate(0, 0.55, 0),
      color: "#8fae5a",
    },
    {
      geometry: new THREE.ConeGeometry(0.9, 0.9, 5, 1, true).rotateX(Math.PI).translate(0, 1.4, 0),
      color: "#9ed36a",
      dry: "#c9c070",
    },
  ],
  grass: [
    {
      geometry: new THREE.ConeGeometry(0.12, 0.55, 3).translate(0, 0.27, 0),
      color: "#86c25e",
      dry: "#d2c27a",
    },
  ],
  reed: [
    {
      geometry: new THREE.CylinderGeometry(0.03, 0.03, 1.2, 3).translate(0, 0.6, 0),
      color: "#6f9d4f",
    },
  ],
  rock: [{ geometry: new THREE.DodecahedronGeometry(0.6, 0), color: "#a39b90" }],
};

const CLEAR: readonly (readonly [readonly [number, number], number])[] = [
  [HOUSE, 4.5],
  [VILLAGE, 6],
  [SPOTS.tank, 3],
  [SPOTS.spring, 2.5],
  [SPOTS.rock, 2.5],
  [SPOTS.perch, 3],
  [SPOTS.yard, 2.5],
];

/** True when (x, z) is away from every building and staged spot. */
const isClear = (x: number, z: number): boolean =>
  CLEAR.every(([[cx, cz], r]) => (x - cx) ** 2 + (z - cz) ** 2 > r * r);

/** Up to `count` random points on the island accepted by `accept(x, z, height, toRiver)`. */
function scatter(
  rng: Rng,
  count: number,
  accept: (x: number, z: number, h: number, toRiver: number) => boolean,
): [number, number][] {
  const out: [number, number][] = [];
  for (let tries = 0; tries < count * 40 && out.length < count; tries++) {
    const x = (rng() - 0.5) * 46;
    const z = (rng() - 0.5) * 46;
    if (accept(x, z, islandHeight(x, z), riverDistance(x, z))) out.push([x, z]);
  }
  return out;
}

/** Palms, flamboyants (Ti Kannot's tree first), forest, bananas, grass, reeds and rocks. */
export function createVegetation(rng: Rng): { group: THREE.Group; update(env: MixedEnv): void } {
  const places: Record<string, [number, number][]> = {
    flamboyant: [
      [SPOTS.perch[0] - 0.6, SPOTS.perch[1] - 0.4],
      ...scatter(rng, 6, (x, z, h, d) => h > 1 && h < 3 && d > 2 && isClear(x, z)),
    ],
    palm: scatter(rng, 22, (x, z, h, d) => h > 0.3 && h < 1.6 && d > 1.6 && isClear(x, z)),
    forest: scatter(rng, 70, (x, z, h, d) => h > 2.6 && h < 9.5 && d > 1.8 && isClear(x, z)),
    banana: scatter(
      rng,
      14,
      (x, z, h, d) =>
        h > 1 &&
        h < 2.6 &&
        d > 1.6 &&
        isClear(x, z) &&
        Math.min(
          Math.hypot(x - HOUSE[0], z - HOUSE[1]),
          Math.hypot(x - VILLAGE[0], z - VILLAGE[1]),
        ) < 10,
    ),
    grass: scatter(rng, 500, (x, z, h, d) => h > 0.5 && h < 7 && d > 1.2 && isClear(x, z)),
    reed: scatter(
      rng,
      120,
      (_x, _z, h, d) => (h > -0.3 && h < 0.5) || (d > 0.9 && d < 1.8 && h > 0),
    ),
    rock: scatter(rng, 50, (_x, _z, h, d) => (h > -0.6 && h < 0.6) || (d > 1 && d < 1.6)),
  };
  const group = new THREE.Group();
  const tinted: { material: THREE.MeshLambertMaterial; base: THREE.Color; dry: THREE.Color }[] = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const at = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (const [name, parts] of Object.entries(SPECIES)) {
    const spots = places[name];
    const transforms = spots.map(([x, z], i) => {
      const s = name === "flamboyant" && i === 0 ? 1.25 : 0.8 + rng() * 0.45;
      return m4
        .compose(
          at.set(x, islandHeight(x, z), z),
          q.setFromAxisAngle(up, rng() * 6.28),
          scale.setScalar(s),
        )
        .clone();
    });
    for (const part of parts) {
      const material = paint(part.color);
      if (part.dry)
        tinted.push({
          material,
          base: new THREE.Color(part.color),
          dry: new THREE.Color(part.dry),
        });
      const mesh = new THREE.InstancedMesh(part.geometry, material, transforms.length);
      transforms.forEach((t, i) => mesh.setMatrixAt(i, t));
      group.add(mesh);
    }
  }
  return {
    group,
    update(env) {
      for (const { material, base, dry } of tinted) material.color.copy(base).lerp(dry, env.wilt);
    },
  };
}
```

- [ ] **Step 4: Implement `village.ts`**

```ts
// src/books/ti-kannot/world/island/village.ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { HOUSE, SPOTS, VILLAGE } from "./spots";
import { islandHeight } from "./terrain";

/** Flat-shaded Lambert material. */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

/** Mesh at a local position. */
function part(
  geometry: THREE.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, paint(color));
  mesh.position.set(x, y, z);
  return mesh;
}

/** A Creole case on a stone base: walls, tin roof, door, shutters and a small porch facing +z. */
function creoleCase(
  wall: string,
  shutter: string,
  roof: string,
  width = 2.4,
  depth = 2,
): THREE.Group {
  const house = new THREE.Group();
  const front = depth / 2 + 0.03;
  const roofGeometry = new THREE.ConeGeometry(1, 1.1, 4).rotateY(Math.PI / 4);
  roofGeometry.scale((width / 2 + 0.3) / Math.SQRT1_2, 1, (depth / 2 + 0.3) / Math.SQRT1_2);
  house.add(
    part(new THREE.BoxGeometry(width + 0.3, 1.4, depth + 0.3), "#a59d90", 0, -0.5, 0),
    part(new THREE.BoxGeometry(width, 1.5, depth), wall, 0, 0.95, 0),
    part(roofGeometry, roof, 0, 2.25, 0),
    part(new THREE.BoxGeometry(0.5, 0.95, 0.06), "#7a4a2c", 0, 0.68, front),
    part(new THREE.BoxGeometry(0.42, 0.55, 0.06), shutter, -width / 3, 1.05, front),
    part(new THREE.BoxGeometry(0.42, 0.55, 0.06), shutter, width / 3, 1.05, front),
    part(new THREE.BoxGeometry(width, 0.08, 0.8), "#b88a5c", 0, 0.22, depth / 2 + 0.4),
  );
  for (const side of [-1, 1]) {
    house.add(
      part(
        new THREE.CylinderGeometry(0.05, 0.05, 1.3, 5),
        "#f4ecd8",
        side * (width / 2 - 0.1),
        0.85,
        depth / 2 + 0.75,
      ),
    );
  }
  return house;
}

/** Places `object` on the ground at (x, z), turned by `yaw`. */
function settle(object: THREE.Object3D, x: number, z: number, yaw: number): THREE.Object3D {
  object.position.set(x, islandHeight(x, z), z);
  object.rotation.y = yaw;
  return object;
}

/** Shared reservoir: stone tank, water top and three taps; it rises from the ground with `tank`. */
function reservoir(): THREE.Group {
  const tank = new THREE.Group();
  tank.add(
    part(new THREE.CylinderGeometry(1.3, 1.4, 1.4, 10), "#b9b2a4", 0, 0.7, 0),
    part(new THREE.CylinderGeometry(1.15, 1.15, 0.05, 10), "#7fd6cf", 0, 1.42, 0),
  );
  for (const angle of [-0.5, 0, 0.5]) {
    const tap = part(
      new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6).rotateX(Math.PI / 2),
      "#c9a24a",
      0,
      0.45,
      0,
    );
    tap.position.set(Math.sin(angle) * 1.45, 0.45, Math.cos(angle) * 1.45);
    tap.rotation.y = angle;
    tank.add(tap);
  }
  return tank;
}

/** Three village cases, Gwo Rako's bigger case and the reservoir of page 11. */
export function createVillage(rng: Rng): { group: THREE.Group; update(env: MixedEnv): void } {
  const group = new THREE.Group();
  const cases: [string, string, string][] = [
    ["#f2d3a2", "#3c8fa0", "#c4553a"],
    ["#f4b7a0", "#2d7d5a", "#a8643f"],
    ["#cfe3d0", "#c8573e", "#d06a48"],
  ];
  cases.forEach(([wall, shutter, roof], i) => {
    const angle = (i / cases.length) * Math.PI * 1.2 - 0.4 + rng() * 0.2;
    const x = VILLAGE[0] + Math.sin(angle) * 3.2;
    const z = VILLAGE[1] + Math.cos(angle) * 3.2;
    group.add(
      settle(
        creoleCase(wall, shutter, roof),
        x,
        z,
        Math.atan2(VILLAGE[0] - x, VILLAGE[1] - z) + Math.PI,
      ),
    );
  });
  group.add(
    settle(creoleCase("#e8b864", "#3f8f5a", "#c0432f", 3.2, 2.6), HOUSE[0], HOUSE[1], -0.25),
  );
  const tank = reservoir();
  settle(tank, SPOTS.tank[0], SPOTS.tank[1], 0.4);
  group.add(tank);
  return {
    group,
    update(env) {
      tank.visible = env.tank > 0.01;
      tank.scale.set(1, Math.max(0.001, env.tank), 1);
    },
  };
}
```

- [ ] **Step 5: Implement `source.ts`**

```ts
// src/books/ti-kannot/world/island/source.ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "../env";
import { SPOTS } from "./spots";
import { islandHeight, riverPoint } from "./terrain";

/** Flat-shaded Lambert material. */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

/** The source behind the big rock: pool, dead branches choking it and Gwo Rako's dam. */
export function createSource(rng: Rng): {
  group: THREE.Group;
  update(env: MixedEnv, time: number): void;
} {
  const group = new THREE.Group();
  const [rx, rz] = SPOTS.rock;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.6, 0).scale(1.3, 1.1, 1),
    paint("#8f877c"),
  );
  rock.position.set(rx, islandHeight(rx, rz) + 0.8, rz);
  rock.rotation.set(0.2, 0.7, 0.1);

  const head = riverPoint(0);
  const poolMaterial = new THREE.MeshBasicMaterial({
    color: "#7fd6cf",
    transparent: true,
    opacity: 0.9,
  });
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 12).rotateX(-Math.PI / 2),
    poolMaterial,
  );
  pool.position.set(head.x, islandHeight(head.x, head.y) + 0.45, head.y);

  const branches = new THREE.Group();
  const wood = paint("#6b4a32");
  for (let i = 0; i < 9; i++) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6 + rng(), 4), wood);
    stick.position.set((rng() - 0.5) * 1.6, 0.2 + rng() * 0.3, (rng() - 0.5) * 1.6);
    stick.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.6, rng() * 6.28, (rng() - 0.5) * 0.6);
    branches.add(stick);
  }
  branches.position.copy(pool.position);

  const damAt = riverPoint(0.06);
  const ahead = riverPoint(0.07).sub(damAt);
  const dam = new THREE.Group();
  const stone = paint("#9b9284");
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), stone);
    s.position.set((i - 2) * 0.55, 0.2, 0);
    dam.add(s);
  }
  for (const y of [0.45, 0.75]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 0.12), wood);
    plank.position.y = y;
    dam.add(plank);
  }
  dam.position.set(damAt.x, islandHeight(damAt.x, damAt.y), damAt.y);
  dam.rotation.y = Math.atan2(ahead.x, ahead.y);

  group.add(rock, pool, branches, dam);
  return {
    group,
    update(env, time) {
      branches.visible = env.branches > 0.01;
      branches.scale.setScalar(Math.max(0.001, env.branches));
      dam.visible = env.dam > 0.01;
      dam.scale.set(1, Math.max(0.001, env.dam), 1);
      pool.scale.setScalar(1 - env.branches * 0.6);
      poolMaterial.opacity = 0.8 + Math.sin(time * 1.7) * 0.08;
    },
  };
}
```

- [ ] **Step 6: Verify** — `pnpm vitest run src/books/ti-kannot` (stock + staging + env + island pass)
      and `pnpm exec tsc --noEmit -p . 2>&1 | grep -E "island/|stock" || echo "OK"`.

- [ ] **Step 7: Checkpoint** — `feat(ti-kannot): grow the island's trees, village, source and hoard`

---

### Task 7: Characters

**Files:**

- Rewrite: `src/books/ti-kannot/world/characters.ts`

**Interfaces:**

- Consumes: `spotPoint`, `SPOTS` (Task 2); `islandHeight` (Task 2); `MixedEnv` (Task 3);
  `CharacterName` (`./speech`, unchanged).
- Produces: `createCharacters(): { group; snap(env); update(env, time, dt, camera: THREE.Vector3); pick(ray): CharacterName | null; anchor(name, out): { point: THREE.Vector3; visible: boolean } }`.

- [ ] **Step 1: Rewrite `characters.ts`**

```ts
// src/books/ti-kannot/world/characters.ts
import * as THREE from "three";
import { lerp, smoothstep } from "@shared/math";
import type { MixedEnv } from "./env";
import { SPOTS, spotPoint } from "./island/spots";
import { islandHeight } from "./island/terrain";
import type { CharacterName } from "./speech";

const FLIGHT_SECONDS = 1.6;

/** Flat-shaded Lambert material. */
const paint = (color: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

/** Mesh at a local position. */
function part(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Ti Kannot as a sucrier (bananaquit): dark back, yellow belly, white brow; faces local +x. */
function buildBird(): { root: THREE.Group; wings: THREE.Mesh[] } {
  const root = new THREE.Group();
  const dark = paint("#3b3940");
  const ink = paint("#151316");
  root.add(
    part(new THREE.IcosahedronGeometry(0.3, 1).scale(1.35, 0.95, 0.95), dark, 0, 0, 0),
    part(
      new THREE.IcosahedronGeometry(0.26, 1).scale(1.1, 0.75, 0.85),
      paint("#f4c21b"),
      0.06,
      -0.08,
      0,
    ),
    part(new THREE.IcosahedronGeometry(0.2, 1), dark, 0.38, 0.2, 0),
    part(new THREE.BoxGeometry(0.16, 0.035, 0.3), paint("#f7f3e8"), 0.42, 0.29, 0),
    part(new THREE.ConeGeometry(0.12, 0.4, 4).rotateZ(Math.PI / 2), dark, -0.5, 0.05, 0),
  );
  const beak = part(new THREE.ConeGeometry(0.05, 0.24, 5), paint("#2a2629"), 0.6, 0.15, 0);
  beak.rotation.z = -Math.PI / 2 - 0.35;
  root.add(beak);
  for (const side of [-1, 1]) {
    root.add(part(new THREE.SphereGeometry(0.035, 6, 6), ink, 0.5, 0.24, side * 0.13));
    root.add(
      part(
        new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4),
        paint("#5a4a3a"),
        0,
        -0.33,
        side * 0.08,
      ),
    );
  }
  const wings = [-1, 1].map((side) => {
    const wing = part(
      new THREE.BoxGeometry(0.45, 0.04, 0.26).translate(0, 0, 0.13 * side),
      dark,
      -0.02,
      0.1,
      side * 0.2,
    );
    root.add(wing);
    return wing;
  });
  root.scale.setScalar(0.9);
  return { root, wings };
}

/** Gwo Rako as a red land crab: big right claw, stalk eyes, eight legs; faces local +z. */
function buildCrab(): {
  root: THREE.Group;
  shell: THREE.Group;
  jaws: THREE.Mesh[];
  legs: THREE.Mesh[];
} {
  const root = new THREE.Group();
  const shell = new THREE.Group();
  const red = paint("#d8452f");
  shell.add(
    part(new THREE.IcosahedronGeometry(0.9, 1).scale(1.25, 0.5, 0.95), red, 0, 0.55, 0),
    part(new THREE.IcosahedronGeometry(0.8, 1).scale(1.15, 0.3, 0.85), paint("#f1dcc0"), 0, 0.4, 0),
  );
  const white = paint("#fbf6ea");
  const ink = paint("#151316");
  for (const side of [-1, 1]) {
    shell.add(
      part(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 4), red, side * 0.25, 0.95, 0.55),
    );
    shell.add(part(new THREE.SphereGeometry(0.1, 8, 6), white, side * 0.25, 1.12, 0.55));
    shell.add(part(new THREE.SphereGeometry(0.05, 6, 6), ink, side * 0.25, 1.13, 0.64));
  }
  const jaws = [-1, 1].map((side) => {
    const size = side > 0 ? 1.35 : 1;
    const arm = part(new THREE.CylinderGeometry(0.09, 0.12, 0.8, 5), red, side * 0.95, 0.5, 0.55);
    arm.rotation.set(0.9, 0, side * -0.6);
    const pincer = part(
      new THREE.IcosahedronGeometry(0.3 * size, 0).scale(1.3, 0.7, 0.8),
      red,
      side * 1.25,
      0.75,
      0.95,
    );
    const jaw = part(new THREE.BoxGeometry(0.4 * size, 0.08, 0.14), red, side * 1.25, 0.58, 1.05);
    shell.add(arm, pincer, jaw);
    return jaw;
  });
  const legs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const leg = part(
        new THREE.CylinderGeometry(0.05, 0.035, 1, 4),
        red,
        side * 1.05,
        0.35,
        0.3 - i * 0.28,
      );
      leg.rotation.z = side * 1.0;
      legs.push(leg);
      root.add(leg);
    }
  }
  root.add(shell);
  return { root, shell, jaws, legs };
}

/** The animals clearing the source: two egrets, an agouti, a turtle and a small flock. */
function buildHelpers(): { root: THREE.Group; peckers: THREE.Object3D[]; flock: THREE.Mesh[] } {
  const root = new THREE.Group();
  const white = paint("#f6f3ec");
  const peckers: THREE.Object3D[] = [];
  const animal = (dx: number, dz: number, build: (g: THREE.Group) => void): void => {
    const g = new THREE.Group();
    build(g);
    const x = SPOTS.spring[0] + dx;
    const z = SPOTS.spring[1] + dz;
    g.position.set(x, islandHeight(x, z), z);
    g.rotation.y = Math.atan2(-dx, -dz);
    peckers.push(g);
    root.add(g);
  };
  for (const [dx, dz] of [
    [1.8, 1.6],
    [-1.6, 2.2],
  ]) {
    animal(dx, dz, (g) => {
      g.add(
        part(new THREE.IcosahedronGeometry(0.25, 0).scale(0.9, 0.9, 1.4), white, 0, 0.75, 0),
        part(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4), white, 0, 1.05, 0.25),
        part(new THREE.SphereGeometry(0.1, 6, 5), white, 0, 1.3, 0.3),
        part(
          new THREE.ConeGeometry(0.03, 0.22, 4).rotateX(Math.PI / 2),
          paint("#e8b52a"),
          0,
          1.3,
          0.48,
        ),
        part(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 3), paint("#2a2629"), 0, 0.3, 0),
      );
    });
  }
  animal(2.6, -0.6, (g) => {
    g.add(
      part(new THREE.IcosahedronGeometry(0.3, 0).scale(0.9, 0.9, 1.5), paint("#9a6a3c"), 0, 0.3, 0),
      part(new THREE.SphereGeometry(0.17, 6, 5), paint("#8a5c32"), 0, 0.42, 0.42),
    );
  });
  animal(-2.4, 0.4, (g) => {
    g.add(
      part(
        new THREE.SphereGeometry(0.35, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        paint("#5f7a3a"),
        0,
        0.05,
        0,
      ),
      part(new THREE.SphereGeometry(0.1, 6, 5), paint("#8a9a5a"), 0, 0.12, 0.42),
    );
  });
  const dark = paint("#2e2b30");
  const flock = Array.from({ length: 5 }, () => {
    const bird = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4).rotateX(Math.PI / 2), dark);
    root.add(bird);
    return bird;
  });
  return { root, peckers, flock };
}

/** Ti Kannot, Gwo Rako and the helpers; the bird flies in an arc between spots. */
export function createCharacters(): {
  group: THREE.Group;
  snap(env: MixedEnv): void;
  update(env: MixedEnv, time: number, dt: number, camera: THREE.Vector3): void;
  pick(ray: THREE.Raycaster): CharacterName | null;
  anchor(name: CharacterName, out: THREE.Vector3): { point: THREE.Vector3; visible: boolean };
} {
  const bird = buildBird();
  const crab = buildCrab();
  const helpers = buildHelpers();
  const group = new THREE.Group();
  group.add(bird.root, crab.root, helpers.root);

  const birdTarget = new THREE.Vector3();
  const from = new THREE.Vector3();
  const crabTarget = new THREE.Vector3();
  const crabPos = new THREE.Vector3();
  const spring = spotPoint("spring");
  let birdKey = "";
  let flight = 1;
  let crabVisible = 0;

  /** Ground point of the bird's spot plus its lift. */
  const birdSpot = (env: MixedEnv, out: THREE.Vector3): THREE.Vector3 => {
    spotPoint(env.bird.spot, out);
    return out.setY(out.y + env.bird.lift);
  };

  return {
    group,
    snap(env) {
      birdSpot(env, birdTarget);
      bird.root.position.copy(birdTarget);
      birdKey = `${env.bird.spot}/${env.bird.lift}`;
      flight = 1;
      if (env.crab) crabPos.copy(spotPoint(env.crab, crabTarget));
      crabVisible = env.crab ? 1 : 0;
    },
    update(env, time, dt, camera) {
      const key = `${env.bird.spot}/${env.bird.lift}`;
      if (key !== birdKey) {
        birdKey = key;
        from.copy(bird.root.position);
        birdSpot(env, birdTarget);
        flight = 0;
      }
      flight = Math.min(1, flight + dt / FLIGHT_SECONDS);
      const e = smoothstep(flight);
      bird.root.position.lerpVectors(from, birdTarget, flight < 1 ? e : 1);
      bird.root.position.y += Math.sin(Math.PI * flight) * 2.5;
      const hop = Math.sin(time * 0.7) > 0.6 ? Math.max(0, Math.sin(time * 6)) * 0.06 : 0;
      bird.root.position.y += flight < 1 ? 0 : hop;
      const flap =
        flight < 1 ? Math.sin(time * 30) * 0.8 : Math.sin(time * 9) * 0.12 * (hop > 0 ? 1 : 0);
      bird.wings.forEach((w, i) => (w.rotation.x = (i === 0 ? -1 : 1) * flap));
      bird.root.rotation.y =
        Math.atan2(-(camera.z - bird.root.position.z), camera.x - bird.root.position.x) +
        0.6 +
        Math.sin(time * 0.5) * 0.15;

      if (env.crab) spotPoint(env.crab, crabTarget);
      crabVisible = lerp(crabVisible, env.crab ? 1 : 0, 1 - Math.exp(-dt * 4));
      const moving = crabPos.distanceTo(crabTarget) > 0.05;
      crabPos.lerp(crabTarget, 1 - Math.exp(-dt * 1.5));
      crab.root.position.copy(crabPos);
      crab.root.position.y = Math.max(crabPos.y, islandHeight(crabPos.x, crabPos.z));
      crab.root.scale.setScalar(Math.max(0.001, crabVisible));
      crab.root.rotation.y =
        Math.atan2(camera.x - crabPos.x, camera.z - crabPos.z) + Math.sin(time * 0.4) * 0.15;
      const stomp = env.dam > 0.5 ? Math.max(0, Math.sin(time * 5)) * 0.08 : 0;
      crab.shell.position.y = Math.abs(Math.sin(time * 3)) * 0.03 - stomp;
      crab.jaws.forEach(
        (j, i) =>
          (j.rotation.z = Math.max(0, Math.sin(time * 2.4 + i * 1.7)) * 0.4 * (i === 0 ? 1 : -1)),
      );
      crab.legs.forEach((l, i) => (l.rotation.x = Math.sin(time * (moving ? 14 : 4) + i) * 0.18));

      const h = Math.max(0.001, env.helpers);
      helpers.root.visible = env.helpers > 0.01;
      helpers.peckers.forEach((p, i) => {
        p.scale.setScalar(h);
        p.rotation.x = Math.max(0, Math.sin(time * 2 + i * 1.3)) * 0.4;
      });
      helpers.flock.forEach((b, i) => {
        const a = time * 0.8 + (i / helpers.flock.length) * Math.PI * 2;
        b.position.set(
          spring.x + Math.cos(a) * 3,
          spring.y + 3.5 + Math.sin(a * 2) * 0.3,
          spring.z + Math.sin(a) * 3,
        );
        b.rotation.y = -a;
        b.scale.setScalar(h);
      });
    },
    pick(ray) {
      let object: THREE.Object3D | null =
        ray.intersectObjects([bird.root, crab.root], true)[0]?.object ?? null;
      while (object) {
        if (object === bird.root) return "bird";
        if (object === crab.root) return "crab";
        object = object.parent;
      }
      return null;
    },
    anchor(name, out) {
      if (name === "bird")
        return {
          point: out.copy(bird.root.position).setY(bird.root.position.y + 0.6),
          visible: true,
        };
      return {
        point: out.copy(crab.root.position).setY(crab.root.position.y + 1.6),
        visible: crabVisible > 0.5,
      };
    },
  };
}
```

- [ ] **Step 2: Verify** — `pnpm exec tsc --noEmit -p . 2>&1 | grep "world/characters" || echo "characters OK"`

- [ ] **Step 3: Checkpoint** — `feat(ti-kannot): rebuild Ti Kannot, Gwo Rako and the helpers`

---

### Task 8: Watercolour pass

**Files:**

- Create: `src/books/ti-kannot/world/paint.ts`, `paint.test.ts`

**Interfaces:**

- Produces: `type PaintQuality = "high" | "low"`;
  `paintQuality(coarsePointer: boolean, pixelRatio: number): PaintQuality`;
  `createPaint(renderer, scene, camera, quality): { render(): void; update(time: number): void; dispose(): void }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/books/ti-kannot/world/paint.test.ts
import { describe, expect, it } from "vitest";
import { paintQuality } from "./paint";

describe("paintQuality", () => {
  it("keeps the full brush on desktops", () => {
    expect(paintQuality(false, 1)).toBe("high");
    expect(paintQuality(false, 2)).toBe("high");
  });

  it("lightens the pass on touch screens and very dense displays", () => {
    expect(paintQuality(true, 1)).toBe("low");
    expect(paintQuality(false, 3)).toBe("low");
  });
});
```

Run: `pnpm vitest run src/books/ti-kannot/world/paint.test.ts` — expect FAIL.

- [ ] **Step 2: Implement `paint.ts`**

```ts
// src/books/ti-kannot/world/paint.ts
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export type PaintQuality = "high" | "low";

/** Lighter pass for touch devices (phones, tablets) and displays denser than 2×. */
export function paintQuality(coarsePointer: boolean, pixelRatio: number): PaintQuality {
  return coarsePointer || pixelRatio > 2 ? "low" : "high";
}

const VERTEX = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

// Kuwahara brush, wet edges, pigment granulation, paper grain and a ragged paper vignette.
const FRAGMENT = `uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uTime; uniform vec3 uPaper; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
  vec3 kuwahara(vec2 uv){
    vec3 m0=vec3(0.),m1=vec3(0.),m2=vec3(0.),m3=vec3(0.),s0=vec3(0.),s1=vec3(0.),s2=vec3(0.),s3=vec3(0.);
    for(int j=0;j<=RADIUS;j++){ for(int i=0;i<=RADIUS;i++){
      vec2 o=vec2(float(i),float(j))*uTexel; vec3 c;
      c=texture2D(tDiffuse,uv+vec2(-o.x,-o.y)).rgb; m0+=c; s0+=c*c;
      c=texture2D(tDiffuse,uv+vec2(o.x,-o.y)).rgb; m1+=c; s1+=c*c;
      c=texture2D(tDiffuse,uv+vec2(-o.x,o.y)).rgb; m2+=c; s2+=c*c;
      c=texture2D(tDiffuse,uv+o).rgb; m3+=c; s3+=c*c; } }
    float n=float((RADIUS+1)*(RADIUS+1));
    m0/=n; m1/=n; m2/=n; m3/=n;
    vec3 v0=abs(s0/n-m0*m0), v1=abs(s1/n-m1*m1), v2=abs(s2/n-m2*m2), v3=abs(s3/n-m3*m3);
    float e0=v0.r+v0.g+v0.b, e1=v1.r+v1.g+v1.b, e2=v2.r+v2.g+v2.b, e3=v3.r+v3.g+v3.b;
    vec3 best=m0; float e=e0;
    if(e1<e){ e=e1; best=m1; } if(e2<e){ e=e2; best=m2; } if(e3<e){ best=m3; }
    return best; }
  void main(){
    vec2 aspect=vec2(uTexel.y/uTexel.x,1.);
    vec2 bleed=(vec2(fbm(vUv*6.+uTime*.02),fbm(vUv*6.+7.3))-.5)*uTexel*6.;
    vec3 c=kuwahara(vUv+bleed);
    vec3 lx=texture2D(tDiffuse,vUv+vec2(uTexel.x*2.,0.)).rgb-texture2D(tDiffuse,vUv-vec2(uTexel.x*2.,0.)).rgb;
    vec3 ly=texture2D(tDiffuse,vUv+vec2(0.,uTexel.y*2.)).rgb-texture2D(tDiffuse,vUv-vec2(0.,uTexel.y*2.)).rgb;
    float edge=clamp(length(vec2(dot(lx,vec3(.333)),dot(ly,vec3(.333))))*3.,0.,1.);
    c*=1.-edge*.35;
    c*=.9+.12*fbm(vUv*aspect*40.);
    c=mix(c,c*uPaper,.25);
    c+=(fbm(vUv*aspect*180.)-.5)*.05;
    vec2 q=(vUv-.5)*vec2(1.,.85);
    float vig=smoothstep(.62,.42-fbm(vUv*8.)*.08,length(q));
    c=mix(uPaper,c,.15+.85*vig);
    gl_FragColor=vec4(c,1.); }`;

/** Post-processing chain giving the scene its watercolour look; owns its render targets. */
export function createPaint(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  quality: PaintQuality,
): { render(): void; update(time: number): void; dispose(): void } {
  if (quality === "low") renderer.setPixelRatio(1);
  const composer = new EffectComposer(renderer);
  const watercolour = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uTime: { value: 0 },
      uPaper: { value: new THREE.Color("#f4ead6") },
    },
    defines: { RADIUS: quality === "high" ? 4 : 2 },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(watercolour);
  composer.addPass(new OutputPass());
  const size = new THREE.Vector2();
  let width = 0;
  let height = 0;
  return {
    render() {
      renderer.getSize(size);
      if (size.x !== width || size.y !== height) {
        width = size.x;
        height = size.y;
        const ratio = renderer.getPixelRatio();
        composer.setPixelRatio(ratio);
        composer.setSize(width, height);
        watercolour.uniforms.uTexel.value.set(1 / (width * ratio), 1 / (height * ratio));
      }
      composer.render();
    },
    update(time) {
      watercolour.uniforms.uTime.value = time;
    },
    dispose() {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
    },
  };
}
```

> ⚠️ `ShaderPass` accepts a shader object with `defines`; if the r186 typings reject `defines`, build a
> `THREE.ShaderMaterial` with the same fields and pass it to `new ShaderPass(material)`.

- [ ] **Step 3: Run — expect PASS**; `pnpm exec tsc --noEmit -p . 2>&1 | grep "world/paint" || echo "paint OK"`.

- [ ] **Step 4: Checkpoint** — `feat(ti-kannot): add the watercolour post-processing pass`

---

### Task 9: Ambient sound and mute button

**Files:**

- Create: `src/books/ti-kannot/world/sound.ts`, `sound.test.ts`

**Interfaces:**

- Consumes: `MixedEnv` (Task 3).
- Produces: `SoundLevels`; `soundLevels(env: Pick<MixedEnv, "water" | "night" | "rain" | "wilt">): SoundLevels`;
  `Ambience = { update(levels): void; setMuted(muted): void; dispose(): void }`;
  `createAmbience(target?: EventTarget): Ambience`; `readMuted(): boolean`;
  `createMuteButton(container: HTMLElement, onChange: (muted: boolean) => void): { dispose(): void }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/books/ti-kannot/world/sound.test.ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAmbience, createMuteButton, readMuted, soundLevels } from "./sound";

const day = { water: 0, night: 0, rain: 0, wilt: 0 };

describe("soundLevels", () => {
  it("quiets the river and wakes the cicadas in the drought", () => {
    const full = soundLevels(day);
    const dry = soundLevels({ ...day, water: -1.35, wilt: 0.8 });
    expect(dry.river).toBeLessThan(full.river);
    expect(dry.cicadas).toBeGreaterThan(full.cicadas);
  });

  it("swaps birds for tree frogs at night", () => {
    const night = soundLevels({ ...day, night: 1 });
    expect(night.birds).toBe(0);
    expect(night.frogs).toBeGreaterThan(0);
  });

  it("lets the rain drown the birds", () => {
    const wet = soundLevels({ ...day, rain: 1 });
    expect(wet.rain).toBeGreaterThan(0);
    expect(wet.birds).toBe(0);
  });
});

describe("createAmbience", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stays silent without WebAudio", () => {
    vi.stubGlobal("AudioContext", undefined);
    const ambience = createAmbience();
    expect(() => {
      ambience.update(soundLevels(day));
      ambience.setMuted(true);
      ambience.dispose();
    }).not.toThrow();
  });
});

describe("mute button", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("toggles, remembers the choice and leaves on dispose", () => {
    const container = document.createElement("div");
    const onChange = vi.fn();
    const button = createMuteButton(container, onChange);
    const el = container.querySelector<HTMLButtonElement>(".tk-sound");
    expect(onChange).toHaveBeenLastCalledWith(false);
    el?.click();
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(el?.getAttribute("aria-pressed")).toBe("true");
    expect(readMuted()).toBe(true);
    button.dispose();
    expect(container.querySelector(".tk-sound")).toBeNull();
  });

  it("works when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const container = document.createElement("div");
    const onChange = vi.fn();
    createMuteButton(container, onChange);
    container.querySelector<HTMLButtonElement>(".tk-sound")?.click();
    expect(onChange).toHaveBeenLastCalledWith(true);
  });
});
```

Run: `pnpm vitest run src/books/ti-kannot/world/sound.test.ts` — expect FAIL.

- [ ] **Step 2: Implement `sound.ts`**

```ts
// src/books/ti-kannot/world/sound.ts
import { clamp } from "@shared/math";
import type { MixedEnv } from "./env";

export interface SoundLevels {
  river: number;
  birds: number;
  frogs: number;
  cicadas: number;
  rain: number;
}

export interface Ambience {
  update(levels: SoundLevels): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

const STORAGE_KEY = "ti-kannot:muted";
const MASTER = 0.8;
const ICON_ON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>`;
const ICON_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

/** Per-layer gains for a mixed env: the river follows the water, the drought brings cicadas. */
export function soundLevels(env: Pick<MixedEnv, "water" | "night" | "rain" | "wilt">): SoundLevels {
  const day = 1 - env.night;
  return {
    river: clamp(0.1 + (0.5 * (env.water + 1.35)) / 1.6, 0.1, 0.6),
    birds: 0.5 * day * (1 - env.wilt) * (1 - env.rain),
    frogs: 0.45 * env.night,
    cicadas: 0.35 * day * env.wilt,
    rain: 0.6 * env.rain,
  };
}

const SILENT: Ambience = { update: () => {}, setMuted: () => {}, dispose: () => {} };

/** Procedural island ambience (no audio files); silent when WebAudio is unavailable. */
export function createAmbience(target: EventTarget = window): Ambience {
  const Context = globalThis.AudioContext;
  if (!Context) return SILENT;
  let ctx: AudioContext;
  try {
    ctx = new Context();
  } catch {
    return SILENT;
  }
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  /** Gain node fed by `input` through `filters`, into the master. */
  const layer = (input: AudioNode, ...filters: AudioNode[]): GainNode => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    [input, ...filters, gain].reduce((a, b) => (a.connect(b), b));
    gain.connect(master);
    return gain;
  };
  /** Biquad filter of a given type and frequency. */
  const filter = (type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    return f;
  };
  const river = layer(noise, filter("bandpass", 500, 0.6), filter("lowpass", 1400));
  const rain = layer(noise, filter("highpass", 1800));
  const buzz = ctx.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.value = 4300;
  const pulse = ctx.createGain();
  pulse.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 28;
  const depth = ctx.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(pulse.gain);
  const cicadas = layer(buzz, filter("bandpass", 4300, 6), pulse);
  noise.start();
  buzz.start();
  lfo.start();

  let levels: SoundLevels = { river: 0, birds: 0, frogs: 0, cicadas: 0, rain: 0 };
  let birdTimer: ReturnType<typeof setTimeout> | undefined;
  let frogTimer: ReturnType<typeof setTimeout> | undefined;

  /** One short sine note sliding from f0 to f1. */
  const note = (f0: number, f1: number, at: number, length: number, gain: number): void => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(f1, at + length);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(env).connect(master);
    osc.start(at);
    osc.stop(at + length + 0.02);
  };
  /** Bananaquit-like chirps, rescheduled at random intervals. */
  const birds = (): void => {
    if (levels.birds > 0.02) {
      const t = ctx.currentTime;
      const count = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        note(
          2600 + Math.random() * 1400,
          3800 + Math.random() * 1500,
          t + k * 0.13,
          0.1,
          levels.birds * 0.25,
        );
      }
    }
    birdTimer = setTimeout(birds, 700 + Math.random() * 2200);
  };
  /** Two-note "ko-kwi" of the ti-sonnèt tree frog. */
  const frogs = (): void => {
    if (levels.frogs > 0.02) {
      const t = ctx.currentTime;
      note(1700, 1800, t, 0.05, levels.frogs * 0.3);
      note(2900, 3100, t + 0.09, 0.08, levels.frogs * 0.3);
    }
    frogTimer = setTimeout(frogs, 600 + Math.random() * 900);
  };
  birds();
  frogs();

  const resume = (): void => void ctx.resume();
  target.addEventListener("pointerdown", resume);
  resume();

  return {
    update(next) {
      const changed = (Object.keys(next) as (keyof SoundLevels)[]).some(
        (k) => Math.abs(next[k] - levels[k]) > 0.01,
      );
      if (!changed) return;
      levels = next;
      const now = ctx.currentTime;
      river.gain.setTargetAtTime(next.river, now, 0.6);
      rain.gain.setTargetAtTime(next.rain, now, 0.6);
      cicadas.gain.setTargetAtTime(next.cicadas * 0.15, now, 0.6);
    },
    setMuted(muted) {
      master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.3);
      if (!muted) resume();
    },
    dispose() {
      clearTimeout(birdTimer);
      clearTimeout(frogTimer);
      target.removeEventListener("pointerdown", resume);
      void ctx.close();
    },
  };
}

/** The visitor's saved mute choice; unmuted when storage is unavailable. */
export function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Saves the mute choice; silently keeps it for this visit only when storage is blocked. */
function storeMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Storage blocked (private mode): the choice lasts until the page closes.
  }
}

/** Sound toggle in the world's corner; reports the initial state, then every change. */
export function createMuteButton(
  container: HTMLElement,
  onChange: (muted: boolean) => void,
): { dispose(): void } {
  let muted = readMuted();
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tk-sound";
  /** Syncs the icon and accessible state with `muted`. */
  const render = (): void => {
    button.setAttribute("aria-pressed", String(muted));
    button.setAttribute("aria-label", muted ? "Remettre le son" : "Couper le son");
    button.innerHTML = muted ? ICON_OFF : ICON_ON;
  };
  const stop = (e: Event): void => e.stopPropagation();
  button.addEventListener("pointerdown", stop);
  button.addEventListener("pointerup", stop);
  button.addEventListener("click", () => {
    muted = !muted;
    storeMuted(muted);
    render();
    onChange(muted);
  });
  render();
  container.append(button);
  onChange(muted);
  return { dispose: () => button.remove() };
}
```

- [ ] **Step 3: Run — expect PASS**

- [ ] **Step 4: Checkpoint** — `feat(ti-kannot): add the island ambience and a mute toggle`

---

### Task 10: Wire the new world, remove the old one

**Files:**

- Rewrite: `src/books/ti-kannot/world/index.ts`
- Update: `src/books/ti-kannot/world/index.test.ts`
- Remove (with `trash`, after confirming with the user): `world/valley.ts`, `world/props.ts`, `world/terrain.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–9.
- Produces: the `BookWorld` default export (contract unchanged).

- [ ] **Step 1: Update the mount test (failing first)**

```ts
// src/books/ti-kannot/world/index.test.ts
// @vitest-environment happy-dom
import type { Bubble, Story } from "@app/contract";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAGING } from "../staging";

const stage = vi.hoisted(() => ({ dispose: vi.fn(), start: vi.fn() }));
const paint = vi.hoisted(() => ({ render: vi.fn(), update: vi.fn(), dispose: vi.fn() }));

vi.mock("@shared/three/stage", async () => {
  const THREE = await import("three");
  return {
    createStage: () => ({
      ...stage,
      renderer: {},
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
    }),
  };
});
vi.mock("./paint", () => ({ paintQuality: () => "low", createPaint: () => paint }));

const story: Story = {
  lang: "gcf",
  title: "T",
  pages: Object.keys(STAGING).map((id) => ({ id, label: id, title: id, blocks: [] })),
};
const bubble: Bubble = { show: vi.fn(), hide: vi.fn() };

describe("Ti Kannot world mount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("releases everything it built when the mount fails half-way", async () => {
    const { default: world } = await import("./index");
    const container = document.createElement("div");
    const removed = vi.spyOn(container, "removeEventListener");
    stage.start.mockImplementationOnce(() => {
      throw new Error("loop failed");
    });
    expect(() => world.mount(container, { story, page: 0, bubble })).toThrow("loop failed");
    expect(stage.dispose).toHaveBeenCalledTimes(1);
    expect(paint.dispose).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".tk-sound")).toBeNull();
    expect(removed.mock.calls.map(([type]) => type).sort()).toEqual([
      "pointerdown",
      "pointermove",
      "pointerup",
    ]);
  });

  it("fails on a page without staging, before any stage is created", async () => {
    const { default: world } = await import("./index");
    const broken: Story = { ...story, pages: [{ id: "nope", label: "", title: "", blocks: [] }] };
    expect(() =>
      world.mount(document.createElement("div"), { story: broken, page: 0, bubble }),
    ).toThrow('no staging for page "nope"');
    expect(stage.dispose).not.toHaveBeenCalled();
  });

  it("hands rendering to the watercolour pass", async () => {
    const { default: world } = await import("./index");
    const handle = world.mount(document.createElement("div"), { story, page: 0, bubble });
    const [, render] = stage.start.mock.calls[0] as [unknown, () => void];
    render();
    expect(paint.render).toHaveBeenCalledTimes(1);
    if ("dispose" in handle) handle.dispose();
  });
});
```

Run: `pnpm vitest run src/books/ti-kannot/world/index.test.ts` — expect FAIL.

- [ ] **Step 2: Rewrite `index.ts`**

```ts
// src/books/ti-kannot/world/index.ts
import "@fontsource/caveat/600.css";
import "../theme.css";
import * as THREE from "three";
import { defineWorld, type Story } from "@app/contract";
import { createRng } from "@shared/random";
import { createStage } from "@shared/three/stage";
import { STAGING, type PageEnv } from "../staging";
import { createCharacters } from "./characters";
import { mixEnv, pageSpan, shotCamera } from "./env";
import { createGround } from "./island/ground";
import { createSource } from "./island/source";
import { createVegetation } from "./island/vegetation";
import { createVillage } from "./island/village";
import { createPaint, paintQuality } from "./paint";
import { createSky } from "./sky";
import { createAmbience, createMuteButton, soundLevels, type Ambience } from "./sound";
import { dialogueLines, lineFor, type CharacterName } from "./speech";
import { createStock } from "./stock";
import { createWater } from "./water";

const SPEAK_MS = 4200;
const TAP_DISTANCE = 8;
const TAP_MS = 600;
const PAGE_EASE = 1.6;

/** Staging of each story page, in reading order. */
function envsFor(story: Story): PageEnv[] {
  return story.pages.map((page) => {
    const env = STAGING[page.id];
    if (!env) throw new Error(`ti-kannot: no staging for page "${page.id}"`);
    return env;
  });
}

/** Larivyè Klè: a watercolour island whose river, light and inhabitants follow the tale. */
export default defineWorld({
  mount(container, ctx) {
    const envs = envsFor(ctx.story);
    const stage = createStage(container);
    let speakTimer: ReturnType<typeof setTimeout> | undefined;
    let removeListeners = (): void => {};
    let paint: ReturnType<typeof createPaint> | null = null;
    let ambience: Ambience | null = null;
    let mute: { dispose(): void } | null = null;
    const release = (): void => {
      clearTimeout(speakTimer);
      removeListeners();
      mute?.dispose();
      ambience?.dispose();
      paint?.dispose();
      stage.dispose();
    };
    try {
      const { scene, camera, renderer } = stage;
      const rng = createRng(17);
      const ground = createGround(rng);
      const vegetation = createVegetation(rng);
      const village = createVillage(rng);
      const source = createSource(rng);
      const stock = createStock(rng);
      const water = createWater();
      const sky = createSky(rng);
      const cast = createCharacters();
      scene.fog = sky.fog;
      scene.add(
        sky.group,
        ground.mesh,
        water.group,
        vegetation.group,
        village.group,
        source.group,
        stock.group,
        cast.group,
      );
      paint = createPaint(
        renderer,
        scene,
        camera,
        paintQuality(matchMedia("(pointer: coarse)").matches, devicePixelRatio),
      );
      const sound = createAmbience();
      ambience = sound;
      mute = createMuteButton(container, (muted) => sound.setMuted(muted));

      let story = ctx.story;
      let page = ctx.page;
      let pageF = ctx.page;
      let down: { y: number; t: number; moved: number } | null = null;
      const pointer = { x: 0, y: 0 };
      const cam = new THREE.Vector3();
      const look = new THREE.Vector3();
      const anchorPoint = new THREE.Vector3();
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      /** Mixed staging at the current fractional page. */
      const place = (): ReturnType<typeof mixEnv> => {
        const { i0, i1, f } = pageSpan(envs.length, pageF);
        return mixEnv(envs, i0, i1, f);
      };
      cast.snap(place());

      /** Shows a character's line in the bubble for a few seconds. */
      const speak = (name: CharacterName): void => {
        ctx.bubble.show(lineFor(name, dialogueLines(story, page)), () => {
          const a = cast.anchor(name, anchorPoint);
          const s = stage.project(a.point);
          return { x: s.x, y: s.y, visible: s.visible && a.visible };
        });
        clearTimeout(speakTimer);
        speakTimer = setTimeout(() => ctx.bubble.hide(), SPEAK_MS);
      };

      /** Advances the page blend and updates every part of the island. */
      const frame = (time: number, dt: number): void => {
        pageF += (page - pageF) * (1 - Math.exp(-dt * PAGE_EASE));
        const env = place();
        shotCamera(env.shot, camera.aspect, cam, look);
        camera.position.copy(cam);
        camera.position.x += pointer.x * 0.8;
        camera.position.y += pointer.y * 0.4;
        camera.lookAt(look);
        sky.update(env, time, camera.position);
        water.update(env, time, camera.position);
        ground.update(env);
        vegetation.update(env);
        village.update(env);
        source.update(env, time);
        stock.update(env);
        cast.update(env, time, dt, camera.position);
        sound.update(soundLevels(env));
        paint?.update(time);
      };

      const onPointerDown = (e: PointerEvent): void => {
        down = { y: e.clientY, t: performance.now(), moved: 0 };
      };
      const onPointerMove = (e: PointerEvent): void => {
        Object.assign(pointer, stage.pointer(e));
        if (down && e.pointerType !== "mouse") {
          down.moved += Math.abs(e.clientY - down.y);
          down.y = e.clientY;
        }
      };
      const onPointerUp = (e: PointerEvent): void => {
        const d = down;
        down = null;
        if (!d || d.moved > TAP_DISTANCE || performance.now() - d.t > TAP_MS) return;
        Object.assign(pointer, stage.pointer(e));
        ndc.set(pointer.x, pointer.y);
        ray.setFromCamera(ndc, camera);
        const name = cast.pick(ray);
        if (name) speak(name);
      };
      removeListeners = (): void => {
        container.removeEventListener("pointerdown", onPointerDown);
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerup", onPointerUp);
      };
      container.addEventListener("pointerdown", onPointerDown);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerup", onPointerUp);
      const painter = paint;
      stage.start(frame, () => painter.render());

      return {
        setPage(index) {
          page = index;
          clearTimeout(speakTimer);
        },
        setStory(next) {
          story = next;
        },
        dispose: release,
      };
    } catch (err) {
      release();
      throw err;
    }
  },
});
```

- [ ] **Step 3: Remove the old modules** — ask the user to confirm, then:

```bash
trash src/books/ti-kannot/world/valley.ts src/books/ti-kannot/world/props.ts src/books/ti-kannot/world/terrain.ts
```

- [ ] **Step 4: Add the font dependency** — `pnpm add @fontsource/caveat`

- [ ] **Step 5: Full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all green. Fix any lint finding (unused scratch vars, import order) in place.

- [ ] **Step 6: Checkpoint** — `feat(ti-kannot): mount the watercolour island world`

---

### Task 11: Cover and reading theme

**Files:**

- Rewrite: `src/books/ti-kannot/cover.ts`, `src/books/ti-kannot/theme.css`

**Interfaces:**

- Produces: `paintCover(c: CanvasRenderingContext2D, W: number, H: number): void` (signature unchanged).

- [ ] **Step 1: Rewrite `cover.ts`**

```ts
// src/books/ti-kannot/cover.ts
import { createRng, type Rng } from "@shared/random";

/** Soft watercolour stain: jittered translucent ellipses around (x, y). */
function wash(
  c: CanvasRenderingContext2D,
  rnd: Rng,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  alpha: number,
  blots = 14,
): void {
  c.fillStyle = color;
  for (let i = 0; i < blots; i++) {
    c.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    c.beginPath();
    c.ellipse(
      x + (rnd() - 0.5) * rx * 0.5,
      y + (rnd() - 0.5) * ry * 0.5,
      rx * (0.6 + rnd() * 0.5),
      ry * (0.6 + rnd() * 0.5),
      (rnd() - 0.5) * 0.4,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.globalAlpha = 1;
}

/** Paints Ti Kannot's card: a watercolour island, its river, the bird on a flamboyant, the crab. */
export function paintCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(23);
  c.fillStyle = "#f3ead6";
  c.fillRect(0, 0, W, H);
  const sky = c.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "#a9dde3");
  sky.addColorStop(1, "#f8dcc0");
  c.globalAlpha = 0.85;
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H * 0.55);
  c.globalAlpha = 1;
  for (let i = 0; i < 5; i++)
    wash(
      c,
      rnd,
      rnd() * W,
      H * (0.08 + rnd() * 0.25),
      60 + rnd() * 50,
      16 + rnd() * 10,
      "#ffffff",
      0.25,
    );
  wash(c, rnd, W * 0.12, H * 0.5, 70, 22, "#8fb9a8", 0.25);
  wash(c, rnd, W * 0.9, H * 0.49, 80, 26, "#9cc0ae", 0.25);
  const sea = c.createLinearGradient(0, H * 0.48, 0, H);
  sea.addColorStop(0, "#9fe0d4");
  sea.addColorStop(1, "#3fb3a8");
  c.fillStyle = sea;
  c.fillRect(0, H * 0.48, W, H * 0.52);
  wash(c, rnd, W * 0.5, H * 0.63, W * 0.42, H * 0.08, "#efdcaa", 0.5);
  wash(c, rnd, W * 0.5, H * 0.59, W * 0.36, H * 0.08, "#8cc56a", 0.45);
  c.globalAlpha = 0.85;
  c.fillStyle = "#5f9a63";
  c.beginPath();
  c.moveTo(W * 0.28, H * 0.6);
  c.quadraticCurveTo(W * 0.45, H * 0.3, W * 0.5, H * 0.3);
  c.quadraticCurveTo(W * 0.56, H * 0.3, W * 0.74, H * 0.6);
  c.fill();
  c.globalAlpha = 1;
  wash(c, rnd, W * 0.5, H * 0.31, 46, 12, "#ffffff", 0.35);
  c.strokeStyle = "#7fd8e0";
  c.lineWidth = 9;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(W * 0.49, H * 0.36);
  c.bezierCurveTo(W * 0.42, H * 0.48, W * 0.56, H * 0.55, W * 0.52, H * 0.68);
  c.stroke();
  for (const [x, y] of [
    [0.32, 0.52],
    [0.66, 0.5],
    [0.4, 0.45],
  ] as const) {
    c.fillStyle = "#7a4e30";
    c.fillRect(W * x - 3, H * y, 6, 26);
    wash(c, rnd, W * x, H * y, 30, 14, "#e0523a", 0.55, 10);
  }
  c.fillStyle = "#e8b864";
  c.fillRect(W * 0.66, H * 0.55, 34, 22);
  c.fillStyle = "#c0432f";
  c.beginPath();
  c.moveTo(W * 0.66 - 5, H * 0.55);
  c.lineTo(W * 0.66 + 17, H * 0.55 - 16);
  c.lineTo(W * 0.66 + 39, H * 0.55);
  c.fill();
  c.strokeStyle = "rgba(255,255,255,.6)";
  c.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W;
    const y = H * (0.72 + rnd() * 0.26);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 12, y - 4, x + 26, y);
    c.stroke();
  }
  const bx = W * 0.33;
  const by = H * 0.48;
  c.fillStyle = "#3b3940";
  c.beginPath();
  c.ellipse(bx, by, 16, 11, -0.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f4c21b";
  c.beginPath();
  c.ellipse(bx + 3, by + 4, 11, 6, -0.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f7f3e8";
  c.fillRect(bx + 10, by - 9, 8, 2);
  const cx = W * 0.58;
  const cy = H * 0.76;
  wash(c, rnd, cx, cy, 30, 16, "#d8452f", 0.8, 8);
  c.strokeStyle = "#d8452f";
  c.lineWidth = 5;
  for (const d of [-1, 1]) {
    c.beginPath();
    c.arc(cx + d * 34, cy - 16, d > 0 ? 13 : 10, 0, Math.PI * 1.6);
    c.stroke();
  }
  c.fillStyle = "#7a4a2c";
  c.beginPath();
  c.ellipse(W * 0.25, H * 0.86, 40, 9, 0.15, 0, Math.PI);
  c.fill();
  for (let i = 0; i < 6000; i++) {
    c.fillStyle = `rgba(120,90,60,${rnd() * 0.05})`;
    c.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }
  const edge = c.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.35,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.62,
  );
  edge.addColorStop(0, "rgba(243,234,214,0)");
  edge.addColorStop(1, "rgba(243,234,214,.9)");
  c.fillStyle = edge;
  c.fillRect(0, 0, W, H);
}
```

- [ ] **Step 2: Rewrite `theme.css`**

```css
[data-book="ti-kannot"] {
  --reading-accent: #1f8f86;
  --reading-text: #4a3524;
  --reading-title: #5a2f1c;
  --reading-card-bg: rgba(250, 243, 228, 0.88);
  --reading-card-border: rgba(120, 84, 52, 0.22);
  --reading-font-display: "Caveat", "Cormorant Garamond", cursive;
  --reading-font-body: "Quicksand", sans-serif;
}

[data-book="ti-kannot"] .reading-card {
  box-shadow: 0 18px 40px rgba(60, 40, 20, 0.18);
}

[data-book="ti-kannot"] .reading-title {
  font-style: normal;
  font-size: clamp(28px, 3vw, 38px);
}

[data-book="ti-kannot"] .reading-num {
  font-style: normal;
  color: rgba(74, 53, 36, 0.55);
}

[data-book="ti-kannot"] .reading-gloss {
  font-style: normal;
  font-size: 19px;
  color: rgba(74, 53, 36, 0.78);
  border-top-color: rgba(31, 143, 134, 0.3);
}

.tk-sound {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 10px;
  border: 1px solid rgba(120, 84, 52, 0.25);
  border-radius: 50%;
  background: rgba(250, 243, 228, 0.75);
  color: #5a2f1c;
  cursor: pointer;
  transition: background 0.2s;
}

.tk-sound:hover {
  background: rgba(250, 243, 228, 0.95);
}

.tk-sound:focus-visible {
  outline: 2px solid #1f8f86;
  outline-offset: 2px;
}

.tk-sound svg {
  width: 100%;
  height: 100%;
}
```

> Check in the browser that `.tk-sound` does not overlap an app control (back button, language
> switch); move it (e.g. `top: 72px`) if it does.

- [ ] **Step 3: Verify** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 4: Checkpoint** — `feat(ti-kannot): repaint the cover and the reading card as watercolour`

---

### Task 12: Visual verification and tuning

**Files:** tuning values only (`staging.ts`, colours, shader constants).

- [ ] **Step 1:** `pnpm dev`, open the app, enter Ti Kannot.
- [ ] **Step 2:** For each of the 12 pages, take a screenshot (desktop 1440×900 and portrait 390×844)
      and check: the framed spot is visible and centred; the characters are readable through the
      watercolour; the light matches the page (dawn, drought, night, rain + rainbow); the reading card
      doesn't hide the focus (adjust `azimuth`/`elevation`/`distance` if it does).
- [ ] **Step 3:** Check page transitions (forward and back, fast flipping): no full spins, the bird flies
      in an arc, the crab shuffles in.
- [ ] **Step 4:** Check sound: on by default after the first tap, button toggles, choice survives a
      reload; nothing plays after leaving the book (dispose).
- [ ] **Step 5:** Check the tree card shows the new cover; check that the reading UI controls (dots,
      arrows, back, language) stay readable on the bright scenes.
- [ ] **Step 6:** Frame rate: DevTools performance on a 4× CPU-throttled, touch-emulated profile with
      the low tier — target ≥ 30 fps.
- [ ] **Step 7:** Final `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- [ ] **Step 8: Checkpoint** — `style(ti-kannot): tune the island staging after visual review`
