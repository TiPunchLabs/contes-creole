# 🏝️ Ti Kannot — watercolour island universe

> **Status**: draft for review — 2026-10-04
> **Branch**: `feat/ti-kannot-watercolor-island`
> **Inspiration**: [Susurrus](https://susurrus.vercel.app/) — low-poly diorama island, painterly post-process, pastel light.
> **Scope**: `src/books/ti-kannot/**` only, plus one backward-compatible hook in `src/shared/three/stage.ts`.

---

## 🧠 Mental Model

```
            ┌──────── one island, seen from outside ────────┐
 page 1..12 │  staging[page] = { camera shot, light, water, │──► mixEnv (lerp between pages)
            │    stock, dam, spring, tank, rain, cast… }    │          │
            └───────────────────────────────────────────────┘          ▼
   scene (low-poly, flat-shaded) ──► RenderPass ──► Watercolour pass ──► OutputPass ──► screen
                                                 (Kuwahara + edges + paper + vignette)
   WebAudio ambience ◄── same mixed env (river level, birds, frogs, cicadas, rain)
```

The world stops being a **journey along a river at night**. It becomes **a single living diorama** that
the camera circles: each page frames the spot where the story happens, and the island changes with the
story (the river dries up, the calabashes pile up, the source is found, the rain comes back).

---

## 🎯 1. Goals & non-goals

**Goals**

- A world that reads as a watercolour painting of a Guadeloupean island, faithful to the tale's places:
  Rivière Claire, the forest and green hills, red flowers, the village, Gwo Rako's house with its
  hidden calabashes, the source behind a big rock, the dam, the shared reservoir, the sea.
- The light tells the story (dawn → drought sun → night of the deal → rain and rainbow).
- Characters rebuilt in the same style; cover and reading theme matching; procedural ambient sound with
  a mute toggle.
- Keeps every app contract: `BookWorld.mount`, `setPage`, `setStory`, `dispose`, tap-to-speak bubble.

**Non-goals**

- No imported 3D models, textures or audio files: everything is generated in code.
- No free camera (no OrbitControls): only the existing pointer parallax.
- No change to the tale text, to the reading UI component, to the tree universe or to other books.

---

## 🏗️ 2. The island (world layout)

A roughly round island, ~40 units across, centred at the origin, in a shallow turquoise sea that fills
the horizon (distant painted islets, like Susurrus' background hills).

```
                    N (back)
              ⛰ Mountain (Soufrière-like, cloud cap)
              │  big rock ▸ SOURCE  (dead branches / dam)
              ╰╮ river springs out
       🌴 🌳🔴 ╰╮  forest: palms, flamboyants (red), bananas, one big fromager
   🐦 Ti Kannot's╰╮ flamboyant (bird's perch, river bank)
        tree     ╰──╮
   🏘 village   ⛲  ╰─╮   🏠 Gwo Rako's case + yard (stock behind the house)
     (3 cases)  tank   ╰──╮
                          ╰──▸ mouth, sandy beach, reeds, a gommier canoe
                    S (front, default camera side)
```

- **Terrain** — `island/terrain.ts`: a pure height function `islandHeight(x, z)` (radial falloff +
  low-frequency noise + mountain + a riverbed carved along a fixed spline `riverPath(t)`). Ground mesh is
  a displaced plane, `flatShading`, vertex colours by height/slope (sand → grass → dark forest → rock).
- **River** — a ribbon mesh following `riverPath`, width and height driven by `env.water`; stones in the
  bed appear as the level drops.
- **Sea** — a large plane with a custom shader: shallow-water turquoise gradient, slow ripples, foam
  ring around the coast, sun glint. Reflection is faked (mirrored tint), no planar reflection pass.
- **Vegetation** — `island/vegetation.ts`, `InstancedMesh` per species: coconut palms, flamboyants (red
  canopy), banana plants, grass tufts, reeds. A `wilt` weight desaturates and lowers foliage during the
  drought.
- **Village** — `island/village.ts`: three Creole cases (wood walls, coloured shutters, red tin roofs,
  simple lambrequin trim), Gwo Rako's bigger case, the reservoir (stone cylinder with three taps) that
  grows in on page 11 (`tank` weight).
- **Source** — `island/source.ts`: big rock, spring pool, dead-branch pile (`branches` weight), Gwo
  Rako's dam of stones and planks (`dam` weight).
- **Stock** — `stock.ts`: instanced calabashes, barrels and jars piled behind Gwo Rako's house; counts
  follow the text (20, then 50, then "calabashes, barrels, jars"); `empty` weight turns them pale and
  tipped over.

All placement uses the book's seeded RNG (`createRng`) so the island is identical on every visit.

---

## 🐦 3. Characters

- **Ti Kannot** — a tiny bird in the colours of the _sucrier_ (bananaquit): yellow belly, dark grey
  back, white eyebrow, beak curved down. Idle: hops, head tilts, wing flicks; flies between perches when
  his staging position changes (arc path instead of a straight lerp).
- **Gwo Rako** — a big red land crab (_touloulou_ palette: red-orange shell, cream underside), one claw
  bigger than the other, stalk eyes. Idle: claw clacks, sideways shuffle; stamps on page 6 ("Gwo Rako
  tapa le sol").
- **The other animals** (pages 5, 9): a few low-poly helpers — egrets, an agouti, a small turtle, a
  flock of birds carrying seeds — shown only when `helpers > 0`.
- Low-poly, flat-shaded, same palette logic as the scenery. Kept: `pick(ray)` and `anchor(name)` for
  the tap-to-speak bubble; `speech.ts` unchanged.

---

## 🎬 4. Staging — page by page

`staging.ts` keeps one `PageEnv` per page id, with a new shape:

```ts
export interface PageEnv {
  shot: { focus: Focus; azimuth: number; elevation: number; distance: number }; // degrees, world units
  light: { sky: [string, string]; sun: [number, number, string]; intensity: number }; // sun: azimuth, elevation, colour
  night: number; // 0..1 — stars, fireflies, tree frogs
  mist: number;
  water: number;
  rain: number;
  rainbow: number;
  wilt: number;
  stock: { kalbas: number; barrels: number; jars: number };
  branches: number;
  dam: number;
  tank: number;
  empty: number;
  helpers: number;
  bird: Spot;
  crab: Spot | null; // named spots on the island (perch, bank, yard, source, tank…)
}
type Focus = "island" | "perch" | "house" | "river" | "source" | "village";
```

| #   | Page id                | Shot               | Light                 | What changes                                                        |
| --- | ---------------------- | ------------------ | --------------------- | ------------------------------------------------------------------- |
| 1   | `ye-krik`              | wide, whole island | misty pink dawn       | river full, birds singing                                           |
| 2   | `ti-kannot-e-gwo-rako` | perch → house      | clear morning         | bird on his flamboyant, crab at his yard                            |
| 3   | `on-lide-gwo-rako`     | house              | orange evening → dusk | 20 calabashes                                                       |
| 4   | `larivye-la-ka-desann` | river (low)        | harsh white noon      | water low, stones out, 50 calabashes, `wilt` 0.4                    |
| 5   | `sa-ti-kannot-jwenn`   | source, close      | green forest morning  | branches cleared, spring flows, helpers                             |
| 6   | `gwo-rako-vle-sous-la` | source             | overcast              | dam up, crab at the source, kalbas refill                           |
| 7   | `on-mache`             | river, low angle   | blue starry night     | fireflies, tree frogs                                               |
| 8   | `demen-maten`          | house, high        | hot morning           | max stock (calabashes + barrels + jars), `wilt` 0.8, river a thread |
| 9   | `sa-dlo-la-ka-aprann`  | source, wide       | soft green            | dam removed, all helpers working, `wilt` eases                      |
| 10  | `denye-leson-la`       | house → source     | blinding sun          | `empty` 1, crab at the source                                       |
| 11  | `on-nouvo-rezev`       | village            | gentle afternoon      | reservoir with 3 taps appears                                       |
| 12  | `ye-mistrikrik`        | wide, whole island | grey → rain → rainbow | rain 1, water above normal, rainbow                                 |

Exact numbers are tuning values, set during implementation and checked visually.

**Camera** — `env.ts` turns `shot` into a position on a sphere around the focus point (focus points are
derived from the terrain). Between pages, azimuth is interpolated along the shortest arc, then the
existing smooth easing of `pageF` applies. Pointer parallax kept. Portrait screens: distance × 1.25.

---

## 🎨 5. Watercolour rendering — `paint.ts`

`EffectComposer` (from `three/addons`, already shipped with `three`, no new dependency):

1. `RenderPass(scene, camera)`
2. `ShaderPass(watercolour)` — single fragment shader:
   - **Kuwahara** (4-sector, radius 4 desktop / 2 on low-power) → flat brushed colour patches;
   - **edge darkening** — luminance gradient darkens pigment at edges (wet-edge effect);
   - **granulation & paper** — procedural fbm noise modulates the colour + a warm paper tint;
   - **colour bleed** — a small noise-driven UV offset so edges bleed;
   - **vignette** with uneven, paper-like borders (like Susurrus' frame).
3. `OutputPass` — tone mapping + sRGB conversion.

**Quality tier**: `low` when `matchMedia("(pointer: coarse)")` or when `devicePixelRatio > 2`; low tier
uses radius 2 and pixel ratio 1. A pure `paintQuality()` function picks the tier (unit-tested).

**Shared stage hook** — `createStage().start(frame, render?)`: when `render` is given it replaces
`renderer.render(scene, camera)`. Additive and optional; the tree universe is untouched. `paint.ts`
reads `renderer.getDrawingBufferSize()` each frame and calls `composer.setSize` on change.

---

## 🔊 6. Ambient sound — `sound.ts`

- Pure WebAudio, no files: river = filtered noise whose gain and cut-off follow `env.water`; birdsong =
  synthesized chirps by day; tree frogs (_ti-sonnèt_, two-note "kwi-kwi") at night; cicadas in the
  drought; rain = noise bursts + low rumble.
- A pure `soundLevels(env)` function maps the mixed env to per-layer gains (unit-tested); the audio graph
  only follows those values.
- **Mute button** (note icon) appended by the world inside its container, top-right, styled by
  `theme.css`. State remembered in `localStorage` (wrapped in try/catch). Default **on**; the
  `AudioContext` is resumed on the first pointer event if the browser blocked autoplay.
- Disposed with the world (context closed, button removed).

---

## 🖼️ 7. Cover & reading theme

- **Cover** (`cover.ts`): repainted in Canvas 2D as a watercolour vignette of the island — layered
  translucent blobs, paper grain, the bird on a flamboyant and the crab on the beach. Same seeded RNG.
- **Theme** (`theme.css`): light paper card instead of the dark glass card — cream background, warm
  brown text, turquoise accent, ink-coloured dialogue. Display font: **Caveat** (handwritten, via
  `@fontsource/caveat`, imported only by the book's theme so it loads with the book) for titles and page
  labels; body stays Quicksand.

---

## 🧹 8. Files

```
src/books/ti-kannot/
  staging.ts        rewritten (new PageEnv)
  cover.ts          rewritten
  theme.css         rewritten
  world/
    index.ts        mount: wires island, cast, sky, water, paint, sound
    env.ts          mixEnv + camera shot
    sky.ts          rewritten: gradient dome, sun, clouds, stars, rain, rainbow
    water.ts        rewritten: sea + river ribbon
    characters.ts   rewritten
    stock.ts        new
    paint.ts        new
    sound.ts        new
    speech.ts       unchanged
    island/{terrain,ground,vegetation,village,source}.ts   new
  ├─ valley.ts, props.ts, terrain.ts   removed (moved to trash)
src/shared/three/stage.ts   + optional `render` argument on start()
```

---

## ✅ 9. Testing & verification

- Unit (vitest): staging covers every page id of `gcf.md`/`fr.md`; `mixEnv` interpolation and
  shortest-arc azimuth; `islandHeight` (sea below 0 outside the island, river bed lower than its banks);
  `paintQuality`; sound levels; existing mount tests updated (failure releases stage, listeners, audio
  and the mute button).
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green.
- Visual check in the browser of the 12 pages, desktop and a portrait viewport; frame rate checked on
  the low tier.

---

## 🔧 10. Risks

| Risk                                           | Mitigation                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Kuwahara too costly on phones                  | quality tier, radius 2, pixel ratio 1                                                     |
| Painterly blur makes the characters unreadable | characters slightly saturated; the shader reduces radius near the screen centre if needed |
| Autoplay blocked                               | resume on first pointer event; button reflects real state                                 |
| Light card hurts contrast on bright pages      | card keeps a solid enough background; check WCAG AA on text                               |

---

> **Document created on**: 2026-10-04
> **Author**: xgueret with Claude
> **Version**: 0.1
