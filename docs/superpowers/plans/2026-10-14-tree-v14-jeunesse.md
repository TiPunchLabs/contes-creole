# 🌳 Pyébwa a Sav — tree screen v14 "Jeunesse" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the v14.2 "Jeunesse" mockup to the tree screen — warm dusk scene, balanced breathing tree, Guadeloupe flora, wandering Konpè Lapen & Konpè Zanba, v14 HUD with a "Sé kont-la" shelf, automatic lite mode — without changing any book screen.

**Architecture:** Everything lives in the tree universe (`src/tree/**`). The scene is split into focused builders (`ground`, `landscape`, `flora`, `tree`, `sky`, `cards`, `konteur`, `critters/*`) consuming one seeded RNG in the mockup's order; critter walking is pure logic (`critters/wander.ts`) driven from `index.ts`. The shell only gets tree-scoped CSS keyed on the existing `data-book` attribute, a v14 fallback screen, and `createStage` gains backward-compatible `exposure` / `maxPixelRatio` options.

**Tech Stack:** Vite 8, TypeScript 6 (strict), Three.js r186, vanilla DOM + CSS, vitest (+ happy-dom for DOM tests), `@fontsource`, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-14-tree-v14-jeunesse-design.md`

**Reference source:** the mockup scene, extracted in Task 1 to `design/v14/scene14.js` (HUD in `design/v14/template.html`). Whenever a value in this plan looks odd, the mockup is the source of truth for the tree scene.

## Global Constraints

- Package manager: `pnpm` only. Never `npm` / `yarn`.
- English identifiers, comments, commit messages (Conventional Commits). Docstrings on every function, no obvious inline comments. Strict TypeScript, no `any`.
- `src/tree/**` may import only its own files, `@shared/*`, `@app/contract` and npm packages (ESLint `no-restricted-imports`, `isolation.test.ts`).
- **Never touch** `src/books/**`, `src/app/reading-ui/**`, `src/app/language-panel/**`, `src/app/app.ts`. The book screen must look exactly as on `main`.
- **Never edit** `design/v13/**`; `design/v14/**` is written once (Task 1) and then frozen.
- One `createRng(11)` for the whole tree scene, consumed in this order: ground → mornes → flora (palms, breadfruits, flamboyants, bananas, balisiers, tree ferns, fern blades) → grass → pool → tree (growth, roots, canopy puffs, leaf glow) → sky (fireflies, stars, mists) → cards. Critters use their own `createRng(17)`.
- Lite factor `0.45`; lite = `cores <= 4 || pointer: coarse`, overridable with `?lite=1` / `?lite=0`.
- Tree exposure `1.05`; max pixel ratio `1` (lite) / `1.5` (full). `createStage` defaults stay `1.15` / `1.5`.
- Kréyòl: follow `docs/kreyol/AGENT_RULES.md`. Shelf label is `Sé kont-la` (never `Kont-yo`). Uncertain forms keep the mockup text and go to `docs/kreyol/variants.md` § 3.
- No headless browser runs (no Playwright / Chromium captures): visual checks happen in the user's own browser.
- Gate before finishing: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- Commits: on branch `feat/tree-redesign` only, and **only once the user has agreed to commits for this execution** (user rule: never auto-commit). If not agreed, skip every "Commit" step and leave changes staged-free in the working tree.
- Leave the pre-existing uncommitted change in `src/books/ti-kannot/langue/fr.md` alone: never stage it, never revert it.

## Review Focus

- A critter walking **through the trunk** (its turn is gradual, so a curved path can cut inside the straight-line clearance) → it must never get closer than the tree obstacle; pinned by a safety check + test in Task 6.
- **Enter / Space on a focused shelf button** → must trigger that button only, not also `enter(near)` / climb from the tree's window key handler; pinned in Task 9 (key filter) and Task 8 (shelf test).
- **Wheel over the shelf** on a narrow screen → must scroll the shelf, not climb the tree; pinned in Task 9 (wheel filter, manual check in Task 12).
- **Book screen after this branch** → bubble, vignette, grain, notice look exactly as on `main` while a book is open; tree styles are keyed on `.app:not([data-book])` (Task 10), `data-book` set/removed is already pinned by `app.test.ts`; manual check in Task 12.
- **Locked book chosen from the shelf** → camera climbs to it, never opens it, even on the second press; pinned in Task 8 (`shelfAction`).

---

## File map

| File                                                          | Status  | Responsibility                                                                                  |
| ------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `design/v14/{template.html,scene14.js,README.md}`             | create  | Frozen mockup sources (reference)                                                               |
| `package.json`, `pnpm-lock.yaml`                              | modify  | `@fontsource/baloo-2`, `@fontsource/andika`                                                     |
| `src/shared/three/stage.ts` (+ test)                          | modify  | `StageOptions { exposure, maxPixelRatio }`                                                      |
| `src/tree/lite.ts` (+ test)                                   | create  | `detectLite`, `readLiteEnv`, `scaleCount`, `Count`                                              |
| `src/tree/fonts.ts`                                           | create  | Font imports for the tree                                                                       |
| `src/tree/scene/ground.ts`                                    | create  | `groundHeight` (moved out of `landscape.ts`)                                                    |
| `src/tree/scene/camera.ts` (+ test)                           | modify  | v14 `hubCam`, `cardT(index, count)`                                                             |
| `src/tree/scene/flora.ts`                                     | create  | Palms, breadfruits, flamboyants, bananas, balisiers, tree ferns, fern blades, `FLORA_OBSTACLES` |
| `src/tree/scene/landscape.ts`                                 | rewrite | Lights, ground, mornes, flora, grass, pool                                                      |
| `src/tree/scene/sky.ts`                                       | create  | Sky dome, moon, stars, mists, fireflies                                                         |
| `src/tree/scene/tree.ts`                                      | rewrite | Balanced tree, canopy puffs, breathing / rustle, hollow                                         |
| `src/tree/scene/cards.ts`, `locked-cover.ts`                  | modify  | v14 card frame, halo, thread, spread                                                            |
| `src/tree/scene/konteur.ts`                                   | modify  | v14 materials, `KONTEUR_OBSTACLES`                                                              |
| `src/tree/scene/critters/wander.ts` (+ test)                  | create  | Pure walk logic                                                                                 |
| `src/tree/scene/critters/parts.ts`                            | create  | Shared mesh helpers, `CritterView`                                                              |
| `src/tree/scene/critters/lapen.ts`, `zanba.ts`                | create  | Models + animated pose                                                                          |
| `src/tree/overlay/shelf.ts` (+ test)                          | create  | "Sé kont-la" nav, `shelfAction`                                                                 |
| `src/tree/overlay/overlay.ts`, `overlay.css`                  | rewrite | v14 HUD                                                                                         |
| `src/tree/index.ts`                                           | rewrite | Wiring                                                                                          |
| `src/style.css`, `src/app/fallback.ts`, `src/app/app.test.ts` | modify  | Tree-scoped shell styles, v14 fallback                                                          |
| `docs/kreyol/{variants.md,correction-report.md}`              | modify  | Kréyòl decisions                                                                                |

---

### Task 1: Archive the v14 mockup, add the fonts

**Files:**

- Create: `design/v14/template.html`, `design/v14/scene14.js`, `design/v14/README.md`
- Create: `src/tree/fonts.ts`
- Modify: `package.json`, `pnpm-lock.yaml` (via pnpm)

**Interfaces:**

- Produces: `design/v14/scene14.js` (reference for Tasks 3–7), `src/tree/fonts.ts` (side-effect module imported by `src/tree/index.ts` in Task 9).

- [ ] **Step 1: Write the extraction script in the scratchpad** (never inside the repo)

Save as `<scratchpad>/extract_v14.py`:

```python
"""Extracts template + scene sources from a Claude Design self-unpacking bundle."""
import base64
import gzip
import json
import os
import re
import sys

src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding="utf-8").read()


def block(kind: str) -> str:
    """Returns the body of <script type="__bundler/<kind>">."""
    return re.search(r'<script type="__bundler/' + kind + r'">(.*?)</script>', html, re.S).group(1)


manifest = json.loads(block("manifest"))
names = {e["uuid"]: e["id"] for e in json.loads(block("ext_resources"))}
os.makedirs(out, exist_ok=True)
open(os.path.join(out, "template.html"), "w", encoding="utf-8").write(json.loads(block("template")))
for uuid, entry in manifest.items():
    if names.get(uuid) != "sceneJs":
        continue
    data = base64.b64decode(entry["data"])
    if entry.get("compressed"):
        data = gzip.decompress(data)
    open(os.path.join(out, "scene14.js"), "wb").write(data)
```

- [ ] **Step 2: Run it**

Run: `python3 -I <scratchpad>/extract_v14.py ../contes-creole-assets/maquette-14-1.html design/v14 && ls -la design/v14`
Expected: `template.html` (~35 KB) and `scene14.js` (~70 KB). `head -4 design/v14/scene14.js` shows the `// v14.2 — Konpè Lapen et Konpè Zanba …` header.

- [ ] **Step 3: Write `design/v14/README.md`**

```markdown
# Mockup v14.2 "Jeunesse" — reference only

Extracted from `contes-creole-assets/maquette-14-1.html` (Claude Design bundle) on 2026-10-14.

- `template.html` — HUD markup, styles and component script (fonts referenced by bundle uuids).
- `scene14.js` — Three.js scene (hub + world). Only the hub (tree screen) is ported; the world part
  is not used (books own their worlds).
- `kont-data.js` and `konteur.png` are byte-identical to `design/v13/` and are not duplicated.

Never edited. Spec: `docs/superpowers/specs/2026-10-14-tree-v14-jeunesse-design.md`.
```

- [ ] **Step 4: Add the font packages**

Run: `pnpm add @fontsource/baloo-2 @fontsource/andika`
Then: `ls node_modules/@fontsource/baloo-2/ node_modules/@fontsource/andika/ | grep -E '^(400|700|800)\.css$'`
Expected: `700.css`, `800.css` for Baloo 2 and `400.css`, `700.css` for Andika. If a weight file is missing, stop and report it (do not substitute another weight silently).

- [ ] **Step 5: Create `src/tree/fonts.ts`**

```ts
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/andika/400.css";
import "@fontsource/andika/700.css";
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass (`design/` is ignored by ESLint and Prettier).

- [ ] **Step 7: Commit** (only if the user agreed to commits)

```bash
git add design/v14 src/tree/fonts.ts package.json pnpm-lock.yaml
git commit -m "chore(tree): archive mockup v14 and add Baloo 2 / Andika fonts"
```

---

### Task 2: Stage options and lite detection

**Files:**

- Modify: `src/shared/three/stage.ts:38-56`
- Modify: `src/shared/three/stage.test.ts`
- Create: `src/tree/lite.ts`, `src/tree/lite.test.ts`

**Interfaces:**

- Produces:
  - `export interface StageOptions { exposure?: number; maxPixelRatio?: number }` and `createStage(container: HTMLElement, options?: StageOptions): Stage` in `@shared/three/stage`.
  - In `src/tree/lite.ts`: `export type Count = (n: number) => number;`, `export interface LiteEnv { cores: number; coarsePointer: boolean; search: string }`, `export const LITE_FACTOR = 0.45`, `detectLite(env: LiteEnv): boolean`, `readLiteEnv(): LiteEnv`, `scaleCount(n: number, lite: boolean): number`.

- [ ] **Step 1: Write the failing stage test**

In `src/shared/three/stage.test.ts`, make the fake renderer record its pixel ratio — replace the `setPixelRatio` no-op inside `FakeRenderer` with:

```ts
    pixelRatio = 0;
    /** Records the requested pixel ratio. */
    setPixelRatio(ratio: number): void {
      this.pixelRatio = ratio;
    }
