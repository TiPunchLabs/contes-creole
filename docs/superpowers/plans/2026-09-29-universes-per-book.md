# Universes per book — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the app into an isolated tree universe and one folder-per-book universe, with tale text in Markdown, and port the v13 mockup faithfully onto that structure.

**Architecture:** A thin app shell (`src/app/`) owns the state machine, reading UI, transitions and global keys. The tree (`src/tree/`) and each book (`src/books/<id>/`) are universes mounted into a DOM container through a small contract (`src/app/contract.ts`). Books are discovered with `import.meta.glob`; a book's world is lazy-loaded. Isolation is enforced by ESLint.

**Tech Stack:** Vite 8, TypeScript ~6.0, three r186 (npm), Vitest 5 (+ happy-dom for DOM tests), ESLint 10 flat config, Prettier, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-29-universes-per-book-design.md` — read it before starting a task.

**Porting source:** `design/v13/scene13.js`, `design/v13/template.html` and `design/v13/kont-data.js` are the reference for every ported number, colour and timing. When this plan and the mockup disagree on a value, the mockup wins: fix the plan's code, not the look.

## Global Constraints

- Package manager: **pnpm only** (never npm or yarn).
- TypeScript stays `~6.0.3`: typescript-eslint 8.x does not support TS 7.
- `three` is the npm package `^0.186.1`. There's no UI framework: the DOM is written in vanilla TS.
- Tale text is never altered: not one Kréyòl or French word changes. Creole spellings in the mockup stay as they are ("Glisez", "Yé mistrikrik" / "Yé mistikrik"), because they are open questions for the author.
- English identifiers, comments and commit messages (Conventional Commits). Docstrings on functions; no obvious inline comments. Strict TS, no `any` written by hand.
- Timings from v13:
  - dive 1700 ms, with the flash ramping over its last 45 %;
  - rise 1100 ms;
  - flash fade 1200 ms;
  - paging accumulates 60 px and then locks for 750 ms;
  - WebGL mount is retried 5 times, 1200 ms apart;
  - the "Kont-la pa ka chajé" notice stays up 4000 ms.
- Language codes: `gcf`, `fr`, `en`. Reading modes: Kréyòl, Bileng, Français, and English when `en.md` exists. The default is Kréyòl.
- **Commits**: the user's global rule is "never auto-commit". Before the first commit step, ask the user once whether per-task commits on `feat/universes-per-book` are approved. If they are not, skip every commit step.
- **Deletions**: never `rm`. Use `trash`, and only after the user confirms.
- No remote operation is part of this plan. If one is needed, the remote must be `git@github-xgueret:TiPunchLabs/contes-creole.git`.

## Spec clarifications (decided while planning — flag to the user at handoff)

1. `TreeContext` gains `bubble: Bubble`, so the Konteur's "Yé krik !…" uses the shared bubble.
2. `StoryBlock` gains `text: string`: the plain text beside `html`. The characters' speech bubbles and the verbatim test need it.
3. The tree listens for its own climb keys (↑ ↓ Space Enter) while it is active. The app owns keys in book mode.
4. Code outside a universe is imported through the aliases `@app/*`, `@shared/*`, `@tree/*` and `@books/*`. A relative import may not climb out of its universe folder. This is enforced with depth-tiered `no-restricted-imports` regex patterns.
5. Fonts come from `@fontsource/cormorant-garamond` and `@fontsource/quicksand`, because the mockup bundled them.
6. The theme variable list gains `--reading-title` for the cream title colour.
7. Ti Kannot's manifest stays `ready: false` until its world lands (Task 12), so every intermediate commit builds.
8. `fr.md`'s front-matter title is "Ti Kannot é Gwo Rako": v13 has no French book title.
9. The paging lock reads `Date.now()` instead of `performance.now()`, so fake timers can drive it in tests.

## Review Focus

1. **Book with only `gcf.md`.** The language switch shows Kréyòl alone. A Bileng or Français choice carried over from a previous book falls back to Kréyòl instead of crashing. Test: Task 5 (`readingLangs`) and Task 9 ("falls back to Kréyòl").
2. **Double clicks and keys during a transition.** A second "Antré", or Escape during a dive or rise, is ignored. The tree never dives twice. Test: Task 9.
3. **Load or mount failure after the tree paused.** The tree comes back, becomes interactive again, and the same book can be retried. Test: Task 9.
4. **Paging at the edges and trackpad inertia.** Paging is clamped to the first and last page. One gesture turns exactly one page (60 px, 750 ms lock). Test: Task 7 (pager) and Task 9.
5. **Markdown containing `<`, `&` or quotes.** It is escaped and never injected. Dialogue lines written on consecutive lines, without a blank line between them, still split. Test: Task 4.

## File Structure

```
src/
  main.ts                       boot: fonts, global css, startApp(root, {mountTree, books, loadStories})
  style.css                     app shell styles (layers, vignette, grain, bubble, flash, notice, fallback)
  isolation.test.ts             lint-level isolation tests (ESLint API)
  app/
    contract.ts                 Lang, Story*, Bubble, BookManifest, BookWorld, TreeContext, TreeHandle, defineBook
    story/parse.ts (+ .test)    Markdown story parser
    registry.ts (+ .test)       createRegistry + default `registry` (import.meta.glob)
    languages.ts (+ .test)      ReadingLang, readingLangs, storyFor
    paging.ts (+ .test)         createPager, clampPage
    transition.ts               createFlash
    notice.ts                   showNotice
    fallback.ts                 showFallback
    backdrop.ts                 vignette + film grain
    bubble.ts                   createBubble (shared by tree and books)
    reading-ui/reading-ui.ts (+ .test), reading-ui.css
    app.ts (+ .test)            startApp: state machine tree | dive | book | rise
  shared/
    random.ts (+ .test)         createRng
    math.ts (+ .test)           lerp, clamp, smoothstep
    three/glow-points.ts        glowPoints
    three/soft-sprite.ts        softSprite
    three/dispose.ts            disposeObject
    three/stage.ts              createStage: canvas + renderer + camera + loop + project
  tree/
    index.ts                    mountTree
    assets/konteur.png          (moved from public/)
    scene/camera.ts             hubCam, CARD_T, cardT
    scene/landscape.ts          ground, mornes, vegetation, grass, pool, fireflies, stars, moon, mist, lights
    scene/tree.ts               createLightTree (branches, bark, leaves)
    scene/konteur.ts            createKonteur
    scene/locked-cover.ts       paintLockedCover
    scene/cards.ts              createCards (+ cover texture, frame and title painting)
    overlay/overlay.ts, overlay.css
  books/
    books.test.ts               consistency of every book
    v13-conversion.test.ts      "not a word changed" guard for Ti Kannot
    ti-kannot/book.ts, cover.ts, staging.ts, theme.css, story/gcf.md, story/fr.md
    ti-kannot/world/terrain.ts, env.ts (+ .test), speech.ts (+ .test), sky.ts, valley.ts, water.ts, props.ts, characters.ts, index.ts
    zanba/book.ts
    konpe-lapen/book.ts
vite.config.ts                  path aliases (also used by Vitest)
```

Removed:

- `src/content/`, which is replaced by the stories, the staging and the manifests.
- `public/konteur.png`, which moves to `src/tree/assets/`.

---

### Task 1: Tooling — aliases, dependencies, isolation lint

**Files:**

- Create: `vite.config.ts`, `src/isolation.test.ts`
- Modify: `tsconfig.json`, `eslint.config.js`, `package.json` (via pnpm)

**Interfaces:**

- Produces:
  - the import aliases `@app/*`, `@shared/*`, `@tree/*`, `@books/*`, which resolve in `tsc`, Vite and Vitest;
  - the lint isolation rules that every later task must satisfy.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @fontsource/cormorant-garamond @fontsource/quicksand
pnpm add -D happy-dom
```

- [ ] **Step 2: Write the failing isolation test** — `src/isolation.test.ts`

```ts
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

/** Returns the no-restricted-imports messages ESLint reports for `code` placed at `filePath`. */
async function violations(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports").map((m) => m.message);
}

describe("universe isolation", () => {
  it.each([
    ["src/tree/index.ts", 'import "../books/ti-kannot/book";'],
    ["src/tree/scene/cards.ts", 'import "@books/ti-kannot/book";'],
    ["src/tree/scene/cards.ts", 'import "../../app/contract";'],
    ["src/books/ti-kannot/world/index.ts", 'import "../../zanba/book";'],
    ["src/books/ti-kannot/book.ts", 'import "@tree/index";'],
    ["src/books/ti-kannot/book.ts", 'import "@books/zanba/book";'],
    ["src/books/ti-kannot/book.ts", 'import "@app/registry";'],
    ["src/app/app.ts", 'import "@tree/index";'],
    ["src/app/story/parse.ts", 'import "../../books/ti-kannot/book";'],
    ["src/shared/math.ts", 'import "@app/contract";'],
    ["src/shared/three/stage.ts", 'import "../../tree/index";'],
  ])("%s rejects %s", async (file, code) => {
    expect(await violations(file, code)).not.toHaveLength(0);
  });

  it.each([
    ["src/tree/scene/cards.ts", 'import "../overlay/overlay";'],
    ["src/tree/scene/cards.ts", 'import "@app/contract";'],
    ["src/tree/scene/cards.ts", 'import "@shared/math";'],
    ["src/books/ti-kannot/world/index.ts", 'import "../staging";'],
    ["src/books/ti-kannot/world/index.ts", 'import "@shared/three/stage";'],
    ["src/app/app.ts", 'import "./contract";'],
    ["src/main.ts", 'import "@tree/index";'],
  ])("%s allows %s", async (file, code) => {
    expect(await violations(file, code)).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `pnpm test src/isolation.test.ts`
Expected: FAIL. The "rejects" cases report 0 messages.

- [ ] **Step 4: Add the aliases** — `tsconfig.json` gains a `paths` entry inside `compilerOptions`:

```json
    "paths": {
      "@app/*": ["./src/app/*"],
      "@shared/*": ["./src/shared/*"],
      "@tree/*": ["./src/tree/*"],
      "@books/*": ["./src/books/*"]
    }
```

Create `vite.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Absolute path of a folder relative to this config file. */
const dir = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@app": dir("./src/app"),
      "@shared": dir("./src/shared"),
      "@tree": dir("./src/tree"),
      "@books": dir("./src/books"),
    },
  },
});
```

- [ ] **Step 5: Add the isolation rules** — replace `eslint.config.js`:

```js
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const MAX_DEPTH = 6;
const UNIVERSE_MESSAGE =
  "A universe may only import its own files, @shared/* and @app/contract (see the universes spec §3).";

/** Pattern rejecting any import that climbs `levels` folders or more. */
const climbs = (levels) => ({ regex: `^(\\.\\./){${levels}}`, message: UNIVERSE_MESSAGE });

/** One config per nesting depth, so a relative import can never leave the universe folder. */
function universe(root, forbidden) {
  return Array.from({ length: MAX_DEPTH }, (_, depth) => ({
    files: [`${root}/${"*/".repeat(depth)}*.ts`],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [climbs(depth + 1), { regex: forbidden, message: UNIVERSE_MESSAGE }] },
      ],
    },
  }));
}

/** Shell and toolbox layers: aliases and relative paths into the listed folders are rejected. */
function layer(files, folders, message) {
  const names = folders.join("|");
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { regex: `^@(${names})(/|$)`, message },
            { regex: `^(\\.\\./)+(${names})(/|$)`, message },
          ],
        },
      ],
    },
  };
}

export default tseslint.config(
  { ignores: ["dist", "design"] },
  {
    files: ["**/*.{ts,js}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
  },
  ...universe("src/tree", "^@(books|tree)(/|$)|^@app/(?!contract$)"),
  ...universe("src/books/*", "^@(books|tree)(/|$)|^@app/(?!contract$)"),
  layer(
    ["src/app/**/*.ts"],
    ["tree", "books"],
    "The app reaches books only through the registry glob.",
  ),
  layer(["src/shared/**/*.ts"], ["app", "tree", "books"], "src/shared is a leaf toolbox."),
);
```

- [ ] **Step 6: Run the test and the checks**

Run:

```bash
pnpm test src/isolation.test.ts
pnpm typecheck
pnpm lint
```

Expected: all PASS. Lint is clean on the existing files.

- [ ] **Step 7: Commit** (only if the user approved per-task commits)

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts eslint.config.js src/isolation.test.ts
git commit -m "build: add universe aliases and isolation lint rules"
```

---

### Task 2: Shared random and math

**Files:**

- Create: `src/shared/random.ts`, `src/shared/random.test.ts`, `src/shared/math.ts`, `src/shared/math.test.ts`

**Interfaces:**

- Produces:
  - `type Rng = () => number`
  - `createRng(seed: number): Rng`
  - `lerp(a, b, t)`, `clamp(v, min, max)`, `smoothstep(t)`: all `number` → `number`.

- [ ] **Step 1: Write the failing tests**

`src/shared/random.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRng } from "./random";

describe("createRng", () => {
  it("reproduces the v13 Park–Miller sequence", () => {
    const rng = createRng(11);
    expect(rng()).toBeCloseTo((11 * 16807 - 1) / 2147483646, 12);
  });

  it("is deterministic per seed and independent per instance", () => {
    const a = createRng(11);
    const b = createRng(11);
    const draws = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(draws);
  });

  it("stays within [0, 1)", () => {
    const rng = createRng(3);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

`src/shared/math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { clamp, lerp, smoothstep } from "./math";

describe("math", () => {
  it("lerps", () => expect(lerp(2, 4, 0.25)).toBe(2.5));
  it("clamps", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });
  it("smoothsteps", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test src/shared`
Expected: FAIL, "Cannot find module './random'".

- [ ] **Step 3: Implement**

`src/shared/random.ts`:

```ts
/** Seeded pseudo-random generator returning numbers in [0, 1). */
export type Rng = () => number;

/** Park–Miller generator (v13 `rnd`); create one per universe so layouts never depend on each other. */
export function createRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
```

`src/shared/math.ts`:

```ts
/** Linear interpolation from `a` to `b`. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Restricts `value` to [min, max]. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Hermite ease of a t already in [0, 1] (v13 `sm`). */
export const smoothstep = (t: number): number => t * t * (3 - 2 * t);
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared
git commit -m "feat(shared): add seeded random and math helpers"
```

---

### Task 3: Shared Three.js toolbox

**Files:**

- Create: `src/shared/three/glow-points.ts`, `src/shared/three/soft-sprite.ts`, `src/shared/three/dispose.ts`, `src/shared/three/stage.ts`

**Interfaces:**

- Consumes: `Rng` (Task 2).
- Produces:
  - `glowPoints(rng: Rng, count: number, place: (i: number) => readonly [number, number, number], opts?: GlowOptions): GlowPoints`, where `GlowPoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>` and the uniforms are `uTime`, `uOpacity`, `uSize`, `cA`, `cB`, `uDrift`, `uRain` and `uFall`.
  - `softSprite(color: THREE.ColorRepresentation, size: number, opacity?: number, additive?: boolean): THREE.Sprite`
  - `disposeObject(root: THREE.Object3D): void`
  - `createStage(container: HTMLElement): Stage`. It **throws** when WebGL is unavailable, and removes its canvas when it does. `Stage` has these members:
    - `scene`, `camera` (fov 50, near .1, far 600), `renderer`;
    - `project(p: THREE.Vector3): ScreenPoint`, where `ScreenPoint = { x, y, visible }` in container pixels;
    - `pointer(e: PointerEvent): { x: number; y: number }`, in NDC;
    - `start(frame: (time: number, dt: number) => void)`, where time is in seconds since creation and dt is in seconds, capped at 0.05. It resizes, calls `frame`, then renders;
    - `stop()`;
    - `dispose()`.

These wrap WebGL, so this task has no unit tests. Typecheck, lint, and Tasks 11 and 12 verify them.

- [ ] **Step 1: `src/shared/three/glow-points.ts`.** The GLSL is copied verbatim from `scene13.js` lines 17–27.

```ts
import * as THREE from "three";
import type { Rng } from "../random";

export interface GlowOptions {
  size?: number;
  a?: string;
  b?: string;
  drift?: number;
  rain?: boolean;
  fall?: number;
}

export type GlowPoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

const VERTEX = `attribute float aPhase, aSize, aMix; uniform float uTime, uSize, uDrift, uFall; varying float vPhase, vMix, vNear;
  void main(){ vPhase=aPhase; vMix=aMix; vec3 p=position;
    p.x+=sin(uTime*.4+aPhase*6.283)*uDrift; p.y+=cos(uTime*.3+aPhase*9.4)*uDrift*.6; p.z+=sin(uTime*.35+aPhase*4.1)*uDrift;
    if(uFall>0.){ p.y=mod(p.y-uTime*uFall+aPhase*20., 20.); }
    vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(aSize*uSize*(320./-mv.z), 26.); vNear=smoothstep(1.5,5.,-mv.z); }`;

const FRAGMENT = `uniform vec3 cA,cB; uniform float uTime,uOpacity,uRain; varying float vPhase,vMix,vNear;
  void main(){ vec2 q=gl_PointCoord-.5; float d=uRain>.5?length(q*vec2(6.,1.)):length(q); float a=smoothstep(.5,.08,d);
    float tw=uRain>.5?1.:.55+.45*sin(uTime*1.7+vPhase*6.283); gl_FragColor=vec4(mix(cA,cB,vMix)*(tw+.2), a*uOpacity*tw*vNear); }`;

/** Glowing point cloud (leaves, fireflies, plankton, rain) with twinkle, drift and optional fall. */
export function glowPoints(
  rng: Rng,
  count: number,
  place: (index: number) => readonly [number, number, number],
  opts: GlowOptions = {},
): GlowPoints {
  const position = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  const mix = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    position.set(place(i), i * 3);
    phase[i] = rng();
    size[i] = 0.5 + rng();
    mix[i] = rng();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setAttribute("aMix", new THREE.BufferAttribute(mix, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uSize: { value: opts.size ?? 0.4 },
      cA: { value: new THREE.Color(opts.a ?? "#3ad6c8") },
      cB: { value: new THREE.Color(opts.b ?? "#f6c66a") },
      uDrift: { value: opts.drift ?? 0 },
      uRain: { value: opts.rain ? 1 : 0 },
      uFall: { value: opts.fall ?? 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
```

- [ ] **Step 2: `src/shared/three/soft-sprite.ts`** (from `scene13.js` lines 32–39)

```ts
import * as THREE from "three";

/** Round radial-gradient sprite used for moons, halos, glows, mist and shadows. */
export function softSprite(
  color: THREE.ColorRepresentation,
  size: number,
  opacity = 0.5,
  additive = true,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
  );
  sprite.scale.set(size, size, 1);
  return sprite;
}
```

- [ ] **Step 3: `src/shared/three/dispose.ts`**

```ts
import * as THREE from "three";

/** Frees every geometry, material, texture and instance buffer under `root`. */
export function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    const { geometry, material } = object as Partial<THREE.Mesh>;
    if (geometry) geometries.add(geometry);
    if (material) for (const m of Array.isArray(material) ? material : [material]) materials.add(m);
  });
  for (const material of materials) {
    for (const value of Object.values(material))
      if (value instanceof THREE.Texture) textures.add(value);
    if (material instanceof THREE.ShaderMaterial) {
      for (const uniform of Object.values(material.uniforms)) {
        if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
      }
    }
    material.dispose();
  }
  textures.forEach((t) => t.dispose());
  geometries.forEach((g) => g.dispose());
}
```

- [ ] **Step 4: `src/shared/three/stage.ts`** (renderer settings from `scene13.js` lines 88–92, resize from lines 300–301, `project` from line 295)

```ts
import * as THREE from "three";
import { disposeObject } from "./dispose";

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface Stage {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  project(point: THREE.Vector3): ScreenPoint;
  pointer(event: PointerEvent): { x: number; y: number };
  start(frame: (time: number, dt: number) => void): void;
  stop(): void;
  dispose(): void;
}

/** Full-size canvas with the v13 renderer settings and a pausable render loop. Throws without WebGL. */
export function createStage(container: HTMLElement): Stage {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  container.append(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
  } catch (err) {
    canvas.remove();
    throw err;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  const scene = new THREE.Scene();
  const projected = new THREE.Vector3();
  const t0 = performance.now();
  let width = 1;
  let height = 1;
  let raf = 0;
  let last = 0;

  const resize = (): void => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const stop = (): void => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  return {
    canvas,
    renderer,
    scene,
    camera,
    project: (point) => {
      projected.copy(point).project(camera);
      return {
        x: ((projected.x + 1) / 2) * width,
        y: ((1 - projected.y) / 2) * height,
        visible: projected.z < 1,
      };
    },
    pointer: (event) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - r.left) / r.width) * 2 - 1,
        y: -(((event.clientY - r.top) / r.height) * 2 - 1),
      };
    },
    start: (frame) => {
      stop();
      last = 0;
      const loop = (now: number): void => {
        raf = requestAnimationFrame(loop);
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        resize();
        frame((now - t0) / 1000, dt);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
    },
    stop,
    dispose: () => {
      stop();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/three
git commit -m "feat(shared): add Three.js stage, glow points and soft sprites"
```

---

### Task 4: Contract and Markdown story parser

**Files:**

- Create: `src/app/contract.ts`, `src/app/story/parse.ts`, `src/app/story/parse.test.ts`

**Interfaces:**

- Produces:
  - everything in `contract.ts` below, verbatim, because every later task uses these names;
  - `parseStory(source: string, file: string): Story`;
  - `renderInline(source: string): { text: string; html: string }`;
  - `class StoryParseError extends Error`.

- [ ] **Step 1: Write `src/app/contract.ts`** (types only, plus two identity helpers)

```ts
/** Story languages: Guadeloupean Creole (ISO 639-3), French, English. */
export type Lang = "gcf" | "fr" | "en";
export const LANGS: readonly Lang[] = ["gcf", "fr", "en"];

export interface StoryBlock {
  kind: "text" | "dialogue";
  /** Plain text, Markdown markers removed. Dialogue keeps its leading "– ". */
  text: string;
  /** Escaped HTML with <em>/<strong> only. */
  html: string;
}

export interface StoryPage {
  id: string;
  label: string;
  title: string;
  blocks: StoryBlock[];
  summary?: string;
}

export interface Story {
  lang: Lang;
  title: string;
  pages: StoryPage[];
}

/** Every language file of a book; only Kréyòl is required. */
export interface Stories {
  gcf: Story;
  fr?: Story;
  en?: Story;
}

export interface ScreenAnchor {
  x: number;
  y: number;
  visible: boolean;
}

/** Shared speech bubble; `anchor` is polled every frame while the bubble is shown. */
export interface Bubble {
  show(text: string, anchor: () => ScreenAnchor): void;
  hide(): void;
}

export interface BookCard {
  title: string;
  sub: string;
  theme: string;
}

export interface BookContext {
  /** Story in the current reading language (Kréyòl when Bileng). */
  story: Story;
  page: number;
  bubble: Bubble;
}

export interface BookHandle {
  /** Target page; the world animates towards it. */
  setPage(index: number): void;
  setStory(story: Story): void;
  /** Must stop the render loop and release GPU resources. */
  dispose(): void;
}

export interface BookWorld {
  mount(container: HTMLElement, ctx: BookContext): BookHandle | Promise<BookHandle>;
}

export interface BookManifest {
  id: string;
  order: number;
  ready: boolean;
  card: BookCard;
  /** Paints the card cover; the tree calls it on a 512×720 canvas. Locked books omit it. */
  cover?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Lazy world module; its import also pulls the book's theme.css. Absent when !ready. */
  world?: () => Promise<{ default: BookWorld }>;
}

export interface TreeContext {
  books: BookManifest[];
  bubble: Bubble;
  onEnter(bookId: string): void;
}

export interface TreeHandle {
  /** Resolves when the dive animation ends and the flash may cover the screen. */
  dive(bookId: string): Promise<void>;
  pause(): void;
  /** Restarts the loop; with a book id, the camera is back at that book's card. */
  resume(fromBookId?: string): void;
  dispose(): void;
}

/** Mounts the tree universe. Throws when WebGL is unavailable. */
export type MountTree = (container: HTMLElement, ctx: TreeContext) => TreeHandle;

/** Identity helper giving type checking to a book's `book.ts`. */
export function defineBook(manifest: BookManifest): BookManifest {
  return manifest;
}

/** Identity helper giving type checking to a book's world module. */
export function defineWorld(world: BookWorld): BookWorld {
  return world;
}
```

- [ ] **Step 2: Write the failing parser tests** — `src/app/story/parse.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { parseStory } from "./parse";

const md = (body: string, lang = "gcf"): string =>
  `---\nlang: ${lang}\ntitle: Ti Kannot é Gwo Rako\n---\n\n${body}`;

const PAGE = "## Larivyè Klè {#ye-krik}\n\n<!-- label: Yé krik ! -->\n\nOn lè, té ni on larivyè.\n";

describe("parseStory", () => {
  it("reads the front matter", () => {
    const story = parseStory(md(PAGE), "story/gcf.md");
    expect(story).toMatchObject({ lang: "gcf", title: "Ti Kannot é Gwo Rako" });
  });

  it("starts a page on each ## heading, with its id, label and title", () => {
    const story = parseStory(
      md(`${PAGE}\n## « Poukwa ? » {#on-lide-gwo-rako}\n\nGwo Rako pran on kalbas.\n`),
      "story/gcf.md",
    );
    expect(story.pages.map((p) => [p.id, p.label, p.title])).toEqual([
      ["ye-krik", "Yé krik !", "Larivyè Klè"],
      ["on-lide-gwo-rako", "", "« Poukwa ? »"],
    ]);
  });

  it("reads the > summary", () => {
    const story = parseStory(
      md("## Rivière Claire {#ye-krik}\n\n> Il était une fois\n> une rivière.\n\nTexte.\n", "fr"),
      "story/fr.md",
    );
    expect(story.pages[0].summary).toBe("Il était une fois une rivière.");
    expect(story.pages[0].blocks).toHaveLength(1);
  });

  it("joins wrapped lines and splits – dialogue lines, even without a blank line", () => {
    const story = parseStory(
      md(
        "## T {#a}\n\nGwo Rako pran\non kalbas.\n\n– Poukwa ou ka pran dlo-tala ?\n– Pou jou ké rivé !\n",
      ),
      "story/gcf.md",
    );
    expect(story.pages[0].blocks).toEqual([
      { kind: "text", text: "Gwo Rako pran on kalbas.", html: "Gwo Rako pran on kalbas." },
      {
        kind: "dialogue",
        text: "– Poukwa ou ka pran dlo-tala ?",
        html: "– Poukwa ou ka pran dlo-tala ?",
      },
      { kind: "dialogue", text: "– Pou jou ké rivé !", html: "– Pou jou ké rivé !" },
    ]);
  });

  it("renders *italic* and **bold** and escapes everything else", () => {
    const story = parseStory(md(`## T {#a}\n\n**Gwo** *Rako* <b>&"'</b>\n`), "story/gcf.md");
    expect(story.pages[0].blocks[0]).toEqual({
      kind: "text",
      text: `Gwo Rako <b>&"'</b>`,
      html: "<strong>Gwo</strong> <em>Rako</em> &lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;",
    });
  });

  it.each([
    ["no front matter", "## T {#a}\n\nX\n", "gcf.md", /gcf\.md:1: missing front matter/],
    ["unknown lang", md(PAGE, "de"), "de.md", /de\.md:1: unknown lang "de"/],
    ["lang not matching the file", md(PAGE, "fr"), "gcf.md", /gcf\.md:1: lang "fr" does not match/],
    [
      "heading without id",
      md("## Larivyè Klè\n\nX\n"),
      "gcf.md",
      /gcf\.md:6: page heading needs an id/,
    ],
    [
      "duplicate id",
      md(`${PAGE}\n## Bis {#ye-krik}\n\nX\n`),
      "gcf.md",
      /duplicate page id "ye-krik"/,
    ],
    [
      "text before the first page",
      md(`Intro.\n\n${PAGE}`),
      "gcf.md",
      /gcf\.md:6: text before the first page/,
    ],
    [
      "page without text",
      md("## T {#a}\n\n<!-- label: A -->\n"),
      "gcf.md",
      /gcf\.md:6: page "a" has no text/,
    ],
  ])("rejects %s", (_, source, file, error) => {
    expect(() => parseStory(source, `story/${file}`)).toThrow(error);
  });
});
```

- [ ] **Step 3: Run them and confirm they fail**

Run: `pnpm test src/app/story`
Expected: FAIL, "Cannot find module './parse'".

- [ ] **Step 4: Implement** — `src/app/story/parse.ts`

```ts
import { LANGS, type Lang, type Story, type StoryPage } from "../contract";

/** Thrown for a malformed story file; the message starts with `file:line:`. */
export class StoryParseError extends Error {}

const HEADING = /^##\s+(.+?)\s+\{#([a-z0-9]+(?:-[a-z0-9]+)*)\}$/;
const LABEL = /^<!--\s*label:\s*(.*?)\s*-->$/;
const META = /^([a-z]+):\s*(.*)$/;
const DIALOGUE = "– ";
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Renders `**bold**` and `*italic*` to escaped HTML, and strips them for plain text. */
export function renderInline(source: string): { text: string; html: string } {
  const html = source
    .replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
  const text = source.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
  return { text, html };
}

const isLang = (value: string | undefined): value is Lang => LANGS.includes(value as Lang);

/** Parses one `story/<lang>.md` file; `file` names errors and must end with `<lang>.md`. */
export function parseStory(source: string, file: string): Story {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const fail = (line: number, message: string): never => {
    throw new StoryParseError(`${file}:${line}: ${message}`);
  };

  if (lines[0]?.trim() !== "---") fail(1, "missing front matter");
  const meta = new Map<string, string>();
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const match = META.exec(line);
    if (!match) return fail(i + 1, `invalid front matter line "${line}"`);
    meta.set(match[1], match[2].trim());
  }
  if (i >= lines.length) fail(1, "unterminated front matter");
  const lang = meta.get("lang");
  if (!isLang(lang)) return fail(1, `unknown lang "${lang ?? ""}"`);
  if (file.split("/").pop() !== `${lang}.md`)
    fail(1, `lang "${lang}" does not match the file name`);
  const title = meta.get("title");
  if (!title) return fail(1, "missing title");

  const pages: StoryPage[] = [];
  const ids = new Set<string>();
  let page: StoryPage | null = null;
  let pageLine = 0;
  let paragraph: string[] = [];
  let quote: string[] = [];

  const flushParagraph = (): void => {
    if (!page || paragraph.length === 0) return;
    const text = paragraph.join(" ");
    page.blocks.push({
      kind: text.startsWith(DIALOGUE) ? "dialogue" : "text",
      ...renderInline(text),
    });
    paragraph = [];
  };
  const flushQuote = (): void => {
    if (!page || quote.length === 0) return;
    const summary = renderInline(quote.join(" ")).text;
    page.summary = page.summary ? `${page.summary} ${summary}` : summary;
    quote = [];
  };
  const closePage = (): void => {
    flushParagraph();
    flushQuote();
    if (!page) return;
    if (page.blocks.length === 0) fail(pageLine, `page "${page.id}" has no text`);
    pages.push(page);
    page = null;
  };

  for (i += 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const n = i + 1;
    if (line.startsWith("## ")) {
      closePage();
      const match = HEADING.exec(line);
      if (!match) return fail(n, "page heading needs an id: ## Title {#id}");
      const [, pageTitle, id] = match;
      if (ids.has(id)) fail(n, `duplicate page id "${id}"`);
      ids.add(id);
      page = { id, label: "", title: pageTitle, blocks: [] };
      pageLine = n;
      continue;
    }
    if (line === "") {
      flushParagraph();
      flushQuote();
      continue;
    }
    if (!page) return fail(n, "text before the first page heading");
    const label = LABEL.exec(line);
    if (label) {
      page.label = label[1];
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }
    flushQuote();
    if (line.startsWith(DIALOGUE)) flushParagraph();
    paragraph.push(line);
  }
  closePage();
  return { lang, title, pages };
}
```

> 💡 **Note**: TypeScript does not track `page = null` inside `closePage`. If it complains that `page` is `never` after the loop, declare the variable as `let page = null as StoryPage | null;`.

- [ ] **Step 5: Run the tests**

Run: `pnpm test src/app/story && pnpm typecheck`
Expected: PASS. If a line-number assertion fails, count lines from the `md()` template: the front matter takes lines 1–4, line 5 is blank, and the body starts on line 6.

- [ ] **Step 6: Commit**

```bash
git add src/app/contract.ts src/app/story
git commit -m "feat(app): add universe contract and Markdown story parser"
```

---

### Task 5: Registry and reading languages

**Files:**

- Create: `src/app/registry.ts`, `src/app/registry.test.ts`, `src/app/languages.ts`, `src/app/languages.test.ts`

**Interfaces:**

- Consumes: `BookManifest`, `Stories`, `Story`, `Lang` (Task 4) and `parseStory` (Task 4).
- Produces:
  - `createRegistry(manifests: Record<string, { default: BookManifest }>, stories: Record<string, () => Promise<string>>): Registry`
  - `interface Registry { books: BookManifest[]; loadStories(bookId: string): Promise<Stories> }`
  - `const registry: Registry`, built from the real globs;
  - `type ReadingLang = "gcf" | "bi" | "fr" | "en"`
  - `LANG_NAMES: Record<ReadingLang, string>`
  - `readingLangs(stories: Stories): ReadingLang[]`
  - `storyFor(stories: Stories, lang: ReadingLang): Story`

- [ ] **Step 1: Write the failing tests**

`src/app/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BookManifest } from "./contract";
import { createRegistry } from "./registry";

