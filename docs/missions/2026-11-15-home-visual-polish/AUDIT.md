# Audit — home visual polish (S1)

Baseline of the home (tree universe) at `ef821d2`, composition diagnosis, and the choice between
three composition variants. Written at the end of step S1 by the executor (model
`claude-fable-5-2`). Step S2 appends its kept and reverted actions below; nothing here is
overwritten.

- Branch `feat/home-visual-polish`, base `ef821d2`.
- Chosen variant committed as `62939bb` (`feat(tree): open on the whole flamboyant with the
critters at its foot`).
- Media: `~/.local/share/contes-creole-qa/home-visual-polish/` (509 MB, 239 files), listed with
  sha256 and capture conditions in `evidence/s1-media-manifest.tsv`. Paths below are relative to
  that folder unless they start with `evidence/`.

## 1. Environment and protocol

| Item          | Value                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machine       | Lenovo LOQ laptop, AMD Ryzen 7 7435HS, NVIDIA GeForce RTX 4060 Laptop GPU (driver 580.178.04), Linux 7.0.0-43, Wayland session                                          |
| Browser       | Google Chrome 157.0.8103.78 (system channel), headless, `--enable-gpu --ignore-gpu-blocklist --use-gl=angle --use-angle=gl-egl`, NVIDIA EGL vendor pinned               |
| WebGL         | `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`, asserted by every script (no SwiftShader, no llvmpipe)                       |
| Driver        | Playwright (Python) through `uv run --with playwright`; scripts in `evidence/tools/`                                                                                    |
| Captures      | dev server `pnpm dev --port 5181 --strictPort`; fake clock paused before the navigation and advanced in 16 ms frames, so a script reaches the same scene state each run |
| Load and FPS  | production build (`pnpm build`) served by `vite preview --port 5182 --strictPort` (gzip), localhost, no throttling, real clock                                          |
| Desktop       | 1440×900 CSS px, DPR 1 (renderer pixel ratio 1); ×2 close-ups on a DPR 2 context (renderer pixel ratio capped at 1.5 by the app)                                        |
| Mobile        | 390×844, DPR 3, touch and coarse pointer: **emulated on the laptop**, the app picks its lite mode (pixel ratio 1, counts × 0.45). No real phone was tested              |
| Machine state | load average 6.5 during the runs (other sessions on the machine); GPU at 8 % before the FPS run                                                                         |

Determinism: two runs of the same script gave identical critter positions to 1e-3 px
(`lapen 397.117, 589.818`, `zanba 258.526, 541.374` at 12 s). Pixels are not bit-identical (CSS
animations and the grain run on the real clock).

The scene is read without touching the app: the scripts import the three.js module that Vite
serves and patch `Object3D.prototype.lookAt` / `updateMatrixWorld` to catch the live camera,
scene and renderer (`evidence/tools/hvp.py`). This needs the dev server; the build is only used
for load and FPS.

Harness limits:

- The frame-stepped videos show motion deterministically (every other 16 ms frame, played at
  30 fps); they say nothing about real smoothness, which the FPS runs measure.
- On the emulated phone the wheel-driven climb stops short of its nominal value for small values
  (`climb-mobile-t0.20.png` still shows the intro in the baseline and after); from 0.54 up the
  captures match the baseline to 48 pixels. Use the desktop captures for the 0–0.2 range.
- The climb sequence of the FPS run lasts 40 s and the interaction one 27 s (each scripted step
  costs more than its 50 ms pause); the rest sequence lasts 20.4 s.

## 2. Components

