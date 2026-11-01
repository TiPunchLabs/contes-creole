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

- **Hub — Pyébwa a Konesans**: a tree of light on a tropical _morne_. Scrolling climbs a camera spiral
  around it; book-cards hang from the branches. The Konteur sits at the foot of the tree; hovering
  lights his lantern and shows "Yé krik !…".
- **World — Larivyè Klè**: a night river. Each page moves the camera along the water and
  interpolates `env`: sky, water level, moon, stars, rain, calabash count, dam / spring / tank.
- **Invitation to classes** (M2): the tree shows the published books (`ready: true`), then one
  invitation slot at the top of the climb (`src/tree/invitation.ts`, `treeSlots`). Pending books
  stay in `src/books/` but are not shown. The invitation's card, fiche and shelf entry lead to
  the **"Les contes des classes" page** (`/contes-des-classes/`), which explains the collaboration
  and links to the owner's existing contact form; nothing is collected or stored by the site.
- **Classes page**: a second Vite HTML entry (`contes-des-classes/index.html`, listed in
  `vite.config.ts` `build.rolldownOptions.input`), with its own script and styles in
  `src/pages/contes-des-classes/`. It loads tokens and fonts only (no Three.js, no app shell); ESLint
  keeps `src/pages/` off `@app`, `@tree` and `@books`. Its way back is `/#invitation`: the tree reads
  that hash at mount, starts on the invitation slot and removes it. A future page about how a class
  tale was made is a sibling folder (`contes-des-classes/<tale>/index.html`) reusing `page.css`.
- **A class tale later**: it is an ordinary book folder (`book.ts` with `ready: true`, `story/`,
  `cover.ts`, a world in 2D or 3D). Its class credit fits the card texts and the story file; no
  school or author model is needed until a real tale asks for one.
- **Characters**: clicking Ti Kannot (bird) or Gwo Rako (crab) shows a speech bubble.
- **Languages**: Kréyòl / Bileng / Français switch.
- **Scène seule** (teaching option): a toggle hides the text card; the scene, page controls and
  language stay, the book's bubble is silent and the world may reframe (`BookHandle.setCardHidden`).
  Leaving the book resets it.

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

### Theme and language layers ("Veillée claire" redesign)

- **Tokens**: `src/shared/theme/tokens.css` holds the site-wide colours, fonts and the dusk-sky
  gradient. The tree maps them onto `--tree-*` aliases, the reading frame onto `--reading-*`; a book's
  `theme.css` overrides only those aliases (Ti Kannot keeps its own reading frame until decision A4).
  The inline loader in `index.html` runs before the bundle and repeats the token values literally.
  The 3D scene's colours live in `src/tree/scene/palette.ts` (sRGB twins of the tokens).
- **Languages**: the page is `lang="fr"`; Kréyòl UI and story text carry `lang="gcf"` explicitly
  (decision A5). The reading card follows the story shown. Bubbles take a plain string (the
  shell's current language) or `{ lang, text }` segments for bilingual lines (decision T4).
- Owner decisions and their wording: `docs/redesign/decisions.md`.

### Ti Kannot's camera

- **Destination**: each page's shot (`staging.ts`) becomes six numbers (`shotVector` in
  `world/env.ts`): focus x/y/z, azimuth, elevation, log distance.
- **Progress**: a `Glide` (`world/glide.ts`) eases those numbers to the new shot in
  `moveSeconds(from, to)` seconds (1.6 to 3.4, longer for wide turns, long travels and big
  zooms). A new page mid-move starts from the current position, speed and acceleration, so rapid
  page turns and going back never jolt and never visit the skipped shots. Under reduced motion the
  camera cuts. The scene's weather, light and characters still follow the page blend (`pageF`).
- **Future narration**: a cue would call `lens.to(shotVector(shot, …), cueSeconds)` from
  `setPage` or a new handle method; the camera itself needs no change.

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
