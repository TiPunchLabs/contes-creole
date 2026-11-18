# Audit — Mila under water (S1, S2)

Baseline of Mila's underwater pages at `d60c1a6`, study of Abyssal Garden, the checkpoint on page
7, then the treatment of every underwater page. Written by the executor (model
`claude-fable-5-2`).

- Branch `feat/mila-underwater`, base `d60c1a6`.
- Media: `~/.local/share/contes-creole-qa/mila-underwater/` (outside the repo), listed with sha256
  and capture conditions in `evidence/`. Paths below are relative to that folder unless they
  start with `evidence/`, `src/` or `qa/`.
- Upstream clone, read only, never installed or run:
  `~/.local/share/contes-creole-qa/mila-underwater/upstream/abyssal-garden`.

## 1. Baseline: what the code does at `d60c1a6`

All of it is in `src/books/mila/world/scene.ts` (4618 lines at the base) unless stated.

| Part              | State at the base                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine            | Three.js `^0.186.1` (r186), one `WebGLRenderer` (`antialias: false`, WebGL 2 required), ACES tone mapping, exposure 1.08, PCF shadow map 2048² on the moon light (off on phones)                                                                                                                                                         |
| Post              | `EffectComposer` on a half-float target (MSAA ×4 on desktop): `RenderPass` → NaN guard → `UnrealBloomPass(0.45, 0.55, 0.88)` → "gouache" pass (3×3 Kuwahara, paper, grain, vignette, page-turn wash; under water its UV wobble grows) → `OutputPass`                                                                                     |
| Loop              | `renderer.setAnimationLoop(update)`; one `THREE.Timer`; `dt` clamped to 50 ms; the pause button eases `motion` to 0                                                                                                                                                                                                                      |
| Cleanup           | `release()`: stops the loop, removes listeners, disposes skeletons, shadow map, `disposeObject(scene)` (geometries, materials, textures, instance buffers), the passes, the composer, the renderer, then `forceContextLoss()`                                                                                                            |
| Pages under water | 7 (the garden, sea floor about −7.6 m, Mila at −5.5 m), 8 (the school, Mila at −8.5 m), 9 (the pearl, the deep hollow, Mila at −14 m), 10 (the rise, Mila at −2.5 m). Transitions: 6→7 (dive, 7.6 s), 7→8, 8→9 (5.4 s each), 9→10 (5.8 s), 10→11 (surfacing, 7.6 s), and the same backwards                                              |
| "Under"           | `under = smoothstep(0.12, −0.25, camera.y)`: it follows the camera, not the page. The camera never rests within 0.22 m of the surface                                                                                                                                                                                                    |
| Water colour      | `FogExp2`, one colour (`#0d4f57`) and one density (0.06) for the whole sea; the sky dome turns to the same flat colour. No change with depth, direction or distance other than the fade to that colour                                                                                                                                   |
| Light             | hemisphere light eased to sea colours, moon directional light 1.2 (still from the low moon of the sky, 23° above the horizon), fill 0.2                                                                                                                                                                                                  |
| Caustics          | `addCaustics()`, an `onBeforeCompile` patch on two materials only: the terrain and the rocks. A four-iteration interference pattern on world `xz`, on every face whatever its direction, the same strength at every distance, greenish, speed `uTime × 0.55`                                                                             |
| Light shafts      | nine additive quads 16 m tall, each turned at random about the vertical and tilted 0.25 rad, pulsing between 0 and full strength                                                                                                                                                                                                         |
| Sea grass         | one `InstancedMesh` of 4200 blades (2200 on phones) spread evenly on a disc of 11 m round the meadow. Vertex sway: every vertex of a blade moves in phase (`y²` profile), the same 0.58 m at the tip for a 0.1 m blade and a 2.2 m one; phase from the root's place; no per-blade variation. The blades part round Mila's hand on page 7 |
| Coral             | 16 branching corals round the deep hollow, each limb its own mesh, still                                                                                                                                                                                                                                                                 |
| Particles         | 500 additive points 0.12 m wide in a fixed box of 30 × 13.5 × 42 m, the whole cloud turning at 0.005 rad/s                                                                                                                                                                                                                               |
| Life              | the turtle on its lap (page 7), 100 reef fish (35 % shown before page 7), the school of 140 (page 8), the pearl and the live conch (page 9)                                                                                                                                                                                              |
| Adaptive quality  | over the first 90 frames after the cover, then every 90 until settled: mean frame > 26 ms drops the Kuwahara pass (level 1); > 40 ms sets pixel ratio 1 and turns shadows off (level 0). Phones start without Kuwahara, shadows or MSAA, pixel ratio ≤ 1.4                                                                               |
| Reduced motion    | read once in `index.ts:132`: page turns are cuts, no pointer parallax, no camera breathing, no close-up on page 9. The world's own motion (sway, caustics, fish) runs at full pace                                                                                                                                                       |
| References        | `docs/redesign/decisions.md`, `docs/redesign/status.md` (Mila decisions D-MILA-\*), the owner's prototype the scene is a port of. No design board covers the underwater pages                                                                                                                                                            |

## 2. Abyssal Garden, read at `a596354`