| Part            | Files                                                                              | Format                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage, loop     | `src/shared/three/stage.ts`                                                        | one `WebGLRenderer` (MSAA `antialias: true`, ACES tone mapping, sRGB), `requestAnimationFrame` loop, `dt` clamped to 50 ms. No post-processing, no shadow maps                                                               |
| Mount and input | `src/tree/index.ts`                                                                | climb value `t` eased towards a target; wheel, finger drag, arrow keys and space; raycast picking of cards, Konteur, critters; pointer parallax (× 0.2 under reduced motion, read at mount)                                  |
| Camera          | `src/tree/scene/camera.ts`                                                         | `hubCam(t)`: spiral of 1.55π round the trunk, radius 20 → 16, height 1.3 → 7.7; also places the cards and sets the tree's `FACING`                                                                                           |
| Konpè Lapen     | `critters/lapen.ts`, `parts.ts`                                                    | procedural: meshes of the shared `SphereGeometry(1, 22, 16)` scaled into ellipsoids, plus a torus scarf with a 64 px canvas madras; groups for body, head, 2 ears; no skeleton                                               |
| Konpè Zanba     | `critters/zanba.ts`, `parts.ts`                                                    | procedural: scaled spheres, 4 capsule legs, a 5-link chain of spheres for the trunk, cone and cylinders for the bakoua hat; groups for body, head, ears, legs, trunk links                                                   |
| Critter motion  | `critters/wander.ts`                                                               | state machine wait → walk → wait on a seeded RNG (17), ring 5.2–13.7 m all round the tree; `pose()` in each view: sine hop, sine leg swing, sine ear and trunk idle; touch reaction of 1 s                                   |
| Konteur         | `scene/konteur.ts`, `assets/konteur.png` (825 kB, 600×1020)                        | photo cut-out on a billboard plane, two blob shadows, lantern with two point lights                                                                                                                                          |
| Tree            | `tree.ts`, `canopy.ts`, `foliage.ts`, `organic.ts`                                 | procedural bark tubes, painted alpha cards from a canvas atlas, one world-space wind in the shaders, sparkles                                                                                                                |
| Decor           | `landscape.ts`, `flora.ts`, `leaves.ts`, `skyline.ts`, `sky.ts`                    | vertex-coloured ground, instanced plants, three ridge bands, gradient sky, sun disc, stars, fireflies                                                                                                                        |
| Cards           | `cards.ts`, `card-title.ts`, `invitation-cover.ts`                                 | canvas-textured planes hung by a thread from the nearest branch tip                                                                                                                                                          |
| Lights          | `landscape.ts`, `palette.ts`                                                       | hemisphere 1.6 (lilac sky, green ground), canopy point 26, base point 14, "rim" directional 1.9 from behind the tree (−30, 26, 60), "key" directional 0.9 from the camera side (10, 20, −40), Konteur lantern; fog `FogExp2` |
| 2D overlay      | `overlay/overlay.ts`, `overlay.css`, `shelf.ts`                                    | intro (h1 title, kicker, motto, gloss, instruction, hint), climb bar, shelf "Sé kont-la", transparent focus-only entry points over the near card and the Konteur                                                             |
| Shell           | `src/app/` (`bubble.ts`, `backdrop.ts`: vignette and grain, `loader.ts`, `app.ts`) | shared with the books                                                                                                                                                                                                        |

Shared with other pages: `@shared/*` (math, random, stage, sprites, theme tokens) and
`@app/contract`; the tree imports nothing else (ESLint `no-restricted-imports`). The classes page
loads no three.js. A change under `src/tree/` reaches no other universe; a change in
`src/shared/three/stage.ts` or `src/app/` would.

The home has no language switch and no sound (`grep -ril "audio\|sound" src/tree src/app` only
finds the `Sound` type of `contract.ts`). Its "CTA" is the hint "Fais défiler · Glisse avec le
doigt" and the shelf.

## 3. Behaviours to preserve

Checked by `evidence/tools/behaviours.py`: 34 of 37 on the baseline
(`evidence/s1-baseline-behaviours.json`; the 3 misses are the `favicon.ico` 404 of section 4,
since filtered as pre-existing), 37 of 37 on `62939bb` (`evidence/s1-chosen-behaviours.json`).

- Keyboard: Tab order is Konteur ("Cliquez ici pour accéder à un conte au hasard."), then the
  three shelf entries (Ti Kannot é Gwo Rako, Mila et le lambi qui avait perdu son chant, Le
  prochain conte, invitation aux classes), then the browser; the near card's entry point joins in
  once a card is near. Arrow keys and space climb; Enter opens the near card.
- Mouse: hover on a critter shows its bilingual bubble and plays its 1 s reaction; hover on the
  Konteur shows his bubble with the random-tale sentence and brightens his lantern; a click on
  him opens a tale at random (draw pinned in the checks); a click on a hanging card opens it; the
  wheel climbs and fades the intro (gone at t = 0.11).
- Shelf: first press brings the camera to the slot, second press on the near slot opens it; the
  invitation goes to `/contes-des-classes/`. Way back from Ti Kannot (`.reading-back`) and Mila
  (`.mila-back`) returns to the tree at the book's card.
- Touch (emulated): finger drag climbs, a tap on a critter holds its bubble 4.5 s, a tap on the
  Konteur opens a tale, two taps on a shelf entry open it; no horizontal overflow.
