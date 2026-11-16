# Mission — 2026-11-15-home-visual-polish

## Objective

Owner brief, 2026-11-15 (French, pasted to pilotage; summarized here, the binding points are listed in full below): raise the visual rendering and the composition of the Contes Créoles home scene (the tree universe) toward a premium animated-film / illustrated storybook quality, by **refining the existing art direction** (no new direction). Priority: Kompé Lapen and Kompé Zamba (silhouettes, surfaces, expressions, weight, motion quality) **and** the overall staging (framing, positions and relative scales of tree and characters, depth, balance of masses, eye path, place of title and CTA), with dedicated desktop and mobile compositions. Harmonize light, 2D/3D elements and the Tree of tales animation. Preserve contents, interactions and journeys. Executor runs on **Fable**; Codex reviews; the owner keeps artistic acceptance and the merge decision.

## Roles

| Role     | Who                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Pilot    | Claude Code `pilotage` (agent-workflow)                                                                             |
| Executor | separate Claude Code session `exec-home`, started with `--model fable` (`executor_args` of project `contes-creole`) |
| Reviewer | Codex CLI `review`                                                                                                  |
| Arbiter  | Xavier: artistic acceptance, merge, any publication                                                                 |

## Initial state (verified by pilotage, 2026-11-15)

- Repo `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole`, `main` = `origin/main` = `ef821d2`, clean tree, single worktree, no other local branch, no open PR (`gh pr list`).
- Stack (from `CLAUDE.md`): Vite 8 + TypeScript 6 + Three.js r186, vanilla; commands `pnpm dev|build|typecheck|test|lint`. Home = tree universe `src/tree/` (`scene/` incl. `critters/lapen.ts`, `critters/parts.ts`, `critters/wander.ts`, `camera.ts`, `tree.ts`, `foliage.ts`, `canopy.ts`, `palette.ts`, `sky.ts`…; `overlay/`). Code spells the book `zanba`: never rename anything.
- Previous art direction: "Veillée claire" (`docs/redesign/status.md`, `decisions.md`); QA kit in `qa/`; previous evidence in `~/.local/share/contes-creole-qa/`.
- Project newly onboarded in the pilot on 2026-11-15 (owner approved « Onboarding standard »); `docs/missions/.gitkeep` created untracked by onboarding — commit it with this file.
- Branch `feat/home-visual-polish` created by pilotage from `ef821d2` in the main checkout.
- No PR, preview or deploy authorization is recorded for this project: **local branch only**.

## Authorizations and limits

- Work on `feat/home-visual-polish` (base `ef821d2`). One atomic Conventional Commit per kept improvement. Local only: **no push, PR, preview deploy, merge, force-push or production deploy**.
- Do not change business logic, navigation targets, tale contents, French / Guadeloupean Creole texts or name spellings, accessible reading order, sounds. Preserve the tree's narrative and interactive role, book access, useful effects, loading states.
- Composition changes are expected and authorized: move elements, adjust relative scales, spacing, depth planes, camera/framing; title and CTA may move visually (same text, target and reading order). Keep anatomy proportions, species and identity of the décor; no tourist/folkloric clichés added; no new feature.
- Keep original assets; create derivatives. No heavy dependency, no stack change, no spending.
- Dev server on a dedicated port (e.g. `pnpm dev --port 5181 --strictPort`); stop it at the end.
- Heavy media (screenshots, videos, traces) in `~/.local/share/contes-creole-qa/home-visual-polish/`; the mission folder keeps `AUDIT.md`, `report.md`, and `evidence/` with text results and a manifest (path + sha256 + capture conditions) of the media.
- Executor model: Fable only. No auxiliary agent for code changes; if one is used, it must also be Fable. No silent fallback: if the model is not Fable, stop. **Amended 2026-11-16 by the owner (see Log, O-MODEL):** the executor itself stays on Fable, but it decides autonomously to delegate tasks to subagents running a cheaper appropriate model.
- Iteration cap: 3 Codex reviews (2 correction cycles). After 3 failed attempts of one approach, document and switch approach (does not make the criterion pass).
- Escalate to pilotage (not to Xavier) any need for a change of art direction, stack, irreversible operation or unavailable access, with evidence; continue the independent work.

