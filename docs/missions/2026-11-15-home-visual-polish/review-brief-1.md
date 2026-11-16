# Review brief 1 — 2026-11-15-home-visual-polish

Reviewer: Codex (`review`), independent. Rules: pilot `AGENTS.md` (/home/xgueret/Workspace/01-projets/tipunchlabs/agent-workflow/AGENTS.md). Review 1 of at most 3.

## Inputs

- Repository: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch `feat/home-visual-polish`, local only (no remote action).
- Version under review: `996f0e1` (HEAD). Product code is identical to `bc06474` (`git diff bc06474 996f0e1` touches only `docs/missions/`); the executor's checks ran on `bc06474`.
- Diff: `git diff ef821d2 996f0e1` (base `ef821d2` = main).
- Contract: `docs/missions/2026-11-15-home-visual-polish/mission.md` (work brief, limits, AC0–AC12).
- Executor artifacts: `AUDIT.md` (diagnosis, variants, section 11 for S2), `report.md` (verdict PARTIAL, AC table), `evidence/` (JSON measures, tools, media manifests `s1-media-manifest.tsv`, `s2-media-manifest.tsv`).
- Heavy media (read-only): `~/.local/share/contes-creole-qa/home-visual-polish/` (boards, videos, captures listed in the manifests).

## What to check

1. Each AC links to a proof valid on this version; read the evidence (JSON, boards), not only the report. Say which claims you could not check.
2. Limits held: no change to business logic, navigation targets, tale content, French/Creole texts or name spellings (`zanba` in code, Lapen/Zanba names); nothing under `src/app`, `src/shared`, `src/books`, `src/pages`; no new dependency. Use `git diff ef821d2 996f0e1 --stat` and targeted diffs.
3. Code quality of the `src/tree/` changes: correctness, disposal of Three.js resources, reduced-motion handling (live preference change), accessibility (contrast, keyboard, touch), performance claims (draw calls, WebP derivative, uncapped FPS -6.9 %) consistent with the code.
4. Tests: rerun read-only checks you can without network: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` (output under `dist/` is fine; do not commit). Report exact counts and exit codes.
5. Honesty of the report: PARTIAL justified; AC9 phone not verified stated; R2 (opening frame differs from the owner-validated CANOPY-FACE of 2026-11-09) disclosed; deviations (rm/unlink of generated files, leftover scratch worktree, amended commit) correctly described.

Do not start dev servers on ports already used by others; if you need a server, use a free port and stop it. No network, no push, no install.

## Output

Write only `docs/missions/2026-11-15-home-visual-polish/review-1.md` with:
`VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED`, `Version: 996f0e1`, findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, an AC table (AC → proof on this version → VERIFIED / NOT_VERIFIED / FAIL), commands run with exit codes, and what you did not check. Artistic acceptance is the owner's: judge technical compliance and evidence, not taste. Write nothing else; no commit.
