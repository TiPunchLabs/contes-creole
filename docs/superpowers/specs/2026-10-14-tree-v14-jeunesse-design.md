# 🌳 Pyébwa a Sav — tree screen v14 "Jeunesse"

> **Status**: draft for review — 2026-10-14
> **Branch**: `feat/tree-redesign`
> **Source mockup**: `../contes-creole-assets/maquette-14-1.html` (Claude Design bundle, v14.2), archived as
> `design/v14/` (reference only, never edited).
> **Scope**: `src/tree/**`, plus two small shell touches (tree-scoped styles keyed on the existing
> `data-book` attribute, fallback screen) and one backward-compatible option in `src/shared/three/stage.ts`.
> **Out of scope**: every book world (`src/books/**`) and the reading UI (`src/app/reading-ui/`,
> `src/app/language-panel/`). They must look exactly as on `main`.

---

## 🧠 Mental Model

```
 v13 "night"                               v14 "Jeunesse"
 ───────────                               ──────────────
 navy fog, teal glow, 700 stars     ──►    peach/lavender dusk dome, rising moon, 90 stars
 crooked glowing-dust tree          ──►    straight trunk, balanced round canopy that breathes,
                                           glowing hollow in the trunk ("house of the tales")
 dark palms & bushes                ──►    Guadeloupe flora: breadfruit, flamboyant, banana,
                                           balisier, tree fern, 3 coconut palms
 nobody but the Konteur             ──►    + Konpè Lapen & Konpè Zanba wandering the clearing,
                                           reacting to touch with a bilingual bubble
 serif HUD, teal accents            ──►    Baloo 2 / Andika, cream cards, terracotta button,
                                           "Sé kont-la" shelf for direct access to every book
 one quality level                  ──►    automatic "lite" mode for tablets / small CPUs
```

The tree screen becomes **a warm, child-friendly dusk clearing**. Same mechanics (spiral climb, cards
on the tree, dive into a book), new mood, two living characters, and a shelf that makes every book
reachable without climbing.

---

## 🎯 1. Goals & non-goals

**Goals**

- Port the v14.2 tree scene faithfully: palette, lighting, sky, tree, canopy animation, hollow, flora,
  critters, cards, camera path.
- Port the v14 tree HUD: brand badge, intro panel, card label pill, animated enter button, climb bar,
  "Sé kont-la" shelf.
- Keyboard and touch parity: ←/→ climb, shelf buttons reachable with Tab, tap on characters.
- `prefers-reduced-motion` respected.
- Automatic lite mode.

**Non-goals**

