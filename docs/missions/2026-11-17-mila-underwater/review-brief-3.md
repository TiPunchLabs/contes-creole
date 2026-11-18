# Review brief 3 — 2026-11-17-mila-underwater

Reviewer: Codex (`review`), independent. Rules: pilot `AGENTS.md` (/home/xgueret/Workspace/01-projets/tipunchlabs/agent-workflow/AGENTS.md). **Review 3 of 3 — the last one.** If it has no blocker or major finding, the executor fixes minor findings and goes to push + PR + merge + production (owner decision MERGE+DEPLOY, Log 2026-11-18). Grade severities carefully; a major finding here sends the mission to the owner.

## Inputs

- Repository: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch `feat/mila-underwater`.
- Version under review: `6680878` (HEAD). Product code = `7ea9a48`; `d4d46cd`, `adb0b2f`, `6680878` touch only `qa/`, `docs/missions/` and `.prettierignore` (check it).
- Diffs: full `git diff d60c1a6 6680878`; since review 2 `git diff a952d07 6680878` (product: `ad2d9db` fish solver rounds, `7ea9a48` crab and conch rest on the sand; QA: `2e04279` clearance predicate and pairs, `d4d46cd`).
- Contract: `mission.md` with its Log; previous review `review-2.md` (F2 major, F3, F4 minor, AC7 and O5 NOT_VERIFIED).
- Executor artifacts: `report.md` (PARTIAL, Version `7ea9a48`), `AUDIT.md`, `evidence/` (clearance results, AC7 cycle series, capped frame run).
- Media (read-only): `~/.local/share/contes-creole-qa/mila-underwater/`.

## Environment

Same as review 2: network for localhost; free port (not 5173, the owner's dev server); `nice -n 19` on browsers; bounded runs; stop servers and browsers at the end. No FPS measurement in headless Chrome (pilot `CLAUDE.md` §3). No push, no install into the repository, no commit.

## What to check (focus on what changed since review 2)

1. **F2 resolved**: the clearance predicate is a sound lower bound on the true gap (no overlap can be missed); your two counterexamples are covered by tests and reported as overlaps; every living pair (fish, Mila, turtle, crab, living conch, solids, ground) is checked, with counts; results regenerated on `7ea9a48`. Is "no kind overlaps by more than 2 cm" acceptable for O4 as amended, and is the tolerance honest?
2. **F3 resolved**: `shoal.ts` alternating rounds (max 12, walls last): correctness, determinism, bounded cost, no new loop; crowded and boundary tests meaningful.
3. **Product changes**: crab raised 4 cm, conch along the slope, neither moved from its place; no visual regression on pages 8–10 (short running check: stills on 8, 9, 10; fish near Mila on one page).
4. **F4 resolved**: report wording for AC7 and O5 (O5 is PARTIAL: readable on pages 8–10 not met while its place is kept; the owner is deciding whether to move it — not a finding against this version).
5. **AC7**: the 5-cycle series (live GL objects stable, zero on the tree, heap +0.2–0.4 MB/cycle): is the method valid and the conclusion supported?
6. **Performance**: the executor reports one capped phone-layout run at median 57.47 fps vs 59.88 earlier (desktop 59.88), not repeated. Judge from the code change (solver cost 0.43 → 0.31 ms/step) whether a material regression is plausible; do not measure FPS yourself in headless.
7. **Limits**: `git diff --exit-code d60c1a6 6680878 -- ` story, audio, tree, app shell, shared, other books (as in review 2). Note the `.prettierignore` change (reviewer files excluded from formatting) and say whether it is acceptable.
8. Checks: typecheck, lint, tests (executor reports 405), build, with exit codes and counts.

## Output

Write only `docs/missions/2026-11-17-mila-underwater/review-3.md`: `VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED`, `Version: 6680878`, findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, status of review-2 findings, AC table (AC0–AC10 + O1–O5 → proof on this version → VERIFIED / NOT_VERIFIED / FAIL), commands with exit codes, media you produced (under `~/.local/share/contes-creole-qa/mila-underwater/review-3/`), what you did not check. Artistic acceptance was given in advance by the owner. Write nothing else; no commit.