const manifest = (id: string, order: number): { default: BookManifest } => ({
  default: { id, order, ready: false, card: { title: id, sub: "", theme: "" } },
});
const gcf = "---\nlang: gcf\ntitle: Liv\n---\n\n## Paj {#paj}\n\n<!-- label: Paj en -->\n\nTèks.\n";
const fr = "---\nlang: fr\ntitle: Liv\n---\n\n## Page {#paj}\n\nTexte.\n";

describe("createRegistry", () => {
  it("discovers books and sorts them by order", () => {
    const registry = createRegistry(
      { "../books/b/book.ts": manifest("b", 2), "../books/a/book.ts": manifest("a", 1) },
      {},
    );
    expect(registry.books.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("rejects a manifest whose id differs from its folder", () => {
    expect(() => createRegistry({ "../books/a/book.ts": manifest("z", 1) }, {})).toThrow(
      /must match its folder "a"/,
    );
  });

  it("rejects duplicate order values", () => {
    expect(() =>
      createRegistry(
        { "../books/a/book.ts": manifest("a", 1), "../books/b/book.ts": manifest("b", 1) },
        {},
      ),
    ).toThrow(/order/);
  });

  it("loads a book's stories and fills missing labels from Kréyòl", async () => {
    const registry = createRegistry(
      { "../books/a/book.ts": manifest("a", 1) },
      {
        "../books/a/story/gcf.md": async () => gcf,
        "../books/a/story/fr.md": async () => fr,
        "../books/b/story/gcf.md": async () => gcf,
      },
    );
    const stories = await registry.loadStories("a");
    expect(stories.gcf.pages[0].title).toBe("Paj");
    expect(stories.fr?.pages[0]).toMatchObject({ title: "Page", label: "Paj en" });
    expect(stories.en).toBeUndefined();
  });

  it("rejects a book without story/gcf.md", async () => {
    const registry = createRegistry({ "../books/a/book.ts": manifest("a", 1) }, {});
    await expect(registry.loadStories("a")).rejects.toThrow(/story\/gcf\.md/);
  });
});
```

`src/app/languages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Stories, Story } from "./contract";
import { readingLangs, storyFor } from "./languages";

const story = (lang: Story["lang"]): Story => ({ lang, title: "Liv", pages: [] });

describe("reading languages", () => {
  it("offers Kréyòl alone when there is no translation", () => {
    expect(readingLangs({ gcf: story("gcf") })).toEqual(["gcf"]);
  });

  it("offers Bileng and Français with fr.md, English with en.md", () => {
    const stories: Stories = { gcf: story("gcf"), fr: story("fr"), en: story("en") };
    expect(readingLangs(stories)).toEqual(["gcf", "bi", "fr", "en"]);
  });

  it("uses Kréyòl for Bileng and for any missing language", () => {
    const stories: Stories = { gcf: story("gcf"), fr: story("fr") };
    expect(storyFor(stories, "bi").lang).toBe("gcf");
    expect(storyFor(stories, "fr").lang).toBe("fr");
    expect(storyFor(stories, "en").lang).toBe("gcf");
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test src/app/registry src/app/languages`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/app/registry.ts`:

```ts
import type { BookManifest, Lang, Stories, Story } from "./contract";
import { parseStory } from "./story/parse";

type ManifestModules = Record<string, { default: BookManifest }>;
type StoryLoaders = Record<string, () => Promise<string>>;

export interface Registry {
  books: BookManifest[];
  loadStories(bookId: string): Promise<Stories>;
}

const BOOK_PATH = /\/books\/([^/]+)\/book\.ts$/;
const STORY_PATH = /\/books\/([^/]+)\/story\/[^/]+\.md$/;

/** Copies Kréyòl labels onto pages of a translation that do not set their own. */
function withLabels(story: Story, source: Story): Story {
  const labels = new Map(source.pages.map((p) => [p.id, p.label]));
  return {
    ...story,
    pages: story.pages.map((p) => (p.label ? p : { ...p, label: labels.get(p.id) ?? "" })),
  };
}

/** Builds the book registry from glob results; validates folder ids and unique order values. */
export function createRegistry(manifests: ManifestModules, stories: StoryLoaders): Registry {
  const books = Object.entries(manifests).map(([path, module]) => {
    const folder = BOOK_PATH.exec(path)?.[1];
    const book = module.default;
    if (book.id !== folder) {
      throw new Error(`${path}: id "${book.id}" must match its folder "${folder ?? "?"}"`);
    }
    return book;
  });
  if (new Set(books.map((b) => b.order)).size !== books.length) {
    throw new Error("book order values must be unique");
  }
  books.sort((a, b) => a.order - b.order);

  return {
    books,
    async loadStories(bookId) {
      const files = Object.entries(stories).filter(
        ([path]) => STORY_PATH.exec(path)?.[1] === bookId,
      );
      const parsed = await Promise.all(
        files.map(async ([path, load]) => parseStory(await load(), path)),
      );
      const byLang: Partial<Record<Lang, Story>> = {};
      for (const story of parsed) byLang[story.lang] = story;
      const gcf = byLang.gcf;
      if (!gcf) throw new Error(`book "${bookId}" has no story/gcf.md`);
      return {
        gcf,
        fr: byLang.fr && withLabels(byLang.fr, gcf),
        en: byLang.en && withLabels(byLang.en, gcf),
      };
    },
  };
}

export const registry = createRegistry(
  import.meta.glob<{ default: BookManifest }>("../books/*/book.ts", { eager: true }),
  import.meta.glob<string>("../books/*/story/*.md", { query: "?raw", import: "default" }),
);
```

`src/app/languages.ts`:

```ts
import type { Stories, Story } from "./contract";

/** Reading modes of the language switch; `bi` shows Kréyòl with French underneath. */
export type ReadingLang = "gcf" | "bi" | "fr" | "en";

export const LANG_NAMES: Record<ReadingLang, string> = {
  gcf: "Kréyòl",
  bi: "Bileng",
  fr: "Français",
  en: "English",
};

/** Modes available for a book, in switch order. */
export function readingLangs(stories: Stories): ReadingLang[] {
  const langs: ReadingLang[] = ["gcf"];
  if (stories.fr) langs.push("bi", "fr");
  if (stories.en) langs.push("en");
  return langs;
}

/** Story shown (and given to the world) for a mode; Kréyòl for Bileng or a missing language. */
export function storyFor(stories: Stories, lang: ReadingLang): Story {
  if (lang === "fr" && stories.fr) return stories.fr;
  if (lang === "en" && stories.en) return stories.en;
  return stories.gcf;
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/app && pnpm typecheck && pnpm lint`
Expected: PASS. `registry` sees no books yet, which is fine.

- [ ] **Step 5: Commit**

```bash
git add src/app/registry.ts src/app/registry.test.ts src/app/languages.ts src/app/languages.test.ts
git commit -m "feat(app): add book registry and reading languages"
```

---

### Task 6: Book manifests, Ti Kannot stories and staging

**Files:**

- Create:
  - `src/books/ti-kannot/{book.ts,cover.ts,staging.ts,story/gcf.md,story/fr.md}`
  - `src/books/zanba/book.ts`
  - `src/books/konpe-lapen/book.ts`
  - `src/books/books.test.ts`
  - `src/books/v13-conversion.test.ts`
- Modify: `src/main.ts`, which stops importing `src/content`.
- Remove (after user confirmation): `src/content/`

**Interfaces:**

- Consumes: `defineBook` (Task 4), `registry` (Task 5), `createRng` (Task 2).
- Produces:
  - `STAGING: Record<string, PageEnv>` and `type PageEnv`, `type Moon` from `src/books/ti-kannot/staging.ts`;
  - `paintCover(ctx, width, height)` from `src/books/ti-kannot/cover.ts`;
  - the Ti Kannot page ids, used as `staging.ts` keys:
    `ye-krik, ti-kannot-e-gwo-rako, on-lide-gwo-rako, larivye-la-ka-desann, sa-ti-kannot-jwenn, gwo-rako-vle-sous-la, on-mache, demen-maten, sa-dlo-la-ka-aprann, denye-leson-la, on-nouvo-rezev, ye-mistrikrik`.

- [ ] **Step 1: Write the failing tests**

`src/books/books.test.ts`:

```ts
import { registry } from "@app/registry";
import { describe, expect, it } from "vitest";

const storyFolders = new Set(
  Object.keys(import.meta.glob("./*/story/gcf.md")).map((p) => p.split("/")[1]),
);
const stagings = import.meta.glob<{ STAGING: Record<string, unknown> }>("./*/staging.ts", {
  eager: true,
});

describe("books", () => {
  it("have unique ids and order values", () => {
    const { books } = registry;
    expect(new Set(books.map((b) => b.id)).size).toBe(books.length);
    expect(new Set(books.map((b) => b.order)).size).toBe(books.length);
  });

  describe.each(registry.books.map((b) => [b.id, b] as const))("%s", (id, book) => {
    it("is enterable only with a world, a cover, a story and a staging", () => {
      if (!book.ready) return;
      expect(book.world).toBeTypeOf("function");
      expect(book.cover).toBeTypeOf("function");
      expect(storyFolders.has(id)).toBe(true);
      expect(stagings[`./${id}/staging.ts`]).toBeDefined();
    });

    it("shares its page ids across languages and labels every Kréyòl page", async () => {
      if (!storyFolders.has(id)) return;
      const stories = await registry.loadStories(id);
      const ids = stories.gcf.pages.map((p) => p.id);
      for (const translation of [stories.fr, stories.en]) {
        if (translation) expect(translation.pages.map((p) => p.id)).toEqual(ids);
      }
      expect(stories.gcf.pages.every((p) => p.label !== "")).toBe(true);
      const staging = stagings[`./${id}/staging.ts`];
      if (staging) expect(Object.keys(staging.STAGING).sort()).toEqual([...ids].sort());
    });
  });
});
```

`src/books/v13-conversion.test.ts`:

```ts
import { registry } from "@app/registry";
import type { StoryPage } from "@app/contract";
import { describe, expect, it } from "vitest";
import v13Source from "../../design/v13/kont-data.js?raw";
import { STAGING } from "./ti-kannot/staging";

interface V13Text {
  t: string;
  b: string;
  g?: string;
}
interface V13Page {
  label: string;
  kr: V13Text;
  fr: V13Text;
  env: unknown;
}

/** Reads PAGES from the mockup data file (a JSON array literal). */
function v13Pages(): V13Page[] {
  const match = /export const PAGES = (\[[\s\S]*\]);?\s*$/.exec(v13Source);
  if (!match) throw new Error("PAGES not found in kont-data.js");
  return JSON.parse(match[1]) as V13Page[];
}

const plain = (page: StoryPage | undefined): string =>
  page ? page.blocks.map((b) => b.text).join(" ") : "";

const IDS = [
  "ye-krik",
  "ti-kannot-e-gwo-rako",
  "on-lide-gwo-rako",
  "larivye-la-ka-desann",
  "sa-ti-kannot-jwenn",
  "gwo-rako-vle-sous-la",
  "on-mache",
  "demen-maten",
  "sa-dlo-la-ka-aprann",
  "denye-leson-la",
  "on-nouvo-rezev",
  "ye-mistrikrik",
];

describe("Ti Kannot conversion from v13", () => {
  it("uses the ids derived from the v13 labels", async () => {
    const { gcf } = await registry.loadStories("ti-kannot");
    expect(gcf.pages.map((p) => p.id)).toEqual(IDS);
  });

  it("keeps every Kréyòl and French word, label and gloss", async () => {
    const { gcf, fr } = await registry.loadStories("ti-kannot");
    const pages = v13Pages();
    expect(gcf.pages).toHaveLength(pages.length);
    pages.forEach((v13, i) => {
      expect(gcf.pages[i].label).toBe(v13.label);
      expect(gcf.pages[i].title).toBe(v13.kr.t);
      expect(plain(gcf.pages[i])).toBe(v13.kr.b);
      expect(fr?.pages[i].title).toBe(v13.fr.t);
      expect(plain(fr?.pages[i])).toBe(v13.fr.b);
      expect(fr?.pages[i].summary).toBe(v13.kr.g);
    });
  });

  it("keeps every page's staging", () => {
    v13Pages().forEach((v13, i) => expect(STAGING[IDS[i]]).toEqual(v13.env));
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test src/books`
Expected: FAIL. `./ti-kannot/staging` is missing, and the registry has no `ti-kannot` book.

- [ ] **Step 3: Generate the stories and the staging.** Save this one-off script **outside the repo**, as `$SCRATCH/v13-to-md.mjs` (use your scratchpad directory). Run it from the repo root:

```js
// One-off: converts design/v13/kont-data.js into Ti Kannot's Markdown stories and staging.ts.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { PAGES } = await import(pathToFileURL(resolve("design/v13/kont-data.js")).href);

const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** v13 display rule: `s.replace(/\s–\s/g, "\n– ")`; consecutive dialogue lines stay together. */
const body = (text) => {
  const out = [];
  for (const line of text.replace(/\s–\s/g, "\n– ").split("\n")) {
    const previous = out.at(-1);
    if (line.startsWith("– ") && previous?.startsWith("– "))
      out[out.length - 1] = `${previous}\n${line}`;
    else out.push(line);
  }
  return out.join("\n\n");
};

const page = (p, lang) => {
  const text = lang === "gcf" ? p.kr : p.fr;
  const lines = [`## ${text.t} {#${slug(p.label)}}`, ""];
  if (lang === "gcf") lines.push(`<!-- label: ${p.label} -->`, "");
  if (lang === "fr") lines.push(`> ${p.kr.g}`, "");
  lines.push(body(text.b), "");
  return lines.join("\n");
};

const story = (lang) =>
  [
    "---",
    `lang: ${lang}`,
    "title: Ti Kannot é Gwo Rako",
    "---",
    "",
    ...PAGES.map((p) => page(p, lang)),
  ].join("\n");

const dir = "src/books/ti-kannot/story";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/gcf.md`, story("gcf"));
writeFileSync(`${dir}/fr.md`, story("fr"));

const header = `// Page-by-page staging of « Ti Kannot é Gwo Rako », keyed by story page id (from mockup v13).

/** Moon placement: x, y, z offset from the camera, colour, scale. */
export type Moon = [number, number, number, string, number];

/** Scene parameters of one page; the world interpolates them between pages. Weights are 0..1. */
export interface PageEnv {
  /** Sky gradient: [top, bottom]. */
  sky: [string, string];
  /** Water level offset (world units, negative = river drying up). */
  water: number;
  moon: Moon;
  stars: number;
  rain: number;
  glow: number;
  /** Ti Kannot position relative to the river station: [x, y, z]. */
  bird: [number, number, number];
  /** Gwo Rako position relative to the river station: [x, z], or null when absent. */
  crab: [number, number] | null;
  /** Number of calabashes stacked next to Gwo Rako. */
  kalbas: number;
  dam: number;
  warm: number;
  spring?: number;
  tank?: number;
  empty?: number;
}

`;
const staging = Object.fromEntries(PAGES.map((p) => [slug(p.label), p.env]));
writeFileSync(
  "src/books/ti-kannot/staging.ts",
  `${header}export const STAGING: Record<string, PageEnv> = ${JSON.stringify(staging, null, 2)};\n`,
);
```

Run:

```bash
node "$SCRATCH/v13-to-md.mjs"
pnpm exec prettier --write src/books/ti-kannot
```

Then open `story/gcf.md` and check that page 3 reads like the spec §4 example: a narration paragraph, a blank line, then the `– ` lines on consecutive lines.

- [ ] **Step 4: Write the manifests and the cover**

`src/books/ti-kannot/book.ts`. It stays `ready: false` with no `world` until Task 12:

```ts
import { defineBook } from "@app/contract";
import { paintCover } from "./cover";

export default defineBook({
  id: "ti-kannot",
  order: 1,
  ready: false,
  card: { title: "Ti Kannot é Gwo Rako", sub: "Larivyè-la té swèf", theme: "Dlo · L’eau" },
  cover: paintCover,
});
```

`src/books/zanba/book.ts`:

```ts
import { defineBook } from "@app/contract";

export default defineBook({
  id: "zanba",
  order: 2,
  ready: false,
  card: { title: "Zanba é Lapen", sub: "Talè…", theme: "Riz · La ruse" },
});
```

`src/books/konpe-lapen/book.ts`:

```ts
import { defineBook } from "@app/contract";

export default defineBook({
  id: "konpe-lapen",
  order: 3,
  ready: false,
  card: { title: "Konpè Lapen", sub: "Talè…", theme: "Chimen · Le voyage" },
});
```

`src/books/ti-kannot/cover.ts` is a port of `scene13.js` lines 45–75: the ready branch of `coverTex`, with `x` renamed to `c`. The tree paints the frame and the title on top.

```ts
import { createRng } from "@shared/random";

/** Paints Ti Kannot's card: night river, moon, the golden bird on a branch, the red crab. */
export function paintCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(23);
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b1f33");
  bg.addColorStop(0.55, "#155a63");
  bg.addColorStop(1, "#0a2a30");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = `rgba(255,240,200,${rnd() * 0.05})`;
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  const mx = W * 0.68,
    my = H * 0.24,
    mr = 46;
  const glow = c.createRadialGradient(mx, my, mr, mx, my, mr * 4);
  glow.addColorStop(0, "rgba(246,211,138,.35)");
  glow.addColorStop(1, "rgba(246,211,138,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#f6e3b0";
  c.beginPath();
  c.arc(mx, my, mr, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 90; i++) {
    c.fillStyle = `rgba(255,245,220,${0.3 + rnd() * 0.6})`;
    c.beginPath();
    c.arc(rnd() * W, rnd() * H * 0.45, 0.8 + rnd() * 1.6, 0, Math.PI * 2);
    c.fill();
  }
  // River flowing towards the viewer, moon reflection.
  c.fillStyle = "#2f9a98";
  c.beginPath();
  c.moveTo(W * 0.47, H * 0.5);
  c.quadraticCurveTo(W * 0.3, H * 0.7, W * 0.12, H);
  c.lineTo(W * 0.92, H);
  c.quadraticCurveTo(W * 0.6, H * 0.7, W * 0.53, H * 0.5);
  c.fill();
  for (let i = 0; i < 40; i++) {
    const yy = H * (0.52 + rnd() * 0.46),
      t = (yy - H * 0.5) / (H * 0.5);
    c.strokeStyle = `rgba(255,240,200,${0.15 + rnd() * 0.5})`;
    c.lineWidth = 1 + rnd() * 1.5;
    const cx = W * (0.5 + t * 0.18) + (rnd() - 0.5) * W * 0.25 * t;
    c.beginPath();
    c.moveTo(cx, yy);
    c.lineTo(cx + 8 + rnd() * 24, yy);
    c.stroke();
  }
  c.fillStyle = "#071c22";
  c.beginPath();
  c.moveTo(0, H * 0.5);
  c.quadraticCurveTo(W * 0.25, H * 0.42, W * 0.47, H * 0.5);
  c.quadraticCurveTo(W * 0.3, H * 0.7, W * 0.12, H);
  c.lineTo(0, H);
  c.fill();
  c.beginPath();
  c.moveTo(W, H * 0.5);
  c.quadraticCurveTo(W * 0.75, H * 0.44, W * 0.53, H * 0.5);
  c.quadraticCurveTo(W * 0.6, H * 0.7, W * 0.92, H);
  c.lineTo(W, H);
  c.fill();
  // Ti Kannot (golden bird) on a branch at the left, Gwo Rako (crab) at the right.
  c.strokeStyle = "#c98a4a";
  c.lineWidth = 4;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(0, H * 0.6);
  c.quadraticCurveTo(W * 0.12, H * 0.56, W * 0.24, H * 0.58);
  c.stroke();
  c.fillStyle = "#f2c46d";
  c.beginPath();
  c.ellipse(W * 0.2, H * 0.555, 14, 9, -0.3, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(W * 0.225, H * 0.535, 6.5, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(W * 0.187, H * 0.552);
  c.lineTo(W * 0.155, H * 0.53);
  c.lineTo(W * 0.16, H * 0.56);
  c.fill();
  c.fillStyle = "#e07a3a";
  c.beginPath();
  c.moveTo(W * 0.237, H * 0.535);
  c.lineTo(W * 0.26, H * 0.54);
  c.lineTo(W * 0.237, H * 0.545);
  c.fill();
  const rx = W * 0.78,
    ry = H * 0.66;
  c.fillStyle = "#d9603a";
  c.beginPath();
  c.ellipse(rx, ry, 30, 19, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#d9603a";
  c.lineWidth = 4;
  for (const d of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(rx + d * 22, ry + i * 5);
      c.lineTo(rx + d * (36 + i * 6), ry + 8 + i * 7);
      c.lineTo(rx + d * (42 + i * 6), ry + 20 + i * 5);
      c.stroke();
    }
  }
  for (const d of [-1, 1]) {
    c.beginPath();
    c.arc(rx + d * 40, ry - 16, 11, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f6e3b0";
    c.beginPath();
    c.arc(rx + d * 8, ry - 22, 4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d9603a";
  }
  for (let i = 0; i < 26; i++) {
    c.fillStyle = `rgba(90,230,210,${0.4 + rnd() * 0.6})`;
    c.beginPath();
    c.arc(rnd() * W, H * (0.55 + rnd() * 0.45), 1 + rnd() * 2.2, 0, Math.PI * 2);
    c.fill();
  }
}
```

- [ ] **Step 5: Point `src/main.ts` at the registry** (the bootstrap stays until Task 11). Replace the `TALES` import with `import { registry } from "@app/registry";`, and change the last line to:

```ts
if (count)
  count.textContent = `${registry.books.filter((b) => b.ready).length} / ${registry.books.length} kont`;
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, including every assertion in `v13-conversion.test.ts`. If a text assertion fails, fix the **script** and regenerate. Never hand-edit words.

- [ ] **Step 7: Remove the old content folder.** Ask the user to confirm, then:

```bash
trash src/content
pnpm test && pnpm typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A src/books src/main.ts src/content
git commit -m "feat(books): add book manifests and Ti Kannot Markdown stories"
```

---

### Task 7: App shell pieces — paging, flash, notice, fallback, backdrop, bubble

**Files:**

- Create:
  - `src/app/paging.ts`, `src/app/paging.test.ts`
  - `src/app/transition.ts`, `src/app/notice.ts`, `src/app/fallback.ts`, `src/app/backdrop.ts`, `src/app/bubble.ts`
- Modify: `src/style.css`, which is replaced by the shell styles.

**Interfaces:**

- Consumes: `Bubble`, `ScreenAnchor` (Task 4).
- Produces:
  - `createPager(threshold = 60, lockMs = 750): Pager`, where `Pager = { step(dy: number, now: number): -1 | 0 | 1; reset(): void }`;
  - `clampPage(index: number, count: number): number`;
  - `createFlash(root): Flash`, where `Flash = { to(opacity: number, durationMs: number, delayMs?: number): Promise<void> }`. The promise resolves after `delayMs + durationMs`;
  - `showNotice(root, text, ms = 4000): void`, which adds `.app-notice`;
  - `showFallback(root): void`, which adds `.app-fallback`;
  - `createBackdrop(root): void`;
  - `createBubble(root): Bubble & { dispose(): void }`, which adds `.app-bubble`.

- [ ] **Step 1: Write the failing pager test** — `src/app/paging.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { clampPage, createPager } from "./paging";

describe("createPager", () => {
  it("accumulates small deltas until 60 px", () => {
    const pager = createPager();
    expect(pager.step(30, 0)).toBe(0);
    expect(pager.step(40, 10)).toBe(1);
  });

  it("pages backwards on negative deltas", () => {
    expect(createPager().step(-80, 0)).toBe(-1);
  });

  it("locks for 750 ms after a turn and ignores deltas meanwhile", () => {
    const pager = createPager();
    expect(pager.step(100, 0)).toBe(1);
    expect(pager.step(100, 700)).toBe(0);
    expect(pager.step(30, 751)).toBe(0);
    expect(pager.step(40, 760)).toBe(1);
  });

  it("forgets everything on reset", () => {
    const pager = createPager();
    pager.step(100, 0);
    pager.reset();
    expect(pager.step(100, 1)).toBe(1);
  });
});

describe("clampPage", () => {
  it("keeps the index within the book", () => {
    expect(clampPage(-1, 12)).toBe(0);
    expect(clampPage(12, 12)).toBe(11);
    expect(clampPage(5, 12)).toBe(5);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/app/paging`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/app/paging.ts`** (v13 `scrollBy`, `template.html`)

```ts
export interface Pager {
  /** Feeds a wheel/drag delta; returns the page step to take (v13: 60 px, then 750 ms lock). */
  step(dy: number, now: number): -1 | 0 | 1;
  reset(): void;
}

/** Turns continuous scroll input into one page turn per gesture. */
export function createPager(threshold = 60, lockMs = 750): Pager {
  let acc = 0;
  let lockUntil = 0;
  return {
    step(dy, now) {
      if (now < lockUntil) return 0;
      acc += dy;
      if (Math.abs(acc) <= threshold) return 0;
      const direction = acc > 0 ? 1 : -1;
      acc = 0;
      lockUntil = now + lockMs;
      return direction;
    },
    reset() {
      acc = 0;
      lockUntil = 0;
    },
  };
}

/** Restricts a page index to [0, count - 1]. */
export function clampPage(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index));
}
```

- [ ] **Step 4: Run the pager test**

Run: `pnpm test src/app/paging`
Expected: PASS.

- [ ] **Step 5: Implement the DOM pieces**

`src/app/transition.ts`:

```ts
export interface Flash {
  /** Animates the dive flash linearly; resolves once the animation has ended. */
  to(opacity: number, durationMs: number, delayMs?: number): Promise<void>;
}

/** Full-screen flash covering universe swaps (v13 "éclair de plongée"). */
export function createFlash(root: HTMLElement): Flash {
  const el = document.createElement("div");
  el.className = "app-flash";
  root.append(el);
  return {
    to(opacity, durationMs, delayMs = 0) {
      el.style.transition = `opacity ${durationMs}ms linear ${delayMs}ms`;
      el.style.opacity = String(opacity);
      return new Promise((resolve) => setTimeout(resolve, delayMs + durationMs));
    },
  };
}
```

`src/app/notice.ts`:

```ts
/** Short status message at the top of the screen, removed after `ms`. */
export function showNotice(root: HTMLElement, text: string, ms = 4000): void {
  const el = document.createElement("div");
  el.className = "app-notice";
  el.setAttribute("role", "status");
  el.textContent = text;
  root.append(el);
  setTimeout(() => el.remove(), ms);
}
```

`src/app/fallback.ts` (text copied from `template.html`):

```ts
/** Screen shown when WebGL stays unavailable after every retry. */
export function showFallback(root: HTMLElement): void {
  const el = document.createElement("div");
  el.className = "app-fallback";
  el.innerHTML = `
    <div class="app-fallback-title">Pyébwa-la pa ka limé…</div>
    <div class="app-fallback-text">Le navigateur a suspendu l'affichage 3D (WebGL). Recharge l'onglet ; si rien ne change, ferme puis rouvre le navigateur.</div>
    <button type="button">Rechaje</button>`;
  el.querySelector("button")?.addEventListener("click", () => location.reload());
  root.append(el);
}
```

`src/app/backdrop.ts`:

```ts
/** Vignette and film grain laid over every universe (v13 overlay). */
export function createBackdrop(root: HTMLElement): void {
  const vignette = document.createElement("div");
  vignette.className = "app-vignette";
  const grain = document.createElement("div");
  grain.className = "app-grain";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const image = ctx.createImageData(256, 256);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 110 + Math.random() * 60;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    grain.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }
  root.append(vignette, grain);
}
```

`src/app/bubble.ts`:

```ts
import type { Bubble, ScreenAnchor } from "./contract";

/** Speech bubble following a universe-provided screen anchor each frame. */
export function createBubble(root: HTMLElement): Bubble & { dispose(): void } {
  const el = document.createElement("div");
  el.className = "app-bubble";
  root.append(el);
  let anchor: (() => ScreenAnchor) | null = null;
  let raf = 0;

  const follow = (): void => {
    if (!anchor) return;
    const a = anchor();
    if (a.visible) {
      el.style.left = `${a.x}px`;
      el.style.top = `${a.y - 12}px`;
      el.style.opacity = "1";
    } else {
      el.style.opacity = "0";
    }
    raf = requestAnimationFrame(follow);
  };

  const hide = (): void => {
    anchor = null;
    cancelAnimationFrame(raf);
    el.style.opacity = "0";
  };

  return {
    show(text, next) {
      el.textContent = text;
      anchor = next;
      cancelAnimationFrame(raf);
      follow();
    },
    hide,
    dispose() {
      hide();
      el.remove();
    },
  };
}
```

- [ ] **Step 6: Replace `src/style.css`** with the shell styles (values from `template.html`):

```css
[hidden] {
  display: none !important;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  background: #050c12;
}

.app {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #050c12;
  touch-action: none;
  color: #eef3ee;
  font-family: "Quicksand", sans-serif;
  user-select: none;
  -webkit-user-select: none;
}

.app-layer {
  position: absolute;
  inset: 0;
}

.app-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(2, 6, 10, 0.55) 100%);
}

.app-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: overlay;
  opacity: 0.35;
  background-size: 256px 256px;
}

.app-bubble {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -100%);
  max-width: 260px;
  padding: 12px 16px;
  border-radius: 16px 16px 16px 4px;
  background: rgba(246, 234, 208, 0.96);
  color: #0a1e33;
  font:
    italic 600 17px/1.3 "Cormorant Garamond",
    serif;
  text-wrap: pretty;
  white-space: pre-line;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.app-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle at 50% 50%, #dffcf6 0%, #2fa89a 45%, #0a1e33 100%);
}

.app-notice {
  position: absolute;
  left: 50%;
  top: 24px;
  z-index: 40;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(122, 240, 220, 0.35);
  background: rgba(5, 12, 18, 0.7);
  color: #f6ead0;
  font:
    italic 600 18px/1 "Cormorant Garamond",
    serif;
  pointer-events: none;
}

.app-fallback {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 2em;
  text-align: center;
  color: #f6ead0;
}

.app-fallback-title {
  font:
    italic 600 34px/1 "Cormorant Garamond",
    serif;
}

.app-fallback-text {
  max-width: 32ch;
  font:
    400 15px/1.5 "Quicksand",
    sans-serif;
  color: rgba(238, 243, 238, 0.75);
  text-wrap: pretty;
}

.app-fallback button {
  border: 1px solid #7af0dc;
  background: transparent;
  color: #7af0dc;
  font:
    600 12px/1 "Quicksand",
    sans-serif;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 13px 22px;
  border-radius: 999px;
  cursor: pointer;
}

.app-fallback button:hover {
  background: #7af0dc;
  color: #0a1e33;
}
```

- [ ] **Step 7: Verify**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app src/style.css
git commit -m "feat(app): add paging, flash, bubble, notice and fallback"
```

---

### Task 8: Reading UI

**Files:**

- Create: `src/app/reading-ui/reading-ui.ts`, `src/app/reading-ui/reading-ui.css`, `src/app/reading-ui/reading-ui.test.ts`

**Interfaces:**

- Consumes:
  - `Stories`, `StoryPage` (Task 4);
  - `ReadingLang`, `LANG_NAMES`, `readingLangs`, `storyFor` (Task 5).
- Produces:
  - `createReadingUI(root: HTMLElement, events: ReadingEvents): ReadingUI`;
  - `ReadingEvents = { onPage(index: number): void; onLang(lang: ReadingLang): void; onBack(): void }`;
  - `ReadingUI = { open(stories: Stories): void; render(state: ReadingState): void; close(): void }`;
  - `ReadingState = { page: number; lang: ReadingLang; showHint: boolean }`;
  - the DOM classes the app tests rely on:
    - `.reading` (hidden when closed);
    - `.reading-back`;
    - `.reading-langs button[data-lang]` with `aria-pressed`;
    - `.reading-label`, `.reading-num`, `.reading-title`, `.reading-body`, `.reading-gloss`;
    - `.reading-dot` (with `.is-current` and `.is-done`);
    - `.reading-prev`, `.reading-next`, `.reading-hint`.

- [ ] **Step 1: Write the failing test** — `src/app/reading-ui/reading-ui.test.ts`

```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Stories } from "../contract";
import { parseStory } from "../story/parse";
import { createReadingUI, type ReadingEvents } from "./reading-ui";

const GCF = `---
lang: gcf
title: Liv
---

## Paj en {#en}

<!-- label: En -->

Tèks <b>en</b>.

– Bonjou !

## Paj dé {#de}

<!-- label: Dé -->

Tèks dé.
`;
const FR = GCF.replace("lang: gcf", "lang: fr")
  .replace("Paj en", "Page un")
  .replace("Tèks <b>en</b>.", "Texte un.")
  .replace("Paj dé", "Page deux")
  .replace("Tèks dé.", "Texte deux.");

let root: HTMLElement;
let events: ReadingEvents;
let stories: Stories;

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.append(root);
  events = { onPage: vi.fn(), onLang: vi.fn(), onBack: vi.fn() };
  stories = { gcf: parseStory(GCF, "gcf.md"), fr: parseStory(FR, "fr.md") };
});

const $ = (sel: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

describe("reading UI", () => {
  it("shows the page label, number, title and escaped body", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 0, lang: "gcf", showHint: true });
    expect($(".reading").hidden).toBe(false);
    expect($(".reading-label").textContent).toBe("En");
    expect($(".reading-num").textContent).toBe("1 / 2");
    expect($(".reading-title").textContent).toBe("Paj en");
    expect($(".reading-body").innerHTML).toContain("Tèks &lt;b&gt;en&lt;/b&gt;.");
    expect(root.querySelectorAll(".reading-body .reading-dialogue")).toHaveLength(1);
    expect($(".reading-hint").hidden).toBe(false);
  });

  it("shows the French text under the Kréyòl text in Bileng", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 0, lang: "bi", showHint: false });
    expect($(".reading-title").textContent).toBe("Paj en");
    expect($(".reading-gloss").hidden).toBe(false);
    expect($(".reading-gloss").textContent).toContain("Texte un.");
    expect($(".reading-hint").hidden).toBe(true);
  });

  it("offers Kréyòl only when the book has no translation", () => {
    const ui = createReadingUI(root, events);
    ui.open({ gcf: stories.gcf });
    expect([...root.querySelectorAll(".reading-langs button")].map((b) => b.textContent)).toEqual([
      "Kréyòl",
    ]);
  });

  it("marks the language and the dots, and reports clicks", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.render({ page: 1, lang: "fr", showHint: false });
    expect($('.reading-langs [data-lang="fr"]').getAttribute("aria-pressed")).toBe("true");
    const dots = root.querySelectorAll(".reading-dot");
    expect(dots[0].classList.contains("is-done")).toBe(true);
    expect(dots[1].classList.contains("is-current")).toBe(true);
    ($('.reading-langs [data-lang="bi"]') as HTMLButtonElement).click();
    (dots[0] as HTMLButtonElement).click();
    ($(".reading-prev") as HTMLButtonElement).click();
    ($(".reading-back") as HTMLButtonElement).click();
    expect(events.onLang).toHaveBeenCalledWith("bi");
    expect(events.onPage).toHaveBeenCalledWith(0);
    expect(events.onPage).toHaveBeenCalledTimes(2);
    expect(events.onBack).toHaveBeenCalledOnce();
  });

  it("hides itself on close", () => {
    const ui = createReadingUI(root, events);
    ui.open(stories);
    ui.close();
    expect($(".reading").hidden).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/app/reading-ui`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `src/app/reading-ui/reading-ui.ts` (markup and text from `template.html`, "MONDE" section)

```ts
import "./reading-ui.css";
import type { Stories, StoryPage } from "../contract";
import { LANG_NAMES, readingLangs, storyFor, type ReadingLang } from "../languages";

export interface ReadingState {
  page: number;
  lang: ReadingLang;
  showHint: boolean;
}

export interface ReadingEvents {
  onPage(index: number): void;
  onLang(lang: ReadingLang): void;
  onBack(): void;
}

export interface ReadingUI {
  open(stories: Stories): void;
  render(state: ReadingState): void;
  close(): void;
}

const ARROW = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M8 2v12M3 9l5 5 5-5"/></svg>`;
const BACK = `<svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M7 1 2 6l5 5M2 6h17"/></svg>`;
const FADE_MS = 320;

/** Page blocks as paragraphs; block HTML is already escaped by the story parser. */
const blocksHtml = (page: StoryPage): string =>
  page.blocks.map((b) => `<p class="reading-${b.kind}">${b.html}</p>`).join("");

/** Shared reading overlay: text card, language switch, page dots, arrows, back button, hint. */
export function createReadingUI(root: HTMLElement, events: ReadingEvents): ReadingUI {
  const el = document.createElement("div");
  el.className = "reading";
  el.hidden = true;
  el.innerHTML = `
    <button type="button" class="reading-back">${BACK}<span>Pyébwa a Sav</span></button>
    <div class="reading-langs" role="group"></div>
    <article class="reading-card" aria-live="polite">
      <div class="reading-head"><div class="reading-label"></div><div class="reading-num"></div></div>
      <h2 class="reading-title"></h2>
      <div class="reading-body"></div>
      <div class="reading-gloss" hidden></div>
    </article>
    <nav class="reading-dots"></nav>
    <div class="reading-arrows">
      <button type="button" class="reading-prev" aria-label="←">${ARROW}</button>
      <button type="button" class="reading-next" aria-label="→">${ARROW}</button>
    </div>
    <div class="reading-hint" aria-hidden="true"><span>Défilez pou kontinyé</span>${ARROW}</div>`;
  root.append(el);

  const part = <T extends HTMLElement>(selector: string): T => {
    const found = el.querySelector<T>(selector);
    if (!found) throw new Error(`reading UI: missing ${selector}`);
    return found;
  };
  const langs = part(".reading-langs");
  const card = part(".reading-card");
  const label = part(".reading-label");
  const num = part(".reading-num");
  const title = part(".reading-title");
  const body = part(".reading-body");
  const gloss = part(".reading-gloss");
  const dots = part(".reading-dots");
  const hint = part(".reading-hint");

  let stories: Stories | null = null;
  let current: ReadingState = { page: 0, lang: "gcf", showHint: false };
  let shown = -1;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;

  part(".reading-back").addEventListener("click", () => events.onBack());
  part(".reading-prev").addEventListener("click", () => events.onPage(current.page - 1));
  part(".reading-next").addEventListener("click", () => events.onPage(current.page + 1));

  const button = (className: string, text: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  };

  return {
    open(next) {
      stories = next;
      shown = -1;
      el.hidden = false;
      langs.replaceChildren(
        ...readingLangs(next).map((lang) => {
          const b = button("", LANG_NAMES[lang], () => events.onLang(lang));
          b.dataset.lang = lang;
          return b;
        }),
      );
      dots.replaceChildren(
        ...next.gcf.pages.map((p, i) => {
          const b = button("reading-dot", "", () => events.onPage(i));
          b.title = p.label;
          b.setAttribute("aria-label", p.label);
          return b;
        }),
      );
    },
    render(state) {
      if (!stories) return;
      current = state;
      const story = storyFor(stories, state.lang);
      const page = story.pages[state.page];
      if (!page) return;
      label.textContent = page.label;
      num.textContent = `${state.page + 1} / ${story.pages.length}`;
      title.textContent = page.title;
      body.innerHTML = blocksHtml(page);
      const french = state.lang === "bi" ? stories.fr?.pages[state.page] : undefined;
      gloss.hidden = !french;
      gloss.innerHTML = french ? blocksHtml(french) : "";
      for (const b of langs.children) {
        b.setAttribute("aria-pressed", String((b as HTMLElement).dataset.lang === state.lang));
      }
      [...dots.children].forEach((d, i) => {
        d.classList.toggle("is-current", i === state.page);
        d.classList.toggle("is-done", i < state.page);
      });
      hint.hidden = !state.showHint;
      if (shown !== -1 && shown !== state.page) {
        card.classList.add("is-changing");
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => card.classList.remove("is-changing"), FADE_MS);
      }
      shown = state.page;
    },
    close() {
      el.hidden = true;
      stories = null;
      clearTimeout(fadeTimer);
      card.classList.remove("is-changing");
    },
  };
}
```

`src/app/reading-ui/reading-ui.css` (values from `template.html`):

```css
:root {
  --reading-accent: #7af0dc;
  --reading-text: rgba(238, 243, 238, 0.92);
  --reading-title: #f6ead0;
  --reading-card-bg: rgba(5, 14, 20, 0.58);
  --reading-card-border: rgba(122, 240, 220, 0.18);
  --reading-font-display: "Cormorant Garamond", serif;
  --reading-font-body: "Quicksand", sans-serif;
}

.reading {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.reading button,
.reading-langs,
.reading-card {
  pointer-events: auto;
}

.reading-back {
  position: absolute;
  left: 22px;
  top: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: var(--reading-title);
  font: italic 600 18px/1 var(--reading-font-display);
  cursor: pointer;
  padding: 10px 12px;
}

.reading-back:hover {
  color: var(--reading-accent);
}

.reading-langs {
  position: absolute;
  right: 22px;
  top: 22px;
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(5, 12, 18, 0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(238, 243, 238, 0.12);
}

.reading-langs button {
  border: 0;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 999px;
  font: 600 11px/1 var(--reading-font-body);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: transparent;
  color: rgba(238, 243, 238, 0.75);
  transition:
    background 0.25s,
    color 0.25s;
}

.reading-langs button[aria-pressed="true"] {
  background: var(--reading-accent);
  color: #0a1e33;
}

.reading-card {
  position: absolute;
  left: clamp(16px, 4vw, 56px);
  bottom: clamp(16px, 5vh, 56px);
  width: min(460px, calc(100vw - 32px));
  max-height: 52vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 26px 28px 24px;
  border-radius: 18px;
  background: var(--reading-card-bg);
  backdrop-filter: blur(14px);
  border: 1px solid var(--reading-card-border);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  transition:
    opacity 0.35s,
    transform 0.35s;
  overflow: auto;
}

.reading-card.is-changing {
  opacity: 0;
  transform: translateY(10px);
}

.reading-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.reading-label {
  font: 600 11px/1 var(--reading-font-body);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--reading-accent);
}

.reading-num {
  font: italic 500 14px/1 var(--reading-font-display);
  color: rgba(238, 243, 238, 0.55);
}

.reading-title {
  margin: 0;
  font: italic 600 clamp(22px, 2.4vw, 30px)/1.15 var(--reading-font-display);
  color: var(--reading-title);
  text-wrap: balance;
}

.reading-body {
  font: 400 16px/1.55 var(--reading-font-body);
  color: var(--reading-text);
  text-wrap: pretty;
}

.reading-body p,
.reading-gloss p {
  margin: 0;
}

.reading-gloss {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed rgba(122, 240, 220, 0.25);
  font: italic 500 15px/1.5 var(--reading-font-display);
  color: rgba(238, 243, 238, 0.7);
  text-wrap: pretty;
}

.reading-dots {
  position: absolute;
  right: 26px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.reading-dot {
  border: 0;
  cursor: pointer;
  padding: 0;
  width: 6px;
  height: 8px;
  border-radius: 3px;
  background: rgba(238, 243, 238, 0.25);
  transition:
    height 0.35s,
    background 0.35s;
}

.reading-dot.is-done {
  background: color-mix(in srgb, var(--reading-accent) 55%, transparent);
}

.reading-dot.is-current {
  height: 26px;
  background: var(--reading-accent);
  box-shadow: 0 0 12px var(--reading-accent);
}

.reading-arrows {
  position: absolute;
  right: 22px;
  bottom: 22px;
  display: flex;
  gap: 8px;
}

.reading-arrows button {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid rgba(238, 243, 238, 0.2);
  background: rgba(5, 12, 18, 0.5);
  backdrop-filter: blur(8px);
  color: var(--reading-title);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.reading-arrows button:hover {
  border-color: var(--reading-accent);
  color: var(--reading-accent);
}

.reading-next {
  transform: rotate(180deg);
}

.reading-hint {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  font: 500 11px/1 var(--reading-font-body);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(122, 240, 220, 0.8);
}

.reading-hint svg {
  width: 14px;
  height: 14px;
  animation: reading-bob 1.8s ease-in-out infinite;
}

@keyframes reading-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/app/reading-ui && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/reading-ui
git commit -m "feat(app): add shared reading UI with themable variables"
```

---

### Task 9: App state machine

**Files:**

- Create: `src/app/app.ts`, `src/app/app.test.ts`

**Interfaces:**

- Consumes everything from Tasks 4, 5, 7 and 8.
- Produces:
  - `startApp(root: HTMLElement, deps: AppDeps): { dispose(): void }`;
  - `AppDeps = { mountTree: MountTree; books: BookManifest[]; loadStories(bookId: string): Promise<Stories> }`;
  - `TIMING = { dive: 1700, rise: 1100, fade: 1200, retryDelay: 1200, mountAttempts: 5 }`;
  - `LOAD_ERROR = "Kont-la pa ka chajé"`.
- DOM: the root gets the class `app` and two layers, `.app-tree` and `.app-book`. `root.dataset.book` holds the open book id.

- [ ] **Step 1: Write the failing test** — `src/app/app.test.ts`

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOAD_ERROR, TIMING, startApp, type AppDeps } from "./app";
import type {
  BookHandle,
  BookManifest,
  BookWorld,
  Stories,
  TreeContext,
  TreeHandle,
} from "./contract";
import { parseStory } from "./story/parse";

const story = (lang: "gcf" | "fr", titles: string[]): string =>
  `---\nlang: ${lang}\ntitle: Liv\n---\n\n` +
  titles.map((t, i) => `## ${t} {#p${i}}\n\n<!-- label: L${i} -->\n\n${t} tèks.\n`).join("\n");

const STORIES: Stories = {
  gcf: parseStory(story("gcf", ["Paj en", "Paj dé", "Paj twa"]), "gcf.md"),
  fr: parseStory(story("fr", ["Page un", "Page deux", "Page trois"]), "fr.md"),
};
const OPEN_MS = TIMING.dive + TIMING.fade + 100;
const CLOSE_MS = TIMING.rise + TIMING.fade + 100;

let root: HTMLElement;
let tree: { [K in keyof TreeHandle]: ReturnType<typeof vi.fn> };
let treeCtx: TreeContext;
let handle: { [K in keyof BookHandle]: ReturnType<typeof vi.fn> };
let world: BookWorld & { mount: ReturnType<typeof vi.fn> };

const manifest = (id: string, order: number, ready: boolean): BookManifest => ({
  id,
  order,
  ready,
  card: { title: id, sub: "", theme: "" },
  ...(ready ? { cover: () => undefined, world: async () => ({ default: world }) } : {}),
});

/** Starts the app with fakes; `overrides` replaces any dependency. */
function start(overrides: Partial<AppDeps> = {}): void {
  startApp(root, {
    mountTree: (_container, ctx) => {
      treeCtx = ctx;
      return tree as unknown as TreeHandle;
    },
    books: [manifest("liv", 1, true), manifest("lock", 2, false)],
    loadStories: vi.fn(async () => STORIES),
    ...overrides,
  });
}

const $ = (sel: string): HTMLElement | null => root.querySelector<HTMLElement>(sel);
const key = (k: string): void => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.querySelector<HTMLElement>("#app") as HTMLElement;
  tree = { dive: vi.fn(async () => undefined), pause: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
  handle = { setPage: vi.fn(), setStory: vi.fn(), dispose: vi.fn() };
  world = { mount: vi.fn(() => handle as unknown as BookHandle) };
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("app", () => {
  it("enters a ready book: dives, pauses the tree, mounts the world, shows page 1", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.dive).toHaveBeenCalledWith("liv");
    expect(tree.pause).toHaveBeenCalledOnce();
    expect(world.mount).toHaveBeenCalledOnce();
    expect(world.mount.mock.calls[0][1]).toMatchObject({ page: 0, story: { lang: "gcf" } });
    expect(root.dataset.book).toBe("liv");
    expect($(".app-tree")?.hidden).toBe(true);
    expect($(".reading")?.hidden).toBe(false);
    expect($(".reading-title")?.textContent).toBe("Paj en");
  });

  it("ignores locked books, repeated entries and Escape during the dive", async () => {
    start();
    treeCtx.onEnter("lock");
    treeCtx.onEnter("liv");
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(500);
    key("Escape");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.dive).toHaveBeenCalledOnce();
    expect(tree.dive).toHaveBeenCalledWith("liv");
    expect(handle.dispose).not.toHaveBeenCalled();
  });

  it("pages with keys and wheel, clamped, one turn per gesture", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    key("ArrowLeft");
    expect(handle.setPage).not.toHaveBeenCalled();
    key("ArrowRight");
    expect(handle.setPage).toHaveBeenLastCalledWith(1);
    expect($(".reading-title")?.textContent).toBe("Paj dé");
    root.dispatchEvent(new WheelEvent("wheel", { deltaY: 30, cancelable: true }));
    root.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, cancelable: true }));
    expect(handle.setPage).toHaveBeenLastCalledWith(2);
    root.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, cancelable: true }));
    expect(handle.setPage).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(800);
    key("ArrowDown");
    expect(handle.setPage).toHaveBeenCalledTimes(2);
  });

  it("switches language: Bileng keeps Kréyòl in the world and adds French underneath", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    $('.reading-langs [data-lang="bi"]')?.click();
    expect(handle.setStory).toHaveBeenLastCalledWith(STORIES.gcf);
    expect($(".reading-gloss")?.textContent).toContain("Page un tèks.");
    $('.reading-langs [data-lang="fr"]')?.click();
    expect(handle.setStory).toHaveBeenLastCalledWith(STORIES.fr);
    expect($(".reading-title")?.textContent).toBe("Page un");
  });

  it("rises back to the tree at the book's card on Escape", async () => {
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    expect(handle.dispose).toHaveBeenCalledOnce();
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect(root.dataset.book).toBeUndefined();
    expect($(".app-tree")?.hidden).toBe(false);
    expect($(".reading")?.hidden).toBe(true);
  });

  it("returns to the tree with a notice when a book fails to load, and can retry", async () => {
    const loadStories = vi.fn().mockRejectedValueOnce(new Error("404")).mockResolvedValue(STORIES);
    start({ loadStories });
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect(world.mount).not.toHaveBeenCalled();
    expect(root.dataset.book).toBeUndefined();
    expect($(".app-notice")?.textContent).toBe(LOAD_ERROR);
    await vi.advanceTimersByTimeAsync(4000);
    expect($(".app-notice")).toBeNull();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(root.dataset.book).toBe("liv");
  });

  it("cleans up when the world throws while mounting", async () => {
    world.mount.mockImplementationOnce(() => {
      throw new Error("mount failed");
    });
    start();
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(tree.resume).toHaveBeenCalledWith("liv");
    expect($(".app-book")?.childElementCount).toBe(0);
    expect($(".app-notice")?.textContent).toBe(LOAD_ERROR);
  });

  it("falls back to Kréyòl when the next book has no translation", async () => {
    const solo: Stories = { gcf: STORIES.gcf };
    const loadStories = vi.fn(async (id: string) => (id === "solo" ? solo : STORIES));
    start({ loadStories, books: [manifest("liv", 1, true), manifest("solo", 2, true)] });
    treeCtx.onEnter("liv");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    $('.reading-langs [data-lang="fr"]')?.click();
    key("Escape");
    await vi.advanceTimersByTimeAsync(CLOSE_MS);
    treeCtx.onEnter("solo");
    await vi.advanceTimersByTimeAsync(OPEN_MS);
    expect(world.mount.mock.calls[1][1]).toMatchObject({ story: { lang: "gcf" } });
    expect(root.querySelectorAll(".reading-langs button")).toHaveLength(1);
  });

  it("retries the tree mount 5 times, 1.2 s apart, then shows the fallback", async () => {
    const mountTree = vi.fn(() => {
      throw new Error("no WebGL");
    });
    start({ mountTree });
    await vi.advanceTimersByTimeAsync(TIMING.retryDelay * 5);
    expect(mountTree).toHaveBeenCalledTimes(5);
    expect($(".app-fallback")?.textContent).toContain("Pyébwa-la pa ka limé…");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/app/app`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** — `src/app/app.ts` (flow from spec §6; v13 `DCLogic`)

```ts
import { createBackdrop } from "./backdrop";
import { createBubble } from "./bubble";
import type { BookHandle, BookManifest, MountTree, Stories, TreeHandle } from "./contract";
import { showFallback } from "./fallback";
import { readingLangs, storyFor, type ReadingLang } from "./languages";
import { showNotice } from "./notice";
import { clampPage, createPager } from "./paging";
import { createReadingUI } from "./reading-ui/reading-ui";
import { createFlash } from "./transition";

export const TIMING = {
  dive: 1700,
  rise: 1100,
  fade: 1200,
  retryDelay: 1200,
  mountAttempts: 5,
} as const;
export const LOAD_ERROR = "Kont-la pa ka chajé";
const NEXT_KEYS = ["ArrowRight", "ArrowDown", " ", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "ArrowUp", "PageUp"];

export interface AppDeps {
  mountTree: MountTree;
  books: BookManifest[];
  loadStories(bookId: string): Promise<Stories>;
}

type Mode = "tree" | "dive" | "book" | "rise";

interface OpenBook {
  id: string;
  stories: Stories;
  handle: BookHandle;
}

/** Shell: mounts the tree, runs tree ⇄ book transitions, owns reading UI and book-mode input. */
export function startApp(root: HTMLElement, deps: AppDeps): { dispose(): void } {
  root.classList.add("app");
  const treeLayer = addLayer("app-tree");
  const bookLayer = addLayer("app-book");
  bookLayer.hidden = true;
  createBackdrop(root);
  const reading = createReadingUI(root, {
    onPage: (index) => goPage(index),
    onLang: (lang) => setLang(lang),
    onBack: () => void leave(),
  });
  const bubble = createBubble(root);
  const flash = createFlash(root);
  const pager = createPager();

  let mode: Mode = "tree";
  let tree: TreeHandle | null = null;
  let book: OpenBook | null = null;
  let page = 0;
  let lang: ReadingLang = "gcf";
  let scrolled = false;
  let touchY: number | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  /** Adds a full-screen universe container. */
  function addLayer(className: string): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `app-layer ${className}`;
    root.append(el);
    return el;
  }

  /** Mounts the tree, retrying while WebGL is unavailable (v13: 5 attempts, 1.2 s apart). */
  function mountTree(attempt: number): void {
    try {
      tree = deps.mountTree(treeLayer, {
        books: deps.books,
        bubble,
        onEnter: (id) => void enter(id),
      });
    } catch (err) {
      console.warn(`WebGL unavailable, attempt ${attempt}`, err);
      treeLayer.replaceChildren();
      if (attempt < TIMING.mountAttempts) {
        retryTimer = setTimeout(() => mountTree(attempt + 1), TIMING.retryDelay);
      } else {
        showFallback(root);
      }
    }
  }

  function render(): void {
    reading.render({ page, lang, showHint: page === 0 && !scrolled });
  }

  /** Removes the open book (if any) and gives the screen back to the tree layer. */
  function closeBook(): void {
    book?.handle.dispose();
    book = null;
    bubble.hide();
    reading.close();
    bookLayer.replaceChildren();
    bookLayer.hidden = true;
    delete root.dataset.book;
    treeLayer.hidden = false;
  }

  async function enter(bookId: string): Promise<void> {
    const manifest = deps.books.find((b) => b.id === bookId);
    if (mode !== "tree" || !tree || !manifest?.ready || !manifest.world) return;
    const activeTree = tree;
    mode = "dive";
    bubble.hide();
    const loading = Promise.all([manifest.world(), deps.loadStories(bookId)]);
    loading.catch(() => undefined);
    await Promise.all([
      activeTree.dive(bookId),
      flash.to(1, TIMING.dive * 0.45, TIMING.dive * 0.55),
    ]);
    activeTree.pause();
    treeLayer.hidden = true;
    try {
      const [world, stories] = await loading;
      if (!readingLangs(stories).includes(lang)) lang = "gcf";
      page = 0;
      scrolled = false;
      pager.reset();
      root.dataset.book = bookId;
      bookLayer.hidden = false;
      const handle = await world.default.mount(bookLayer, {
        story: storyFor(stories, lang),
        page,
        bubble,
      });
      book = { id: bookId, stories, handle };
      reading.open(stories);
      render();
      mode = "book";
    } catch (err) {
      console.error(`Book "${bookId}" failed to open`, err);
      closeBook();
      activeTree.resume(bookId);
      mode = "tree";
      showNotice(root, LOAD_ERROR);
    }
    await flash.to(0, TIMING.fade);
  }

  async function leave(): Promise<void> {
    if (mode !== "book" || !book) return;
    const bookId = book.id;
    mode = "rise";
    bubble.hide();
    await flash.to(1, TIMING.rise);
    closeBook();
    tree?.resume(bookId);
    mode = "tree";
    await flash.to(0, TIMING.fade);
  }

  function goPage(index: number): void {
    if (mode !== "book" || !book) return;
    const next = clampPage(index, book.stories.gcf.pages.length);
    if (next === page) return;
    page = next;
    scrolled = true;
    bubble.hide();
    book.handle.setPage(page);
    render();
  }

  function setLang(next: ReadingLang): void {
    if (mode !== "book" || !book || next === lang) return;
    lang = next;
    book.handle.setStory(storyFor(book.stories, lang));
    render();
  }

  const step = (dy: number): void => {
    const direction = pager.step(dy, Date.now());
    if (direction !== 0) goPage(page + direction);
  };
  const onWheel = (e: WheelEvent): void => {
    if (mode !== "book") return;
    e.preventDefault();
    step(e.deltaY);
  };
  const onPointerDown = (e: PointerEvent): void => {
    touchY = e.pointerType === "mouse" ? null : e.clientY;
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (mode !== "book" || touchY === null) return;
    const dy = touchY - e.clientY;
    touchY = e.clientY;
    step(dy * 2.2);
  };
  const onPointerUp = (): void => {
    touchY = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (mode !== "book") return;
    if (NEXT_KEYS.includes(e.key)) {
      e.preventDefault();
      goPage(page + 1);
    } else if (PREV_KEYS.includes(e.key)) {
      e.preventDefault();
      goPage(page - 1);
    } else if (e.key === "Escape") {
      void leave();
    }
  };

  root.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKey);
  mountTree(1);

  return {
    dispose() {
      clearTimeout(retryTimer);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
      book?.handle.dispose();
      tree?.dispose();
      bubble.dispose();
      root.replaceChildren();
    },
  };
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/app && pnpm typecheck && pnpm lint`
Expected: PASS. If the retry test counts 4 calls, check that `advanceTimersByTimeAsync(6000)` reaches the fifth attempt (5 × 1200 ms after the first sync call happens at 4800 ms). Fix the code or the test, whichever one is wrong.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.ts src/app/app.test.ts
git commit -m "feat(app): add tree/book state machine with transitions and failure paths"
```

---

### Task 10: Tree scene modules

**Files:**

- Create:
  - `src/tree/scene/camera.ts`, `landscape.ts`, `tree.ts`, `konteur.ts`, `locked-cover.ts`, `cards.ts`
  - `src/tree/assets/konteur.png`, moved from `public/`

**Interfaces:**

- Consumes:
  - `Rng` and `createRng` (Task 2), `lerp`, `clamp`, `smoothstep` (Task 2);
  - `glowPoints`, `softSprite`, `ScreenPoint` (Task 3);
  - `BookManifest` (Task 4).
- Produces:
  - `hubCam(t, out, look): number`, `CARD_T`, `cardT(index): number`
  - `groundHeight(x, z): number`
  - `createLandscape(rng): { group: THREE.Group; update(time: number): void }`
  - `createLightTree(rng): { group: THREE.Group; tips: THREE.Vector3[]; update(time: number): void }`
  - `createKonteur(): { group: THREE.Group; plane: THREE.Mesh; anchor(out: THREE.Vector3): THREE.Vector3; update(time: number, cameraPosition: THREE.Vector3, lit: boolean): void }`
  - `paintLockedCover(ctx, width, height): void`
  - `createCards(books, tips): Cards`, where `Cards` is:
    - `group: THREE.Group`;
    - `planes: THREE.Mesh[]`;
    - `position(index): THREE.Vector3`;
    - `update(time, t, hover: number | null, cameraPosition, project: (p: THREE.Vector3) => ScreenPoint): CardView[]`;
    - with `CardView = { index, x, y, visible, near }`.

Each module is a line-for-line port of `scene13.js`, in the ranges given per step. Port rules:

- `rnd()` becomes `rng()`, and `V(x,y,z)` becomes `new THREE.Vector3(x,y,z)`.
- `hub.add` becomes `group.add`.
- `userData` bags become typed locals.
- Numbers, colours and the order of `rng()` calls stay as they are.

This task can only be checked visually, which happens in Task 11. Here, verify with typecheck and lint.

- [ ] **Step 1: Move the Konteur image**

```bash
mkdir -p src/tree/assets
git mv public/konteur.png src/tree/assets/konteur.png
```

- [ ] **Step 2: `src/tree/scene/camera.ts`** (line 165; card heights from line 167)

```ts
import type * as THREE from "three";

/** Climb progress (t ∈ [0, 1]) at which each card hangs, cycling for more than three books. */
export const CARD_T = [0.24, 0.55, 0.84] as const;

/** Climb progress of the card at `index`. */
export const cardT = (index: number): number => CARD_T[index % CARD_T.length];

/** Spiral camera path around the tree; writes position and look-at target, returns the angle. */
export function hubCam(t: number, out: THREE.Vector3, look: THREE.Vector3): number {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 21 - t * 4;
  const y = 1.4 + t * 8.6;
  out.set(Math.cos(a) * r, y, Math.sin(a) * r);
  look.set(0, y + 2.2 - t * 1.2, 0);
  return a;
}
```

- [ ] **Step 3: `src/tree/scene/landscape.ts`.** This ports:
  - lines 98–122: lights, ground, mornes, palms, breadfruit, ferns, grass, pool;
  - lines 144–149: fireflies, stars, moon, mist;
  - lines 312, 317–318: the per-frame part.

```ts
import * as THREE from "three";
import { clamp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";

/** Height of the morne around the tree (v13 `gH`): a gentle plateau falling towards the hills. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  return (
    -0.6 +
    Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.35 * Math.min(1, d / 12) +
    Math.sin(x * 0.05 + 1) * Math.sin(z * 0.06) * 1.2 * Math.min(1, Math.max(0, (d - 20) / 30))
  );
}

const MORNES: [number, number, string, number][] = [
  [62, 14, "#0e2028", 9],
  [88, 24, "#0b1820", 7],
];
const CLEARING_PALMS: [number, number, number][] = [
  [-9.5, -10, 6.5],
  [11, -8, 5.5],
  [-12, 4, 7],
  [8, 12.5, 6],
  [-4, 13.5, 5],
];

/** Tropical morne around the tree: lights, relief, hills, sparse vegetation, fireflies, sky. */
export function createLandscape(rng: Rng): { group: THREE.Group; update(time: number): void } {
  const group = new THREE.Group();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();

  group.add(new THREE.HemisphereLight("#2d6f7a", "#0a1410", 1.1));
  const canopyLight = new THREE.PointLight("#5be0d0", 40, 40, 1.6);
  canopyLight.position.set(0, 11, 0);
  const baseLight = new THREE.PointLight("#f0b860", 18, 22, 1.6);
  baseLight.position.set(1, 2, 2);
  const rim = new THREE.DirectionalLight("#5be0d0", 1.2);
  rim.position.set(-8, 14, -10);
  group.add(canopyLight, baseLight, rim);

  {
    const geo = new THREE.PlaneGeometry(200, 200, 90, 90);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cA = new THREE.Color("#0d1c1a");
    const cB = new THREE.Color("#1b3328");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        y = groundHeight(x, z);
      p.setY(i, y);
      const t = clamp((y + 1) / 2, 0, 1) * (0.5 + 0.5 * rng());
      const c = cA.clone().lerp(cB, t);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    group.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
      ),
    );
  }

  for (const [r, hh, color, n] of MORNES) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
      );
      m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r);
      m.scale.set(18 + rng() * 20, hh * (0.6 + rng() * 0.7), 14 + rng() * 14);
      group.add(m);
    }
  }

  const trunkMat = new THREE.MeshStandardMaterial({
    color: "#2b2530",
    roughness: 1,
    flatShading: true,
  });
  const frondMat = new THREE.MeshStandardMaterial({
    color: "#173a30",
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const bushMat = new THREE.MeshStandardMaterial({
    color: "#12291f",
    roughness: 1,
    flatShading: true,
  });
  const frondGeo = new THREE.PlaneGeometry(0.5, 3.2, 1, 4);
  frondGeo.translate(0, 1.6, 0);
  {
    const p = frondGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 3.2;
      p.setZ(i, -y * y * 1.4);
      p.setX(i, p.getX(i) * (1 - y * 0.7));
    }
    frondGeo.computeVertexNormals();
  }

  const crowns: THREE.Group[] = [];
  const palm = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    const lean = (rng() - 0.5) * 0.3;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 6), trunkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = lean;
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.set(Math.sin(-lean) * h * 0.5, Math.cos(lean) * h, 0);
    for (let i = 0; i < 8; i++) {
      const f = new THREE.Mesh(frondGeo, frondMat);
      f.rotation.y = (i / 8) * Math.PI * 2 + rng() * 0.3;
      f.rotation.x = -0.35 - rng() * 0.35;
      f.scale.setScalar(0.8 + rng() * 0.4);
      crown.add(f);
    }
    g.add(crown);
    crowns.push(crown);
    g.rotation.y = rng() * 6.28;
    group.add(g);
  };
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2,
      r = 24 + rng() * 20;
    palm(Math.cos(a) * r, Math.sin(a) * r, 5 + rng() * 4);
  }
  for (const [x, z, h] of CLEARING_PALMS) palm(x, z, h);
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2,
      r = 26 + rng() * 24;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.6, 6), trunkMat);
    trunk.position.y = 1.3;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + rng() * 0.8, 1), bushMat);
    crown.position.y = 3.4;
    crown.scale.y = 0.8;
    g.add(trunk, crown);
    group.add(g);
  }
  const bladeGeo = frondGeo.clone();
  bladeGeo.scale(0.45, 0.3, 0.45);
  const fern = new THREE.InstancedMesh(bladeGeo, frondMat, 64 * 7);
  {
    let k = 0;
    const e = new THREE.Euler();
    for (let i = 0; i < 64; i++) {
      const a = rng() * Math.PI * 2;
      const r = i < 22 ? 4 + rng() * 8 : 22 + rng() * 28;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        y = groundHeight(x, z),
        sc = 0.7 + rng() * 0.8;
      for (let j = 0; j < 7; j++) {
        e.set(-0.5 - rng() * 0.6, (j / 7) * Math.PI * 2 + rng() * 0.5, 0, "YXZ");
        m4.compose(
          new THREE.Vector3(x, y, z),
          q.setFromEuler(e),
          s3.set(sc, sc * (0.8 + rng() * 0.5), sc),
        );
        fern.setMatrixAt(k++, m4);
      }
    }
  }
  group.add(fern);

  const grass = glowPoints(
    rng,
    600,
    () => {
      const a = rng() * Math.PI * 2,
        r = 3 + rng() * 14,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      return [x, groundHeight(x, z) + 0.1 + rng() * 0.3, z];
    },
    { size: 0.14, drift: 0.06, a: "#2c6a4a", b: "#4a8a5a" },
  );
  grass.material.blending = THREE.NormalBlending;
  grass.material.uniforms.uOpacity.value = 0.7;
  const pool = softSprite("#2fa89a", 16, 0.35);
  pool.position.set(0, -0.4, 0);
  const fireflies = glowPoints(
    rng,
    900,
    () => [(rng() - 0.5) * 36, rng() * 16 - 0.5, (rng() - 0.5) * 36],
    {
      size: 0.22,
      drift: 1.4,
      a: "#9af5e6",
      b: "#ffd98a",
    },
  );
  const stars = glowPoints(
    rng,
    700,
    () => {
      const th = rng() * Math.PI * 2,
        ph = rng() * 1.2;
      return [
        Math.cos(th) * Math.cos(ph) * 220,
        Math.sin(ph) * 220 + 10,
        Math.sin(th) * Math.cos(ph) * 220,
      ];
    },
    { size: 1.1, a: "#dfe9ff", b: "#fff1c8" },
  );
  const moon = softSprite("#f6e3b0", 26, 0.9);
  moon.position.set(-60, 55, -90);
  const mists = Array.from({ length: 14 }, () => {
    const sprite = softSprite("#1c4a52", 14 + rng() * 14, 0.16, false);
    sprite.position.set((rng() - 0.5) * 40, -0.2 + rng() * 1.5, (rng() - 0.5) * 40);
    return { sprite, phase: rng() * 6.28 };
  });
  group.add(grass, pool, fireflies, stars, moon, ...mists.map((m) => m.sprite));

  return {
    group,
    update(time) {
      fireflies.material.uniforms.uTime.value = time;
      stars.material.uniforms.uTime.value = time;
      grass.material.uniforms.uTime.value = time;
      canopyLight.intensity = 36 + Math.sin(time * 0.9) * 6;
      pool.material.opacity = 0.28 + Math.sin(time * 1.3) * 0.06;
      crowns.forEach((crown, i) => {
        crown.rotation.z = Math.sin(time * 0.7 + i) * 0.04;
        crown.rotation.x = Math.cos(time * 0.5 + i * 1.3) * 0.03;
      });
      for (const { sprite, phase } of mists) {
        sprite.position.x += Math.sin(time * 0.1 + phase) * 0.004;
        sprite.material.opacity = 0.12 + Math.sin(time * 0.3 + phase) * 0.05;
      }
    },
  };
}
```

- [ ] **Step 4: `src/tree/scene/tree.ts`** (lines 124–143; leaves time from line 311)

```ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";

interface Branch {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  r: number;
}

/** Pyébwa a Sav: recursive branches as instanced bark, glowing leaves at every tip, roots. */
export function createLightTree(rng: Rng): {
  group: THREE.Group;
  tips: THREE.Vector3[];
  update(time: number): void;
} {
  const group = new THREE.Group();
  const branches: Branch[] = [];
  const tips: THREE.Vector3[] = [];
  const grow = (
    p: THREE.Vector3,
    dir: THREE.Vector3,
    len: number,
    rad: number,
    depth: number,
  ): void => {
    const end = p.clone().add(dir.clone().multiplyScalar(len));
    branches.push({ p0: p, p1: end, r: rad });
    if (depth >= 6 || rad < 0.04) {
      tips.push(end);
      return;
    }
    const n = depth < 2 ? 3 : rng() < 0.65 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const axis = new THREE.Vector3(rng() - 0.5, rng() * 0.4 - 0.1, rng() - 0.5).normalize();
      const d = dir
        .clone()
        .applyAxisAngle(axis, 0.35 + rng() * 0.55)
        .add(new THREE.Vector3(0, 0.12 + depth * 0.02, 0))
        .normalize();
      grow(end, d, len * (0.66 + rng() * 0.16), rad * 0.6, depth + 1);
    }
  };
  grow(new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0, 1, 0), 5.2, 1.1, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.5;
    branches.push({
      p0: new THREE.Vector3(0, 0.2, 0),
      p1: new THREE.Vector3(Math.cos(a) * 2.6, -0.55, Math.sin(a) * 2.6),
      r: 0.34,
    });
  }
  const barkGeo = new THREE.CylinderGeometry(0.62, 1, 1, 7, 1);
  barkGeo.translate(0, 0.5, 0);
  const bark = new THREE.InstancedMesh(
    barkGeo,
    new THREE.MeshStandardMaterial({ color: "#3a2f44", roughness: 0.9, flatShading: true }),
    branches.length,
  );
  const up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  branches.forEach((b, i) => {
    const d = b.p1.clone().sub(b.p0);
    const length = d.length();
    q.setFromUnitVectors(up, d.normalize());
    s3.set(b.r, length, b.r);
    m4.compose(b.p0, q, s3);
    bark.setMatrixAt(i, m4);
  });
  const leaves = glowPoints(
    rng,
    tips.length * 26,
    (i) => {
      const t = tips[i % tips.length];
      const r = 1.25 * Math.cbrt(rng()),
        th = rng() * Math.PI * 2,
        ph = Math.acos(2 * rng() - 1);
      return [
        t.x + r * Math.sin(ph) * Math.cos(th),
        t.y + r * Math.cos(ph) * 0.8,
        t.z + r * Math.sin(ph) * Math.sin(th),
      ];
    },
    { size: 0.34, drift: 0.12 },
  );
  group.add(bark, leaves);
  return {
    group,
    tips,
    update(time) {
      leaves.material.uniforms.uTime.value = time;
    },
  };
}
```

- [ ] **Step 5: `src/tree/scene/konteur.ts`** (lines 151–163; frame lines 314–316; anchor from line 326)

```ts
import * as THREE from "three";
import { lerp } from "@shared/math";
import { softSprite } from "@shared/three/soft-sprite";
import konteurUrl from "../assets/konteur.png";
import { groundHeight } from "./landscape";

/** The storyteller: a photo cut-out billboard at the foot of the tree, with a lantern. */
export function createKonteur(): {
  group: THREE.Group;
  plane: THREE.Mesh;
  anchor(out: THREE.Vector3): THREE.Vector3;
  update(time: number, cameraPosition: THREE.Vector3, lit: boolean): void;
} {
  const group = new THREE.Group();
  group.position.set(5.2, groundHeight(5.2, -12.5) + 0.02, -12.5);
  const texture = new THREE.TextureLoader().load(konteurUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const height = 1.75;
  const width = height * 0.588;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.9,
      color: "#ffffff",
      emissive: "#6a5040",
      emissiveMap: texture,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  plane.position.y = height / 2 - 0.02;
  const shadow = softSprite("#000000", 1.6, 0.55, false);
  shadow.material.rotation = 0;
  shadow.position.set(0, 0.02, 0.2);
  shadow.scale.set(1.7, 0.5, 1);
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#f6d38a",
    emissive: "#f0a850",
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });
  const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.24, 8), glassMat);
  lampGlass.position.set(0.7, 0.13, 0.15);
  const lampCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.09, 8),
    new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 0.5, roughness: 0.6 }),
  );
  lampCap.position.set(0.7, 0.3, 0.15);
  const lampLight = new THREE.PointLight("#f0b860", 4, 8, 1.6);
  lampLight.position.set(0.7, 0.5, 0.45);
  const fill = new THREE.PointLight("#f6d8a8", 10, 7, 1.4);
  fill.position.set(-0.4, 1.4, 2.2);
  const glow = softSprite("#f0b860", 2, 0.2);
  glow.position.set(0.7, 0.2, 0.15);
  const seat = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: "#2a2430", roughness: 1, flatShading: true }),
  );
  seat.position.set(0, -0.12, -0.25);
  seat.scale.set(1.3, 0.42, 1);
  seat.rotation.set(0.2, 0.6, 0.1);
  group.add(plane, shadow, fill, seat, lampGlass, lampCap, lampLight, glow);

  let lit = 0;
  const toCamera = new THREE.Vector3();
  return {
    group,
    plane,
    anchor: (out) => out.set(0.35, 1.85, 0).add(group.position),
    update(time, cameraPosition, hovered) {
      toCamera.copy(cameraPosition).sub(group.position);
      plane.rotation.y = Math.atan2(toCamera.x, toCamera.z);
      plane.scale.y = 1 + Math.sin(time * 1.3) * 0.006;
      lit = lerp(lit, hovered ? 1 : 0, 0.1);
      const flicker = Math.sin(time * 7) * 0.08 + Math.sin(time * 3.3) * 0.06;
      lampLight.intensity = lerp(3, 22, lit) * (1 + flicker);
      glow.material.opacity = lerp(0.18, 0.75, lit) * (1 + flicker);
      glow.scale.setScalar(lerp(1.6, 3.4, lit));
      glassMat.emissiveIntensity = lerp(0.5, 2.4, lit);
    },
  };
}
```

- [ ] **Step 6: `src/tree/scene/locked-cover.ts`** (lines 44–47 and 76–79, locked branch)

```ts
import { createRng } from "@shared/random";

/** Paints a locked book's card: dark gradient, grain and a padlock. */
export function paintLockedCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(7);
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#141a22");
  bg.addColorStop(1, "#0c1014");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = `rgba(255,240,200,${rnd() * 0.05})`;
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  c.strokeStyle = "rgba(180,200,210,.35)";
  c.lineWidth = 3;
  c.beginPath();
  c.arc(W / 2, H * 0.38, 34, Math.PI, 0);
  c.moveTo(W / 2 - 34, H * 0.38);
  c.lineTo(W / 2 - 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.38);
  c.stroke();
  c.fillStyle = "rgba(180,200,210,.35)";
  c.beginPath();
  c.arc(W / 2, H * 0.5, 6, 0, Math.PI * 2);
  c.fill();
}
```

- [ ] **Step 7: `src/tree/scene/cards.ts`.** It covers:
  - `coverTex` frame and title, lines 80–85;
  - card construction, lines 167–180;
  - the per-frame part, lines 319–325.

```ts
import * as THREE from "three";
import type { BookManifest } from "@app/contract";
import { clamp, lerp } from "@shared/math";
import type { ScreenPoint } from "@shared/three/stage";
import { cardT, hubCam } from "./camera";
import { paintLockedCover } from "./locked-cover";

const COVER_W = 512;
const COVER_H = 720;

export interface CardView {
  index: number;
  x: number;
  y: number;
  visible: boolean;
  near: number;
}

export interface Cards {
  group: THREE.Group;
  planes: THREE.Mesh[];
  position(index: number): THREE.Vector3;
  update(
    time: number,
    t: number,
    hover: number | null,
    cameraPosition: THREE.Vector3,
    project: (p: THREE.Vector3) => ScreenPoint,
  ): CardView[];
}

/** Paints the tree-owned part of every card: double frame, sub-title, title, theme. */
function paintFrame(c: CanvasRenderingContext2D, book: BookManifest, W: number, H: number): void {
  const { ready, card } = book;
  c.strokeStyle = ready ? "rgba(242,196,109,.7)" : "rgba(160,180,190,.3)";
  c.lineWidth = 3;
  c.strokeRect(22, 22, W - 44, H - 44);
  c.lineWidth = 1;
  c.strokeRect(32, 32, W - 64, H - 64);
  c.textAlign = "center";
  c.fillStyle = ready ? "#f6ead0" : "rgba(200,210,220,.55)";
  c.font = `500 26px 'Quicksand', sans-serif`;
  c.fillText(card.sub.toUpperCase(), W / 2, H * 0.745);
  c.font = `italic 600 54px 'Cormorant Garamond', serif`;
  const lines: string[] = [];
  let current = "";
  for (const word of card.title.split(" ")) {
    if (c.measureText(`${current} ${word}`).width > W - 120 && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  lines.push(current);
  lines.forEach((line, i) => c.fillText(line, W / 2, H * 0.83 + i * 54));
  c.font = `400 20px 'Quicksand', sans-serif`;
  c.fillStyle = ready ? "rgba(90,230,210,.9)" : "rgba(200,210,220,.4)";
  c.fillText(card.theme, W / 2, H * 0.1);
}

/** Card texture: the book paints its cover, the tree paints frame and title; redrawn once fonts load. */
function coverTexture(book: BookManifest): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) return texture;
  const draw = (): void => {
    if (book.ready && book.cover) book.cover(ctx, COVER_W, COVER_H);
    else paintLockedCover(ctx, COVER_W, COVER_H);
    paintFrame(ctx, book, COVER_W, COVER_H);
    texture.needsUpdate = true;
  };
  draw();
  void document.fonts?.ready.then(draw);
  return texture;
}

/** Book cards hanging from the branches on the camera spiral, with a thread to the nearest tip. */
export function createCards(books: BookManifest[], tips: THREE.Vector3[]): Cards {
  const group = new THREE.Group();
  const threadMat = new THREE.LineBasicMaterial({
    color: "#8fd9cf",
    transparent: true,
    opacity: 0.35,
  });
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const cards = books.map((book, i) => {
    const t = cardT(i);
    const a = hubCam(t, camPos, look);
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * 12.2, camPos.y + 0.3, Math.sin(a) * 12.2);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.1),
      new THREE.MeshBasicMaterial({ map: coverTexture(book), transparent: true }),
    );
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.1),
      new THREE.MeshBasicMaterial({ color: "#0a1a22", side: THREE.BackSide }),
    );
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.7),
      new THREE.MeshBasicMaterial({
        color: book.ready ? "#2fa89a" : "#2a3a44",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.z = -0.02;
    g.add(halo, back, plane);
    let tip = tips[0];
    let best = Infinity;
    for (const candidate of tips) {
      const d = candidate.distanceTo(g.position);
      if (d < best) {
        best = d;
        tip = candidate;
      }
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        tip,
        g.position.clone().add(new THREE.Vector3(0, 1.05, 0)),
      ]),
      threadMat,
    );
    group.add(g, line);
    return { g, plane, halo, line, t, hover: 0 };
  });
  const below = new THREE.Vector3();

  return {
    group,
    planes: cards.map((c) => c.plane),
    position: (index) => cards[index].g.position,
    update(time, t, hover, cameraPosition, project) {
      return cards.map((c, i) => {
        c.g.lookAt(cameraPosition);
        c.g.rotation.z += Math.sin(time * 0.8 + i) * 0.03;
        c.g.position.y += Math.sin(time * 0.6 + i * 2) * 0.0015;
        const near = 1 - clamp(Math.abs(t - c.t) / 0.22, 0, 1);
        c.hover = lerp(c.hover, hover === i ? 1 : 0, 0.12);
        const scale = 1 + near * 0.08 + c.hover * 0.08;
        c.g.scale.setScalar(scale);
        c.halo.material.opacity = 0.12 + near * 0.2 + c.hover * 0.35;
        const thread = c.line.geometry.attributes.position;
        thread.setXYZ(1, c.g.position.x, c.g.position.y + 1.05 * scale, c.g.position.z);
        thread.needsUpdate = true;
        below.copy(c.g.position);
        below.y -= 1.25 * scale;
        const s = project(below);
        return { index: i, x: s.x, y: s.y, visible: s.visible, near };
      });
    },
  };
}
```

- [ ] **Step 8: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A src/tree public
git commit -m "feat(tree): port the v13 tree scene into its own universe"
```

---

### Task 11: Tree universe mount, overlay and app wiring

**Files:**

- Create: `src/tree/index.ts`, `src/tree/overlay/overlay.ts`, `src/tree/overlay/overlay.css`
- Modify: `src/main.ts` (rewrite), `index.html`

**Interfaces:**

- Consumes:
  - Task 10 modules;
  - `createStage`, `disposeObject` (Task 3);
  - `MountTree`, `TreeContext` (Task 4);
  - `startApp` (Task 9), `registry` (Task 5).
- Produces: `mountTree: MountTree`, exported from `@tree/index`.

- [ ] **Step 1: `src/tree/overlay/overlay.ts`** (hub markup and text from `template.html`)

```ts
import type { BookManifest } from "@app/contract";

export interface CardLabel {
  x: number;
  y: number;
  opacity: number;
  book: BookManifest;
}

const MOUSE = `<svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="#7af0dc" stroke-width="1.5" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8"/><circle cx="9" cy="8" r="1.6" fill="#7af0dc"/></svg>`;

/** Tree HUD: title, intro (fades as you climb), label of the nearest card, climb bar. */
export function createTreeOverlay(
  container: HTMLElement,
  onEnter: (bookId: string) => void,
): { update(t: number, label: CardLabel | null): void; dispose(): void } {
  const el = document.createElement("div");
  el.className = "tree-overlay";
  el.innerHTML = `
    <div class="tree-brand">
      <div class="tree-brand-title">Pyébwa a Sav</div>
      <div class="tree-brand-sub">Kont Gwadloup</div>
    </div>
    <div class="tree-intro"><div class="tree-intro-inner">
      <p class="tree-intro-title">Chak fèy sé on kont.</p>
      <p class="tree-intro-text">Chaque feuille est un conte. Grimpez dans l'arbre pour trouver le vôtre.</p>
      <div class="tree-intro-hint"><span>Défilez · Glisez</span>${MOUSE}</div>
    </div></div>
    <div class="tree-label">
      <div class="tree-label-title"></div>
      <button type="button" class="tree-enter" hidden>Antré adan kont-la</button>
      <div class="tree-locked" hidden>Talè · bientôt</div>
    </div>
    <div class="tree-climb"><div class="tree-climb-thumb"></div></div>`;
  container.append(el);
  const part = (selector: string): HTMLElement => {
    const found = el.querySelector<HTMLElement>(selector);
    if (!found) throw new Error(`tree overlay: missing ${selector}`);
    return found;
  };
  const intro = part(".tree-intro");
  const label = part(".tree-label");
  const title = part(".tree-label-title");
  const enter = part(".tree-enter");
  const locked = part(".tree-locked");
  const thumb = part(".tree-climb-thumb");
  let current: BookManifest | null = null;
  enter.addEventListener("click", () => {
    if (current) onEnter(current.id);
  });

  return {
    update(t, next) {
      intro.style.opacity = String(Math.max(0, 1 - t * 9));
      thumb.style.top = `${t * (180 - 22)}px`;
      current = next ? next.book : null;
      if (!next) {
        label.style.opacity = "0";
        enter.hidden = true;
        locked.hidden = true;
        return;
      }
      label.style.left = `${next.x}px`;
      label.style.top = `${next.y}px`;
      label.style.opacity = String(next.opacity);
      title.textContent = next.book.card.title;
      enter.hidden = !next.book.ready;
      locked.hidden = next.book.ready;
    },
    dispose() {
      el.remove();
    },
  };
}
```

`src/tree/overlay/overlay.css`:

```css
.tree-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: #eef3ee;
  font-family: "Quicksand", sans-serif;
}

