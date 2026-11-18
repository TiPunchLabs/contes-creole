VERDICT: PASS_WITH_RESERVATIONS
Version: 6680878

Reviewed `66808785d2a1d55d74f9fd66cb6ce9ff422e3dba`, including the changes since `a952d07` and the protected-scope diff against `d60c1a6`. Production source is identical to `7ea9a488ef328642533461d373a3b9813478375a`. No blocker or major finding remains established. O5's outstanding framing requirement is treated as the nonblocking owner decision specified in this review's brief, not silently marked complete.

## Findings

- F1 [minor], from review 1: **RESOLVED**, unchanged since review 2. Root anchoring is correctly described as code inspection rather than an automated shader test.
- F2 [major], from review 2: **RESOLVED for the convex-shape predicate and pair coverage**. The two old false negatives now return **−0.10 m** and **−0.03 m**, including with the checker's early-exit threshold. Tests cover both, swapping arguments, tilted ellipsoids, capsules, known distances and randomized overlapping shapes. The new support-projection predicate is a conservative lower bound; all living/solid pair categories are now dispatched through the general body loop, with AABB rejection and explicit measured counts. Regenerated current-product results and their raw files agree. Ground remains a sampled approximation, with the minor qualification F5 below.
- F3 [minor], from review 2: **RESOLVED for the reported cases and bounded-settling requirement**. The original three-swimmer fixture now has minimum gap **−0.000075563 m**, within `SETTLED=0.0002 m`; the ceiling fixture has zero gap to numerical precision. Four added crowd tests include the original fixtures, a mixed floor/rock/limb case, and a moving packed school. The implementation is bounded and deterministic; it does not claim instant convergence for every arbitrarily dense crowd. The dozen-swimmer fixture explicitly allows continuation over subsequent steps.
- F4 [minor], from review 2: **RESOLVED**. AC7 now cites a fresh five-cycle series on `7ea9a48`, acknowledges the conch's added resources and reports the positive heap trend. O5 is explicitly PARTIAL, with the visibility and placement limits retained.
- F5 [minor] `qa/mila-clearance.mjs:413` — the ground early-out is described more strongly than its calculation supports. `maxSlope` is the largest sampled **axis component** of a finite difference, not a conservative bound on height variation in an arbitrary horizontal direction. On the current source, the same grid gives maximum gradient-vector norm **0.772738**, above the stored **0.771780**. Neither that grid nor the finite surface samples certify every terrain extremum. **Expected fix:** use a conservative height-variation bound for this rejection, or remove it; retain an explicit distinction between sampled ground clearance and the conservative convex-pair predicate. Severity is minor: no missed >2 cm penetration on the actual reviewed trajectories was established, and the denser conch-ground check below remains within tolerance.

## Acceptance criteria

