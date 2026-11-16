VERDICT: CHANGES_REQUESTED
Version: c91eebc

Independent review, cycle 2. Full SHA: `c91eebca6e2b0b01837340ca6ed05a297b15cb22`.
The working product equals this revision. `3143928..c91eebc` changes only mission documentation/evidence, so the correction-cycle evidence applies to the reviewed product. `MEDIA` below means `/home/xgueret/.local/share/contes-creole-qa/home-visual-polish/`. Evidence paths are relative to this mission folder.

## Findings

- F1 [major] src/tree/scene/camera.ts:194 — Shelf clearance is fixed at the opening but lost during the climb. In the hash-verified `MEDIA/cycle1/final/climb-phone-landscape-t0.54.png` (844×390), only Lapen's ear tips remain above the shelf and Zanba's lower body is hidden. The corresponding `climb-phone-landscape-l-t0.54.png` (932×430) shows the same problem. These are actual full-view captures, not conservative bounding-box intersections. `treeCam` removes the correction entirely at t≥0.14; `openingStage` constrains destinations for the opening camera only. The 17-size layout check and 75-second motion measurements cover t=0 and cannot establish clearance during the climb. AC6 explicitly includes framing during animations. The audit acknowledges this at lines 619–620; existence on the base does not waive the mission criterion. — Correct the short-landscape composition/transition so the climb avoids these awkward shelf cuts while preserving tale access. Verify opening, intermediate climb states including t=0.54, end and return at both sizes. If preserving the existing spiral requires relaxing AC6, that decision belongs to the owner; the executor cannot treat it as an optional improvement.
- F3 [minor] docs/missions/2026-11-15-home-visual-polish/report.md:81 — The opening-only qualification now accurately limits the measurements, but the report's mandatory-unmet list still omits AC6 and relegates climb shelf occlusion to optional work. This makes the overall readiness accounting inconsistent with the full criterion and F1. — Mark full AC6 unmet and include the climb correction in mandatory remaining work until verified, or reference an explicit owner decision changing that requirement. Keep the useful distinction between verified opening checks and the remaining failure.

No additional motion, reduced-motion, disposal, text, navigation or dependency regression identified in the inspected changes. This is source/test/evidence review, not an independent browser or sustained playback certification.

## Previous findings

- **F1: not resolved in full.** Opening defect resolved: at 844×390 the recorded Lapen box ends at y=282 and Zanba at y=276, above shelf y=312. Independent camera projection places the Konteur's feet at y=294, an 18 px gap. Opening and rest captures corroborate this. Climb occlusion remains as described above.
- **F2: resolved.** Independently executed the actual TypeScript modules in memory. At 1200×1000 the camera is `(0.8, 1.6, -28.200373)`; at 1201×1000 it is `(0.804, 1.6, -28.187781)`: movement 0.013211 m, replacing the previous 6.5 m jump. Maximum camera-or-look movement over one-pixel width steps from 400 to 2400 at height 1000 is 0.026285 m. Passing unit tests cover both directions. Recorded live-resize sweeps have 81/45 steps and zero figure faults.
- **F3: not resolved in full.** Human playback gaps for AC2/AC3 are now explicit in the report, audit and mandatory next actions; that part is resolved. The remaining AC6 readiness accounting is described above. No request is made for the executor to manufacture human playback or phone evidence.

## Acceptance criteria

VERIFIED includes inspected executor evidence where stated, and does not grant artistic acceptance.

| AC   | Status       | Proof on the reviewed version                                                                                                                                                                                                                                                                                           |
| ---- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC0  | VERIFIED     | Preflight argv names Fable. Independent metadata-only transcript scan: all 518 assistant records report `claude-fable-5-2`.                                                                                                                                                                                             |
| AC1  | VERIFIED     | Inspected current before/after close-ups and Zanba turntable/silhouettes; Lapen close-ups show attached haunches and continuous painted belly, Zanba a continuous trunk and smooth skin. Sampled poses only; disclosed rump patch remains.                                                                              |
| AC2  | NOT_VERIFIED | New bounded turns, stance compensation, preserved hop height and in-place hops inspected; gait/turn tests pass. Three recorded 75 s runs contain 4,687 frames each. Human ×1/×0.25 playback and sustained perceptual judgment remain absent, correctly disclosed. Owner reservation, not grounds for changes requested. |
| AC3  | NOT_VERIFIED | Static integration supported by inspected captures and shadow code. Recorded stance drift is 0.008 m median, 0.019 m maximum on desktop/landscape; no Lapen ground travel. Continuous visual anchoring still shares AC2's playback gap.                                                                                 |
| AC4  | VERIFIED     | Inspected desktop greyscale/full views and mobile comparison. Nine-size contrast evidence reports all thresholds met, minimum 4.63:1 for the kicker at 800×600. This establishes sampled opening legibility, not all animation instants.                                                                                |
| AC5  | VERIFIED     | Current desktop/mobile before/after boards show a whole crown and separated opening figures. Three variants and selection rationale remain documented in AUDIT §8 and were inspected in review 1; correction-cycle product changes preserve that approach. Artistic preference remains the owner's.                     |
| AC6  | FAIL         | Opening clearance independently re-derived at 844×390, 932×430 and 360×640; 17-size recorded sweep passes the rerun checker; breakpoint fixed. Full criterion fails on the inspected t=0.54 landscape climb captures, F1.                                                                                               |
| AC7  | VERIFIED     | Procedural skins, foliage and retained photographic Konteur remain the actual mixed techniques. AUDIT §11.5 and inspected captures disclose their stylistic relationship; no artificial new 3D layer.                                                                                                                   |
| AC8  | VERIFIED     | Camera rejoins the existing spiral at t≥0.14, covered by passing tests. Gust modulation remains, with recorded wind evidence. All 43 behaviour results pass, including tale access and return. Climb composition failure is tracked under AC6.                                                                          |
| AC9  | NOT_VERIFIED | Recorded desktop capped median ≈59.9 FPS, p95 ≤16.8 ms, no >33 ms frames. Recalculated six same-session uncapped mean-FPS deltas: worst −2.74%, within −10%. Fresh build bundle names match production requests. Real average-phone ≥30 FPS remains untested; laptop GPU emulation is labelled.                         |
| AC10 | VERIFIED     | Inspected 43/43 behaviour results and preference-handling code: live change updates both critters, stops new travel, slows decor, reduces parallax and preserves useful journeys. Listener is removed on disposal. Browser results are executor evidence.                                                               |
| AC11 | VERIFIED     | Fresh typecheck/lint/build succeed; 372 tests in 52 files pass. Recorded other-page checks 24/24 pass; capture logs empty, baseline favicon 404 disclosed. Product scope and working-version checks pass.                                                                                                               |
| AC12 | FAIL         | This review names the integrated final revision, but AC6 still fails. Human/device reservations alone would not require executor changes.                                                                                                                                                                               |