- Reduced motion: CSS animations of the intro off, pointer parallax × 0.2, tale access kept. A
  live change of the preference updates the CSS but not the 3D scene (parallax still 0.49 m): the
  scene reads it once at mount. The critters, wind, fireflies and sparkles keep moving under
  reduced motion. Both are pre-existing.
- Loading: the shell's loader goes once fonts and textures are in and three frames are drawn.

## 4. Measures (baseline `ef821d2`)

Console and network: one error on every load, `404 /favicon.ico` (no favicon in the repo).
Nothing else on the tree, both books, the classes page and the way back. No failed request.

Load, production build, localhost, medians of 5 runs (`evidence/s1-baseline-perf.json`):

| Case                | DOMContentLoaded | load   | loader gone | requests | transferred |
| ------------------- | ---------------- | ------ | ----------- | -------- | ----------- |
| Desktop, cold cache | 526 ms           | 798 ms | 1735 ms     | 19       | 1 424 kB    |
| Desktop, warm cache | 312 ms           | 588 ms | 1527 ms     | 17       | 2.6 kB      |
| Mobile emul., cold  | 634 ms           | 907 ms | 1845 ms     | 18       | 1 424 kB    |
| Mobile emul., warm  | 233 ms           | 433 ms | 1445 ms     | 17       | 2.6 kB      |

Transferred weight by type (cold): images 1 106 kB (`konteur.png` 826 kB alone, the two covers
119 and 143 kB, the logo 19 kB), script 195 kB (gzip of 704 kB), fonts 113 kB (5 woff2),
styles 7 kB, document 1.4 kB.

`renderer.info` (dev server, fake clock, after settling):

| View              | draw calls | triangles | points | geometries | textures | programs |
| ----------------- | ---------- | --------- | ------ | ---------- | -------- | -------- |
| Desktop t = 0     | 321        | 262 364   | 2 606  | 106        | 25       | 29       |
| Desktop t = 0.54  | 244        | 230 928   | 2 606  | 140        | 28       | 29       |
| Desktop t = 1     | 212        | 231 899   | 2 606  | 180        | 28       | 29       |
| Mobile lite t = 0 | 186        | 184 204   | 1 079  | 79         | 15       | 28       |
| Mobile lite 0.54  | 122        | 148 937   | 1 079  | 105        | 19       | 29       |

The geometry count rises with the distance climbed in a session (106, 140, 180 on desktop, each
from a fresh load). Not investigated in S1: S2 checks whether something is rebuilt per frame.

Frame pacing, three sequences after a 5 s warm-up (rest 20 s; climb up and down 40 s;
interactions 27 s: pointer figure over the clearing with climb nudges):

| Viewport      | Sequence     | Capped: median FPS | p95 frame | frames > 33 ms | Uncapped: mean FPS | p95 frame | max frame |
| ------------- | ------------ | ------------------ | --------- | -------------- | ------------------ | --------- | --------- |
| Desktop       | rest         | 59.9               | 16.8 ms   | 0              | 796                | 2.9 ms    | 17.2 ms   |
| Desktop       | climb        | 59.9               | 16.7 ms   | 0              | 665                | 3.7 ms    | 68.3 ms   |
| Desktop       | interactions | 59.9               | 16.7 ms   | 0              | 695                | 2.4 ms    | 15.1 ms   |
| Mobile (emul) | rest         | 59.9               | 16.7 ms   | 0              | 1 366              | 0.9 ms    | 3.7 ms    |
| Mobile (emul) | climb        | 59.9               | 16.7 ms   | 0              | 1 036              | 1.3 ms    | 10.0 ms   |
| Mobile (emul) | interactions | 59.9               | 16.8 ms   | 0              | 996                | 1.4 ms    | 8.5 ms    |

The capped runs sit on the 60 Hz limit of headless Chrome and cannot show a regression; the
uncapped runs (`--disable-gpu-vsync --disable-frame-rate-limit`) are the comparison base for the
"≤ 10 % loss" rule. Their median is quantised by the 0.1 ms timer, so the mean and the p95 are
the figures to compare. The single 68 ms frame of the desktop climb happened once in 15 180
frames, on a loaded machine; S2 must repeat the run before reading a hitch into it. The mobile
rows measure the lite mode on a desktop GPU: they are not phone performance. **No real phone was
measured: the "≥ 30 FPS on an average mobile" target is not verified.**

## 5. Qualities to keep

- The "Veillée claire" light: lilac to rose to warm sky, hazy ridges, warm lamp family; shaded
  sides read lilac, never black.