Repository `https://github.com/Noniv/abyssal-garden`, commit
`a596354eff400d458bc2aeb9bdf5e0a9734b2bcf` (2026-11-14), MIT, © 2026 Maksymilian Dendura. Files
read: `source/src/shaders.js` (782 lines), `source/src/quality.js` (14), the layout and generation
comments and calls of `source/src/world.js` (557), the quality, resolution and frame parts of
`source/src/main.js` (643).

It is a raw **WebGPU** renderer written in WGSL, with compute shaders, a baked shadow map and a 3D
visibility texture. None of it runs in Three.js r186 WebGL as it is: what transfers is the reasoning
and a few short formulas.

### 2.1 What the source does (facts, with lines)

- Water colour (`shaders.js:194-217`, `266-269`): `fog()` multiplies the surface colour by a
  per-channel extinction `exp(−SIG·d)` with `SIG = (.058, .0235, .0195)` (red dies first), and adds
  `fogIn()`, the light scattered in along the ray, integrated in closed form. That in-scatter
  depends on the camera's depth (`exp(k·ro.y)`), on the ray's slope (`a = sg − k·rd.y`, brighter
  looking up) and on the angle to the sun (`1.22 + .3·mu⁴`). The far background is the same
  function at 240 m (`617-620`), so geometry and background meet without an edge.
- Sun under water (`257`): `sunE()` dims the direct light per channel with depth along the light's
  path.