.tree-brand {
  position: absolute;
  left: 28px;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-brand-title {
  font:
    italic 600 26px/1 "Cormorant Garamond",
    serif;
  color: #f6ead0;
  letter-spacing: 0.01em;
}

.tree-brand-sub {
  font:
    500 11px/1 "Quicksand",
    sans-serif;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7af0dc;
}

.tree-intro {
  position: absolute;
  left: 50%;
  right: clamp(24px, 6vw, 96px);
  bottom: 14vh;
}

.tree-intro-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
  text-align: right;
  animation: tree-rise 1.4s ease-out both;
}

.tree-intro-title {
  margin: 0;
  font:
    italic 500 clamp(30px, 5vw, 58px)/1.05 "Cormorant Garamond",
    serif;
  color: #f6ead0;
  text-wrap: balance;
  max-width: 16ch;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.5);
}

.tree-intro-text {
  margin: 0;
  font:
    400 15px/1.4 "Quicksand",
    sans-serif;
  color: rgba(238, 243, 238, 0.75);
  max-width: 34ch;
}

.tree-intro-hint {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  font:
    500 11px/1 "Quicksand",
    sans-serif;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #7af0dc;
}

.tree-intro-hint svg {
  animation: tree-bob 1.8s ease-in-out infinite;
}