```

Then append a new `describe` at the end of the file:

```ts
describe("createStage options", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the historical defaults", async () => {
    vi.stubGlobal("devicePixelRatio", 3);
    const { createStage } = await import("./stage");
    const stage = createStage(document.createElement("div"));
    expect(stage.renderer.toneMappingExposure).toBe(1.15);
    expect((stage.renderer as unknown as { pixelRatio: number }).pixelRatio).toBe(1.5);
  });

  it("applies exposure and pixel-ratio cap", async () => {
    vi.stubGlobal("devicePixelRatio", 3);
    const { createStage } = await import("./stage");
    const stage = createStage(document.createElement("div"), { exposure: 1.05, maxPixelRatio: 1 });
    expect(stage.renderer.toneMappingExposure).toBe(1.05);
    expect((stage.renderer as unknown as { pixelRatio: number }).pixelRatio).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/shared/three/stage.test.ts`
Expected: FAIL — "applies exposure and pixel-ratio cap" gets `1.15` (or a TS error on the extra argument).

- [ ] **Step 3: Implement the options**

In `src/shared/three/stage.ts`, add above `createStage`:

```ts
export interface StageOptions {
  /** Tone-mapping exposure (default 1.15, the v13 value). */
  exposure?: number;
  /** Upper bound of the device pixel ratio (default 1.5). */
  maxPixelRatio?: number;
}
```

Change the signature and the two renderer lines:

```ts
/** Full-size canvas with the v13 renderer settings and a pausable render loop. Throws without WebGL. */
export function createStage(container: HTMLElement, options: StageOptions = {}): Stage {
```

```ts
renderer.setPixelRatio(Math.min(devicePixelRatio, options.maxPixelRatio ?? 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = options.exposure ?? 1.15;
```

- [ ] **Step 4: Run the stage tests**

Run: `pnpm vitest run src/shared/three/stage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing lite test** — `src/tree/lite.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { detectLite, scaleCount } from "./lite";

const env = (cores: number, coarsePointer: boolean, search = "") => ({
  cores,
  coarsePointer,
  search,
});

describe("detectLite", () => {
  it.each([
    [env(8, false), false],
    [env(4, false), true],
    [env(2, false), true],
    [env(16, true), true],
  ])("%o → %s", (input, expected) => {
    expect(detectLite(input)).toBe(expected);
  });

  it("obeys ?lite=1 and ?lite=0 over detection", () => {
    expect(detectLite(env(16, false, "?lite=1"))).toBe(true);
    expect(detectLite(env(2, true, "?lite=0"))).toBe(false);
    expect(detectLite(env(16, false, "?lite=maybe"))).toBe(false);
  });
});

describe("scaleCount", () => {
  it("keeps full counts outside lite mode", () => {
    expect(scaleCount(600, false)).toBe(600);
  });

  it("scales by 0.45 and never drops below one", () => {
    expect(scaleCount(600, true)).toBe(270);
    expect(scaleCount(1, true)).toBe(1);
    expect(scaleCount(0, true)).toBe(1);
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `pnpm vitest run src/tree/lite.test.ts`
Expected: FAIL — cannot resolve `./lite`.

- [ ] **Step 7: Implement `src/tree/lite.ts`**

```ts
/** Scales a particle / instance count to the current quality level. */
export type Count = (n: number) => number;

export interface LiteEnv {
  cores: number;
  coarsePointer: boolean;
  /** `location.search`; `?lite=1` / `?lite=0` force the mode. */
  search: string;
}

export const LITE_FACTOR = 0.45;

/** Lite mode for tablets and small CPUs: ≤ 4 cores or a coarse pointer, unless forced by the URL. */
export function detectLite(env: LiteEnv): boolean {
  const forced = new URLSearchParams(env.search).get("lite");
  if (forced === "1") return true;
  if (forced === "0") return false;
  return env.cores <= 4 || env.coarsePointer;
}

/** Reads the browser facts `detectLite` needs. */
export function readLiteEnv(): LiteEnv {
  return {
    cores: navigator.hardwareConcurrency || 8,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    search: location.search,
  };
}

/** `n` in full mode, `n × 0.45` in lite mode, never below 1. */
export function scaleCount(n: number, lite: boolean): number {
  return Math.max(1, Math.round(n * (lite ? LITE_FACTOR : 1)));
}
```

- [ ] **Step 8: Run the lite tests**

Run: `pnpm vitest run src/tree/lite.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit** (only if agreed)

```bash
git add src/shared/three/stage.ts src/shared/three/stage.test.ts src/tree/lite.ts src/tree/lite.test.ts
git commit -m "feat(tree): add stage exposure/pixel-ratio options and lite detection"
```

---

### Task 3: Camera path, card spread and v14 cards

**Files:**

- Modify: `src/tree/scene/camera.ts`
- Create: `src/tree/scene/camera.test.ts`
- Modify: `src/tree/scene/cards.ts`, `src/tree/scene/locked-cover.ts`

**Interfaces:**

- Produces: `cardT(index: number, count: number): number`, `hubCam(t, out, look): number` (v14 values), `createCards(books, tips): Cards` (unchanged signature; `Cards.position(index)` returns the card group position).
- Note: `src/tree/index.ts` still calls `cardT(index)`; it is rewritten in Task 9. Until then `pnpm typecheck` fails on `index.ts` only — that is expected inside Tasks 3–8; each task's own tests must pass.

- [ ] **Step 1: Write the failing camera test** — `src/tree/scene/camera.test.ts`

```ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { cardT, hubCam } from "./camera";

describe("cardT", () => {
  it("puts a single book in the middle of the climb", () => {
    expect(cardT(0, 1)).toBe(0.5);
  });

  it.each([2, 3, 5])("spreads %i books over [0.2, 0.88], strictly increasing", (count) => {
    const ts = Array.from({ length: count }, (_, i) => cardT(i, count));
    expect(ts[0]).toBeCloseTo(0.2);
    expect(ts[count - 1]).toBeCloseTo(0.88);
    ts.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(ts[i]));
  });
});

describe("hubCam", () => {
  it("starts low and far, ends high and closer (v14 path)", () => {
    const out = new THREE.Vector3();
    const look = new THREE.Vector3();
    hubCam(0, out, look);
    expect(out.y).toBeCloseTo(1.3);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(20);
    hubCam(1, out, look);
    expect(out.y).toBeCloseTo(7.7);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(16);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/tree/scene/camera.test.ts`
Expected: FAIL (`cardT(0, 1)` returns 0.24, `out.y` is 1.4).

- [ ] **Step 3: Rewrite `src/tree/scene/camera.ts`**

```ts
import type * as THREE from "three";

/** Climb progress (t ∈ [0, 1]) at which the card of book `index` hangs, spread over [0.2, 0.88]. */
export const cardT = (index: number, count: number): number =>
  count <= 1 ? 0.5 : 0.2 + index * (0.68 / (count - 1));

/** Spiral camera path around the tree (v14); writes position and look-at target, returns the angle. */
export function hubCam(t: number, out: THREE.Vector3, look: THREE.Vector3): number {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 20 - t * 4;
  const y = 1.3 + t * 6.4;
  out.set(Math.cos(a) * r, y, Math.sin(a) * r);
  look.set(0, y + 2.2 - t * 1.2, 0);
  return a;
}
```

- [ ] **Step 4: Run the camera tests**

Run: `pnpm vitest run src/tree/scene/camera.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewrite `src/tree/scene/locked-cover.ts`**

```ts
import { createRng } from "@shared/random";

/** Paints a locked book's card: warm paper gradient, grain and a padlock (v14). */
export function paintLockedCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(7);
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#f6e8cf");
  bg.addColorStop(1, "#ead6b2");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = `rgba(120,80,50,${rnd() * 0.04})`;
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  c.strokeStyle = "#a0805e";
  c.lineWidth = 5;
  c.beginPath();
  c.arc(W / 2, H * 0.38, 34, Math.PI, 0);
  c.moveTo(W / 2 - 34, H * 0.38);
  c.lineTo(W / 2 - 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.38);
  c.stroke();
  c.fillStyle = "#a0805e";
  c.beginPath();
  c.arc(W / 2, H * 0.5, 7, 0, Math.PI * 2);
  c.fill();
}
```

- [ ] **Step 6: Update `src/tree/scene/cards.ts`**

Replace `paintFrame` with the v14 frame (cream title panel, rounded terracotta border, Baloo 2 / Andika):

```ts
/** Paints the tree-owned part of every card: title panel, rounded border, sub-title, title, theme. */
function paintFrame(c: CanvasRenderingContext2D, book: BookManifest, W: number, H: number): void {
  const { ready, card } = book;
  c.fillStyle = "#fff7e8";
  c.beginPath();
  c.roundRect(30, H * 0.69, W - 60, H * 0.27, 22);
  c.fill();
  c.strokeStyle = ready ? "#c4572e" : "#b39a7a";
  c.lineWidth = 8;
  c.beginPath();
  c.roundRect(12, 12, W - 24, H - 24, 30);
  c.stroke();
  c.textAlign = "center";
  c.fillStyle = ready ? "#3a2a20" : "rgba(58,42,32,.6)";
  c.font = `700 26px 'Baloo 2', 'Andika', sans-serif`;
  c.fillText(card.sub.toUpperCase(), W / 2, H * 0.745);
  c.font = `800 52px 'Baloo 2', 'Andika', sans-serif`;
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
  c.font = `700 24px 'Andika', sans-serif`;
  c.fillStyle = ready ? "#3a2a20" : "rgba(58,42,32,.55)";
  c.fillText(card.theme, W / 2, H * 0.1);
}
```

Add after `coverTexture`:

```ts
/** Soft round halo texture behind each card. */
function haloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

const CARD_SCALE = 1.18;
```

In `createCards`, apply the v14 values:

```ts
  const threadMat = new THREE.LineBasicMaterial({
    color: "#7a5236",
    transparent: true,
    opacity: 0.85,
  });
  const halo = haloTexture();
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const cards = books.map((book, i) => {
    const t = cardT(i, books.length);
    const a = hubCam(t, camPos, look) + (i % 2 ? 0.06 : -0.06);
```

Back plane colour `"#f3e3c3"`. Halo mesh:

```ts
const haloMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2.8, 3.4),
  new THREE.MeshBasicMaterial({
    map: halo,
    color: book.ready ? "#ffe08a" : "#fff0d8",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }),
);
haloMesh.position.z = -0.02;
g.add(haloMesh, back, plane);
```

(and `return { g, plane, halo: haloMesh, line, t, hover: 0 };`). In `update`, replace the scale / halo lines with:

```ts
const scale = CARD_SCALE * (1 + near * 0.1 + c.hover * 0.08);
c.g.scale.setScalar(scale);
c.halo.material.opacity = 0.2 + near * 0.35 + c.hover * 0.35;
c.g.rotation.z += Math.sin(time * 5) * 0.03 * c.hover;
```

- [ ] **Step 7: Verify the scene module compiles in isolation**

Run: `pnpm vitest run src/tree/scene/camera.test.ts && pnpm exec tsc --noEmit 2>&1 | grep -v "src/tree/index.ts" | grep "error" ; true`
Expected: tests PASS; the grep prints nothing (only `index.ts` errors are allowed at this stage).

- [ ] **Step 8: Commit** (only if agreed)

```bash
git add src/tree/scene/camera.ts src/tree/scene/camera.test.ts src/tree/scene/cards.ts src/tree/scene/locked-cover.ts
git commit -m "feat(tree): v14 camera path, card spread and card styling"
```

---

### Task 4: Ground, flora and landscape

**Files:**

- Create: `src/tree/scene/ground.ts`, `src/tree/scene/flora.ts`
- Rewrite: `src/tree/scene/landscape.ts`
- Modify: `src/tree/scene/konteur.ts`

**Interfaces:**

- Consumes: `Count` from `src/tree/lite.ts`; `Obstacle` type from `src/tree/scene/critters/wander.ts` — create that file now with only the type line below if Task 6 has not run yet (Task 6 then fills it):
  ```ts
  /** Circular obstacle on the ground plane: centre x, centre z, radius. */
  export type Obstacle = readonly [x: number, z: number, r: number];
  ```
- Produces:
  - `groundHeight(x: number, z: number): number` in `scene/ground.ts`.
  - `createFlora(rng: Rng, group: THREE.Group): { update(time: number): void }` and `FLORA_OBSTACLES: Obstacle[]` in `scene/flora.ts`.
  - `createLandscape(rng: Rng, count: Count): { group: THREE.Group; update(time: number): void }`.
  - `KONTEUR_OBSTACLES: Obstacle[]` in `scene/konteur.ts`.

- [ ] **Step 1: Create `src/tree/scene/ground.ts`** (moved verbatim from `landscape.ts`)

```ts
/** Height of the morne around the tree (v13 `gH`): a gentle plateau falling towards the hills. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  return (
    -0.6 +
    Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.35 * Math.min(1, d / 12) +
    Math.sin(x * 0.05 + 1) * Math.sin(z * 0.06) * 1.2 * Math.min(1, Math.max(0, (d - 20) / 30))
  );
}
```

- [ ] **Step 2: Create `src/tree/scene/flora.ts`**

The RNG draws below follow `design/v14/scene14.js` lines 125–162 one for one; do not reorder statements, merge loops or hoist `rng()` calls.

```ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { Obstacle } from "./critters/wander";
import { groundHeight } from "./ground";

const PALMS: readonly (readonly [number, number, number])[] = [
  [-9.5, -10, 6.5],
  [11, -8, 5.5],
  [-28, 22, 8],
];
const BREADFRUITS: readonly (readonly [number, number, number])[] = [
  [30, 8, 1.15],
  [-34, -6, 1.3],
  [8, 36, 1.2],
  [-14, -34, 1.1],
  [36, -22, 1.25],
];
const FLAMBOYANTS: readonly (readonly [number, number, number])[] = [
  [-25, 7, 1.15],
  [23, -17, 1.05],
  [-6, 31, 1.2],
];
const BANANAS: readonly (readonly [number, number, number])[] = [
  [-12, 4, 2.4],
  [13, 3.5, 2.1],
  [-11.5, 6.5, 1.8],
];
const BALISIERS: readonly (readonly [number, number])[] = [
  [-4, -12.8],
  [-7.2, -9.4],
  [7.6, -10.6],
  [3, 11.5],
  [-9.8, -2],
];
const TREE_FERNS: readonly (readonly [number, number, number])[] = [
  [-4, 13.6, 4.2],
  [5.5, 13.2, 3.6],
  [13.8, -3.5, 4.6],
];

/** Plants the critters walk around (the far palm and the far trees are outside their ring). */
export const FLORA_OBSTACLES: Obstacle[] = [
  [-9.5, -10, 1],
  [11, -8, 1],
  [-12, 4, 1.4],
  [13, 3.5, 1.4],
  [-11.5, 6.5, 1.3],
  ...BALISIERS.map(([x, z]): Obstacle => [x, z, 0.9]),
  ...TREE_FERNS.map(([x, z]): Obstacle => [x, z, 1]),
];

/** Bent, tapered frond shared by palms, tree ferns and fern blades. */
function frondGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.5, 3.2, 1, 4);
  geo.translate(0, 1.6, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 3.2;
    p.setZ(i, -y * y * 1.4);
    p.setX(i, p.getX(i) * (1 - y * 0.7));
  }
  geo.computeVertexNormals();
  return geo;
}

/** Broad banana / balisier leaf, curled backwards. */
function bananaLeafGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.75, 2.4, 1, 6);
  geo.translate(0, 1.2, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 2.4;
    p.setZ(i, -y * y * 1.2);
    p.setX(i, p.getX(i) * Math.sin(Math.min(1, y * 1.3 + 0.15) * Math.PI) * 1.1);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sober Guadeloupe flora (v14.1): three coconut palms, breadfruits and flamboyants far away, bananas,
 * balisiers and tree ferns near the clearing, fern blades. Adds everything to `group`; every crown sways.
 */
export function createFlora(rng: Rng, group: THREE.Group): { update(time: number): void } {
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const flat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, ...extra });
  const trunkMat = flat("#9a7458");
  const frondMat = flat("#5f9c46", { side: THREE.DoubleSide });
  const frondGeo = frondGeometry();
  const crowns: THREE.Object3D[] = [];

  /** Places a finished plant on the ground with a random heading. */
  const put = (g: THREE.Group, crown: THREE.Object3D, x: number, z: number): void => {
    g.position.set(x, groundHeight(x, z), z);
    g.rotation.y = rng() * 6.28;
    group.add(g);
    crowns.push(crown);
  };

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
    g.rotation.y = rng() * 6.28;
    group.add(g);
    crowns.push(crown);
  };

  const breadMat = new THREE.MeshStandardMaterial({
    color: "#4c8a3a",
    roughness: 0.75,
    flatShading: true,
  });
  const fruitMat = new THREE.MeshStandardMaterial({ color: "#b9d05c", roughness: 0.7 });
  const breadfruit = (x: number, z: number, k: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.34 * k, 2.6 * k, 6), trunkMat);
    t.position.y = 1.3 * k;
    g.add(t);
    const crown = new THREE.Group();
    crown.position.y = 3.3 * k;
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry((1 + rng() * 0.4) * k, 1), breadMat);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.9 * k, (rng() - 0.3) * 0.6 * k, Math.sin(a) * 0.9 * k);
      p.scale.y = 0.8;
      crown.add(p);
    }
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * k, 1), breadMat);
    top.position.y = 0.7 * k;
    crown.add(top);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.16 * k, 8, 6), fruitMat);
      const a = rng() * 6.28;
      f.position.set(Math.cos(a) * 1.6 * k, -0.5 * k, Math.sin(a) * 1.6 * k);
      crown.add(f);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  const flamGreen = new THREE.MeshStandardMaterial({
    color: "#6a9e46",
    roughness: 0.85,
    flatShading: true,
  });
  const flamRed = new THREE.MeshStandardMaterial({
    color: "#e5582e",
    roughness: 0.8,
    flatShading: true,
    emissive: "#7a2410",
    emissiveIntensity: 0.15,
  });
  const flamboyant = (x: number, z: number, k: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.34 * k, 2.4 * k, 6), trunkMat);
    t.position.y = 1.2 * k;
    g.add(t);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const br = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * k, 0.14 * k, 1.9 * k, 5),
        trunkMat,
      );
      br.position.set(Math.cos(a) * 0.55 * k, 3 * k, Math.sin(a) * 0.55 * k);
      br.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      g.add(br);
    }
    const crown = new THREE.Group();
    crown.position.y = 3.9 * k;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
      const rr = i ? 1.7 * k : 0;
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(1.15 * k, 10, 6),
        rng() < 0.62 ? flamRed : flamGreen,
      );
      p.position.set(Math.cos(a) * rr, rng() * 0.25 * k, Math.sin(a) * rr);
      p.scale.set(1.25, 0.38, 1.25);
      crown.add(p);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  const leafGeo = bananaLeafGeometry();
  const bananaMat = new THREE.MeshStandardMaterial({
    color: "#86b84e",
    roughness: 0.8,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const stemMat = new THREE.MeshStandardMaterial({ color: "#8da45a", roughness: 1 });
  const banana = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, h, 7), stemMat);
    t.position.y = h / 2;
    g.add(t);
    const crown = new THREE.Group();
    crown.position.y = h;
    for (let i = 0; i < 7; i++) {
      const l = new THREE.Mesh(leafGeo, bananaMat);
      l.rotation.y = (i / 7) * Math.PI * 2 + rng() * 0.4;
      l.rotation.x = -0.25 - rng() * 0.45;
      l.scale.setScalar(0.85 + rng() * 0.3);
      crown.add(l);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  const bractMat = new THREE.MeshStandardMaterial({
    color: "#d8432a",
    roughness: 0.6,
    emissive: "#6a1a0a",
    emissiveIntensity: 0.15,
  });
  const tipMat = new THREE.MeshStandardMaterial({ color: "#f2c84a", roughness: 0.6 });
  const balisier = (x: number, z: number): void => {
    const g = new THREE.Group();
    const crown = new THREE.Group();
    g.add(crown);
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(leafGeo, bananaMat);
      l.rotation.y = (i / 6) * Math.PI * 2 + rng() * 0.5;
      l.rotation.x = -0.12 - rng() * 0.2;
      l.scale.set(0.55, 0.62 + rng() * 0.2, 0.55);
      crown.add(l);
    }
    for (let k = 0; k < 2; k++) {
      const stalk = new THREE.Group();
      const hh = 1.2 + rng() * 0.4;
      stalk.position.set((rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.5);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, hh, 4), stemMat);
      st.position.y = hh / 2;
      stalk.add(st);
      for (let j = 0; j < 4; j++) {
        const side = j % 2 ? 1 : -1;
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), bractMat);
        c.position.set(side * 0.11, hh - 0.1 - j * 0.17, 0);
        c.rotation.z = side * -1.15;
        const tp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), tipMat);
        tp.position.set(side * 0.14, 0.1, 0);
        c.add(tp);
        stalk.add(c);
      }
      crown.add(stalk);
    }
    put(g, crown, x, z);
  };

  const tfernTrunk = flat("#5a4232");
  const tfernMat = flat("#6aa848", { side: THREE.DoubleSide });
  const treeFern = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, h, 6), tfernTrunk);
    t.position.y = h / 2;
    t.rotation.z = (rng() - 0.5) * 0.12;
    g.add(t);
    const crown = new THREE.Group();
    crown.position.y = h;
    for (let i = 0; i < 11; i++) {
      const f = new THREE.Mesh(frondGeo, tfernMat);
      f.rotation.y = (i / 11) * Math.PI * 2;
      f.rotation.x = -0.7 - rng() * 0.3;
      f.scale.set(0.75, 0.62, 0.75);
      crown.add(f);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  for (const [x, z, h] of PALMS) palm(x, z, h);
  for (const [x, z, k] of BREADFRUITS) breadfruit(x, z, k);
  for (const [x, z, k] of FLAMBOYANTS) flamboyant(x, z, k);
  for (const [x, z, h] of BANANAS) banana(x, z, h);
  for (const [x, z] of BALISIERS) balisier(x, z);
  for (const [x, z, h] of TREE_FERNS) treeFern(x, z, h);

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

  return {
    update(time) {
      crowns.forEach((crown, i) => {
        crown.rotation.z = Math.sin(time * 0.7 + i) * 0.04;
        crown.rotation.x = Math.cos(time * 0.5 + i * 1.3) * 0.03;
      });
    },
  };
}
```

> 💡 **Note**: in the mockup the three palms are pushed first into the sway list, then every `put` plant, in build order — `crowns` above keeps that order, so the sway phases (`+ i`) match.

- [ ] **Step 3: Rewrite `src/tree/scene/landscape.ts`**

```ts
import * as THREE from "three";
import { clamp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { Count } from "../lite";
import { createFlora } from "./flora";
import { groundHeight } from "./ground";

const MORNES: [number, number, string, number][] = [
  [62, 14, "#c9a7b4", 9],
  [88, 24, "#b9a6cc", 7],
];

/** Dusk clearing around the tree (v14): warm lights, green relief, lavender hills, flora, grass, pool. */
export function createLandscape(
  rng: Rng,
  count: Count,
): { group: THREE.Group; update(time: number): void } {
  const group = new THREE.Group();

  group.add(new THREE.HemisphereLight("#ffe9cc", "#86a35a", 1.6));
  const canopyLight = new THREE.PointLight("#ffd890", 26, 30, 1.6);
  canopyLight.position.set(0, 11, 0);
  const baseLight = new THREE.PointLight("#ffb878", 14, 22, 1.6);
  baseLight.position.set(1, 2, -3);
  const rim = new THREE.DirectionalLight("#ffd2a0", 1.7);
  rim.position.set(-30, 26, 60);
  const key = new THREE.DirectionalLight("#fff3e2", 0.9);
  key.position.set(10, 20, -40);
  group.add(canopyLight, baseLight, rim, key);

  {
    const geo = new THREE.PlaneGeometry(200, 200, 90, 90);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cA = new THREE.Color("#7ea552");
    const cB = new THREE.Color("#b8c96c");
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

  const flora = createFlora(rng, group);

  const grass = glowPoints(
    rng,
    count(600),
    () => {
      const a = rng() * Math.PI * 2,
        r = 3 + rng() * 14,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      return [x, groundHeight(x, z) + 0.1 + rng() * 0.3, z];
    },
    { size: 0.14, drift: 0.06, a: "#6f9e42", b: "#9cbf58" },
  );
  grass.material.blending = THREE.NormalBlending;
  grass.material.uniforms.uOpacity.value = 0.7;
  const pool = softSprite("#ffd890", 14, 0.22);
  pool.position.set(0, -0.4, 0);
  group.add(grass, pool);

  return {
    group,
    update(time) {
      grass.material.uniforms.uTime.value = time;
      canopyLight.intensity = 24 + Math.sin(time * 0.9) * 4;
      pool.material.opacity = 0.2 + Math.sin(time * 1.3) * 0.04;
      flora.update(time);
    },
  };
}
```

- [ ] **Step 4: Update `src/tree/scene/konteur.ts`**

- Import: `import { groundHeight } from "./ground";` and `import type { Obstacle } from "./critters/wander";`.
- Export below the constants:
  ```ts
  /** Ground footprint of the Konteur at both of its positions (wide and narrow screens). */
  export const KONTEUR_OBSTACLES: Obstacle[] = [
    [KONTEUR_X_WIDE, KONTEUR_Z, 1.9],
    [KONTEUR_X_NARROW, KONTEUR_Z, 1.9],
  ];
  ```
- `emissiveIntensity: 0.18` (was 0.35).
- Shadow: `softSprite("#5a3a24", 1.6, 0.35, false)`.
- Seat colour `"#8a6a52"`.

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep "error" | grep -v "src/tree/index.ts" ; pnpm lint`
Expected: the grep prints nothing; lint passes (lint does not type-check `index.ts` call sites).

- [ ] **Step 6: Commit** (only if agreed)

```bash
git add src/tree/scene/ground.ts src/tree/scene/flora.ts src/tree/scene/landscape.ts src/tree/scene/konteur.ts src/tree/scene/critters/wander.ts
git commit -m "feat(tree): v14 dusk landscape and Guadeloupe flora"
```

---

### Task 5: Balanced tree, canopy and sky

**Files:**

- Rewrite: `src/tree/scene/tree.ts`
- Create: `src/tree/scene/sky.ts`

**Interfaces:**

- Consumes: `Count` (Task 2), `softSprite`, `glowPoints`.
- Produces:
  - `createLightTree(rng: Rng, opts: { lite: boolean; count: Count }): { group: THREE.Group; tips: THREE.Vector3[]; update(time: number, stirred: boolean): void }` — `stirred` = a card is hovered or near (drives the rustle).
  - `createSky(rng: Rng, count: Count): { group: THREE.Group; update(time: number, cameraPosition: THREE.Vector3): void }`.

- [ ] **Step 1: Rewrite `src/tree/scene/tree.ts`**

Port of `design/v14/scene14.js` lines 168–205; keep the RNG draw order exactly.

```ts
import * as THREE from "three";
import { lerp } from "@shared/math";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { Count } from "../lite";

interface Branch {
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  r: number;
}

const V = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);
const GREENS = ["#6fae4a", "#86bf55", "#a2cd62", "#5c9d42"];

/**
 * Pyébwa a Sav (v14): straight trunk, balanced crown of round puffs that breathes and rustles,
 * buttress roots and a glowing hollow facing the arrival path.
 */
export function createLightTree(
  rng: Rng,
  opts: { lite: boolean; count: Count },
): { group: THREE.Group; tips: THREE.Vector3[]; update(time: number, stirred: boolean): void } {
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
    if (depth === 0) {
      const off = rng() * 6.28;
      for (let i = 0; i < 3; i++) {
        const a = off + (i / 3) * Math.PI * 2;
        grow(
          end,
          V(Math.cos(a) * 0.7, 1, Math.sin(a) * 0.7).normalize(),
          len * 0.68,
          rad * 0.62,
          1,
        );
      }
      grow(end, V(0, 1, 0), len * 0.55, rad * 0.55, 2);
      return;
    }
    const n = depth < 2 ? 3 : rng() < 0.65 ? 2 : 3;
    const base = rng() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.6;
      const tilt = 0.35 + rng() * 0.4;
      const d = dir
        .clone()
        .multiplyScalar(1.4)
        .add(V(Math.cos(a) * tilt, 0, Math.sin(a) * tilt))
        .add(V(0, 0.18, 0))
        .normalize();
      if (d.y < 0.45) {
        d.y = 0.45;
        d.normalize();
      }
      grow(end, d, len * (0.62 + rng() * 0.14), rad * 0.6, depth + 1);
    }
  };
  grow(V(0, -0.8, 0), V(0, 1, 0), 4.6, 1.05, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.3;
    const L = 1.7 + rng() * 0.4;
    branches.push({ p0: V(0, 0.9, 0), p1: V(Math.cos(a) * L, -0.9, Math.sin(a) * L), r: 0.5 });
  }
  {
    const centre = tips
      .reduce((acc, t) => acc.add(V(t.x, 0, t.z)), V())
      .multiplyScalar(1 / tips.length);
    const y0 = 3.8;
    const seen = new Set<THREE.Vector3>();
    const shift = (p: THREE.Vector3): void => {
      if (seen.has(p)) return;
      seen.add(p);
      if (p.y <= y0) return;
      const k = Math.min(1, (p.y - y0) / 3);
      p.x -= centre.x * k;
      p.z -= centre.z * k;
    };
    for (const b of branches) {
      shift(b.p0);
      shift(b.p1);
    }
    tips.forEach(shift);
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const up = V(0, 1, 0);
  const barkGeo = new THREE.CylinderGeometry(0.62, 1, 1, 7, 1);
  barkGeo.translate(0, 0.5, 0);
  const bark = new THREE.InstancedMesh(
    barkGeo,
    new THREE.MeshStandardMaterial({ color: "#9a6a46", roughness: 0.9, flatShading: true }),
    branches.length,
  );
  branches.forEach((b, i) => {
    const d = b.p1.clone().sub(b.p0);
    const length = d.length();
    q.setFromUnitVectors(up, d.normalize());
    s3.set(b.r, length, b.r);
    m4.compose(b.p0, q, s3);
    bark.setMatrixAt(i, m4);
  });
  group.add(bark);

  const canopy = new THREE.Group();
  group.add(canopy);
  const puffCount = tips.length + 26;
  const puffs = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, opts.lite ? 1 : 2),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.85,
      emissive: "#3a5a1c",
      emissiveIntensity: 0.25,
    }),
    puffCount,
  );
  {
    const colour = new THREE.Color();
    q.identity();
    for (let i = 0; i < puffCount; i++) {
      const t = tips[i % tips.length];
      const extra = i >= tips.length;
      const r = (extra ? 0.8 : 1.05) + rng() * 0.55;
      const pos = V(
        t.x + (extra ? (rng() - 0.5) * 1.6 : 0),
        t.y + (extra ? (rng() - 0.3) * 1.2 : 0),
        t.z + (extra ? (rng() - 0.5) * 1.6 : 0),
      );
      m4.compose(pos, q, s3.set(r * 1.1, r * 0.85, r * 1.1));
      puffs.setMatrixAt(i, m4);
      puffs.setColorAt(
        i,
        colour.set(rng() < 0.1 ? "#f0793c" : GREENS[(rng() * GREENS.length) | 0]),
      );
    }
  }
  canopy.add(puffs);

  const hollow = new THREE.Group();
  hollow.position.set(0, 2.1, -0.9);
  hollow.rotation.x = -0.08;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.09, 8, 20),
    new THREE.MeshStandardMaterial({ color: "#6e4a30", roughness: 1 }),
  );
  rim.scale.y = 1.25;
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 20),
    new THREE.MeshBasicMaterial({ color: "#ffcf7e" }),
  );
  inner.scale.y = 1.25;
  inner.rotation.y = Math.PI;
  inner.position.z = 0.01;
  const hollowGlow = softSprite("#ffc870", 2.6, 0.45);
  hollowGlow.position.z = -0.15;
  hollow.add(rim, inner, hollowGlow);
  group.add(hollow);

  const leaves = glowPoints(
    rng,
    opts.count(tips.length * 6),
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
    { size: 0.26, drift: 0.12, a: "#fff4b8", b: "#ffd27a" },
  );
  canopy.add(leaves);

  let rustle = 0;
  return {
    group,
    tips,
    update(time, stirred) {
      leaves.material.uniforms.uTime.value = time;
      rustle = lerp(rustle, stirred ? 1 : 0, 0.06);
      const breath = 1 + Math.sin(time * 0.8) * 0.012;
      canopy.scale.set(breath, 1 + Math.sin(time * 0.8 + 0.6) * 0.01, breath);
      canopy.rotation.y = Math.sin(time * 0.25) * 0.015 + Math.sin(time * 9) * 0.006 * rustle;
      canopy.rotation.z = Math.sin(time * 0.4) * 0.006 + Math.sin(time * 11) * 0.004 * rustle;
      hollowGlow.material.opacity = 0.35 + Math.sin(time * 1.6) * 0.1 + rustle * 0.25;
    },
  };
}
```

> ⚠️ **Warning**: the puff loop must evaluate `r`, then the three position draws (x, y, z, only for extra puffs), then the colour draw(s) — exactly as the mockup's single statement does. The short-circuit `rng() < 0.1 ? … : GREENS[rng() …]` intentionally skips the second draw for orange puffs.

- [ ] **Step 2: Create `src/tree/scene/sky.ts`**

```ts
import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { Count } from "../lite";

const DOME_VERTEX = `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const DOME_FRAGMENT = `varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 hz=vec3(1.,.87,.66), mid=vec3(.98,.76,.66), top=vec3(.66,.64,.86);
  vec3 c=mix(hz,mid,smoothstep(-.02,.18,h)); c=mix(c,top,smoothstep(.15,.7,h)); gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`;

/**
 * Evening sky (v14): lavender-to-peach dome following the camera, rising moon, a few stars, mist and
 * golden fireflies. Must be called after `createLightTree` to keep the mockup's random order.
 */
export function createSky(
  rng: Rng,
  count: Count,
): { group: THREE.Group; update(time: number, cameraPosition: THREE.Vector3): void } {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: DOME_VERTEX,
      fragmentShader: DOME_FRAGMENT,
    }),
  );
  const fireflies = glowPoints(
    rng,
    count(340),
    () => {
      const a = rng() * Math.PI * 2,
        r = 3 + rng() * 13;
      return [Math.cos(a) * r, rng() * 15, Math.sin(a) * r];
    },
    { size: 0.24, drift: 1.2, a: "#fff2a8", b: "#ffcf6a" },
  );
  const stars = glowPoints(
    rng,
    count(90),
    () => {
      const th = rng() * Math.PI * 2,
        ph = 0.55 + rng() * 0.8;
      return [
        Math.cos(th) * Math.cos(ph) * 220,
        Math.sin(ph) * 220 + 10,
        Math.sin(th) * Math.cos(ph) * 220,
      ];
    },
    { size: 1.2, a: "#ffffff", b: "#fff6dc" },
  );
  stars.material.uniforms.uOpacity.value = 0.55;
  const moon = softSprite("#fff6dc", 34, 1, false);
  moon.position.set(-46, 30, 120);
  moon.material.fog = false;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(7, 40),
    new THREE.MeshBasicMaterial({ color: "#fff8e6", fog: false }),
  );
  disc.position.copy(moon.position).add(new THREE.Vector3(0, 0, 2));
  disc.lookAt(0, 8, 0);
  const mists = Array.from({ length: count(12) }, () => {
    const sprite = softSprite("#fff0dc", 14 + rng() * 14, 0.16, false);
    sprite.position.set((rng() - 0.5) * 40, -0.2 + rng() * 1.5, (rng() - 0.5) * 40);
    return { sprite, phase: rng() * 6.28 };
  });
  group.add(dome, fireflies, stars, moon, disc, ...mists.map((m) => m.sprite));

  return {
    group,
    update(time, cameraPosition) {
      dome.position.copy(cameraPosition);
      fireflies.material.uniforms.uTime.value = time;
      stars.material.uniforms.uTime.value = time;
      for (const { sprite, phase } of mists) {
        sprite.position.x += Math.sin(time * 0.1 + phase) * 0.004;
        sprite.material.opacity = 0.12 + Math.sin(time * 0.3 + phase) * 0.05;
      }
    },
  };
}
```

> 💡 **Note**: in the mockup the mist loop reads `rnd()` three times for the position, then once for the phase, _after_ computing the size (`14 + rnd() * 14`). The code above draws size → x → y → z → phase, which is the same order.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep "error" | grep -v "src/tree/index.ts" ; pnpm lint`
Expected: grep prints nothing; lint passes.

