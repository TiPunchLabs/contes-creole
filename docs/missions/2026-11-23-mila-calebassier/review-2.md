VERDICT: CHANGES_REQUESTED
Version: 486c002bd56e7e836cbfd269bca6f291cb15a694
Reviewer: codex

## How I drove the UI

Reviewed an archive of the exact product SHA in `/tmp/review-calebassier-2`. HEAD `07d81a83b2170e4402520bf40d8b560ac311c242` has no additional changes in `src`, `art`, `qa`, `package.json` or the lockfile. Tests used the local production build on `127.0.0.1:4298` and the development viewer/app on `127.0.0.1:4297`, served with `nice -n 19`. Both the preview's `main-JuJam6Ll.js` and `world-Ddt-ajgy.js` are byte-identical to this build; comparisons are recorded below.

Playwright 1.58.2, headless Chrome 158.0.8127.36, ANGLE Vulkan **SwiftShader**, not a hardware GPU. No performance judgement comes from these runs. Shelf selection, page changes, Escape, taps and swipes used real Playwright input, including CDP `Input.dispatchTouchEvent`. No internal page function satisfied a navigation check.

Scratch-only harness adaptations allowed software rendering, handled the removed loader, waited for actual shelf selection and reduced input-check DPR to 0.25. GPU draw calls were suppressed between captures. Separately, I captured and inspected all 12 pages at **1440×900, 390×844 and 360×640, DPR 1**, with the actual French reading UI. Normal-motion action samples used the actual CSS viewports at DPR 0.5; the occlusion investigation also used full-resolution captures. These adaptations and reviewer scripts are preserved outside the worktree.

Evidence root, abbreviated **E**: `/home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/cycle2/`.

## Status of review-1 findings

- **F1 — fixed for the original edge-cropping defect.** At 390×844 pages 5 and 10 now contain the calabash and hand contact. All named pages/screens passed the new projected-subject checks in normal and reduced motion, including portrait→landscape→portrait on each phone page. Own [page 5](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/cycle2/captures/phone-p05.jpg>) and [page 10](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/cycle2/captures/phone-p10.jpg>) captures confirm the original symptom is gone. **A07 nevertheless fails the separate action-visibility defect F3 below.**
- **F2 — fixed in the exercised opening paths.** The revised single-Escape mode passes **17/17**, without a corrective second Escape. My additional independent cases pass **16/16**: held module loading and page-change cancellation for Ti Kannot and underwater Mila; focus restoration; clean reopening; and releasing an old calebassier GLB load while Ti Kannot is already open. The old completion neither replaces nor disposes the new book, one key turns one page, and closing returns to one active WebGL context without console errors. Ti Kannot/Mila have no equivalent calebassier GLB load, so their asynchronous world-module responses were held instead. While a cancelled calebassier mount remains pending it temporarily retains its context; after the held responses settle, the late handle is disposed and only the tree remains. `E/ui/results.json`, `E/cancel-extra/results.json`.

## New findings

- **F3 [major] `src/books/mila-calebassier/staging.ts:335` — the desktop foreground hides Man Ninon and her lantern during page 10's meeting — preserve their visibility during the held shot, then verify the complete move.**

  Reproduction on this SHA: 1440×900, Français, normal motion; open the tale through the shelf and press Next nine times. During page 10, after Man Ninon's arrival, a large foreground leaf covers almost all her face/body, the lantern arm and the lantern. The timeline finishes her arrival at 5 seconds and holds the meeting until 8.6 seconds. Independently captured instants **5.2, 6.5 and 8.5 seconds** all show the obstruction. The final reading frame is clear because the camera subsequently pans; reduced-motion/final-state stills therefore miss it.

  I also reproduced it in the real app using only shelf/Next-button navigation and a read-only probe to time the capture at **6.07 seconds**: [actual UI, original foreground](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/cycle2/occlusion/ui-p10-meeting-original.jpg>). A control that hides **only the one visible foreground mesh** reveals the complete figure and lantern: [same meeting, control](</home/xgueret/.local/share/contes-creole-qa/mila-calebassier/review-1/cycle2/occlusion/ui-p10-meeting-without-foreground.jpg>). In the frozen viewer controls, subject projections are identical before/after removing that mesh. This establishes occlusion by the foreground, rather than missing arm geometry, off-screen positioning or failure to load the figure.

  Commands: `node qa/review-cycle2-actions.mjs`, `node qa/review-cycle2-occlusion.mjs`, `node qa/review-cycle2-ui-occlusion.mjs`; scripts, timing/state records and originals/controls are in `E/harness/`, `E/actions/` and `E/occlusion/`.

  The new checks pass this scene because projected discs can lie inside the screen while hidden behind another object. In addition, `qa/calebassier-subjects.mjs:38` requires Man Ninon's face/lantern only at the final frame, not during this meeting. The new `after: 8.6` camera hold and a foreground placed relative to the final lens must be assessed together. The portrait shot, with no foreground cut-out, shows the meeting clearly.

  Expected fix: adjust foreground placement/blocking or the held camera composition so Man Ninon's face, lantern and carrying arm remain readable after arrival and through the conversation/walk. Keep the intended depth, and add a rendered action/occlusion check around 5–8.6 seconds; more screen-bound assertions alone will not catch this. This fails **A07's narrative framing and required action visibility**, independently of D-ART.

