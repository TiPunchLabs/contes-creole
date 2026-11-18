# Report — 2026-11-17-mila-underwater

Verdict: PASS
Version: 7ea9a488ef328642533461d373a3b9813478375a

`Version` is the product HEAD (`7ea9a48`): it is the last commit that touches `src/`. The branch
HEAD that is delivered carries on top of it only QA scripts, the review files, the mission log,
the audit, the evidence and this report (a report cannot name the commit that contains it; the
pull request names the delivered HEAD). Review 3, the last (`review-3.md`,
PASS_WITH_RESERVATIONS, no blocker or major finding), ran on `6680878`, whose `src/` is identical
to `7ea9a48`.

Why PASS: AC0 to AC11 are verified, O1 to O4 are verified, and O5 is closed by the owner's
decision O5-PLACE of 2026-11-18 (`mission.md` log: « laisser la conque »), which accepts the
living conch as it is: defects fixed, place kept. AC12 (push, pull request, deploy preview) is the
delivery step that follows this commit and is recorded in the pull request.

Reservations kept from review 3:

- the JS heap grows by 0.2 to 0.4 MB per open/close cycle over five cycles (live GL objects are
  constant); this is a trend, its cause was not sought, and it does not prove the absence of a
  leak;
- frame rate on `7ea9a48` rests on a single headed capped run on one laptop; the phone layout
  read 57.47 fps against 59.88 earlier (−4 %); no real phone was tested;
- the fish solver settles in a bounded number of rounds: a crowd denser than those met on the
  tale's routes can stay overlapping for some frames;
- the clearance check works on stand-in shapes, at a 0.02 m tolerance, on the frames drawn; the
  gap between two stand-ins is a proven bound, the clearance over the ground is a sampled measure
  and is not covered by that proof (review 3, F5; section 3, O4);
- the living conch is readable for about two seconds on arriving at page 9 only (accepted);
- AC3, AC4 and O1 to O5 were judged by the executor on stills, frame sheets and per-frame
  measurements; the recordings were not watched by a person. The owner gave his artistic
  acceptance in advance (`mission.md` log).

Three things are kept apart below: technical compliance (the AC table), the visual improvement
the executor observed (its own reading of the captures), and Xavier's artistic acceptance, which
is his alone (the mission log of 2026-11-18 records that he gave it in advance).

## 1. What was done

Commits on `feat/mila-underwater` (base `d60c1a6`):

| SHA       | What                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| `e9546c7` | the mission file                                                                                                |
| `f92d8e2` | the treatment: water colour by distance, direction and depth; refracted light; shared current; dust; tufts      |
| `3d09931` | every shader built before the tale; page 10 darker behind the text                                              |
| `f645de0` | owner corrections O1 to O3: wading in and out of the sea, the turtle's size                                     |
| `1638c4c` | correction cycle 1: swimming ashore, Mila stands up before the shallows                                         |
| `5af99d0` | O5: the living conch seated on the sand, rebuilt in one piece, lighter, turned to show its lip                  |
| `a425401` | O4: fish go around Mila, the turtle, the rocks, the corals, the conch, the pearl and each other                 |
| `ad2d9db` | cycle 2 (review 2, F3): crowded fish settled in bounded rounds, the walls last; one list of close pairs a frame |
| `7ea9a48` | cycle 2: the crab's shell and the living conch's foot rest on the sand (found by the corrected clearance check) |
| others    | QA script, mission log, review files, audit, evidence, this report (no product code)                            |

Product files changed against `d60c1a6` (`git diff --stat d60c1a6..7ea9a48 -- src`):

- `src/books/mila/world/underwater.ts` (new, 222 lines): the water's GLSL (`seaWater`, `seaFog`),
  `addSeaFog`, `seaLight` (Snell), `seaSway`, `createSeaDust`; MIT notice of the upstream.