- [ ] **Step 4: Commit** (only if agreed)

```bash
git add src/tree/scene/tree.ts src/tree/scene/sky.ts
git commit -m "feat(tree): balanced breathing tree, glowing hollow and dusk sky"
```

---

### Task 6: Critter walk logic (pure)

**Files:**

- Create / complete: `src/tree/scene/critters/wander.ts`
- Create: `src/tree/scene/critters/wander.test.ts`

**Interfaces:**

- Produces (all exported from `wander.ts`):

  ```ts
  export type Obstacle = readonly [x: number, z: number, r: number];
  export type CritterName = "lapen" | "zanba";
  export interface CritterState {
    name: CritterName;
    r: number;
    speed: number;
    step: number;
    pos: [number, number];
    yaw: number;
    wait: number;
    tgt: [number, number] | null;
    moving: number;
    phase: number;
    react: number;
    look: boolean;
  }
  export const TREE_OBSTACLE: Obstacle; // [0, 0, 4.2]
  export const RING: { min: number; max: number }; // { min: 5.2, max: 13.7 }
  export const MAX_DT: number; // 0.05
  export function createCritterStates(): CritterState[]; // [lapen, zanba]
  export function isFree(x: number, z: number, r: number, obstacles: readonly Obstacle[]): boolean;
  export function clearOfTree(a: readonly [number, number], b: readonly [number, number]): boolean;
  export function pickTarget(
    c: CritterState,
    obstacles: readonly Obstacle[],
    rng: Rng,
  ): [number, number] | null;
  export function stepCritters(
    list: CritterState[],
    dt: number,
    camera: { x: number; z: number },
    obstacles: readonly Obstacle[],
    rng: Rng,
  ): void;
  export function poke(c: CritterState): void;
  ```