.tree-label {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, 0);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.3s;
}

.tree-label-title {
  font:
    italic 600 22px/1.1 "Cormorant Garamond",
    serif;
  color: #f6ead0;
  text-align: center;
  white-space: nowrap;
}

.tree-enter {
  pointer-events: auto;
  border: 1px solid rgba(122, 240, 220, 0.6);
  background: rgba(10, 30, 40, 0.55);
  backdrop-filter: blur(8px);
  color: #dffcf6;
  font:
    600 12px/1 "Quicksand",
    sans-serif;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 13px 22px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  animation: tree-glowpulse 2.4s ease-in-out infinite;
}

.tree-enter:hover {
  background: #7af0dc;
  color: #0a1e33;
}

.tree-locked {
  font:
    500 11px/1 "Quicksand",
    sans-serif;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(238, 243, 238, 0.5);
}

.tree-climb {
  position: absolute;
  right: 26px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 180px;
  background: rgba(238, 243, 238, 0.14);
  border-radius: 2px;
}

.tree-climb-thumb {
  position: absolute;
  left: -2px;
  top: 0;
  width: 6px;
  height: 22px;
  border-radius: 3px;
  background: #7af0dc;
  box-shadow: 0 0 12px #7af0dc;
}

@keyframes tree-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes tree-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}