## Work brief for the executor (binding)

### 1. Baseline before any change

1. Identify home components, character formats (meshes, procedural parts, rig), animation engine, deps shared with other pages.
2. Run the app with the repo commands; inventory behaviours to preserve: tree, tale access, mouse/touch/keyboard, responsive, language switch and sounds (only if they exist).
3. Capture initial state at 1440×900 and 390×844 CSS px: full views, ×2 close-ups of both characters, videos of the tree animation and of the characters' motion.
4. Record console/network errors, transferred asset weight, initial load, smoothness; draw calls and triangles (`renderer.info`).
5. Write `AUDIT.md` (mission folder; never overwrite an existing audit): qualities to keep, defects with evidence, components, risks, ordered actions, plus a composition diagnosis (focal point, size/place of characters, balance of masses and contrasts, depth, overlaps, space around text, mobile framing).
   Comparisons keep browser, hardware, GPU acceleration, viewport, DPR, network/cache and comparable animation states/instants; use a reproducible seed if randomness biases captures. FPS: three comparable sequences ≥ 20 s after warm-up (rest, tree animation, interactions), median FPS and p95 frame time; load measured separately (cold/warm cache stated). Mobile viewport emulation is labelled "emulated" and never claimed as phone performance; name any real device tested.

### 2. Improvement loop

observe → hypothesis → change one point → capture and measure → compare → keep or revert that isolated change. Stabilize a convincing overall framing first, characters and composition together; do not stop after a secondary improvement.

A. **Lapen and Zamba** — silhouettes (Lapen lively, slim, readable ears; Zamba massive, grounded, low centre of gravity; distinct in silhouette at displayed size); surfaces and seams (no unintended facets, staircase edges, ugly joins at normal size and ×2; in 3D check normals, topology, materials, seams before adding geometry; one suitable anti-aliasing, no MSAA+FXAA+SMAA stacking); motion (Zamba slower, inertial, planted; Lapen quick with precise stops without breaks; anticipation, damping, discreet squash & stretch, secondary-motion lag on ears/belly/jowls/tail only where they exist; simple damped springs or curves, no physics engine); breathing, irregular blinks, small weight shifts, gaze toward a point of interest (cursor follow optional, discreet, no touch dependency); no perceptible mechanical repetition over 30–60 s; stable feet, no sliding, pose jumps, jitter, visible interpenetration; contact shadows consistent with motion; integration with palette, materials, contrast and light direction (rim light only if it helps the silhouette). If the limit is the asset/rig, state whether an external retouch (e.g. Blender) is needed; no effect stacking to hide bad geometry.
B. **Light and mood** — clear key/fill/rim by means suited to the scene; unified temperatures, shadows, grading; atmospheric perspective, rays, grain, vignette subtle and justified by benefit and cost; never reduce text legibility.
C. **Composition (mandatory, desktop and mobile)** — eye hierarchy: tree as the heart, then characters and the invitation to the tales, title and CTA immediately findable; no competing elements of equal weight (the tree need not be at the geometric centre). Framing and balance of tree/ground/sky/foliage, eye height, camera distance/focal if useful; no functionless voids, clutter or systematic symmetry. Characters as actors linked to the tree and to each other by position, orientation, gaze; both silhouettes readable, grounded; no edge-pasted characters, awkward cut ears/limbs, confusing contacts with branches. Depth: foreground / midground / background via controlled occlusion, scale, contrast, light; optional gentle parallax compatible with reduced motion. Calm zone with margins for title and CTA; nothing crossing letters or the button; décor never intercepts UI interactions. Dedicated portrait composition for mobile; check intermediate widths and heights (no cuts, overlaps, placement jumps, horizontal overflow). Check framing at start, during and end of the tree animation and at rest. **Test 2–3 light composition variants** with existing assets at the same formats and states; choose autonomously, short justification in `AUDIT.md` (no intermediate validation by Xavier). Review full views at normal size, as thumbnails and in greyscale; produce desktop and mobile before/after showing framing, depth, balance and legibility progress.
D. **2D/3D coherence** — harmonize outlines, grain, palette, depth, light where several techniques coexist; document what does not apply; no artificial 3D layer.
E. **Tree animation** — keep its animations, interactions, trigger and duration; refine growth curves, branch offsets, foliage motion; fireflies/particles/glow measured. Any timing change must be justified, proven beneficial, and keep the tale-access journey.

