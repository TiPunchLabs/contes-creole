# Report — 2026-11-17-mila-underwater

Verdict: PARTIAL
Version: f645de058f6ac4f451021b83ec0afa47d2ce49a7

`Version` is the product HEAD (`f645de0`): the commits on top of it carry only the QA script, the
mission log, the audit, the evidence and this report, nothing under `src/`. Steps S1 and S2 are
done. Nothing was pushed; no pull request exists.

Why PARTIAL: the closing rule asks for AC0 to AC11 verified.

- AC11 (independent review on the final SHA) is NOT_REACHED: it is step S3, after this report.
- AC12 (push, pull request, deploy preview) is NOT_REACHED: step S4, not authorized before the
  review.
- AC8 is verified on one laptop only; no real phone was tested (the rule allows AC8 to pass with
  that limit stated). One point of it is open: more long frames with the frame limiter off (see
  Performance).
- AC3, AC4 and O1 to O3 were judged by the executor on stills and frame sheets; the recordings at
  ×1 and ×0.25 exist but were not watched by a person.

Three things are kept apart below: technical compliance (the AC table), the visual improvement
the executor observed (its own reading of the captures), and Xavier's artistic acceptance, which
is not given and is his alone.

## 1. What was done

Commits on `feat/mila-underwater` (base `d60c1a6`):

| SHA       | What                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `e9546c7` | the mission file                                                                                           |
| `f92d8e2` | the treatment: water colour by distance, direction and depth; refracted light; shared current; dust; tufts |
| `3d09931` | every shader built before the tale; page 10 darker behind the text                                         |
| `f645de0` | owner corrections O1 to O3: wading in and out of the sea, the turtle's size                                |
| later     | QA script, mission log, audit, evidence, this report (no product code)                                     |

Product files changed against `d60c1a6` (`git diff --stat d60c1a6..f645de0 -- src`):

- `src/books/mila/world/underwater.ts` (new, 222 lines): the water's GLSL (`seaWater`, `seaFog`),
  `addSeaFog`, `seaLight` (Snell), `seaSway`, `createSeaDust`; MIT notice of the upstream.
- `src/books/mila/world/underwater.test.ts` (new, 82 lines).
- `src/books/mila/world/scene.ts` (+419 −79): the patch applied to every fogged material, sky dome
  on the same water, caustics along the light, shafts as billboards along the light, blade sway,
  tufts, merged corals, `thinSea(level)`, `data-quality`, reduced-motion pace, `warmUp()`,
  `warmUpShadows()`, `milaHeight()`, `TURTLE_SCALE`.
- `src/books/mila/world/scene.test.ts` (+33): four tests of `milaHeight`.

Choices and the hypotheses dropped on the way are in `AUDIT.md` sections 3 to 7.

## 2. Abyssal Garden: retained, adapted, rejected

Read at `a596354eff400d458bc2aeb9bdf5e0a9734b2bcf` (MIT, © 2026 Maksymilian Dendura), clone outside
the repository, read only, never installed or run. It is a WebGPU/WGSL renderer: nothing was taken
verbatim. The full mapping (idea → benefit → approach, with upstream lines) is `AUDIT.md` section 2.

- Adapted (rewritten in GLSL, simplified, each with an "Adapted from" comment and the MIT notice
  in `underwater.ts`): per-channel extinction with in-scatter by direction and depth; caustics cast
  along the light, on lit faces, eased with distance; one current field for every plant with a
  delay up the blade; the camera-wrapped mote volume; thinning by quality level.
- Own, in the same spirit: light refracted at the surface feeding shadows, caustics and shafts;
  the nine existing shaft quads turned along that light.
- Rejected: closed-form ray integral and 3D visibility volume; rendered caustic texture with
  chromatic taps; ray-marched shafts (a full-screen pass the brief excludes); per-leaf twist and
  iridescence; kelp columns; bubble streams; a second resolution controller; Snell's window (the
  cameras of pages 7 to 10 look down: no visible gain).