- No change to any book world, its theme, its sounds, or the reading UI.
- No "effects" setting UI (the mockup's `Auto / Complet / Léger` prop): detection only.
- No link between the wandering Lapen / Zanba and their (not yet ready) books.
- The boot loader in `index.html` is unchanged (see § 9, open point).

---

## 🏗️ 2. Architecture — files

All new code stays inside the tree universe and obeys the existing isolation rules (`src/tree/**`
imports only its own files, `@shared/*`, `@app/contract` and npm packages).

```
src/tree/
  index.ts                 # wiring: stage, scene, overlay, input, critter picking/poke, lite flag
  lite.ts                  # NEW detectLite(env) + scaleCount(n, lite)
  fonts.ts                 # NEW @fontsource/baloo-2 + @fontsource/andika imports
  scene/
    camera.ts              # v14 hubCam; cardT(index, count) spread over [.2, .88]
    landscape.ts           # ground, mornes, lights, grass, pool — v14 palette
    sky.ts                 # NEW (split from landscape.ts): shader dome, moon + disc, stars, mists, fireflies
    flora.ts               # NEW breadfruit, flamboyant, banana, balisier, tree fern, 3 coconut palms
    tree.ts                # balanced growth, buttress roots, recentred crown, canopy puffs, hollow
    cards.ts               # cream covers, soft halo texture, brown thread, CS = 1.18, hover wobble
    locked-cover.ts        # v14 locked palette
    konteur.ts             # v14 material tweaks (emissive .18, warm shadow, warm seat)
    critters/
      lapen.ts             # NEW build + pose(state, time)
      zanba.ts             # NEW build + pose(state, time)
      wander.ts            # NEW pure logic: obstacles, pickTarget, clearOfTree, step(dt), poke
  overlay/
    overlay.ts / .css      # v14 HUD (brand, intro, label, enter, climb bar)
    shelf.ts               # NEW "Sé kont-la" <nav>
```

**Shell hooks (`src/app/`)**

- `app.ts`: no change. The shell already sets `root.dataset.book` while a book is open and removes it
  on close (the Ti Kannot theme keys on it), so "the tree is showing" is `.app:not([data-book])`.
- `style.css`: v14 variants of `.app-bubble`, `.app-vignette`, `.app-grain` under
  `.app:not([data-book])`; the default (book) rules are untouched. `.app-flash` gets the v14
  peach-gold gradient for everyone, since the dive always starts from the tree.
- `backdrop.ts`: none — the grain tint is done in CSS (filter / blend mode), not by repainting the
  noise canvas, so the book keeps its grain.
- `fallback.ts` + `style.css`: v14 look and text ("Pyébwa-la ka dòmi…") — this screen only ever
  replaces the tree.

**Shared (`src/shared/three/stage.ts`)**

- `createStage(container, options?: { maxPixelRatio?: number; exposure?: number })`. Defaults stay
  `1.5` and `1.15`, so the book worlds are unchanged. The tree passes `exposure: 1.05` and
  `maxPixelRatio: lite ? 1 : 1.5`.

**Fonts**: `pnpm add @fontsource/baloo-2 @fontsource/andika` (weights 700/800 and 400/700). Imported
from `src/tree/fonts.ts`; `document.fonts.ready` in `main.ts` already waits for them.

**Design archive**: the bundle is extracted to `design/v14/` (`template.html`, `scene14.js`,
`kont-data.js`) — the same layout as `design/v13/`. `konteur.png` and the data file are identical to
v13 and are not duplicated (README note instead). Excluded from lint/format like `design/v13/`.

---

## 🎨 3. Scene

### 3.1 Build order and RNG

One `createRng(11)` for the whole scene, consumed in the **v14 order**:
`createLandscape` (ground → mornes → `createFlora` (palms, breadfruits, flamboyants, bananas, balisiers,
tree ferns) → grass → pool) → `createLightTree` (growth, roots, crown recentring, canopy puffs, leaf
glow) → `createSky` (fireflies, stars, moon, mists) → cards. `createFlora` is called from inside
`createLandscape` so the shared RNG is consumed exactly where the mockup consumes it. Reordering changes the layout; the v14 order makes the result match the mockup.

The critters get their **own** `createRng(17)` for `pickTarget` / wait times, so their walk never shifts
the scene layout.

### 3.2 Values (from `sceneJs` v14.2)

| Element      | v14 value                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fog          | `FogExp2('#f6cfae', .0105)`, `scene.background = null` (sky dome visible)                                                                                                 |
| Lights       | Hemisphere `#ffe9cc`/`#86a35a` 1.6 · canopy point `#ffd890` 26 · base point `#ffb878` 14 at (1,2,−3) · rim `#ffd2a0` 1.7 at (−30,26,60) · key `#fff3e2` .9 at (10,20,−40) |
| Sky dome     | Sphere r 240, BackSide, fog off, follows camera; horizon `(1,.87,.66)` → mid `(.98,.76,.66)` → top `(.66,.64,.86)`                                                        |
| Moon         | soft sprite `#fff6dc` 34 at (−46,30,120) + disc `#fff8e6` r 7, both fog-free                                                                                              |
| Ground       | `#7ea552` → `#b8c96c`                                                                                                                                                     |
| Mornes       | `#c9a7b4` (r 62), `#b9a6cc` (r 88)                                                                                                                                        |
| Stars        | `N(90)`, upper band only, opacity .55                                                                                                                                     |
| Fireflies    | `N(340)` in a ring r 3–16, gold `#fff2a8`/`#ffcf6a`                                                                                                                       |
| Mists        | `N(12)` sprites `#fff0dc`                                                                                                                                                 |
| Grass / pool | `N(600)` `#6f9e42`/`#9cbf58` · pool `#ffd890` 14, opacity .2 ± .04                                                                                                        |
| Exposure     | 1.05                                                                                                                                                                      |

`N(n) = max(1, round(n × (lite ? .45 : 1)))`.

### 3.3 Tree

- Trunk `grow(V(0,−.8,0), up, 4.6, 1.05, 0)`; depth 0 forks into three symmetric branches plus a
  central leader; deeper branches spread around the parent axis with a tilt bound (`d.y ≥ .45`).
- Six buttress roots from (0,.9,0) diving to `L = 1.7–2.1` at y −.9, radius .5.
- Crown recentring: points above y 3.8 are shifted towards the trunk axis by the tips' centroid.
- Bark `#9a6a46`.
- **Canopy**: `InstancedMesh` of icosahedra (detail `lite ? 1 : 2`), `tips + 26` puffs, four greens with
  10 % flamboyant orange `#f0793c`; plus `N(tips × 6)` warm glow points. The group **breathes**
  (`scale 1 ± .012`, period ≈ 8 s) and **rustles** (fast small rotation) eased towards 1 while a card
  is hovered or near.
- **Hollow** at (0, 2.1, −.9): bark torus, warm disc `#ffcf7e`, pulsing glow (opacity .35 ± .1, +.25
  with rustle).

### 3.4 Flora (`flora.ts`)

Positions from the mockup, unchanged:

- coconut palms: (−9.5,−10,6.5), (11,−8,5.5), (−28,22,8);
- breadfruits (far, r > 23): five at scale 1.1–1.3;
- flamboyants: (−25,7), (23,−17), (−6,31);
- bananas: (−12,4), (13,3.5), (−11.5,6.5);
- balisiers: five near the clearing;
- tree ferns: (−4,13.6), (5.5,13.2), (13.8,−3.5).

Their positions also feed the critters' obstacle list (§ 4.2).

### 3.5 Cards & camera

- `hubCam(t)`: `r = 20 − 4t`, `y = 1.3 + 6.4t` (same angle law).
- `cardT(i, n) = n === 1 ? .5 : .2 + i × .68 / (n − 1)`; cards alternate ±.06 rad around the path.
- Cover: cream frame `#fff7e8`, terracotta border `#c4572e` (ready) / `#b39a7a` (locked), Baloo 2 /
  Andika text; back `#f3e3c3`; halo = radial texture `#ffe08a` / `#fff0d8`, opacity .2 + near·.35 +
  hover·.35; scale `1.18 × (1 + near·.1 + hover·.08)`, small z-wobble on hover.
- Book covers painted by `book.cover` are unchanged (they belong to the books).

---

## 🐰 4. Konpè Lapen & Konpè Zanba

### 4.1 Models (`lapen.ts`, `zanba.ts`)

Built from scaled spheres and capsules as in the mockup: Lapen (fur `#c99868`, cream belly, madras
scarf from a 64×64 canvas texture, long ears; scale .66) and Zanba (grey-mauve skin, five-segment
trunk, fanning ears, four legs, bakoua straw hat with a terracotta band; scale .8). Each gets a soft
blob shadow. Each module exports `create…()` returning `{ group, pose(c: CritterState, time) }`.

### 4.2 Walk logic (`wander.ts`, pure, no THREE)

```ts
interface CritterState {
  name: "lapen" | "zanba";
  r: number;
  speed: number;
  step: number; // radius, units/s, gait frequency
  pos: [number, number];
  yaw: number;
  wait: number;
  tgt: [number, number] | null;
  moving: number;
  phase: number;
  react: number;
  look: boolean;
}
```

- `obstacles`: tree (r 4.2), Konteur, palms, bananas, balisiers, tree ferns (from `flora.ts`).
- `pickTarget(c, rng)`: up to 40 draws in the ring r ∈ [5.2, 13.7]; must be free of obstacles, the path
  must stay > 4.4 from the trunk axis (`clearOfTree`), at least 2.5 away; otherwise `null`.
- `stepCritters(list, dt, camera, rng)`: `dt` clamped to [0, .05]; states wait → walk → wait (1.8–5.8 s,
  60 % "look at camera"); slows to 25 % while turning > .7 rad; stops and waits if it would come within
  `r1 + r2 + .4` of the other critter.
- `poke(c)`: `react = 1` if not already reacting; while reacting the critter turns to the camera and
  stops.

### 4.3 Animation

- **Lapen**: hops (`|sin(phase/2)|`), squash on landing, ears follow and twitch, head tilt at rest; on
  poke, a joy jump (`sin((1 − react)π)`) with waving paws.
- **Zanba**: diagonal-pair leg swing, body roll, ears fanning, trunk undulating; on poke, the trunk rises
  (`lerp → −.62`) and the head lifts.

---

## 🖱️ 5. Interaction

| Input                                | Behaviour                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Wheel, vertical drag, ↑ ↓, Space     | Climb (as today). Wheel ignored when the event comes from the shelf.                                     |
| ← →                                  | Climb, same as ↑ ↓.                                                                                      |
| Enter                                | Enter the near book (as today). Ignored when focus is on a `<button>` (the button handles it).           |
| Click / tap a card                   | Enter (ready books only).                                                                                |
| Hover Konteur                        | Bubble `TELLER_TEXT` (as today).                                                                         |
| Hover Lapen / Zanba                  | Bubble with their line, `poke`.                                                                          |
| Tap Konteur / Lapen / Zanba (touch)  | Bubble held 4.5 s (+ `poke` for critters).                                                               |
| Shelf button                         | 1st press: `target = cardT(i, n)`. Press on the already-near ready book: `onEnter`. Locked: only climbs. |
| `pointerdown` on a button or the nav | No drag starts.                                                                                          |

**Picking** raycasts cards, the Konteur plane and both critter groups (recursive); the first hit wins.
**Bubble anchor** for critters: `(pos.x, groundY + top, pos.z)` with `top` 1.55 (Lapen) / 2.55
(Zanba). Hidden on dive, pause and dispose.

**Reduced motion**: pointer parallax × .2; CSS `rise`, `bob`, `nudge` animations disabled. 3D motion
stays (slow and soft by design).

---

## 🧭 6. HUD

- **Brand badge** (top-left): cream pill, small SVG tree with hollow, "Pyébwa a Sav" (Baloo 2 800) /
  "Kont Gwadloup" (Andika 700, green `#4f8a3a`). The "Imaginé par xgueret" credit link is kept but moves just under the badge, since the
  shelf now takes the bottom-centre spot.
- **Intro panel** (top-right, cream, rounded 26 px): "Chak fèy sé on kont." + French sentence + hint
  with the animated mouse icon; fades as you climb (as today).
- **Card label**: title in a cream pill; "Antré adan kont-la" terracotta button with book icon, min
  height 52 px, `nudge` pulse; locked: "Talè · bientôt dans l'arbre".
- **Climb bar**: 6 px cream rail, 12×24 green thumb.
- **Shelf** (bottom-centre, `<nav aria-label>`): label "Sé kont-la", then one button per book —
  number dot (colour cycle `#c4572e #4f8a3a #3f8fa0 #b07a2a #8a5aa8`, grey `#b39a7a` when locked),
  title, sub-line (`card.theme`, or "Talè · bientôt"), `aria-current` and highlighted border on the
  near book, horizontal scroll on narrow screens, min height 48 px.
- Focus ring `3px solid #c4572e` on every tree button.

All colours are CSS custom properties at the top of `overlay.css` (`--tree-cream`, `--tree-ink`,
`--tree-terracotta`, `--tree-green`, …).

---

## 🗣️ 7. Kréyòl strings

Every Kréyòl string added or changed goes through `docs/kreyol/AGENT_RULES.md` (glossary, orthography,
grammar notes); changes are logged in `correction-report.md`, uncertain cases go to `variants.md` § 3
and the mockup form is kept in the code.

| Where          | Mockup                                          | Planned                                                                  |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| Shelf label    | `Kont-yo`                                       | **`Sé kont-la`** — `-yo` is an excluded non-gcf plural (variants.md § 2) |
| Intro hint     | `Fè défilé · Glisse avec le doigt`              | to review (`défilé` francization?)                                       |
| Lapen bubble   | `Mwen sé Konpè Lapen ! Ti, mé malen…`           | to review                                                                |
| Zanba bubble   | `Mwen sé Konpè Zanba ! Gwo, fò… é toujou fen !` | to review                                                                |
| Locked label   | `Talè · bientôt dans l'arbre`                   | keep (bilingual format)                                                  |
| Fallback title | `Pyébwa-la ka dòmi…`                            | to review                                                                |

French lines of the bubbles are kept as in the mockup.

---

## ⚡ 8. Lite mode (`lite.ts`)

```ts
detectLite({ cores, coarsePointer }): boolean   // cores <= 4 || coarsePointer
```

Read once at mount (`navigator.hardwareConcurrency ?? 8`, `matchMedia("(pointer: coarse)")`).
Effects: `maxPixelRatio 1`, particle counts × .45 (`N()`), canopy icosahedron detail 1. A
`?lite=1` / `?lite=0` query parameter forces it, for manual testing.

---

## ✅ 9. Testing & verification

**Unit tests (vitest, no WebGL)**

- `critters/wander.test.ts`: targets always free and within the ring; `clearOfTree` rejects a path
  through the trunk; two critters never overlap over 2 000 simulated steps; `dt` clamped; `poke` →
  reaction → walk resumes; a reacting critter does not re-trigger.
- `scene/camera.test.ts`: `cardT` for 1, 3, 5 books (within [.2, .88], 1 book at .5, strictly
  increasing).
- `overlay/shelf.test.ts` (jsdom): one button per book, ARIA labels, `aria-current` follows `near`,
  1st press climbs, 2nd press on a ready near book enters, a locked book never enters.
- `lite.test.ts`: detection matrix and `N()` minimum of 1.
- `app.test.ts`: `data-book` is absent at start, set after entering, removed after leaving (pins the
  selector the tree-scoped styles rely on).
- Existing suites stay green, including `isolation.test.ts`.

**Manual visual check** (user's browser, no headless capture): `pnpm dev` next to the mockup —
sky & moon, balanced crown, breathing / rustling canopy, hollow pulse, flora, critter walk & poke,
shelf (mouse, keyboard, touch), `?lite=1`, reduced motion, dive & rise, **book screen unchanged**.

**Gate**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

---

## 🔧 10. Risks & open points

- **Boot loader** (`index.html`) stays navy, so the first screen fades from dark to the bright dusk.
  Open point: restyle it to v14 in a follow-up if the jump feels harsh.
- **Performance**: the critters add ~60 meshes; the canopy is a single `InstancedMesh`. Lite mode
  covers tablets; to be checked on the user's device.
- **Layout drift**: any change to the RNG order moves the tree and the flora; the order of § 3.1 is
  fixed and documented in the code.
- **Picking cost**: recursive raycast on two small groups only on pointer move — negligible.