- The flamboyant itself: bark, anchored painted crown, wind shared by bark and sprays.
- The Konteur as a photo cut-out with his lantern (rulings P3, KON-PHOTO), his hover bubble and
  random tale.
- The editorial intro column on paper wash, and the shelf: text contrast is not at risk today.
- The spiral climb, the cards hung from the branch tips, the return positions (CANOPY-FACE).
- The cost: 2–4 ms of frame time uncapped on the reference laptop leaves room, but nothing in the
  diagnosis calls for heavier rendering.

## 6. Defects, with evidence

Composition (opening view):

| ID  | Defect                                                                                                                                                                                                                | Evidence                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| C1  | The crown, the strongest mass and the subject of the page, is cut by the top edge on desktop and hidden behind the intro band on portrait screens (390×844, 360×640, 430×932, 768×1024) and at 1024×768               | `baseline/view-desktop-rest-02s.png`, `view-mobile-rest-02s.png`, `view-laptop-rest-02s.png` |
| C2  | The two critters are props: 86–102 px boxes on a 900 px screen (47–55 px on the phone), wherever their walk took them. Zanba starts behind the tree, 26.6 m from the camera, and is cut by the left edge on the phone | `evidence/s1-baseline-captures.json` (`layout`), `baseline/view-mobile-rest-02s.png`         |
| C3  | Nothing links the Konteur, the critters and the tree: no shared ground, no orientation, no gaze. The Konteur, the largest figure, sits alone against the left edge                                                    | `baseline/view-desktop-rest-12s.png`, `-30s.png`                                             |
| C4  | Empty lawn: roughly the lower 40 % of the desktop and phone frames hold grass only (read on the captures, not measured)                                                                                               | same captures, grey versions `*.gray.png`                                                    |
| C5  | Ti Kannot's card is cut by the left edge at the opening; no card reads as an invitation                                                                                                                               | `baseline/view-desktop-rest-02s.png`                                                         |
| C6  | The intro wash overlaps the right of the crown, and a hovered critter's bubble can land on the title                                                                                                                  | `baseline/video-characters-rest-desktop.mp4` at 15 s                                         |
| C7  | Foreground balisier (saturated red) under the intro column pulls the eye away from tree and text                                                                                                                      | `baseline/view-desktop-rest-02s.png`                                                         |
| C8  | At 1024×768 the band layout covers the whole crown and the Konteur is cut by the left edge                                                                                                                            | `baseline/view-laptop-rest-02s.png`                                                          |

Characters (`baseline/board-turntable-lapen.jpg`, `board-turntable-zanba.jpg`, the
`turntable-*.png` originals, `video-follow-lapen.mp4`, `video-follow-zanba.mp4`):

| ID  | Defect                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Zanba's trunk is a string of five separate spheres: beaded outline lit and in silhouette                                                                                                                               |
| P2  | Zanba's chest: the pale sphere crosses the body sphere along a zigzag staircase seam (two 22×16 spheres intersecting), visible at ×2 (`turntable-zanba-idle-three-quarter-lit.png`)                                    |
| P3  | Zanba's legs are capsules pushed into the belly with a hard join; body carried high on long legs, so the silhouette is a balloon on posts rather than a low, heavy mass. Ears are flat discs with a visible inner disc |
| P4  | Lapen's feet are two ellipsoids detached from the body (a gap shows from every side) and they lag the body in the hop; no legs                                                                                         |
| P5  | Lapen is an egg with a head: from the side the silhouette is a blob, only the ears say "rabbit"; paws are stubs, no mouth; the belly patch is a sphere crossing the body with a seam                                   |
| P6  | Silhouette polygon edges show on the large spheres at ×2 (22 segments scaled up to 1 m)                                                                                                                                |
| P7  | Motion is pure sines: constant hop and leg swing, no anticipation, no settle, no overlap on ears, tail or trunk; idle repeats on fixed periods (ears 1.3 and 3.1 rad/s, trunk 1.3 rad/s); no blink, no gaze            |
| P8  | Start and stop: speed switches on and off (only the pose eases), turns are a lerp on yaw while the feet keep their place, so the critters pivot on the spot; they walk through plants and each other's space           |
| P9  | Contact shadow is one fixed blob that does not react to the hop (Lapen up to 0.6 m in the air over a full shadow)                                                                                                      |
| P10 | Both read against the lawn, but Lapen's fur is close to the bark's hue and value: in front of the trunk foot he loses his outline                                                                                      |