@keyframes tree-glowpulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(122, 240, 220, 0);
  }
  50% {
    box-shadow: 0 0 28px 4px rgba(122, 240, 220, 0.25);
  }
}
```

- [ ] **Step 2: `src/tree/index.ts`.** It covers:
  - the frame hub branch, lines 302–326;
  - pick, line 364;
  - input from `template.html`: `scrollBy`, `onMove`, `onUp`, `onKey` in hub mode;
  - teller bubble text from `onMove`.

```ts
import "./overlay/overlay.css";
import * as THREE from "three";
import type { MountTree } from "@app/contract";
import { clamp, lerp, smoothstep } from "@shared/math";
import { createRng } from "@shared/random";
import { createStage } from "@shared/three/stage";
import { createTreeOverlay } from "./overlay/overlay";
import { cardT, hubCam } from "./scene/camera";
import { createCards, type CardView } from "./scene/cards";
import { createKonteur } from "./scene/konteur";
import { createLandscape } from "./scene/landscape";
import { createLightTree } from "./scene/tree";

const TELLER_TEXT =
  "« Yé krik ! …… Yé mistikrik ! »\nChwazi on liv adan pyébwa a kont-la.\nChoisis un livre dans l'arbre des contes.";
const DIVE_SECONDS = 1.7;
const TAP_DISTANCE = 8;
const TAP_MS = 600;