| AC | Status | Proof on this version |
| --- | --- | --- |
| AC0 | VERIFIED | Carried forward pilot-supplied model corroboration accepted in review 2: Fable launch argv and transcript model counts, retained in the report. Not a new independent transcript audit. |
| AC1 | VERIFIED | `underwater.ts`, its MIT/origin notices and the upstream mapping are unchanged by this correction cycle. The upstream study at `a596354eff400d458bc2aeb9bdf5e0a9734b2bcf` was independently checked in the earlier reviews. |
| AC2 | VERIFIED | Prior matched depth/colour comparisons remain applicable to the unchanged water treatment. Current pages 8–10 and the resized page 9 retain clear Mila/text and distance separation. |
| AC3 | VERIFIED | Lighting/caustics source unchanged since the successful time-separated review-2 observations. Current page-8 sequence shows changing light without an observed flash or transparency edge. This fresh run uses reduced motion and does not certify high-frequency shimmer. |
| AC4 | VERIFIED | Shared current, height-dependent flexible sway and zero root displacement remain unchanged. Current page-8 sequence shows moving tips with stable planting; stronger normal-motion observations are in review 2. |
| AC5 | VERIFIED | Fresh real-application traversal through pages 8, 9 and 10, fish sequence on page 8, page-9 resize and return to tree; supplied current-product conch/crab comparisons inspected. No new visible seam, detached part, pose pop or rendering artifact was identified in that coverage. Review-2 full normal journey remains relevant to unchanged transitions. |
| AC6 | VERIFIED | Protected-scope diff against `d60c1a6` is empty. Current-product journey evidence reports 24 successful steps per viewport; reviewed source changes preserve scripted routes and headings. Crab height and the conch's local settling/tilt are contact corrections, not a narrative relocation. Prior independent language/backward checks remain applicable to the unchanged navigation. |
| AC7 | VERIFIED | Fresh supplied five-cycle series on the identical product source, both viewports: constant active GL counts, zero live Mila GL counts on the tree, contexts created/lost balanced. Independently recomputed all four heap slopes and checked raw-data identity/hashes. This verifies the bounded regression protocol, not zero heap growth or absence of every possible JS leak; see reservations. Current short run also has no new page error. |
| AC8 | VERIFIED | Current headed RTX 4060 capped run: desktop median 59.88 FPS; phone layout 57.47 versus earlier 59.88, about −4.0%, below the mission's >10% median threshold. No new long-frame/p95 hitch was demonstrated. Source changes make the reported lower typical solver cost plausible, but the Node benchmark is not a browser timing proof. One run and no real phone remain explicit limitations. No headless FPS measurement was performed. |
| AC9 | VERIFIED | Adaptive/reduced-motion integration is unchanged. Fresh reduced-motion traversal and fish sequence succeed. Added settling uses the existing update/timestep and does not add an animation loop or bypass the existing motion controls. Low-quality visual evidence is carried forward; no fresh forced-low comparison was made. |
| AC10 | VERIFIED | Fresh TypeScript, ESLint, Vitest and Vite checks all exit 0: **55 test files, 405 tests passed**. The geometry QA tests are included in that run. Production build output is outside the repository. |
| O1 | VERIFIED | Entry choreography and height/pose logic are unchanged by this cycle; review-2 running sequence and the retained rendered-bone probe remain applicable. Not remeasured frame by frame in this short review. |
| O2 | VERIFIED | Turtle scale/course unchanged. Prior independent page-7 observations remain applicable. |
| O3 | VERIFIED | Exit anticipation and pose/height logic unchanged; review-2 running exit and retained rendered probe remain applicable. No fresh normal-speed exit capture. |
| O4 | VERIFIED | Corrected predicate, pair dispatch and negative controls; current raw runs have **53 categories**, **16,657 desktop / 16,661 mobile frames**, 34 segments each, no probe error and no counted >2 cm overlap. Counts match the committed summary. Fish–fish closest gaps are positive; only the conch's small intentional sand contact consumes tolerance. This is verification within the stated proxies, sampled ground, times and tolerance, with F5 remaining minor; it is not a full-mesh or continuous-time theorem. |
| O5 | NOT_VERIFIED | Geometry/contact repairs inspected in source, current running captures and matched supplied boards. Normal-size visibility on all of pages 8–10 remains PARTIAL in the reviewed report: placement is kept and the owner decision is pending in the brief. Per that brief, this is not a finding against this version. |

## Clearance and solver assessment

For a unit direction `n`, the support calculation returns the greatest projection of A and the least projection of B. Their separating slab gap cannot exceed the true signed convex gap. Taking the largest of finitely many such values is still a lower bound. An incomplete search can therefore produce a false alarm, but cannot turn a >2 cm convex-proxy penetration into an accepted result. Early exit only occurs once that lower bound reaches `−TOL`. Rotated ellipsoid support and AABB extents are calculated from transformed half-axis vectors; the capsule/capsule branch uses segment distance. The old inscribed-sphere substitution and unscaled-radius error are gone.

The body list is ordered with all six living categories first; its general loop visits each relevant living/living and living/solid pair. The 0.3 m AABB proximity rejection is conservative for those proxy boxes. A category with `measured=0` now explicitly means it never reached the narrow phase, rather than suggesting it was repeatedly measured clear. Of the 53 categories, 37 desktop and 36 mobile have zero narrow-phase measurements in the after runs. The raw segment records contain no overlap categories, not merely an empty summary list.

The **2 cm tolerance is honest as a proxy-check threshold**: it does not mean zero geometric intersection. Current reported conch-ground minimum is **−0.0079175 m**, while crab-ground is **+0.008381 m**. I evaluated the current `groundH` source against **30,000 surface directions for each of the nine conch proxy parts**: minimum **−0.008153 m**, still comfortably inside 2 cm. The crab's 4 cm rise addresses the earlier roughly 3.2 cm shell penetration. The conch is tilted and locally settled along the sand; its nine-height fit runs at construction, not per frame. Its normal-directed settling offset is not a change of narrative place or heading.

Limits remain material to the wording: bodies are simplified proxies, some appendages are excluded, non-spherical mesh proxies use 85% of their own bounding boxes, ground surfaces are finitely sampled, and simulation frames do not prove absence of between-frame tunnelling. F5 concerns the ground rejection specifically; the conservative convex-pair argument must not be extended to it.

