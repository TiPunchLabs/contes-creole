# Report — mila-calebassier

Verdict: PARTIAL
Version: 7ed9c95

Executor: Claude Code session, model id `claude-fable-5-2`. Layout and camera owner: the executor
(no camera subagent). Date: 2026-11-23/24.

## A. Executive summary

Objective: the complete twelve-page tale « Mila et le calebassier magique » as a new book of the
site, in a 2.5D watercolour universe built with Blender and read in Three.js, delivered as a draft
PR with a Deploy Preview.

Outcome: the twelve pages are built, integrated as book 3 of the tree, playable on the Deploy
Preview of draft PR #54, with sources, rebuild procedure, tests and evidence. Functional QA on the
product commit `7ed9c95`: 156 checks, 0 failed. The existing checks of the repository are green.

Why PARTIAL and not PASS:

- A15 asks for a Codex review on the final SHA: it is routed by the pilot after this report and has
  not happened yet.
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
  dependency added or upgraded, no change to the shell, the home tree or Ti Kannot.

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

| Task                                                                                       | Subagent model            | Result                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------- |
| Baseline checks, baseline build, underwater stills, Mila pages 1–6 at `3ce9759`            | Sonnet, isolated worktree | done                                                                   |
| Functional QA script, captures with the text card, weight, frame times, draw calls         | Sonnet                    | done; one check relaxed by the executor (ambient sway is not a replay) |
| Rebuild from the scripts twice, hash comparison, archive of the sources with a manifest    | Sonnet, isolated worktree | done                                                                   |
| Regression of the existing tales (pixel comparison, existing QA journeys)                  | Sonnet, isolated worktree | done                                                                   |
| Update of `qa/swipe.mjs`, `qa/mila.mjs`, `qa/tkp.mjs` for any shelf size, negative control | Sonnet                    | done                                                                   |
| Frame times, draw calls and weights on `7ed9c95`; third rebuild; refreshed archive         | Sonnet, isolated worktree | done                                                                   |

Art, staging, cameras, product code, shaders, Blender and painter scripts, tests and documents were
done on the executor's model.

## D. Verification and evidence

Evidence folders: `evidence/` in this folder (small sheets), and outside the repository
`~/.local/share/contes-creole-qa/mila-calebassier/` (`baseline/`, `s2/`, `s3/`, `s5/`). Renderer of
every capture and measurement: `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2,
OpenGL ES 3.2)`, system Chrome 158. Every "phone" below is an emulated viewport on this machine.

### Acceptance matrix

