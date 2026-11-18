VERDICT: CHANGES_REQUESTED
Version: a952d07

Reviewed `a952d0726af9b3c48899a9f44f9c1f99a3e1668c` against `d60c1a6`, including the changes since `9668453`. Product code is identical to `a425401`; subsequent changes are confined to QA and mission documentation. The major finding concerns the required O4 verification: its collision predicate has reproducible false negatives. It is not a claim that the observed fish necessarily penetrated Mila. Artistic acceptance is acknowledged and is not reopened.

## Findings

- Previous F1 [minor]: **RESOLVED**. `report.md` AC4 now correctly cites inspection of `underwater.ts:148–155`, explicitly says no automated test covers root anchoring, and distinguishes frame-sheet assessment from video playback.
- F2 [major] `qa/mila-clearance.mjs:131` — the clearance predicate can report separation when its own proxies penetrate beyond the stated 0.02 m tolerance. For two flattened spheres it replaces the first by an inscribed sphere; the capsule/ellipsoid branch at lines 137–141 stretches the capsule axis without accounting for its radius in the transformed metric. Direct execution of the committed function gives the counterexamples below. Consequently, zero counts cannot establish the mandated O4 clearance check. Coverage is also incomplete: lines 388–415 omit, for example, fish–crab, turtle–crab, turtle–conch and living-conch–ground checks, without a proof that those pairs cannot meet. **Expected fix:** use a sound distance or conservative collision predicate, demonstrate detection of known penetrations, cover the required pairs or justify exclusions with spatial bounds, and regenerate the affected before/after clearance results on the identified product version. Keep the proxy omissions explicit.
- F3 [minor] `src/books/mila/world/shoal.ts:228` — one sequential pair projection does not guarantee the stated separation invariant: later pairs can move an animal back into an already processed neighbour, and subsequent solid/limb/floor projections can undo pair separation. Three radius-0.1 swimmers with identical routes at `(0,-3,0)`, `dt=0`, no obstacles, floor `-10` and ceiling `0` finish with a pair gap of **−0.075 m**. Two at `(0,-0.15,0)` finish with **−0.05 m** after the ceiling clamp. These are valid solver inputs, including its initialization timestep. No occurrence on the actual observed routes was established, so this is minor robustness work rather than an independently demonstrated visible O4 failure. **Expected fix:** settle interacting constraints with a bounded correction strategy and cover crowded and boundary cases; do not rely on the existing isolated-obstacle/crossing tests as a general guarantee.
- F4 [minor] `docs/missions/2026-11-17-mila-underwater/report.md:96` — the verification table overstates its evidence. AC7 says later commits create no GL objects, but O5 adds, for example, the snout geometry at `scene.ts:2660`; the six-cycle heap evidence predates that change. O5 at line 103 is marked VERIFIED while explicitly disclosing that its full visibility wording is unmet. **Expected fix:** correct the resource rationale and use an accurate partial/not-verified status for the remaining O5 requirement, keeping the already accepted artistic result and the placement constraint explicit.

### F2 negative controls

These execute the actual `gap()` implementation extracted from the committed QA file, not a rewritten approximation. Negative signed clearance means penetration.

| Input | QA result | Actual axial signed clearance |
| --- | ---: | ---: |
| Flattened spheres: centres `(0,0,0)` and `(0.8,0,0)`, each `r=0.45`, `ry=0.15` | +0.20 m | −0.10 m |
| Point capsule at `(0,0.25,0)`, radius 0.10; flattened sphere at origin, `r=0.62`, `ry=0.18` | +0.141111 m | −0.03 m |

Both penetrations exceed 0.02 m and are missed. The supplied fish–fish capsule comparison is not affected by this particular ellipsoid error; neither are the observed improvements thereby disproved. The broader zero-overlap conclusion is unsupported.

## Acceptance criteria

