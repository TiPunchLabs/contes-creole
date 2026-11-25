# Report — mila-calebassier

Verdict: PARTIAL
Version: fa914ca

Executor: Claude Code session, model id `claude-fable-5-2`. Layout and camera owner: the executor
(no camera subagent). Date: 2026-11-23/24.

## A. Executive summary

Objective: the complete twelve-page tale « Mila et le calebassier magique » as a new book of the
site, in a 2.5D watercolour universe built with Blender and read in Three.js, delivered as a draft
PR with a Deploy Preview.

Outcome: the twelve pages are built, integrated as book 3 of the tree, playable on the Deploy
Preview of draft PR #54, with sources, rebuild procedure, tests and evidence. Functional QA on the
product commit `23236c7`: 156 checks, 0 failed. The existing checks of the repository are green.

Review cycle 1 (Codex, `review-1.md`, CHANGES_REQUESTED on `23236c7`): both findings are fixed in
`875fb5d` + `486c002` and both checks that let them through are replaced (section "Answers to
review 1"). The figures of this report that predate the cycle (performance, weights, rebuild) were
measured on the commits their sections name and were not measured again.

Review cycle 2 (Codex, `review-2.md`, CHANGES_REQUESTED on `486c002`; F1 and F2 confirmed fixed):
F3 and F4 are fixed in `a6e1062` and in this report (section "Answers to review 2"). It was the third
and last correction cycle allowed by the mission.

Owner feedback 2 with its five additions (`owner-feedback-2.md`, cycle 4 approved by the owner):
Man Ninon's walk is redone, both figures wear light closed shoes, both silhouettes are improved
(Man Ninon's back straightened after the owner saw a hump), page changes are a watercolour wash and
no foot crosses a root any more, in `ff11440`, `a3716b3` and `1de7283` (section "Owner feedback 2"). Codex review 3 on `a6e1062`
ran in parallel; its file is not touched by this cycle and its findings are not answered here.

Review cycle 4 (Codex, `review-4.md`, on `1de7283`), finding F5, in the short cycle 5 approved by
the owner and limited to it: the whole shoe now clears roots and solids, the walk and the check
both work on the whole shoe, in `a4903b0` and `fa914ca` (section "Answers to review 4").

Why PARTIAL and not PASS:

- A15 asks for a Codex review on the final SHA: `fa914ca` is not reviewed yet (review 4 is on
  `1de7283`); since `a6e1062` the branch changes both figures' walk, feet and
  shapes and the page change, and has not been reviewed (review 3 is on `a6e1062`).
- Two props are hidden by the figure who carries them at a reading frame (the gift on page 12, the
  lantern in part on page 11 portrait): section "Answers to review 2", decision D-GIFT.
- A09 regression of the existing tales: none found. `qa/tree.mjs` cannot launch on this machine
  and `qa/mila-nav.mjs` times out, on the baseline too (section D, A09).
- A05 watercolour: improved in the materials and painted layers after the pilot's note, but the
  painted layers are scripted washes, clearly below the reference boards in drawing (section E).
- A12 performance: measured on a desktop GPU only (about 1 ms per frame uncapped); draw calls exceed
  the brief's initial alert threshold on eleven pages; no phone was tested.
- Kréyòl text is an unvalidated draft (decision D-GCF).

## B. Initial state and scope

- Base `origin/main` `3ce9759`, branch `feat/mila-calebassier`, worktree
  `contes-creole-worktrees/mila-calebassier`. Reconnaissance: `recon.md`.
- Brief: `owner-brief.md`, `brief/` (manifest verified, kept verbatim and excluded from Prettier).
  The four reference boards were read; none is used as a texture.
- Excluded and respected: no merge, no production deploy, no publication, PR left in draft, no
  dependency added or upgraded, no change to the home tree or Ti Kannot. The shell
  (`src/app/app.ts`) was not touched until review 1; since `875fb5d` it carries one narrow change,
  decided by the pilot (mission §7, 2026-11-24): cancelling a book that is still opening.

Assumptions of `mission.md` §2, restated:

| Id                                                                      | Status                                                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| H1 base, push, draft PR, preview                                        | applied                                                                                            |
| H2 Mila reused from the repository                                      | applied: extraction to `src/shared/mila/`, see C                                                   |
| H3 French text verbatim, page 12 « un bol pour notre table »            | applied and tested                                                                                 |
| H4 Kréyòl as an unvalidated draft                                       | applied: `draft: true`, label « Bwouyon — à valider » on every page, `docs/kreyol/variants.md` #18 |
| H5 no sound                                                             | applied (no sound button either)                                                                   |
| H6 tooling verified, no image generator                                 | no generator found; layers painted by a script written for the mission                             |
| H7 no new library                                                       | applied (`GLTFLoader` and the post-processing passes are part of `three`)                          |
| H8 mobile navigation of PR #52                                          | inherited from the shell (a `world` book), tested with real touch input                            |
| H9 phone tests are emulation; performance on a GPU-backed headed Chrome | applied; stated wherever a phone size appears                                                      |
| H10 disk and heavy sources                                              | masters and `.blend` (56 MB) kept outside the repository with a manifest                           |

No conflict between `mission.md` and the brief was found.

## C. Work performed

Created:

- `src/books/mila-calebassier/`: `book.ts`, `cover.ts`, `staging.ts` (camera presets), `theme.css`,
  `story/fr.md`, `story/gcf.md`, `assets/` (3 GLB, 15 WebP, cover), `world/` (`layout.json`,
  `assets.json`, `index.ts`, `pages.ts`, `garden.ts`, `paint.ts`, `finish.ts`, `keys.ts`,
  `puppet.ts`, `mila.ts`, `ninon.ts`, `assets.ts`, `pages.test.ts`).
- `src/shared/mila/{figure,textures,noise}.ts`: Mila's procedural figure, arm IK, dress helpers and
  texture painters, moved out of `src/books/mila/world/scene.ts`.
- `art/mila-calebassier/`: `scripts/{wc,paint_layers,meshkit,build_assets,render_compare,draw_plan}.py`,
  `README.md` (rebuild procedure).
- `qa/calebassier/` (dev-only viewer), `qa/calebassier-view.mjs`, `qa/calebassier-animatic.mjs`,
  `qa/calebassier.mjs` (functional QA through the real app).
- Mission documents: `recon.md`, `preprod.md`, `plan-jardin.png`, `asset-register.md`,
  `checkpoint-s3.md`, `evidence/`, this report.

Modified:

- `src/books/mila/world/scene.ts`, `noise.ts`: call the shared module; same materials, same seeded
  draws, same build order. `src/books/books.test.ts`: two tests for the new book.
- `CLAUDE.md`, `doc/architecture.md`, `qa/README.md`, `docs/kreyol/variants.md`, `.gitignore`,
  `.prettierignore`.

Decisions taken by the executor (all reversible):

| Id        | Decision                                                                                  | Reason                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| P-BOOK    | a `world` book, not an `immersive` one                                                    | inherits the shared reading UI and the validated navigation with no shell change                                                                |
| P-NINON   | Man Ninon is procedural, on the plan of the shared Mila figure, not a Blender rig         | one visual family, same IK for exact hand contact; the Blender rig path is exercised by the two skinned branches and the rooster (`preprod.md`) |
| P-FINISH  | one finishing brush over the frame (Kuwahara, pooled edges, paper tooth), masked on faces | repository precedent (Ti Kannot); it unifies painted and lit surfaces; the washes themselves are in materials and layers                        |
| P-SOURCES | PNG masters and `.blend` git-ignored, archived with a manifest                            | 56 MB, rebuilt bit-identically by the scripts                                                                                                   |
| P-GATE    | the gate stays open                                                                       | no gate animation is told by the text                                                                                                           |

Delegations (model economy):

| Task                                                                                                                                                                                                                                                                                                                                                                                                                    | Subagent model            | Result                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Baseline checks, baseline build, underwater stills, Mila pages 1–6 at `3ce9759`                                                                                                                                                                                                                                                                                                                                         | Sonnet, isolated worktree | done                                                                                                            |
| Functional QA script, captures with the text card, weight, frame times, draw calls                                                                                                                                                                                                                                                                                                                                      | Sonnet                    | done; one check relaxed by the executor (ambient sway is not a replay)                                          |
| Rebuild from the scripts twice, hash comparison, archive of the sources with a manifest                                                                                                                                                                                                                                                                                                                                 | Sonnet, isolated worktree | done                                                                                                            |
| Regression of the existing tales (pixel comparison, existing QA journeys)                                                                                                                                                                                                                                                                                                                                               | Sonnet, isolated worktree | done                                                                                                            |
| Update of `qa/swipe.mjs`, `qa/mila.mjs`, `qa/tkp.mjs` for any shelf size, negative control                                                                                                                                                                                                                                                                                                                              | Sonnet                    | done                                                                                                            |
| Frame times, draw calls and weights on `7ed9c95`; third rebuild; refreshed archive                                                                                                                                                                                                                                                                                                                                      | Sonnet, isolated worktree | done                                                                                                            |
| Review cycle 1: every mode of `qa/calebassier.mjs`, framing sweep, negative controls, arms sweep, contact sheets, on `875fb5d`                                                                                                                                                                                                                                                                                          | Sonnet                    | done; found one remaining framing failure (page 10, 640x360 landscape), fixed by the executor                   |
| Owner feedback 2: final runs on `1de7283` (a run on `ff11440` was stopped when the owner's additions arrived; a full run on `a3716b3` passed on the calebassier tale and gave the unstable underwater comparison) (app framing 7 cases, framing and visibility sweep on 7 screens, escape, journey, rapid, touch, reduced, resize, text, stills, arms and feet sweep, underwater stills against the `3ce9759` baseline) | Sonnet                    | done on `1de7283`, all passing; it ran four long calls in the background and waited for each, against the brief |
| Review cycle 2: final runs on `a6e1062` (app framing 7 cases, sweep on 7 screens, escape, journey, rapid, touch, reduced, stills, arms sweep, stills of the page 10 meeting and the page 1 gate)                                                                                                                                                                                                                        | Sonnet                    | done; the portrait sweep at 0.1 s steps hit the time limit twice and was rerun by the executor at 0.25 s        |
| Review cycle 1: regression of Ti Kannot and the underwater Mila on the shell change                                                                                                                                                                                                                                                                                                                                     | Sonnet                    | done; `mila-lang.mjs` stopped by the time limit                                                                 |

Art, staging, cameras, product code, shaders, Blender and painter scripts, tests and documents were
done on the executor's model. In review cycle 1 the executor also wrote the two fixes, the new QA
modes and their rules, ran the tuning loops and the final reruns on `486c002`, and read the sheets.
Two subagents of the previous context (functional QA script, regression) were found finished at the
start of the cycle, with no browser or server left running.

## D. Verification and evidence

Evidence folders: `evidence/` in this folder (small sheets), and outside the repository
`~/.local/share/contes-creole-qa/mila-calebassier/` (`baseline/`, `s2/`, `s3/`, `s5/`). Renderer of
every capture and measurement: `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2,
OpenGL ES 3.2)`, system Chrome 158. Every "phone" below is an emulated viewport on this machine.

### Acceptance matrix

| AC  | What was verified                                                               | Method                                                                                                                                                                                                                                                                  | Observed                                                                                                                                                                                                                                                                                                        | Status                                                                    |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A01 | twelve pages, French text identical to `story.fr.json`, order, opening          | vitest (`books.test.ts`), and DOM against JSON in the real app (`qa/calebassier.mjs` mode `text`, 25 checks)                                                                                                                                                            | identical, no normalisation needed; counter `n / 12`                                                                                                                                                                                                                                                            | VERIFIED                                                                  |
| A02 | canonical Mila reused                                                           | source moved, not rewritten: `src/shared/mila/` from `scene.ts` at `3ce9759` (lines 62–144, 1600–1611, 1854–2130, 2132–2582); underwater stills before/after; Mila pages 1–6 before/after sheet (`s5/regression/mila-pages/before-after.jpg`); captures of the new tale | underwater tale pixel-identical; in the new tale same build, colours and textures, this tale's materials (no rim light, paper grain). No dedicated face/profile/three-quarter turntable was made: the views come from the pages (page 9 front three-quarter, page 5 profile, page 3 three-quarter, page 2 back) | VERIFIED, turntable not made                                              |
| A03 | several calabashes in the branches, none on the trunk                           | build rule (no hanging point nearer than 1.3 m from the trunk axis), test "the built tree" on `assets.json`, captures                                                                                                                                                   | 13 fruits, nearest at more than 1.3 m, all above the fork                                                                                                                                                                                                                                                       | VERIFIED                                                                  |
| A04 | contemporary architecture, no wooden hut                                        | Blender stills of both houses (`s5/architecture/houses-blender.jpg`), pages 1, 3, 4, 12                                                                                                                                                                                 | rendered masonry, slab, covered terrace on posts, ribbed metal roof with eaves, jalousies; no reference photographs were gathered (limit)                                                                                                                                                                       | VERIFIED                                                                  |
| A05 | coherent watercolour in 2D and 3D                                               | browser captures dusk, night, dark, dawn; before/after of pages 3 and 9                                                                                                                                                                                                 | coherent in one hand; drawing below the boards (section E)                                                                                                                                                                                                                                                      | PARTIAL, visual judgement                                                 |
| A06 | real depth in motion                                                            | `s7/parallax/parallax-p01-02-04-05-10-12-{desktop,portrait}.mp4` (camera moves over foreground cut-outs, mid masses, tree, far relief)                                                                                                                                  | parallax and occlusion visible on entry moves; watched as frame strips by the executor, not as video                                                                                                                                                                                                            | VERIFIED by frames                                                        |
| A07 | cameras documented for the twelve pages                                         | `staging.ts` (landscape and portrait, entry and reading lens, duration, intent, size, move, portrait priority, continuity), `preprod.md` shotlist, `plan-jardin.png`, graybox animatics `s2/animatic/*.mp4`, tests on the presets                                       | present and executable; axis rule tested                                                                                                                                                                                                                                                                        | VERIFIED                                                                  |
| A08 | taking, carrying, giving back are credible                                      | `s7/gestures/gestures-p03-06-08-09-11-{desktop,portrait}.mp4`, time strips                                                                                                                                                                                              | hands follow the fruit, one fruit, attach point visible on pages 3 and 11; limits in section E                                                                                                                                                                                                                  | VERIFIED with reservations                                                |
| A09 | no regression of existing tales                                                 | the five repository checks; underwater stills on a fake clock against the baseline; Mila pages 1–6; existing QA journeys on branch and baseline, three of them updated to read the shelf                                                                                | checks exit 0 (57 files, 462 tests; baseline 56 and 438); no regression; details below                                                                                                                                                                                                                          | VERIFIED; `tree.mjs` and the end of `mila-nav.mjs` not run (pre-existing) |
| A10 | robust, accessible navigation                                                   | `qa/calebassier.mjs` on `7ed9c95`: modes `journey` (32), `rapid` (19), `touch` (13, CDP touch events), `reduced` (13), `resize` (21), `contrast` (8)                                                                                                                    | all pass; HTML text in the shared card; canvas `aria-hidden`                                                                                                                                                                                                                                                    | VERIFIED                                                                  |
| A11 | clean loading and closing (as reported on `23236c7`; see "Answers to review 1") | mode `lifecycle` (11): ten open/close cycles, mode `failure` (8)                                                                                                                                                                                                        | heap after GC 19.5, 20.2, 20.5 MB at cycles 1, 5, 10 (+1.5 % from 5 to 10); one canvas; one live WebGL context; blocked GLB or texture shows the shell's notice and returns to the tree                                                                                                                         | VERIFIED                                                                  |
| A12 | performance measured                                                            | headed Chrome on the GPU, 20 s after 3 s warm-up                                                                                                                                                                                                                        | tables below                                                                                                                                                                                                                                                                                                    | VERIFIED on this desktop only                                             |
| A13 | sources and rebuild usable                                                      | rebuild twice from the scripts in a clean worktree, sha256 comparison                                                                                                                                                                                                   | tables below                                                                                                                                                                                                                                                                                                    | VERIFIED                                                                  |
| A14 | provenance and licences                                                         | `asset-register.md`, `art/mila-calebassier/README.md`                                                                                                                                                                                                                   | every file generated by the mission's scripts, nothing downloaded                                                                                                                                                                                                                                               | VERIFIED                                                                  |
| A15 | complete reviewable version                                                     | PR #54 draft, Deploy Preview, CI                                                                                                                                                                                                                                        | PR and preview exist; Codex review not done yet                                                                                                                                                                                                                                                                 | PARTIAL                                                                   |

### Functional scenarios of spec 06 (first run on `23236c7`, `s7/functional.log`; rerun on `875fb5d`, `s8/functional-*.log`)

| Scenario                                     | Result                                                                                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1→12 then 12→1, long wait on pages 3 and 11  | end states as expected on the 23 visits; after 25 s on pages 3 and 11 the state is unchanged and the picture differs by 1.05 to 1.39 / 255 (leaf sway)                                                                     |
| 2→3→4→3, 6→8→6, 10→11→12→11 quickly          | end on page 3 with the fruit in hands, page 6 with the fruit on the table, page 11 with the fruit on the branch; one fruit by construction                                                                                 |
| close during loading or a transition, reopen | on `23236c7` an Escape pressed during the opening was ignored (review 1, F2). Since `875fb5d` the first Escape returns to the tree during the dive, the loading and a page change; reopens on page 1, one card, one canvas |
| resize and orientation                       | 1440x900, 900x1200, 390x844, 844x390: canvas fills the viewport, card and buttons inside it                                                                                                                                |
| keys, buttons, touch                         | arrows, PageUp/Down, space, wheel, buttons; one page per swipe, bounds kept, vertical moves change no page                                                                                                                 |
| reduced motion                               | each page settles in about 0.8 s (the paper dip) on its final state                                                                                                                                                        |
| text in the darkest picture                  | contrast of the text colour against the picture under the text, without its halo: pages 7 and 9 above 14.9; lightest pages 1 and 12 between 8.2 and 10.2 against the mean and between 5.2 and 6.4 against the lightest 5 % |
| missing asset                                | notice « Kont-la pa ka chajé », back on the tree, shelf usable                                                                                                                                                             |

Negative control (QA README): with `QA_INJECT_CSS` removing the shade under the text and greying the
text, mode `contrast` fails on 5 of 8 checks (pages 1 and 12 on both sizes, page 9 on desktop) and
passes 8 of 8 without it (`s6/negative-control.log`). One control, on one mode.

### Regression of the existing tales (A09, commit `3cef379`, evidence `s5/regression/`)

- Underwater Mila, deterministic stills of pages 6–11, desktop and mobile, 20 files against the
  baseline at `3ce9759`: 18 identical (mean absolute error 0), 2 (`desktop-p10` and its scene-only
  twin) differing by at most one channel value (2.4e-08 normalised). Corrected after review 1: an
  earlier version of this report said 19 identical. The script's own determinism check gives the same
  0.001 pair values as on the baseline.
- Mila pages 1–6 in real time (moving water, leaves, crab): normalised error 0.0007 to 0.018; the
  subagent's reading of the before/after sheet is "face, hair, dress, shell and composition match".
  Not looked at by the executor or a human: page 2 (largest value) deserves one look.
- Existing journeys, run on the branch and on the baseline:

| Script                | Branch                    | Baseline         | Reading                                                                                                                                 |
| --------------------- | ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `mila-lang.mjs`       | 48 pass, 12 fail          | same             | the 12 are one pre-existing console 404                                                                                                 |
| `tk-reading.mjs`      | 238 pass, 3 fail          | same             | pre-existing 404                                                                                                                        |
| `mila.mjs` (updated)  | 143 pass, 7 fail          | 143 pass, 7 fail | the 7 are the pre-existing 404; the shelf check now asserts the ready tales in manifest order, then the invitation                      |
| `swipe.mjs` (updated) | 91 pass, 0 fail           | 91 pass, 0 fail  | ring sequences and climb values are built from the shelf it finds; four slots rest at 0.2, 0.426, 0.653, 0.88 and a lap is `0 1 2 3 -1` |
| `tkp.mjs` (updated)   | 35 pass, 10 fail          | 35 pass, 10 fail | the 10 are the pre-existing 404; the invitation is found by its role, not at index 2                                                    |
| `mila-nav.mjs`        | 72 pass, 22 fail, timeout | same             | times out at 900 s on both builds                                                                                                       |
| `tree.mjs`            | does not launch           | same             | needs the pinned headless Chromium, not installed                                                                                       |
| `world.mjs`           | exit 0                    | not compared     | shots and counters only                                                                                                                 |

No failure was classified as a regression. The three scripts that encoded a three-entry shelf were
updated to read it from the app (commit `8854187`, run on `7ed9c95` and on the baseline build, same
results on both). Remaining gaps, pre-existing: `tree.mjs` gave no coverage of the new card;
`mila-nav.mjs` did not reach its end. The other rows of the table are the run on `3cef379`.

### Performance (A12, commit `7ed9c95`, evidence `s6/perf/`)

Hardware: AMD Ryzen 7 7435HS, NVIDIA GeForce RTX 4060 Laptop GPU (driver 580.178.04), display 60 Hz.
Headed system Chrome 158 on the GPU, 20 s after the page settles and a 3 s warm-up.

| Viewport                | Page | p50 ms | p95 ms | max ms | frames over 33.4 ms |
| ----------------------- | ---- | ------ | ------ | ------ | ------------------- |
| 1440x900, DPR 1         | 3    | 16.7   | 16.8   | 34.0   | 0.08 %              |
| 1440x900, DPR 1         | 9    | 16.7   | 16.8   | 17.3   | 0 %                 |
| 1440x900, DPR 1         | 11   | 16.7   | 16.8   | 36.4   | 0.08 %              |
| 1440x900, DPR 1         | 12   | 16.7   | 16.8   | 33.4   | 0 %                 |
| emulated 390x844, DPR 2 | 3    | 16.7   | 16.8   | 33.3   | 0 %                 |
| emulated 390x844, DPR 2 | 9    | 16.7   | 16.8   | 34.3   | 0.17 %              |
| emulated 390x844, DPR 2 | 11   | 16.7   | 16.8   | 33.3   | 0 %                 |
| emulated 390x844, DPR 2 | 12   | 16.7   | 16.8   | 50.0   | 0.17 %              |

Longest frame during the page change 3→4: 18.4 ms (desktop), 33.8 ms (emulated phone).

Uncapped (vsync and frame limit disabled, desktop 1440x900, DPR 1), to see the headroom the 60 Hz
display hides: page 3 p50 0.9 ms, p95 1.5 ms; page 12 p50 1.2 ms, p95 1.9 ms. Single frames of 435
and 582 ms occurred once in each uncapped run and were not investigated. All of this is a desktop
GPU; the 390x844 rows are an emulated viewport, not a phone.

Draw calls and triangles per page at its end state (whole frame, finish pass included):

| Page          | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  |
| ------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Draw calls    | 247 | 166 | 157 | 223 | 165 | 176 | 72  | 168 | 168 | 225 | 239 | 242 |
| Triangles (k) | 96  | 71  | 71  | 95  | 71  | 73  | 24  | 72  | 71  | 96  | 95  | 97  |

Triangles stay under the 250 k alert. Draw calls exceed the 150 alert on every page with a figure:
Mila's canonical build is about a hundred small meshes, Man Ninon about forty. Not optimised:
merging Mila's parts would change the shared figure.

Transfer (Chrome network events, `vite preview`, cache disabled):

| Phase                                               | Requests | Encoded | Decoded |
| --------------------------------------------------- | -------- | ------- | ------- |
| Home before opening a tale                          | 16       | 0.79 MB | 1.35 MB |
| Added by opening this tale, until page 1 is settled | 27       | 3.24 MB | 3.33 MB |

The tale's own files: 3 GLB 0.93 MB (0.32 MB with gzip), 14 textures 2.19 MB (largest `rt_garden`
383 kB), fonts 60 kB, code and styles 55 kB encoded. Under the 10 MB target. Every file of the tale
loads at opening (no progressive loading by page: not needed at this weight). The home's main chunk
grew from 724.41 kB to 752.6 kB (198.6 to about 206 kB gzip): more of `three` is now used.

### Sources and rebuild (A13)

Rebuild from the scripts in clean worktrees, with Blender 5.3.0, Python 3.14.4, numpy 2.3.5, Pillow
12.1.1: painter about 2 min 30 s, Blender build about 1 s.

| Rebuild | Commit    | Result                                                                                                                                                                                                             |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 and 2 | `3cef379` | identical to each other on the 20 files; identical to the committed files on 17; the hedge texture (painted before a painter fix), the build report (reformatted by Prettier) and the plan (older lenses) differed |
| 3       | `7ed9c95` | all 20 generated files identical to the committed ones (3 GLB, 15 `rt_*.webp`, `world/assets.json`, `plan-jardin.png`); `git status` empty after the rebuild                                                       |

Archive outside the repository, refreshed:
`contes-creole-assets/mila-calebassier-production/sources/2026-11-24-7ed9c95/` (56 MB: 15 PNG
masters, `.blend`, scripts, layout, build report, `MANIFEST_SHA256.txt` of 26 lines verified with
`sha256sum -c`). The older `sources/2026-11-23-3cef379/` is left as it was (its hedge master
predates the repaint).

### Owner feedback 1 (2026-11-24, `owner-feedback-1.md`, fixed in `23236c7`)

| Defect reported                                  | Root cause found                                                                                                                                     | Fix                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pages 1 and 3: arms merge into the dress         | only the hand was kept out of the clothes, and only for Mila; Man Ninon's resting hand lay on the surface of her dress; elbows hung against the body | each figure's dress volume is measured (`Dims.radius`); after every arm solve the arm's depth in the clothes is measured along the upper arm and the forearm (`armDepth`), the elbow swings out and a free hand moves out until the arm is clear (`world/puppet.ts`) |
| page 10: Man Ninon's lantern arm has disappeared | the lantern was given to her right arm but placed on her left side: the arm crossed her body inside the dress                                        | the lantern is carried out on the side of the arm that holds it                                                                                                                                                                                                      |
| page 10: Mila's arm partly in her dress          | same cause as pages 1 and 3                                                                                                                          | same fix                                                                                                                                                                                                                                                             |
| page 5: Mila passes through a plant              | a foreground cut-out stood on her walking line (0.1 m from it)                                                                                       | cut-out moved to the lens side of the path                                                                                                                                                                                                                           |

Sweep for the same classes of defect, on every page:

- Figure crossing a set element: three new tests sample both figures every 0.2 s of every page
  against every painted cut-out (foreground of both formats and the mid-garden masses), the trunk,
  the gate posts, the garden wall (crossed only through the gate), both houses, and in the bedroom
  the walls, bed and bedside table. They found three more foreground cut-outs on a walking line
  (page 2 landscape, page 5 portrait, page 10 landscape): moved. These tests see positions on the
  ground, not what overlaps on screen: a foreground leaf may still pass in front of a figure, as a
  foreground does. On page 5 it was moved to the text side so that it no longer does.
- Arm inside the clothes, hidden arm: `qa/calebassier-sweep.mjs` runs every page through its whole
  action in the engine (0.1 s steps, 1 337 instants per format, landscape and portrait) and reads
  each figure's worst arm depth. It found one more defect: on pages 6 and 8 Mila's hands went to the
  shutter leaves of the opposite sides, her arms crossing through her chest (about 80 mm deep);
  uncrossed. Final sweep (`s7/sweep.log`), deepest point per page, measured against the cloth plus
  40 mm (a forearm is 20 mm thick from its axis, limit 18 mm):

| Page           | 1     | 2    | 3    | 4     | 5     | 6   | 8    | 9    | 10    | 11    | 12   |
| -------------- | ----- | ---- | ---- | ----- | ----- | --- | ---- | ---- | ----- | ----- | ---- |
| Mila (mm)      | 5.1   | -0.1 | -5.8 | 0.0   | -13.0 | 8.1 | 14.5 | 16.6 | 15.2  | 14.5  | -0.2 |
| Man Ninon (mm) | -23.1 |      |      | -14.3 |       |     |      |      | -14.3 | -23.1 | -1.8 |

Same values in both formats (the poses do not depend on the screen). Pages 8 to 11 are the belly
carry: her arms are at full stretch over the front of the dress, 2 to 5 mm clear of it by this
measure. The measure treats the dress as round and does not see its animated hem; the hero
calabash count stayed at one on every instant.

- Limits of the fix: an arm seen in front of the dress still overlaps it on screen (it is in front
  of it, not in it); Mila's hands cannot reach the shutter leaves (the window is above her reach):
  they are raised towards them. The frames were checked by the executor on stills and strips, not
  as video.

Evidence: `evidence/s7-owner-feedback-1-before-after.jpg` (owner's captures left, same frames
now right), `evidence/s7-page03-arm-after.jpg`, `evidence/s7-strips-desktop.jpg` and
`evidence/s7-strips-portrait.jpg` (eight instants of pages 1, 3, 4, 5, 9, 10, 11, 12), re-captured
clips `s7/gestures/gestures-p03-06-08-09-11-{desktop,portrait}.mp4` and
`s7/parallax/parallax-p01-02-04-05-10-12-{desktop,portrait}.mp4`, page sheets `evidence/s5-pages-*`
refreshed from this build.

### Answers to review 1 (Codex, `review-1.md`, on `23236c7`; fixed in `875fb5d` and `486c002`)

Evidence of this cycle: `~/.local/share/contes-creole-qa/mila-calebassier/s8/` (logs named below).
Renderer of every run: `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2,
OpenGL ES 3.2)`, headless system Chrome 158.0.8127.36 on the GPU (the scripts refuse a software
renderer). Every phone size is an emulated viewport.

F1, portrait cameras crop the calabash and a hand (pages 5 and 10 at 390x844). Fixed.

- Cause: a portrait lens kept its vertical field of view on every phone, so a 390x844 screen
  (aspect 0.46) saw 18 % less from side to side than the 360x640 frame (0.5625) the lenses were
  composed on; and the subject was slid away from the text by a fixed 17 % of the screen, although
  the text is laid out in pixels.
- Fix in `staging.ts` and `world/index.ts`: `fitLens` (a screen narrower than its design frame,
  9:16 in portrait and 16:10 in landscape, keeps that frame's horizontal view and sees more above
  and below); `textShift(width, height)` (the subject goes to the middle of what the text leaves on
  that screen: between the text block and the reader's buttons in portrait, right of the text column
  in landscape; it mirrors the theme's own layout rules); `Shot.after` (a lens may wait before it
  moves). Unit tests for both functions in `world/pages.test.ts`.
- New check, as asked: the world publishes on its canvas (`data-framing`) and in its probe where
  the lens puts the hero fruit, each face, each hand, the lantern and the dawn gift (projected
  discs). `qa/calebassier.mjs` mode `framing` reads it in the real app on every settled page and
  fails when a required subject is cropped by the screen, lies under a line of the text (the
  glyph boxes of the real card) or under one of the reader's buttons.
  `qa/calebassier-framing.mjs` sweeps every page through its whole action (0.1 s steps) on seven
  screens in the viewer: what must be kept stays whole once it is on the screen. The rules are in
  `qa/calebassier-subjects.mjs`: fruit, Mila's face and both hands while she holds it; at the
  reading frame also every face shown, the lantern and its hand, the gift, and the fruit on pages 6
  and 11.
- The check found more than the review: on 360x640 the faces of pages 4, 5, 9 and 10 and the fruit
  of page 11 lay under the text; on 1440x900 Mila's face of page 10 lay under the text column and
  the fruit of page 9 passed the right edge; on a phone turned to landscape pages 1, 3, 5, 9, 10,
  11 and 12 had subjects under the text. All fixed by the two functions above and by re-aimed
  lenses: pages 4, 5, 9, 10 portrait, pages 1, 7 (same camera as 1), 9, 10 landscape.
- Two defects of motion found on the way and fixed: on page 4 portrait the eased pan started before
  the walk and overtook the two figures (Mila's face left the screen for about 2 s); the lens now
  waits for the walk. On page 10 the reading frame sits where the two figures end after walking
  left; reached early, it left Man Ninon off screen when she arrives with her lamp (already the
  case in portrait on `23236c7`, and in landscape after the re-aim of `875fb5d`); both lenses now
  hold the meeting, then follow the walk (`486c002`).
- Results on `486c002` (`s8/final-486c002/`): app check 37 of 37 on each of
  390x844 and 360x640 in Français, normal motion and reduced motion (12 pages, each also after
  turning the phone to landscape and back), 13 of 13 on each of 390x844 and 360x640 in Kréyòl and
  on 1440x900 (reduced motion); sweep 84 of 84 (12 pages on 390x844, 360x640, 320x568, 412x915,
  1440x900, 844x390, 640x360). Sheets of the real app in Français: `evidence/s8-pages-*.jpg`, read
  by the executor: fruit, hands and faces whole and clear of the text on the 36 frames. In the
  subagent's first set of stills the picture of page 10 at 360x640 came out black while two QA
  browsers shared the GPU; it is drawn in the rerun made alone and was not seen again.
- Negative controls (run on `875fb5d`, the checks did not change since): sliding every subject by
  12 % of the width to the left (`QA_SHIFT_LOOK=-0.12`) fails the sweep on 4 of 24 (pages 5 and 10
  at 390x844 and 360x640: "hero ... past the left edge", the review's own symptom) and the app check
  on 9 of 37; pushing the text down with an injected style fails the app check on 21 of 37
  (`s8/neg-sweep-shift.log`, `neg-framing-shift.log`, `neg-framing-css.log`).
- Limits: the check sees discs at the fruit, heads, hands and lantern, not whole bodies (feet may sit
  behind the reader's buttons, as on page 9 portrait); a figure that never enters the frame before
  the reading frame is not flagged by the sweep (page 10's case was found by reading a trace, then
  pages 1, 11 and 12 were read the same way and are fine); Bileng was not checked (its longer text
  scrolls in the card); 320x568 and 412x915 are swept in the viewer only.

F2, Escape cannot cancel asset loading (`src/app/app.ts`), misleading lifecycle check. Fixed, in the
shell, as decided by the pilot (mission §7).

- Change, narrow: `enter` and `enterImmersive` race each of their three waits (dive, loading,
  mount) against an `AbortController`; the first Escape pressed while the shell is in its `dive`
  state aborts it. The shell then covers the screen (0.3 s), closes what was shown, resumes the
  tree at the book's card, gives the focus back, shows no error notice. A world whose `mount` ends
  after the key is disposed when it ends and never becomes the open book; if it fails later, it
  fails silently. The abort listener is removed as soon as each wait settles. Nothing else in the
  shell changes: Escape in a book, the load error path and the transitions are the same code as
  before, with the error branch moved into one function shared by both kinds of book.
- Unit tests (`src/app/app.test.ts`, 36 tests, 4 new, 1 replaced: the old test asserted that Escape
  during the dive was ignored): Escape during the dive (nothing mounted, tree resumed once, focus
  back, no notice, no console error); Escape while a world's mount is pending (the late world
  disposed once, not shown, page keys dead, the tale opens again once); a late failure stays quiet;
  the same for an immersive book.
- Real check, replacing the unconditional assertion (`qa/calebassier.mjs` mode `escape`, one key
  per case, never a second one): during the dive of this tale and of the two other tales; while
  this tale's three `.glb` responses are held by the test, released only after the key; during a
  page change. It asserts the tree is back within 4 s, that 8 s after the release no book is open,
  no reading interface, no canvas in the book layer, and that the only WebGL context alive is the
  tree's; then that the tale reopens on page 1 with one card, one canvas, one more context, and that
  one key turns one page. Result: 17 of 17 on `875fb5d` (`s8/functional-escape.log`) and again on `486c002`
  (`s8/final-486c002/escape.log`).
- Negative controls: without the key (`QA_NO_ESCAPE=1`) the three loading checks fail, 14 pass
  (`s8/escape-negative-no-key.log`); on the Deploy Preview while it still served `23236c7`, the
  first check fails ("tale opened anyway") and the run stops there
  (`s8/escape-negative-23236c7-preview.log`).
- Regression of the other tales on the shell change (Sonnet subagent, build of `875fb5d`,
  baselines of `3ce9759` in `s5/regression/`, logs in `s8/regression/`):

| Script                            | Now              | Baseline         | Reading                                                                                                   |
| --------------------------------- | ---------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `tk-reading.mjs`                  | 238 pass, 3 fail | 238 pass, 3 fail | same check lines; the 3 are the pre-existing console 404                                                  |
| `tkp.mjs`                         | 35 pass, 10 fail | 34 pass, 10 fail | same 10 names (pre-existing 404); the extra pass is a check added to the script since the baseline run    |
| `mila.mjs`                        | 143 pass, 7 fail | 143 pass, 7 fail | same 7 names (pre-existing 404)                                                                           |
| `mila-lang.mjs`                   | stopped at 570 s | 48 pass, 12 fail | the first 42 check lines equal the baseline's; the rest did not run (time limit of the run), not compared |
| underwater stills, 20 files       | see below        |                  |                                                                                                           |
| `escape` mode, dive of both tales | 2 pass           | n/a              | first Escape during the dive of Ti Kannot and of the underwater Mila returns to the tree                  |

Underwater stills (`qa/mila-underwater.mjs`, `ONLY=shots`), corrected after review 2 (F4). Two
references exist and they are not the same thing:

- Original baseline, `3ce9759`, files in `baseline/underwater-shots/`: this is the reference of the
  acceptance criterion. Against it, the 10 mobile stills of `s8/regression/underwater/` and the 10
  desktop stills of the rerun `s8/regression/underwater-rerun/` give **18 of 20 exactly identical**.
  The 2 others, `desktop-p10.png` and `desktop-p10-scene.png`, differ on 23 pixels each, by at most
  1/255 on a channel: identical within a tolerance of one channel value, not exactly identical.
  (Counts recomputed by the reviewer, `review-1/cycle2/underwater-combined-comparison.json`.)
- Previous product (the branch build of `3cef379`), files in `s5/regression/underwater-shots/`: this
  is what the subagent of cycle 1 compared with, under the name "baseline". Against it the same 20
  files are exactly identical, including the two desktop page-10 images. The sentence "20 of 20
  identical" of the previous version of this report was that comparison, wrongly presented as a
  comparison with the baseline.

So the two page-10 differences already existed in the previous product and did not change in this
cycle; nothing is claimed about their cause. Separately, the 10 desktop stills of the subagent's
first run (made while another QA browser was running) differed from both references on up to
322 771 pixels; the baseline's own three determinism images of desktop page 7 already disagree with
each other. That run-to-run instability is pre-existing; its cause (concurrent GPU use or anything
else) is not established and was not investigated.
`tree.mjs` and `mila-nav.mjs` were not run (they cannot complete here, on the baseline either).

Reservations of review 1:

- Underwater pair count: corrected in the regression section (18 identical, 2 within one channel
  value; the report said 19).
- Asset register weights: every weight is now the exact size of the committed file in bytes (cover
  58,734).
- "156 green checks do not establish acceptance": agreed. The two checks concerned are replaced by
  the ones above, each with a negative control; A07 and A11 below are restated on them.
- `armDepth` is a heuristic (three samples per segment, a round undeformed dress): agreed, and
  unchanged. The sweep of this cycle gives the same values as before the cycle on every page
  (`s8/sweep.log`): no arm solving was touched. Continuous clearance against the animated hem remains
  not verified.
- Owner feedback 1 kept intact: arms sweep 24 of 24 lines pass (worst 16.6 mm on page 9, limit 18),
  one hero calabash at every instant; the three figure-against-set tests still pass in the 468.

Acceptance after this cycle, where it changed:

| AC  | Status on `486c002`                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A07 | VERIFIED by the executor: presets documented as before, and their framing now checked (above). To be confirmed by review 2                                                    |
| A09 | VERIFIED with the reservations above (`mila-lang.mjs` half run, desktop stills unstable between runs, `tree.mjs` and `mila-nav.mjs` not run)                                  |
| A10 | VERIFIED: modes `text` 25, `journey` 32, `rapid` 19, `resize` 21, `touch` 13, `reduced` 13, `contrast` 8, all pass, run on `875fb5d` (`s8/functional-*.log`)                  |
| A11 | VERIFIED: `escape` 17 of 17; `lifecycle` 4 of 4 (heap 19.6, 20.1, 20.7 MB at cycles 1, 5, 10: +2.9 % from 5 to 10; one live WebGL context after each cycle); `failure` 8 of 8 |
| A12 | unchanged: nothing was measured after `7ed9c95`; this cycle adds one JSON attribute written when a page's state or the screen changes, and no asset                           |
| A15 | PARTIAL: see "Answers to review 2"                                                                                                                                            |

One touch device limit, pre-existing and unchanged: while a book is opening there is no control on
screen, so the cancellation is a keyboard gesture only.

### Answers to review 4 (Codex, `review-4.md`, on `1de7283`; F5 fixed in `a4903b0`, QA rule in `fa914ca`)

Scope of this cycle: F5 only. Evidence: `~/.local/share/contes-creole-qa/mila-calebassier/s11/`.
Same browser and renderer (headless system Chrome 158 on the NVIDIA GPU).

F5, part of Man Ninon's shoe inside a root on page 12; ankle-only ground query and check. Fixed.

- The finding is right on both counts. The walk asked the ground what stands under one point,
  the ankle, and the check compared the shoe's lowest point with that same single reading: where a
  root rises under the toe or a side of the shoe, both said "clear".
- One source for both (`world/terrain.ts`, new): the triangles of the set's solids near the ground
  (roots, trunk, steps, walls, furniture; not the ground mesh) are put once in a height field
  sorted by squares of the ground plan; a query gives the highest surface over a place, between the
  floor and a reach above it. Pure geometry, unit-tested (`terrain.test.ts`, 3 tests: heights,
  floor and reach, and a sole whose ankle is on open ground with a ridge under its toe or its side).
- The walk (`world/puppet.ts`, was line 216): each foot asks about its whole sole, fifteen places
  from heel to toe and side to side with a margin (2 cm for a foot in the air, 0.8 cm for a foot set
  down), and stands on, or is lifted clear of, the highest thing under any of them; the clearance
  of a swinging foot still adds what its toes or heel hang below the ankle. Each figure's sole is
  measured on her shoe (`Dims.sole`).
- The check (`world/index.ts`, was line 618; `qa/calebassier-sweep.mjs`): `info().feet[].sunk` is
  measured on every vertex of the shoe's own meshes in world space (sole, upper, heel, collar,
  band): for each, the height of the solid surface over that vertex less the vertex's own height;
  the worst is kept. The sweep fails above 4 mm (was 12 mm on the ankle reading). `ankle` keeps
  the old single reading, to show what it missed.
- Codex's case, page 12 at 10.6 s, read with the same probe on both solvers
  (`s11/p12-ankle-only/`, `s11/p12-after-a4903b0/`):

| Solver                    | Ankle (x, z)  | Shoe's lowest point | Solid under the ankle | Highest solid under the shoe | Deepest vertex   |
| ------------------------- | ------------- | ------------------- | --------------------- | ---------------------------- | ---------------- |
| ankle-only (as `1de7283`) | 0.830, -1.677 | 152.0 mm            | 121.6 mm              | 222.0 mm                     | 47.9 mm inside   |
| whole sole (`a4903b0`)    | 0.830, -1.677 | 250.5 mm            | 121.6 mm              | 222.0 mm                     | clear by 50.6 mm |

The first line is the review's own numbers (ankle place, 152 mm, 121.6 mm, 47.9 mm), found again
independently: the ankle is clear, the toe is in the root.

- Negative control, ankle clear and shoe edge inside (`s11/neg-ankle-only.log`, exit 1): the new
  check run on a scratch worktree of `a4903b0` whose walk asks the ground under the ankle only. It
  fails pages 2, 5, 9 and 12 (the review's candidates): Mila 48.1 mm inside at 0.9 s on page 2,
  96.9 mm on page 5, 49.7 mm on page 9, 103.0 mm on page 12; Man Ninon 153.4 mm on page 12. The
  worktree is removed.
- Results on `a4903b0` (`s11/final-a4903b0/`): whole-shoe sweep at every instant of every page,
  0.05 s steps (finer than before), desktop and phone: 24 of 24 lines, exit 0. No vertex of a shoe
  inside a solid on any page. Where a shoe passes over the root, the closest it comes: 5.1 mm clear
  on page 2, 4.3 mm on page 5, 3.2 mm on page 9, 4.4 mm (Mila) and 7.0 mm (Man Ninon) on page 12;
  on the other pages no shoe is ever over a solid. Shoes never under the ground (lowest 0.8 mm
  above it); arms unchanged (worst 16.2 mm, limit 18); one hero calabash throughout; flat-foot
  slide 0.0 to 0.1 mm except pages 6 (2.0 mm) and 8 (4.0 mm, the turn already noted). Reduced motion
  shows the reading frames, where every shoe is on open ground or on a stone. Non-regression on the
  same build: edges and rendered visibility 84 of 84 on seven screens; real app `framing` 37 of 37
  (390x844 Français, normal motion), 37 of 37 (360x640 Français, reduced), 13 of 13 (1440x900);
  `journey` 32 of 32, `rapid` 19 of 19, `touch` 13 of 13, `reduced` 13 of 13, `escape` 17 of 17,
  `shots` 6 of 6. Run by the executor, one browser at a time; no subagent in this cycle.
- One more commit, `fa914ca`, QA only: at 0.05 s steps the sweep's rule "no foot up in the dress
  on open ground" failed on page 12, because Man Ninon's foot is already raised (330 mm) while it
  is still beside the root and no vertex of the shoe is over it yet. The probe now also gives the
  highest solid under the sole or within 6 cm of it (`near`) and that rule uses it. The walk is
  byte-for-byte the one of `a4903b0`; `journey` 32 of 32 and `reduced` 13 of 13 were run again on
  the build of `fa914ca` (`s11/final-fa914ca/`); the sweep numbers above are from this final rule.
- Before and after at 10.6 and 10.8 s, desktop: `evidence/s11-page12-shoe-root-before-after.jpg`.
  From this lens Man Ninon walks away and the lifted shoe is mostly behind her dress; the numbers
  above are the proof, the picture only shows that nothing else moved.
- What changed besides: feet now also stand on the stepping stones of the path (2.5 cm slabs, which
  the ankle reading with its 3 cm threshold ignored) instead of in them; on page 11 Man Ninon
  stands on the low end of a root, 26 mm above the grass. Route, timelines, composition, shoes,
  silhouettes, transitions and every other file are untouched.
- Limits, unchanged: the measure is on the shoes; legs, dress and carried props are not tested
  against the solids, and bodies against walls, trunk and furniture stay on the ground plan in the
  unit tests. The height field holds the highest surface over a place, so a foot under an
  overhang lower than 0.4 m would read as inside (there is none on the figures' ways). Moving set
  pieces (shutters, gate leaf) are taken where they stand at mount.

### Owner feedback 2 and its additions (2026-11-24, `owner-feedback-2.md`, done in `ff11440`, `a3716b3` and `1de7283`)

Evidence of this cycle: `~/.local/share/contes-creole-qa/mila-calebassier/s10/` and the sheets
`evidence/s10-*.jpg`. Same browser and renderer as before (headless system Chrome 158 on the NVIDIA
GPU; software renderers refused). Phone sizes are emulated viewports.

1. Man Ninon's walk, on every page where she walks (4, 10, 12).

- Cause of the stiff look: her legs swung on a fixed arc, the same as Mila's, wider than her step
  (0.54 m of foot travel for 0.40 m of body travel): the feet slid, the knees never took her weight,
  and the arm swung with the leg of its own side. Measured on `a6e1062`'s gait under the new check:
  feet down to 19 mm under the ground, a flat foot sliding up to 294 mm in 0.1 s.
- Now (`world/puppet.ts`, `plantedWalk`): the step phase comes from the distance walked, so a foot
  stays exactly where it lands while the body passes over it; each leg is solved (hip and knee) to
  reach its foot; the heel lands first, the foot lies flat, the toes leave last; the hips sink at
  each landing and rise over the standing leg; the trunk leans over the standing leg and the
  shoulders turn against the hips; the free arm swings against the leg of its side. A move is cut
  into a whole number of steps and starts and ends with the feet side by side: she leaves from
  standing and stops without a shuffle. Her step (`ELDER_STEP`): 0.42 m, both feet on the ground a
  fifth of the cycle, the swinging foot lifted 4 cm; about 1.7 steps a second at the page 10 pace.
- Mila walks the same way with a child's step (`CHILD_STEP`, 0.30 m). Not asked as such: with
  shoes on, her previous walk showed its toes 15 mm under the ground and the same slide, so the
  ground check of this feedback could not pass on it. Her poses, carries and timelines are unchanged.
- Planted feet showed two walks made sideways to the heading (page 5 last steps, page 12 walk to
  the table): the routes are aligned with the headings; page 5's last steps are shorter (0.33 m).
- Contacts kept: the lantern arm (page 10) and both carries are world-space hand targets solved
  after the body; arms sweep below.
- Limits: a figure who turns on the spot pivots on her feet (no stepping round); on page 8 Mila
  steps back while turning, a flat foot moves up to 7.9 mm in 0.1 s there; legs bend in one plane
  (no hip sway sideways, the trunk leans instead); the dress does not react to the knees.

2. Footwear, as made precise by the owner: light closed shoes for both, no sandal, no slipper.

- Man Ninon: low closed walking shoes of sand-coloured soft leather (`#cfbf9f`), a firmer heel, a
  darker collar round the ankle and a flat brown sole (`world/ninon.ts`). A first version of this
  cycle (`ff11440`, pale green slippers) was replaced after the precision.
- Mila: soft flat shoes of unbleached canvas (`#eadfc6`) with a band the colour of her dress straps
  and a brown sole. They are an option of the shared figure (`MilaKit.shoes` in
  `src/shared/mila/figure.ts`), absent by default.
- Both are painted with the tale's wash materials (same grain, pooling and brush as the skin and
  the clothes); pale so they read at dusk and at night against dark skin and the ochre path.
- Against the ground and the hems, at every instant of every page (`qa/calebassier-sweep.mjs`, new
  `info().feet`): lowest point of a shoe 0.8 mm above the ground (never under); on open ground the
  highest is 184 mm for Man Ninon (hem at 300 mm) and 152 mm for Mila (hem at 455 mm).

3. Silhouettes, incrementally (design by the executor on Fable 5.2; a flat-black pass was added to
   the probe to judge and to show them).

- Man Ninon read as a straight tube on thin legs. Now: a dress full at the bust and the hips and a
  little taken in between, to mid-calf with a flaring hem; a rounder belly; a fuller chignon at the
  back of the crown, which draws her profile; larger sleeves, sturdier arms and calves. Same
  figure, same face, same colours.
- Addendum 2, « la mamie semble bossue »: the first version of this work (`a3716b3`) also rounded
  her upper back, carried her head forward and set the chignon low on the nape; in profile the
  three made one hump. In `1de7283` the back is straight again (the dress keeps only its belly),
  the head is upright, the chignon sits at the back of the crown, clear of the neck. Nothing in
  the rest pose or the walk bends her spine: the walk's forward lean is 0.05 rad and was not
  changed. Before (`a3716b3`) above, after below, the four pages where she appears in profile or
  three-quarter: `evidence/s10-ninon-back-{desktop,phone}-before-after.jpg`.
- Mila: her outline (two puffs, jagged flounces) was already her own; her arms and legs were thin
  sticks at phone size. Now a fifth thicker (`MilaKit.limbs`, an option of the shared figure, absent
  by default) and fuller puffs (set by this tale on the built figure).
- Sheets, before above and after below, painted and flat black, desktop and phone:
  `evidence/s10-silhouette-{mila,ninon}-{desktop,phone}-before-after.jpg` ("before" is `ff11440`,
  the first shoes already on; "after" is `1de7283`; the bare feet of `a6e1062` are in the feet
  sheets).

4. Page changes: a wash instead of the dip to bare paper (`world/finish.ts`, `world/index.ts`).

- The picture of the page just left stays on the sheet and the new page soaks through it, along
  the paper's tooth, across the sheet in the direction the pages turn, with a darker rim of pooled
  pigment; 0.85 s. The picture is never blank; the text changes as before (the shell's own fade).
- A turn made during a change takes what is on the screen at that instant as its starting picture:
  there is one wash at a time, nothing queues or stacks.
- Reduced motion: a 0.25 s even cross-fade, and the page shows its final state.
- Inside this book's world only: the shell, the home tree and the other tales are not touched.
- Strips of two changes (pages 2 to 3 and 9 to 10), desktop and phone, and the reduced-motion
  version: `evidence/s10-transitions-{desktop,phone}.jpg` (stepped with the probe, not real time).

5. Addendum 3, « page 12 les personnages traversent la racine ».

- Cause: the long surface root of the tree (built to cross the path for page 9) is a ridge 15 to
  22 cm high between the place of the gift and the house; both figures walked through it. The
  check written for it showed the same root crossed by Mila's feet on pages 2, 5 and 9.
- Fix, for every page at once (`world/puppet.ts`, `world/index.ts`): a planted foot now follows
  what stands on the ground. A ray is cast down from each foot against the solids Blender built
  (roots, trunk, walls, steps, furniture; not the ground itself); a foot that lands there stands on
  it, a foot that swings over it is lifted clear of it, toes included; anything taller than 30 cm
  is not a step and is left to the check. The root, the composition and the timelines are
  unchanged; Man Ninon's page 12 path ends 0.3 m further from the trunk, whose root flare is the
  tallest there.
- Check with a negative control (`qa/calebassier-sweep.mjs`, `info().feet[].over`): at every
  instant of every page, a foot more than 12 mm inside a solid is a fault. With the ground-following
  switched off in a scratch worktree (`s10/neg-roots-no-terrain.log`, exit 1): pages 2, 5, 9 and 12
  fail, feet 46 to 215 mm inside the root. On `1de7283`: no foot in a solid on any page.
- Before (`a3716b3`) above, after below: `evidence/s10-page12-roots-before-after.jpg`,
  `evidence/s10-page02-roots-before-after.jpg`.
- Limits: the check is on the feet and their shoes; legs, dress and carried props are not tested
  against the roots (the roots stand below the hems), and the figures' bodies against walls, trunk,
  furniture and painted cut-outs stay covered on the ground plan by the unit tests of owner
  feedback 1. Reduced motion shows the reading frame, where both stand on open ground. The dress
  does not react to a knee lifted over a root.

Results on `1de7283` (`s10/final-1de7283/`, run by a Sonnet subagent): every call exit 0, no
failure, no rerun.

- Real app against the real text (`framing`): 37 of 37 on each of 390x844 and 360x640 in
  Français, normal and reduced motion, each page also after turning the phone; 13 of 13 on each
  phone size in Kréyòl and on 1440x900. F1 holds.
- Edges and rendered visibility through time (`qa/calebassier-framing.mjs`, 0.25 s steps): 84 of
  84 on the seven screens. F3 and the page 1 gate hold.
- `escape` 17 of 17 (F2; the shell is unchanged since `875fb5d`), `journey` 32 of 32, `rapid` 19 of
  19, `touch` 13 of 13 (the three that exercise page changes under the new wash, quick turns
  included), `reduced` 13 of 13 (each page settled within 2 s), `resize` 21, `text` 25, `lifecycle`
  4 (heap 19.5, 20.2, 20.7 MB at cycles 1, 5, 10: +2.3 % from 5 to 10), `failure` 8, `contrast` 8,
  `shots` 6: all pass.
- Arms, hero and feet at every instant (`qa/calebassier-sweep.mjs`): 24 of 24 lines, desktop and
  phone identical. Arms: worst 16.2 mm (Mila, page 9; limit 18), Man Ninon between -11.9 and 0.0 mm:
  owner feedback 1 holds with the new dress and limbs. One hero calabash at every instant. Feet:
  never under the ground (lowest 0.8 mm above it), never in a solid (0 mm on every page), highest
  on open ground 184 mm for Man Ninon and 152 mm for Mila, flat-foot slide 0.0 to 0.1 mm except
  page 6 (3.9 mm) and page 8 (7.9 mm, the turn noted above).
- Page sheets of the real app refreshed from this build: `evidence/s8-pages-*.jpg`.

Underwater tale after the two options added to the shared figure (`shoes`, `limbs`, both absent
there). The pixel comparison could not give a clean answer in this cycle, and is reported as such:

- The stills of `qa/mila-underwater.mjs` were not reproducible on this machine during the cycle. A
  first subagent run of `a3716b3` against the original baseline files (`3ce9759`) gave 7 of 20
  identical, 3 desktop files within 24 pixels at 1/255, and the 10 mobile files different (87 000
  to 549 000 pixels); its rerun gave 0 of 20 identical.
- To separate the build from the machine, the executor served the untouched baseline build
  (`baseline/dist`, `3ce9759`) and rendered both builds back to back, twice, with no other QA
  browser running (`s10/underwater-today/`). The baseline build rendered today differs from its own
  baseline files on 20 of 20, and from itself between its two runs on 20 of 20. The instability is
  therefore not caused by this branch.
- In the one pair of runs where both builds came out in the same state (run 2 of each), the new
  build equals the baseline build on 18 of 20 files exactly; `desktop-p10.png` and
  `desktop-p10-scene.png` differ on 28 pixels by 1/255 (the same pair as in review 2, then 23
  pixels).
- What this supports: no difference attributable to the branch was found. What it does not: a
  repeatable pixel identity on 20 of 20. The code argument stands beside it: with neither option
  given, `buildMilaFigure` adds no mesh, takes no seeded draw and passes the same radius arrays;
  `src/books/mila/` is unchanged since `99a9f80`. The owner's dev server and browser were running
  on the same GPU during these runs; whether that is the cause was not investigated.

Negative control of the feet check (`s10/neg-feet-old-gait.log`): the same sweep on a scratch
worktree of `ff11440` with the previous swung gait fails 9 pages of 12 (shoes 15 to 19 mm under the
ground, flat-foot slides of 190 to 294 mm in 0.1 s). Evidence sheets ("after" gait and feet sheets
are `a3716b3`; the walk itself did not change in `1de7283` away from the roots): `evidence/s10-gait-ninon-p04`,
`-p10`, `-p12-before-after.jpg` (before `a6e1062` above, after below), `s10-feet-before-after.jpg`,
`s10-feet-closeups-before-after.jpg`.

Not done or not verified in this cycle: no unit test drives `plantedWalk` (it is checked in the
engine by the sweep); performance was not measured again (the wash adds one full-screen copy and
one quad during a change; the shoes add 14 small meshes); nothing was looked at on a real phone;
the gift on page 12 (D-GIFT) is as before; the underwater pixel proof is inconclusive (above).

### Answers to review 2 (Codex, `review-2.md`, on `486c002`; fixed in `a6e1062`)

Evidence of this cycle: `~/.local/share/contes-creole-qa/mila-calebassier/s9/`. Same browser and
renderer as cycle 1 (headless system Chrome 158 on the NVIDIA GPU; software renderers refused).

F3, the desktop foreground hides Man Ninon and her lantern during page 10's meeting. Fixed.

- Cause, the executor's own in cycle 1: a foreground cut-out is placed relative to the lens of the
  reading frame. When `486c002` made the page 10 lens hold the meeting before panning to that
  frame, the landscape cut-out (a 1.7 m leaf fan, 1 m right of the reading lens) was left where it
  was: seen from the held lens it stood before Man Ninon. Nothing checked what is drawn, only where
  subjects are.
- Fix (`staging.ts`, page 10 landscape): the cut-out is now the low plant, on the text side
  (`cell [0, 1]`, 1.5 m left of the reading lens, 0.8 m high). It is out of the held frame and
  slides in at the bottom left during the pan: the foreground and its parallax are kept, nothing
  stands between the lens and the two figures. The portrait shot has no cut-out, as before.
  Stills at 5.2, 6.5, 8.5, 10 s and the reading frame: `evidence/s9-page10-meeting-desktop.jpg`.
- Rendered check, as asked: `probe.visibility()` in the world draws the frame as the lens sees it
  into a small float picture, once whole, once without the subject, once with the subject alone,
  and returns the share of the subject's pixels that the subject really changes in the whole
  picture. A painted cut-out (with its transparency), a wall, a post or another figure standing
  before it all count; it is a measure of what is drawn, not a projection.
  `qa/calebassier-framing.mjs` reads it at every instant of every page on the seven screens and
  fails (rules in `qa/calebassier-subjects.mjs`) when: a face, or the fruit in Mila's hands, once
  readable (80 % of a face, 50 % of the fruit) stays hidden for more than 1.5 s or is hidden at the
  reading frame; or what a page tells is not readable at every instant while it is told
  (`WINDOWS`): page 10 from 5.2 s to the end, Man Ninon's face (80 %), her lantern (70 %), the hand
  that carries it (50 %) and Mila's face; page 1 from 3.8 to 6.4 s, both faces; page 12 from 5.6
  to 7.4 s, the gift and both faces.
- Every other page, the same way, desktop and landscape, over the whole action: no other
  foreground cut-out hides a face or the held fruit. The check found one older defect that is not a
  foreground: on page 1, on every screen, Mila stopped exactly behind the gate post as the lens
  sees it and was hidden (0 % drawn) for about 4 s, while she calls « Attendez-moi » and raises her
  hand. She now stops in the gate's opening (`world/pages.ts`, `P1_COME`/`P1_GO`: 6.9, 1.2 instead
  of 6.75, 1.6); she still passes behind the post for about 1 s each way, which the rule allows.
  Stills: `evidence/s9-page01-gate-desktop.jpg`.
- Results on `a6e1062` (`s9/final-a6e1062/`): sweep with the rendered check, landscape (1440x900,
  844x390, 640x360) 36 of 36 at 0.1 s steps; portrait (390x844, 360x640, 320x568, 412x915) 48 of 48
  at 0.25 s steps. The portrait sweep at 0.1 s steps did not finish within the 570 s limit of a run
  (twice: 43 and 42 pages passed, none failed, then the limit); it was run again at 0.25 s. App
  check against the real text: 37 of 37 on each of 390x844 and 360x640 in Français, normal and
  reduced motion; 13 of 13 on each of the two phone sizes in Kréyòl and on 1440x900. The page
  sheets `evidence/s8-pages-*.jpg` are refreshed from this build (the desktop one read by the
  executor).
- Negative control on `486c002`: the same check run on a scratch worktree of `a6e1062` carrying
  `staging.ts` and `world/pages.ts` of `486c002` (`s9/neg-visibility-486c002-staging.log`, exit 1,
  41 of 48): page 10 fails on the three landscape screens ("lamp not readable between 5.2 and
  11.5 s: 0 % drawn at 5.25 s (21 instants under 70 %)", the same for the carrying hand, Man
  Ninon's face down to 0 to 2 %), and page 1 fails on the four screens swept. Page 10 portrait
  passes there, as the review observed. The worktree is removed.
- Kept intact: F1 (results above), F2 (`escape` 17 of 17 on `a6e1062`; the shell is unchanged since
  `875fb5d`), owner feedback 1 (arms sweep 24 of 24 lines; page 1 Mila 12.8 mm, was 5.1, limit 18,
  from her new stopping point; every other page unchanged; one hero calabash at every instant; the
  figure-against-set tests pass in the 468). Also rerun on `a6e1062`: `journey` 32, `rapid` 19,
  `touch` 13, `reduced` 13, `shots` 6, all pass. Not rerun (unchanged code paths): `text`,
  `lifecycle`, `resize`, `contrast`, `failure`, and the regression of the other tales.
- What the check showed and was not changed (decision D-GIFT, and a limit):
  - page 12: the gift is readable in Man Ninon's hands from 5.6 to 7.4 s (57 to 89 % drawn on
    desktop). After she turns to Mila, then walks to the table with her back to the lens, her own
    body hides it: under 50 % in portrait from about 7.5 s, under 10 % at the reading frame on
    every screen. A reader with reduced motion sees only that reading frame.
  - page 11 portrait: the lantern is 61 % drawn at the reading frame, partly behind Man Ninon; the
    page tells the calabash going back to its branch, which is readable.
  - The rule asks for a prop where its page tells it, not everywhere; that choice is the
    executor's and is written in `WINDOWS`.
- Limits of the measure: it runs in the viewer, on the same world, lenses and cut-outs as the app,
  without the text card and without the finishing brush; a subject smaller than 12 pixels of the
  480-pixel picture is not measured; a subject whose colour equals what is behind it would be
  undercounted (not observed); bodies are not measured, only heads, hands, fruit, gift and lantern.

F4, "20 of 20 identical" does not match a raw comparison against the original baseline. Corrected
in the regression section above: the reference of the criterion is the original baseline
`3ce9759`, against which 18 of 20 are exactly identical and the two desktop page-10 images differ
on 23 pixels by at most 1/255; those two are exactly equal to the previous product's images, which
is the comparison the earlier sentence reported under the wrong name. Exact identity and tolerance
are now stated separately, and no cause is claimed for the run-to-run instability.

Acceptance after this cycle, where it changed: A07 fixed for F3 and checked by the executor on
`a6e1062`, not yet by a reviewer; A15 PARTIAL for the same reason. The other statuses are those of
review 2.

### Answers to the pilot's notes on S3

| #   | Note                                                 | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | watercolour is the main gap                          | Done in materials and layers: uneven drying (value and warm/cool drift) and wall washes pooling low, shade steps broken by the paper's tooth, aerial perspective per light key, foliage painted as lit and shaded masses, wet-in-wet sky blooms with granulation, dry-brush specks. Before/after: `evidence/s4-before-after-p03-p09.jpg` (left S3, right now). Still short of the boards: section E                                                                                                     |
| 2   | page 9: fruit beside the shoulder, hand on the chest | Two passes. First the carry was lowered to 0.78 m, which still read at shoulder height in the reading frame (her shoulder is at 0.90 m and the fruit is 0.21 m across), and her hands, kept clear of the dress, left the shell. Now (`7ed9c95`) the fruit is held in front of her belly at 0.68 m, just outside the flounces, with both hands on it, on pages 8 to 11: `evidence/s6-page09-reading-frame.jpg`. "Against her" is therefore a fruit held close in front of the dress, not pressed into it |
| 3   | page 3: attach point and transfer readable           | the branch brings the fruit by its stalk into frame, her hands rise to it, then take it; the branch stays bowed over her at the end. Same clip, landscape and portrait                                                                                                                                                                                                                                                                                                                                  |
| 4   | page 11: attach visible, then the whole tree         | the page starts on a medium shot of the raised fruit and branch A, pulls back and tilts to the whole tree; the wide frame is the end state. Same clip                                                                                                                                                                                                                                                                                                                                                   |
| 5   | foreground cut-outs not placed                       | placed per shot and per format in `staging.ts`, relative to each reading lens; parallax clips `s7/parallax/…`                                                                                                                                                                                                                                                                                                                                                                                           |
| 6   | captures with the real text card                     | `evidence/s5-pages-desktop-1440x900.jpg`, `s5-pages-phone-390x844.jpg`, `s5-pages-phone-360x640.jpg` (real app, Français), contrast measured on pages 1, 7, 9, 12                                                                                                                                                                                                                                                                                                                                       |
| 7   | push, draft PR, preview from S3                      | PR #54, preview `https://deploy-preview-54--contes-creoles.netlify.app`                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## E. Deviations, risks and limitations

Observed facts:

- Painted layers are scripted washes. They carry transparency, grain, pooled edges and value
  structure, but leaves, flowers and relief are stamped shapes: the reference boards' drawing is not
  reached. No image generator was available.
- Figures are smooth procedural volumes with soft shading; hands are mitten-like with short
  fingers. Contact with the fruit is positional (IK), fingers do not wrap the shell.
- Man Ninon walks with Mila's gait at her own measures; she has no clip of her own; her free hand
  does not hold Mila's.
- Architecture is plain; the bedroom has a bed, a bedside table and a window only. Man Ninon's roof
  eave is rough in close view.
- Page 12: the gift is small in the calm wide shot; the breakfast things are barely visible at that
  distance.
- Page change is a dip to paper, not a continuous camera move between neighbouring shots.
- Deep links to a page do not exist in the shell; "direct opening" is covered by mounting on any
  page index and by the state model (tested without WebGL in `pages.test.ts`).
- The dev viewer logs one 404 (its own favicon) on desktop contexts; the app does not.
- A subagent's headed Chrome window appeared on the owner's screen during the frame-time runs.
- Intermediate capture folders were sent to the trash by the executor and a subagent (mission H10).

Risks:

- Phone performance is unknown: two post-processing passes, 160 to 250 draw calls. The phone path
  lowers the pixel ratio to 1.5 and the brush radius; nothing was measured on a device.
- The Kréyòl draft may contain non-Guadeloupean or wrong forms; it is the default reading language
  of the shell, marked as a draft on every page.

Not verified:

- The tree card through `tree.mjs` (does not launch here); the end of `mila-nav.mjs` (timeout).
- Frame times, draw calls and weights after `7ed9c95`: the owner-feedback fix changes arm solving
  (a few more IK passes per arm on the CPU) and four cut-out positions, no asset and no shader.

## F. Repository state

- Branch `feat/mila-calebassier`, pushed to `origin` (alias `github-xgueret`). Draft PR #54. No merge,
  no production deploy. CI `quality` was green on `f476aa8`; later pushes re-run it.
- Commits: `0683636` docs, `99a9f80` shared Mila figure, `f476aa8` S3 checkpoint, `3cef379` S4,
  `bd5754d` wash refinements, `65b9988` assets equal to a rebuild, `f1143ff` QA script and text shade,
  `7ed9c95` belly carry, `8854187` QA scripts reading the shelf, `23236c7` owner feedback 1,
  `875fb5d` review 1 (framing, first Escape, new QA modes), `486c002` page 10 lens, `a6e1062`
  review 2 (page 10 foreground, page 1 gate, rendered visibility check), `ff11440` owner feedback 2
  (planted walk, first shoes, feet check), `a3716b3` its additions (light closed shoes, silhouettes,
  wash between pages), `1de7283` addenda 2 and 3 (straight back, feet over the roots), `a4903b0`
  review 4 F5 (whole shoe clear of solids), `fa914ca` its QA rule (the product commit this report
  describes), then this report.
- Local checks on `fa914ca`: `format:check`, `lint`, `typecheck`, `test` (58 files, 471 tests),
  `build` (the usual large-chunk warning): all exit 0.
- Local servers and browsers of this cycle are stopped.
- Mutating operations outside the worktree: evidence under `~/.local/share/contes-creole-qa/`, one
  new folder under the production folder's `sources/`. Nothing else.

## G. Decisions required

| Id      | Context                                                                                                                                            | Options                                                                                                                                                 | Recommendation                                                           | Blocking           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| MERGE   | draft PR #54                                                                                                                                       | merge after review / ask for corrections                                                                                                                | wait for the Codex review                                                | yes, owner only    |
| D-GCF   | Kréyòl draft shown by default                                                                                                                      | (a) have a speaker validate before merge; (b) merge with the draft label; (c) ship French only until validated (needs a small shell or registry change) | (a)                                                                      | before publication |
| D-NINON | Man Ninon procedural instead of a Blender rig                                                                                                      | keep / rebuild as a rigged GLB                                                                                                                          | keep                                                                     | no                 |
| D-GIFT  | page 12: at the reading frame the gift is behind Man Ninon, who walks away to the table (under 10 % of it drawn; it is readable from 5.6 to 7.4 s) | keep / carry it on the lens side or end the page before she turns (new arm poses to re-check against owner feedback 1)                                  | owner's call; not changed in the last cycle to keep the arm fixes intact | no                 |
| D-ART   | scripted washes against painted or generated layers                                                                                                | keep / replace layers with painted masters at the same sizes (the engine reads `rt_*.webp` by name)                                                     | owner's call; the pipeline accepts drop-in masters                       | no                 |

## H. Recommended next action

Pilot: `fa914ca` differs from the reviewed `1de7283` by `world/terrain.ts` (new) and its test, the
ground query in `world/puppet.ts`, the sole of each figure (`world/ninon.ts`, `world/mila.ts`), the
feet measure in `world/index.ts` and `qa/calebassier-sweep.mjs`. Route Codex review 5 on F5 and
non-regression. The owner can watch page 12 from 9.5 to 12 s, and pages 2, 5 and 9 where Mila
crosses the root. Merge stays the owner's.