### 3. Performance, accessibility, non-regression

60 FPS on the reference desktop, ≥ 30 FPS on an identified average mobile (untested device = not verified), ≤ 10 % FPS loss vs comparable baseline, no new hitches hidden by an average. If the baseline is already below target, say so and optimize within scope; never lower thresholds. Compression only where the net gain justifies it (WebP/AVIF, KTX2, Draco; count decoder cost). Document transferred weight and load deltas; no systematic increase of resolution/DPR/subdivisions/post-processing. `prefers-reduced-motion`: decorative motion reduced/removed, scene readable, tale access and useful interactions kept; check a live preference change if supported. Keyboard, focus, touch, contrast, legibility preserved; no new autoplay sound or aggressive flashing. Run `pnpm build`, `typecheck`, `test`, `lint`, then a check of the other pages and shared components. Target zero console errors and zero missing assets on tested journeys; separate pre-existing errors from regressions.

### 4. Visual control per kept improvement

Side-by-side before/after at same viewports and equivalent instants (composition: old/new framing with explanation of moves and scale changes; character details: comparable framing); defect fixed and benefit observed. Characters at normal size and ×2; videos watched at ×1 and ×0.25 (slow-motion does not replace FPS measurement). Not clearly better → revert only that change. Re-assess the whole (composition, coherence with the Guadeloupean tale, legibility, restraint, décor identity), including intermediate animation states.

## Acceptance criteria (checklist — each line: verified / not verified / not reached, evidence, SHA)

| ID   | Criterion                                                                                                                                     | Verification                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| AC0  | Executor runs on Fable                                                                                                                        | pilotage: launch argv `--model fable`, session header, transcript `model` field of the executor's requests; recorded in `report.md` |
| AC1  | Character surfaces and seams satisfying at normal and ×2; distinct, expressive silhouettes                                                    | before/after close-ups, silhouette (flat-colour) captures at displayed size                                                         |
| AC2  | Differentiated motion with weight and secondary motion; no visible foot, seam or mechanical-repetition defect in control sequences            | videos ×1 and ×0.25, 30–60 s observation notes                                                                                      |
| AC3  | Characters integrated in décor and light, coherent ground anchoring                                                                           | captures, contact shadows during motion                                                                                             |
| AC4  | Unified light and palette; tree, text and CTA legible                                                                                         | captures, greyscale views, contrast measures of title/CTA                                                                           |
| AC5  | Overall composition improved with before/after: readable focal point, balanced masses, depth, tree–characters relationship; variants compared | variant board + justification in `AUDIT.md`                                                                                         |
| AC6  | Desktop, mobile and intermediate framings controlled, incl. during animations: no awkward cuts, overlaps, overflow                            | captures at 1440×900, 390×844 and intermediate sizes (e.g. 768×1024, 1024×768, 360×640, 430×932) at start/during/end/rest           |
| AC7  | Coherence of the graphic techniques actually present                                                                                          | `AUDIT.md` section with evidence                                                                                                    |
| AC8  | Tree animation refined without loss of interactions or book access                                                                            | videos, journey check to each book                                                                                                  |
| AC9  | Performance targets checked on the announced environments; mobile limits explicit                                                             | perf table before/after + protocol, real vs emulated labelled                                                                       |
| AC10 | Reduced motion and keyboard/touch journeys verified                                                                                           | Playwright `reducedMotion`, keyboard path, touch emulation                                                                          |
| AC11 | Build and relevant checks pass; console errors and missing assets handled; no regression on covered journeys                                  | command outputs and exit codes, console/network logs                                                                                |
| AC12 | Independent review applicable to the final revision, no remaining blocker                                                                     | Codex `review-N.md` naming the final SHA                                                                                            |

