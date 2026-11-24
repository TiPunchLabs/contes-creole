VERDICT: CHANGES_REQUESTED
Version: 23236c7224ce6537c9ee9f213792fd7dbc656d80
Reviewer: codex

## How I drove the UI

Reviewed an archive of the exact product SHA in `/tmp/review-calebassier-23236c7`. HEAD `f82bebf6907d74c448e8f6c529287f2fdcaa8187` has no differences in `src`, `art`, `qa`, `package.json` or the lockfile. Served the archive's production build at `127.0.0.1:4288` and its development-only scene viewer at `127.0.0.1:4287`, using `nice -n 19`.

Used Playwright 1.58.2 with headless Chrome 158.0.8127.36. Renderer: ANGLE Vulkan SwiftShader (Subzero), **not a hardware GPU**. No performance conclusion comes from this review's browser runs. Input checks used actual shelf presses, reading buttons, keyboard, wheel and CDP `Input.dispatchTouchEvent`; no internal page function was used to satisfy a navigation check.

The supplied QA harness refuses SwiftShader. Scratch-only adaptations allowed functional runs, waited for the shelf's actual `is-near` state, and accommodated the loader being removed. For input checks, DPR was reduced to 0.2 desktop / 0.3 phone and WebGL draw calls were suppressed between screenshots; screenshots temporarily restored drawing. These checks establish UI/state behaviour, not normal rendering latency or GPU performance. Two initial rapid-settle timeouts were rerun with 90 seconds instead of 15 seconds: all 19 rapid checks then passed. A duplicate journey in the combined run was interrupted; the separate complete journey is the result used below.

Separately captured and visually inspected **all twelve pages at each of 1440×900, 390×844 and 360×640, DPR 1**, with the real French reading UI and reduced motion. Normal-motion engine samples also confirm the portrait cropping in F1. The scene viewer was used separately for animation/geometry inspection, including 277 samples over all twelve timelines and independently captured frame strips for pages 3, 5, 10 and 11 in both formats.

Evidence root, abbreviated **E** below: `/home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/`. Reviewer harnesses are preserved in `E/harness/`; product code was not edited.

## Findings

- **F1 [major] `src/books/mila-calebassier/staging.ts:184` and `:290` — portrait cameras crop the story object and a hand — reframe the complete action for narrow portrait aspect ratios.**

  Journey: open the built tale, choose Français, use the next button to pages 5 and 10, and wait for the final state at **390×844**. On page 5 a substantial part of the calabash is outside the left edge. On page 10 the carried calabash and its hand contact extend outside the left edge. This is also visible in the normal-motion portrait engine strips, so it is not specific to reduced motion or a screenshot taken during a transition. The same final states fit better at 360×640: the presets do not sufficiently accommodate the taller aspect ratio.

  Proof: [page 5](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/captures/phone-p05.jpg>), [page 10](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/captures/phone-p10.jpg>), normal-motion [page 5 strip](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/strips/tall-p05-sheet.jpg>) and [page 10 strip](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/strips/tall-p10-sheet.jpg>). Commands: `VP=phone node qa/review-captures.mjs` and `node qa/review-strips.mjs` in the scratch copy.

  Expected fix: adjust portrait target/distance/FOV with the actual aspect ratio and reading offset, preserving the whole calabash and required hands throughout the move and final pose. Verify normal and reduced motion at both phone sizes and after orientation changes. This fails A07's portrait framing/subject priorities and the requirement that hands, face and object remain visible. It is a framing defect, independent of D-ART.

