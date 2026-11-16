# Review brief 2 — 2026-11-15-home-visual-polish

Reviewer: Codex (`review`), independent, fresh session. Rules: pilot `AGENTS.md` (/home/xgueret/Workspace/01-projets/tipunchlabs/agent-workflow/AGENTS.md). Review 2 of at most 3.

## Inputs

- Repository: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch `feat/home-visual-polish`, local only.
- Version under review: `c91eebc` (HEAD). Product HEAD `3143928`; `34dd13f` and `c91eebc` touch only `docs/missions/`.
- Full diff: `git diff ef821d2 c91eebc`. Correction diff since review 1: `git diff 996f0e1 c91eebc`.
- Contract: `mission.md` (AC0–AC12). Previous review: `review-1.md` (CHANGES_REQUESTED on `996f0e1`: F1 844×390 shelf occlusion, F2 camera jump at aspect 1.2, F3 report statuses).
- Executor artifacts: `report.md` (correction-cycle table, AC table), `AUDIT.md` section 12, `evidence/c1-final-*.json|txt`, `evidence/tools/`, media manifests in `evidence/`.
- Heavy media (read-only): `~/.local/share/contes-creole-qa/home-visual-polish/` (incl. `cycle1/final/`).

## What to check

1. F1, F2, F3 are resolved on this version: verify with the evidence and, where you can, independently (as in review 1, e.g. evaluating the camera solution in memory across aspect 1.2 and at 844×390, 932×430, 360×640).
2. The new motion changes (`1868a5c`, `3143928`) introduce no regression: tests, reduced motion, stage bounds, disposal.
3. All ACs still hold on this version; AC statuses in the report match the evidence (AC2/AC3 human playback and AC9 phone stated as not verified).
4. Limits still held: no change outside `src/tree/` in product code, no text/name/navigation/tale/dependency change.
5. Rerun read-only checks (typecheck, lint, tests, build; call the binaries in `node_modules` directly if pnpm's store lock is read-only). No network, no install, no server left running.

## Output

Write only `docs/missions/2026-11-15-home-visual-polish/review-2.md`: `VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED`, `Version: c91eebc`, findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, a status line for each review-1 finding (resolved / not resolved), an AC table (VERIFIED / NOT_VERIFIED / FAIL with proof), commands with exit codes, and what you did not check. Items only a human or a device can verify (playback watching, phone FPS, artistic acceptance) are reservations for the owner, not changes requested from the executor. Write nothing else; no commit.