Light and techniques:

| ID  | Defect                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | The light named "rim" comes from behind the tree and the "key" from the camera side at 0.9: characters are lit flat by the hemisphere, with no shaped side and no edge light                           |
| L2  | Three techniques meet: a photograph (Konteur), smooth plastic-like standard materials (critters, roughness 0.82, no texture) and painted cards (foliage). The critters are the ones that match neither |
| L3  | On the emulated phone the lite mode renders at pixel ratio 1 on a DPR 3 screen: stair-stepped edges on trunk, cards and critters (`closeup-*-mobile-x3-emulated-*.png`)                                |

## 7. Composition diagnosis

- Focal point: the eye lands on the title (highest contrast, on a bright wash), then on the
  Konteur (darkest figure), then on the red balisier. The tree is the largest shape but is
  cropped and has no complete outline; the critters come last.
- Size and place of the characters: Konteur 236 px tall on desktop; Lapen's projected box
  is 85×102 px and Zanba's 120×86 px (shadow included), and Zanba is often hidden. Scale order is inverted against their roles (Zanba should weigh
  more than Lapen on screen).
- Masses and contrast (grey views): title wash and Konteur carry the extremes; the tree trunk is
  mid-grey on mid-grey hills; the lawn is one flat value across half the frame.
- Depth: three ridge bands and haze work well in the distance; the mid-ground between trunk and
  camera is empty, and the foreground has one accent on the wrong side (C7).
- Overlaps: crown under the wash (C6), card under the edge (C5), Zanba behind plants.
- Space round the text: good on desktop (wash), acceptable on the phone (band) but bought by
  hiding the crown.
- Mobile framing: the vertical field is 78°, so the frame shows the sky above the crown (under
  the band) and a deep lawn; the tree and all three characters share a strip of about 300 px.

## 8. Composition variants

Three light variants, same assets, same formats, same clock instants (2, 12, 30 s) and
viewports as the baseline. All three share one piece of staging: the critters start between the
Konteur and the trunk, turned to him, and pick their walks on the lawn the opening camera shows.
They differ by the opening camera, which eases back into the unchanged spiral by t = 0.14.

| Variant       | Opening camera (offsets on the spiral's first shot)                                                                                          | Kept as                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| V1 stage only | none                                                                                                                                         | `evidence/variants/v1-stage-only.patch` |
| V2 whole tree | wide: 2 m back, 0.2 m up, 1.5 m towards the Konteur, look-at 1.5 m up and 2.8 m to the right; portrait: 2 m back, 0.3 m up, look-at 3.9 m up | commit `62939bb`                        |
| V3 low angle  | wide: 1.5 m closer, 0.7 m lower, look-at 1.3 m up and 1.8 m right; portrait: 1.5 m closer, 0.6 m lower, look-at 3.4 m up                     | `evidence/variants/v3-low-angle.patch`  |

Both patches apply on `e6b18dd` (`git apply`). Boards: `variants/board-desktop-02s.jpg`,
`board-desktop-30s.jpg`, `board-desktop-gray.jpg`, `board-mobile-02s.jpg`, `board-mobile-30s.jpg`,
`board-mobile-gray.jpg`, `board-thumbs.jpg`, `board-tablet.jpg`, `board-laptop.jpg`,
`board-small.jpg`, `board-tall.jpg`; per-variant captures in `variants/v1`, `v2`, `v3`.

| Criterion                       | Baseline                    | V1 stage only                       | V2 whole tree                                    | V3 low angle                             |
| ------------------------------- | --------------------------- | ----------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| Crown, desktop                  | cut at the top              | cut at the top                      | whole, clear sky above                           | cut more                                 |
| Crown, phone                    | behind the band             | behind the band                     | whole, under the band                            | whole but touching the band              |
| Critters                        | small, scattered            | larger, grouped                     | grouped at the foot, same size as baseline Lapen | largest                                  |
| Konteur                         | in frame, at the edge       | same                                | in frame, part of the group                      | cut by the left edge on phone and tablet |
| Text zone, desktop              | wash over the crown's right | Zanba and balisier under the column | sky beside the crown; a far palm crosses it      | crown and palm under the column          |
| Empty lawn (read, not measured) | about 40 % of the frame     | same, critters in it                | about 20 %                                       | about 15 %                               |
| Cards as invitation             | one, cut                    | one, cut                            | two visible, whole                               | one                                      |
| Thumbnail and grey reading      | title, then Konteur         | title, Konteur, Zanba               | tree outline first, then the group, then title   | trunk and Zanba, tree outline lost       |

**Choice: V2.** It is the only variant that makes the tree a complete shape and the heart of the
page on both layouts, and it does so by spending the frame's empty lawn rather than by adding
anything. The three characters become one group at its foot. The cost is known: the characters
are not larger than Lapen was in the baseline (Lapen 107 px wide box at 10.6 m, Zanba 256 px at
14.7 m on desktop, against 85 and 120 px), so their own quality has to come from S2's work on
shape and motion, not from screen size. V1 leaves the main defect (C1) untouched. V3 gives the
biggest characters but loses the Konteur on portrait screens and crowds the text.

Between the comparison and the commit, V2's wide start places moved slightly (Lapen
`[1.1, −12.3]` → `[1.1, −11.7]`, Zanba `[−4.2, −8.8]` → `[−3.4, −8.3]`) to lift Lapen's feet
off the shelf and take Zanba away from the balisier at `[−7.2, −9.4]`. Captures of the committed
state: `variants/chosen/`, before/after boards `variants/board-before-after-desktop.jpg` and
`board-before-after-mobile.jpg`, transition `variants/board-chosen-transition.jpg`,
intermediate sizes `variants/board-chosen-intermediate.jpg`.

