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

## 11. S2 — improvement loop (appended; sections 1 to 10 are the S1 text, unchanged)

Product HEAD after S2: `bc06474`. Each kept change is one commit; nothing was kept without a
capture or a measure. Media of the loop: `s2/` (one folder per trial); final state: `final/`,
boards in `final/boards/`. The manifest `evidence/s2-media-manifest.tsv` lists everything.

### 11.1 Kept changes

| Commit    | Change                                                                                                                                                                                                                                                                                                                | Defects                    | Evidence                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `04bfacb` | Layouts: the intro is a column from an aspect of 6/5 (it was 7/5, so 1024×768 took the band); one opening shot per layout (tall, square, column, wide); smaller column on small landscape windows; landscape phones get the intro on the right; the Konteur's outer place only on the widest screens                  | R1, C8                     | `s2/01-band`, `s2/02-keys`, `s2/03-tune` (sweeps), `final/boards/final-layout-sweep.jpg`                 |
| `e60ebab` | Lapen and Zanba rebuilt: one painted skin each, single bent limbs (trunk, tail, ears), attached legs and feet, lower Zanba; eased speed and heading, real hops, four-beat walk tied to the ground covered, springs on ears, tail, trunk and belly, breath, irregular blinks, gaze, shadow that follows; staging rules | P1–P10, L1, L2, R5, C2, C3 | `s2/10-shapes` to `s2/15-stage`, `final/boards/before-after-turntable-*.jpg`, `final/video-follow-*.mp4` |
| `3016dd0` | Reduced motion: the decor's clock runs at 8 %, no hover rustle, critters keep their places, and the preference is followed live                                                                                                                                                                                       | S1 §3                      | `evidence/s2-final-behaviours.json` (`reduced.*`), `final/boards/before-after-reduced-motion.jpg`        |
| `3cdfa59` | Konteur served as `konteur.webp` (quality 88, alpha exact), 117 kB for 825 kB; the PNG stays as the original                                                                                                                                                                                                          | S1 §4                      | `s2/20-konteur` (47.9 dB PSNR at twice the displayed size)                                               |
| `0f70c39` | Wind in gusts: the sway's strength swells and drops (0.2 to 1.2), same peak, same rustle and timings                                                                                                                                                                                                                  | E                          | `s2/30-wind-before`, `s2/31-wind-after`: variation 0.11 → 0.21, mean change 0.0388 → 0.0336              |
| `957e576` | Lapen's start place a little further in: his feet no longer touch the shelf                                                                                                                                                                                                                                           | R4                         | `s2/41-starts`                                                                                           |
| `b76c396` | Critters' rigid pieces welded (14 meshes each for 22 and 32), limbs written as one buffer with precomputed weights                                                                                                                                                                                                    | perf                       | section 11.3                                                                                             |
| `eaf3f09` | The intro's paper wash reaches lower and keeps more body                                                                                                                                                                                                                                                              | AC4                        | `evidence/s2-final-contrast.json`                                                                        |
| `bc06474` | The Konteur's fill light reaches 4.6 m instead of 7 m, and the critters keep 4.2 m from him                                                                                                                                                                                                                           | L1                         | `s2/60-lamp` (Zanba no longer bleached; Konteur 42 dB against his previous close-up)                     |

### 11.2 Tried and not kept, found and fixed on the way

- First layout attempt (band only up to a square, `s2/01-band`): at 1100×1000 the column sat on
  the crown. Replaced before commit by the 6/5 limit and the `square` shot.
- First Lapen (`s2/10-shapes`): the idle capture caught him mid-hop because the start waits ran
  out under the loader. Waits raised (6.5 s and 9 s) so the opening group holds a few seconds.
- First limbs: triangles wound inwards, so trunk, tail and ears showed their far side, flat and
  pale (`s2/11-shapes`). Fixed before commit (`s2/12-shapes`).
- Staging without rules (`s2/13-motion`, `s2/14-chars`): Lapen hopped against Zanba, Zanba ended
  behind the foreground balisier, and both drifted towards the trunk. Added to `e60ebab`: room
  round the other critter, no target hidden behind a plant from the opening camera, no target
  deeper than 6.2 m in front of the trunk.
- Welded eyes (`s2/50-fused`, first run): the blink overrode the eye's own scale and drew two
  spikes. Fixed before commit: the lid scales a holder.
- Lite pixel ratio (L3): **not changed.** Raising it from 1 to 1.5 on phones costs 2.25 times
  the pixels, and no phone was available to check the "≥ 30 FPS" target; an adaptive scheme
  (start at 1, step up when frames are fast) was considered and left for a session with a device.
- Geometry count (S1 §4): it rises once, on the first climb, and stays there (117 at the foot,
  188 after one climb, 188 after three climbs and a further minute). Geometries are uploaded the
  first time they are drawn; nothing is rebuilt. No change.
- Scene lights (key, rim, hemisphere): not changed. The critters' edge light is in their
  material; the scene's grade is the validated "Veillée claire".
- Balisier under the intro column (C7): no plant was moved. With the kept framing it sits right
  of the group and below the column, where it balances the Konteur on the left.

### 11.3 Performance

Same protocol as S1 (section 1). Capped: median FPS, p95 frame, frames over 33 ms. Uncapped:
mean FPS / p95 frame for three builds: the S1 baseline run (machine load 6.6), the base
commit `ef821d2` rebuilt and measured in the same session as the final run (`final/ab-base-4`,
load 3.3), and the final HEAD.

| Viewport       | Sequence     | Final capped FPS | p95     | > 33 ms | S1 baseline   | Base, same session | Final         | Final vs base, same session | Final vs S1 baseline |
| -------------- | ------------ | ---------------- | ------- | ------- | ------------- | ------------------ | ------------- | --------------------------- | -------------------- |
| Desktop        | rest         | 59.9             | 16.7 ms | 0       | 796 / 2.9 ms  | 817 / 3.2 ms       | 824 / 3.1 ms  | +0.9 %                      | +3.6 %               |
| Desktop        | climb        | 59.9             | 16.7 ms | 0       | 665 / 3.7 ms  | 673 / 3.9 ms       | 674 / 4.3 ms  | +0.1 %                      | +1.4 %               |
| Desktop        | interactions | 59.9             | 16.7 ms | 0       | 695 / 2.4 ms  | 722 / 2.7 ms       | 726 / 2.8 ms  | +0.5 %                      | +4.5 %               |
| Mobile (emul.) | rest         | 59.9             | 16.7 ms | 0       | 1366 / 0.9 ms | 1437 / 0.8 ms      | 1440 / 0.8 ms | +0.2 %                      | +5.4 %               |
| Mobile (emul.) | climb        | 59.9             | 16.7 ms | 0       | 1036 / 1.3 ms | 1087 / 1.2 ms      | 1090 / 1.2 ms | +0.3 %                      | +5.2 %               |
| Mobile (emul.) | interactions | 59.9             | 16.7 ms | 0       | 996 / 1.4 ms  | 1141 / 1.1 ms      | 1063 / 1.2 ms | -6.9 %                      | +6.6 %               |

Worst uncapped change against the base measured in the same session: -6.9 % (limit −10 %).
The comparison that counts is the same-session one: the S1 baseline ran on a busier machine.