- [ ] **Step 1: Write the failing tests** — `src/tree/scene/critters/wander.test.ts`

```ts
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/tree/scene/critters/wander.test.ts`
Expected: FAIL — missing exports.

- [ ] **Step 3: Implement `src/tree/scene/critters/wander.ts`**

```ts
import { clamp, lerp } from "@shared/math";
import type { Rng } from "@shared/random";

/** Circular obstacle on the ground plane: centre x, centre z, radius. */
export type Obstacle = readonly [x: number, z: number, r: number];

export type CritterName = "lapen" | "zanba";

export interface CritterState {
  name: CritterName;
  /** Footprint radius. */
  r: number;
  /** Walking speed, units per second. */
  speed: number;
  /** Gait frequency. */
  step: number;
  pos: [number, number];
  yaw: number;
  /** Seconds left before picking a new target. */
  wait: number;
  tgt: [number, number] | null;
  /** 0 = standing, 1 = walking (eased). */
  moving: number;
  phase: number;
  /** Reaction to a touch, 1 → 0 over one second. */
  react: number;
  /** Whether the critter looks at the camera while waiting. */
  look: boolean;
}

export const TREE_OBSTACLE: Obstacle = [0, 0, 4.2];
export const RING = { min: 5.2, max: 13.7 } as const;
export const MAX_DT = 0.05;
const TREE_PATH_CLEARANCE = 4.4;

/** Initial states (v14.2): Lapen small and quick, Zanba big and slow, on both sides of the tree. */
export function createCritterStates(): CritterState[] {
  const base = { tgt: null, moving: 0, phase: 0, react: 0, look: false };
  return [
    { ...base, name: "lapen", r: 0.55, speed: 2.4, step: 9, pos: [-6, -5.5], yaw: 0.4, wait: 1.2 },
    {
      ...base,
      name: "zanba",
      r: 1.5,
      speed: 0.95,
      step: 4.2,
      pos: [7.5, 5.5],
      yaw: -2.2,
      wait: 2.5,
    },
  ];
}

/** Whether a disc of radius `r` at (x, z) touches no obstacle. */
export function isFree(x: number, z: number, r: number, obstacles: readonly Obstacle[]): boolean {
  return obstacles.every(([ox, oz, or]) => Math.hypot(x - ox, z - oz) > or + r);
}

/** Whether the straight segment a → b keeps clear of the trunk axis. */
export function clearOfTree(a: readonly [number, number], b: readonly [number, number]): boolean {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const t = clamp(-(a[0] * dx + a[1] * dz) / l2, 0, 1);
  return Math.hypot(a[0] + dx * t, a[1] + dz * t) > TREE_PATH_CLEARANCE;
}

/** Up to 40 random draws in the ring for a free target reachable without crossing the trunk. */
export function pickTarget(
  c: CritterState,
  obstacles: readonly Obstacle[],
  rng: Rng,
): [number, number] | null {
  for (let k = 0; k < 40; k++) {
    const a = rng() * 6.28,
      r = RING.min + rng() * (RING.max - RING.min),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (
      isFree(x, z, c.r, obstacles) &&
      clearOfTree(c.pos, [x, z]) &&
      Math.hypot(x - c.pos[0], z - c.pos[1]) > 2.5
    )
      return [x, z];
  }
  return null;
}

/** Signed heading change needed to face (x, z), in (-π, π]. */
function angleTo(c: CritterState, x: number, z: number): number {
  const d = Math.atan2(x - c.pos[0], z - c.pos[1]) - c.yaw;
  return Math.atan2(Math.sin(d), Math.cos(d));
}

/** Whether moving `c` to (x, z) would bump into another critter or into the trunk. */
function blocked(c: CritterState, x: number, z: number, list: readonly CritterState[]): boolean {
  if (Math.hypot(x, z) <= TREE_OBSTACLE[2] + c.r * 0.5) return true;
  return list.some((o) => o !== c && Math.hypot(x - o.pos[0], z - o.pos[1]) < c.r + o.r + 0.4);
}

/** Advances every critter by `dt` (clamped): wait → walk → wait, reactions, mutual avoidance. */
export function stepCritters(
  list: CritterState[],
  dt: number,
  camera: { x: number; z: number },
  obstacles: readonly Obstacle[],
  rng: Rng,
): void {
  const h = clamp(dt, 0, MAX_DT);
  for (const c of list) {
    c.react = Math.max(0, c.react - h);
    if (c.react > 0) {
      c.yaw += angleTo(c, camera.x, camera.z) * Math.min(1, h * 5);
      c.moving = lerp(c.moving, 0, 0.2);
    } else if (c.wait > 0) {
      c.wait -= h;
      c.moving = lerp(c.moving, 0, 0.12);
      if (c.look) c.yaw += angleTo(c, camera.x, camera.z) * Math.min(1, h * 2);
      if (c.wait <= 0) {
        c.tgt = pickTarget(c, obstacles, rng);
        if (!c.tgt) c.wait = 1;
      }
    } else if (c.tgt) {
      const d = Math.hypot(c.tgt[0] - c.pos[0], c.tgt[1] - c.pos[1]);
      if (d < 0.25) {
        c.tgt = null;
        c.wait = 1.8 + rng() * 4;
        c.look = rng() < 0.6;
      } else {
        const turn = angleTo(c, c.tgt[0], c.tgt[1]);
        c.yaw += turn * Math.min(1, h * 3.5);
        const sp = c.speed * h * (Math.abs(turn) < 0.7 ? 1 : 0.25);
        const nx = c.pos[0] + Math.sin(c.yaw) * sp,
          nz = c.pos[1] + Math.cos(c.yaw) * sp;
        if (blocked(c, nx, nz, list)) {
          c.tgt = null;
          c.wait = 0.9 + rng();
          c.look = true;
        } else {
          c.pos = [nx, nz];
        }
        c.moving = lerp(c.moving, 1, 0.12);
      }
    } else {
      c.wait = 0.4;
    }
    c.phase += h * c.step * Math.max(0.15, c.moving);
  }
}

/** Starts the touch reaction, unless one is already running. */
export function poke(c: CritterState): void {
  if (c.react <= 0) c.react = 1;
}
```