## 3. Acceptance criteria

Evidence paths are relative to this folder, or to the media folder
`~/.local/share/contes-creole-qa/mila-underwater/` when they start with a build or board name.
"SHA" is the build the check ran on.

| AC   | Status      | Evidence                                                                                                                                                                                                                                                                                                                                            | SHA                  |
| ---- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| AC0  | VERIFIED    | the session states and runs on `claude-fable-5-2` (launch `--model fable`); section 6                                                                                                                                                                                                                                                               | —                    |
| AC1  | VERIFIED    | `AUDIT.md` section 2 (commit, file:line citations, mapping, statuses); notice and origin comments in `src/books/mila/world/underwater.ts:1-30`, `:75`, `:139`, `:168` and in `addCaustics` in `scene.ts`                                                                                                                                            | `f645de0`            |
| AC2  | VERIFIED    | `boards-final/{desktop,tablet,mobile}-p07..p10*.png`; `evidence/contrast.md` (text areas, with and without the reading veil). Technical: far planes fade per channel into the water's colour; text ≥ 6.4 : 1 through the veil. Page 10 is lighter behind the text than at the base (section 5)                                                      | `3d09931`            |
| AC3  | VERIFIED    | `boards-final/`, `final/*-p0N-seq.mp4` and `-x025.mp4`, sheets `final/*-seq-sheet.png`. One light direction for shadows, caustics and shafts (`seaLight`); bloom untouched. Judged on stills and sheets, recordings not watched by a person                                                                                                         | `3d09931`            |
| AC4  | VERIFIED    | the same recordings; `seaSway` (shared field, phase from the root, amplitude ∝ h^1.6, delay up the blade, per-blade seed and suppleness); `underwater.test.ts` (the root does not move). Same reserve as AC3                                                                                                                                        | `3d09931`            |
| AC5  | VERIFIED    | `boards-final/` (pages 7 to 10 and the five transitions, desktop and mobile), `final/*-t*.mp4`; the treatment is a property of the sea, not of a page (`AUDIT.md` section 4)                                                                                                                                                                        | `3d09931`, `f645de0` |
| O1   | VERIFIED    | `evidence/wade.md` (frame by frame: 60 faulty frames → 0), `boards-o/`, recordings ×1 and ×0.25 listed in `evidence/corrections.md`; `AUDIT.md` section 7. Whether the entry now reads as natural is the owner's eye                                                                                                                                | `f645de0`            |
| O2   | VERIFIED    | `TURTLE_SCALE = 0.6`: shell 1.38 m → 0.83 m against Mila's 1.25 m; path, heading and motion unchanged (`scene.test.ts`, "the turtle"); `boards-o/`. Whether the size pleases is the owner's eye                                                                                                                                                     | `f645de0`            |
| O3   | VERIFIED    | `evidence/wade.md` (66 faulty frames → 3, largest step in height 0.103 m → 0.034 m), `boards-o/`, recordings. Limit: the wade from chest-deep to dry sand lasts about 0.5 s (steep beach). Owner's eye as for O1                                                                                                                                    | `f645de0`            |
| AC6  | VERIFIED    | `evidence/journey.md` and `evidence/corrections.md` (24 steps per viewport, 0 failed); `evidence/transitions.md` (lengths unchanged within 10 ms); `git diff d60c1a6..f645de0` on story, audio, tree, shell, shared and other books: empty (section 7). Paths and animation directions unchanged; Mila's height in the shallows is changed by O1/O3 | `f645de0`            |
| AC7  | VERIFIED    | `evidence/leak.md` (6 cycles: GL objects constant, 0 on the tree, contexts created = lost, heap slope not higher), `evidence/journey.md` (no console message but the favicon 404 of the base), `evidence/regress.md` (same failures as the base)                                                                                                    | `3d09931`, `f645de0` |
| AC8  | VERIFIED    | `evidence/perf.md`, `evidence/perf-nvidia-smi.txt`, `evidence/links.md`, one confirming run in `evidence/corrections.md`. 60 fps held on the tested laptop, capped, both layouts. Real phone: **not tested**. Open point: long frames with the limiter off (section 4)                                                                              | `3d09931`, `f645de0` |
| AC9  | VERIFIED    | `evidence/low-quality.md`, `boards-final/low-*.png` (level 0 under 8× CPU throttle); `evidence/reduced-motion.md`, `boards-final/reduced-*.png`. Frame rate at low quality was not re-measured under the headed protocol                                                                                                                            | `3d09931`            |
| AC10 | VERIFIED    | section 7: `pnpm build`, `pnpm typecheck`, `pnpm test` (53 files, 386 tests), `pnpm lint`, all exit 0                                                                                                                                                                                                                                               | HEAD                 |
| AC11 | NOT_REACHED | step S3                                                                                                                                                                                                                                                                                                                                             | —                    |
| AC12 | NOT_REACHED | step S4                                                                                                                                                                                                                                                                                                                                             | —                    |