An intermediate state did break the limit and was corrected. With `e60ebab` to `957e576` the
emulated phone lost 17 to 36 % across the three sequences (`final/ab-head-1` against
`final/ab-base-1`), because both critters now stay in view on the narrow frame, where the old ones were culled much of the
time. `b76c396` halves their draw calls and cheapens their limbs; three quick alternating runs
then gave 1354 fps for 1442 at rest and 1120 for 1122 in the interactions.

Load, production build, medians of 5 (before → after):

| Case               | Loader gone    | load event   | Requests | Transferred   |
| ------------------ | -------------- | ------------ | -------- | ------------- |
| Desktop, cold      | 1735 → 1574 ms | 798 → 611 ms | 19 → 16  | 1424 → 715 kB |
| Desktop, warm      | 1527 → 1527 ms | 588 → 554 ms | 17 → 15  | 3 → 2 kB      |
| Mobile emul., cold | 1845 → 1506 ms | 907 → 531 ms | 18 → 15  | 1424 → 715 kB |
| Mobile emul., warm | 1445 → 1461 ms | 433 → 461 ms | 17 → 15  | 3 → 2 kB      |

Images 1106 → 398 kB (the Konteur), script 195 → 195 kB gzip. The final runs
block the site's analytics script (`cloud.umami.is`), which accounts for the request counts
differing by more than the favicon.

`renderer.info` (before → after):

| View                 | Draw calls | Triangles         | Geometries | Textures | Programs |
| -------------------- | ---------- | ----------------- | ---------- | -------- | -------- |
| Desktop t = 0        | 322 → 284  | 262 550 → 266 537 | 106 → 118  | 25 → 25  | 29 → 31  |
| Desktop t = 0.54     | 244 → 249  | 230 928 → 258 578 | 140 → 149  | 28 → 28  | 29 → 31  |
| Desktop t = 1        | 212 → 176  | 231 899 → 210 201 | 180 → 189  | 28 → 28  | 29 → 31  |
| Mobile lite t = 0    | 186 → 158  | 184 204 → 190 692 | 79 → 91    | 15 → 16  | 28 → 30  |
| Mobile lite t = 0.54 | 122 → 126  | 148 937 → 150 021 | 105 → 117  | 19 → 19  | 29 → 31  |

Two more programs: the critters' vertex-coloured skin and their eyes.

**Phone: not verified.** Every mobile figure is the lite mode emulated on the laptop's GPU.
The "≥ 30 FPS on an average mobile" target has no evidence either way.

### 11.4 Legibility

Contrast of each text against the pixels really behind it (text made transparent, darkest pixel
of its box; `evidence/tools/contrast.py`):

| Viewport | Weakest text          | Its ratio | Title ratio | All at or over their minimum |
| -------- | --------------------- | --------- | ----------- | ---------------------------- |
| desktop  | .tree-intro-kicker    | 5.2       | 8.67        | yes                          |
| laptop   | .tree-intro-hint span | 5.14      | 9.8         | yes                          |
| mobile   | .tree-intro-kicker    | 6.3       | 12.34       | yes                          |
| tablet   | .tree-intro-hint span | 6.21      | 12.35       | yes                          |
| w800     | .tree-intro-kicker    | 4.68      | 8.03        | yes                          |

Minimum 4.5:1, 3:1 for the display sizes (title, motto, gloss). Before `eaf3f09` the hint
measured 4.25 at 1440×900, 2.94 at 1024×768 and 1.75 at 800×600. The baseline was not measured
with this tool (it needs the dev server of the commit under test).

### 11.5 Techniques present and their coherence (AC7)

- Photograph: the Konteur, unchanged but for its file format.
- Painted cards: the crown and the plants, unchanged but for the gusts.
- Procedural solids: bark, ground, ridges, cards, and the two critters. The critters were the
  ones out of key (smooth plastic spheres). They are now matte, painted per vertex (belly, inner
  ear, tips, a darker underside) with a warm edge light: closer to the painted foliage, still
  clearly modelled. They remain a third technique beside the photograph and the painted cards;
  the gap is narrower, not closed.
- Does not apply: there is no 2D character sprite, no outline pass, no post-processing, no grain
  in the 3D scene (the shell's CSS grain and vignette are unchanged).

### 11.6 Viewing notes on the videos

The videos are frame-stepped (S1 §1) and were read as frame sequences: contact sheets at 10 to
15 frames per second for the ×1 files, and the ×0.25 copies (`*-x0.25.mp4`) exist for a human
viewer. Nobody watched them play in real time in this session.

- `final/video-follow-lapen.mp4`: each hop shows the gather, the legs tucking, the ears thrown
  back then late on landing; no frame with the feet apart from the body; he stays put between
  hops. The jump for joy (18 s) has its crouch, raised arms and a squash on landing. He still
  passes close in front of Zanba at times, and grass tufts hide him when he stands in them.
- `final/video-follow-zanba.mp4`: four beats, the stance feet hold their ground through the
  frames read, turns are walked. The trunk hangs and swings as one piece and rises as one piece
  when touched (18 s); ears fan late on turns. A faint paler oval shows on his rump from behind
  at some angles.
- `final/video-characters-rest-desktop.mp4`: both critters stay inside the frame and in front of
  the plants for the 45 s. At 15 s the pointer aimed at Lapen lands on the Konteur, whom Lapen is
  passing close by: the Konteur's bubble opens instead of Lapen's. Zanba's bubble (28 s) and the
  Konteur's open clear of the title.
- `final/video-tree-climb-*.mp4`: the opening eases into the spiral with no jump. Beyond the
  opening the camera is the baseline's (unit test `treeCam` = `hubCam` from t = 0.14); the
  captures at t = 0.54 and 1 differ from the baseline's by 0.6 to 1.7 % of their pixels at 8 %
  fuzz, which is the critters and the gusts.
- Not judged from frames: whether the motion feels right at speed. That is for the owner.

### 11.7 Limits left

- 844×390 (landscape phone): the title sits on the right edge of the crown and the shelf hides
  the group's feet (`final/sweep-phone-landscape.png`).
- 360×640: the crown's top is still under the band's fade (`final/sweep-small.png`).
- 800×600: the column touches the crown's right edge.
- Critters are out of view from the far side of the climb (S1 R3), by design of the stage.
- The opening frame differs from the one the owner validated on 2026-11-09 (S1 R2).
- `favicon.ico` 404: on the base already, not addressed (no favicon exists to add).
- Docs under `doc/` do not yet describe the opening shots or the new critters.

## 12. Correction cycle 1 (after Codex review 1; appended, sections 1 to 11 unchanged)

Review: `review-1.md`, CHANGES_REQUESTED on `996f0e1`. Product HEAD after the cycle: `3143928`.
Media of the cycle: `cycle1/` (trials `t1` to `t14`, final state `cycle1/final/`, boards in
`cycle1/final/boards/`); manifest `evidence/c1-media-manifest.tsv`. Where sections 11.3, 11.6 and
11.7 gave figures or limits for `bc06474`, the ones below replace them for `3143928`.

### 12.1 F1 and F2 — the opening shot is solved, not picked (`c5f4bff`)

The review found the group hidden by the shelf at 844×390 (F1) and a 6.5 m camera jump across
aspect 1.2 (F2). A check written for the cycle (`evidence/tools/layout_check.py`: each figure
whole on screen, clear of the shelf and of the intro text) showed F1 was wider than reported: on
`bc06474` the Konteur or Lapen were partly under the shelf at 1024×768, 1280×720, 800×600,
1024×540 and from 1200×1000 to 1280×1024 as well, and Zanba touched the right edge at 430×932.

Both come from choosing a camera per layout by hand. The fix removes the choice: sideways
placement stays keyed on the aspect, and distance and tilt are solved for the screen so that the
Konteur's feet rest just above the shelf and the whole crown sits below what the intro needs (the
band up to aspect 1.2, then less and less as the column widens, so both layouts ask the same at
their limit). The critters' stage no longer lets them stand nearer the camera than the Konteur.

