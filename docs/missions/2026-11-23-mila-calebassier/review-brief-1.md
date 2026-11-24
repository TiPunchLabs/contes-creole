# Review brief 1 — MILA-CALEBASSIER (pilotage → Codex)

- Mission: `contes-creole/2026-11-23-mila-calebassier`
- Mission folder: `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-worktrees/mila-calebassier/docs/missions/2026-11-23-mila-calebassier/`
- Read first: `mission.md` (framing, H1–H10, additions to the AC), `owner-brief.md` + `brief/specs/06_QA_LIVRAISON.md` (acceptance matrix A01–A15, functional scenarios, visual review) and the other `brief/specs/*` as needed, `owner-feedback-1.md` (owner's defects on the preview), `pilot-notes-s3.md`, then `report.md` (Verdict PARTIAL, Version 23236c7). Reference boards (intent only): `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-assets/mila-calebassier-production/references/*.png`.
- Version under review (exact product SHA): `23236c7224ce6537c9ee9f213792fd7dbc656d80`. Branch HEAD `f82bebf` adds only mission docs/evidence on top.
- Diff: `git -C /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-worktrees/mila-calebassier diff 3ce9759 23236c7` (base = `origin/main` `3ce9759`).
- Draft PR #54, Deploy Preview https://deploy-preview-54--contes-creoles.netlify.app (built from the branch head, same product as 23236c7). Do not comment on the PR, do not push.
- Cycle: 1 of max 3.
- Output: write `review-1.md` in the mission folder, nothing else in the worktree.

## Owner decisions in force (do not flag as defects)

- Text = `brief/data/story.fr.json` verbatim (page 12 « un bol pour notre table »).
- Kréyòl `story/gcf.md` is an unvalidated draft by design (D-GCF open, owner decision at merge); check only that it is marked as a draft everywhere and never presented as validated.
- No sound. Merge/production/publication reserved to the owner.

## Focus

1. A02 / A09: Mila's extraction to `src/shared/mila/` — is the underwater tale byte- or pixel-identical in behaviour (same seeded draws, build order, materials)? Universe isolation respected (no cross-book imports)? Home tree with a fourth book: shelf/ring, swipe, Ti Kannot unchanged.
2. Owner feedback 1 and the sweep: arms vs dress on pages 1, 3, 10 (and 6, 8), lantern arm page 10, no figure crossing a plant or set element (page 5 and all pages, both formats). Check in the engine over time, not only on the executor's stills; is the `armDepth` measure sound?
3. A08: calabash ownership branch → hands → table → hands → branch, one hero instance, page 3 transfer and page 11 return readable, page 9 belly carry, page 12 a distinct fruit to Man Ninon; fast navigation 2→3→4→3, 6→8→6, 10→11→12→11, long waits on 3 and 11 (no repeated gift).
4. A10 / A11: drive the UI with Playwright and real touch input (CDP `Input.dispatchTouchEvent`), wheel, keys, buttons, reduced motion, resize/orientation, close during load/transition and reopen, missing asset. Write and run some cases of your own; a call to an internal page function does not count.
5. A03 / A04 / A05 / A07: inspect captures you take yourself (1440×900, 390×844, 360×640): calabashes only in branches, contemporary masonry houses, coherent watercolour 2D/3D (give an honest visual judgement against the boards; the art level is an owner call D-ART, but defects such as fringes, sorting errors, clipping, z-fighting, faces smeared by the finish pass are findings), camera presets present for all 12 pages desktop and portrait.
6. A12 / A13 / A14: report numbers plausible and labelled (desktop GPU only, phone emulated), sources rebuild claims (scripts in `art/mila-calebassier/`, archive manifest in the production folder `sources/`), asset register complete.
7. Report claims (AC table, test counts, sweep table, regression table) match what you observe on this SHA.

## Rules

- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` on a scratch copy of `23236c7` outside the mission worktree (e.g. `git -C <worktree> archive 23236c7 | tar -x -C /tmp/review-calebassier`, then `pnpm install --offline --frozen-lockfile`), quote exact counts; trash the scratch copy at the end (`trash`, never `rm -rf`).
- Serve builds on `127.0.0.1` only (`nice -n 19`), or use the Deploy Preview. Stop your servers and browsers at the end.
- Headless Chrome here may fall back to SwiftShader: functional checks and screenshots only, no performance judgement. Bound every run (no open-ended loops), generous timeouts on transitions.
- Network only for the Deploy Preview, package caches and Playwright browsers. No other site, no account, no form.
- Real-phone behaviour and performance are NOT_VERIFIED by design; judge only whether that is reported honestly.
- Captures, if any: `~/.local/share/contes-creole-qa/mila-calebassier/review-1/`.

## Required format of review-1.md

```
VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED
Version: 23236c7224ce6537c9ee9f213792fd7dbc656d80
Reviewer: codex
```

Then: how you drove the UI (browser, viewports, touch method, build or preview), findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, each with the command or journey and its result on this SHA, then the A01–A15 table (AC, status, proof) and the reservations for the owner.
