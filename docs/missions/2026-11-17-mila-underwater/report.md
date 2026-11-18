# Report — 2026-11-17-mila-underwater

Verdict: PARTIAL
Version: 1638c4c26c2a433970522f672650a23447e3fe8b

`Version` is the product HEAD (`1638c4c`): the commits on top of it carry only the review files,
the QA script, the audit, the evidence and this report, nothing under `src/`. This is the state
after correction cycle 1, which answers review 1 (`review-1.md`, PASS_WITH_RESERVATIONS on
`9668453`). Nothing was pushed; no pull request exists. The owner's corrections O4 and O5, added to
`mission.md` on 2026-11-18, are not part of this cycle and are not started.

Why PARTIAL: the closing rule asks for AC0 to AC11 verified.

- AC11 (independent review on the final SHA) is NOT_REACHED: review 1 ran on `9668453`; the product
  changed since (`1638c4c`).
- AC12 (push, pull request, deploy preview) is NOT_REACHED: step S4, not authorized.
- O4 and O5 are NOT_REACHED.
- AC8 is verified on one laptop only; no real phone was tested (the rule allows AC8 to pass with
  that limit stated). The long frames with the frame limiter off are explained but not removed
  (see Performance).
- AC3, AC4 and O1 to O3 were judged by the executor on stills, frame sheets and per-frame
  measurements; the recordings at ×1 and ×0.25 exist but were not watched by a person.

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
| `1638c4c` | correction cycle 1: swimming ashore, Mila stands up before the shallows                                    |
| others    | QA script, mission log, review files, audit, evidence, this report (no product code)                       |

Product files changed against `d60c1a6` (`git diff --stat d60c1a6..1638c4c -- src`):

- `src/books/mila/world/underwater.ts` (new, 222 lines): the water's GLSL (`seaWater`, `seaFog`),
  `addSeaFog`, `seaLight` (Snell), `seaSway`, `createSeaDust`; MIT notice of the upstream.
- `src/books/mila/world/underwater.test.ts` (new, 82 lines).
- `src/books/mila/world/scene.ts` (+447 −79 lines of diff): the patch applied to every fogged material, sky dome
  on the same water, caustics along the light, shafts as billboards along the light, blade sway,
  tufts, merged corals, `thinSea(level)`, `data-quality`, reduced-motion pace, `warmUp()`,
  `warmUpShadows()`, `milaHeight()`, `swims()` and the depth read 3 m ahead of her, `TURTLE_SCALE`.
- `src/books/mila/world/scene.test.ts` (+42): four tests of `milaHeight`, one of `swims`.

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