Evidence on `3143928`:

- Unit tests (`camera.test.ts`): the camera moves less than 12 cm per CSS pixel of width from 400
  to 2400 px in both directions, less than 30 cm per pixel of height from 1100 to 340 px, and the
  feet and crown clearances hold on 18 sizes.
- Live resize of one open page, both directions (`evidence/c1-final-resize.json`,
  `cycle1/final/checks/board-resize-*.jpg`):

| Sweep                                                 | Steps | Largest camera move per step | Move at the layout switch | Figures cut, under the shelf or under the intro |
| ----------------------------------------------------- | ----- | ---------------------------- | ------------------------- | ----------------------------------------------- |
| width at 1000 px high (10 px a step, there and back)  | 81    | 0.259 m                      | 0.13 m, 0.13 m            | 0 step(s)                                       |
| height at 1280 px wide (20 px a step, there and back) | 45    | 0.347 m                      | no switch in this sweep   | 0 step(s)                                       |

- Layout check on the 17 sizes of the sweep (`evidence/c1-final-layout.txt`):
  0 fault(s). Sizes: 1024×768, 768×1024, 360×640, 430×932, 1920×1080, 1280×720,
  1100×1000, 900×900, 800×600, 844×390, 932×430, 667×375, 1200×1000, 1201×1000, 1250×1000,
  1280×1024, 1024×540.
- Short landscape phones: opening at 2, 12 and 30 s, climb at t = 0.1, 0.2, 0.54 and 1, and
  45 s of motion at 844×390; opening and climb at 932×430
  (`cycle1/final/boards/final-phone-landscape.jpg`,
  `cycle1/final/video-characters-rest-phone-landscape.mp4`,
  `cycle1/final/video-tree-climb-phone-landscape.mp4`). Over 75 s at 844×390 Lapen is whole and
  clear of the shelf 100.0 % of the frames and Zanba 100.0 %
  (`evidence/c1-final-motion-phone-landscape.json`).

What it costs: the tree is smaller wherever the shelf and the intro leave it less room (most of
all on a phone on its side), and on desktop the camera stands further back than in section 11,
so the Konteur and the critters are a little smaller there.

### 12.2 F3 — motion read frame by frame, and what that found (`1868a5c`)

The review is right that contact sheets could not carry AC2 and AC3. Two things were done.

First, every frame of 75 s was read from the live scene, not from a video
(`evidence/tools/motion.py`: fake clock, 16 ms frames, one touch per critter). On `bc06474` that
reading found defects the sheets had missed:

- Zanba's planted feet drifted 8 cm per stance (median) and up to 63 cm when he turned on the
  spot or settled after a stop.
- Both could snap round: up to 16° in one frame for Lapen, 4° for Zanba.
- Reaching the other critter's space stopped a walk dead (0.62 m/s to 0 in one frame), which
  also cut Lapen's hop height in mid-air.

`1868a5c` fixes them: a planted foot goes back under the body by the ground its own hip covers,
turns included; a swinging foot is lifted at any pace; Zanba turns only as he walks, in arcs of
2 m at least, picks places ahead of him and drops one he would circle; headings change at a
bounded rate; a walk slows down ahead of the other critter; a hop keeps its height.

Per-frame figures on `3143928` (`evidence/c1-final-motion-*.json`, 4 687 frames each):

| Measure                                              | Desktop 1440×900 | Phone 390×844 (emul.) | Phone on its side 844×390 (emul.) |
| ---------------------------------------------------- | ---------------- | --------------------- | --------------------------------- |
| Lapen: travel while on the ground, largest per frame | 0.0 m            | 0.0 m                 | 0.0 m                             |
| Lapen: hops in 75 s                                  | 24               | 53                    | 23                                |
| Lapen: sharpest turn in one frame                    | 5.04°            | 5.04°                 | 5.04°                             |
| Lapen: rests between bouts (s)                       | 2.3 to 20.3      | 1.2 to 8.7            | 3.2 to 21.6                       |
| Zanba: stances read                                  | 42               | 4                     | 42                                |
| Zanba: planted-foot drift per stance, median         | 0.008 m          | 0.0 m                 | 0.008 m                           |
| Zanba: planted-foot drift per stance, largest        | 0.019 m          | 0.002 m               | 0.019 m                           |
| Zanba: stances drifting over 5 cm                    | 0.0 %            | 0.0 %                 | 0.0 %                             |
| Zanba: sharpest turn in one frame                    | 0.22°            | 0.01°                 | 0.22°                             |
| Zanba: largest speed change in one frame             | 0.0179 m/s       | 0.0134 m/s            | 0.0179 m/s                        |
| Closest the two come (they would touch at 2.05 m)    | 2.62 m           | 2.55 m                | 2.62 m                            |
| Lapen whole and clear of the shelf                   | 100.0 %          | 100.0 %               | 100.0 %                           |
| Zanba whole and clear of the shelf                   | 100.0 %          | 100.0 %               | 100.0 %                           |

Second, the videos were read as frame sequences by the executor, an AI agent. This is not a
person watching playback: **human playback at ×1 and ×0.25 is not verified.** What was read:

- At ×1 (two frames per second across each whole file, `cycle1/final/`):
  - `video-follow-zanba.mp4`, 40 s: he stands, sets off on an arc past the plants, walks about
    20 s, legs alternating in the frames read, then stands with his back to the camera for
    the last 18 s, where little shows but ears and tail. Trunk and ears trail on the arc. Nothing
    snaps between consecutive samples.
  - `video-follow-lapen.mp4`, 40 s: short runs of hops between rests of several seconds; the
    jump for joy at 18 to 20 s leaves the ground with arms up and lands on his feet; ears lean
    back on the hops and stand up at rest; eyes closed in two samples (blinks). Zanba's flank
    enters the edge of this close framing for the last 15 s.
  - `video-characters-rest-desktop.mp4` and `-mobile.mp4`, 45 s, one frame every 3 s: the three
    figures stay inside the frame and above the shelf in every sample; Lapen's and Zanba's
    bubbles open clear of the title; on the phone Zanba keeps his place.
  - `video-characters-rest-phone-landscape.mp4`, 45 s, one frame every 3 s: the Konteur and both
    critters are above the shelf in all 15 samples; they are about 20 px high there, too small
    to judge anything but their place.
