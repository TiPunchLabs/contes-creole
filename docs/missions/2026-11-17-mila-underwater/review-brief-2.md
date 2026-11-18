# Review brief 2 — 2026-11-17-mila-underwater

Reviewer: Codex (`review`), independent. Rules: pilot `AGENTS.md` (/home/xgueret/Workspace/01-projets/tipunchlabs/agent-workflow/AGENTS.md). Review 2 of at most 3 — and, by owner decision SHORTEN, normally the last: if it has no blocker or major finding, the executor fixes the minor ones and goes to push + PR + merge without review 3. Grade severities carefully.

## Inputs

- Repository: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch `feat/mila-underwater`.
- Version under review: `a952d07` (HEAD). Product code = `a425401`; later commits touch only `qa/` and `docs/missions/` (check it).
- Diffs: full `git diff d60c1a6 a952d07`; since review 1 `git diff 9668453 a952d07` (product: `1638c4c` O3 exit, `5af99d0` O5 living conch, `a425401` O4 avoidance with `shoal.ts`).
- Contract: `mission.md` incl. the 2026-11-18 Log entries (protocol, O1–O5, SHORTEN, ART, MERGE+DEPLOY). Previous review: `review-1.md` (F1 and reservations).
- Executor artifacts: `AUDIT.md`, `report.md` (PARTIAL), `evidence/` (`clearance.*`, `exit-probe.*`, `long-frames.md`, `corrections-o4.*`, manifest).
- Media (read-only): `~/.local/share/contes-creole-qa/mila-underwater/` (`boards-o4/`, `o4/`, `boards-c1/`, `boards-final/`, `final/`).

## Environment for this review

This session has network access (owner decision RUNTIME, 2026-11-18) so you can serve the build on localhost and drive it with Playwright (`uv run --with playwright python ...`; browsers in `~/.cache/ms-playwright`). Use a free port (not 5173, which is the owner's dev server). If `pnpm` hits the store lock, call the tools through `node node_modules/...` as in review 1. Start browsers under `nice -n 19`, keep runs bounded, stop servers and browsers at the end. **No FPS measurement in headless Chrome** (software rendering; pilot `CLAUDE.md` §3). No push, no install into the repository, no commit.

## What to check

1. **Running result over time (the gap of review 1)**: build, serve, open Mila's tale; go through pages 6→7 … 11→12 in sequence and back, language switch, return to the tree, one resize, ≥ 3 open/close cycles of the tale. Capture stills and short frame sequences (several seconds) of: vegetation sway and caustics; the water entry 6→7 and exit 10→11 (O1/O3: no walking on the water, no hovering, no pose snap); the turtle on page 7 (O2); the living conch on pages 8–10 (O5: readable, defects fixed; note the executor's statement that it is only in view ~2 s on arriving at page 9); fish around Mila (O4: no fish through Mila or each other, smooth avoidance without jitter or freezing). Console errors, clipping, transparency artifacts.
2. **Code** of the new parts (`shoal.ts`, `scene.ts` changes since `9668453`): correctness, determinism, cost per frame (fish count × neighbours), no new loop, disposal, reduced motion; tests meaningful (`shoal.test.ts`).
3. **O4 evidence**: is the clearance check sound (proxies, tolerance, frames covered, before/after)? Spot-check it against your own running observations.
4. **Performance**: the reported uncapped page-9 cost (+0.57 ms/frame, −22 % uncapped FPS, unchanged at capped 60 Hz) and the long-frame analysis — consistent with the code and the headed GPU evidence? Judge whether it is a material regression against the mission's rule (> 10 % median FPS on the tested hardware) given the 60 Hz cap, and grade accordingly with a reason.
5. **Limits**: story, audio, tree, app shell, shared, other books unchanged (`git diff --exit-code d60c1a6 a952d07 -- …` as in review 1); paths/directions changed only locally for avoidance (AC6 as amended).
6. Checks: typecheck, lint, tests, build with exit codes and counts.
7. Review-1 F1 resolved; AC0: the pilot's evidence is in `report.md` §6 (launch argv + transcript model counts) — accept it as pilot-supplied.

## Output

Write only `docs/missions/2026-11-17-mila-underwater/review-2.md`: `VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED`, `Version: a952d07`, findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, AC table (AC0–AC10 + O1–O5 → proof on this version → VERIFIED / NOT_VERIFIED / FAIL), commands with exit codes, media you produced (under `~/.local/share/contes-creole-qa/mila-underwater/review-2/`), what you did not check. Artistic acceptance was given in advance by the owner: judge technical compliance and visible defects, not taste. Write nothing else; no commit.