Checks on `62939bb`:

- `pnpm typecheck`, `pnpm lint`: clean. `pnpm test`: 364 passed (356 on the base, 8 added for
  the opening camera and the stage).
- Behaviours: 37 of 37.
- Beyond the opening the camera path is the baseline's: `climb-desktop-t0.54`, `t1.00` and
  `climb-mobile-t0.54`, `t1.00` differ from the baseline by 48 to 7 530 pixels at 8 % fuzz
  (critters and sparkles), and a unit test holds `treeCam` equal to `hubCam` from t = 0.14.
- `renderer.info` at the opening: desktop 319 calls, 261 669 triangles (baseline 321,
  262 364); mobile lite 193 calls, 185 824 triangles (baseline 186, 184 204). Not a perf
  measure: S2 reruns the FPS protocol.

Not yet measured on `62939bb`: load, FPS, the frame-stepped videos.

## 9. Risks

- R1 — 1024×768 and other landscape sizes that take the band layout (width < 900 or aspect
  < 7/5): the band still covers the crown, and with V2 the Konteur and Lapen sit partly under
  the shelf (`variants/board-chosen-intermediate.jpg`). Needs a layout answer in S2 (side column
  from a lower aspect, or a band-aware camera).
- R2 — The opening framing was set by the owner on 2026-11-09 (CANOPY-FACE: "Le pied du
  flamboyant, la clairière et le Konteur doivent être visibles immédiatement"). V2 keeps all
  three visible and the tree's facing, but it is a different frame from the one he validated;
  the mission authorises it, his artistic acceptance decides.
- R3 — The critters now stay on the opening side of the tree. From the other side of the climb
  they are out of view more often than before.
- R4 — With V2 the sun disc and the invitation card sit at the left edge of the desktop intro
  wash, and the far palm's trunk crosses under the hint line: close to the text, not on it.
- R5 — The walk still drifts: at 12–30 s Zanba passes behind the Konteur on the phone and Lapen
  can end near the frame edge (`variants/chosen/view-mobile-rest-30s.png`).
- R6 — Phone performance and rendering are unverified without a device (lite pixel ratio 1).

## 10. Ordered actions for S2

1. Composition finish: intermediate layouts (R1), places and facing of the critters so that both
   faces read (Lapen starts with his back to the camera), the text zone (R4), the balisier
   accent (C7), bubbles clear of the title (C6).
2. Zanba and Lapen shapes: one continuous trunk, welded chest and belly patches, legs that grow
   from the body, lower and heavier Zanba, Lapen with haunches and attached feet; check normals
   and seams before adding segments (P1–P6).
3. Motion: eased starts and stops, turns that step, damped follow-through on ears, tail, trunk
   and belly, breathing, irregular blinks, gaze, shadow that follows the hop (P7–P9); posts and
   walks that keep the group readable (R5).
4. Light: a shaped side and a discreet edge light on the characters, materials closer to the
   painted foliage (L1, L2, P10).
5. Tree animation, reduced motion (critters and wind keep moving today), lite pixel ratio (L3).
6. Measures after each kept change, then the full protocol: load, FPS, behaviours, other pages.