> 💡 **Note**: the trunk check in `blocked` is the only addition to the mockup's walk (Review Focus #1): the gradual turn can bend a path inside the straight-line clearance.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/tree/scene/critters/wander.test.ts`
Expected: PASS (9 tests). If "never lets a critter walk into the trunk" fails, check that `blocked` is called before `c.pos` is assigned — do not loosen the test.

- [ ] **Step 5: Commit** (only if agreed)

```bash
git add src/tree/scene/critters/wander.ts src/tree/scene/critters/wander.test.ts
git commit -m "feat(tree): free-roaming walk logic for the clearing critters"
```

---

### Task 7: Konpè Lapen and Konpè Zanba models

**Files:**

- Create: `src/tree/scene/critters/parts.ts`, `lapen.ts`, `zanba.ts`

**Interfaces:**

- Consumes: `CritterState` (Task 6), `groundHeight` (Task 4).
- Produces:

  ```ts
  // parts.ts
  export interface CritterView {
    group: THREE.Group; // group.userData.who = CritterName (used by picking)
    top: number; // bubble anchor height above the ground, world units
    pose(c: CritterState, time: number): void;
  }
  // lapen.ts
  export function createLapen(): CritterView;
  // zanba.ts
  export function createZanba(): CritterView;
  ```

- [ ] **Step 1: Create `src/tree/scene/critters/parts.ts`**

```ts
import * as THREE from "three";
import { groundHeight } from "../ground";
import type { CritterName, CritterState } from "./wander";

export interface CritterView {
  group: THREE.Group;
  /** Bubble anchor height above the ground, world units. */
  top: number;
  pose(c: CritterState, time: number): void;
}

export const SPHERE = new THREE.SphereGeometry(1, 22, 16);

/** Soft standard material (v14 `MT`). */
export const mat = (
  color: string,
  extra: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...extra });

/** Positioned, scaled mesh (v14 `mk`). */
export function part(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = sx,
  sz = sx,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

const eyeMat = mat("#2a1d16", { roughness: 0.25 });
const shineMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });

/** Glossy round eye with a highlight. */
export function eye(x: number, y: number, z: number, r: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(
    part(SPHERE, eyeMat, 0, 0, 0, r, r * 1.2, r * 0.8),
    part(SPHERE, shineMat, r * 0.35, r * 0.45, r * 0.6, r * 0.32),
  );
  return g;
}

/** Yellow / red / green madras check, repeated around Lapen's scarf. */
export function madrasTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  if (x) {
    x.fillStyle = "#e8b23a";
    x.fillRect(0, 0, 64, 64);
    x.globalAlpha = 0.85;
    for (const [col, p, w] of [
      ["#d2432c", 0, 14],
      ["#d2432c", 32, 14],
      ["#3f8a4a", 18, 5],
      ["#3f8a4a", 50, 5],
    ] as const) {
      x.fillStyle = col;
      x.fillRect(p, 0, w, 64);
      x.fillRect(0, p, 64, w);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let blobTexture: THREE.CanvasTexture | null = null;

/** Soft brown contact shadow of radius `r`. */
export function blobShadow(r: number): THREE.Mesh {
  if (!blobTexture) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    if (x) {
      const g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
      g.addColorStop(0, "rgba(70,40,20,.45)");
      g.addColorStop(1, "rgba(70,40,20,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
    }
    blobTexture = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

/** Tags the group for picking. */
export function tag(group: THREE.Group, who: CritterName): void {
  group.userData.who = who;
}

/** Puts the critter on the ground at its walk position and heading. */
export function place(group: THREE.Group, c: CritterState): void {
  group.position.set(c.pos[0], groundHeight(c.pos[0], c.pos[1]), c.pos[1]);
  group.rotation.y = c.yaw;
}
```

> ⚠️ **Warning**: `SPHERE`, `eyeMat` and `shineMat` are module-level shared resources. `disposeObject(scene)` on unmount disposes them; a remount (tree is mounted once per page load, retries only happen before the first success) would reuse disposed objects. That is acceptable because Three re-uploads disposed geometries/materials on next use — do not add caching logic.

- [ ] **Step 2: Create `src/tree/scene/critters/lapen.ts`**

```ts
import * as THREE from "three";
import {
  SPHERE,
  blobShadow,
  eye,
  madrasTexture,
  mat,
  part,
  place,
  tag,
  type CritterView,
} from "./parts";

/** Konpè Lapen: small, clever, madras scarf; hops while walking, jumps for joy when touched. */
export function createLapen(): CritterView {
  const group = new THREE.Group();
  const fur = mat("#c99868"),
    cream = mat("#f5e6cc"),
    pink = mat("#eaa79a"),
    madras = mat("#ffffff", { map: madrasTexture() });
  const body = new THREE.Group();
  group.add(body);
  body.add(
    part(SPHERE, fur, 0, 0.55, 0, 0.42, 0.5, 0.38),
    part(SPHERE, cream, 0, 0.5, 0.16, 0.3, 0.37, 0.26),
    part(SPHERE, cream, 0, 0.46, -0.37, 0.14),
  );
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.065, 10, 24), madras);
  scarf.position.set(0, 0.9, 0.02);
  scarf.rotation.x = Math.PI / 2 - 0.15;
  body.add(scarf, part(SPHERE, madras, 0.1, 0.84, 0.27, 0.07, 0.1, 0.05));
  const head = new THREE.Group();
  head.position.set(0, 1.12, 0.07);
  body.add(head);
  head.add(
    part(SPHERE, fur, 0, 0, 0, 0.34, 0.31, 0.31),
    part(SPHERE, cream, 0, -0.09, 0.22, 0.17, 0.12, 0.13),
    part(SPHERE, pink, 0, -0.02, 0.33, 0.05, 0.04, 0.04),
    part(SPHERE, pink, 0.2, -0.08, 0.19, 0.06, 0.04, 0.03),
    part(SPHERE, pink, -0.2, -0.08, 0.19, 0.06, 0.04, 0.03),
    eye(0.13, 0.05, 0.25, 0.055),
    eye(-0.13, 0.05, 0.25, 0.055),
  );
  const ears = [-1, 1].map((side) => {
    const e = new THREE.Group();
    e.position.set(side * 0.11, 0.24, -0.03);
    e.add(
      part(SPHERE, fur, 0, 0.3, 0, 0.095, 0.33, 0.055),
      part(SPHERE, pink, 0, 0.3, 0.035, 0.06, 0.26, 0.02),
    );
    e.rotation.z = -side * 0.16;
    head.add(e);
    return e;
  });
  const feet = [-1, 1].map((side) => {
    const f = part(SPHERE, cream, side * 0.2, 0.07, 0.1, 0.12, 0.07, 0.22);
    group.add(f);
    return f;
  });
  const paws = [-1, 1].map((side) => {
    const p = part(SPHERE, fur, side * 0.2, 0.4, 0.27, 0.08, 0.11, 0.08);
    body.add(p);
    return p;
  });
  group.add(blobShadow(0.55));
  group.scale.setScalar(0.66);
  tag(group, "lapen");

  return {
    group,
    top: 1.55,
    pose(c, time) {
      place(group, c);
      const hop = Math.abs(Math.sin(c.phase * 0.5)) * c.moving;
      const jump = c.react > 0 ? Math.sin((1 - c.react) * Math.PI) : 0;
      body.position.y = hop * 0.32 + jump * 0.9;
      body.scale.set(
        1 + (1 - hop) * c.moving * 0.05,
        1 - (1 - hop) * c.moving * 0.07 + hop * 0.04,
        1,
      );
      for (const f of feet) f.position.y = 0.07 + hop * 0.25 + jump * 0.8;
      const twitch = Math.sin(time * 3.1) > 0.96 ? 0.25 : 0;
      ears.forEach((e, i) => {
        e.rotation.x = -0.12 - hop * 0.45 + jump * 0.5 + Math.sin(time * 1.3 + i) * 0.05;
        e.rotation.z = (i ? -1 : 1) * (0.16 + twitch * (i ? 1 : 0) + jump * 0.25);
      });
      head.rotation.z = Math.sin(time * 0.9) * 0.06 * (1 - c.moving);
      paws.forEach((p, i) => {
        p.position.y = 0.4 + jump * 0.25 + (c.react > 0 ? Math.sin(time * 14 + i) * 0.04 : 0);
      });
    },
  };
}
```

- [ ] **Step 3: Create `src/tree/scene/critters/zanba.ts`**

```ts
import * as THREE from "three";
import { lerp } from "@shared/math";
import { SPHERE, blobShadow, eye, mat, part, place, tag, type CritterView } from "./parts";

/** Konpè Zanba: big, greedy, bakoua hat; heavy swaying steps, raises his trunk when touched. */
export function createZanba(): CritterView {
  const group = new THREE.Group();
  const skin = mat("#b0a2b9"),
    light = mat("#cdbfd2"),
    pink = mat("#e9b3ad"),
    nail = mat("#f3e6d2"),
    straw = mat("#e2c07a");
  const body = new THREE.Group();
  group.add(body);
  body.add(
    part(SPHERE, skin, 0, 1.18, -0.1, 0.86, 0.74, 1.0),
    part(SPHERE, light, 0, 1.0, 0.35, 0.62, 0.52, 0.55),
    part(SPHERE, skin, 0, 1.25, -1.05, 0.07, 0.22, 0.07),
  );
  const legGeo = new THREE.CapsuleGeometry(0.23, 0.42, 6, 14);
  const legs = (
    [
      [0.44, 0.5],
      [-0.44, 0.5],
      [0.44, -0.6],
      [-0.44, -0.6],
    ] as const
  ).map(([x, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0.78, z);
    g.add(part(legGeo, skin, 0, -0.4, 0));
    for (const k of [-1, 0, 1]) g.add(part(SPHERE, nail, k * 0.1, -0.72, 0.18, 0.055, 0.045, 0.04));
    group.add(g);
    return { g, phase: i === 0 || i === 3 ? 0 : Math.PI };
  });
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0.8);
  body.add(head);
  head.add(
    part(SPHERE, skin, 0, 0, 0, 0.56, 0.52, 0.5),
    part(SPHERE, pink, 0.3, -0.12, 0.34, 0.09, 0.06, 0.04),
    part(SPHERE, pink, -0.3, -0.12, 0.34, 0.09, 0.06, 0.04),
    eye(0.21, 0.1, 0.4, 0.07),
    eye(-0.21, 0.1, 0.4, 0.07),
  );
  const ears = [-1, 1].map((side) => {
    const e = new THREE.Group();
    e.position.set(side * 0.5, 0.05, -0.08);
    e.add(
      part(SPHERE, skin, side * 0.2, -0.05, 0, 0.42, 0.5, 0.07),
      part(SPHERE, pink, side * 0.2, -0.05, 0.05, 0.3, 0.38, 0.03),
    );
    e.rotation.y = side * 0.5;
    head.add(e);
    return e;
  });
  const trunk: THREE.Group[] = [];
  {
    let parent = new THREE.Group();
    parent.position.set(0, -0.12, 0.44);
    head.add(parent);
    for (let k = 0; k < 5; k++) {
      const r = 0.17 - k * 0.022;
      parent.add(part(SPHERE, skin, 0, -0.1, 0, r, 0.15, r));
      if (k === 4) parent.add(part(SPHERE, light, 0, -0.24, 0, r * 0.9, 0.05, r * 0.9));
      trunk.push(parent);
      const next = new THREE.Group();
      next.position.set(0, -0.19, 0.015);
      parent.add(next);
      parent = next;
    }
  }
  const hat = new THREE.Group();
  hat.position.set(0.06, 0.5, -0.05);
  hat.rotation.set(-0.12, 0, -0.12);
  head.add(hat);
  hat.add(
    part(new THREE.ConeGeometry(0.34, 0.34, 18), straw, 0, 0.17, 0),
    part(new THREE.CylinderGeometry(0.58, 0.6, 0.035, 24), straw, 0, 0.01, 0),
    part(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 18), mat("#c4572e"), 0, 0.06, 0),
  );
  group.add(blobShadow(1.3));
  group.scale.setScalar(0.8);
  tag(group, "zanba");

  return {
    group,
    top: 2.55,
    pose(c, time) {
      place(group, c);
      const up = c.react > 0 ? Math.sin((1 - c.react) * Math.PI) : 0;
      for (const leg of legs) leg.g.rotation.x = Math.sin(c.phase + leg.phase) * 0.32 * c.moving;
      body.rotation.z = Math.sin(c.phase) * 0.045 * c.moving;
      body.position.y =
        Math.abs(Math.cos(c.phase)) * 0.05 * c.moving + Math.sin(time * 1.1) * 0.012;
      ears.forEach((e, i) => {
        const side = i ? 1 : -1;
        e.rotation.y = side * (0.5 + Math.sin(time * 1.6 + i * 0.4) * 0.16 + up * 0.3);
      });
      trunk.forEach((t, k) => {
        t.rotation.x = lerp(Math.sin(time * 1.3 - k * 0.7) * 0.14 + 0.06, -0.62, up);
      });
      head.rotation.x = -up * 0.18 + Math.sin(time * 0.7) * 0.03;
    },
  };
}
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep "error" | grep -v "src/tree/index.ts" ; pnpm lint && pnpm vitest run src/tree`
Expected: grep prints nothing; lint and tree tests pass.