- Caustics (`161-175`, `243-256`, `372`): one animated 512² texture (five-iteration interference
  pattern, the family Mila's `caust()` already belongs to), sampled at `cuv(p) = p.xz −
sun.xz·(p.y / sun.y)`, that is along the light; three taps offset for a chromatic fringe; a
  second, larger sample modulates it; eased to a constant 0.33 between 35 and 100 m; applied to
  the direct light only, weighted by `smoothstep(.1, .45, dot(n, L))`.
- Plants (`389-393`, `401-446`): `sway(p, h, t)` is one field for the world, amplitude
  `0.024·h^1.25`, phase from the root's place plus a term in `h`; two frequencies. Each leaf adds
  its own bend (`k`, with a per-leaf rate and phase from two seeds), a ripple climbing the blade
  (`wph`), a twist, and a per-type suppleness (`wav`, `fls`).
- Particles (`662-682`): 9000 motes whose seeds are wrapped in a 44 m cube centred on the camera
  (`fract((p − cam) / B + .5)`), a slow common drift plus a per-mote wobble, a minimum on-screen
  size, fades near the lens and at the cube's edge, lit by the sun's shadow map. Bubbles are a
  separate alpha pass (`627-661`) rising from set points.
- Light shafts (`686-723`): a half-resolution full-screen ray march (34 steps, 12 on Low) through
  the shadow map, patterned by the caustic texture, then a depth-aware blur and upsample.
- Surface from below (`591-608`): Snell's window, the sky inside a cone and the water's own colour
  reflected outside it.
- Composition (`world.js:5-31`, `177-213`, `259-272`): rock masses, arches and clearings placed by
  hand round six viewpoints; kelp columns "framing the viewpoints"; ground leaves grown in clusters
  of 8 to 28, not one by one; sponge and coral "gardens" given as centre, radius and count.
- Quality (`quality.js:4-14`, `main.js:331-334`, `535-550`): three levels chosen before the build;
  Medium and Low keep every 2nd or 4th leaf and make them wider (`world.js:92-94`); Low drops MSAA
  and shaft steps; a running controller lowers the pixel count, then the draw distance, to hold
  60 fps.

### 2.2 Reading (the executor's interpretation)

The scene reads as deep because three things agree: colour is lost to distance per channel, the
water itself has a brightness that depends on where one looks and how deep one is, and everything
that moves or shines (plants, dust, caustics, shafts) obeys one light direction and one current.
None of that needs the heavy parts (ray march, 3D volume, compute). Mila's sea at the base has each
ingredient but they do not agree: one flat fog colour, caustics on every face, shafts turned at
random, a sway with no delay up the blade.

### 2.3 Mapping

| Topic           | Upstream idea                                                    | Benefit for Mila                                                                                                      | Simplest approach in this code                                                                                                                                                                                                                                        | Status   |
| --------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Depth, colour   | per-channel extinction + in-scatter by direction and depth       | far things lose red, then contrast, and melt into turquoise; the water is lighter above, deeper below and deeper down | `addSeaFog()`: one `onBeforeCompile` wrapper on every fogged material replaces the fog chunk by `seaFog()` while the camera is under water; the sky dome draws the same `seaWater()`. No pass, no target. A short clear zone near the camera keeps Mila's own colours | adapted  |
| Depth, colour   | closed-form ray integral, 3D visibility volume                   | —                                                                                                                     | needs a volume texture and the camera inside a large world                                                                                                                                                                                                            | rejected |
| Filtered light  | caustics cast along the light, on lit faces, eased with distance | the net of light lies where light falls, stops crawling on far sand, agrees with the shafts                           | three lines in the existing `addCaustics()` patch, plus a slow sine patch so it is uneven like light through swell                                                                                                                                                    | adapted  |
| Filtered light  | caustic texture rendered once per frame, chromatic taps          | —                                                                                                                     | a render target and a pass for two materials; the existing procedural pattern costs less here                                                                                                                                                                         | rejected |
| Filtered light  | light refracted and dimmed with depth                            | one light direction under water for shadows, caustics and shafts                                                      | `seaLight()` (Snell) feeds the moon light, the caustics and the shafts                                                                                                                                                                                                | adapted  |
| Filtered light  | ray-marched shafts                                               | —                                                                                                                     | a full-screen half-resolution pass with 12 to 34 shadow lookups per pixel: the brief excludes it without a measured gain                                                                                                                                              | rejected |
| Filtered light  | (none: Mila's quads)                                             | shafts that lean one way from every page, no pulsing                                                                  | the nine existing quads become axial billboards along `seaLight`, soft-edged, faded near the lens and with distance                                                                                                                                                   | own      |
| Plants          | one current field, amplitude ∝ h^1.25, delay up the blade        | rooted, supple blades; neighbours move together; a wave travels up each blade                                         | `seaSway()` in the existing instanced blade shader; seed, suppleness and delay derived from the root's place and the blade's height, so no new attribute                                                                                                              | adapted  |
| Plants          | per-leaf twist, ruffle, iridescence, glints                      | —                                                                                                                     | detail for metre-long kelp seen close; Mila's blades are 7 cm wide in a gouache frame                                                                                                                                                                                 | rejected |
| Composition     | ground leaves in clusters, clearings round viewpoints            | the meadow reads as tufts and sand, not a lawn                                                                        | blade height scaled by a patch noise at build time; the RNG sequence, and so every later placement, is untouched                                                                                                                                                      | adapted  |
| Composition     | giant kelp columns framing views                                 | —                                                                                                                     | the brief excludes a kelp forest; not Caribbean                                                                                                                                                                                                                       | rejected |
| Particles       | camera-wrapped cube, drift + wobble, near and far fades          | the same sparse grain on every page with a quarter fewer points, none in front of the lens                            | `createSeaDust()`: one `Points` with a small `ShaderMaterial` replaces the 500 fixed points                                                                                                                                                                           | adapted  |
| Particles       | bubble streams                                                   | —                                                                                                                     | the brief excludes constant bubble streams                                                                                                                                                                                                                            | rejected |
| Quality scaling | keep every 2nd leaf and widen it; fewer shaft steps              | low quality keeps the look for less                                                                                   | `thinSea(level)` hooked to the existing adaptive levels: half the dust below the top level; at the lowest, half the blades at 1.6× width and every other shaft                                                                                                        | adapted  |
| Quality scaling | dynamic resolution controller, stored level                      | —                                                                                                                     | the scene already has its own controller; a second one is out of scope                                                                                                                                                                                                | rejected |
| Surface         | Snell's window                                                   | page 10's "window open on the moon"                                                                                   | see section 3                                                                                                                                                                                                                                                         | rejected |

Code taken from upstream: none verbatim. Four fragments are rewritten from WGSL to GLSL and
simplified, each with an "Adapted from" comment naming the upstream lines: `seaFog`/`seaWater`,
`seaSway`, the dust vertex shader (all in `src/books/mila/world/underwater.ts`, whose header carries
the MIT notice and the commit) and the three caustic lines in `scene.ts` (`addCaustics`), which point
to that notice.

## 3. Checkpoint: page 7, the garden

Page 7 was taken as the representative page: it has the meadow, the turtle, fish, rocks in the
distance, sand, and Mila close to the camera with the text on the left. The checkpoint is
internal (no owner approval asked). The loop was hypothesis → change → capture → compare; the
looks during the loop were taken with a scratch script on a fake clock (`peek/`, not a
deliverable), the formal before/after with `qa/mila-underwater.mjs` (section 9).

| Step | Hypothesis                                                             | Change                                                                                                     | Seen                                                                                                                             | Verdict                                          |
| ---- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| v1   | water colour by distance, direction and depth gives the page its depth | `addSeaFog` on every fogged material, sky dome on `seaWater`                                               | far blades and the rocks at the top melt into turquoise; Mila keeps her colours                                                  | kept                                             |
| v1   | a meadow in patches reads more natural than a lawn                     | blade height scaled by a patch noise (0.3 to 1.15)                                                         | the tall blades that frame Mila fell in a clearing: the page lost its foreground and its "long leaf" (`peek/v1/desktop-p07.png`) | **reverted**: the page's composition comes first |
| v2   | caustics along the light, on lit faces, eased with distance            | three lines in `addCaustics`                                                                               | coherent with the light, but nearly invisible: the floor went flat                                                               | retuned in v3                                    |
| v3   | the floor should carry the depth: redder in the shallows, bluer deeper | caustics 0.5 → 0.72, fade 9–26 m, patch 0.72 ± 0.28; floor tint `exp(k·y)` per channel instead of one tint | page 10 (−3 m) is light turquoise, page 9 (−15 m) deep blue-green; the caustics read again without covering the far sand         | kept                                             |
| v3   | a smaller sway is calmer                                               | tip offset about 0.3 × height                                                                              | blades stood like sticks; the baseline's leaning blades were livelier                                                            | **reverted**: amplitude raised in v4/v5          |
| v5   | lean down-current plus a wave up the blade reads as a current          | steady lean 0.42, oscillation 0.4, both × height × suppleness                                              | blades bow one way and ripple; short blades no longer swing as far as tall ones                                                  | kept                                             |
| v5   | short tufts of the same blade edge the meadow and dress the bare sand  | 1 000 to 1 700 short blades in clumps of 9 to 18 (meadow rim, the school, the rise, the deep rim)          | good on pages 7, 8, 10; in the deep hollow they were lime-green chips in the dark, and too broad everywhere                      | kept, **deep rim removed**, blades narrowed (v6) |
| v5   | corals that give a little make page 9 alive                            | limbs merged per colour (240 meshes → 3), `seaSway` at 0.17 suppleness                                     | a slight give at the tips; 237 fewer draw calls in the scene                                                                     | kept                                             |
| v6   | the dust must be seen to be felt                                       | size and strength up by about a half                                                                       | a few motes per frame, none near the lens                                                                                        | kept                                             |

Not kept, by decision before any code:

- Snell's window on the underside of the sea: the cameras of pages 7 to 10 all look down at Mila
  from above her; the surface is in frame for a few frames of the 6→7 and 10→11 crossings only.
  No visible benefit for its cost in the ocean shader.
- Caustics on the sea grass, on Mila or on the animals: the brief keeps them off faces, and on
  7 cm blades they would only flicker.
- New animals or bubbles: excluded by the brief.

## 4. The treatment on every underwater page

Nothing in the treatment is tied to a page: the water, the light, the current, the dust and the
shafts are properties of the sea, so pages 7 to 10 and the five transitions share them. What
differs per page comes from where the page is:

| Page | Depth of Mila | What the water does there                                                                                                        |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 7    | −5.5 m        | clear turquoise; the meadow leans in the current, tufts at its rim, rocks fading at the back                                     |
| 8    | −8.5 m        | a step darker and cooler ("l'eau devenait froide et sombre"); the meadow's far side under the school, tufts on the sand          |
| 9    | −14 m         | the darkest and bluest page: the floor has lost its red, the corals give in the current, the pearl and the conch carry the light |
| 10   | −2.5 m        | the lightest page: pale sand, warm caustics, tufts in the shallows                                                               |

Transitions: the shafts are seen during the swims (9→10 most of all), slanting one way; the
crossing of the surface blends the sea's colours with the night's by the camera's `under`, as the
fog did before.

## 5. Decisions taken by the executor

- One new file, `src/books/mila/world/underwater.ts`, holds the water's GLSL, the fog patch and the
  dust, with the MIT notice; `scene.ts` keeps the scene. No framework: three exported strings, two
  functions, one helper.
- The patch is applied by one traverse at the end of the build, so a material added later to the
  scene's build gets it without a line. The one material created while the tale runs (the
  crab's debris bursts) gets it where it is made, since `3d09931`.
- The moon light turns to the refracted direction under water (shadows, caustics and shafts
  agree). Above water nothing changes.
- The prototype's 1500 random draws of the old plankton are still drawn, so every placement after
  it (signs, threads, ground marks) is where it was.
- Reduced motion: the decor's clock runs at 0.3× and the oscillation at 0.3×; the steady lean
  stays, so the meadow is still a meadow in a current. The fish, the turtle and Mila are unchanged.
- Adaptive quality: `thinSea(level)`; the level is also written on the canvas as `data-quality`
  (read by the QA script, no other use).
- A read-only attribute rather than a debug global was chosen to expose the level.

## 6. What the first measurement found, and what was changed

The treatment committed at `f92d8e2` was measured against the baseline with `qa/mila-underwater.mjs`.
Three findings led to the second product commit, `3d09931`.

| Finding at `f92d8e2` (measured)                                                                                                                                                   | Cause (established how)                                                                                                                                                                                                                                                                                                                                                                                           | Change in `3d09931`                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page 10: the water behind the tale's text two to three times lighter, worst-case contrast of the body text against the bare scene 4.4 → 2.9 (desktop, tablet), 7.2 → 2.9 (mobile) | The camera of page 10 is near the surface and looks at deep water: the in-scatter took the camera's depth, so the whole view was lit like the shallows                                                                                                                                                                                                                                                            | In `seaWater`: in-scatter colours about a fifth darker, the dark of downward rays reached sooner (`smoothstep(.1,-.55)`), and the depth taken along the ray (`cameraPosition.y + .8 * v.y`) instead of at the camera                          |
| Uncapped desktop: one 53 to 69 ms frame in the dive and in a turn between underwater pages, in most runs (baseline: 36 to 46 ms in the dive only)                                 | A `linkProgram` hook showed each long frame carries a shader program built on the fly. Baseline: 9 programs built after page 1 (7 on the turn 3 → 4, 2 shadow-pass variants at the dive). `f92d8e2`: 11 (the bursts no longer shared the old plankton's program; one shadow variant moved to the turn 8 → 9). `renderer.compile` at start did not help, since the programs depend on the composer's render target | `warmUp()`: one frame with everything shown and unculled through the tale's own passes; `warmUpShadows()`: each kind of caster drawn after a caster of another kind; a hidden grain keeps the bursts' program. Programs built after page 1: 0 |
| Two fake-clock stills of page 7 were no longer byte-identical (fish positions)                                                                                                    | Not established. The fish integrate a clamped frame time (`f.a += dt * f.s`), so their place depends on the frame pacing at load, on both builds                                                                                                                                                                                                                                                                  | None in the product; the check was repeated three times per build (section 9)                                                                                                                                                                 |

A fault of my own on the way, caught by looking at the captures before measuring: the first warm-up
frame made Three.js measure the extent of the instanced fish before their first placement, so
both shoals were culled for the whole tale. `warmUp()` now clears the extents it caused to be
measured. The final stills were checked for the fish on pages 7, 8 and 9 (section 9).

## 7. Owner corrections O1 to O3 (`f645de0`)

Added to the mission on 2026-11-18 (log of `mission.md`): the entry into the water (6 → 7) where
"at one moment she seems to walk on the water", the turtle of page 7 "too big", the exit (10 → 11)
"not natural". All three faults are in the base `d60c1a6`; the treatment had not touched them.

### 7.1 Diagnosis of the entry and the exit

Mila's group origin is at her feet; her pose turns about a point 0.62 m above it; her chest is at
0.84 m and the middle of her head at 1.12 m. At the base, each frame of a transition put her on her
path (a curve through hand-set points) and then applied this rule: on a floor shallower than
−0.62 m she stands on it; between −0.62 and −0.95 m her height eases from the floor up to
`max(path, floor + 0.35)`; deeper, she is at that height. She was drawn swimming only below
−0.25 m.

The path's points near the shore are at the surface (−0.15 m going in, −0.5 m and +0.02 m coming
out) while the beach falls at about 37°. Replayed frame by frame (`evidence/wade.md`, the scene's
own formulas at 60 steps a second):

| Transition | What happened at the base                                                                                                                                                                                         | Faulty frames (of 457) |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 6 → 7      | she wades down to −0.60 m (2.2 s), then as the floor drops away her feet rise back to −0.10 m: from 2.6 to 3.4 s she is upright, or half stretched out, at the surface over 0.9 to 1.6 m of water, then she sinks | 60 (1.0 s)             |
| 10 → 11    | from 3.0 to 3.6 s she swims with her body up to 0.46 m above the sea; at 3.8 s she is upright at the surface over 1.0 m of water; at 4.0 s she drops 0.54 m onto the floor (0.10 m in one frame at the worst)     | 66 (1.1 s)             |

The captures agree (`final/desktop-t06-07/013.png` to `016.png`: both legs seen above the water;
`final/desktop-t10-11/016.png` to `018.png`: she swims on top of the sea).

### 7.2 Change

`milaHeight(pathY, floor)` and `STAND_DEPTH = −0.85` (`scene.ts`, exported and unit-tested):

- on a floor down to −0.85 m (the water at her chest) her feet are on the floor, whatever the path;
- past it she swims, at `min(path, −0.85)`: stretched out she lies 0.62 m above that, just under
  the surface, the top of her head breaking it; her path can take her deeper, never out of the sea;
- the two meet at −0.85 m, so going in she only has to lean forward and coming out to put her feet
  down; the clearance from the bottom she keeps in deep water (0.35 m) fades in over the next
  0.6 m of depth;
- she is drawn swimming where the floor is below −0.85 m, and standing elsewhere.

Replayed with the same paths: no faulty frame on the entry, 3 on the exit (her pose is still
rising as her feet come out of waist-deep water); the largest change of height in one frame goes
from 0.103 m to 0.034 m on the exit and is unchanged on the entry (0.038 m, the slope of the beach).
The paths, their timing, the camera (it rides on the path's height, as before) and the resting
places of every page are unchanged: on the still pages and on the beach the rule returns what the
old one did.

Seen in the captures: going in, the water climbs from her ankles to her neck over 2.6 s, she
leans in, only her hair shows for about 0.8 s, she is under. Coming out, her hair travels at the
surface for about a second, she stands up in chest-deep water and walks out in three strides.

The round on the built `f645de0` (`boards-o/`, desktop and mobile layout, one frame every 0.2 s
from 2.0 to 4.6 s, base above, corrected build below) was read at the time as showing the same, no frame with her feet on
or above the water. For the exit that reading was wrong: at one frame every 0.2 s and at that size
the sheets did not show what the probe of section 7.3 measured. Two things a viewer may notice, left as they are: while she wades in, the part of
her under the water is seen pale through it (2.4 to 3.2 s); and for about 0.4 s (3.4 to 3.6 s
going in, 2.8 to 3.4 s coming out) only her hair is above the surface, a small dark shape that,
on a still, could be taken for a rock. The turtle of page 7 is in view on the first frame in both
layouts, smaller, partly behind the grass, clear of Mila (`boards-o/*-p07-turtle-frame000.png`).

Limit, stated (and see 7.3 for what the review found afterwards): the beach is steep, so the walk from chest-deep to dry sand is 1.3 m and takes
about 0.5 s at the pace the transition has there. Slowing it would mean re-timing the transition
or reshaping the shore; neither was done.

### 7.3 The exit again (correction cycle 1, `1638c4c`)

The review of `9668453` pointed at the 3 frames the replay still flagged on the exit, and at the
fact that the replay does not measure the rendered body. It was right, and the fault was larger
than the replay said.

Measured in the running scene (`evidence/exit-probe.md`: ankle bones, hip pivot and head, every
frame, against the floor under them and the moving surface above them). At `f645de0`, coming out:
she swims stretched out (body tilted 1.17 rad) until her feet's height meets the bottom at
−0.85 m; only then does the swim weight start down (3.6 a second), and her body's tilt follows it
with its own, slower ease (2.5 a second). She crosses the shore at the fastest point of the
transition (about 4 m/s; the bottom climbs 2 m a second under her), so 0.25 s later her hips are
above the surface while she still leans 1.0 rad forward, legs trailing: 28 frames (0.45 s) lying
with her hips out of the water, 13 of them with an ankle above the surface. The 3 frames of the
replay were the first of these. The entry has none: there the bottom falls away slowly and she
leans in while her feet are still on it.

Cause: the swim pose was decided by the depth under her alone, so on the way out she could not
start to stand before the bottom was already under her feet.

Change: she reads the depth ahead. `swims(floor, ahead)` (exported, unit-tested) is true only
where both the bottom under her and the shallowest bottom within `FOOTING_REACH = 3` m along her
way are out of her depth. Going in nothing changes (the water ahead is deeper). Coming out she
starts to right herself 3 m before the shallows, in 2.6 m of water, her feet's height still held
at −0.85 m: head out at 3.3 s, shoulders out and legs coming down through 3.4 to 3.9 s, body at
0.29 rad when her feet touch (3.92 s), 0.17 rad when her hips clear the surface. Same probe: 0
frames of A, B or C on either transition. Her height, her path, the camera and the timing are
untouched; only when her body turns changed.

Two dead ends on the way: a look-ahead in seconds flickered (her path's speed drops by a quarter
where two segments of the curve meet, which pulled the shallows out of reach again for 0.1 s); a
single probe point ahead is at the mercy of the bottom's relief. Hence metres, and the shallowest
of four points.

What stays true: she comes out fast. From her feet touching to dry sand takes 0.5 s, at a run.
Slowing that is a matter of the transition's timing or the beach's slope, both left alone.

### 7.4 The turtle

Its shell was 1.38 m long and 1.1 m wide, 2.2 m across the fore flippers: longer than Mila is tall
(1.25 m to the top of her head). `TURTLE_SCALE = 0.6`: a shell of 0.83 m, two thirds of her
height, the size of a grown green turtle (carapace about 0.8 to 1.1 m), 1.3 m across the flippers.
Its lap, heading, height above the meadow and swimming motion are unchanged
(`turtleCourse`, still covered by its test).

## 8. How it was measured

Script: `qa/mila-underwater.mjs` (Playwright, channel `chrome`; modes and switches in its header
and in `qa/README.md`). Builds compared: `baseline-dist` (`d60c1a6`), `final-dist` (`3d09931`),
`o-dist` (`f645de0`), each a `pnpm build` served by `vite preview` on a port of its own (4196 to
4198, never 5173).

- Stills and frame sequences: headless Chrome on a fake clock, so both builds are caught at the
  same instant of the tale. Viewports 1440 × 900, 1024 × 768, 390 × 844 at device scale 2 (a
  desktop browser in a phone's layout: a layout check, not a phone).
- Performance, since the owner's instruction of 2026-11-18: headed Chrome 157 only, the WebGL
  renderer read before each launch (`ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop
GPU/PCIe/SSE2, OpenGL ES 3.2)`) and an `nvidia-smi` sample kept (`evidence/perf-nvidia-smi.txt`),
  every process under `nice -n 19`, one browser at a time, each run bounded (3 s warm-up then
  20 s on page 7 and on page 9, the transitions in between; 131 to 161 s a run), baseline and
  after alternated, three runs each. Passes: 60 Hz capped desktop, capped mobile layout, uncapped
  desktop.
- The earlier performance rounds were headless. Their records name the same NVIDIA renderer
  string, but they do not meet the instruction (headed, bounded, niced) and ran for hours: they
  are **not valid for AC8 and are not used** anywhere below. Their folders are marked superseded
  in `evidence/manifest.tsv`.
- No real phone and no second machine were available: every figure is from one laptop (RTX 4060
  Laptop GPU, 16 logical cores, Linux, Wayland).

## 9. Results

`d60c1a6` against `3d09931` unless stated; the short round on `f645de0` is in
`evidence/corrections.md`.

| Check                                  | Result                                                                                                                                                                                                                                                                                                                                                                             | Evidence                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Frame rate, 60 Hz capped               | desktop and mobile layout, pages 7 and 9 and every transition: median 59.88 fps on both builds, p95 16.8 to 17.0 ms, p99 under 18.3 ms; a single 33 to 36 ms frame here and there on both                                                                                                                                                                                          | `evidence/perf.md`           |
| Frame rate, uncapped desktop           | mean fps page 7: 518 → 498 (−3.9 %); page 9: 410 → 498 (+21.6 %); transitions: 494 → 494. More frames over 33 ms on the final build (page 7: 15 → 32; page 9: 0 → 33; transitions: 22 → 67), see section 10                                                                                                                                                                        | `evidence/perf.md`           |
| Work per frame                         | draw calls page 7 / 9: desktop 291 / 582 → 296 / 308, mobile 155 / 182 → 163 / 159; triangles desktop 695 k / 760 k → 718 k / 816 k, mobile 367 k / 372 k → 380 k / 423 k; shader programs alive 101 → 66 (desktop), 95 → 56 (mobile)                                                                                                                                              | `evidence/perf.md`           |
| Start-up                               | the warm-up frame adds about 0.2 to 0.6 s to the cold loader on desktop (2147 → 2352 ms capped, 2086 → 2658 ms uncapped, medians of 3, noisy); nothing measurable on a warm reload or in the mobile layout                                                                                                                                                                         | `evidence/perf.md`           |
| Shader programs built after page 1     | 13 → 0 (baseline: 4 on page 1, 7 on page 3, 2 on page 6)                                                                                                                                                                                                                                                                                                                           | `evidence/links.md`          |
| Adaptive quality                       | level 2 (top) on every real-clock run of the final build; level 0 on pages 7 to 10 under an 8× CPU throttle, where the art direction holds (half the blades, wider; half the dust; every other shaft)                                                                                                                                                                              | `evidence/low-quality.md`    |
| Reduced motion                         | page turns are cuts on both builds; the decor moves less than at the base on pages 7 to 10 (pixel-difference measure); it is slowed, not frozen                                                                                                                                                                                                                                    | `evidence/reduced-motion.md` |
| Text against the picture               | with the reading veil (what a reader sees), every body text and heading of pages 7 to 10 stays above 6.4 : 1 on the final build. Lowest: page 10 desktop body text 9.0 → 6.4. Bare scene, worst pixel: page 10 desktop 4.4 → 3.2, mobile 7.2 → 3.6. Under 4.5 : 1 with the veil: the page-number label of page 9 only, desktop 3.61 → 3.63 and tablet 4.57 → 4.11 (see section 10) | `evidence/contrast.md`       |
| Journey                                | 24 steps per viewport (1 → 12, back to 6, forward to 10, resizes, language switch, return to the tree), 0 failed on both builds; the only console messages are the `/favicon.ico` 404s present on both                                                                                                                                                                             | `evidence/journey.md`        |
| Earlier suites                         | `mila.mjs` 143/150, `mila-nav.mjs` 87/110, `mila-lang.mjs` 48/60 on both builds, the same failures (favicon 404 counted by `no-errors`, one Ti Kannot swipe)                                                                                                                                                                                                                       | `evidence/regress.md`        |
| Transition lengths                     | unchanged within 10 ms                                                                                                                                                                                                                                                                                                                                                             | `evidence/transitions.md`    |
| Leaks, 6 open/close cycles             | GL objects constant in the tale and 0 back on the tree on both builds; contexts created = contexts lost; heap slope in the tale 0.62 → 0.41 MB a cycle, on the tree 0.264 → 0.261                                                                                                                                                                                                  | `evidence/leak.md`           |
| Fish and school after the warm-up      | present on pages 7, 8 and 9 in the final stills of the three viewports                                                                                                                                                                                                                                                                                                             | `final/`, `boards-final/`    |
| Same instant, same picture?            | no, on either build: of three page-7 stills, two are identical and the third differs (normalised mean error 0.0017 at the base, 0.0011 on the final build)                                                                                                                                                                                                                         | `evidence/determinism.md`    |
| Story, audio, tree, shell, other books | `git diff d60c1a6..HEAD` on `src/books/*/story`, `src/tree`, `src/app`, `src/shared`, the other books, `audio.ts` and `public`: empty                                                                                                                                                                                                                                              | section 7 of `report.md`     |

Round on `f645de0` against `d60c1a6` (`evidence/corrections.md`; one headed run per build, a
confirmation, not a new table):

- journey 24 steps per viewport, 0 failed, same console messages as the base; the three earlier
  suites give the same totals and the same failures as the base;
- transition lengths unchanged within 10 ms (6 → 7 desktop 7650 / 7644 → 7644 / 7631 ms; 10 → 11
  within 0.5 ms);
- shader programs built after page 1: 0; quality level 2 on pages 7 and 9 in the three passes;
  draw calls, triangles and programs as at `3d09931`;
- capped, desktop and mobile layout: median 59.88 fps on both builds, p95 16.8 to 17.0 ms. On the
  desktop the corrected build has one frame of 33 to 35 ms on page 9 and one in the transitions
  where the base's run had none, and one on page 7 where the base had two: single frames of this
  kind are on both builds in the three-run table, and one run cannot tell them from noise;
- uncapped desktop: mean fps page 7 513 → 501, page 9 413 → 501, transitions 498 → 495; frames
  over 33 ms 24 → 25, 0 → 32, 22 → 43, the longest 54 → 88, 7 → 71 and 71 → 141 ms. The same
  pattern as at `3d09931` (section 10).

Round on `1638c4c` against `f645de0` and `d60c1a6` (correction cycle 1, `evidence/corrections-c1.md`;
headless GPU Chrome for the functional checks, no frame-rate figure taken from it):

- journey 24 steps per viewport, 0 failed, same console messages as the base; the three earlier
  suites give the same totals and the same failures as the base;
- transition lengths within 9 ms of the base and 16 ms of `f645de0`;
- 6 → 7: the frames of `f645de0` and `1638c4c` from 2.0 to 4.6 s differ by 0.00 to 0.11 on a
  0 to 255 scale (mean absolute difference): the entry is unchanged;
- 10 → 11 (`boards-c1/`, three builds, desktop and mobile layout): at the base she lies on the
  surface with her legs behind her above the water; at `f645de0` only her hair shows until 3.4 s
  and her body appears at 3.8 s; at `1638c4c` her head and shoulders are out and upright at 3.6 s
  and she wades from 4.0 s. On both corrected builds only her hair shows from 2.8 to 3.2 s, and
  her dress is pale through the water while she wades;
- in the running scene, frame by frame (`evidence/exit-probe.md`): frames lying with the hips above
  the surface 28 → 0, with an ankle above it 13 → 0; entry 0 on both.

Boards (before / after, per page and per transition, also low quality and reduced motion):
`boards-final/` (66 files), for the corrections `boards-o/`, for cycle 1 `boards-c1/`.

## 10. Limits and open points

- **No phone was tested.** The mobile figures are a desktop GPU in a phone-sized window. The 30 fps
  target on a real phone is not verified.
- **Long frames in the uncapped run** (studied in correction cycle 1, `evidence/long-frames.md`;
  headed Chrome 157, the NVIDIA renderer read before each launch, page 9, 3 s warm-up then 20 s,
  `nice -n 19`, builds alternated). With the frame limiter off, page 9 has frames over 33 ms on
  `1638c4c` in every run (3 to 23 in 20 s, the longest 71 to 421 ms) and none at the base (longest
  6.9 ms). What was found:
  - during these frames the main thread is not running our code. In a CPU profile of two runs,
    34 stalls of 36 to 62 ms were placed in time: 1045 of 1122 ms of the first run's stalls are
    spent inside one native WebGL call (`uniformMatrix4fv` in 16 of 21, else `uniformMatrix3fv`,
    `uniform3f` or `drawElements`), called from three.js `renderBufferDirect`; 72 ms are
    JavaScript;
  - ruled out: garbage collection (no heap drop before any long frame, none in the profile); long
    JavaScript of the scene; the frame rate alone (the base in a smaller window ran at 648 fps
    with none; the new build slowed to the base's rate had none in 3 runs of 4);
  - they go away with fewer pixels: the same build in a 960 × 600 window ran at 800 to 880 fps
    with no frame over 8.2 ms in three runs;
  - the 60 Hz capped runs, which are what a screen shows, have none beyond the single 33 to 36 ms
    frames seen on both builds.
    My reading (not measured on the GPU process side, no Chrome trace was taken): with the corals
    merged the main thread sends a frame in 2.1 ms instead of 2.7 ms and now outruns the GPU at
    1440 × 900, so a WebGL call waits for the GPU to catch up; the waits come in steps of about
    16.7 ms. At the base the main thread was the slower of the two and never waited. The water's
    colour is also computed per pixel now, which may add to the GPU's share; that part was not
    separated. Nothing was changed in the product: the stall needs the limiter off and a GPU that is
    the slower side, and making the main thread slower again would be the only "fix". One run of the
    slowed build and one of the small-window base did show long frames, in a round where the browser
    reported many long tasks on every build but the base: part of the effect may be the machine.
- **Page 10 is lighter behind the text than at the base** (mean luminance of the picture there
  about 0.06 to 0.10 → 0.13 to 0.20). The text keeps 6.4 : 1 or more through the veil; the page is
  the shallow one and is meant to be the lightest, but this is a judgement for the owner.
- **Page-number label of page 9, tablet**: 4.57 → 4.11 : 1 (worst pixel, with the veil). The same
  label is at 3.6 on desktop on both builds. Not corrected.
- **Stills are not reproducible to the pixel**, at the base either: the fish integrate the frame
  time. Comparisons of pictures are by eye and by text-area statistics, not by hash.
- **The wade out of the sea is short** (section 7.2).
- **Start-up** costs a few tenths of a second more on a cold desktop load (the warm-up frame).
- The dive simulation (`evidence/wade.md`) replays the formulas outside the browser; the captures
  are the check that the scene does the same.

## 11. Scratch left in place (nothing was deleted)

Under `~/.local/share/contes-creole-qa/mila-underwater/`: `upstream/`, the builds `baseline-dist`,
`after-dist` (`f92d8e2`, superseded), `final-dist`, `o-dist`, `wip-dist`; captures and runs
`baseline*/`, `after*/` (superseded), `final*/`, `o/`, `o-regress/`, `o-perf/`, `perf-headed/`, `links/`, `boards/`
(superseded), `boards-final/`, `boards-o/`, `peek/` (working looks). Under `/tmp/claude-1000/`:
logs and the subagent's analysis scripts (`an/`, `diag/`, `fishcheck/`, `qa-test*`, `lowprobe*`).
In the repository, git-ignored: `qa/out/` (`peek.mjs`, `wip.sh`, `linkprobe.mjs`, `casters.mjs`,
`fishprobe.mjs`, `dive-sim.ts.txt`). Removal needs the owner's word.

Added in correction cycle 1, same media folder: the builds `probe-dist` (instrumented, never
shipped) and `c1-dist` (`1638c4c`); `probe/` (per-frame records and stills of four variants of the
exit), `c1/`, `c1-regress/`, `boards-c1/`, `c1-lf/`, `c1-lf-cal/`, `c1-lf2/` (long-frame runs). In
`qa/out/` (git-ignored): `probe.mjs`, `probe-table.py`, `probe.patch.txt` (the temporary
instrumentation, removed from `scene.ts` before the commit).