| AC | Status | Proof on the reviewed version |
| --- | --- | --- |
| AC0 | VERIFIED | Accepted as pilot-supplied, as the brief directs: report AC0 records launch argv `--model fable` and transcript counts 493 Fable / 2 Sonnet requests. This is corroboration supplied by pilotage, not an independent transcript audit. |
| AC1 | VERIFIED | Local upstream checkout is clean at `a596354eff400d458bc2aeb9bdf5e0a9734b2bcf`. Compared the extinction/in-scatter and sway source with the scoped GLSL adaptations; `AUDIT.md` records the mapping and decisions. Origin comments and MIT notice remain in `underwater.ts` and the caustics patch. No upstream scripts executed. |
| AC2 | VERIFIED | Inspected the matched `boards-final/desktop-p07.png` comparison and the current mobile pages 7–10: stronger distance separation, readable text and distinct Mila. The water treatment remains in the reviewed source. Supplied boards are historical comparisons, not newly matched baseline captures. |
| AC3 | VERIFIED | Current real-clock sequences on pages 7–10 and both water transitions show changing caustics and coherent lighting without an observed flash, hard transparency edge or flicker at the sampled instants. Static inspection confirms the common refracted light direction and no additional fullscreen pass. This does not exclude sub-sample shimmer. |
| AC4 | VERIFIED | Current page-7/8 sequences show varied bending; inspection confirms the shared field, per-root phase/seed/flexibility, height delay and zero displacement at `h=0`. F1 is resolved. No claim of an automated anchoring test. |
| AC5 | VERIFIED | Independently traversed the real application forward through page 12, including 6→7 through 11→12, then backward to page 6. Captured every underwater page and transition. Mila and narrative lights remain legible; style is consistent. Independent successful motion coverage is mobile; desktop comparisons come from supplied evidence. |
| AC6 | VERIFIED | French switch succeeded on page 8; switched back to Kréyòl, resized to 1024×768 and back, completed backward navigation and returned to the tree. Scope diff is empty for story, audio, tree, app, shared code, other books, public assets and dependencies. The new fish offsets are local avoidance around the existing routes; scripted Mila/turtle/crab paths are unchanged by O4. O1/O3 height/pose changes are authorized. |
| AC7 | NOT_VERIFIED | Successful full journey plus three additional reduced-motion open/close cycles on this product. New cycles have identical live resource counts; every tracked Mila context is lost after return to the tree, with buffers/renderbuffers/VAOs deleted. No new page error was observed. However, no fresh JS-heap series or five-cycle resource series on the final product was completed; the supplied six-cycle heap series is on `3d09931`. Thus the whole leak criterion is not established. |
| AC8 | VERIFIED | Audited and recomputed the supplied headed RTX 4060 evidence for `1638c4c` versus `a425401`: capped median 59.88 FPS and p95 16.8 ms remain unchanged. See the performance assessment below for the real uncapped cost and the limited hardware scope. No headless FPS measurement was performed. |
| AC9 | VERIFIED | Existing low/reduced evidence plus source inspection: `thinSea` runs initially and on quality changes; depth/light remain at low quality, while plants/dust/shafts thin. Decorative sea clock and sway scale to 0.3 under reduced motion. Three fresh reduced-motion mounts reached page 1 and disposed successfully. An attempted desktop underwater reduced-motion run did not complete; no fresh desktop low-quality comparison is claimed. |
| AC10 | VERIFIED | Fresh direct installed-tool checks: TypeScript and ESLint exit 0, Vitest **54 files / 395 tests passed**, Vite production build exit 0, **144 modules**. Build output is outside the repository. Literal `pnpm build`/`tsc -b` was not rerun; typechecking and bundling were run separately. |
| O1 | VERIFIED | Current mobile entry sequence shows wading, increasing immersion and swimming without an observed surface walk or pose jump. `milaHeight` remains continuous at standing depth. Supplied rendered-bone probe on `1638c4c` reports zero fault frames; the entry logic remains in this version. Independent samples are not an every-frame foot/surface measurement. |
| O2 | VERIFIED | Uniform `TURTLE_SCALE=0.6` is applied once, retaining the course/heading. Current page-7 sequence shows the smaller turtle alongside Mila. Proportion is already artistically accepted. |
| O3 | VERIFIED | Current exit sequence shows the body becoming upright before wading onto land, without an observed airborne horizontal pose or height snap. The 3 m depth anticipation and separate eased pose are present. Supplied rendered probe improves 28 hips-out / 13 ankle-out fault frames to zero at `1638c4c`; that correction is retained. The short wade and brief hair-only interval remain visible and disclosed. |
| O4 | FAIL | The observed school keeps moving and is visibly improved around Mila; meaningful avoidance tests pass. Nevertheless, the expressly required comprehensive automated clearance verification fails its negative controls and omits pairs (F2). The supplied totals cannot establish all-form nonpenetration. F3 identifies an additional solver limitation, without asserting it occurred on the observed paths. |
| O5 | NOT_VERIFIED | The rebuilt shell/foot/stalk assembly and round pearl halo are supported by source inspection and matched supplied detail boards. Current mobile arrival/settled sequences confirm only a partial creature at the left edge, then no creature; pages 8 and 10 do not provide a readable view. Full normal-size visibility across the requested pages is therefore not established. Keeping its place is also binding: this review does not authorize a camera or placement change or reopen artistic taste. |

## Running-result evidence

Media root: `/home/xgueret/.local/share/contes-creole-qa/mila-underwater/review-2/`.