## 4. Performance

Protocol (owner's instruction of 2026-11-18, `mission.md` log): headed Chrome 157, renderer
`ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)` read
before each launch, `nvidia-smi` sample kept, every process under `nice -n 19`, runs of 131 to
161 s (20 s measured per page after a 3 s warm-up), baseline and after alternated, three runs each.
`d60c1a6` against `3d09931`; medians of three.

| Pass, segment              | Base: mean fps, p95 ms, frames > 33 ms | After: mean fps, p95 ms, frames > 33 ms |
| -------------------------- | -------------------------------------- | --------------------------------------- |
| capped desktop, page 7     | 59.84, 16.8, 1                         | 59.89, 16.8, 2                          |
| capped desktop, page 9     | 59.70, 16.8, 1                         | 59.90, 16.8, 1                          |
| capped desktop, turns      | 59.86, 16.9, 1                         | 59.89, 17.0, 1                          |
| capped mobile layout, p. 7 | 59.80, 16.9, 1                         | 59.89, 16.9, 0                          |
| capped mobile layout, p. 9 | 59.85, 16.9, 0                         | 59.89, 16.9, 0                          |
| uncapped desktop, page 7   | 518, 2.2, 15                           | 498, 2.5, 32                            |
| uncapped desktop, page 9   | 410, 2.9, 0                            | 498, 2.3, 33                            |
| uncapped desktop, turns    | 494, 2.7, 22                           | 494, 2.7, 67                            |

- No segment loses more than 10 % of median or mean frame rate (worst: −3.9 % mean, page 7
  uncapped). Page 9 gains 21.6 % (draw calls 582 → 308 after the corals were merged).
- Shader programs built after page 1 is shown: 13 → 0 (`evidence/links.md`).
- Adaptive quality stays at the top level on every real-clock run.
- Cold start on desktop: about 0.2 to 0.6 s longer (the warm-up frame), noisy.
- Open point, not resolved: with the limiter off the final build has more frames over 33 ms, and
  page 9 has them where the base had none. They appear on every segment that runs near 500 fps, on
  both builds, in multiples of the display's frame; the capped runs show none. Cause not
  established (`AUDIT.md` section 10). By the mission's wording ("new p95 hitches") the p95 did
  not move; the reviewer may judge otherwise.
- Earlier headless performance rounds do not meet the instruction: **not valid for AC8, not
  used**. Their records name the same NVIDIA renderer string; the pilot's note describes them as
  software-rendered; either way they are set aside.
- The corrections commit `f645de0` changes no shader and no draw call (the turtle is only scaled).
  One run per build (`evidence/corrections.md`): capped, median 59.88 fps on both builds in both
  layouts, p95 16.8 to 17.0 ms; on the desktop one frame of 33 to 35 ms on page 9 and one in the
  transitions where the base's run had none (and one on page 7 where the base had two), which one
  run cannot tell from noise. Uncapped: mean fps page 7 513 → 501, page 9 413 → 501, transitions
  498 → 495; frames over 33 ms 24 → 25, 0 → 32, 22 → 43, the same open point as above.

## 5. Observed visual result (the executor's reading, not an acceptance)

- Depth: on pages 7 to 9 the far meadow, the rocks and the hollow now lose their warm colours and
  then their contrast into the water, instead of fading to one flat colour; Mila, the shell and
  the near blades keep their own colours.
- Each page has its own water: 7 clear turquoise, 8 a step cooler, 9 the darkest and bluest, 10
  the lightest.
- Light: the caustics lie on lit sand only and die out with distance; the shafts lean one way.
- Plants: the blades bow down-current and a wave climbs them; short tufts edge the meadow.
- Entry and exit (`boards-o/`, both layouts): Mila walks down the beach with the water rising to
  her neck, goes under and swims; coming back her hair travels at the surface, she stands up
  chest-deep and walks out. No frame has her feet on or above the water. The turtle is clearly
  smaller than her.
- Less sure, entry and exit: for about 0.4 s only her hair is above the surface, a small dark
  shape that on a still could be taken for a rock; the walk out is short.
- Less sure: page 10 is lighter behind the text than at the base; the dust is sparse to the point
  of being easy to miss; on a phone-sized view of page 9 few fish are in frame.

## 6. Model and delegations

Main session: `claude-fable-5-2` (Fable 5.2) throughout. Art direction, shaders, motion and all
product code, the diagnosis of O1 to O3, the audit and this report were done in the main session.

| Delegated task                                                                                                                                                               | Subagent model |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Writing and extending `qa/mila-underwater.mjs` (modes shots, motion, perf, leak, journey, trans, low, text, links, determinism; headed switch) and its row in `qa/README.md` | Sonnet         |
| Baseline captures and measurements at `d60c1a6`                                                                                                                              | Sonnet         |
| Measurements at `f92d8e2` (superseded) and the final headed round `d60c1a6` vs `3d09931`; the short round on `f645de0`                                                       | Sonnet         |
| Regression suites, log parsing, contrast statistics, boards (ImageMagick), `evidence/*.md` and `*.json` (all but `wade.md`), `manifest.tsv`                                  | Sonnet         |

One subagent (general-purpose, model `sonnet`) carried all of it, resumed for each round. Its
figures were read and its boards looked at in the main session before use.

## 7. Commands

Run at the final HEAD of the branch:

```text
pnpm build      exit 0
pnpm typecheck  exit 0
pnpm test       exit 0   53 files, 386 tests passed
pnpm lint       exit 0
git diff --stat d60c1a6..HEAD -- 'src/books/*/story' src/tree src/app src/shared \
  src/books/ti-kannot src/books/zanba src/books/konpe-lapen src/books/mila/world/audio.ts public
                (empty)
```

## 8. Limits

- No real phone, no second machine.
- Recordings were produced, not watched by a person; motion was judged on frame sheets.
- Long frames with the frame limiter off: more on the final build, cause not established.
- Stills are not reproducible to the pixel on either build (fish positions).
- Page-number label of page 9 on tablet: 4.57 → 4.11 : 1 at the worst pixel.
- The wade out of the sea is short (about 0.5 s) because the beach is steep.
- Materials created while the tale runs other than the crab's bursts would not get the sea's
  colours; there are none today.
- Scratch folders are listed in `AUDIT.md` section 11; nothing was deleted.

## 9. Next

S3: independent review of `f645de0` (code and running result, animation over time included). S4
(push, pull request, deploy preview) only after it. Decisions that are the owner's: whether page
10's lighter water, the entry and exit as they now read, and the turtle's size are what he wants.