- At ×0.25 grain (every frame of the ×1 file, which is what the `-x0.25` copies slow down):
  - Lapen, 1.3 s at rest from 6.6 s and 1.3 s from 18.6 s: consecutive frames differ by a
    breath and an ear's lean; one blink closes and opens over five frames; no frame out of line.
  - Zanba, 2.6 s from 9 s (every other frame): standing, the trunk and ears drift smoothly; no
    frame out of line.
  - Hops and steps were not read at this grain from the videos; for them the per-frame figures
    above stand instead (no travel on the ground, foot drift, turn and speed steps).
- Not done: nobody watched any of this play. Rhythm, weight and charm at speed are unjudged.

The same reading showed what the rules cost on a portrait phone: with so little stage left,
Lapen made 8 hops in 75 s and Zanba none. `3143928` lets Lapen hop on the spot when he finds
nowhere to go and loosens their spacing to 1 m; Zanba stays at his place there (he breathes,
fans his ears, sniffs and looks around, but does not walk).

### 12.3 Other checks on `3143928`

- `pnpm typecheck`, `lint`, `build`: exit 0. `pnpm test`: 372 passed (369 before the cycle).
- Behaviours 43 of 43; other pages 24 of 24.
- Contrast, now on 9 sizes including both sides of the layout limit and the two phones on
  their side: weakest text .tree-intro-kicker at 4.63:1 on `w800` (needs 4.5); all at or over their minimum: yes.
- Performance, same protocol; the base `ef821d2` was measured again in the same session
  (`cycle1/final/ab-base`):

| Viewport       | Sequence     | Final capped FPS | p95     | > 33 ms | Base, same session | Final         | Final vs base |
| -------------- | ------------ | ---------------- | ------- | ------- | ------------------ | ------------- | ------------- |
| Desktop        | rest         | 59.9             | 16.8 ms | 0       | 816 / 3.3 ms       | 868 / 2.3 ms  | +6.4 %        |
| Desktop        | climb        | 59.9             | 16.7 ms | 0       | 683 / 3.4 ms       | 676 / 4 ms    | -1.1 %        |
| Desktop        | interactions | 59.9             | 16.8 ms | 0       | 722 / 2.5 ms       | 749 / 2.2 ms  | +3.7 %        |
| Mobile (emul.) | rest         | 59.9             | 16.7 ms | 0       | 1448 / 0.8 ms      | 1453 / 0.8 ms | +0.3 %        |
| Mobile (emul.) | climb        | 59.9             | 16.7 ms | 0       | 1112 / 1.2 ms      | 1118 / 1.2 ms | +0.5 %        |
| Mobile (emul.) | interactions | 59.9             | 16.7 ms | 0       | 1106 / 1.2 ms      | 1075 / 1.2 ms | -2.7 %        |

Worst uncapped change: -2.7 % (limit −10 %). Cold load 1424 → 716 kB, loader gone at 1735 → 1591 ms. Draw calls at the desktop
opening 311 (322 on the base). Phone: still not measured on a device.

- Wind: variation 0.21 (0.11 before the gusts), unchanged by the cycle.

### 12.4 Limits left after the cycle

- Portrait phones: Zanba does not walk (see 12.2); Lapen mostly hops near his place.
- Along the climb on short landscape screens the critters can pass under the shelf, as on the
  base: the opening is solved for the shelf, the spiral beyond it is the validated path.
- 667×375 and 1024×540: the compact intro still touches the right edge of the crown.
- The tree is small on a phone on its side; that is the price of keeping the group above the shelf.
- Zanba's rump: faint paler oval from behind (unchanged).
- Lateral foot drift is absorbed by sliding each hip inside the belly, up to 16 cm; a turn tighter
  than his 2 m arcs would exceed it, which is why he no longer makes one.
- Generated frames are now sent to the trash by the scripts (`trash`), never unlinked.

## 13. Correction cycle 2 (after Codex review 2; appended, sections 1 to 12 unchanged)

Review: `review-2.md`, CHANGES_REQUESTED on `c91eebc`. Product HEAD after the cycle: `8d7f813`.
Media: `cycle2/` (`before` is `3143928`, `t1` to `t6` the trials, `final/` the state measured);
manifest `evidence/c2-media-manifest.tsv`.

### 13.1 F1 — what the climb does to the figures, measured

`evidence/tools/climb_check.py` drives one open page up the climb and back (16 values of t each
way, the camera settled at each) and places the Konteur and both critters against the shelf and
the edges, from their real meshes in their own frame. On `3143928` (`cycle2/before/climb.json`):

| Size     | Figure-states | Whole | Behind the shelf in part | Cut by an edge | Absent |
| -------- | ------------- | ----- | ------------------------ | -------------- | ------ |
| 844×390  | 93            | 21    | 66                       | 0              | 6      |
| 932×430  | 93            | 22    | 71                       | 0              | 0      |
| 1440×900 | 93            | 62    | 19                       | 4              | 8      |
| 390×844  | 93            | 26    | 0                        | 23             | 44     |
| 1024×768 | 93            | 51    | 24                       | 4              | 14     |

So the fault is not one of short landscape screens only. There the shelf spans the whole width
and it happens at nearly every stop; but a fifth of the states on desktop and a quarter at
1024×768 had it too, the Konteur included, and the portrait phone cut figures at its side edges.

Why the camera cannot fix it. As the camera rises round the tree the figures on the lawn go down
the frame and leave it by the bottom. Whatever is at the bottom of the screen, they cross it. By
the geometry of the spiral (worked out by hand, not measured), at t = 0.54 on 844×390 their feet
are at about 81 % of the height and the shelf starts at 80 %: a tilt of some 2.5° would clear
them there, but at t = 0.2 they stand near 90 % and it would take about 12°, which puts the
hanging card, the subject of that view, off the top of a 390 px screen. Shifting the
whole picture up (a lens shift) only moves the band they cross. No tilt holds for every stop
without moving the cards, and the cards hang on the validated spiral.

### 13.2 The fix: a figure is seen whole or not at all (`d34975b`, `8d7f813`)

The rule is on the figures, at every size. Each frame the box each figure fills is projected; when
more than 2.5 % of it would be behind the shelf, under the intro text while that shows, or beyond
an edge, the figure steps out whole in a fifth of a second, and it comes back whole once all but
1 % of it shows (`presence.ts`). The check below is looser than the app on purpose (6 %), since
it measures the real meshes and the app a simpler box. While
it is out it cannot be pointed at, focused or made to speak, exactly as when it is out of frame.
Under reduced motion it steps out and in at once. The spiral, the cards, their timings, the
trigger and the opening are not touched.

After, on `8d7f813` (`evidence/c2-final-climb.json`, boards
`cycle2/final/checks/board-climbcheck-*.jpg`):

| Size      | Figure-states | Whole | Grazed (6 % at most hidden) | Behind the shelf | Cut by an edge | Absent |
| --------- | ------------- | ----- | --------------------------- | ---------------- | -------------- | ------ |
| 844×390   | 93            | 21    | 1                           | 0                | 0              | 71     |
| 932×430   | 93            | 23    | 1                           | 0                | 0              | 69     |
| 667×375   | 93            | 15    | 2                           | 0                | 0              | 76     |
| 1440×900  | 93            | 62    | 3                           | 0                | 0              | 28     |
| 1024×768  | 93            | 51    | 0                           | 0                | 0              | 42     |
| 1280×720  | 93            | 51    | 2                           | 0                | 0              | 40     |
| 1920×1080 | 93            | 68    | 4                           | 0                | 0              | 21     |
| 390×844   | 93            | 26    | 2                           | 0                | 0              | 65     |
| 768×1024  | 93            | 57    | 2                           | 0                | 0              | 34     |
| 360×640   | 93            | 39    | 0                           | 0                | 0              | 54     |