- Plain production build of the checked-out version, served on **127.0.0.1:4208**. Chrome **157.0.8103.78**, headless, processes launched under `nice -n 19`. The available renderer was **ANGLE / Vulkan SwiftShader**, not the laptop GPU. Successful normal journey: **390×844 CSS px, DPR 1**, resized to **1024×768** on page 8 and back. No performance inference is drawn from these runs.
- `runtime-live.json`: 120 timestamped captures, forward pages 3–12 after opening pages 1/2, backward pages 11–6, French and resize captures, and return to tree. No new page error; resource errors correspond to the known `/favicon.ico` 404. ReadPixels warnings are retained as environment warnings.
- `mobile-entry-000…016.jpg` and `mobile-exit-000…015.jpg`: successive captures spanning approximately **26.9 s** and **23.4 s** of wall time. Software rendering and the scene's clamped timestep slow wall-time transitions; these durations are not transition-performance figures.
- `mobile-p07-motion-*` through `mobile-p10-motion-*`: eight frames per page spanning approximately **11–13 s**. Reviewed those boards and the entry/exit and arrival boards. Grass tips and caustics change, the turtle advances, and fish continue moving around Mila. Screen-space occlusion by a fish is not evidence of physical penetration; no exact-mesh collision claim is made from a still.
- `mobile-to08-*`, `mobile-to09-*`, `mobile-to10-*`, `mobile-p08-fr.jpg`, `tablet-resize-p08.jpg`, `mobile-back-p*.jpg`: intervening transitions, language, resize and revisits. The conch's limited mobile framing is visible in `mobile-to09-board.jpg` and `mobile-p09-motion-board.jpg`.
- `cycles.json`, `cycle-1-book.jpg` through `cycle-3-book.jpg`: three additional **390×844, reduced-motion** mounts. Each active Mila context has textures/buffers/programs/framebuffers/renderbuffers/VAOs **38/1487/56/16/2/387**. After close each context is lost; remaining counters are **5/0/1/3/0/0**, with no accumulation on a live context. Context loss releases those residual handles; this is not a JS-heap measurement.
- `manifest.tsv` contains SHA-256 and sizes for the media-root files, excluding the scratch build directory. Six supplied comparison/clearance/conch boards were independently hashed against the committed executor manifest: all six matched.

Early probes failed or captured only the opening transition. The eventual mobile journey succeeded. A desktop/reduced-motion attempt was interrupted without a usable result. The transient `open-smoke.png` and `runtime-lowdpr.json` are not acceptance proofs. The dedicated server and browser sessions were stopped; port 5173 was not used.

## Code and performance assessment

- `shoal.ts` is deterministic for the same initial state and timestep sequence. It draws no random values and owns no animation loop or GPU resources. The reused numeric scratch buffer grows only to the maximum shoal size. Source disposal stops the existing loop and reaches the added conch geometries/materials through `disposeObject(scene)`.
- At maximum population, 100 independent fish plus 140 school fish give **28,680 neighbour pairs per sweep**, twice per frame, plus linear fish × solids/limbs work. Cheap coordinate rejections and buffer reuse limit cost, but there is no spatial index or low-quality reduction of this CPU work. The reported additional callback cost is plausible.
- The eight avoidance tests exercise unobstructed travel, rocks, moving limbs, crossing/queuing, bounds, inactive animals and repeatability. They are useful; they do not exercise F3's interacting constraints. Height/swim tests also pass.
- Recomputed medians across the supplied three uncapped runs: mean callback **1.961→2.534 ms**, **+0.573 ms / +29.2%**; mean FPS **484.63→375.85**, **−22.45%**; median FPS **588.24→384.62**, **−34.62%**. The often quoted −22% is the change in the median of run means, not the change in median FPS. p95 is **2.6→3.3 ms**, while p99 improves **9.1→3.8 ms** and >33 ms frames fall from median **19→0**.
- Thus the literal uncapped >10% numerical threshold is exceeded. I do **not** grade this as a material user-facing regression on the tested **60 Hz capped** laptop: capped median/p95 are unchanged, the added work is about 3.4% of a 16.7 ms budget, and the new uncapped runs remove the long stalls. This accepts the documented operating mode, not CPU cost neutrality or a promise for slower hardware. A real phone remains untested.
- Round-C profiles support stalls inside native GL calls, predominantly uniform uploads, rather than long scene JavaScript or GC. The absence of stalls in smaller-window runs supports the GPU/backpressure hypothesis, but the GPU process was not traced. The precise waiting mechanism remains an inference; neither the profiles nor the post-O4 disappearance prove it.

## Commands run