| AC  | What was verified                                                      | Method                                                                                                                                                                                                                                                                  | Observed                                                                                                                                                                                                                                                                                                        | Status                                                                    |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A01 | twelve pages, French text identical to `story.fr.json`, order, opening | vitest (`books.test.ts`), and DOM against JSON in the real app (`qa/calebassier.mjs` mode `text`, 25 checks)                                                                                                                                                            | identical, no normalisation needed; counter `n / 12`                                                                                                                                                                                                                                                            | VERIFIED                                                                  |
| A02 | canonical Mila reused                                                  | source moved, not rewritten: `src/shared/mila/` from `scene.ts` at `3ce9759` (lines 62–144, 1600–1611, 1854–2130, 2132–2582); underwater stills before/after; Mila pages 1–6 before/after sheet (`s5/regression/mila-pages/before-after.jpg`); captures of the new tale | underwater tale pixel-identical; in the new tale same build, colours and textures, this tale's materials (no rim light, paper grain). No dedicated face/profile/three-quarter turntable was made: the views come from the pages (page 9 front three-quarter, page 5 profile, page 3 three-quarter, page 2 back) | VERIFIED, turntable not made                                              |
| A03 | several calabashes in the branches, none on the trunk                  | build rule (no hanging point nearer than 1.3 m from the trunk axis), test "the built tree" on `assets.json`, captures                                                                                                                                                   | 13 fruits, nearest at more than 1.3 m, all above the fork                                                                                                                                                                                                                                                       | VERIFIED                                                                  |
| A04 | contemporary architecture, no wooden hut                               | Blender stills of both houses (`s5/architecture/houses-blender.jpg`), pages 1, 3, 4, 12                                                                                                                                                                                 | rendered masonry, slab, covered terrace on posts, ribbed metal roof with eaves, jalousies; no reference photographs were gathered (limit)                                                                                                                                                                       | VERIFIED                                                                  |
| A05 | coherent watercolour in 2D and 3D                                      | browser captures dusk, night, dark, dawn; before/after of pages 3 and 9                                                                                                                                                                                                 | coherent in one hand; drawing below the boards (section E)                                                                                                                                                                                                                                                      | PARTIAL, visual judgement                                                 |
| A06 | real depth in motion                                                   | `s5/parallax/parallax-p01-02-04-12-desktop.mp4` (camera moves over foreground cut-outs, mid masses, tree, far relief)                                                                                                                                                   | parallax and occlusion visible on entry moves; watched as frame strips by the executor, not as video                                                                                                                                                                                                            | VERIFIED by frames                                                        |
| A07 | cameras documented for the twelve pages                                | `staging.ts` (landscape and portrait, entry and reading lens, duration, intent, size, move, portrait priority, continuity), `preprod.md` shotlist, `plan-jardin.png`, graybox animatics `s2/animatic/*.mp4`, tests on the presets                                       | present and executable; axis rule tested                                                                                                                                                                                                                                                                        | VERIFIED                                                                  |
| A08 | taking, carrying, giving back are credible                             | `s5/gestures/gestures-p03-06-08-09-11-{desktop,portrait}.mp4`, time strips                                                                                                                                                                                              | hands follow the fruit, one fruit, attach point visible on pages 3 and 11; limits in section E                                                                                                                                                                                                                  | VERIFIED with reservations                                                |
| A09 | no regression of existing tales                                        | the five repository checks; underwater stills on a fake clock against the baseline; Mila pages 1–6; existing QA journeys on branch and baseline, three of them updated to read the shelf                                                                                | checks exit 0 (57 files, 459 tests; baseline 56 and 438); no regression; details below                                                                                                                                                                                                                          | VERIFIED; `tree.mjs` and the end of `mila-nav.mjs` not run (pre-existing) |
| A10 | robust, accessible navigation                                          | `qa/calebassier.mjs` on `7ed9c95`: modes `journey` (32), `rapid` (19), `touch` (13, CDP touch events), `reduced` (13), `resize` (21), `contrast` (8)                                                                                                                    | all pass; HTML text in the shared card; canvas `aria-hidden`                                                                                                                                                                                                                                                    | VERIFIED                                                                  |
| A11 | clean loading and closing                                              | mode `lifecycle` (11): ten open/close cycles, mode `failure` (8)                                                                                                                                                                                                        | heap after GC 19.5, 20.2, 20.5 MB at cycles 1, 5, 10 (+1.5 % from 5 to 10); one canvas; one live WebGL context; blocked GLB or texture shows the shell's notice and returns to the tree                                                                                                                         | VERIFIED                                                                  |
| A12 | performance measured                                                   | headed Chrome on the GPU, 20 s after 3 s warm-up                                                                                                                                                                                                                        | tables below                                                                                                                                                                                                                                                                                                    | VERIFIED on this desktop only                                             |
| A13 | sources and rebuild usable                                             | rebuild twice from the scripts in a clean worktree, sha256 comparison                                                                                                                                                                                                   | tables below                                                                                                                                                                                                                                                                                                    | VERIFIED                                                                  |
| A14 | provenance and licences                                                | `asset-register.md`, `art/mila-calebassier/README.md`                                                                                                                                                                                                                   | every file generated by the mission's scripts, nothing downloaded                                                                                                                                                                                                                                               | VERIFIED                                                                  |
| A15 | complete reviewable version                                            | PR #54 draft, Deploy Preview, CI                                                                                                                                                                                                                                        | PR and preview exist; Codex review not done yet                                                                                                                                                                                                                                                                 | PARTIAL                                                                   |