`evidence/tools/layout_check.py` now reads these climb states with the opening sweep:
0 fault on the 17 opening sizes, 0 on the 10 climb runs (`evidence/c2-final-layout.txt`).

What it costs, plainly:

- On a phone on its side the figures are on stage at the foot of the tree and gone for most of
  the climb (see the `Absent` column): there is no room for them above a shelf that takes a fifth
  of the height. They are back when the visitor comes back down.
- The Konteur's shortcut to a random tale is offered only while he is shown, as it already was
  only while he was in frame. Where he used to stand half behind the shelf he could still be
  clicked; now he cannot until he is whole again. Every tale stays one or two presses away on the
  shelf at all times; the 43 behaviour checks, his click and tap included, pass.
- Between two stops a figure that is being cut stays on screen for up to a fifth of a second
  while it fades. The check reads settled states, not those instants.

### 13.3 Other checks on `8d7f813`

- `pnpm typecheck`, `lint`, `build`: exit 0. `pnpm test`: 380 passed (372 before the cycle;
  the new ones cover the hidden share and the fade).
- Behaviours 43 of 43; other pages 24 of 24; contrast: all texts at or
  over their minimum on 9 sizes (weakest .tree-intro-kicker at 4.6:1 on `w800`).
- Opening sweep: 0 fault on 17 sizes. Live resize both ways: largest camera
  move 0.347 m per step, 0 step with a figure cut.
- Motion, 75 s per viewport: Lapen travels 0.0 m on the ground at most per frame; Zanba's
  planted feet drift 0.008 m median and 0.019 m at most per stance.
- Performance, base measured in the same session (`cycle2/final/ab-base`):

| Viewport       | Sequence     | Final capped FPS | p95     | > 33 ms | Base, same session | Final         | Final vs base |
| -------------- | ------------ | ---------------- | ------- | ------- | ------------------ | ------------- | ------------- |
| Desktop        | rest         | 59.9             | 16.7 ms | 0       | 815 / 3.3 ms       | 872 / 2 ms    | +7.0 %        |
| Desktop        | climb        | 59.9             | 16.8 ms | 1       | 677 / 3.6 ms       | 737 / 2.9 ms  | +8.8 %        |
| Desktop        | interactions | 59.9             | 16.7 ms | 0       | 725 / 2.4 ms       | 811 / 1.6 ms  | +11.9 %       |
| Mobile (emul.) | rest         | 59.9             | 16.7 ms | 0       | 1414 / 0.9 ms      | 1381 / 0.9 ms | -2.4 %        |
| Mobile (emul.) | climb        | 59.9             | 16.7 ms | 1       | 1077 / 1.2 ms      | 1099 / 1.2 ms | +2.1 %        |
| Mobile (emul.) | interactions | 59.9             | 16.8 ms | 0       | 1072 / 1.2 ms      | 1008 / 1.3 ms | -5.9 %        |

Worst uncapped change: -5.9 % (limit −10 %). Phone: still not measured on a device.

### 13.4 Limits left after the cycle

- The fade is a rule, not a staging: on short landscape screens the characters do not take part
  in the climb. Keeping them in it would need the shelf to give way (a smaller or collapsible
  shelf on those screens) or the cards to move, both outside this mission's limits.
- The limits of 12.4 stand (Zanba does not walk on portrait phones; the compact intro touches the
  crown at 667×375 and 1024×540; Zanba's rump).

## 14. Correction cycle 3 (after Codex review 3 and the owner's decision; appended, sections 1 to 13 unchanged)

Authorized by the owner on 2026-11-16 beyond the review cap (`mission.md`, Log). Review:
`review-3.md`, CHANGES_REQUESTED on `e03959f`. Owner's findings: the characters appear and
disappear during the climb; during the rotation the scene no longer seems to turn about its axis
(O1); a rebound when the scene pivots towards the next card (O2); the elephant's ears (O3), which then sank into his body at times (O4); a black-and-white triangle at the
Konteur's foot (O5). Product HEAD after the cycle: `2a6ed4c`. Media: `cycle3/` (`base` is `ef821d2`, `c2` is
`8d7f813`, `o2-before` is `aae0e5f`, `interim-240c4f5` a run stopped when O3 came in, `o3-before` is
`240c4f5`, `o4-before` is `69ab983`, `o5-before` is `7482c74`, `interim-7482c74` a run stopped when O5
came in, `interim-725a942` the full run that showed the frame cost of 14.9, `final/` the state measured); manifest `evidence/c3-media-manifest.tsv`.

### 14.1 F4 — the climb harness, and what it invalidates in section 13

`climb_check.py` wheeled a computed amount and took the stop as reached. On an emulated phone a
wheel notch weighs one third of what it does on desktop (one half at pixel ratio 2), so on six of
the ten sizes of cycle 2 the "0.54" states were at t = 0.18 and the climb never went past 0.33 or
0.5. The script now reads the climb bar after each move, corrects until the value asked for is
read (within 0.0025), records the value reached, and marks a stop missed beyond 0.01.
`layout_check.py` fails on a missed stop, on a climb not covered from foot to top both ways, and on
a gap wider than 0.08 between stops. Final run: 0 missed stop on 11 sizes,
341 states (`evidence/c3-final-climb.json`).

What this corrects in section 13: the before and after tables of 13.1 and 13.2 hold for the three
desktop-pointer sizes only; on the phone and tablet sizes they describe the first third or half of
the climb under wrong labels. The geometry of 13.1 ("no tilt holds for every stop") was hand
reasoning and is replaced by 14.3, computed on the real modules: a tilt does hold for the Konteur
on every size, though one that never comes back up (14.4) does so only in part on short landscape; none holds for every point of the lawn the critters walk.

### 14.2 O1 — the turn about the trunk

Cause. Since cycle 1 the opening placed the tree left of the intro column by aiming the camera at a
point up to 3.2 m beside the trunk, and gave that offset back between t = 0 and 0.14, while the
spiral turns its first 39°. The line of sight swung back onto the trunk during the turn, so the
scene turned about a point well off it. Measured in the browser (`pivot.py`: distance between the
line of sight and the trunk axis, pointer at the centre of the screen):

| Size      | Base `ef821d2` | Cycle 2 `8d7f813` | Final `2a6ed4c` | Trunk on screen along the final climb |
| --------- | -------------- | ----------------- | --------------- | ------------------------------------- |
| 1440×900  | 0 m            | 2.756 m           | 0 m             | 0.42 to 0.50 of the width             |
| 1920×1080 | 0 m            | 2.755 m           | 0 m             | 0.43 to 0.50 of the width             |
| 1920×839  | 0 m            | 2.756 m           | 0 m             | 0.45 to 0.50 of the width             |
| 1024×768  | 0 m            | 2.423 m           | 0 m             | 0.43 to 0.50 of the width             |
| 844×390   | 0 m            | 3.152 m           | 0 m             | 0.44 to 0.50 of the width             |
| 390×844   | 0 m            | 0 m               | 0 m             | 0.50 to 0.50 of the width             |