## Commands run

- `git rev-parse HEAD`, `git status --short` → exit 0; exact SHA above; initially only supplied untracked `review-brief-2.md`.
- `git diff --stat ef821d2 c91eebc`, `git diff --stat 996f0e1 c91eebc`, `git diff --stat 3143928 c91eebc` → exit 0; inspected full scope and correction diff; last range is mission documentation/evidence only.
- `git diff --quiet c91eebc -- src package.json pnpm-lock.yaml` → exit 0; working product matches named version.
- `git diff --name-only ef821d2 c91eebc -- src/app src/shared src/books src/pages package.json pnpm-lock.yaml` → exit 0, empty. Product changes confined to `src/tree/`; other changes are mission artifacts and Python-bytecode ignore rule. Inspected diffs show no text/name/target/reading-order change.
- `git diff --check ef821d2 c91eebc` → exit 0.
- `node_modules/.bin/tsc --noEmit` → exit 0, no diagnostics; independently rerun standalone after the initial combined typecheck/lint command.
- `node_modules/.bin/eslint .` → exit 0, no diagnostics; also rerun standalone.
- `node_modules/.bin/vitest run` → exit 0; 52 files, 372 tests passed, 4.86 s.
- `node_modules/.bin/vite build --outDir /tmp/contes-creole-review2-build` → exit 0; 142 modules, main bundle `main-7eQnSA-b.js` matches recorded production evidence. Existing >500 kB chunk warning; external output-directory notice. Build output kept outside the repository.
- `node_modules/.bin/tsc -b --tsBuildInfoFile /tmp/contes-creole-review2.tsbuildinfo` → exit 1, TS5094: option may not be used with `--build`. Replaced with `node_modules/.bin/tsc --incremental --tsBuildInfoFile /tmp/contes-creole-review2.tsbuildinfo` → exit 0; same project typecheck with build metadata outside the repository.
- `python3 evidence/tools/layout_check.py evidence/c1-final-captures.json` (mission-relative paths) → exit 0; 17 opening sizes pass. Inspected checker: opening sweep only, not climb validation.
- `node` inline in-memory diagnostic → exit 0; TypeScript transpilation without emitted files, actual camera/math/ground/FOV modules and Three.js projection; breakpoint, one-pixel sweep and feet clearances reported above. Node emitted its Three.js CommonJS deprecation warning.
- `python3` inline manifest/JSON diagnostic → exit 0; all 1,208 C1 entries match size and SHA256; behaviour 43/43, pages 24/24. Separately recalculated uncapped mean-FPS deltas → exit 0, worst −2.74%.
- `python3` inline transcript metadata scan → exit 0; model counts above, no transcript body copied.
- Read brief/mission/review 1/report/audit, relevant source/tests and evidence scripts/JSON with `cat`, `sed`, `rg`, `nl`; inspected the named local images with `view_image`. No server started, network access, installation, permission widening or commit.

## Not checked

- Fresh live-browser resize, touch/keyboard journeys, GPU FPS/contrast capture, or mount/unmount leak profiling. Reviewed recorded evidence and code instead; no browser server was required or left running.
- Actual video playback at ×1/×0.25, sustained motion rhythm, every animated surface pose, physical-phone FPS and Xavier's artistic acceptance. These remain owner/device reservations.
- Complete historical action/deletion audit. Existing disclosures about scratch worktree, amendment and possible baseline analytics requests remain; this review performs none of those actions.

## Reservations

- Keep the mission PARTIAL. Human playback of AC2/AC3 and real-phone AC9 measurement remain mandatory verification gaps for the owner, separate from the actionable AC6 failure.
- The opening fixes and numerical motion evidence are substantial and supported. No further motion-code change is requested without a demonstrated defect; new tests pass, reduced-motion integration remains coherent, and source inspection finds attached resources disposed through the existing scene traversal.
- The smaller short-landscape tree, stationary portrait Zanba, faint rump patch and crown/compact-intro contacts are disclosed. Artistic acceptance and any decision to relax the full framing criterion belong to the owner. A review cannot infer that approval from the executor's report.
