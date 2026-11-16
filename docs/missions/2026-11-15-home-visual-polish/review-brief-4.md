# Review brief 4 — 2026-11-15-home-visual-polish

Reviewer: Codex (`review`), independent, fresh session. Rules: pilot `AGENTS.md` (/home/xgueret/Workspace/01-projets/tipunchlabs/agent-workflow/AGENTS.md). Review 4: authorized by the owner beyond the cap (decision CAP, `mission.md` Log), and the last one. After it, open items go to the owner.

## Inputs

- Repository: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch `feat/home-visual-polish`, local only.
- Version under review: product **`2a6ed4c3ec6855704edb816d5935b0a8409c92b1`**; `434ba59` and `6a3ab94` (HEAD) touch only `docs/missions/`.
- Full diff: `git diff ef821d2 2a6ed4c`. Correction diff since review 3: `git diff 8d7f813 2a6ed4c` (product commits `aae0e5f`, `240c4f5`, `69ab983`, `7482c74`, `725a942`, `2a6ed4c`).
- Contract: `mission.md` (AC0–AC12) and its Log for cycle 3: CAP decision (no pop-in/out during the climb, F5, F4), O1 (turn about the trunk), O2 (pivot rebound, owner capture), O3 (Zamba's ears), O4 (ears inside the body in motion), O5 (Konteur's foot "triangle"), O-MODEL (subagent delegation allowed; AC0 now covers the executor session).
- Previous reviews: `review-1.md` … `review-3.md`. Executor artifacts: `report.md` (cycle 3), `AUDIT.md` sections 14+, `evidence/c3-final-*`, `evidence/tools/`, media manifests; heavy media in `~/.local/share/contes-creole-qa/home-visual-polish/cycle3/` (`final/`, `interim-*`, `o3-before/`, `o4-before/`, `o5-before/`); owner screenshots `owner-o3-…png`, `owner-o5-…png` in the QA folder.

## What to check

1. Review-3 F4, F5, F6 and the CAP scope (no figure popping in/out during the climb; the cycle-2 step-out rule removed): fixed? Re-derive where you can (in-memory camera/projection, harness logic), not only from the report.
2. O1/O2: camera aim on the trunk axis and monotonic pitch/height/distance/lens across the climb; the rebound root cause (pitch dip) and its fix and test; the "2 of 12" settle legs flagged at 390×844 — is that a remaining rebound or a measurement artefact? State it.
3. O3/O4: ear geometry and the per-frame clearance solve (correctness, cost after `2a6ed4c`, no hidden ears, behaviour at extremes); the clearance check's exclusions (ear root) are justified.
4. O5: the lantern change and that no other figure was altered.
5. AC6 residue (Konteur's legs/feet behind the shelf at short landscape and 1280×720, 31 critter-states) and AC9 desktop at −10.5 % for one sequence: accurately reported? Does either make an AC fail as written, or is it an owner call?
6. Report accuracy incl. delegations (O-MODEL) and AC0 wording; limits: product changes confined to `src/tree/`, no text/name/target/tale/dependency change. Rerun typecheck, lint, tests, build via `node_modules/.bin` (build output outside the repo). No network, no install, no server left running.

## Output

Write only `docs/missions/2026-11-15-home-visual-polish/review-4.md`: `VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED`, `Version: 2a6ed4c3ec6855704edb816d5935b0a8409c92b1`, findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, a status line for each review-3 finding and for O1–O5, an AC table (VERIFIED / NOT_VERIFIED / FAIL with proof), commands with exit codes, what you did not check, and a short "Owner decisions" list (artistic acceptance, human playback, phone FPS, AC6 residue, AC9 margin). Write nothing else; no commit.
