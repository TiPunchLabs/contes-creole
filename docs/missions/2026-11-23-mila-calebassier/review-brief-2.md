# Review brief 2 — MILA-CALEBASSIER (pilotage → Codex)

- Mission: `contes-creole/2026-11-23-mila-calebassier`
- Mission folder: `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-worktrees/mila-calebassier/docs/missions/2026-11-23-mila-calebassier/`
- Read first: your own `review-1.md`, then `report.md` section « Answers to review 1 » (Verdict PARTIAL, Version 486c002), `mission.md` (decisions log: F2 is a narrow shell fix in scope, applies to every book), `brief/specs/06_QA_LIVRAISON.md`.
- Version under review (exact product SHA): `486c002bd56e7e836cbfd269bca6f291cb15a694`. Branch HEAD `07d81a8` adds only mission docs/evidence on top.
- Diff of this cycle: `git -C <worktree> diff 23236c7 486c002` (commits `875fb5d`, `486c002`). Full product diff: `3ce9759..486c002`.
- Draft PR #54, Deploy Preview https://deploy-preview-54--contes-creoles.netlify.app (built from the branch head; check it serves 486c002's product before relying on it, otherwise use a local build). Do not comment on the PR, do not push.
- Cycle: 2 of max 3.
- Output: write `review-2.md` in the mission folder, nothing else in the worktree.

## Owner decisions in force (do not flag as defects)

Same as brief 1: text verbatim from `brief/data/story.fr.json`; Kréyòl is an unvalidated draft (only check it is marked as such); no sound; merge/publication reserved to the owner; art level is the owner's call D-ART.

## Focus

1. F1: re-run your 390x844 journey on pages 5 and 10 and check every page at 390x844, 360x640, 1440x900 and after orientation change (portrait → landscape → portrait), normal and reduced motion. Fruit, hands, faces, lantern, dawn gift whole and clear of the text card and the reader's buttons, at the reading frame and during the action. Judge the new checks (`data-framing`, `qa/calebassier.mjs` mode `framing`, `qa/calebassier-framing.mjs`, `qa/calebassier-subjects.mjs`): do they catch the review-1 symptom (the report cites negative controls `QA_SHIFT_LOOK=-0.12` and an injected style — reproduce at least one)? Do `fitLens` / `textShift` hold on screens not in their list?
2. F2: drive it yourself with real input. First Escape during the dive, during held `.glb` loading (hold the responses), and during a page change, for this tale, Ti Kannot and the underwater Mila: tree back, no book, no reading UI, one WebGL context left, tale reopens cleanly, no console error, focus back. Look for regressions the change could cause in the shell (`src/app/app.ts`): Escape inside an open book, load error path, rapid open/Escape/open, swipe navigation, home ring. Is the abort wiring free of leaks (listeners, late `mount` disposed)?
3. Regressions on the other tales: the report's table (tk-reading, tkp, mila, partial mila-lang, underwater stills 20/20 in a clean run, desktop run-to-run instability called pre-existing). Check the claims you can, and say whether the instability is plausibly pre-existing (compare with `3ce9759` if cheap).
4. Non-regression of owner feedback 1 (arms clear of the dress pages 1, 3, 10; lantern arm page 10; no figure through a plant page 5) and of A08 ownership (one hero calabash, page 3 transfer, page 9 carry, page 11 return, page 12 distinct fruit) after the camera changes, especially page 10's new « hold the meeting, then follow the walk ».
5. Reservations of review 1 now answered: underwater pair count, asset-register weights.
6. Report claims of this cycle match what you observe on this SHA (test counts, 37/37, 84/84, 17/17, 36 app tests).

## Rules

- Same as brief 1: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` on a scratch copy of `486c002` outside the worktree (`git -C <worktree> archive 486c002 | tar -x -C /tmp/review-calebassier-2`, `pnpm install --offline --frozen-lockfile`), exact counts; trash the scratch copy at the end (`trash`, never `rm -rf`).
- Serve on `127.0.0.1` only (`nice -n 19`), bound every run, generous timeouts. If your browser falls back to SwiftShader, functional checks and screenshots only. Stop every server and browser you start before you finish (last time a `vite preview` on :4288 was left running; if your sandbox cannot kill it, say so in review-2.md with the pid).
- Network only for the Deploy Preview, package caches and Playwright browsers.
- Real-phone behaviour and performance remain NOT_VERIFIED by design.
- Captures, if any: `~/.local/share/contes-creole-qa/mila-calebassier/review-1/cycle2/`.

## Required format of review-2.md

```
VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED
Version: 486c002bd56e7e836cbfd269bca6f291cb15a694
Reviewer: codex
```

Then: how you drove the UI, status of each review-1 finding (fixed / partial / not fixed, with proof), new findings `F<k> [blocker|major|minor] file:line — problem — expected fix` with command or journey and result on this SHA, the A01–A15 table (AC, status, proof) and the reservations for the owner. Finish your turn with the line: review ready, VERDICT = <verdict>
