# Report — mila-calebassier

Verdict: PARTIAL
Version: 486c002

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

Why PARTIAL and not PASS:

- A15 asks for a Codex review on the final SHA: review 1 was on `23236c7`; `486c002` changes the
  portrait and landscape framing and the shell's opening, and has not been reviewed yet.
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

| Task                                                                                                                           | Subagent model            | Result                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------- |
| Baseline checks, baseline build, underwater stills, Mila pages 1–6 at `3ce9759`                                                | Sonnet, isolated worktree | done                                                                                          |
| Functional QA script, captures with the text card, weight, frame times, draw calls                                             | Sonnet                    | done; one check relaxed by the executor (ambient sway is not a replay)                        |
| Rebuild from the scripts twice, hash comparison, archive of the sources with a manifest                                        | Sonnet, isolated worktree | done                                                                                          |
| Regression of the existing tales (pixel comparison, existing QA journeys)                                                      | Sonnet, isolated worktree | done                                                                                          |
| Update of `qa/swipe.mjs`, `qa/mila.mjs`, `qa/tkp.mjs` for any shelf size, negative control                                     | Sonnet                    | done                                                                                          |
| Frame times, draw calls and weights on `7ed9c95`; third rebuild; refreshed archive                                             | Sonnet, isolated worktree | done                                                                                          |
| Review cycle 1: every mode of `qa/calebassier.mjs`, framing sweep, negative controls, arms sweep, contact sheets, on `875fb5d` | Sonnet                    | done; found one remaining framing failure (page 10, 640x360 landscape), fixed by the executor |
| Review cycle 1: regression of Ti Kannot and the underwater Mila on the shell change                                            | Sonnet                    | done; `mila-lang.mjs` stopped by the time limit                                               |

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

Underwater stills (`qa/mila-underwater.mjs`, `ONLY=shots`), against the baseline's 20 files:
the 10 mobile stills are pixel-identical. The 10 desktop stills differed in a first run (up to
322 771 pixels) made while another QA browser was running on the same GPU, and are pixel-identical
(0 differing pixels on each) in a second run made alone. Two runs of the same build therefore
disagreed with each other on desktop; the baseline's own determinism log already shows one run of
three differing on desktop page 7. Read as: 20 of 20 identical in the clean run, with a
pre-existing run-to-run instability of the desktop stills that this cycle did not investigate.
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
| A15 | PARTIAL: review 2 on `486c002` to come                                                                                                                                        |

One touch device limit, pre-existing and unchanged: while a book is opening there is no control on
screen, so the cancellation is a keyboard gesture only.

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
  `875fb5d` review 1 (framing, first Escape, new QA modes), `486c002` page 10 lens (the product
  commit this report describes), then this report with `review-1.md` and `review-brief-1.md`.
- Local checks on `486c002`: `format:check`, `lint`, `typecheck`, `test` (57 files, 468 tests),
  `build` (the usual large-chunk warning): all exit 0.
- Local servers and browsers of this cycle are stopped.
- Mutating operations outside the worktree: evidence under `~/.local/share/contes-creole-qa/`, one
  new folder under the production folder's `sources/`. Nothing else.

## G. Decisions required

| Id      | Context                                             | Options                                                                                                                                                 | Recommendation                                     | Blocking           |
| ------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------ |
| MERGE   | draft PR #54                                        | merge after review / ask for corrections                                                                                                                | wait for the Codex review                          | yes, owner only    |
| D-GCF   | Kréyòl draft shown by default                       | (a) have a speaker validate before merge; (b) merge with the draft label; (c) ship French only until validated (needs a small shell or registry change) | (a)                                                | before publication |
| D-NINON | Man Ninon procedural instead of a Blender rig       | keep / rebuild as a rigged GLB                                                                                                                          | keep                                               | no                 |
| D-ART   | scripted washes against painted or generated layers | keep / replace layers with painted masters at the same sizes (the engine reads `rt_*.webp` by name)                                                     | owner's call; the pipeline accepts drop-in masters | no                 |

## H. Recommended next action

Pilot: route Codex review 2 on `486c002` (changed zones: `src/app/app.ts` and its test,
`src/books/mila-calebassier/staging.ts` and `world/index.ts`, the three `qa/calebassier*` scripts).
The owner can look at pages 4, 5, 9 and 10 on a phone on the Deploy Preview once it has rebuilt.
Safe to execute; no approval required for the review.