### Functional scenarios of spec 06 (commit `7ed9c95`, `s6/functional.log`, 156 pass, 0 fail)

| Scenario                                     | Result                                                                                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1→12 then 12→1, long wait on pages 3 and 11  | end states as expected on the 23 visits; after 25 s on pages 3 and 11 the state is unchanged and the picture differs by 1.05 to 1.39 / 255 (leaf sway)                                                                     |
| 2→3→4→3, 6→8→6, 10→11→12→11 quickly          | end on page 3 with the fruit in hands, page 6 with the fruit on the table, page 11 with the fruit on the branch; one fruit by construction                                                                                 |
| close during loading or a transition, reopen | reopens on page 1, one card, one canvas. Observed: an Escape pressed during the opening dive is ignored by the shell (pre-existing shell behaviour, same for every book); a second Escape leaves                           |
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
  baseline at `3ce9759`: 19 identical (mean absolute error 0), `desktop-p10` and its scene-only twin
  at 2.4e-08 normalised with no pixel over 2 %. The script's own determinism check gives the same
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

### Answers to the pilot's notes on S3

| #   | Note                                                 | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | watercolour is the main gap                          | Done in materials and layers: uneven drying (value and warm/cool drift) and wall washes pooling low, shade steps broken by the paper's tooth, aerial perspective per light key, foliage painted as lit and shaded masses, wet-in-wet sky blooms with granulation, dry-brush specks. Before/after: `evidence/s4-before-after-p03-p09.jpg` (left S3, right now). Still short of the boards: section E                                                                                                     |
| 2   | page 9: fruit beside the shoulder, hand on the chest | Two passes. First the carry was lowered to 0.78 m, which still read at shoulder height in the reading frame (her shoulder is at 0.90 m and the fruit is 0.21 m across), and her hands, kept clear of the dress, left the shell. Now (`7ed9c95`) the fruit is held in front of her belly at 0.68 m, just outside the flounces, with both hands on it, on pages 8 to 11: `evidence/s6-page09-reading-frame.jpg`. "Against her" is therefore a fruit held close in front of the dress, not pressed into it |
| 3   | page 3: attach point and transfer readable           | the branch brings the fruit by its stalk into frame, her hands rise to it, then take it; the branch stays bowed over her at the end. Same clip, landscape and portrait                                                                                                                                                                                                                                                                                                                                  |
| 4   | page 11: attach visible, then the whole tree         | the page starts on a medium shot of the raised fruit and branch A, pulls back and tilts to the whole tree; the wide frame is the end state. Same clip                                                                                                                                                                                                                                                                                                                                                   |
| 5   | foreground cut-outs not placed                       | placed per shot and per format in `staging.ts`, relative to each reading lens; parallax clip `s5/parallax/…`                                                                                                                                                                                                                                                                                                                                                                                            |
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
- The gesture and parallax clips in `s5/` predate the page-9 carry fix; they were not re-captured.

## F. Repository state

- Branch `feat/mila-calebassier`, pushed to `origin` (alias `github-xgueret`). Draft PR #54. No merge,
  no production deploy. CI `quality` was green on `f476aa8`; later pushes re-run it.
- Commits: `0683636` docs, `99a9f80` shared Mila figure, `f476aa8` S3 checkpoint, `3cef379` S4,
  `bd5754d` wash refinements, `65b9988` assets equal to a rebuild, `f1143ff` QA script and text shade,
  `7ed9c95` belly carry (the product commit this report describes), `8854187` QA scripts reading the
  shelf (no product file), then this report.
- Local checks on the final tree: `format:check`, `lint --max-warnings=0`, `typecheck`, `test`
  (57 files, 459 tests), `build`: all exit 0.
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

Pilot: route the Codex review on `7ed9c95` (later commits touch QA scripts and documents only). Safe to execute; no approval required for the review.
