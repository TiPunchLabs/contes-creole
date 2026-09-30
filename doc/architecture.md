# Architecture

## 1. Source: the v13 mockup

`design/mockup-v13-standalone.html` (2.1 MB) is a **Claude Design export**: a self-unpacking
bundle whose manifest holds gzip+base64 assets, rebuilt into blob URLs at runtime. Extracted
sources are in `design/v13/`.

| Asset                                        | Size             | Role                                                   |
| -------------------------------------------- | ---------------- | ------------------------------------------------------ |
| `template.html` (`<x-dc>` + `DCLogic` class) | 23 KB            | UI overlay, input handling, state machine              |
| `scene13.js`                                 | 44 KB            | Procedural 3D scene: `createScene(canvas, data)`       |
| `kont-data.js`                               | 15 KB            | `TALES` (3) + `PAGES` (12) with per-page `env`         |
| three.module.js r160                         | 1.27 MB          | 3D engine (not kept — replaced by the `three` package) |
| `konteur.png`                                | 936 KB, 600×1020 | Storyteller photo cut-out, rendered as a billboard     |
| 14 × woff2                                   | ~400 KB          | Cormorant Garamond (italic 500/600) + Quicksand        |

### Technologies in the mockup

| Layer        | Technology                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 3D           | Three.js r160 — `WebGLRenderer` (ACES filmic, sRGB), `FogExp2`, `InstancedMesh`, `Raycaster` picking                                      |
| Shaders      | 3 custom GLSL `ShaderMaterial`s: glow particles (leaves, fireflies, plankton, rain), water (moon reflection), sky dome (gradient + stars) |
| Textures     | Canvas 2D: painted book covers, soft sprites, film grain — no 3D models, everything procedural with a seeded PRNG                         |
| UI runtime   | Claude Design `dc-runtime`: React 18.3.1 UMD + Babel standalone 7.29 loaded from unpkg, `<sc-if>` / `<sc-for>` / `{{ }}` templates        |
| Browser APIs | `requestAnimationFrame`, Pointer Events (wheel, mouse, touch drag), `document.fonts.ready`                                                |
| CSS          | `backdrop-filter`, `clamp()`, `text-wrap: balance/pretty`, `mix-blend-mode`, keyframes                                                    |

## 2. Experience flow

```
 hub ──(click a ready card)──► dive ──► tale ◄──► pages 1..12
  ▲                          (1.7 s zoom + flash)   │
  └──────────── rise (1.1 s) ◄──── Esc / back ──────┘
```

- **Hub — Pyébwa a Sav**: a tree of light on a tropical _morne_. Scrolling climbs a camera spiral
  around it; book-cards hang from the branches. The Konteur sits at the foot of the tree; hovering
  lights his lantern and shows "Yé krik !…".
- **World — Larivyè Klè**: a night river. Each page moves the camera along the water and
  interpolates `env`: sky, water level, moon, stars, rain, calabash count, dam / spring / tank.
- **Characters**: clicking Ti Kannot (bird) or Gwo Rako (crab) shows a speech bubble.
- **Languages**: Kréyòl / Bileng / Français switch.

## 3. Architecture

Each universe (the tree, every book) is isolated; the app shell drives them through
`src/app/contract.ts`. Full design: [`docs/superpowers/specs/2026-09-29-universes-per-book-design.md`](../docs/superpowers/specs/2026-09-29-universes-per-book-design.md).

```
index.html
└─ src/main.ts ───────────── boot
   ├─ app/                   shell: state machine (tree | dive | book | rise), registry,
   │                         story parser, reading UI, transitions, WebGL fallback
   ├─ shared/                optional toolbox: createRng, lerp/clamp/smoothstep, three helpers
   ├─ tree/                  tree universe: scene (landscape, tree, Konteur, cards), overlay
   └─ books/<id>/            one folder per book: book.ts, story/<lang>.md, cover, staging,
                             theme.css, world/ (Three.js)
```

Isolation is enforced by ESLint `no-restricted-imports`: universes import only their own files,
`@shared/*` and `@app/contract`.

## 4. Issues to fix during the port

| #   | Issue                                                                   | Fix                                                         |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Bileng mode shows full `fr.b`; the `kr.g` gloss is never used           | Done — `kr.g` is gone; `story/fr.md` shows under the Kréyòl |
| 2   | Ti Kannot's world is hard-coded in the scene                            | Done — `src/books/<id>/world/`, discovered by the registry  |
| 3   | `speak()` parses dialogue by splitting on "–" and assumes speaker order | Structured dialogue lines with explicit speaker             |
| 4   | Mouse-only card selection; canvas has no text alternative               | Focusable DOM buttons for cards, `aria-live` text card      |
| 5   | `preserveDrawingBuffer: true`                                           | Remove                                                      |
| 6   | 936 KB PNG; unused Cyrillic/Vietnamese font subsets                     | WebP (~100 KB); latin + latin-ext only                      |
| 7   | Global PRNG seed → layout changes on remount                            | Done — one `createRng` per universe                         |
| 8   | Copy: "Glisez"; "Yé mistrikrik" (data) vs "Yé mistikrik" (bubble)       | Confirm spelling with the author                            |

## 5. Design decisions

| Decision | Choice                             | Why                                                        |
| -------- | ---------------------------------- | ---------------------------------------------------------- |
| Build    | Vite 8 + TypeScript 6              | Fast HMR; TS 7 not yet supported by typescript-eslint      |
| UI       | Vanilla TS                         | UI is a thin overlay; React only served the mockup runtime |
| 3D       | `three` npm package                | Tree-shaken (529 KB min vs 1.27 MB), typed                 |
| Hosting  | GitHub only (TiPunchLabs, private) | Single remote, GitHub Actions for CI                       |

## 6. Security

Static site, no backend, no secrets. No runtime CDN dependencies once ported (the mockup's unpkg
loads disappear).