type Pick = { type: "teller" } | { type: "card"; index: number } | null;

/** Mounts the Pyébwa a Sav universe: climb, hover, pick a card, dive into it. */
export const mountTree: MountTree = (container, ctx) => {
  const stage = createStage(container);
  const { scene, camera } = stage;
  const fog = new THREE.FogExp2("#07131a", 0.013);
  scene.fog = fog;
  scene.background = fog.color;
  const rng = createRng(11);
  const landscape = createLandscape(rng);
  const tree = createLightTree(rng);
  const konteur = createKonteur();
  const cards = createCards(ctx.books, tree.tips);
  scene.add(landscape.group, tree.group, konteur.group, cards.group);
  const overlay = createTreeOverlay(container, ctx.onEnter);

  let t = 0;
  let target = 0;
  let hover: number | null = null;
  let near = -1;
  let tellerHover = false;
  let active = true;
  let diving: { index: number; progress: number; resolve: (() => void) | null } | null = null;
  let down: { y: number; t: number; moved: number } | null = null;
  const pointer = { x: 0, y: 0 };
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const dest = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const climb = (dy: number): void => {
    target = clamp(target + dy * 0.00055, 0, 1);
  };
  const pick = (): Pick => {
    ndc.set(pointer.x, pointer.y);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...cards.planes, konteur.plane], false)[0]?.object;
    if (!hit) return null;
    if (hit === konteur.plane) return { type: "teller" };
    return { type: "card", index: cards.planes.indexOf(hit as THREE.Mesh) };
  };
  const setTellerHover = (on: boolean): void => {
    if (on === tellerHover) return;
    tellerHover = on;
    if (on) ctx.bubble.show(TELLER_TEXT, () => stage.project(konteur.anchor(anchor)));
    else ctx.bubble.hide();
  };
  const enter = (index: number): void => {
    const book = ctx.books[index];
    if (book) ctx.onEnter(book.id);
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (active && !diving) climb(e.deltaY);
  };
  const onPointerDown = (e: PointerEvent): void => {
    down = { y: e.clientY, t: performance.now(), moved: 0 };
  };
  const onPointerMove = (e: PointerEvent): void => {
    Object.assign(pointer, stage.pointer(e));
    if (!active || diving) return;
    if (down && e.pointerType !== "mouse") {
      const dy = down.y - e.clientY;
      down.y = e.clientY;
      down.moved += Math.abs(dy);
      climb(dy * 2.2);
      return;
    }
    const p = pick();
    hover = p?.type === "card" ? p.index : null;
    container.style.cursor = p ? "pointer" : "default";
    setTellerHover(p?.type === "teller");
  };
  const onPointerUp = (e: PointerEvent): void => {
    const d = down;
    down = null;
    if (!d || !active || diving) return;
    if (d.moved > TAP_DISTANCE || performance.now() - d.t > TAP_MS) return;
    if (e.target instanceof Element && e.target.closest("button")) return;
    Object.assign(pointer, stage.pointer(e));
    const p = pick();
    if (p?.type === "card") enter(p.index);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!active || diving) return;
    if (e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      climb(140);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      climb(-140);
    } else if (e.key === "Enter" && near >= 0) {
      enter(near);
    }
  };

  const frame = (time: number, dt: number): void => {
    t += (target - t) * (1 - Math.exp(-dt * 4.5));
    hubCam(t, cam, look);
    if (diving) {
      diving.progress = Math.min(1, diving.progress + dt / DIVE_SECONDS);
      const d = smoothstep(diving.progress);
      const card = cards.position(diving.index);
      dest.copy(cam).sub(card).normalize().multiplyScalar(-0.6).add(card);
      cam.lerp(dest, d);
      look.lerp(card, d);
      camera.fov = lerp(50, 95, d);
      camera.updateProjectionMatrix();
    } else if (camera.fov !== 50) {
      camera.fov = 50;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(cam);
    camera.position.x += pointer.x * 0.5;
    camera.position.y += pointer.y * 0.3;
    camera.lookAt(look);
    landscape.update(time);
    tree.update(time);
    konteur.update(time, camera.position, tellerHover && !diving);
    const views = cards.update(time, t, hover, camera.position, stage.project);
    let best: CardView | null = null;
    for (const v of views)
      if (v.visible && v.near > 0.35 && (!best || v.near > best.near)) best = v;
    near = best ? best.index : -1;
    overlay.update(
      t,
      best && !diving
        ? {
            x: best.x,
            y: best.y,
            opacity: Math.min(1, (best.near - 0.35) * 3),
            book: ctx.books[best.index],
          }
        : null,
    );
    if (diving && diving.progress >= 1 && diving.resolve) {
      diving.resolve();
      diving.resolve = null;
    }
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKey);
  stage.start(frame);

  return {
    dive(bookId) {
      const index = Math.max(
        0,
        ctx.books.findIndex((b) => b.id === bookId),
      );
      hover = null;
      setTellerHover(false);
      return new Promise<void>((resolve) => {
        diving = { index, progress: 0, resolve };
      });
    },
    pause() {
      active = false;
      setTellerHover(false);
      stage.stop();
    },
    resume(fromBookId) {
      const index = fromBookId ? ctx.books.findIndex((b) => b.id === fromBookId) : -1;
      if (index >= 0) t = target = cardT(index);
      diving = null;
      hover = null;
      near = -1;
      active = true;
      stage.start(frame);
    },
    dispose() {
      setTellerHover(false);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
      overlay.dispose();
      stage.dispose();
    },
  };
};
```

> 💡 **Note**: `createStage` must succeed before anything else is built. If a later constructor throws, wrap everything after `createStage` in `try { … } catch (err) { stage.dispose(); throw err; }` so the app's retry starts from a clean container.

- [ ] **Step 3: Rewrite `src/main.ts`**

```ts
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/500.css";
import "@fontsource/quicksand/600.css";
import "./style.css";
import { startApp } from "@app/app";
import { registry } from "@app/registry";
import { mountTree } from "@tree/index";