- **F4 [minor] `docs/missions/2026-11-23-mila-calebassier/report.md:402` — “20 of 20 identical” does not match a raw comparison against the original baseline — identify the reference and tolerance precisely.**

  Recompared all 10 mobile images in `s8/regression/underwater/` and 10 desktop rerun images in `s8/regression/underwater-rerun/` with `baseline/underwater-shots/`. Result: **18/20 exact**. Both desktop page-10 images differ at **23 pixels**, with maximum channel difference **1/255**. Those two rerun images are exactly equal to the previous product's `s5/regression/underwater-shots/` versions. See `E/underwater-combined-comparison.json` and `E/underwater-precision.json`.

  State whether “base” means the original baseline or the previous product, and distinguish exact identity from a tolerance comparison. This is a reporting correction, **not a visible underwater regression or an independent reason to request product changes**. The older 19-versus-18 arithmetic was corrected; the new clean-run claim needs this additional qualification.

## Acceptance criteria

| AC | Status | Proof on the reviewed version |
| --- | --- | --- |
| A01 | VERIFIED | French DOM/counter comparison 25/25; own complete 12-page capture sets. Story text is unchanged this cycle, including page 12's bowl conclusion. |
| A02 | VERIFIED | Mila/shared figure code unchanged from review 1; the prior independent 122-mesh/180-draw comparison remains applicable. Own new captures preserve identity. |
| A03 | VERIFIED | Branch/fruit assets and construction unchanged; branch-placement tests pass in the 468-test suite; new canopy captures agree. |
| A04 | VERIFIED | Unchanged masonry house assets, with both houses/terraces visible in the new browser captures. |
| A05 | VERIFIED | Inspected all 36 full-resolution reading captures and normal action samples. No additional material/fringe/face-smearing defect established. Artistic quality remains D-ART; composition visibility is addressed under F3/A07. |
| A06 | VERIFIED | Normal camera/action samples retain real foreground/midground/background separation and occlusion. F3 demonstrates a misplaced foreground occluder, not a flattened slideshow. |
| A07 | NOT_VERIFIED | Original edge crops fixed, but **fails F3** during page 10's desktop meeting. All bounds tests passing does not establish rendered subject visibility. |
| A08 | VERIFIED | Own 32 normal-motion samples across both formats show one hero, page-3 transfer, page-9 belly carry, page-11 return and distinct page-12 gift. Ownership/puppet timelines and geometry are unchanged; no additional hand/dress or physical plant-crossing defect established. F3 hides the lantern arm without an IK failure. |
| A09 | VERIFIED | Bounded regression of changed shell paths: fresh home/Ti Kannot 51/51 plus cancellation/reopening/page-change cases for both other tales. Their renderer/figure code is unchanged. Supplied regression logs were independently counted; pixel comparison has the qualification in F4. Complete underwater/language suites were not freshly rerun. |
| A10 | VERIFIED | Fresh touch 13/13; six French framing cases cover all pages at the three required sizes in normal/reduced motion, with each phone page turned to landscape and back. Original page/key handling remains functional after cancellation. Not an exhaustive accessibility audit. |
| A11 | VERIFIED | Fresh first-Escape checks 17/17, independent extra cases 16/16, missing GLB/texture 8/8. Late loads stay closed or preserve the subsequently opened book, active contexts return to one, focus returns, no unexpected console errors. No fresh ten-cycle heap measurement this review. |
| A12 | VERIFIED | Reporting only: historical desktop-GPU measurements remain explicitly historical; no post-fix or real-phone performance result is claimed. SwiftShader measurements were not substituted for them. |
| A13 | VERIFIED | Art scripts, GLB/textures and physical timelines unchanged this cycle. Review 1's independent 20/20 reconstruction comparison remains applicable; no new source rebuild claim was inferred from the camera checks. |
| A14 | VERIFIED | All 19 incorporated asset files' current byte sizes occur correctly in the refreshed register, including cover 58,734 bytes. Provenance/licence coverage remains present. |
| A15 | VERIFIED | Complete build and this review available; preview shell and calebassier bundles match the exact archived product. Draft PR #54 is identified by the brief; no PR/account mutation or publication performed. |

## Checks, claims and commands