| Command/check | Exit | Result |
| --- | ---: | --- |
| `git rev-parse HEAD`; `git status --short` | 0 | Named SHA confirmed initially and after runtime work; only the supplied untracked brief existed before writing this review. |
| `git diff --exit-code a425401 a952d07 -- src` | 0 | Identical product source. Full later-commit stat contains only QA/mission files. |
| `git diff --exit-code d60c1a6 a952d07 -- 'src/books/*/story' src/tree src/app src/shared src/books/ti-kannot src/books/zanba src/books/konpe-lapen src/books/mila/world/audio.ts public package.json pnpm-lock.yaml` | 0 | Protected scope unchanged. |
| `git diff --check d60c1a6 a952d07` | 0 | No whitespace errors. |
| `node node_modules/typescript/bin/tsc --noEmit` | 0 | Typecheck passes. |
| `node node_modules/eslint/bin/eslint.js .` | 0 | No lint errors. |
| `nice -n 19 node node_modules/vitest/vitest.mjs run` | 0 | 54 files, 395 tests passed. |
| `node node_modules/vite/bin/vite.js build --outDir /home/xgueret/.local/share/contes-creole-qa/mila-underwater/review-2/build` | 0 | 144 modules; production build succeeds. Nonblocking external-output-directory and large-chunk warnings. |
| `node --input-type=module` inline extraction/execution of committed QA `gap()` | 0 | F2 counterexamples return +0.20 and +0.141111 despite penetration. |
| `node --input-type=module` inline import of `shoal.ts` and dense/boundary fixtures | 0 | F3 gaps −0.075 and −0.05 reproduced; no test/source file written. |
| `nice -n 19 uv run --with playwright python -u -i` | 1 on interruption | Completed normal journey, language, resize, backward journey and return to tree; subsequent desktop/resource attempt interrupted. Successful captures persisted separately. |
| `timeout --signal=TERM 180s nice -n 19 uv run --with playwright python -u -` | 0 | Three additional reduced-motion open/close cycles completed; no failure in `cycles.json`; browser explicitly closed. |
| Early bounded Playwright probes | 1 / 124 / 130; one smoke probe 0 | Missing cached Chromium executable; 30 s shelf/body waits and 60 s book-open wait expired; 90 s probe timed out; initial fake-clock probe interrupted. Installed `/usr/bin/google-chrome` was used subsequently. These failures are not classified as product defects. |
| Python manifest/hash and supplied JSON analysis | 0 | Capture hashes recorded; six supplied board hashes match; performance medians independently recomputed. |
| Final Python review/data validation; `git rev-parse HEAD`; `git status --short` | 0 | All 16 requested criterion rows present; three resource cycles completed without failure; SHA unchanged; only this review and the supplied brief are untracked. |
| Stop dedicated HTTP-server session; `curl --connect-timeout 2 -sI http://127.0.0.1:4208/` | 143 / 52 | Own server terminated; subsequent probe receives no HTTP response. |

## Not checked

- Fresh GPU-backed/headed performance, real-phone GPU behaviour, or a second machine. No GPU device was available to this sandbox and permissions were not widened. No headless FPS measurement.
- A completed native desktop underwater journey; desktop runtime attempts did not yield acceptance evidence. Current successful independent motion coverage is mobile plus the tablet resize; desktop matched boards and headed measurements are supplied evidence.
- Fresh every-frame bone/water-height probing or full-mesh intersection detection. Existing rendered probes, code and independent time-separated captures support O1/O3; the O4 checker must be repaired before its broader claim is usable.
- Fresh final-product JS-heap regression and five-cycle leak series. Three tracked additional mounts were completed; the longer supplied heap series predates O4/O5.
- Continuous native-speed GPU or quarter-speed playback. Independent observations used real-clock captured sequences; small one-frame jitter between captures cannot be excluded.
- Push, PR, preview, merge or production deployment: outside this review action. No commit or push was made.

## Reservations

- O5's repaired geometry reads better while visible, but normal-size visibility on all of pages 8–10 is not established, especially on mobile. The requirement to keep its place and the accepted artistic composition prevent treating an unsolicited relocation as the reviewer's remedy. Record the remaining requirement accurately rather than silently extending artistic acceptance to technical completion.
- Fresh heap coverage remains open. The report's claim that no GL objects were added after the old leak run is incorrect, although the inspected cleanup and new resource cycles show no accumulating live GL context.
- Retain the uncapped CPU-cost and hardware limitations even if capped AC8 is accepted. No extra heavy effect, engine change, or performance claim follows from this review.
- F2 must be resolved before treating the comprehensive O4 criterion as passed. The successful visual observations and passing unit tests do not repair a clearance predicate that misses known penetrations.