Fix (`camera.ts`). The camera looks at the trunk axis at every climb value: the look-at point only
ever moves up and down that axis, and the camera goes round it one way. The opening's sideways
placement is now a shift of the lens (the picture slides, the camera does not turn), and it is
given back evenly over the whole climb instead of over its first seventh: the trunk drifts across
the screen by the share shown in the last column over 279° of turn, under 4 % of the turn at any
moment (unit test). The opening compositions are kept: 0 fault on 18 sizes.

Tests added (`camera.test.ts`): the look-at point is on the trunk axis for every t on ten screens
and the camera's angle about the axis only grows; the lens drift stays under 4 % of the turn; from
t = 0.14 the camera's position is the spiral's exactly.

Frame sequences of the rotation, base and final, t = 0 to 0.3 by 0.02 then 0.4, 0.54, 0.7, 0.88,
1: `cycle3/base/board-pivot-*.jpg`, `cycle3/c2/board-pivot-*.jpg`,
`cycle3/final/checks/board-pivot-*.jpg` and the frames beside them. What they cannot show is how
the turn feels in motion: that stays the owner's reading.

### 14.3 The figures along the climb: no stepping out, a solved tilt

The step-out rule of cycle 2 (`presence.ts`, `d34975b`, `8d7f813`) is removed whole. The figures
are always there, as on the base.

Measured first, on the real camera, ground and field-of-view modules (ten sizes, t by 0.01): how
far the look-at point must be lowered for a point of the ground to stay above the shelf while it is
in the frame, and how far it can be lowered before the card of that part of the climb leaves by the
top. For the Konteur's feet the first is at most 4.9 m (short landscape, t near 0.16) and fits
under the second, within a few pixels at 844×390 near t = 0.9. For the lawn the critters walk
it does not fit: on 844×390 no point of it stays clear for the whole climb, whatever the tilt (at
the top the camera is above part of the lawn).

So the camera's pitch along the climb is solved for the Konteur (`climbPitch`): at each of 65
steps, the pitch that keeps his feet above the shelf while he is in the frame. It only ever goes
down as the climb goes up (14.4): once lowered it stays lowered, and it is never lowered further
than the cards still ahead leave room for at the top of the screen. It moves the look-at point up
and down the trunk axis only. The spiral's path, the cards, their timings, the trigger and the
journey are untouched.

Figure-states along the climb (16 stops up, 15 back, three figures), base then final. `Cut` is
behind the shelf in part, under the intro text, or cut by the top or bottom edge; `side` is a
figure the turning camera is leaving by the left or right edge:

| Size      | Base: whole or grazed | Base: cut | Base: side | Base: absent | Final: whole or grazed | Final: cut | Final: side | Final: absent |
| --------- | --------------------- | --------- | ---------- | ------------ | ---------------------- | ---------- | ----------- | ------------- |
| 844×390   | 13                    | 73        | 0          | 7            | 84                     | 9          | 0           | 0             |
| 932×430   | 20                    | 66        | 0          | 7            | 84                     | 9          | 0           | 0             |
| 667×375   | 11                    | 69        | 2          | 11           | 83                     | 8          | 2           | 0             |
| 1440×900  | 39                    | 40        | 1          | 13           | 84                     | 3          | 4           | 2             |
| 1024×768  | 31                    | 41        | 3          | 18           | 79                     | 5          | 2           | 7             |
| 1280×720  | 34                    | 45        | 4          | 10           | 83                     | 6          | 4           | 0             |
| 1920×1080 | 45                    | 34        | 4          | 10           | 88                     | 1          | 4           | 0             |
| 1920×839  | 44                    | 43        | 0          | 6            | 91                     | 2          | 0           | 0             |
| 390×844   | 41                    | 1         | 11         | 40           | 45                     | 0          | 15          | 33            |
| 768×1024  | 59                    | 4         | 12         | 18           | 71                     | 2          | 11          | 9             |
| 360×640   | 49                    | 2         | 11         | 31           | 53                     | 0          | 17          | 23            |

The Konteur alone: cut at 119 states on the base, 14 on the final (up t = 0.14 at 844×390; up t = 0.20 at 844×390; back t = 0.20 at 844×390; back t = 0.14 at 844×390; up t = 0.14 at 932×430; up t = 0.20 at 932×430; back t = 0.20 at 932×430; back t = 0.14 at 932×430; up t = 0.14 at 667×375; up t = 0.20 at 667×375; back t = 0.20 at 667×375; back t = 0.14 at 667×375; up t = 0.14 at 1280×720; back t = 0.14 at 1280×720).

What is left, plainly.

- The Konteur on short landscape screens, around the first card (t = 0.14 to 0.2): his legs are
  behind the shelf, head and body above it. At 1280×720 the shelf's top edge crosses his feet and
  the stump he sits on at t = 0.14, and he is whole at the next stop. Clearing him there would take a pitch the last card
  cannot afford, and a pitch that came back up after him is the rebound of 14.4. On the base he
  showed head and shoulders only at those stops, and was cut at most others.
- The critters wander, and where one stands when the camera passes decides whether the shelf cuts
  it: 31 critter-states of 682 are still cut on the final (299 on
  the base), listed in `evidence/c3-final-layout.txt`. Most are a critter low on screen near the
  top of the climb, small and far, its feet behind the shelf; some a critter under the intro text
  while that text fades (t = 0.07, the text at a third of its strength).

Nothing pops: a figure slides behind the shelf as the ground does, and is never hidden by a rule.
No softer treatment was added (a mist above the shelf was considered and not built: it would have
been a new element on every screen for a residue of this size). Captures:
`cycle3/final/checks/board-climbcheck-*.jpg`.

What the tilt costs: from the first card on the camera looks lower than the spiral did, by 2 to
9° depending on the screen (`evidence/c3-final-settle.json` gives the pitch at each stop against
`c3-base-settle.json`), and it stays lower to the top. Cards sit higher on screen (never closer
than 1.5 % of the height to the top, unit test), and at the top of the climb on short landscape
screens the crown's top leaves the frame.

### 14.4 O2 — the rebound when the scene pivots

The owner's capture (1920×839, 60 fps, 7 s, taken on `aae0e5f`): the opening, a fast climb to the
second card and on to the top, then back down. Decoded with ffmpeg into strips of frames
(`cycle3/o2-owner/`), it shows the crown leaving by the top and coming back as the view passes the
first card. The instrumented run (`settle.py`: one input burst per leg, the camera read on each of
170 frames) names what moves: on `aae0e5f`, at that window size, from the opening to the second
card the climb value and the angle about the trunk go one way and stop, the camera's height too;
the pitch goes from 7.1° down by 8.9° and back up to 5.0°. That was the tilt of `aae0e5f` itself,
which lowered the look-at point around the Konteur's spot and gave it back after: any leg across
that stretch dipped and returned. The easing of the climb value (an exponential approach, 4.5 per
second, the same on wheel, trackpad and touch) never overshoots, on the base or since.

Fix (`240c4f5`): the pitch is one falling curve over the climb (14.3). Height, distance from the
trunk and lens shift already went one way. A unit test holds all four to it on ten screens, for
every t by 0.002: whatever stretch is travelled, either way, each of them moves one way and stops.

