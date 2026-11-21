# Mission: FLAMBOYANT-SILHOUETTE — remodel the central flamboyant of « Pyébwa a Konesans »

- Mission id: `contes-creole/2026-11-20-flamboyant-silhouette`
- Pilot: Claude Code `pilotage` (agent-workflow, Herdr workspace w2D)
- Owner brief: 2026-11-20, verbatim in `owner-brief.md` next to this file (French). **It is the authoritative specification.** This file adds workflow framing, acceptance criteria, limits and hand-off rules. If they seem to disagree, the brief wins; record the conflict in `report.md`.
- Worktree: `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-worktrees/flamboyant`, branch `feat/flamboyant-silhouette` from `origin/main` `c5c6f0c` (created by pilotage, upstream unset). Work only here; do not touch the main checkout or other worktrees.
- Executor: this Claude Code session, **Claude Fable 5.2** (owner requirement). Reviewer: Codex, **routed by pilotage**. Review cap: 3 per phase.

## 1. Base (pilot findings, to re-verify in M1)

- PR #42 `feat/anchored-canopy` (« flamboyant sprays rooted on their twigs, tree turned to face the opening view ») was **merged 2026-11-09**. CANOPY decisions (CANOPY-AIM, -OPEN, -FACE, -GRN) are in `docs/redesign/decisions.md` (lines ~74-83, ~234-237); reference captures in `~/.local/share/contes-creole-qa/anchored-canopy/` (incl. `green/`).
- Mission `2026-11-15-home-visual-polish` (merged, done) later changed the home framing; its `report.md` notes a risk R2 "opening frame differs from owner-validated CANOPY-FACE". Check what the current opening is and keep it (the brief says preserve the opening framing).
- `main` `c5c6f0c` (after PR #49) is the deployed « Pyébwa a Konesans » tree home. The « La Veillée » terrace branches (`feat/accueil-veillee`, `feat/veillee-reprise`, `feat/veillee-fauteuil`) were **archived by the owner on 2026-11-20 and are not a base**.
- The owner capture mentioned in the brief was not attached to the message: use the executable home on `c5c6f0c` as the reference (brief §1 fallback). If pilotage receives the capture later, it forwards it.
- Tree code: `src/tree/scene/tree.ts` (`createLightTree`, `FACING`), `canopy.ts` (anchors, supports, `withTreeWind`/`withCrownWind`, `RUSTLE`), `camera.ts`, `cards.ts`, `landscape.ts`, `flora.ts`, `foliage.ts`, `leaves.ts`, `organic.ts`. Seeded build order matters (CLAUDE.md: `createLandscape` → `createLightTree` → `createSky`, one `createRng(11)`): replacing the central tree must not shift the background trees' RNG draws — prove it (brief check 4).
- No GLB loading exists in `src` today; the only URL switch is `?lite=` (`src/tree/lite.ts`). Reuse that pattern for the preview switch (e.g. `?tree=current|a|b`, dev/preview only), unless M1 finds a better existing mechanism.
- Blender 5.3.0 at `~/.local/opt/blender/blender`; the blender MCP is available in your session. The owner may have a Blender GUI open: do not close or modify the owner's scenes; work in your own files.

## 2. Authorizations

Authorized without asking:

- Reading the repo, CANOPY/home-visual-polish artifacts, QA folders under `~/.local/share/contes-creole-qa/`.
- Looking at a few photographs of adult Delonix regia as **shape references only** (WebFetch/WebSearch). Do not commit third-party photos; record their URLs, licence if known, and what you observed in `evidence/`.
- Blender modelling, Python build/export scripts, GLB export, Three.js integration, tests, local dev server on 127.0.0.1 (`nice -n 19`).
- Local commits on `feat/flamboyant-silhouette`. **Push of this branch and a draft PR** to get the Netlify Deploy Preview link the owner asked for in step 3 (`git remote -v` must show `git@github-xgueret:TiPunchLabs/contes-creole.git`). The PR stays draft until phase 2.
- QA captures and private notes in `~/.local/share/contes-creole-qa/flamboyant-silhouette/`.

Not authorized: merge, production publication, editing other worlds (books, Konteur, critters, other plants, texts, navigation) beyond what is strictly needed to attach books to the new tree; changing the opening camera; deleting branches or worktrees.

## 3. Phase 1 — up to the owner's artistic choice (M1–M5)

| AC  | Criterion                                                                                                                                                                                                                                                                        | Verification                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| AC1 | Base chosen and justified: CANOPY / PR #42 real state, current opening vs CANOPY-FACE, acquis listed (opening framing, green above the fork, branches + leaves + flowers moving together)                                                                                        | `evidence/m1-base.md` with commits and file:line                                     |
| AC2 | Code map: tree model (dimensions, origin, facing), camera path, book attach points + threads + hit zones, shared code/materials with background trees                                                                                                                            | `evidence/m1-code-map.md` file:line                                                  |
| AC3 | Reference captures from the opening view + 2 reproducible rotation angles; start commit, window sizes (desktop + mobile), camera positions recorded                                                                                                                              | `evidence/reference/` + parameters                                                   |
| AC4 | Two Blender proposals A (parasol) and B (asymmetric, long lateral branch carrying a main book) as `.blend` + GLB, matte wood, provisional foliage masses only; continuous forks, tapering, roots, profile; attach points named per project conventions; build/export script kept | files + script + Blender views                                                       |
| AC5 | Dev preview: switch current ↔ A ↔ B with **identical camera, lighting, framing and scenery**; real books, threads, Konteur, title, navigation visible; rotation and book selection work with A and B on desktop and mobile width                                                 | preview URL (local + Deploy Preview) + captures at the same 3 angles for all 3 trees |
| AC6 | Background trees unchanged when the central tree is replaced (pixel or geometry/RNG proof)                                                                                                                                                                                       | test + evidence                                                                      |
| AC7 | Checks pass: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; the public journey (no preview param) still loads the **current** tree in phase 1                                                                                                                         | outputs with counts                                                                  |
| AC8 | `report.md` (phase 1): `Verdict:`, `Version:` = branch head SHA, comparison sheet path, what A and B bring and their least favourable angle, recommendation, delegations, session model                                                                                          | file                                                                                 |

Steps:

| Step | Goal                                                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| M1   | Read CLAUDE.md, `doc/`, CANOPY decisions, home-visual-polish report; base + code map (AC1, AC2)                                          |
| M2   | Reference captures (AC3), headless OK for screenshots only                                                                               |
| M3   | Shape references, Blender A and B (AC4)                                                                                                  |
| M4   | GLB integration + preview switch + checks (AC5–AC7); push + draft PR for the Deploy Preview                                              |
| M5   | `report.md`, then stop with one line: report ready, Version = <sha>                                                                      |
| R1   | Codex review in the browser (pilotage routes it): the 4 checks of brief §3; you correct technical defects that prevent a fair comparison |
| D1   | Pilotage presents preview link, comparison views, recommendation to the owner: **A, B or a precise adjustment. Wait.**                   |

## 4. Phase 2 — after the owner's choice (only after D1 is recorded here)

Finalize only the chosen silhouette (foliage and flower clusters along the ramifications, sky openings, volume during rotation, attaches and animations wired to the real scene); deliver editable `.blend` + GLB per project organisation + the reproducing script; only the chosen model in the public journey; Codex final browser review comparing reference vs result in the same conditions (captures, transferred weight, draw calls, rotation smoothness) and stating real device vs emulation for mobile; PR ready with preview, visual proof, reservations. Merge and production stay the owner's decision. Pilotage will add the phase-2 AC table when D1 is taken.

## 5. Hygiene

- Model: confirm in `report.md` that your session runs Fable 5.2 (header + transcript model id). Model economy (owner decision 2026-11-16): artistic, modelling and product-code choices stay on Fable; delegate mechanical work (check chain, captures, measurements parsing, evidence manifests) to Sonnet/Haiku subagents and list delegations.
- Browser hygiene (owner decision 2026-11-18): headless Chrome here falls back to SwiftShader. Use headless only for functional checks and screenshots; any FPS or smoothness number must come from a GPU-backed headed Chrome with the renderer recorded, runs bounded (~20 s), `nice -n 19`. Stop your own browsers, servers and Blender background processes when done. Run Blender bakes/exports in the foreground.
- Assets weight: record GLB sizes (raw and gzip/brotli if served compressed); keep the preview fair (same compression for A and B).
- Pnpm only. Conventional Commits. No commit on `main`.

## 6. Decisions log

- 2026-11-20 — Owner brief received (verbatim `owner-brief.md`): Blender + Three.js by Claude Code Fable 5.2, independent review by Codex, stop at the A/B choice.
- 2026-11-20 — Pilot framing: base `origin/main` c5c6f0c (PR #42 merged; veillée branches archived same day); owner capture not attached → executable home as reference; preview switch via URL param in the `?lite=` pattern; push + draft PR allowed for the Deploy Preview (brief step 3 asks for a preview link and ends with a PR); Codex browser review needs loopback/network in its sandbox, enabled for this mission's reviews because the brief explicitly asks Codex to open the preview with Playwright.