Closing rule: "ready for human validation" only if mandatory criteria are reached and verified; otherwise `PARTIAL`/`BLOCKED` with missing criteria and the exact next action. Always separate technical compliance, observed visual improvement, and Xavier's final artistic acceptance.

## Deliverables

1. Branch `feat/home-visual-polish`, atomic commits, exact base and HEAD, no merge.
2. `AUDIT.md`: initial state, kept points, kept/reverted actions, autonomous decisions, limits.
3. Before/after captures desktop, mobile, close-ups; composition variant comparison and choice; tree and character videos with capture conditions (media outside the repo, manifest in `evidence/`).
4. Before/after performance table and reproducible protocol (real hardware vs emulation).
5. `report.md` (`Verdict:`, `Version:` = HEAD SHA) with the AC checklist filled, linked to revisions; Codex reviews linked to the same revisions.
6. Remaining leads ranked by impact/effort, separating unmet mandatory criteria from optional future improvements.

## Steps

- S1 executor (Fable): baseline + `AUDIT.md` + composition variants; commit.
- S2 executor (Fable): improvement loop, verification, `report.md`; commit.
- S3 Codex review `review-1.md` on the exact SHA (diff `ef821d2..<sha>`, evidence, media manifest); corrections by the same executor session; max 3 reviews.
- S4 pilotage: delivery summary for Xavier (artistic acceptance, merge decision).

## State

- Phase: S1 to dispatch.
- Review cycle: 0 of 3.

## Log