Twelve legs per size (card to card up and down, and long legs across the whole climb), wheel on
pointer sizes and finger drag on touch sizes. `Back` is the largest move of the pitch against its
own direction of travel on a leg:

| Size     | Input | Base `ef821d2`: back | `aae0e5f` (the capture): back | Final `2a6ed4c`: back | Final: legs with a rebound |
| -------- | ----- | -------------------- | ----------------------------- | --------------------- | -------------------------- |
| 1920×839 | wheel | 0.00°                | 8.99°                         | 0.00°                 | 0 of 12                    |
| 1440×900 | wheel | 0.00°                | 9.28°                         | 0.00°                 | 0 of 12                    |
| 1024×768 | wheel | 0.00°                | –                             | 0.00°                 | 0 of 12                    |
| 844×390  | drag  | 0.12°                | 10.42°                        | 0.00°                 | 0 of 12                    |
| 390×844  | drag  | 0.20°                | 0.20°                         | 0.20°                 | 2 of 12                    |

Where a value is left on touch sizes it is the pointer parallax, on the base too: the camera
follows the finger by up to 0.3 m, so a drag that ends higher or lower on the glass than it
started leaves the view that much higher or lower. It is not touched here.

The same journey filmed on the final at the capture's window size, frame by frame at true speed:
`cycle3/final/checks/settle-w1920x839.webm`; the frames as numbers:
`cycle3/final/checks/settle-*.tsv`. Not established: how it feels under a real trackpad's inertia
or a real finger, which only the owner can say.

### 14.5 O3 — Zanba's ears

The owner's screenshot (`owner-o3-zamba-ears-2026-11-16.png`): two flat pink discs beside the
head. Each ear was a flattened ball 0.88 wide in the model's units, set 0.3 out from its hinge, pink over most of
its front face: round, and readable as a separate disc from the front.

Fix (`69ab983`, `zanba.ts`): each ear is a leaf shaped for the purpose from the same ball: a thick
root hinged inside the temple (the hinge is under the head's surface, so the root stays sunk in
it at every angle), a broad top, a lobe that hangs lower and narrower, a rim
that curls back, and the pink kept to the hollow inside a rim of skin. The fanning, the flap and
the spread when touched are the same hinge motion as before; still one mesh per ear, so the draw
calls do not change. Not a limit of the rig. O4 below moved the hinge and added a constraint; the captures named here
are of the final state.

Before and after at four bearings, at displayed size and at ×2:
`cycle3/final/boards/o3-zanba-ears-before-after.jpg` (before: `cycle3/o3-before/`). Read on those
frames: no gap between ear and head from the front, the three-quarter, the side or the back; the
far ear shows less than the near one when his head is turned. Not checked: every angle of the fan
in motion, which the videos of `cycle3/final/` show and a person should watch.

### 14.6 O4 — the ears and the body

The owner, after reloading on `69ab983`: the ears sometimes sink into the body. Measured rather
than looked for (`ears.py`): on every frame of a minute (idle, walks, turns, the fanning and the
flaps, the pointer resting on him twice so that he is touched), each vertex of both ears is taken
into the head's ball and into the body's (the barrel, a stretched sphere). On `69ab983`
(`evidence/c3-o4-before-ears.json`): part of an ear's blade was inside the body on 3750 of 3750 frames at 1440×900, up to 459 vertices and 38 cm deep; 3750 of 3750 frames at 390×844, up to 300 vertices and 32 cm deep.
Two causes: the lower inner ear hung inside the chest even at rest (the discs before O3 did too,
less visibly), and a head turned towards an ear carried that ear into the shoulder.

Fix (`7482c74`, `zanba.ts`), geometry and a constraint, nothing hidden:

- The ears are hinged higher on the temple, with a shorter lobe, so that at rest they hang beside
  the head and above the chest.