- `src/books/mila/world/underwater.test.ts` (new, 82 lines).
- `src/books/mila/world/scene.ts` (+447 −79 lines of diff): the patch applied to every fogged material, sky dome
  on the same water, caustics along the light, shafts as billboards along the light, blade sway,
  tufts, merged corals, `thinSea(level)`, `data-quality`, reduced-motion pace, `warmUp()`,
  `warmUpShadows()`, `milaHeight()`, `swims()` and the depth read 3 m ahead of her, `TURTLE_SCALE`.
- `src/books/mila/world/scene.test.ts` (+42): four tests of `milaHeight`, one of `swims`.
- `src/books/mila/world/shoal.ts` and `shoal.test.ts` (new, O4): the steering of the fish
  (`steer`, `overFloor`, `gapToSolid`, `gapToLimb`), with 12 tests. `scene.ts` gives it the solids
  of the sea, Mila as a moving capsule and the routes of the 240 fish, in the existing update.
- `scene.ts` (O5): the living conch rebuilt; (cycle 2) laid along the slope of the sand; the crab
  4 cm higher.

Choices and the hypotheses dropped on the way are in `AUDIT.md` sections 3 to 7 (O4: 7.5, O5: 7.6, cycle 2: 7.7).

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

| AC   | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | SHA                             |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC0  | VERIFIED    | the session states and runs on `claude-fable-5-2`. Independent of the executor, from pilotage: launch argv `claude --permission-mode auto --model fable` (pid 1014361); model fields counted in this session's transcript `731c4e6a` at 2026-11-18T10:51:37Z: 493 × `"model":"claude-fable-5-2"`, 2 × `"model":"sonnet"`, the latter being the requests that start and resume the declared Sonnet subagent (section 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —                               |
| AC1  | VERIFIED    | `AUDIT.md` section 2 (commit, file:line citations, mapping, statuses); notice and origin comments in `src/books/mila/world/underwater.ts:1-30`, `:75`, `:139`, `:168` and in `addCaustics` in `scene.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `f645de0`                       |
| AC2  | VERIFIED    | `boards-final/{desktop,tablet,mobile}-p07..p10*.png`; `evidence/contrast.md` (text areas, with and without the reading veil). Technical: far planes fade per channel into the water's colour; text ≥ 6.4 : 1 through the veil. Page 10 is lighter behind the text than at the base (section 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `3d09931`                       |
| AC3  | VERIFIED    | `boards-final/`, `final/*-p0N-seq.mp4` and `-x025.mp4`, sheets `final/*-seq-sheet.png`. One light direction for shadows, caustics and shafts (`seaLight`); bloom untouched. Judged on stills and sheets, recordings not watched by a person                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `3d09931`                       |
| AC4  | VERIFIED    | the same recordings. By reading the code, not by a test: `seaSway` in `src/books/mila/world/underwater.ts:148-155` returns its offset multiplied by `pow(h,1.6)`, so it is zero at the root (`h` = 0) for any time, seed or suppleness, and grows faster than the height; shared field, phase from the root's place, a delay up the blade, per-blade seed and suppleness. No automated test covers this formula (`underwater.test.ts` tests `seaLight` and `addSeaFog` only; the earlier citation was wrong). Motion over time was judged on frame sheets, the recordings were not watched by a person                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `3d09931`                       |
| AC5  | VERIFIED    | `boards-final/` (pages 7 to 10 and the five transitions, desktop and mobile), `final/*-t*.mp4`; the treatment is a property of the sea, not of a page (`AUDIT.md` section 4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `3d09931`, `f645de0`            |
| O1   | VERIFIED    | `evidence/exit-probe.md`: in the running scene, every frame of 6 → 7, ankles, hips and head against the floor and the animated surface: 0 faulty frames on `f645de0` and on `1638c4c`; `evidence/corrections-c1.md` (entry frames unchanged between the two builds); `evidence/wade.md` (replay: 60 faulty frames → 0), `boards-o/`, `boards-c1/`, recordings ×1 and ×0.25; `AUDIT.md` section 7. Whether the entry now reads as natural is the owner's eye                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `1638c4c`                       |
| O2   | VERIFIED    | `TURTLE_SCALE = 0.6`: shell 1.38 m → 0.83 m against Mila's 1.25 m; path, heading and motion unchanged (`scene.test.ts`, "the turtle"); `boards-o/`. Whether the size pleases is the owner's eye                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `f645de0`                       |
| O3   | VERIFIED    | `evidence/exit-probe.md`: same probe on 10 → 11. At `f645de0` she came out lying forward: 28 frames with the hips above the surface, 13 of them with an ankle above it (the reviewer's doubt was founded; the replay in `wade.md` had shown 3). At `1638c4c`: 0 and 0; she is upright before her feet touch. The pose eases separately from the root's height, which is why the replay missed it (`AUDIT.md` section 7.3, note at the top of `wade.md`). `boards-c1/` (three builds, both layouts), recordings in `c1/`. Limits: about 0.5 s from touchdown to dry sand; for about 0.4 s only her hair shows. Owner's eye as for O1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `1638c4c`                       |
| AC6  | VERIFIED    | amended by O4: paths may deviate locally only to avoid interpenetration. `evidence/corrections-c2.md` (journey 24 steps per viewport, 0 failed, on `7ea9a48`), `evidence/corrections-o4.md` (lengths of the five transitions within 8.5 ms of `1638c4c`, on `a425401`); `git diff d60c1a6..HEAD` on story, audio, tree, shell, shared and other books: empty (section 7). The scripted paths of Mila, the turtle and the crab are unchanged by O4 (they had no overlap); the fish leave their rounds only near a solid and return to them. The crab stands 4 cm higher and the conch leans with the sand (cycle 2), both in place. Changed earlier: Mila's height in the shallows (O1/O3) and the moment she stands up on the way out (cycle 1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `7ea9a48`                       |
| AC7  | VERIFIED    | `evidence/leak-c2.md`: a fresh series of 5 open/close cycles on `7ea9a48`, desktop and mobile layout. Live GL objects are the same on every cycle in the tale (desktop 40 textures, 1487 buffers, 874 vertex arrays, 66 programs; mobile 38, 1487, 387, 56) and zero back on the tree; contexts created = contexts lost. JS heap: +0.44 MB a cycle in the tale and +0.29 on the tree (desktop), +0.39 and +0.22 (mobile), the same slope as on `3d09931` (`evidence/leak.md`: 0.41 and 0.26); five cycles show a slow trend, not its cause. The counts are of live GL objects, not `renderer.info` (not reachable in a plain build). The earlier rationale was wrong: O5 does create geometries and materials (the conch's foot, snout, stalks and eyes, `scene.ts` section LIVING CONCH), all under the scene and released by `disposeObject(scene)`. Console: only the favicon 404 of the base                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `7ea9a48`                       |
| AC8  | VERIFIED    | `evidence/perf.md`, `evidence/perf-nvidia-smi.txt`, `evidence/links.md`, `evidence/corrections.md`, `evidence/long-frames.md`, `evidence/corrections-o4.md`. 60 fps held on the tested laptop, capped, both layouts, on `a425401` as before (median 59.88 fps, three alternated runs). Real phone: **not tested**. Limiter off, page 9: −22 % since O4, over the 10 % allowed for a segment, with no effect at the capped rate (section 4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `3d09931`, `f645de0`, `a425401` |
| AC9  | VERIFIED    | `evidence/low-quality.md`, `boards-final/low-*.png` (level 0 under 8× CPU throttle); `evidence/reduced-motion.md`, `boards-final/reduced-*.png`. Frame rate at low quality was not re-measured under the headed protocol                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `3d09931`                       |
| AC10 | VERIFIED    | section 7: `pnpm build`, `pnpm typecheck`, `pnpm test` (55 files, 405 tests), `pnpm lint`, all exit 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | HEAD                            |
| AC11 | VERIFIED    | three independent reviews by Codex: `review-1.md` (PASS_WITH_RESERVATIONS on `9668453`), `review-2.md` (CHANGES_REQUESTED on `a952d07`), `review-3.md` (PASS_WITH_RESERVATIONS on `6680878`, no blocker or major finding; `src/` identical to `7ea9a48`). Its one new finding, F5 (minor, the ground early-out of the clearance check), is fixed in the QA script after the review, with no product change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `6680878`                       |
| AC12 | NOT_REACHED | at this commit; push, pull request, CI, deploy preview and merge follow it and are recorded in the pull request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —                               |
| O4   | VERIFIED    | `evidence/clearance.md` and `.json`, regenerated with the corrected check (`qa/mila-clearance.mjs` with `qa/mila-clearance-gap.mjs`; its gap is never above the true one; the reviewer's two missed overlaps are tests in `qa/mila-clearance-gap.test.mjs`). Every living form (Mila, fish, school, turtle, crab, living conch) against every other, every solid and the ground: 53 pair kinds, each with the times it was measured and its closest approach; every page and turn forwards and back, tolerance 0.02 m. Before (`1638c4c`), desktop / mobile layout, frames with an overlap: fish–ground 13 071 / 2 115, fish–rock 9 482 / 7 819, fish–coral 4 515 / 6 144, school–school 13 857 / 7 264, fish–fish 626 / 448, fish–turtle 278 / 387, Mila–fish 53 / 92, Mila–school 77 / 87, fish–school 16 / 0, crab–ground every frame (0.032 m). After (`7ea9a48`): 0 in every kind on both. Worst frames before / after `boards-c2/clearance-{desktop,mobile}.png`; recordings ×1 and ×0.25 `o4/motion-*` (taken at `a425401`); 12 unit tests of the solver in `shoal.test.ts`, with the reviewer's crowded and boundary cases; `AUDIT.md` sections 7.5 and 7.7. The ground (review 3, F5): its early-out is removed and every living body is tested against it on every frame, `evidence/clearance-f5.md`: no overlap on either layout (crab +0.008 m, conch −0.008 m, fish never under +0.099 m). Ground clearance is a sampled measure, not covered by the proof that holds for two stand-ins. Limits: the stand-ins leave out fins, flippers, hands, feet, hair buns and the crab's legs; fish in Mila's way move aside fast in the turns | `7ea9a48`                       |
| O5   | ACCEPTED    | accepted as it is by the owner's decision O5-PLACE of 2026-11-18 (« laisser la conque »): defects fixed, place kept, readable only around the arrival on page 9. The creature is the living conch (`liveConch` in `scene.ts`). Done: seven defects fixed at the source (`AUDIT.md` section 7.6), and in cycle 2 its foot, which the corrected check found up to 6 cm in the sand, laid on the sand along the slope (section 7.7); before / after at normal and doubled size `boards-o4/conch-*.png` (at `a425401`), recording `o4/conch-rec.mp4` and `-x025.mp4`. Not met: readable at normal size on pages 8, 9 and 10. It is in view for about two seconds on arriving at page 9, not on pages 8 and 10, cut by the frame on the settled page 9, and only partly in view on the phone layout. Its place is kept, by that decision. Its sway could not be told from the camera's move on the recording's stills                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `7ea9a48`                       |

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

- O4 and O5 (`evidence/corrections-o4.md`), `1638c4c` against `a425401`, same protocol, capped
  desktop and mobile layout, three alternated runs: median 59.88 fps on both builds and both
  layouts, p95 16.8 to 17.3 ms; draw calls and shader programs unchanged; three single frames of
  33 to 35 ms on the new build's desktop runs, none on the old (noise-sized, as above).
- Limiter off, page 9, three runs per build: the frame's JavaScript goes from 1.96 to 2.53 ms
  (the steering of 240 fish), the mean rate from 485 to 376 fps: **−22 %, more than the 10 % the
  mission allows for a segment**. It is 0.57 ms of a 16.7 ms frame at 60 Hz, where nothing is
  lost. In the same runs the long frames above are gone (frames over 33 ms 20 / 19 / 10 →
  0 / 0 / 0, longest 228 → 8.7 ms), which fits the reading that the main thread was outrunning
  the GPU; this was not the aim. A slow phone CPU was not measured.

- Cycle 2 (`evidence/corrections-c2.md`): the solver now makes one list of close pairs a frame
  where it swept all 28 680 pairs twice; in Node, 240 fish and 58 solids, a step costs 0.31 ms
  where it cost 0.43 ms. One headed capped run on `7ea9a48`, a check and not a series: desktop median
  59.88 fps, p95 16.8 ms, two single frames of 33 ms; mobile layout median 57.47 fps, p95 18.2 ms,
  no frame over 21.3 ms; draw calls and programs unchanged, quality level 2. The mobile figure is
  an even 17.4 ms cadence (p99 18.5 ms), 4 % under the earlier runs' 59.88; a 57.5 fps run was
  seen once on the base too, and one run cannot tell which this is. The first attempt of this run
  timed out on a reload and was repeated once.
  The limiter-off figure was not re-measured on `7ea9a48`.

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
- Fish (`boards-o4/`): on pages 7 to 9 and in the turns no fish lies over Mila any more; the
  school of page 8 passes beside, above and below her and still reads as one school; it opens
  over about a second on arrival where it used to jump open in one frame.
- The living conch: seated on the sand, shell, foot and head in one piece, the lip and its pale
  inside turned to the camera, two eye stalks; it reads against the dark floor at normal size.
  The pearl's glow is a full round halo.
- Cycle 2: the crab stands 4 cm higher, its shell clear of the sand; the conch leans with the
  slope of the hollow, its whole foot on the sand (`peek/conch-c2/`, `boards-c2/crab-*.png`, looked
  at in the main session).
- Less sure, fish: under water they also keep out of the line from the camera to Mila, which is
  the executor's addition; on the phone layout a few large fish end up close to the camera in the
  turn 9 → 10.
- Less sure, conch: its mouth reads grey and lavender more than pink, its pupils are not seen at
  normal size, and it is in view for about two seconds only.
- Less sure, entry and exit: for about 0.4 s only her hair is above the surface, a small dark
  shape that on a still could be taken for a rock; the walk out is short.
- Less sure: page 10 is lighter behind the text than at the base; the dust is sparse to the point
  of being easy to miss; on a phone-sized view of page 9 few fish are in frame.

## 6. Model and delegations

Main session: `claude-fable-5-2` (Fable 5.2) throughout. Art direction, shaders, motion and all
product code, the diagnosis of O1 to O3, the rendered probe of the exit and its fix (cycle 1), the
fish steering and its tests, the clearance checker and its probe (`qa/mila-clearance.mjs`,
`qa/mila-probe-inject.mjs`), the living conch, the corrected gap and its tests, the solver's settling, the audit and this
report were done in the main session.

| Delegated task                                                                                                                                                                                                                                                                                                                 | Subagent model |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Writing and extending `qa/mila-underwater.mjs` (modes shots, motion, perf, leak, journey, trans, low, text, links, determinism; headed switch) and its row in `qa/README.md`                                                                                                                                                   | Sonnet         |
| Baseline captures and measurements at `d60c1a6`                                                                                                                                                                                                                                                                                | Sonnet         |
| Measurements at `f92d8e2` (superseded) and the final headed round `d60c1a6` vs `3d09931`; the short round on `f645de0`                                                                                                                                                                                                         | Sonnet         |
| Cycle 1: the functional round on `1638c4c` (`evidence/corrections-c1.*`, `boards-c1/`); the long-frame study and its `longframes` mode (`evidence/long-frames*`)                                                                                                                                                               | Sonnet         |
| O4                                                                                                                                                                                                                                                                                                                             | VERIFIED       | `evidence/clearance.md` and `.json`, regenerated with the corrected check (`qa/mila-clearance.mjs` with `qa/mila-clearance-gap.mjs`; its gap is never above the true one; the reviewer's two missed overlaps are tests in `qa/mila-clearance-gap.test.mjs`). Every living form (Mila, fish, school, turtle, crab, living conch) against every other, every solid and the ground: 53 pair kinds, each with the times it was measured and its closest approach; every page and turn forwards and back, tolerance 0.02 m. Before (`1638c4c`), desktop / mobile layout, frames with an overlap: fish–ground 13 071 / 2 115, fish–rock 9 482 / 7 819, fish–coral 4 515 / 6 144, school–school 13 857 / 7 264, fish–fish 626 / 448, fish–turtle 278 / 387, Mila–fish 53 / 92, Mila–school 77 / 87, fish–school 16 / 0, crab–ground every frame (0.032 m). After (`7ea9a48`): 0 in every kind on both. Worst frames before / after `boards-c2/clearance-{desktop,mobile}.png`; recordings ×1 and ×0.25 `o4/motion-*` (taken at `a425401`); 12 unit tests of the solver in `shoal.test.ts`, with the reviewer's crowded and boundary cases; `AUDIT.md` sections 7.5 and 7.7. The ground (review 3, F5): its early-out is removed and every living body is tested against it on every frame, `evidence/clearance-f5.md`: no overlap on either layout (crab +0.008 m, conch −0.008 m, fish never under +0.099 m). Ground clearance is a sampled measure, not covered by the proof that holds for two stand-ins. Limits: the stand-ins leave out fins, flippers, hands, feet, hair buns and the crab's legs; fish in Mila's way move aside fast in the turns | `7ea9a48` |
| Cycle 2: before / after clearance runs with the corrected check and their tables and boards (`evidence/clearance.*`, `boards-c2/`), the 5-cycle leak series (`evidence/leak-c2.*`), the journey, `mila.mjs` (143/150, as the base) and one headed capped run on `7ea9a48`, conch and crab stills (`evidence/corrections-c2.*`) | Sonnet         |
| Regression suites, log parsing, contrast statistics, boards (ImageMagick), `evidence/*.md` and `*.json` (all but `wade.md` and `exit-probe.*`), `manifest.tsv`                                                                                                                                                                 | Sonnet         |

One subagent (general-purpose, model `sonnet`) carried all of it, resumed for each round. Its
figures were read and its boards looked at in the main session before use. It was given the
browser rule each time (headed GPU-backed Chrome for any frame-rate figure, renderer checked,
bounded runs, `nice -n 19`, own processes stopped).

## 7. Commands

Run at the final HEAD of the branch:

```text
pnpm build      exit 0
pnpm typecheck  exit 0
pnpm test       exit 0   55 files, 405 tests passed
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
- O4: the clearance check uses simple stand-in shapes (capsules, ellipsoids); fins, flippers,
  hands, feet, hair buns and the crab's legs are outside them, a coral is one rounded volume, and
  the ground is read at sampled points. Fish
  in Mila's way during the turns move aside fast (up to 0.09 m of change between two frames).
- O4: 0.57 ms more JavaScript a frame at `a425401`, −22 % with the limiter off on page 9; the
  solver is cheaper since cycle 2 (Node benchmark), not re-measured in the browser with the
  limiter off; not measured on a phone.
- Fish solver: a crowd too dense for 12 rounds, or fish the walls leave no room for, stay
  overlapping until the next frames; not seen on the tale's routes.
- `review-2.md` and `review-brief-2.md` are committed as received; `.prettierignore` now leaves
  reviewers' files alone so that the pre-commit hook does not ask to reformat them.
- Cycle 2 was cut short at the owner's request (efficiency over quantity): on `7ea9a48` no
  uncapped run, one capped run only, and of the three earlier suites only `mila.mjs` (`mila-nav`
  and `mila-lang` were not run).
- Capped mobile layout on `7ea9a48`: 57.47 fps in the single run against 59.88 before; not
  settled whether noise or a 4 % loss.
- O5: the conch is out of the picture on pages 8 and 10 and cut on the settled page 9; bringing
  it in means moving it about 0.7 m or changing the camera.
- Scratch folders are listed in `AUDIT.md` section 11; nothing was deleted.

## 9. Next

Delivery under the owner's decision MERGE+DEPLOY (`mission.md` log): push, pull request to `main`,
CI, Netlify deploy preview checked, merge commit, production checked. The branch, the worktree
and the QA media are kept.