- **F2 [major] `src/app/app.ts:272`; misleading check at `qa/calebassier.mjs:517` — Escape cannot cancel asset loading — honour one cancellation and reject late mounting.**

  Independent case: hold the three GLB responses with Playwright routing, open the tale through its shelf button, wait for `Le jardin se dessine…`, press Escape **once**, wait 1.2 seconds, then release the responses. The book attribute remains `mila-calebassier`, and the reading UI opens after release. A second Escape is required to return to the tree. See `E/cancel.json`, `E/cancel.log` and `E/harness/review-cancel.mjs` (`node qa/review-cancel.mjs`, exit 0 recording this negative result).

  Cause: `leave()` rejects the request while mode is `dive` and before `book` exists. The pending `world.mount()` then completes without a cancellation guard. This shell limitation predates the mission, but the mission explicitly requires closing during loading; no owner waiver for that requirement is in force. It therefore remains an integration acceptance failure, not a claimed regression introduced by the new book.

  The supplied lifecycle test presses Escape a second time when needed, then passes literal `true` to the opening-close check. Its green result does not demonstrate cancellation. The report acknowledges the ignored key but still marks A11 VERIFIED.

  Expected fix: accept cancellation during opening/loading, return to the tree, and dispose/ignore any late mount result without reopening or retaining handlers/resources. Assert the outcome of the **first** cancellation without a corrective second Escape. Preserve existing-book behaviour through regression checks. A11 fails until this is fixed or explicitly waived by the owner.

## Acceptance criteria

`NOT_VERIFIED` includes demonstrated failures, identified explicitly below; it does not imply that every unverified area contains a defect.

| AC | Status | Proof on the reviewed version |
| --- | --- | --- |
| A01 | VERIFIED | French DOM comparison and counters: 25/25 checks; complete 1→12→1 journey: 32/32. Page 12 has the specified bowl conclusion. `E/inputs-completed-modes.log`, `E/journey/results.json`. |
| A02 | VERIFIED | Canonical figure extraction inspected against `3ce9759`; independent construction comparison gives 122 meshes on each side, equal geometry/transforms/material colours and 180 seeded draws on each side. `E/extraction-build.json`; own profile/three-quarter captures. This comparison stubs texture/GPU effects and the unchanged conch geometry; it is not a fresh pixel comparison. |
| A03 | VERIFIED | Rebuilt tree/report agree with the committed assets; branch-only placement tests pass in the 462-test suite; own canopy views show several fruits above the fork, not on the trunk. |
| A04 | VERIFIED | Own pages 1, 3, 4 and 12 show rendered masonry, covered terraces, posts, shutters and metal roofs. Both house meshes are generated by the inspected/rebuilt scripts. |
| A05 | VERIFIED | Technical visual review of 36 full-size captures and both motion formats: coherent palette/material treatment, readable facial features, no additional actionable sorting/fringe/z-fighting defect established. Drawing and scene richness remain substantially below the boards; D-ART is the owner's decision. F1 is recorded separately. |
| A06 | VERIFIED | Independent frame strips show different movement/occlusion of foreground, figures/tree, houses and distant masses under the prescribed camera moves. `E/strips/*-sheet.jpg`; scene is not twelve flattened pictures. |
| A07 | NOT_VERIFIED | All twelve desktop/portrait presets, camera ownership, shot documentation and external graybox animatics are present. **Framing fails F1** at the required 390×844 size. Preset existence alone is insufficient. |
| A08 | VERIFIED | One hero at all 277 sampled instants; branch→carry→table→carry→branch ownership through forward/reverse UI journeys; all three rapid sequences pass with generous settle timeouts. Independent pages 3/11 strips show handover and return before the wide reveal. Page 9 is a belly carry; page 12 uses a distinct gift. Four long-wait checks on pages 3/11 pass without replay. See arm-measure limitations below. |
| A09 | NOT_VERIFIED | All five repository checks pass; home ring/shelf/swipe 30/30 and Ti Kannot 21/21. Shared construction/source checks and supplied underwater pixel pairs agree, but I did not produce a fresh baseline-versus-reviewed-SHA underwater render/journey. No new regression was established. |
| A10 | VERIFIED | Touch 13/13, reduced motion 13/13, resize/orientation 21/21, rapid keys/buttons/wheel 19/19 after timeout adjustment, journey 32/32. Canvas is aria-hidden and text is HTML. This is bounded functional coverage, not an exhaustive accessibility audit; F1/F2 remain acceptance defects under A07/A11. |
| A11 | NOT_VERIFIED | **Fails F2.** Missing GLB/texture handling passes 8/8, and ten reopen cycles retain one canvas and one active WebGL context. Heap at cycles 1/5/10: 19,462,451 / 20,159,452 / 20,691,476 bytes, +2.6% from 5 to 10. These positive checks do not cure ignored loading cancellation. |
| A12 | VERIFIED | Reporting checked, not independently remeasured performance: stored renderer/browser/hardware logs support desktop NVIDIA measurements and explicitly emulated phone rows; p50/p95/frame counts are plausible. Draw-call overruns and uninvestigated uncapped spikes are disclosed. Final arm-fix performance and real-phone performance remain unmeasured, as the report states. |
| A13 | VERIFIED | Archive manifest: 26/26 OK. Reconstruction outputs: all 3 GLB, 15 runtime textures, `world/assets.json` and garden plan match the reviewed commit byte-for-byte: **20/20**. All 15 freshly generated masters match the archived masters; exporting those masters independently also reproduces all 15 WebP files. `E/rebuilt-comparison.json`, `E/generated-masters.json`, `E/master-exports.json`. |
| A14 | VERIFIED | Register covers the incorporated character, models, layers, materials, cover and props, with origin/licence/date/status. Scripts and archive provide provenance; reference boards are not incorporated. Some weights need refreshing, noted below. |
| A15 | VERIFIED | Complete twelve-page build and this independent review are available. Deploy Preview responds; its `world-BZOoa0hI.js` is byte-identical to the archived SHA's built calebassier bundle (SHA-256 `cd815d9436414bde9b89cd95e7f20f61e3a34547cce1392652b926ed70876325`), and both indexes name `main-DAhN1yTi.js`. Draft PR #54 status is supplied by the brief, not independently queried. |