- 2026-11-16 (owner, decision CAP after review 3 at the cap): « fix: les personnages apparaissent et disparaisse fait f5, f4 ». Authorizes one extra correction cycle (cycle 3) and Codex review 4, scope: the characters must no longer pop in and out during the climb (the cycle-2 step-out rule is rejected as a solution), review-3 F5 (keep the Konteur's random-tale entry point, click and keyboard) and F4 (climb harness must assert reached progress, full climb re-captured). Nothing else is authorized by this decision.
- 2026-11-16 (owner observation, added to cycle 3 as O1): « lors de la rotation la scene ne semble plus pivoter autour de son axe ». The climb/rotation must stay visibly centred on the tree's trunk axis, as on the base.
- 2026-11-16 (owner observation, added to cycle 3 as O2): « fix /home/xgueret/Vidéos/Captures vidéo/Capture vidéo du 2026-11-16 07-58-22.webm demande à corriger cette effet de rebondissement lorsqu'on pivote ». Owner capture (1920×839, 60 fps, ~7 s, taken on the cycle-3 work-in-progress at about 11:58Z, after `aae0e5f`): while the scene pivots around the tree toward the next tale card, the motion has a rebound (it goes past / comes back instead of settling cleanly). Expected: the pivot follows the input and settles on its target without overshoot, bounce-back or oscillation, in both directions, on wheel/trackpad and touch drag; same damping character on desktop and mobile. Diagnose frame by frame (angle and camera height per frame from the capture and from an instrumented run), fix within the existing motion code, and re-capture the same journey as evidence. Same scope limits as cycle 3.
- 2026-11-16 (owner observation, added to cycle 3 as O3): « il faut aussi fixer les oreilles de l'éléphant » with a screenshot (copied to `~/.local/share/contes-creole-qa/home-visual-polish/owner-o3-zamba-ears-2026-11-16.png`). Zamba's ears read as flat pink discs that look detached from the head (the left one stands out beside the head as a separate disc, the right one sits behind it). Expected: ears attached to the sides of the head, shaped and oriented as ears (not discs), no visible gap, seam or interpenetration at normal size and ×2, consistent with Zamba's silhouette and the existing ear motion; if the limit is the asset/rig, say so (work brief A). Same scope limits as cycle 3.
- 2026-11-16 (owner observation, added to cycle 3 as O4, after reloading on `69ab983`): « dans les mouvements de l'éléphant il faut préter attention à ce que les oreilles ne soit pas confondu dans son corp parfois elles apparaisse plutôt correctement et d'autre fois elle sont bug et rentre dans le corp de l'éléphant ». During Zamba's motion (idle, weight shifts, walk, turns, ear hinge motion) the new ears sometimes sink into or merge with the body/head. Expected: no ear–body interpenetration and ears always read as distinct from the body, over every Zamba motion state and the full 30–60 s motion loop, at every camera angle of the climb; fix by ear hinge limits/offsets, pose-aware constraints or geometry, not by hiding. Verify with an automated per-frame clearance check (ear vertices vs body/head volumes) over the motion loop plus captures at the worst frames.
- 2026-11-16 (owner decision, added to cycle 3 as O5): « oui corrige aussi le triangle au pied du Konteur ». Screenshot taken by the owner on his local dev server (`owner-o5-konteur-foot-triangle-2026-11-16.png` in the QA folder): a small black-and-white triangle at the Konteur's left foot (bottom of the figure, near his sandal). Expected: no such artifact at any climb position, desktop and mobile; find its source (cut-out/alpha edge of the figure, a stray mesh/shadow/glint, the ground decal, z-fighting…) and fix it at the source. Captures before/after at the same framing.
- 2026-11-16 (owner decision O-MODEL, verbatim): « l'executeur a été lancer avec fable 5.2 mais certaine de ces taches il doit être capable de decider de les confiés à des sous agent en toute autonomie avec le model aproprié pour éviter la surconsommation du au model fable 5.2 ». Applied from now on: the executor (`exec-home`, Fable) decides on its own which tasks to delegate to subagents and with which model, to avoid over-consuming Fable. Pilot guidance: mechanical and verification work (running the verification chain and its scripts, captures and boards, parsing measurements and logs, searches, evidence manifests, report/audit assembly from results) goes to a cheaper model (e.g. Sonnet or Haiku); artistic and product-code decisions (character shapes, motion, composition, light) stay on Fable unless the executor judges a change purely mechanical. The executor records in `report.md` each delegation: task, subagent model, and that the main session stayed on Fable (AC0 now covers the executor session, not its subagents).
- 2026-11-16 (owner decisions D-FINAL + MERGE + DEPLOY + CLEANUP, verbatim): « contes-creole j'accepte on peut pousser en prod et tout clean et mettre à jour en local ». Effect: (1) review-4 F7 (AC6 shelf residue: 14 Konteur states on 4 sizes, 31 critter states) and F8 (AC9 desktop uncapped climb −10.46 %) are accepted as recorded exceptions; the owner accepts the result artistically; (2) authorized: push `feat/home-visual-polish`, open the PR to `main`, merge it after CI is green (merge commit, as previous PRs), which publishes to production through Netlify, and verify production; (3) authorized cleanup: stop the executor's dev/test servers (not the owner's own server on port 5173), remove the executor's scratch worktrees, delete the merged feature branch locally and on the remote; mission evidence and QA media are kept; (4) update the owner's local checkout to the merged `main`. Still not verified and recorded as such: human ×1/×0.25 playback (AC2/AC3), FPS on a real phone (AC9 phone).