The solver makes a padded close-pair list and reuses it for steering and settling. Padding is twice `SLACK`, with rebuilding after a swimmer travels beyond `SLACK`, so previously distant swimmers cannot become touching while both remain inside that allowance. Numeric scratch arrays are reused and bounded by the maximum shoal size. At most 12 settling rounds run, with at most four wall passes per swimmer in a round; no second animation loop or new GPU resource is introduced. Worst-case work can exceed the old single sweep in a deliberately packed crowd, and finite alternating projections are not a universal collision guarantee. Current regenerated route evidence and the added tests support the application's actual paths; no new visible freezing or jitter was established in the sampled sequence.

## Resource and performance assessment

The leak method uses one page/context per viewport, repeatedly opens the tale, reaches page 8, waits, samples GL counts and heap after forced GC, returns to the tree, waits two seconds and samples again. Counter entries use weak references to contexts. The incremental rows, raw JSON and report agree.

| Measure | Desktop | Phone layout |
| --- | --- | --- |
| Active GL textures/buffers/VAOs/programs/framebuffers/renderbuffers, every cycle | 40 / 1487 / 874 / 66 / 19 / 6 | 38 / 1487 / 387 / 56 / 16 / 2 |
| Live GL objects on the tree | All zero, 5/5 cycles | All zero, 5/5 cycles |
| Created/lost contexts on final tree sample | 5 / 5 | 5 / 5 |
| Recomputed heap slope, tale / tree | +0.436 / +0.292 MB/cycle | +0.392 / +0.221 MB/cycle |

Stable GL pools and balanced context loss support the GL cleanup conclusion. They do not prove that every handle was explicitly deleted before context loss; losing the context also frees its GPU allocation. JS retention is positive, not zero. The old desktop series measured approximately +0.407 / +0.261 MB/cycle, with similar growth on baseline. Five new samples do not establish a material new leak, a plateau, or its cause. The report now states this accurately; the strengthened result is acceptable for the requested bounded comparison with that reservation.

The capped mobile result is a real observation, not something to dismiss because the Node benchmark improved. Its approximately −4.0% median change and p95 18.2 ms, with no frame beyond about 21.3 ms, do not establish the specified material regression. Desktop remains at the earlier capped cadence. The claimed **0.43→0.31 ms/step** is executor-supplied Node timing; the reduced normal-case neighbour work makes it plausible, but I did not reproduce that benchmark or infer whole-browser cost from it. The previous uncapped cost remains disclosed; there is no fresh uncapped result on this product. Real-phone hardware is still untested.

## Running-result evidence

Media root: `/home/xgueret/.local/share/contes-creole-qa/mila-underwater/review-3/`.

- Fresh plain production build, localhost **4209**, Chrome **157.0.8103.78**, headless **SwiftShader**, browser launched under `nice -n 19`. **390×844 CSS px, DPR 1, reduced motion**; page 9 also resized to **1024×768**. This is functional/visual coverage only, not GPU performance or a real phone.
- `runtime.json`: successful opening, pages 2–10, return to tree and explicit browser closure; no page exception. Only the pre-existing `/favicon.ico` 404s and ReadPixels environment warnings were captured.
- `mobile-p05-crab.jpg`, `mobile-p8.jpg`, `mobile-p9.jpg`, `mobile-p10.jpg`, `tablet-p09.jpg`, `pages-board.jpg`: current contact/framing stills. The lambi remains partial at the mobile edge and reads as an assembled shell/foot/stalk creature where visible; its existing framing limit is retained. No new gap, visible seam or transparency artifact was identified.
- `mobile-p08-motion-000.jpg` through `007.jpg`, `motion-board.jpg`: eight successive real-clock captures spanning **8.52 s**. Fish continue around Mila and the school remains active. This sampling cannot exclude one-frame jitter or distinguish every projected overlap from physical penetration.
- Inspected supplied `boards-c2/conch-desktop.png` and `crab-desktop.png` against their matched earlier product: crab shell clearance is improved; the conch retains its assembly with a slight slope tilt. The dark floor prevents measuring contact accurately by eye; the numerical check supplies that proof within its limits.
- Nine supplied artifact hashes checked against the committed manifest: four conch/crab boards, both after-clearance raw files, the solids file, leak raw data and capped-performance raw data; all match. The raw clearance checks/frame counts, leak data and perf data agree with their committed summaries. `c2-dist/BUILD_SHA` and `c2-probe-dist/BUILD_SHA` identify `7ea9a48`.
- `manifest.tsv` records hashes and sizes for the 16 independent media/data files, excluding the scratch build directory. Own server and browser were stopped. Port 5173 was not used.