| AC   | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | SHA                             |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC0  | VERIFIED    | the session states and runs on `claude-fable-5-2`. Independent of the executor, from pilotage: launch argv `claude --permission-mode auto --model fable` (pid 1014361); model fields counted in this session's transcript `731c4e6a` at 2026-11-18T10:51:37Z: 493 × `"model":"claude-fable-5-2"`, 2 × `"model":"sonnet"`, the latter being the requests that start and resume the declared Sonnet subagent (section 6)                                                                                                                                                                                                              | —                               |
| AC1  | VERIFIED    | `AUDIT.md` section 2 (commit, file:line citations, mapping, statuses); notice and origin comments in `src/books/mila/world/underwater.ts:1-30`, `:75`, `:139`, `:168` and in `addCaustics` in `scene.ts`                                                                                                                                                                                                                                                                                                                                                                                                                            | `f645de0`                       |
| AC2  | VERIFIED    | `boards-final/{desktop,tablet,mobile}-p07..p10*.png`; `evidence/contrast.md` (text areas, with and without the reading veil). Technical: far planes fade per channel into the water's colour; text ≥ 6.4 : 1 through the veil. Page 10 is lighter behind the text than at the base (section 5)                                                                                                                                                                                                                                                                                                                                      | `3d09931`                       |
| AC3  | VERIFIED    | `boards-final/`, `final/*-p0N-seq.mp4` and `-x025.mp4`, sheets `final/*-seq-sheet.png`. One light direction for shadows, caustics and shafts (`seaLight`); bloom untouched. Judged on stills and sheets, recordings not watched by a person                                                                                                                                                                                                                                                                                                                                                                                         | `3d09931`                       |
| AC4  | VERIFIED    | the same recordings. By reading the code, not by a test: `seaSway` in `src/books/mila/world/underwater.ts:148-155` returns its offset multiplied by `pow(h,1.6)`, so it is zero at the root (`h` = 0) for any time, seed or suppleness, and grows faster than the height; shared field, phase from the root's place, a delay up the blade, per-blade seed and suppleness. No automated test covers this formula (`underwater.test.ts` tests `seaLight` and `addSeaFog` only; the earlier citation was wrong). Motion over time was judged on frame sheets, the recordings were not watched by a person                              | `3d09931`                       |
| AC5  | VERIFIED    | `boards-final/` (pages 7 to 10 and the five transitions, desktop and mobile), `final/*-t*.mp4`; the treatment is a property of the sea, not of a page (`AUDIT.md` section 4)                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `3d09931`, `f645de0`            |
| O1   | VERIFIED    | `evidence/exit-probe.md`: in the running scene, every frame of 6 → 7, ankles, hips and head against the floor and the animated surface: 0 faulty frames on `f645de0` and on `1638c4c`; `evidence/corrections-c1.md` (entry frames unchanged between the two builds); `evidence/wade.md` (replay: 60 faulty frames → 0), `boards-o/`, `boards-c1/`, recordings ×1 and ×0.25; `AUDIT.md` section 7. Whether the entry now reads as natural is the owner's eye                                                                                                                                                                         | `1638c4c`                       |
| O2   | VERIFIED    | `TURTLE_SCALE = 0.6`: shell 1.38 m → 0.83 m against Mila's 1.25 m; path, heading and motion unchanged (`scene.test.ts`, "the turtle"); `boards-o/`. Whether the size pleases is the owner's eye                                                                                                                                                                                                                                                                                                                                                                                                                                     | `f645de0`                       |
| O3   | VERIFIED    | `evidence/exit-probe.md`: same probe on 10 → 11. At `f645de0` she came out lying forward: 28 frames with the hips above the surface, 13 of them with an ankle above it (the reviewer's doubt was founded; the replay in `wade.md` had shown 3). At `1638c4c`: 0 and 0; she is upright before her feet touch. The pose eases separately from the root's height, which is why the replay missed it (`AUDIT.md` section 7.3, note at the top of `wade.md`). `boards-c1/` (three builds, both layouts), recordings in `c1/`. Limits: about 0.5 s from touchdown to dry sand; for about 0.4 s only her hair shows. Owner's eye as for O1 | `1638c4c`                       |
| AC6  | VERIFIED    | `evidence/corrections-c1.md` (journey 24 steps per viewport, 0 failed; lengths of the five transitions within 9 ms of the base); `git diff d60c1a6..HEAD` on story, audio, tree, shell, shared and other books: empty (section 7). Paths and animation directions unchanged; Mila's height in the shallows (O1/O3) and the moment she stands up on the way out (cycle 1) are changed                                                                                                                                                                                                                                                | `1638c4c`                       |
| AC7  | VERIFIED    | `evidence/leak.md` (6 cycles: GL objects constant, 0 on the tree, contexts created = lost, heap slope not higher; not re-run after `3d09931`, the later commits create no GL object), `evidence/corrections-c1.md` (no console message but the favicon 404 of the base; earlier suites: same failures as the base)                                                                                                                                                                                                                                                                                                                  | `3d09931`, `1638c4c`            |
| AC8  | VERIFIED    | `evidence/perf.md`, `evidence/perf-nvidia-smi.txt`, `evidence/links.md`, `evidence/corrections.md`, `evidence/long-frames.md`. 60 fps held on the tested laptop, capped, both layouts. Real phone: **not tested**. Long frames with the limiter off: located, not removed (section 4). No capped run was taken on `1638c4c` (it changes when a pose flag flips, no shader or draw call)                                                                                                                                                                                                                                             | `3d09931`, `f645de0`, `1638c4c` |
| AC9  | VERIFIED    | `evidence/low-quality.md`, `boards-final/low-*.png` (level 0 under 8× CPU throttle); `evidence/reduced-motion.md`, `boards-final/reduced-*.png`. Frame rate at low quality was not re-measured under the headed protocol                                                                                                                                                                                                                                                                                                                                                                                                            | `3d09931`                       |
| AC10 | VERIFIED    | section 7: `pnpm build`, `pnpm typecheck`, `pnpm test` (53 files, 387 tests), `pnpm lint`, all exit 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | HEAD                            |
| AC11 | NOT_REACHED | review 1 (`review-1.md`) ran on `9668453`; a review of this state is still to come                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                               |
| AC12 | NOT_REACHED | step S4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —                               |
| O4   | NOT_REACHED | added to `mission.md` on 2026-11-18, not in correction cycle 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                               |
| O5   | NOT_REACHED | as O4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —                               |

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
- Long frames with the limiter off (review 1, point 3; `evidence/long-frames.md`, `AUDIT.md`
  section 10). Studied on page 9 under the same protocol, `d60c1a6` against `1638c4c`, 20 s runs:
  - confirmed: the new build has them in every run (3 to 23 frames over 33 ms, longest 71 to
    421 ms), the base in none (longest 6.9 ms);
  - located: a CPU profile shows the main thread held inside one native WebGL call for 36 to 62 ms
    (1045 of 1122 ms of the stalls of one run; 72 ms of JavaScript);
  - ruled out: garbage collection, long JavaScript of the scene, the frame rate alone (the base at
    648 fps in a small window had none);
  - they vanish with fewer pixels: the new build in a 960 × 600 window, 800 to 880 fps, no frame
    over 8.2 ms in three runs;
  - reading, not measured on the GPU side: the merged corals make the main thread faster than the
    GPU at 1440 × 900 with no limiter, so a WebGL call waits; at the base the main thread was the
    slower side. The per-pixel water colour may add to the GPU's share; not separated;
  - nothing was changed in the product. The capped runs, which are what a screen shows, do not
    have these stalls. A phone whose GPU is the slower side at its capped rate was not tested.
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
  while still out of her depth and walks out upright (`boards-c1/`). At `f645de0` she still came
  out lying forward for about half a second, hips and sometimes an ankle above the water; the
  probe counts none at `1638c4c`. The turtle is clearly smaller than her.
- Less sure, entry and exit: for about 0.4 s only her hair is above the surface, a small dark
  shape that on a still could be taken for a rock; the walk out is short.
- Less sure: page 10 is lighter behind the text than at the base; the dust is sparse to the point
  of being easy to miss; on a phone-sized view of page 9 few fish are in frame.

## 6. Model and delegations

Main session: `claude-fable-5-2` (Fable 5.2) throughout. Art direction, shaders, motion and all
product code, the diagnosis of O1 to O3, the rendered probe of the exit and its fix (cycle 1), the
audit and this report were done in the main session.

| Delegated task                                                                                                                                                               | Subagent model |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Writing and extending `qa/mila-underwater.mjs` (modes shots, motion, perf, leak, journey, trans, low, text, links, determinism; headed switch) and its row in `qa/README.md` | Sonnet         |
| Baseline captures and measurements at `d60c1a6`                                                                                                                              | Sonnet         |
| Measurements at `f92d8e2` (superseded) and the final headed round `d60c1a6` vs `3d09931`; the short round on `f645de0`                                                       | Sonnet         |
| Cycle 1: the functional round on `1638c4c` (`evidence/corrections-c1.*`, `boards-c1/`); the long-frame study and its `longframes` mode (`evidence/long-frames*`)             | Sonnet         |
| Regression suites, log parsing, contrast statistics, boards (ImageMagick), `evidence/*.md` and `*.json` (all but `wade.md` and `exit-probe.*`), `manifest.tsv`               | Sonnet         |

One subagent (general-purpose, model `sonnet`) carried all of it, resumed for each round. Its
figures were read and its boards looked at in the main session before use.

## 7. Commands

Run at the final HEAD of the branch:

```text
pnpm build      exit 0
pnpm typecheck  exit 0
pnpm test       exit 0   53 files, 387 tests passed
pnpm lint       exit 0
git diff --stat d60c1a6..HEAD -- 'src/books/*/story' src/tree src/app src/shared \
  src/books/ti-kannot src/books/zanba src/books/konpe-lapen src/books/mila/world/audio.ts public
                (empty)
```

## 8. Limits

- No real phone, no second machine.
- Recordings were produced, not watched by a person; motion was judged on frame sheets.
- Long frames with the frame limiter off: a WebGL call waiting on the GPU, not removed; the GPU
  process side was not traced.
- For about 0.4 s on the way in and on the way out only Mila's hair shows above the water.
- `review-1.md` is committed with its tables re-padded by prettier (the pre-commit hook requires
  it); its text is otherwise the reviewer's.
- Stills are not reproducible to the pixel on either build (fish positions).
- Page-number label of page 9 on tablet: 4.57 → 4.11 : 1 at the worst pixel.
- The wade out of the sea is short (about 0.5 s) because the beach is steep.
- Materials created while the tale runs other than the crab's bursts would not get the sea's
  colours; there are none today.
- Scratch folders are listed in `AUDIT.md` section 11; nothing was deleted.

## 9. Next

Pilotage: review of this state (`1638c4c`), then O4 (no living form through a solid one) and O5
(the shell creature of pages 8 to 10), which are in `mission.md` and not started. S4 (push, pull
request, deploy preview) only when authorized. Decisions that are the owner's: whether page 10's
lighter water, the entry and exit as they now read, and the turtle's size are what he wants.