All package checks ran in the archive using the installed **pnpm 10.23.0** executable. `E/checks.json` and individual logs record results.

| Command / check | Exit or observed result |
| --- | --- |
| `git archive 486c002bd56e7e836cbfd269bca6f291cb15a694 \| tar -x -C /tmp/review-calebassier-2`; `pnpm install --offline --frozen-lockfile` | 0 each; 159 packages reused, no download |
| `pnpm format:check`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build` | 0 each; **57 test files, 468 tests passed**, normal large-chunk build warning |
| `pnpm exec vitest run src/app/app.test.ts --reporter=verbose` | 0; **36/36 app tests** |
| `ONLY=escape,text,touch,framing,failure node qa/review-cycle2-ui.mjs` | **237/237** results: escape 17, text 25, touch 13, framing 174, failure 8. Framing: 37/37 for each phone/motion combination; 13/13 for each desktop mode. Bounded launcher reported 143 after completed results. |
| `ONLY=framing node qa/review-cycle2-extra.mjs` | **185/185**, with orientation checks on 375×812, 430×932, 768×1024, 800×800 and 1024×768. Launcher reported 143 after completed results. |
| `STEP=0.5 VPS=... node qa/review-cycle2-sweep.mjs` | **144/144**: the seven documented screens plus five additional shapes. This independently repeats the documented 84 cases at a coarser 0.5-second step. Launcher reported 143 after completed results. |
| `QA_SHIFT_LOOK=-0.12 STEP=0.5 VPS=phone,small node qa/review-cycle2-sweep.mjs` | Exit **1 as intended**, 20/24 pass; four failures on pages 5/10 catch the original left-edge symptom. |
| `node qa/review-cycle2-cancel-extra.mjs`; `ONLY=home,kannot node qa/review-cycle2-regression.mjs` | **16/16** and **51/51**; launchers reported 143 after completed results. |
| `node qa/review-cycle2-actions.mjs`; `node qa/review-cycle2-occlusion.mjs`; `node qa/review-cycle2-ui-occlusion.mjs` | 0 each; original-state captures plus single-variable foreground controls establish F3 |
| `VP=desktop/phone/small node qa/review-cycle2-captures.mjs` | All three browser workers exit 0; 36 files, dimensions independently checked. Batch launcher reported 143. |
| Raw PNG/size/preview comparisons | 0; F4 counts and all 19 register sizes independently checked; both preview bundles identical (`E/preview-comparison.json`) |

Completed result JSON files are written after the browser `finally`/close paths. Launcher status 143 is recorded separately rather than represented as exit 0. Scripts and logs are in E.

The stored regression table matches the supplied logs: `tk-reading` 238 pass/3 fail, `tkp` 35/10 versus baseline 34/10, `mila` 143/7. The first 42 status/check identifiers of the partial `mila-lang` run match the baseline. These are **audited supplied runs**, not newly executed complete suites.

The claim of pre-existing desktop run-to-run instability is plausible: the original baseline's three `desktop-p07-{a,b,c}.png` files themselves disagree (a=c, b differs). The previous product's determinism images also disagree. This supports a pre-existing instability; it does **not** establish that concurrent GPU use is its cause. No fresh hardware-GPU comparison or root-cause investigation of that instability was performed here.

## Reservations and not checked

- Projection discs are useful bounds/text/button checks, not visibility or pixel-quality oracles. They do not detect F3; `data-framing` is published on state/viewport changes rather than continuously during motion. The probe supplies fresh samples. `armDepth` remains the acknowledged undeformed radial heuristic; continuous animated garment clearance is not certified.
- Real-phone behaviour/performance, fresh GPU timings, complete underwater/crab/language journeys, Bileng framing and exhaustive lifecycle stress remain NOT_VERIFIED. This review's low-DPR/instrumented input runs must not be read as device or performance validation.
- D-ART, D-GCF and merge/publication remain owner decisions. Kréyòl stays an explicitly labelled draft; no validation is asserted. No sound was added.
- No source/product fix was made by the reviewer. Removing the foreground was a diagnostic control only; originals are preserved alongside it.

## Cleanup

Every browser run completed its close path. Servers were owned by a separate supervisor which stopped and reaped both process groups (namespace child PIDs 4 and 5; receipts in `E/servers-stopped.json`). Final `ss -ltnp` shows **no listeners on 4297, 4298 or the previous 4288**; requests to both new server ports fail with curl exit 7. The first preview launch preceded completion of the build, failed with “dist does not exist”, and was also reaped before the successful supervised restart.

`trash --trash-dir /tmp/contes-creole-review-trash /tmp/review-calebassier-2 /tmp/review-cycle2-servers.py` exited 0; the scratch directory is absent. Only this review file was written in the worktree. Evidence and reviewer harnesses remain in E. No permission escalation was used.