const root = document.querySelector<HTMLElement>("#app");
if (root) startApp(root, { mountTree, books: registry.books, loadStories: registry.loadStories });
```

- [ ] **Step 4: Update `index.html`.** Replace everything inside `<body>` with:

```html
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

- [ ] **Step 5: Verify automatically**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS. The Three.js chunk-size warning is expected.

- [ ] **Step 6: Verify visually.** Run `pnpm dev` and open `design/mockup-v13-standalone.html` beside it. Check spec §9 items 1–4:
  1. The landscape, tree, leaves, fireflies and mist are all there. The Konteur holds his lantern. The intro text fades as you climb.
  2. You can climb with the wheel, a touch drag (use the devtools device mode) and the ↑ ↓ keys. The climb bar follows.
  3. A card label appears near each card. At this stage all three books are locked and show "Talè · bientôt", because Ti Kannot turns ready only in Task 12.
  4. Hovering the Konteur brightens the lantern and shows the bubble "Yé krik !…".

  Also check the browser console for warnings. Any three r186 deprecation must be fixed here, not ignored.

- [ ] **Step 7: Commit**

```bash
git add src/tree src/main.ts index.html
git commit -m "feat(tree): mount the tree universe from the app shell"
```

---

### Task 12: Ti Kannot world

**Files:**

- Create:
  - `src/books/ti-kannot/world/terrain.ts`, `env.ts`, `env.test.ts`, `speech.ts`, `speech.test.ts`
  - `src/books/ti-kannot/world/sky.ts`, `valley.ts`, `water.ts`, `props.ts`, `characters.ts`, `index.ts`
  - `src/books/ti-kannot/theme.css`
- Modify: `src/books/ti-kannot/book.ts`, which becomes `ready: true` and gains `world`.

**Interfaces:**

- Consumes:
  - `STAGING` and `PageEnv` (Task 6);
  - the Task 2 and Task 3 helpers;
  - `defineWorld`, `Story`, `BookHandle` (Task 4).
- Produces:
  - `world/index.ts` default-exports a `BookWorld`;
  - `worldCam(envs, pageF, out, look): { i0, i1, f }`
  - `mixEnv(envs, i0, i1, f): MixedEnv`
  - `dialogueLines(story, page): string[]`
  - `lineFor(name: "bird" | "crab", lines): string`

Port rules: the same as Task 10, applied to `scene13.js` lines 184–291 and to the world branch of `frame` and `pick` (lines 327–365).

- [ ] **Step 1: Write the failing tests**

`src/books/ti-kannot/world/env.test.ts`:

```ts
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
```

`src/books/ti-kannot/world/speech.test.ts`:

```ts
import type { Story } from "@app/contract";
import { describe, expect, it } from "vitest";
import { dialogueLines, lineFor } from "./speech";

const story: Story = {
  lang: "gcf",
  title: "T",
  pages: [
    {
      id: "a",
      label: "A",
      title: "A",
      blocks: [
        { kind: "text", text: "Narration.", html: "Narration." },
        { kind: "dialogue", text: "– Poukwa ?", html: "– Poukwa ?" },
        { kind: "dialogue", text: "– Pou jou ké rivé !", html: "– Pou jou ké rivé !" },
      ],
    },
    { id: "b", label: "B", title: "B", blocks: [{ kind: "text", text: "Pa ni pawòl.", html: "" }] },
  ],
};

describe("speech", () => {
  it("lists a page's dialogue lines without their dash", () => {
    expect(dialogueLines(story, 0)).toEqual(["Poukwa ?", "Pou jou ké rivé !"]);
  });

  it("gives Gwo Rako the first line and Ti Kannot the second (v13)", () => {
    const lines = dialogueLines(story, 0);
    expect(lineFor("crab", lines)).toBe("Poukwa ?");
    expect(lineFor("bird", lines)).toBe("Pou jou ké rivé !");
  });

  it("falls back to their calls on a page without dialogue", () => {
    expect(lineFor("crab", dialogueLines(story, 1))).toBe("Grrr…");
    expect(lineFor("bird", dialogueLines(story, 1))).toBe("Tchip tchip !");
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test src/books/ti-kannot`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the pure modules**

`src/books/ti-kannot/world/terrain.ts` (lines 185–187, 242):

```ts
/** Distance between two page stations along the river. */
export const STEP = 17;

/** River centre line x at depth z. */
export const meander = (z: number): number => Math.sin(z * 0.028) * 4 + Math.sin(z * 0.011) * 2;

const noise = (x: number, z: number): number =>
  Math.sin(x * 0.9 + z * 0.7) * 0.5 +
  Math.sin(x * 2.3 - z * 1.7) * 0.25 +
  Math.sin(x * 0.3 + z * 0.21) * 0.8;

/** Valley floor height (v13 `H`): a riverbed rising into bumpy banks. */
export function valleyHeight(x: number, z: number): number {
  const u = Math.abs(x - meander(z));
  return 0.12 * Math.pow(u, 1.7) - 2.7 + noise(x, z) * 0.45 * Math.min(1, u / 4);
}

/** Depth of page `index`'s station. */
export const station = (index: number): number => -index * STEP;
```

`src/books/ti-kannot/world/env.ts` (lines 275–291):

```ts
import * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";
import type { PageEnv } from "../staging";
import { meander, station, valleyHeight } from "./terrain";

type Weight = "water" | "stars" | "rain" | "glow" | "warm" | "dam" | "tank" | "spring" | "empty";

export interface MixedEnv extends Record<Weight, number> {
  kalbas: number;
  top: THREE.Color;
  bot: THREE.Color;
  /** Moon offset x, y, z and scale. */
  moon: [number, number, number, number];
  moonColor: THREE.Color;
  bird: THREE.Vector3;
  crab: THREE.Vector3 | null;
  /** Page whose characters and spring apply (switches at mid-way). */
  anchorPage: number;
  anchorHasSpring: boolean;
}

const a = new THREE.Vector3();
const b = new THREE.Vector3();

/** Camera position and look-at along the river for a fractional page (v13 `worldCam`). */
export function worldCam(
  envs: PageEnv[],
  pageF: number,
  out: THREE.Vector3,
  look: THREE.Vector3,
): { i0: number; i1: number; f: number } {
  const last = envs.length - 1;
  const i0 = Math.floor(clamp(pageF, 0, last));
  const i1 = Math.min(i0 + 1, last);
  const f = smoothstep(clamp(pageF - i0, 0, 1));
  const eye = (i: number, v: THREE.Vector3): THREE.Vector3 => {
    const z = station(i);
    return v.set(meander(z) + 1.4, envs[i].water + 2.6, z + 8.5);
  };
  const aim = (i: number, v: THREE.Vector3): THREE.Vector3 => {
    const z = station(i) - 10;
    return v.set(meander(z), envs[i].water + 0.4, z);
  };
  out.copy(eye(i0, a)).lerp(eye(i1, b), f);
  look.copy(aim(i0, a)).lerp(aim(i1, b), f);
  return { i0, i1, f };
}

/** Interpolated staging between two pages (v13 `mixEnv`). */
export function mixEnv(envs: PageEnv[], i0: number, i1: number, f: number): MixedEnv {
  const pa = envs[i0];
  const pb = envs[i1];
  const num = (k: Weight): number => lerp(pa[k] ?? 0, pb[k] ?? 0, f);
  const col = (ca: string, cb: string): THREE.Color =>
    new THREE.Color(ca).lerp(new THREE.Color(cb), f);
  const anchorPage = f < 0.5 ? i0 : i1;
  const e = envs[anchorPage];
  const z = station(anchorPage);
  let crab: THREE.Vector3 | null = null;
  if (e.crab) {
    crab = new THREE.Vector3(meander(z) + e.crab[0], 0, z + e.crab[1]);
    crab.y = Math.max(valleyHeight(crab.x, crab.z), e.water - 0.2) + 0.05;
  }
  return {
    water: num("water"),
    stars: num("stars"),
    rain: num("rain"),
    glow: num("glow"),
    warm: num("warm"),
    dam: num("dam"),
    tank: num("tank"),
    spring: num("spring"),
    empty: num("empty"),
    kalbas: Math.round(lerp(pa.kalbas, pb.kalbas, f)),
    top: col(pa.sky[0], pb.sky[0]),
    bot: col(pa.sky[1], pb.sky[1]),
    moon: [
      lerp(pa.moon[0], pb.moon[0], f),
      lerp(pa.moon[1], pb.moon[1], f),
      lerp(pa.moon[2], pb.moon[2], f),
      lerp(pa.moon[4], pb.moon[4], f),
    ],
    moonColor: col(pa.moon[3], pb.moon[3]),
    bird: new THREE.Vector3(meander(z) + e.bird[0], e.water + e.bird[1], z + e.bird[2]),
    crab,
    anchorPage,
    anchorHasSpring: Boolean(e.spring || e.dam),
  };
}
```

`src/books/ti-kannot/world/speech.ts` (v13 `speak`, `template.html`):

```ts
import type { Story } from "@app/contract";

export type CharacterName = "bird" | "crab";

const CALLS: Record<CharacterName, string> = { crab: "Grrr…", bird: "Tchip tchip !" };

/** Dialogue lines of a page, without their leading dash. */
export function dialogueLines(story: Story, page: number): string[] {
  return (story.pages[page]?.blocks ?? [])
    .filter((b) => b.kind === "dialogue")
    .map((b) => b.text.replace(/^–\s*/, ""));
}

/** v13 rule: Gwo Rako speaks first when present and Ti Kannot answers; otherwise their call. */
export function lineFor(name: CharacterName, lines: string[]): string {
  return lines[name === "crab" ? 0 : 1] ?? lines[0] ?? CALLS[name];
}
```

- [ ] **Step 4: Run the pure tests**

Run: `pnpm test src/books/ti-kannot`
Expected: PASS.

- [ ] **Step 5: Port the scene modules**

`src/books/ti-kannot/world/sky.ts` covers:

- sky, lines 191–203;
- rain, line 239;
- the frame part, lines 334–337 and 342.

```ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { MixedEnv } from "./env";

const VERTEX = `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FRAGMENT = `uniform vec3 cTop,cBot; uniform float uStars,uTime; varying vec3 vP;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){ vec3 d=normalize(vP); float h=clamp(d.y*1.6+.1,0.,1.); vec3 c=mix(cBot,cTop,pow(h,.7));
    c+=cBot*.35*exp(-abs(d.y)*9.);
    vec2 g=floor(d.xz/max(d.y,.02)*40.); float n=hash(g); float st=step(.985,n)*smoothstep(.02,.2,d.y)*(.6+.4*sin(uTime*2.+n*40.));
    c+=vec3(.9,.95,1.)*st*uStars; gl_FragColor=vec4(c,1.); }`;

/** Gradient sky dome with stars, moon and halo, and rain following the camera. */
export function createSky(rng: Rng): {
  group: THREE.Group;
  moon: THREE.Sprite;
  update(env: MixedEnv, time: number, camera: THREE.Vector3): void;
} {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      cTop: { value: new THREE.Color("#0d2b3e") },
      cBot: { value: new THREE.Color("#3aa2a0") },
      uStars: { value: 0.2 },
      uTime: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), material);
  const moon = softSprite("#f6e3b0", 14, 1);
  const halo = softSprite("#f6e3b0", 44, 0.35);
  const rain = glowPoints(rng, 2600, () => [(rng() - 0.5) * 40, rng() * 20, (rng() - 0.5) * 40], {
    size: 0.5,
    a: "#cfe9f5",
    b: "#e8f6ff",
    rain: true,
    fall: 14,
  });
  rain.material.uniforms.uOpacity.value = 0;
  const group = new THREE.Group();
  group.add(dome, moon, halo, rain);
  return {
    group,
    moon,
    update(env, time, cam) {
      material.uniforms.cTop.value.copy(env.top);
      material.uniforms.cBot.value.copy(env.bot);
      material.uniforms.uStars.value = env.stars;
      material.uniforms.uTime.value = time;
      dome.position.set(cam.x, 0, cam.z);
      moon.position.set(cam.x + env.moon[0], env.moon[1], cam.z + env.moon[2]);
      moon.scale.setScalar(12 * env.moon[3]);
      moon.material.color.copy(env.moonColor);
      halo.position.copy(moon.position);
      halo.scale.setScalar(40 * env.moon[3]);
      halo.material.color.copy(env.moonColor);
      halo.material.opacity = 0.25 + env.warm * 0.2;
      rain.position.set(cam.x, env.water, cam.z - 6);
      rain.material.uniforms.uTime.value = time;
      rain.material.uniforms.uOpacity.value = env.rain * 0.8;
    },
  };
}
```

`src/books/ti-kannot/world/valley.ts` (lines 205–209, 227–236):

```ts
import * as THREE from "three";
import { clamp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { meander, valleyHeight } from "./terrain";

export const VALLEY_WIDTH = 160;
export const VALLEY_LENGTH = 260;

/** Valley floor, bank trees with red flowers, riverbed rocks. */
export function createValley(rng: Rng): {
  group: THREE.Group;
  rockGeometry: THREE.BufferGeometry;
  rockMaterial: THREE.Material;
  update(time: number): void;
} {
  const group = new THREE.Group();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const floor = new THREE.PlaneGeometry(VALLEY_WIDTH, VALLEY_LENGTH, 110, 200);
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, 0, -VALLEY_LENGTH / 2 + 40);
  {
    const p = floor.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cA = new THREE.Color("#0b1d1c"),
      cB = new THREE.Color("#183a30"),
      cC = new THREE.Color("#3b6a4a");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        h = valleyHeight(x, z);
      p.setY(i, h);
      const t = clamp((h + 2.7) / 6, 0, 1);
      const c = t < 0.5 ? cA.clone().lerp(cB, t * 2) : cB.clone().lerp(cC, (t - 0.5) * 2);
      col.set([c.r, c.g, c.b], i * 3);
    }
    floor.setAttribute("color", new THREE.BufferAttribute(col, 3));
    floor.computeVertexNormals();
  }
  group.add(
    new THREE.Mesh(
      floor,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
    ),
  );

  const treeGeo = new THREE.ConeGeometry(1, 3.2, 6);
  treeGeo.translate(0, 1.6, 0);
  const trees = new THREE.InstancedMesh(
    treeGeo,
    new THREE.MeshStandardMaterial({ color: "#0b1e1c", roughness: 1, flatShading: true }),
    260,
  );
  const flowers: [number, number, number][] = [];
  for (let i = 0; i < 260; i++) {
    const z = 30 - rng() * 240,
      side = i % 2 ? 1 : -1;
    const x = meander(z) + side * (8 + rng() * 22),
      s = 0.8 + rng() * 2.2,
      y = valleyHeight(x, z) - 0.1;
    m4.compose(
      new THREE.Vector3(x, y, z),
      q.setFromAxisAngle(up, rng() * 6.28),
      s3.set(s * (0.7 + rng() * 0.5), s, s * (0.7 + rng() * 0.5)),
    );
    trees.setMatrixAt(i, m4);
    if (rng() < 0.3) {
      for (let k = 0; k < 6; k++) {
        flowers.push([
          x + (rng() - 0.5) * s * 1.4,
          y + s * (1.5 + rng() * 1.6),
          z + (rng() - 0.5) * s * 1.4,
        ]);
      }
    }
  }
  const flowerPoints = glowPoints(rng, flowers.length, (i) => flowers[i], {
    size: 0.3,
    a: "#ff6a4a",
    b: "#ffb347",
    drift: 0.05,
  });
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: "#233a3e",
    roughness: 1,
    flatShading: true,
  });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 220);
  for (let i = 0; i < 220; i++) {
    const z = 30 - rng() * 240,
      x = meander(z) + (rng() - 0.5) * 13,
      s = 0.25 + rng() * 0.7;
    m4.compose(
      new THREE.Vector3(x, valleyHeight(x, z) + s * 0.3, z),
      q.setFromAxisAngle(new THREE.Vector3(rng(), rng(), rng()).normalize(), rng() * 6.28),
      s3.set(s, s * 0.7, s),
    );
    rocks.setMatrixAt(i, m4);
  }
  group.add(trees, flowerPoints, rocks);
  return {
    group,
    rockGeometry,
    rockMaterial,
    update(time) {
      flowerPoints.material.uniforms.uTime.value = time;
    },
  };
}
```

`src/books/ti-kannot/world/water.ts` covers:

- water, lines 211–225;
- plankton, line 237;
- mist, line 240;
- the frame part, lines 331–333, 338, 341 and 343.

```ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { MixedEnv } from "./env";
import { meander } from "./terrain";
import { VALLEY_LENGTH, VALLEY_WIDTH } from "./valley";

const VERTEX = `uniform float uTime; varying vec3 vW; void main(){ vec3 p=position; vec4 w=modelMatrix*vec4(p,1.); w.y+=sin(w.x*.7+uTime*1.1)*.05+sin(w.z*.5-uTime*.8)*.06; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FRAGMENT = `uniform float uTime,uGlow,uFogD; uniform vec3 cDeep,cShallow,uMoon,cMoon,uFog,uCam; varying vec3 vW;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(12.98,78.23)))*43758.5); }
  void main(){ vec3 vd=normalize(uCam-vW); float fr=pow(1.-max(vd.y,0.),3.);
    vec3 c=mix(cDeep,cShallow,.25+fr*.6);
    vec2 dm=vW.xz-uMoon.xz; float streak=exp(-abs(dm.x+sin(vW.z*.6+uTime)*1.2)*.32)*clamp(1.-abs(dm.y)/90.,0.,1.);
    float shim=.5+.5*sin(vW.z*3.+uTime*3.+sin(vW.x*2.+uTime)); c+=cMoon*streak*shim*.8;
    float r=sin(vW.x*3.+uTime*1.6)*sin(vW.z*3.5-uTime*1.3); c+=cShallow*smoothstep(.86,1.,r)*.6;
    vec2 cell=floor(vW.xz*2.); vec2 fp=fract(vW.xz*2.)-.5; float n=hash(cell); c+=vec3(.35,.95,.85)*step(.975,n)*smoothstep(.22,.04,length(fp))*(.5+.5*sin(uTime*2.+n*60.))*uGlow;
    float dist=distance(uCam,vW); float f=1.-exp(-dist*dist*uFogD*uFogD); c=mix(c,uFog,f);
    gl_FragColor=vec4(c,.94); }`;

/** River surface with moon streak and plankton sparkles, plankton cloud and low mist. */
export function createRiver(rng: Rng): {
  group: THREE.Group;
  update(env: MixedEnv, time: number, camera: THREE.Vector3, moon: THREE.Vector3): void;
} {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      cDeep: { value: new THREE.Color("#0a3a44") },
      cShallow: { value: new THREE.Color("#2e8a8c") },
      uMoon: { value: new THREE.Vector3(0, 10, -70) },
      cMoon: { value: new THREE.Color("#fff1c8") },
      uGlow: { value: 1 },
      uFog: { value: new THREE.Color("#2f8a8c") },
      uFogD: { value: 0.016 },
      uCam: { value: new THREE.Vector3() },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
  });
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(VALLEY_WIDTH, VALLEY_LENGTH, 60, 100),
    material,
  );
  water.rotation.x = -Math.PI / 2;
  water.position.z = -VALLEY_LENGTH / 2 + 40;
  const plankton = glowPoints(
    rng,
    1400,
    () => {
      const z = 30 - rng() * 240;
      return [meander(z) + (rng() - 0.5) * 14, 0.1 + rng() * 3.5, z];
    },
    { size: 0.16, drift: 0.9, a: "#7af0dc", b: "#ffe6a0" },
  );
  const mists = Array.from({ length: 16 }, () => {
    const z = 20 - rng() * 220;
    const sprite = softSprite("#4aa08a", 12 + rng() * 14, 0.14, false);
    sprite.position.set(meander(z) + (rng() - 0.5) * 18, 0.6 + rng() * 1.2, z);
    return { sprite, phase: rng() * 6.28 };
  });
  const group = new THREE.Group();
  group.add(water, plankton, ...mists.map((m) => m.sprite));
  const shallow = new THREE.Color("#2e8a8c");
  const deep = new THREE.Color("#0a3a44");
  const u = material.uniforms;
  return {
    group,
    update(env, time, cam, moon) {
      water.position.y = env.water;
      u.uTime.value = time;
      u.uCam.value.copy(cam);
      u.uGlow.value = env.glow;
      u.cShallow.value.copy(env.bot).lerp(shallow, 0.5);
      u.cDeep.value.copy(env.top).lerp(deep, 0.5);
      u.uFog.value.copy(env.bot);
      u.uMoon.value.copy(moon);
      u.cMoon.value.copy(env.moonColor);
      plankton.material.uniforms.uTime.value = time;
      plankton.material.uniforms.uOpacity.value = env.glow;
      for (const { sprite, phase } of mists) {
        sprite.material.opacity =
          (0.1 + Math.sin(time * 0.3 + phase) * 0.04) * (1 - env.warm * 0.6);
        sprite.position.y = env.water + 0.8 + Math.sin(time * 0.2 + phase) * 0.3;
      }
    },
  };
}
```