## Owner feedback and arm measure

The originally reported arm/dress merging on pages 1 and 3 and missing lantern arm on page 10 were not reproduced in the inspected captures/poses. The moved foreground on page 5 no longer crosses Mila at the sampled instants in either format. The full test suite includes the 0.2-second figure/set clearance tests. Pages 6 and 8 were included in the independent timeline/geometry sampling and full-size captures.

`armDepth` is a useful heuristic, **not a proof that the complete rendered arm clears the animated garment**. It samples only three upper-arm positions, truncates the held forearm at 70%, and uses an undeformed radial dress envelope. The sweep's “20 mm thick” justification does not bound the actual limb radii, particularly Man Ninon's. Denser probes initially found extra intersections mainly in the intentionally attached shoulder region; checks against actual dress triangles did not establish another visible owner-feedback defect away from that region. I am not promoting those shoulder contacts into a product finding. Continuous swept-volume/animated-hem clearance remains unverified.

## Commands run

All package checks ran on the archived copy, using the installed pnpm **10.23.0** executable at `/home/xgueret/.local/share/mise/installs/pnpm/10/pnpm`. The default pnpm 12 launcher initially failed with `ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK` / `Read-only file system`; the locally available pinned executable worked without escalation.

| Command / bounded run | Exit / result |
| --- | --- |
| `git archive 23236c7224ce6537c9ee9f213792fd7dbc656d80 \| tar -x -C /tmp/review-calebassier-23236c7` | 0 |
| `pnpm install --offline --frozen-lockfile` using pinned executable | 0; 159 packages reused, none downloaded |
| `pnpm format:check` | 0 |
| `pnpm lint` | 0; no warnings printed |
| `pnpm typecheck` | 0 |
| `pnpm test` | 0; **57 files, 462 tests passed** |
| `pnpm build` | 0; normal large-main-chunk warning |
| Scratch `qa/review-inputs.mjs`, modes text/rapid/touch/reduced/resize/failure/lifecycle | Completed mode results: 108 pass, two 15-second rapid-settle timeouts. Combined launcher later interrupted (143) during a duplicate journey; its partial journey is not used as final proof. |
| `ONLY=rapid node qa/review-rapid.mjs` with 90-second settle allowance | 0; **19/19** |
| `ONLY=journey node qa/review-inputs.mjs` in a separate bounded run | Result **32/32**, written after browser close; bounded launcher reported 143 |
| `ONLY=home,kannot node qa/review-regression.mjs` | Result **51/51**, written after browser close; bounded launcher reported 143 |
| `node qa/review-cancel.mjs` | 0; records F2, including successful second-Escape recovery |
| `node qa/review-motion.mjs`; `node qa/review-strips.mjs`; `node qa/review-extraction.cjs` | 0 each; 277 pose samples, both-format action strips, matching canonical construction |
| `VP=desktop/phone/small node qa/review-captures.mjs` in bounded batches | Launcher exits 0/143; all 36 captures saved and dimensions independently checked |
| Painter in reconstruction driver | Driver interrupted (143); all 15 master/runtime outputs completed and were subsequently hash-verified |
| `nice -n 19 blender -b --factory-startup --python-exit-code 1 -P art/mila-calebassier/scripts/build_assets.py -- --blend` | 0; `BUILD_OK` |
| `nice -n 19 python3 art/mila-calebassier/scripts/draw_plan.py` | 0 |
| `sha256sum -c MANIFEST_SHA256.txt` in `sources/2026-11-24-7ed9c95` | 0; 26/26 |
| Reviewer output/master/export comparisons and preview `curl`/hash comparison | 0; 20/20 outputs, 15/15 masters/exports, identical preview bundle |
| `trash --trash-dir /tmp/contes-creole-review-trash /tmp/review-calebassier-23236c7` | 0; scratch path subsequently confirmed absent |