## Commands run

| Command/check | Exit | Result |
| --- | ---: | --- |
| `git rev-parse HEAD`; `git status --short` | 0 | Exact named HEAD confirmed before and after checks; see the concurrent-document note below. |
| `git diff --exit-code 7ea9a48 6680878 -- src` | 0 | Identical product source. Later commits inspected: QA and mission documentation only. |
| `git diff --exit-code d60c1a6 6680878 -- 'src/books/*/story' src/tree src/app src/shared src/books/ti-kannot src/books/zanba src/books/konpe-lapen src/books/mila/world/audio.ts public package.json pnpm-lock.yaml` | 0 | Protected scope unchanged. |
| `git diff --check a952d07 6680878` | 0 | No whitespace errors. |
| `node node_modules/typescript/bin/tsc --noEmit` | 0 | Typecheck passes. |
| `node node_modules/eslint/bin/eslint.js .` | 0 | Lint passes. |
| `nice -n 19 node node_modules/vitest/vitest.mjs run` | 0 | **55 files / 405 tests passed**, including gap and crowd tests. |
| `node node_modules/vite/bin/vite.js build --outDir /home/xgueret/.local/share/contes-creole-qa/mila-underwater/review-3/build --logLevel warn` | 0 | Production build succeeds. Nonblocking external-output and large-chunk warnings. Typecheck and bundling were run separately; no claim of rerunning literal `pnpm build`/`tsc -b`. |
| `node --input-type=module` inline imports of committed gap/solver and original counterexamples | 0 | F2 returns −0.10 / −0.03 m; F3 returns −0.000075563 / approximately 0 m. No source/test file modified. |
| `node --input-type=module` inline evaluation of current terrain/noise source and supplied conch proxies | 0 | Dense conch-ground sample −0.008153 m; sampled gradient norm exposes F5's component-bound limitation. |
| `timeout --signal=TERM 200s nice -n 19 uv run --with playwright python -u -` | 0 | Short real-application run completed, no failure in `runtime.json`, browser explicitly closed. No FPS recorded. |
| Python raw-data/hash/slope/manifest checks and contact-sheet assembly | 0 | Raw summaries agree; four slopes recomputed; nine supplied hashes match; 16 independent artifacts indexed. |
| Stop own HTTP-server session; `curl --connect-timeout 2 -sI http://127.0.0.1:4209/` | 130 / 52 | Server interrupted normally; subsequent probe has no HTTP response. |

The `.prettierignore` addition `docs/missions/*/review-*.md` is acceptable: it preserves received review material, including review briefs, without excluding product code from lint/type/test/build checks. There is no runtime effect.

At final status inspection, `mission.md` had acquired an **external uncommitted O5-PLACE log entry**. It was not present at initial status, is not part of `6680878`, was left untouched, and was not used to change this review's O5 status or infer a new authorization. The reviewed committed contract and the supplied review brief remain the basis of this verdict. No product/source change appeared during the review.

## Not checked

- No full independent rerun of the roughly 33,000-frame after-clearance series; its implementation, raw results, hashes, counterexamples and selected contacts were checked instead.
- No fresh independent five-cycle leak run; the current-product supplied series was audited and recalculated. Prior review-2 independent resource cycles are supporting context, not a substitute for this fresh supplied series.
- No independent headed GPU timing, uncapped timing, real phone, second machine, or headless FPS measurement.
- No complete fresh normal-motion journey or continuous/quarter-speed playback. The requested short current-product check used reduced motion; the unchanged entry/exit logic retains review-2 coverage.
- No full-mesh/appendage collision guarantee, continuous-time collision detection, or certified global terrain bound. These are outside what the finite proxy measurements prove.
- No push, commit, PR, preview, merge or production action was performed.

## Reservations

- Fix or accurately qualify F5's ground-rejection bound. The convex-pair lower-bound proof is valid; the same proof does not cover a sampled terrain surface.
- Preserve the positive heap trend and single-run performance limitation in delivery reporting. Stable live GL counts do not prove zero JS retention; a faster Node kernel does not prove phone performance.
- The solver has finite correction rounds and therefore finite convergence limits. Its current route evidence is substantially stronger than a universal claim that arbitrary overlapping constraints always settle in one frame.
- O5 remains PARTIAL/NOT_VERIFIED on the reviewed version under this brief, without a new finding against the accepted composition. Any later owner decision should be recorded against its own document/version, rather than attributed retroactively to `6680878`.