`src/books/ti-kannot/world/props.ts` covers:

- spring, dam and tank, lines 243–251;
- `placeSpring`, lines 124 and 288;
- the frame part, lines 344–345.

The spring's default page and the tank's page are the first pages with `spring`/`dam` and with `tank` (4 and 10 in the v13 data), instead of hard-coded numbers.

```ts
import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { PageEnv } from "../staging";
import type { MixedEnv } from "./env";
import { meander, station, valleyHeight } from "./terrain";

/** The spring, the stone dam around it and the new water tank. */
export function createProps(
  rng: Rng,
  rockGeometry: THREE.BufferGeometry,
  rockMaterial: THREE.Material,
  envs: PageEnv[],
): { group: THREE.Group; update(env: MixedEnv, time: number): void } {
  const spring = new THREE.Group();
  const dam = new THREE.Group();
  let springPage = -1;
  const placeSpring = (page: number): void => {
    springPage = page;
    const z = station(page) - 7,
      x = meander(z) - 6.8;
    spring.position.set(x, valleyHeight(x, z) + 0.3, z);
    dam.position.copy(spring.position);
  };
  const springLight = new THREE.PointLight("#7af0dc", 30, 18, 1.8);
  springLight.position.y = 1;
  const springGlow = softSprite("#9af5e6", 5, 0.8);
  const springPoints = glowPoints(
    rng,
    160,
    () => [(rng() - 0.5) * 1.6, rng() * 2.5, (rng() - 0.5) * 1.6],
    {
      size: 0.2,
      drift: 0.3,
      a: "#9af5e6",
      b: "#dffcf6",
      fall: -1.2,
    },
  );
  const springRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), rockMaterial);
  springRock.position.set(-1.2, 0.4, -1);
  spring.add(springLight, springGlow, springPoints, springRock);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(Math.cos(a) * 1.7, 0.1, Math.sin(a) * 1.7);
    rock.scale.setScalar(0.28 + rng() * 0.18);
    dam.add(rock);
  }
  dam.scale.setScalar(0);
  placeSpring(
    Math.max(
      0,
      envs.findIndex((e) => e.spring || e.dam),
    ),
  );

  const tank = new THREE.Group();
  {
    const found = envs.findIndex((e) => e.tank);
    const page = found >= 0 ? found : envs.length - 1;
    const z = station(page) - 8,
      x = meander(z) + 5.2;
    tank.position.set(x, valleyHeight(x, z) + 0.1, z);
  }
  tank.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.4, 1.5, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: 0.9, side: THREE.DoubleSide }),
    ),
  );
  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 16),
    new THREE.MeshStandardMaterial({ color: "#2e8a8c", emissive: "#1a5a5c", roughness: 0.2 }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.6;
  tank.add(surface);
  const tapMaterial = new THREE.MeshStandardMaterial({
    color: "#c19a52",
    metalness: 0.6,
    roughness: 0.4,
  });
  for (let i = 0; i < 3; i++) {
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5), tapMaterial);
    const a = -0.6 + i * 0.6;
    tap.rotation.z = Math.PI / 2;
    tap.rotation.y = a;
    tap.position.set(Math.sin(a) * 1.7, -0.1, Math.cos(a) * 1.7);
    tank.add(tap);
  }
  tank.scale.setScalar(0);

  const group = new THREE.Group();
  group.add(spring, dam, tank);
  return {
    group,
    update(env, time) {
      if (env.anchorHasSpring && springPage !== env.anchorPage) placeSpring(env.anchorPage);
      springPoints.material.uniforms.uTime.value = time;
      springLight.intensity = (18 + Math.sin(time * 2) * 6) * (0.4 + env.spring * 0.6);
      springGlow.material.opacity = 0.4 + env.spring * 0.5;
      dam.scale.setScalar(lerp(dam.scale.x, env.dam, 0.08));
      tank.scale.setScalar(lerp(tank.scale.x, env.tank, 0.08));
    },
  };
}
```

`src/books/ti-kannot/world/characters.ts` covers:

- bird, crab and calabashes, lines 253–270;
- the frame part, lines 347–357;
- pick, line 365;
- snap, from `resetWorld`, line 368.

```ts
import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import type { MixedEnv } from "./env";
import type { CharacterName } from "./speech";
import { valleyHeight } from "./terrain";

const MAX_KALBAS = 24;

/** Ti Kannot (golden bird on a perch), Gwo Rako (red crab) and his stacked calabashes. */
export function createCharacters(rng: Rng): {
  group: THREE.Group;
  snap(env: MixedEnv): void;
  update(env: MixedEnv, time: number): void;
  pick(ray: THREE.Raycaster): CharacterName | null;
  anchor(name: CharacterName, out: THREE.Vector3): { point: THREE.Vector3; visible: boolean };
} {
  const gold = new THREE.MeshStandardMaterial({
    color: "#f2c46d",
    emissive: "#a86a20",
    emissiveIntensity: 0.35,
    roughness: 0.6,
  });
  const bird = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), gold);
  body.scale.set(1.3, 0.9, 0.9);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), gold);
  head.position.set(0.42, 0.22, 0);
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.26, 6),
    new THREE.MeshStandardMaterial({ color: "#e07a3a" }),
  );
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.68, 0.2, 0);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: "#0b1a1c" });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMaterial);
    eye.position.set(0.54, 0.28, s * 0.12);
    bird.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), gold);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.55, 0.05, 0);
  const wingGeometry = new THREE.PlaneGeometry(0.6, 0.35);
  wingGeometry.translate(0, 0, 0.3);
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: "#f2c46d",
    emissive: "#a86a20",
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const wings = [-1, 1].map((side) => {
    const mesh = new THREE.Mesh(wingGeometry, wingMaterial);
    mesh.rotation.x = side > 0 ? 0 : Math.PI;
    mesh.rotation.y = 0.1;
    mesh.position.set(-0.05, 0.18, 0);
    bird.add(mesh);
    return { mesh, side };
  });
  const perch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 3.2, 6),
    new THREE.MeshStandardMaterial({ color: "#4a2e1e", roughness: 1 }),
  );
  perch.rotation.z = Math.PI / 2 + 0.25;
  perch.position.set(-1.2, -0.5, 0);
  const birdLegs = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4),
    new THREE.MeshStandardMaterial({ color: "#e07a3a" }),
  );
  birdLegs.position.set(0, -0.4, 0);
  bird.add(body, head, beak, tail, perch, birdLegs);
  bird.scale.setScalar(0.8);

  const crabMaterial = new THREE.MeshStandardMaterial({
    color: "#d9603a",
    emissive: "#7a2a10",
    emissiveIntensity: 0.35,
    roughness: 0.7,
  });
  const crab = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), crabMaterial);
  shell.scale.set(1.1, 0.5, 0.8);
  shell.position.y = 0.5;
  const claws = [-1, 1].map((side) => {
    const group = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 6), crabMaterial);
    arm.rotation.z = side * -0.9;
    arm.position.set(side * 0.4, 0.1, 0);
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), crabMaterial);
    claw.scale.set(1.2, 0.8, 0.9);
    claw.position.set(side * 0.75, 0.4, 0);
    group.add(arm, claw);
    group.position.set(side * 0.9, 0.5, 0.45);
    crab.add(group);
    return { group, side };
  });
  const legs: { mesh: THREE.Mesh; phase: number }[] = [];
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 1.1, 5), crabMaterial);
      mesh.position.set(side * 1.05, 0.35, -0.25 + i * 0.35);
      mesh.rotation.z = side * 1.0;
      legs.push({ mesh, phase: i });
      crab.add(mesh);
    }
  }
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: "#f6e3b0",
    emissive: "#f6e3b0",
    emissiveIntensity: 0.5,
  });
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4), crabMaterial);
    stalk.position.set(side * 0.25, 1.0, 0.55);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeWhite);
    eye.position.set(side * 0.25, 1.17, 0.55);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMaterial);
    pupil.position.set(side * 0.25, 1.17, 0.64);
    crab.add(stalk, eye, pupil);
  }
  crab.add(shell);

  const kalbasMaterial = new THREE.MeshStandardMaterial({ color: "#c9a061", roughness: 0.8 });
  const kalbas = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    kalbasMaterial,
    MAX_KALBAS,
  );
  kalbas.count = 0;
  const offsets = Array.from(
    { length: MAX_KALBAS },
    (_, i) => [(rng() - 0.5) * 3.2, (rng() - 0.5) * 2.4, 0.28 + Math.floor(i / 12) * 0.45] as const,
  );

  const group = new THREE.Group();
  group.add(bird, crab, kalbas);
  const birdPos = new THREE.Vector3();
  const crabPos = new THREE.Vector3();
  let crabVisible = 0;
  const m4 = new THREE.Matrix4();
  const identity = new THREE.Quaternion();
  const kalbasScale = new THREE.Vector3(1, 1.2, 1);
  const tmp = new THREE.Vector3();

  return {
    group,
    snap(env) {
      birdPos.copy(env.bird);
      if (env.crab) {
        crabPos.copy(env.crab);
        crabVisible = 1;
      } else {
        crabVisible = 0;
      }
    },
    update(env, time) {
      birdPos.lerp(env.bird, 0.06);
      bird.position.copy(birdPos);
      bird.position.y += Math.sin(time * 2.2) * 0.04;
      bird.rotation.y = Math.PI * 0.15 + Math.sin(time * 0.5) * 0.2;
      for (const w of wings)
        w.mesh.rotation.x = (w.side > 0 ? 0 : Math.PI) + Math.sin(time * 9) * 0.35 * w.side;
      if (env.crab) {
        crabPos.lerp(env.crab, 0.06);
        crabVisible = lerp(crabVisible, 1, 0.08);
      } else {
        crabVisible = lerp(crabVisible, 0, 0.1);
      }
      crab.position.copy(crabPos);
      crab.scale.setScalar(Math.max(0.001, crabVisible));
      crab.rotation.y = -0.5 + Math.sin(time * 0.4) * 0.15;
      crab.position.y += Math.abs(Math.sin(time * 3)) * 0.03;
      for (const c of claws) c.group.rotation.z = Math.sin(time * 1.4 + c.side) * 0.18 * c.side;
      for (const l of legs) l.mesh.rotation.x = Math.sin(time * 4 + l.phase * 2) * 0.18;
      const count = env.crab ? Math.min(env.kalbas, MAX_KALBAS) : 0;
      kalbas.count = count;
      kalbasMaterial.color.set(env.empty > 0.5 ? "#7a6a55" : "#c9a061");
      for (let i = 0; i < count; i++) {
        const o = offsets[i];
        const x = crabPos.x + 2.2 + o[0],
          z = crabPos.z + o[1];
        const y = Math.max(valleyHeight(x, z), env.water - 0.2) + o[2];
        m4.compose(tmp.set(x, y, z), identity, kalbasScale);
        kalbas.setMatrixAt(i, m4);
      }
      kalbas.instanceMatrix.needsUpdate = true;
    },
    pick(ray) {
      let object: THREE.Object3D | null =
        ray.intersectObjects([bird, crab], true)[0]?.object ?? null;
      while (object) {
        if (object === bird) return "bird";
        if (object === crab) return "crab";
        object = object.parent;
      }
      return null;
    },
    anchor(name, out) {
      if (name === "bird")
        return { point: out.copy(bird.position).setY(bird.position.y + 0.6), visible: true };
      return {
        point: out.copy(crab.position).setY(crab.position.y + 1.5),
        visible: crabVisible > 0.5,
      };
    },
  };
}
```

- [ ] **Step 6: Write the mount** — `src/books/ti-kannot/world/index.ts`. It covers:
  - lights and fog, lines 184, 188–189;
  - the frame world branch, lines 327–358;
  - tap handling from `onUp` and `speak` in `template.html`.

```ts
import "../theme.css";
import * as THREE from "three";
import { defineWorld, type Story } from "@app/contract";
import { createRng } from "@shared/random";
import { createStage } from "@shared/three/stage";
import { STAGING, type PageEnv } from "../staging";
import { createCharacters } from "./characters";
import { mixEnv, worldCam } from "./env";
import { createProps } from "./props";
import { createSky } from "./sky";
import { dialogueLines, lineFor, type CharacterName } from "./speech";
import { createValley } from "./valley";
import { createRiver } from "./water";

const SPEAK_MS = 4200;
const TAP_DISTANCE = 8;
const TAP_MS = 600;

/** Staging of each story page, in reading order. */
function envsFor(story: Story): PageEnv[] {
  return story.pages.map((page) => {
    const env = STAGING[page.id];
    if (!env) throw new Error(`ti-kannot: no staging for page "${page.id}"`);
    return env;
  });
}

/** Larivyè Klè: a night river whose level, sky and inhabitants change page after page. */
export default defineWorld({
  mount(container, ctx) {
    const envs = envsFor(ctx.story);
    const stage = createStage(container);
    try {
      const { scene, camera } = stage;
      const fog = new THREE.FogExp2("#2f8a8c", 0.016);
      scene.fog = fog;
      const hemi = new THREE.HemisphereLight("#3aa2a0", "#0b1a1c", 0.9);
      const sun = new THREE.DirectionalLight("#fff1c8", 1.6);
      const rng = createRng(11);
      const sky = createSky(rng);
      const valley = createValley(rng);
      const river = createRiver(rng);
      const props = createProps(rng, valley.rockGeometry, valley.rockMaterial, envs);
      const cast = createCharacters(rng);
      scene.add(
        hemi,
        sun,
        sun.target,
        sky.group,
        valley.group,
        river.group,
        props.group,
        cast.group,
      );

      let story = ctx.story;
      let page = ctx.page;
      let pageF = ctx.page;
      let speakTimer: ReturnType<typeof setTimeout> | undefined;
      let down: { y: number; t: number; moved: number } | null = null;
      const pointer = { x: 0, y: 0 };
      const cam = new THREE.Vector3();
      const look = new THREE.Vector3();
      const anchorPoint = new THREE.Vector3();
      const black = new THREE.Color("#000000");
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      const place = (): ReturnType<typeof mixEnv> => {
        const { i0, i1, f } = worldCam(envs, pageF, cam, look);
        return mixEnv(envs, i0, i1, f);
      };
      cast.snap(place());

      const speak = (name: CharacterName): void => {
        ctx.bubble.show(lineFor(name, dialogueLines(story, page)), () => {
          const a = cast.anchor(name, anchorPoint);
          const s = stage.project(a.point);
          return { x: s.x, y: s.y, visible: s.visible && a.visible };
        });
        clearTimeout(speakTimer);
        speakTimer = setTimeout(() => ctx.bubble.hide(), SPEAK_MS);
      };

      const frame = (time: number, dt: number): void => {
        pageF += (page - pageF) * (1 - Math.exp(-dt * 3.2));
        const env = place();
        camera.position.copy(cam);
        camera.position.x += pointer.x * 0.6;
        camera.position.y += pointer.y * 0.35;
        camera.lookAt(look);
        sky.update(env, time, camera.position);
        river.update(env, time, camera.position, sky.moon.position);
        fog.color.copy(env.bot).lerp(black, 0.15);
        sun.position.copy(sky.moon.position);
        sun.target.position.set(camera.position.x, 0, camera.position.z - 12);
        sun.color.copy(env.moonColor);
        sun.intensity = 1.0 + env.warm * 1.6;
        hemi.color.copy(env.bot);
        hemi.intensity = 0.7 + env.glow * 0.3;
        valley.update(time);
        props.update(env, time);
        cast.update(env, time);
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
      container.addEventListener("pointerdown", onPointerDown);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerup", onPointerUp);
      stage.start(frame);

      return {
        setPage(index) {
          page = index;
          clearTimeout(speakTimer);
        },
        setStory(next) {
          story = next;
        },
        dispose() {
          clearTimeout(speakTimer);
          container.removeEventListener("pointerdown", onPointerDown);
          container.removeEventListener("pointermove", onPointerMove);
          container.removeEventListener("pointerup", onPointerUp);
          stage.dispose();
        },
      };
    } catch (err) {
      stage.dispose();
      throw err;
    }
  },
});
```

- [ ] **Step 7: Add the theme and flip the manifest**

`src/books/ti-kannot/theme.css` holds the v13 palette:

```css
[data-book="ti-kannot"] {
  --reading-accent: #7af0dc;
  --reading-text: rgba(238, 243, 238, 0.92);
  --reading-title: #f6ead0;
  --reading-card-bg: rgba(5, 14, 20, 0.58);
  --reading-card-border: rgba(122, 240, 220, 0.18);
  --reading-font-display: "Cormorant Garamond", serif;
  --reading-font-body: "Quicksand", sans-serif;
}
```

In `src/books/ti-kannot/book.ts`, set `ready: true` and add the lazy world:

```ts
  ready: true,
  card: { title: "Ti Kannot é Gwo Rako", sub: "Larivyè-la té swèf", theme: "Dlo · L’eau" },
  cover: paintCover,
  world: () => import("./world/index"),
```

- [ ] **Step 8: Verify automatically**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected:

- everything PASSES;
- `books.test.ts` now also checks the ready-book rules for Ti Kannot;
- the build output shows a separate chunk for `world/index`, which is the lazy load.

- [ ] **Step 9: Verify visually** with `pnpm dev`, beside the mockup. Check spec §9 items 5–10: 5. Ti Kannot's card shows its painted cover. "Antré adan kont-la" zooms into the card, the flash covers the screen, and the river world appears. 6. Across the 12 pages, the sky, water level, moon, rain, calabashes, dam, spring and tank change as they do in v13. 7. Paging works with the wheel, the arrows, the dots and the buttons. Page 1 shows "Défilez pou kontinyé". 8. Clicking the bird or the crab on page 3 shows their dialogue lines. 9. The Kréyòl, Bileng and Français switch works. Bileng shows the French under a dashed line. 10. Escape and the back button bring the flash up, then you're back on the tree at Ti Kannot's card.

  Also check:
  - DevTools → Memory: enter and leave 5 times. The count of WebGL contexts must not grow, which the console would show as "Too many active WebGL contexts".
  - Block `world/index` in DevTools → Network, then enter the book. You must land back on the tree with "Kont-la pa ka chajé".

- [ ] **Step 10: Commit**

```bash
git add src/books/ti-kannot
git commit -m "feat(ti-kannot): port the Larivyè Klè world into the book universe"
```

---

### Task 13: Documentation and final verification

**Files:**

- Modify: `CLAUDE.md`, `doc/architecture.md`, `README.md` (structure section only, if it has one), and the spec's `Status`.

- [ ] **Step 1: Update `CLAUDE.md`.**
  - Replace the Structure block with the tree from this plan's "File Structure".
  - Replace these Code-style bullets:
    - "The scene must stay framework-agnostic…";
    - "One world module per tale; tale data … lives in `src/content/`".

    Use this text in their place:

```md
- Universes: `src/tree/` and each `src/books/<id>/` are isolated (ESLint `no-restricted-imports`).
  They may import only their own files, `@shared/*` and `@app/contract`. Add a book = add a folder
  with `book.ts` (+ `story/gcf.md`, `cover.ts`, `staging.ts`, `world/` when ready).
- Tale text lives in `src/books/<id>/story/<lang>.md` (gcf required, fr, en). Format: spec §4 in
  `docs/superpowers/specs/2026-09-29-universes-per-book-design.md`.
```

Remove the `kr.g` gotcha: the gloss is now the `fr.md` summary.

- [ ] **Step 2: Update `doc/architecture.md`.**
  - Replace §3 "Target architecture" with a short ASCII diagram of app shell, tree and books (the spec §3 tree), plus a link to the spec.
  - Mark issues #2 (per-book world) and #7 (per-universe seed) as done in the §4 table.

- [ ] **Step 3: Set the spec's status.** Change `**Status**: awaiting review` to `**Status**: implemented`.

- [ ] **Step 4: Run the full verification**

Run:

```bash
pnpm format
pnpm test && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pre-commit run --all-files
```

Expected: all PASS.

Then run the full 10-point manual checklist (spec §9) once more, side by side with the mockup. Report any visual difference to the user instead of silently tuning values.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md doc/architecture.md README.md docs/superpowers/specs/2026-09-29-universes-per-book-design.md
git commit -m "docs: describe the per-universe structure"
```