- Each frame the pose of each ear is solved against the body as it is on that frame (the head's
  turn and nod, the belly's breathing and jiggle): the ear fans back as far as its motion asks and
  lifts off the shoulder, about its hinge, by the least that keeps its blade 7 % of the body's
  radius clear of the barrel; when no lift is enough it is held further forward. The lift is eased
  and never under what the clearance asks. The fanning, the flap and the spread when touched are
  kept; the spring's overshoot is cut at the limit.

After, on `2a6ed4c`, 60 s per size (`evidence/c3-final-ears.json`):

| Size           | Frames | Frames with blade vertices in the body | Frames with the ear folded into the head | Least clearance to the body | Lift used      | Head turn covered   |
| -------------- | ------ | -------------------------------------- | ---------------------------------------- | --------------------------- | -------------- | ------------------- |
| 1440×900 at ×2 | 3750   | 0                                      | 0                                        | 4.1 cm                      | 0 to 1.191 rad | -0.503 to 0.515 rad |
| 390×844        | 3750   | 0                                      | 0                                        | 4.1 cm                      | 0 to 1.073 rad | -0.519 to 0.362 rad |
| 844×390        | 3750   | 0                                      | 0                                        | 4.1 cm                      | 0 to 1.191 rad | -0.503 to 0.515 rad |

What the check does not cover, plainly. The body is taken as its barrel: the legs and the hat are
not tested (the ears hang above the one and beside the other on every capture read). The root of
the ear (nearer than 0.16 of the model's units to its hinge) is excluded: it is sunk in the head on
purpose, and when the head turns its own side meets the shoulder, so up to 281 root
vertices then lie at that junction, inside both. And a minute per size is a sample of his life,
not all of it; the constraint itself holds at any pose, on the points it tests (one vertex in five
of the blade).

Captures at the extremes of the run (least clearance, widest lift, furthest head turn each way),
with the owner's build beside them: `cycle3/final/boards/o4-zanba-ears-extremes.jpg`; all of them
in `cycle3/final/checks/ears-*.png`.

### 14.7 O5 — the triangle at the Konteur's foot

The owner's screenshot (`owner-o5-konteur-foot-triangle-2026-11-16.png`): a small black-and-white
wedge by his left sandal. Captured close along the climb (`konteur_foot.py`,
`cycle3/o5-before/`), it is his lantern, in the scene since the base and unchanged by this
mission: a pale cylinder for the glass, bleached to cream by the lantern's own light and the fill
light, under a near-black cone. From the opening it read, just, as a lantern; from the climb's
higher angles the cone covers the glass and the pair is a black triangle on a white stub. Not an
alpha edge of the photo, not a decal, not z-fighting.

Fix (`725a942`, `konteur.ts`), at the source and with nothing hidden: the lantern is given what
makes one readable at that size: a bronze base, a shaped cap of the same bronze instead of the
black cone, a handle, and glass of dark amber lit from within, so that the lights around it warm
it and do not bleach it. Same place, same light on the lawn, same glow when he is pointed at; two
more small meshes (draw calls at the opening: 317).

Before and after at the same framings, 1440×900 at ×2 and 390×844, t = 0, 0.07, 0.14, 0.2, 0.3,
0.54, 0.88 and 1 where he is in the frame: `cycle3/final/boards/o5-konteur-lantern-before-after.jpg`
(crops in `cycle3/o5-before/` and `cycle3/final/checks/konteur-foot-*.png`; 844×390 too, its
before taken on `8d7f813`, whose lantern is the same). Read on those crops: a lantern at every
stop. Whether it is the lantern the owner wants there is his eye's call.

### 14.8 F5 — the Konteur's random tale

With the rule gone, his entry point is offered by the base's own test again. `teller_check.py`
reads at each of the 31 climb stops whether it is offered and whether its pointer point is clear
of the shelf, on the base and on the final, and at three stops per size activates it by pointer
(click, or tap on touch sizes) and by keyboard:

| Size      | Offered: base → final | Pointer point clear of the shelf: base → final | Opens a tale (pointer and keyboard, three stops) |
| --------- | --------------------- | ---------------------------------------------- | ------------------------------------------------ |
| 844×390   | 31 → 31 of 31         | 14 → 31                                        | 6 of 6                                           |
| 932×430   | 31 → 31 of 31         | 20 → 31                                        | 6 of 6                                           |
| 667×375   | 25 → 29 of 31         | 12 → 29                                        | 6 of 6                                           |
| 1440×900  | 25 → 25 of 31         | 25 → 25                                        | 6 of 6                                           |
| 1024×768  | 20 → 24 of 31         | 20 → 24                                        | 6 of 6                                           |
| 1280×720  | 25 → 29 of 31         | 23 → 29                                        | 6 of 6                                           |
| 1920×1080 | 25 → 29 of 31         | 25 → 29                                        | 6 of 6                                           |
| 1920×839  | 31 → 31 of 31         | 31 → 31                                        | 6 of 6                                           |
| 390×844   | 14 → 14 of 31         | 14 → 14                                        | 6 of 6                                           |
| 768×1024  | 18 → 18 of 31         | 18 → 18                                        | 6 of 6                                           |
| 360×640   | 16 → 16 of 31         | 16 → 16                                        | 6 of 6                                           |

Lost against the base: 0 stop.

### 14.9 Other checks on `2a6ed4c`

- `pnpm typecheck`, `lint`, `build`: exit 0. `pnpm test`: 378 passed.
- Behaviours 43 of 43; other pages 24 of 24; contrast: all texts at or
  over their minimum on 9 sizes (weakest .tree-intro-kicker at 4.62:1 on `w800`).
- Opening sweep: 0 fault on 18 sizes. Live resize both ways: largest camera
  move 0.351 m per step, 0 step with a figure cut.
- Motion, 75 s per viewport: Lapen travels 0.0 m on the ground at most per frame; Zanba's
  planted feet drift 0.008 m median and 0.019 m at most per stance.
- Performance, capped runs and the first uncapped round, base measured in the same session
  (`cycle3/final/ab-base`):

| Viewport       | Sequence     | Final capped FPS | p95     | > 33 ms | Base, same session | Final        | Final vs base |
| -------------- | ------------ | ---------------- | ------- | ------- | ------------------ | ------------ | ------------- |
| Desktop        | rest         | 59.9             | 16.7 ms | 0       | 735 / 2 ms         | 672 / 2.2 ms | -8.5 %        |
| Desktop        | climb        | 59.9             | 16.7 ms | 0       | 580 / 2.5 ms       | 485 / 3.4 ms | -16.4 %       |
| Desktop        | interactions | 59.9             | 16.7 ms | 0       | 578 / 2.5 ms       | 552 / 2.5 ms | -4.5 %        |
| Mobile (emul.) | rest         | 59.9             | 16.7 ms | 3       | 1068 / 1.3 ms      | 973 / 1.6 ms | -8.9 %        |
| Mobile (emul.) | climb        | 59.9             | 16.7 ms | 0       | 756 / 1.9 ms       | 722 / 2 ms   | -4.4 %        |
| Mobile (emul.) | interactions | 59.9             | 16.7 ms | 0       | 743 / 1.9 ms       | 729 / 2 ms   | -2.0 %        |

Worst uncapped change in that single round: -16.4 % (limit −10 %). Phone: still not measured
on a device.

- A frame cost found by this check and removed (`2a6ed4c`). The full run on `725a942`
  (`cycle3/interim-725a942`) read -14.0 to -34.1 % against the base uncapped, over the limit, where
  the run before the ears (`interim-240c4f5`) read within it. Cause: the search of 14.6 that
  keeps Zanba's ears out of his body, timed alone at 0.14 ms a frame (6000 poses in Node) against
  0.004 ms for Lapen's whole pose. It rebuilt its rotation for each probe point and searched the
  same lift twice for an ear at rest. `2a6ed4c` builds the rotation once per check and reuses
  the lift already found: 0.05 ms a frame, the same arithmetic on the same points, and the ears
  check of 14.6 was run again on it. The capped rate was 59.9 FPS with no frame over 33 ms before
  and after: the cost showed only uncapped.
- One round is not a measure at these rates: two runs of the same base build a few minutes apart
  gave 593 and 784 FPS (desktop, rest). So the comparison below is three rounds, final and base
  in turn, mean frame rate of each 20 s sequence (`evidence/c3-final-fps-rounds.json`,
  `cycle3/final/ab-rounds`):

| Viewport | Sequence     | Base, three rounds | Final, three rounds | Base mean | Final mean | Change  | On `725a942`, one round |
| -------- | ------------ | ------------------ | ------------------- | --------- | ---------- | ------- | ----------------------- |
| desktop  | rest         | 735 / 770 / 751    | 672 / 696 / 742     | 752       | 704        | -6.4 %  | -14.0 %                 |
| desktop  | climb        | 580 / 643 / 666    | 485 / 614 / 592     | 629       | 564        | -10.5 % | -14.7 %                 |
| desktop  | interactions | 578 / 595 / 703    | 552 / 516 / 630     | 625       | 566        | -9.5 %  | -18.2 %                 |
| mobile   | rest         | 1068 / 1103 / 1285 | 973 / 1069 / 1142   | 1152      | 1061       | -7.9 %  | -15.4 %                 |
| mobile   | climb        | 756 / 806 / 939    | 722 / 821 / 777     | 833       | 774        | -7.2 %  | -14.3 %                 |
| mobile   | interactions | 743 / 783 / 993    | 729 / 742 / 855     | 840       | 775        | -7.7 %  | -34.1 %                 |

Worst change of the means: -10.5 % (limit −10 %), on the desktop climb; the other five are
between -6.4 and -9.5 %. So the limit is met on five sequences and missed by half a point on
one, with rounds of the same build that differ by more than that. Cycle 2 read -5.9 % at worst
in one round. What is left of the difference is not attributed: the ear search still takes
0.05 ms a frame (about 3 to 5 % of an uncapped frame here), the rest was not measured. The lead,
if the margin matters: keep the ear's lift from one frame to the next while the head has not
turned.

### 14.10 Limits left after the cycle

- On short landscape screens the Konteur's legs pass behind the shelf around the first card (at
  1280×720, his feet at one stop), and
  critters can still pass behind the shelf (14.3). Only a shelf that gives way, or a lawn the
  critters keep to that no camera overlooks, would remove that; neither is in this cycle's scope.
- The fading intro text can cross a critter between t = 0.03 and 0.1.
- The limits of 12.4 stand (Zanba does not walk on portrait phones; the compact intro touches the
  crown at 667×375 and 1024×540; Zanba's rump).
- Not established by any of this: how the turn and the tilt feel at speed, on a real phone.