- [ ] **Step 5: Commit** (only if agreed)

```bash
git add src/tree/scene/critters/parts.ts src/tree/scene/critters/lapen.ts src/tree/scene/critters/zanba.ts
git commit -m "feat(tree): Konpè Lapen and Konpè Zanba models with animated poses"
```

---

### Task 8: v14 HUD and the "Sé kont-la" shelf

**Files:**

- Create: `src/tree/overlay/shelf.ts`, `src/tree/overlay/shelf.test.ts`
- Rewrite: `src/tree/overlay/overlay.ts`, `src/tree/overlay/overlay.css`

**Interfaces:**

- Consumes: `BookManifest` from `@app/contract`.
- Produces:

  ```ts
  // shelf.ts
  export type ShelfAction = "enter" | "climb";
  export function shelfAction(currentT: number, bookT: number, ready: boolean): ShelfAction;
  export function createShelf(
    parent: HTMLElement,
    books: BookManifest[],
    onSelect: (index: number) => void,
  ): { setNear(index: number): void; dispose(): void };
  // overlay.ts
  export interface CardLabel {
    x: number;
    y: number;
    opacity: number;
    book: BookManifest;
  }
  export function createTreeOverlay(
    container: HTMLElement,
    books: BookManifest[],
    handlers: { onEnter(bookId: string): void; onShelf(index: number): void },
  ): { update(t: number, label: CardLabel | null, near: number): void; dispose(): void };
  ```

- [ ] **Step 1: Write the failing shelf tests** — `src/tree/overlay/shelf.test.ts`

```ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { BookManifest } from "@app/contract";
import { createShelf, shelfAction } from "./shelf";

const book = (id: string, ready: boolean, title: string): BookManifest => ({
  id,
  order: 1,
  ready,
  card: { title, sub: "Dlo · L'eau", theme: "Kont pou lékòl" },
});
const BOOKS = [book("a", true, "Ti Kannot"), book("b", false, "Zanba")];

describe("shelfAction", () => {
  it("climbs to a book that is not the near one", () => {
    expect(shelfAction(0.2, 0.88, true)).toBe("climb");
  });

  it("enters a ready book already in front of the camera", () => {
    expect(shelfAction(0.875, 0.88, true)).toBe("enter");
  });

  it("never enters a locked book, even in front of the camera", () => {
    expect(shelfAction(0.88, 0.88, false)).toBe("climb");
  });
});

describe("createShelf", () => {
  /** Mounts a shelf in a fresh container. */
  function mount(onSelect = vi.fn()) {
    const parent = document.createElement("div");
    const shelf = createShelf(parent, BOOKS, onSelect);
    const buttons = [...parent.querySelectorAll<HTMLButtonElement>("button")];
    return { parent, shelf, buttons, onSelect };
  }

  it("is a labelled nav with one button per book and the Kréyòl label", () => {
    const { parent, buttons } = mount();
    const nav = parent.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBeTruthy();
    expect(nav?.textContent).toContain("Sé kont-la");
    expect(nav?.textContent).not.toContain("Kont-yo");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain("Ti Kannot");
    expect(buttons[1].textContent).toContain("Talè · bientôt");
    expect(buttons[1].getAttribute("aria-label")).toContain("bientôt");
  });

  it("marks the near book as current", () => {
    const { shelf, buttons } = mount();
    shelf.setNear(1);
    expect(buttons[1].getAttribute("aria-current")).toBe("true");
    expect(buttons[0].getAttribute("aria-current")).toBe("false");
    shelf.setNear(-1);
    expect(buttons.every((b) => b.getAttribute("aria-current") === "false")).toBe(true);
  });

  it("reports the pressed book (click, Enter and Space all fire click on a native button)", () => {
    const { buttons, onSelect } = mount();
    buttons[1].click();
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("renders book titles as text, never as HTML", () => {
    const parent = document.createElement("div");
    createShelf(parent, [book("x", true, "<img src=x onerror=alert(1)>")], vi.fn());
    expect(parent.querySelector("img")).toBeNull();
  });

  it("removes itself on dispose", () => {
    const { parent, shelf } = mount();
    shelf.dispose();
    expect(parent.querySelector("nav")).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/tree/overlay/shelf.test.ts`
Expected: FAIL — cannot resolve `./shelf`.

- [ ] **Step 3: Implement `src/tree/overlay/shelf.ts`**

```ts
import type { BookManifest } from "@app/contract";

export type ShelfAction = "enter" | "climb";

const DOT_COLOURS = ["#c4572e", "#4f8a3a", "#3f8fa0", "#b07a2a", "#8a5aa8"];
const LOCKED_DOT = "#b39a7a";
const NEAR_EPSILON = 0.03;

/** First press brings the camera to the book; a press on the ready book already in front enters it. */
export function shelfAction(currentT: number, bookT: number, ready: boolean): ShelfAction {
  return ready && Math.abs(currentT - bookT) < NEAR_EPSILON ? "enter" : "climb";
}

/** "Sé kont-la": direct access to every book of the tree, touch and keyboard friendly. */
export function createShelf(
  parent: HTMLElement,
  books: BookManifest[],
  onSelect: (index: number) => void,
): { setNear(index: number): void; dispose(): void } {
  const nav = document.createElement("nav");
  nav.className = "tree-shelf";
  nav.setAttribute("aria-label", "Les contes de l'arbre");
  const label = document.createElement("div");
  label.className = "tree-shelf-label";
  label.textContent = "Sé kont-la";
  nav.append(label);

  const buttons = books.map((book, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-shelf-book";
    button.style.setProperty(
      "--dot",
      book.ready ? DOT_COLOURS[i % DOT_COLOURS.length] : LOCKED_DOT,
    );
    const dot = document.createElement("span");
    dot.className = "tree-shelf-dot";
    dot.textContent = String(i + 1);
    const text = document.createElement("span");
    text.className = "tree-shelf-text";
    const title = document.createElement("span");
    title.className = "tree-shelf-title";
    title.textContent = book.card.title;
    const sub = document.createElement("span");
    sub.className = "tree-shelf-sub";
    sub.textContent = book.ready ? book.card.theme : "Talè · bientôt";
    text.append(title, sub);
    button.append(dot, text);
    button.addEventListener("click", () => onSelect(i));
    nav.append(button);
    return button;
  });

  /** Accessible name: title, lock state and the hint to press again on the current book. */
  const describe = (i: number, current: boolean): string => {
    const book = books[i];
    return (
      book.card.title +
      (book.ready ? "" : ", bientôt") +
      (current && book.ready ? ", sélectionné — touche encore pour ouvrir" : "")
    );
  };

  const setNear = (index: number): void => {
    buttons.forEach((button, i) => {
      const current = i === index;
      button.setAttribute("aria-current", current ? "true" : "false");
      button.classList.toggle("is-near", current);
      button.setAttribute("aria-label", describe(i, current));
    });
  };
  setNear(-1);
  parent.append(nav);

  return {
    setNear,
    dispose() {
      nav.remove();
    },
  };
}
```

- [ ] **Step 4: Run the shelf tests**

Run: `pnpm vitest run src/tree/overlay/shelf.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Rewrite `src/tree/overlay/overlay.ts`**

```ts
import type { BookManifest } from "@app/contract";
import { createShelf } from "./shelf";

export interface CardLabel {
  x: number;
  y: number;
  opacity: number;
  book: BookManifest;
}

const BRAND_ICON = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="11" r="9" fill="#7fb24e"/><circle cx="9" cy="14" r="6" fill="#6aa043"/><circle cx="21" cy="14" r="6" fill="#8cc05a"/><rect x="13" y="16" width="4" height="11" rx="2" fill="#9a6a46"/><circle cx="15" cy="20" r="1.6" fill="#ffcf7e"/></svg>`;
const MOUSE = `<svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8"/><circle cx="9" cy="8" r="2" fill="currentColor"/></svg>`;
const BOOK_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5c2.5-1 4.8-.8 7 .8 2.2-1.6 4.5-1.8 7-.8v11c-2.5-1-4.8-.8-7 .8-2.2-1.6-4.5-1.8-7-.8z"/><path d="M10 5.3v11"/></svg>`;