## Not checked

- Real-phone behaviour, thermal limits, memory and performance: deliberately NOT_VERIFIED. This review used SwiftShader and emulated viewports only.
- Fresh underwater baseline/current GPU captures, complete crab/underwater navigation regression, and exhaustive continuous collision testing. Existing evidence was inspected; its provenance is not upgraded into a newly executed run.
- Remote PR draft/CI state, merge or publication. Network access was limited to the specified preview; no account or PR mutation occurred.
- **Server cleanup could not be completed inside this sandbox.** Interrupting both owned launcher sessions returned 143, but `curl -sI` still received HTTP 200 from `127.0.0.1:4287` and `:4288`. `ss -ltnp` shows those listeners without process IDs; `fuser -v 4287/tcp 4288/tcp` exits 1 without identifying a process. The per-command PID namespace exposes only that command's processes. No escalation was requested under reviewer rule 6. Browser runs completed their `finally`/close paths, and the scratch copy was trashed. A final socket check then confirmed that port 4287 had stopped; **the preview listener on 127.0.0.1:4288 remains** and needs stopping from the host.

## Reservations for the owner

- D-ART remains open: materials share a coherent muted wash, but stamped foliage, simple architecture and smooth procedural figures are visibly less rich than the four reference boards. This artistic gap alone did not cause CHANGES_REQUESTED.
- D-GCF remains open. The source has `draft: true` and all twelve page labels say `Bwouyon — à valider`; the reader renders those labels. No validation of the translation is asserted. No sound was added.
- Correct report arithmetic: independently comparing the supplied 20 underwater image pairs gives **18 exact pixel matches and two differences of at most one channel value**, not 19 exact matches. This is not evidence of a visible regression; underwater source/shared figure files are unchanged between that evidence's product version and this SHA.
- Refresh a few register weights against the final assets: e.g. the cover is 58,734 bytes (about 57.4 KiB), not 68 KB. Provenance coverage is present.
- The executor's 156 green checks do not establish complete acceptance: F1 escapes canvas/card bounding-box assertions, and F2 is explicitly accepted by an unconditional lifecycle assertion. Fix the relevant checks along with the product defects.
- Merge, production/publication and any waiver of an acceptance criterion remain owner decisions.