/** Tree HUD (v14): brand badge, intro panel, near-card label and enter button, climb bar, shelf. */
export function createTreeOverlay(
  container: HTMLElement,
  books: BookManifest[],
  handlers: { onEnter(bookId: string): void; onShelf(index: number): void },
): { update(t: number, label: CardLabel | null, near: number): void; dispose(): void } {
  const el = document.createElement("div");
  el.className = "tree-overlay";
  el.innerHTML = `
    <div class="tree-brand">
      ${BRAND_ICON}
      <div class="tree-brand-text">
        <div class="tree-brand-title">Pyébwa a Sav</div>
        <div class="tree-brand-sub">Kont Gwadloup</div>
      </div>
    </div>
    <a class="tree-credit" href="https://xgueret.tipunchlabs.fr/" target="_blank" rel="noopener">Imaginé par xgueret</a>
    <div class="tree-intro"><div class="tree-intro-inner">
      <p class="tree-intro-title">Chak fèy sé on kont.</p>
      <p class="tree-intro-text">Chaque feuille est un conte. Tourne autour de l'arbre pour trouver le tien !</p>
      <div class="tree-intro-hint">${MOUSE}<span>Fais défiler · Glisse avec le doigt</span></div>
    </div></div>
    <div class="tree-label">
      <div class="tree-label-title"></div>
      <button type="button" class="tree-enter" hidden>${BOOK_ICON}<span>Antré adan kont-la</span></button>
      <div class="tree-locked" hidden>Talè · bientôt dans l'arbre</div>
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
  const shelf = createShelf(el, books, handlers.onShelf);
  let current: BookManifest | null = null;
  let shownNear = -2;
  enter.addEventListener("click", () => {
    if (current) handlers.onEnter(current.id);
  });

  return {
    update(t, next, near) {
      intro.style.opacity = String(Math.max(0, 1 - t * 9));
      thumb.style.top = `calc((100% - 24px) * ${t})`;
      if (near !== shownNear) {
        shownNear = near;
        shelf.setNear(near);
      }
      current = next ? next.book : null;
      if (!next) {
        label.style.opacity = "0";
        enter.hidden = true;
        locked.hidden = true;
        return;
      }
      const half = label.offsetWidth / 2;
      const edge = 12;
      label.style.left = `${Math.max(half + edge, Math.min(container.clientWidth - half - edge, next.x))}px`;
      label.style.top = `${next.y}px`;
      label.style.opacity = String(next.opacity);
      title.textContent = next.book.card.title;
      enter.hidden = !next.book.ready;
      locked.hidden = next.book.ready;
    },
    dispose() {
      shelf.dispose();
      el.remove();
    },
  };
}
```

- [ ] **Step 6: Rewrite `src/tree/overlay/overlay.css`**

```css
.tree-overlay {
  --tree-cream: #fff6e8;
  --tree-cream-soft: rgba(255, 246, 232, 0.92);
  --tree-ink: #3a2a20;
  --tree-ink-soft: #5a4334;
  --tree-terracotta: #c4572e;
  --tree-terracotta-dark: #a8451f;
  --tree-green: #4f8a3a;
  --tree-shadow: 0 6px 18px rgba(120, 70, 40, 0.18);
  --tree-shadow-strong: 0 12px 32px rgba(120, 70, 40, 0.2);
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: var(--tree-ink);
  font-family: "Andika", sans-serif;
}

.tree-overlay button:focus-visible,
.tree-overlay a:focus-visible {
  outline: 3px solid var(--tree-terracotta);
  outline-offset: 3px;
}

.tree-brand {
  position: absolute;
  left: 20px;
  top: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px 10px 14px;
  background: var(--tree-cream);
  border-radius: 22px;
  box-shadow: var(--tree-shadow);
}

.tree-brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tree-brand-title {
  font:
    800 22px/1 "Baloo 2",
    sans-serif;
}

.tree-brand-sub {
  font:
    700 13px/1.2 "Andika",
    sans-serif;
  color: var(--tree-green);
}

.tree-credit {
  position: absolute;
  left: 30px;
  top: 82px;
  pointer-events: auto;
  font:
    700 12px/1 "Andika",
    sans-serif;
  color: var(--tree-ink-soft);
  text-decoration: none;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(255, 246, 232, 0.7);
  transition: color 0.25s;
}

.tree-credit:hover {
  color: var(--tree-terracotta);
}

.tree-intro {
  position: absolute;
  right: clamp(16px, 5vw, 80px);
  top: clamp(90px, 16vh, 160px);
  max-width: min(380px, calc(100vw - 32px));
}

.tree-intro-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 24px;
  background: var(--tree-cream);
  border-radius: 26px;
  box-shadow: var(--tree-shadow-strong);
  animation: tree-rise 1.2s ease-out both;
}

.tree-intro-title {
  margin: 0;
  font:
    800 clamp(28px, 4vw, 40px)/1.05 "Baloo 2",
    sans-serif;
  text-wrap: balance;
}

.tree-intro-text {
  margin: 0;
  font:
    400 17px/1.5 "Andika",
    sans-serif;
  color: var(--tree-ink-soft);
}

.tree-intro-hint {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  font:
    700 15px/1 "Andika",
    sans-serif;
  color: var(--tree-terracotta);
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
    800 22px/1.1 "Baloo 2",
    sans-serif;
  text-align: center;
  white-space: nowrap;
  padding: 8px 18px;
  background: var(--tree-cream);
  border-radius: 999px;
  box-shadow: 0 6px 16px rgba(120, 70, 40, 0.2);
}

.tree-enter {
  pointer-events: auto;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: var(--tree-terracotta);
  color: #fff8ee;
  font:
    800 19px/1 "Baloo 2",
    sans-serif;
  padding: 14px 26px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(196, 87, 46, 0.38);
  animation: tree-nudge 2.2s ease-in-out infinite;
}

.tree-enter:hover {
  background: var(--tree-terracotta-dark);
}

.tree-locked {
  font:
    700 15px/1 "Andika",
    sans-serif;
  color: var(--tree-ink-soft);
  padding: 9px 16px;
  background: var(--tree-cream-soft);
  border-radius: 999px;
}

.tree-climb {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 170px;
  background: rgba(255, 246, 232, 0.7);
  border-radius: 3px;
}

.tree-climb-thumb {
  position: absolute;
  left: -3px;
  top: 0;
  width: 12px;
  height: 24px;
  border-radius: 6px;
  background: var(--tree-green);
  box-shadow: 0 2px 8px rgba(60, 90, 40, 0.4);
}

.tree-shelf {
  position: absolute;
  left: 50%;
  bottom: clamp(12px, 3vh, 26px);
  transform: translateX(-50%);
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--tree-cream);
  border-radius: 28px;
  box-shadow: 0 12px 30px rgba(120, 70, 40, 0.22);
  overflow-x: auto;
  pointer-events: auto;
  touch-action: pan-x;
}

.tree-shelf-label {
  font:
    800 15px/1 "Baloo 2",
    sans-serif;
  color: var(--tree-green);
  padding: 0 8px 0 10px;
  white-space: nowrap;
}

.tree-shelf-book {
  flex: none;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px 6px 6px;
  border-radius: 999px;
  border: 2px solid transparent;
  background: #fffaf2;
  cursor: pointer;
  transition:
    background 0.25s,
    border-color 0.25s;
}

.tree-shelf-book:hover {
  border-color: var(--tree-terracotta);
}

.tree-shelf-book.is-near {
  background: #ffe9c8;
  border-color: var(--tree-terracotta);
}

.tree-shelf-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--dot);
  color: #fff8ee;
  font:
    800 15px/1 "Baloo 2",
    sans-serif;
}

.tree-shelf-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
}

.tree-shelf-title {
  font:
    800 15px/1.1 "Baloo 2",
    sans-serif;
  color: var(--tree-ink);
  white-space: nowrap;
}

.tree-shelf-sub {
  font:
    700 12px/1.1 "Andika",
    sans-serif;
  color: var(--tree-green);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .tree-brand {
    left: 12px;
    top: 12px;
    padding: 8px 14px 8px 10px;
  }

  .tree-credit {
    left: 20px;
    top: 70px;
  }

  .tree-intro {
    left: 16px;
    right: 16px;
    top: auto;
    bottom: 110px;
    max-width: none;
  }

  .tree-intro-text {
    font-size: 15px;
  }

  .tree-label-title {
    white-space: normal;
    max-width: 70vw;
  }

  .tree-climb {
    right: 12px;
    height: 140px;
  }
}

@media (max-height: 500px) {
  .tree-intro {
    top: 80px;
  }

  .tree-intro-title {
    font-size: 26px;
  }

  .tree-climb {
    height: 110px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tree-intro-inner,
  .tree-intro-hint svg,
  .tree-enter {
    animation: none;
  }

  .tree-label,
  .tree-shelf-book {
    transition: none;
  }
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

@keyframes tree-nudge {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
```

> ⚠️ **Warning**: `.tree-enter` uses `display: flex`; the global `[hidden] { display: none !important }` in `src/style.css` keeps `hidden` working. Do not remove that rule.

- [ ] **Step 7: Verify**

Run: `pnpm vitest run src/tree && pnpm lint && pnpm exec prettier --check src/tree`
Expected: PASS; lint clean; Prettier clean (run `pnpm exec prettier --write src/tree` if not, then re-check).

- [ ] **Step 8: Commit** (only if agreed)

```bash
git add src/tree/overlay
git commit -m "feat(tree): v14 HUD and the Sé kont-la shelf"
```

---

### Task 9: Wire the tree universe

**Files:**

- Rewrite: `src/tree/index.ts`

**Interfaces:**

- Consumes: everything above — `detectLite`, `readLiteEnv`, `scaleCount` (Task 2); `cardT`, `hubCam` (Task 3); `createLandscape` (Task 4); `createLightTree`, `createSky` (Task 5); `createCritterStates`, `stepCritters`, `poke`, `TREE_OBSTACLE`, `CritterName` (Task 6); `createLapen`, `createZanba` (Task 7); `createTreeOverlay`, `shelfAction` (Task 8); `KONTEUR_OBSTACLES` (Task 4); `createStage(container, { exposure, maxPixelRatio })` (Task 2).
- Produces: `mountTree: MountTree` (contract unchanged).

- [ ] **Step 1: Rewrite `src/tree/index.ts`**

```ts
import "./fonts";
import "./overlay/overlay.css";
import * as THREE from "three";
import type { MountTree, TreeContext, TreeHandle } from "@app/contract";
import { clamp, lerp, smoothstep } from "@shared/math";
import { createRng } from "@shared/random";
import { createStage, fitFov, type Stage } from "@shared/three/stage";
import { detectLite, readLiteEnv, scaleCount } from "./lite";
import { createTreeOverlay } from "./overlay/overlay";
import { shelfAction } from "./overlay/shelf";
import { cardT, hubCam } from "./scene/camera";
import { createCards, type CardView } from "./scene/cards";
import { createLapen } from "./scene/critters/lapen";
import type { CritterView } from "./scene/critters/parts";
import {
  TREE_OBSTACLE,
  createCritterStates,
  poke,
  stepCritters,
  type CritterName,
} from "./scene/critters/wander";
import { createZanba } from "./scene/critters/zanba";
import { FLORA_OBSTACLES } from "./scene/flora";
import { KONTEUR_OBSTACLES, createKonteur } from "./scene/konteur";
import { createLandscape } from "./scene/landscape";
import { createSky } from "./scene/sky";
import { createLightTree } from "./scene/tree";

type Speaker = "teller" | CritterName;

const SAY: Record<Speaker, string> = {
  teller:
    "« Yé krik ! …… Yé mistikrik ! »\nChwazi on liv adan pyébwa a kont-la.\nChoisis un livre dans l'arbre des contes.",
  lapen: "Mwen sé Konpè Lapen ! Ti, mé malen…\nJe suis Compère Lapin : petit, mais malin !",
  zanba:
    "Mwen sé Konpè Zanba ! Gwo, fò… é toujou fen !\nJe suis Compère Zamba : gros, fort… et toujours affamé !",
};
const DIVE_SECONDS = 1.7;
const TAP_DISTANCE = 8;
const TAP_MS = 600;
const BUBBLE_HOLD_MS = 4500;
const CLIMB_KEYS_UP = ["ArrowUp", "ArrowLeft"];
const CLIMB_KEYS_DOWN = ["ArrowDown", "ArrowRight", " "];

type Pick =
  | { type: "teller" }
  | { type: "card"; index: number }
  | { type: "critter"; name: CritterName }
  | null;

/** Mounts the Pyébwa a Sav universe (v14): climb, hover, pick a card or the shelf, dive into a book. */
export const mountTree: MountTree = (container, ctx) => {
  const lite = detectLite(readLiteEnv());
  const stage = createStage(container, { exposure: 1.05, maxPixelRatio: lite ? 1 : 1.5 });
  try {
    return buildTree(container, ctx, stage, lite);
  } catch (err) {
    stage.dispose();
    throw err;
  }
};

/** Builds scene, overlay and input on an existing stage; the caller disposes the stage on failure. */
function buildTree(
  container: HTMLElement,
  ctx: TreeContext,
  stage: Stage,
  lite: boolean,
): TreeHandle {
  const { scene, camera } = stage;
  const count = (n: number): number => scaleCount(n, lite);
  scene.fog = new THREE.FogExp2("#f6cfae", 0.0105);
  scene.background = null;
  const rng = createRng(11);
  const landscape = createLandscape(rng, count);
  const tree = createLightTree(rng, { lite, count });
  const sky = createSky(rng, count);
  const konteur = createKonteur();
  const cards = createCards(ctx.books, tree.tips);
  const critterRng = createRng(17);
  const critters = createCritterStates();
  const views: Record<CritterName, CritterView> = { lapen: createLapen(), zanba: createZanba() };
  const obstacles = [TREE_OBSTACLE, ...KONTEUR_OBSTACLES, ...FLORA_OBSTACLES];
  scene.add(
    landscape.group,
    tree.group,
    sky.group,
    konteur.group,
    cards.group,
    views.lapen.group,
    views.zanba.group,
  );
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const parallax = calm ? 0.2 : 1;

  let t = 0;
  let target = 0;
  let hover: number | null = null;
  let near = -1;
  let speaker: Speaker | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
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
  const pickable = [...cards.planes, konteur.plane, views.lapen.group, views.zanba.group];

  const climb = (dy: number): void => {
    target = clamp(target + dy * 0.00055, 0, 1);
  };
  const enter = (index: number): void => {
    const book = ctx.books[index];
    if (book) ctx.onEnter(book.id);
  };
  const onShelf = (index: number): void => {
    const book = ctx.books[index];
    if (!book || !active || diving) return;
    const bookT = cardT(index, ctx.books.length);
    if (shelfAction(t, bookT, book.ready) === "enter") enter(index);
    else target = bookT;
  };
  const overlay = createTreeOverlay(container, ctx.books, { onEnter: ctx.onEnter, onShelf });

  /** Screen anchor of a speaker's bubble. */
  const anchorOf = (who: Speaker) => () => {
    if (who === "teller") return stage.project(konteur.anchor(anchor));
    const view = views[who];
    anchor.copy(view.group.position);
    anchor.y += view.top;
    return stage.project(anchor);
  };
  /** Shows the bubble of `who` (and pokes a critter), or hides it; `hold` keeps it for 4.5 s. */
  const setSpeaker = (who: Speaker | null, hold = false): void => {
    clearTimeout(holdTimer);
    held = hold;
    if (hold) {
      holdTimer = setTimeout(() => {
        held = false;
        setSpeaker(null);
      }, BUBBLE_HOLD_MS);
    }
    if (who === speaker) return;
    speaker = who;
    if (!who) {
      ctx.bubble.hide();
      return;
    }
    if (who !== "teller") {
      const state = critters.find((c) => c.name === who);
      if (state) poke(state);
    }
    ctx.bubble.show(SAY[who], anchorOf(who));
  };
  const pick = (): Pick => {
    ndc.set(pointer.x, pointer.y);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickable, true)[0]?.object;
    if (!hit) return null;
    if (hit === konteur.plane) return { type: "teller" };
    for (let o: THREE.Object3D | null = hit; o; o = o.parent) {
      const who = o.userData.who as CritterName | undefined;
      if (who) return { type: "critter", name: who };
    }
    const index = cards.planes.indexOf(hit as THREE.Mesh);
    return index >= 0 ? { type: "card", index } : null;
  };
  const speakerOf = (p: Pick): Speaker | null =>
    p?.type === "teller" ? "teller" : p?.type === "critter" ? p.name : null;

  /** Whether an input event comes from the HUD's own controls (buttons, links, shelf). */
  const fromControl = (e: Event): boolean =>
    e.target instanceof Element && e.target.closest("button, a, .tree-shelf") !== null;

  const onWheel = (e: WheelEvent): void => {
    if (fromControl(e)) return;
    e.preventDefault();
    if (active && !diving) climb(e.deltaY);
  };
  const onPointerDown = (e: PointerEvent): void => {
    down = fromControl(e) ? null : { y: e.clientY, t: performance.now(), moved: 0 };
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
    if (e.pointerType !== "mouse") return;
    const p = pick();
    hover = p?.type === "card" ? p.index : null;
    container.style.cursor = p ? "pointer" : "default";
    const who = speakerOf(p);
    if (who) setSpeaker(who);
    else if (!held) setSpeaker(null);
  };
  const onPointerUp = (e: PointerEvent): void => {
    const d = down;
    down = null;
    if (!d || !active || diving) return;
    if (d.moved > TAP_DISTANCE || performance.now() - d.t > TAP_MS) return;
    Object.assign(pointer, stage.pointer(e));
    const p = pick();
    if (p?.type === "card") enter(p.index);
    else if (p && e.pointerType !== "mouse") setSpeaker(speakerOf(p), true);
    else if (!p && e.pointerType !== "mouse") setSpeaker(null);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!active || diving) return;
    if ((e.key === "Enter" || e.key === " ") && e.target instanceof HTMLButtonElement) return;
    if (CLIMB_KEYS_DOWN.includes(e.key)) {
      e.preventDefault();
      climb(140);
    } else if (CLIMB_KEYS_UP.includes(e.key)) {
      e.preventDefault();
      climb(-140);
    } else if (e.key === "Enter" && near >= 0) {
      enter(near);
    }
  };

  /** Whether a projected x keeps the card and its label clear of the screen edges. */
  const onScreen = (x: number): boolean =>
    x > container.clientWidth * 0.12 && x < container.clientWidth * 0.88;

  const frame = (time: number, dt: number): void => {
    t += (target - t) * (1 - Math.exp(-dt * 4.5));
    hubCam(t, cam, look);
    konteur.place(camera.aspect);
    const fov = fitFov(50, camera.aspect);
    if (diving) {
      diving.progress = Math.min(1, diving.progress + dt / DIVE_SECONDS);
      const d = smoothstep(diving.progress);
      const card = cards.position(diving.index);
      dest.copy(cam).sub(card).normalize().multiplyScalar(-0.6).add(card);
      cam.lerp(dest, d);
      look.lerp(card, d);
      camera.fov = lerp(fov, 95, d);
      camera.updateProjectionMatrix();
    } else if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(cam);
    camera.position.x += pointer.x * 0.5 * parallax;
    camera.position.y += pointer.y * 0.3 * parallax;
    camera.lookAt(look);
    landscape.update(time);
    sky.update(time, camera.position);
    tree.update(time, hover !== null || near >= 0);
    konteur.update(time, camera.position, speaker === "teller" && !diving);
    stepCritters(critters, dt, camera.position, obstacles, critterRng);
    for (const c of critters) views[c.name].pose(c, time);
    const cardViews = cards.update(time, t, hover, camera.position, stage.project);
    let best: CardView | null = null;
    for (const v of cardViews)
      if (v.visible && onScreen(v.x) && v.near > 0.35 && (!best || v.near > best.near)) best = v;
    near = best ? best.index : -1;
    const book = best ? ctx.books[best.index] : undefined;
    overlay.update(
      t,
      best && book && !diving
        ? { x: best.x, y: best.y, opacity: Math.min(1, (best.near - 0.35) * 3), book }
        : null,
      diving ? -1 : near,
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
      setSpeaker(null);
      return new Promise<void>((resolve) => {
        diving = { index, progress: 0, resolve };
      });
    },
    pause() {
      active = false;
      setSpeaker(null);
      clearTimeout(holdTimer);
      stage.stop();
    },
    resume(fromBookId) {
      const index = fromBookId ? ctx.books.findIndex((b) => b.id === fromBookId) : -1;
      if (index >= 0) t = target = cardT(index, ctx.books.length);
      diving = null;
      hover = null;
      near = -1;
      active = true;
      stage.start(frame);
    },
    dispose() {
      setSpeaker(null);
      clearTimeout(holdTimer);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKey);
      overlay.dispose();
      stage.dispose();
    },
  };
}
```

> 💡 **Notes**
>
> - Hover only runs for mouse pointers (touch uses tap + 4.5 s hold), matching v13's touch behaviour.
> - `setSpeaker` pokes a critter only when the bubble _changes_ to it (mockup behaviour), so a mouse resting on Lapen does not re-trigger the jump every frame.
> - The rustle uses `hover ?? near` like the mockup (`tree.update(time, hover !== null || near >= 0)`).

- [ ] **Step 2: Full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all green. `pnpm test` includes `isolation.test.ts` (the tree imports only its own files, `@shared/*`, `@app/contract`, `three`, `@fontsource/*`).

- [ ] **Step 3: Format**

Run: `pnpm exec prettier --write src/tree && pnpm exec prettier --check .`
Expected: clean.

- [ ] **Step 4: Commit** (only if agreed)

```bash
git add src/tree/index.ts
git commit -m "feat(tree): wire the v14 tree screen, critters, bubbles and shelf"
```

---

### Task 10: Tree-scoped shell styles and the v14 fallback

**Files:**

- Modify: `src/style.css`
- Modify: `src/app/fallback.ts`
- Modify: `src/app/app.test.ts:206`

**Interfaces:**

- Consumes: the existing `data-book` attribute on `.app` (set while a book is open; already pinned by `app.test.ts`).
- Produces: no TS interface; CSS only.

- [ ] **Step 1: Update the failing fallback test first**

In `src/app/app.test.ts`, line 206:

```ts
expect($(".app-fallback")?.textContent).toContain("Pyébwa-la ka dòmi…");
```

Run: `pnpm vitest run src/app/app.test.ts`
Expected: FAIL on that assertion (still "pa ka limé").

- [ ] **Step 2: Update `src/app/fallback.ts`**

```ts
/** Screen shown when WebGL stays unavailable after every retry (it only ever replaces the tree). */
export function showFallback(root: HTMLElement): void {
  const el = document.createElement("div");
  el.className = "app-fallback";
  el.innerHTML = `
    <div class="app-fallback-title">Pyébwa-la ka dòmi…</div>
    <div class="app-fallback-text">L'affichage 3D (WebGL) est en pause. Recharge la page ; si rien ne change, ferme puis rouvre le navigateur.</div>
    <button type="button">Rechaje</button>`;
  el.querySelector("button")?.addEventListener("click", () => location.reload());
  root.append(el);
}
```

Run: `pnpm vitest run src/app/app.test.ts`
Expected: PASS.

- [ ] **Step 3: Update `src/style.css`**

Change the `.app-flash` background (the dive always starts from the tree):

```css
background: radial-gradient(circle at 50% 50%, #fffaf0 0%, #ffe0a8 50%, #f6cfae 100%);
```

Replace the `.app-fallback*` rules with the v14 look:

```css
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
  background: #fff6e8;
  color: #3a2a20;
}

.app-fallback-title {
  font:
    800 32px/1.1 "Baloo 2",
    sans-serif;
}

.app-fallback-text {
  max-width: 34ch;
  font:
    400 17px/1.5 "Andika",
    sans-serif;
  color: #5a4334;
  text-wrap: pretty;
}

.app-fallback button {
  min-height: 52px;
  border: 0;
  background: #c4572e;
  color: #fff8ee;
  font:
    800 18px/1 "Baloo 2",
    sans-serif;
  padding: 14px 26px;
  border-radius: 999px;
  cursor: pointer;
}

.app-fallback button:hover {
  background: #a8451f;
}
```

Append the tree-scoped variants at the end of the file:

```css
/* Tree screen (v14 "Jeunesse"): no book open. Book screens keep the rules above. */
.app:not([data-book]) .app-vignette {
  background: radial-gradient(ellipse at center, transparent 60%, rgba(140, 80, 50, 0.18) 100%);
}

.app:not([data-book]) .app-grain {
  mix-blend-mode: multiply;
  opacity: 0.12;
  filter: sepia(0.6) brightness(1.35);
}

.app:not([data-book]) .app-bubble {
  max-width: min(280px, calc(100vw - 32px));
  padding: 14px 18px;
  border-radius: 22px 22px 22px 6px;
  background: #fff8ee;
  color: #3a2a20;
  font:
    700 17px/1.4 "Andika",
    sans-serif;
  box-shadow: 0 10px 28px rgba(120, 70, 40, 0.28);
}

.app:not([data-book]) .app-notice {
  border: 0;
  background: #fff6e8;
  color: #3a2a20;
  font:
    700 16px/1 "Andika",
    sans-serif;
  box-shadow: 0 6px 18px rgba(120, 70, 40, 0.2);
}
```

> 💡 **Note**: the Andika / Baloo 2 faces are loaded by `src/tree/fonts.ts`, which `main.ts` pulls through `@tree/index` before the fallback can ever show.

- [ ] **Step 4: Gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm exec prettier --check .`
Expected: all green.

- [ ] **Step 5: Commit** (only if agreed)

```bash
git add src/style.css src/app/fallback.ts src/app/app.test.ts
git commit -m "feat(app): v14 look for the tree screen chrome and the WebGL fallback"
```

---

### Task 11: Kréyòl decisions

**Files:**

- Modify: `docs/kreyol/variants.md` (§ 3 table)
- Modify: `docs/kreyol/correction-report.md` (new § 11)

**Interfaces:** documentation only.

- [ ] **Step 1: Add rows 14–17 to `docs/kreyol/variants.md` § 3**

Append to the § 3 table (keep column alignment; Prettier will re-align):

```markdown
| 14 | arbre, indication de défilement (v14) | `Fais défiler · Glisse avec le doigt` (français en attendant) | maquette : `Fè défilé` — `défilé` est un verbe français non attesté en gcf ; forme kréyòl à proposer, puis format `Kréyòl · Français` (même cas que #9) |
| 15 | arbre, bulle de Konpè Lapen | `Ti, mé malen…` | `ti` est d'ordinaire prénominal (`on ti lapen`) ; prédicat possible : `Piti, mé malen…` — à confirmer |
| 16 | arbre, bulle de Konpè Zanba | `Gwo, fò… é toujou fen !` | `fen` (faim) et `toujou` à confirmer ; construction `toujou fen` (avoir faim) vs `toujou ni fen` |
| 17 | écran WebGL suspendu | `Pyébwa-la ka dòmi…` | forme de la maquette v14 ; `dòmi` à confirmer (graphie de « dormir ») |
```

- [ ] **Step 2: Add § 11 to `docs/kreyol/correction-report.md`**

```markdown
---

## 11. Écran de l'arbre v14 « Jeunesse » (2026-10-14, branche `feat/tree-redesign`)

Chaînes reprises de la maquette v14.2 (`design/v14/`). Seule la correction à confiance haute est appliquée ; le reste est conservé tel quel et listé dans [variants.md](variants.md) § 3 (#14–17).

| Fichier                                    | Maquette                           | Retenu                                | Catégorie                                             | Source                    | Confiance                                                      |
| ------------------------------------------ | ---------------------------------- | ------------------------------------- | ----------------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| `src/tree/overlay/shelf.ts` (étagère)      | `Kont-yo`                          | `Sé kont-la`                          | MELANGE_DE_CREOLES (pluriel `-yo` haïtien / guyanais) | B (glossaire : `sé N-la`) | haute                                                          |
| `src/tree/overlay/overlay.ts` (indication) | `Fè défilé · Glisse avec le doigt` | `Fais défiler · Glisse avec le doigt` | MELANGE (verbe français dans la partie kréyòl)        | —                         | haute pour l'erreur ; la forme kréyòl attend un locuteur (#14) |

**Non modifié** (en attente d'un locuteur) : bulles de Konpè Lapen (#15) et Konpè Zanba (#16), écran WebGL suspendu (#17).
```

- [ ] **Step 3: Format and check**

Run: `pnpm exec prettier --write docs/kreyol && pnpm exec prettier --check .`
Expected: clean.

- [ ] **Step 4: Commit** (only if agreed)

```bash
git add docs/kreyol/variants.md docs/kreyol/correction-report.md
git commit -m "docs(kreyol): record the tree v14 string decisions"
```

---

### Task 12: Final gate and manual check

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm exec prettier --check .`
Expected: all green. Paste the summary lines (test count, build size) into the hand-off message.

- [ ] **Step 2: Book screen untouched**

Run: `git diff main --stat -- src/books src/app/reading-ui src/app/language-panel src/app/app.ts`
Expected: no output (the pre-existing uncommitted `src/books/ti-kannot/langue/fr.md` change is not part of the branch diff; if `git diff main` shows it, confirm with `git diff main --stat --cached` that it is not staged).

- [ ] **Step 3: Hand the manual checklist to the user** (no headless browser)

Ask the user to run `pnpm dev` in their own browser, next to `../contes-creole-assets/maquette-14-1.html`, and tick:

```markdown
- [ ] Dusk sky: lavender top, peach horizon, big moon low behind the tree, a few stars
- [ ] Tree: straight trunk, balanced round crown with a few orange flowers, buttress roots
- [ ] Canopy breathes slowly; rustles when a card is near or hovered; hollow glows and pulses
- [ ] Flora: 3 coconut palms, breadfruits, flamboyants (red), bananas, balisiers, tree ferns — all swaying
- [ ] Lapen hops around, Zanba walks heavily; they never cross the trunk or each other
- [ ] Hover (mouse) / tap (touch) on Lapen → jump + bubble; on Zanba → trunk up + bubble; on the Konteur → lantern + bubble
- [ ] HUD: cream brand badge + credit under it, intro panel top-right, terracotta "Antré adan kont-la" pulsing
- [ ] Shelf "Sé kont-la": 1st click climbs to the book, 2nd click on Ti Kannot enters it; Zanba / Konpè Lapen never open
- [ ] Keyboard: Tab reaches the shelf, Enter on a shelf button acts once; ← → ↑ ↓ climb
- [ ] Narrow window: the shelf scrolls horizontally with the wheel/finger without moving the tree
- [ ] `?lite=1`: fewer particles, still correct; `?lite=0`: full
- [ ] OS "reduce motion" on: HUD animations stop, parallax almost gone
- [ ] Dive into Ti Kannot: golden-peach flash; **the book screen looks exactly as before** (bubble, vignette, grain, reading UI); back to the tree restores the v14 look
```

- [ ] **Step 4: Report**

Summarise to the user: what was built, gate results (with numbers), the manual checklist, and the open points from the spec § 10 (boot loader still navy) and the Kréyòl items #14–17 awaiting a Creole speaker.
