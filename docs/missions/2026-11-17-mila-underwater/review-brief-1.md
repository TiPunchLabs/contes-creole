# Review brief 1 — 2026-11-17-mila-underwater

Reviewer: Codex (`review`), independent. Rules: pilot `AGENTS.md` (/home/xgueret/Workspace/01-projets/tipunchlabs/agent-workflow/AGENTS.md). Review 1 of at most 3.

## Inputs

- Repository: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch `feat/mila-underwater`, local only (no remote action).
- Version under review: `9668453` (HEAD). Product code = `f645de0`; commits after it touch only `qa/` and `docs/missions/` (check it).
- Diff: `git diff d60c1a6 9668453` (base `d60c1a6` = main).
- Contract: `docs/missions/2026-11-17-mila-underwater/mission.md` (work brief, limits, AC0–AC12, Log entries of 2026-11-18: measurement protocol and owner corrections O1–O3).
- Executor artifacts: `AUDIT.md`, `report.md` (Verdict PARTIAL), `evidence/` (md/json, `manifest.tsv`).
- Heavy media (read-only): `~/.local/share/contes-creole-qa/mila-underwater/` (`boards-final/`, `boards-o/`, `final/*.mp4`, frame sheets).
- Upstream for AC1: `https://github.com/Noniv/abyssal-garden` at `a596354` — a local clone may be listed in `AUDIT.md` section 11; no network otherwise (then say what you could not check).

## What to check

1. **Code** (`src/books/mila/world/underwater.ts`, `scene.ts`, tests): correctness; scoped shaders (no generic framework, no second loop, no Three.js upgrade, no new full-screen pass without measured benefit); disposal of every mission-owned GPU resource in the existing cleanup path; integration with adaptive quality and reduced motion; MIT notice + origin comments for adapted upstream fragments, faithful to what the upstream code actually is.
2. **Limits**: nothing changed in story text, audio, navigation, tree, app shell, shared, other books (`git diff --stat d60c1a6 9668453` + targeted diffs); character paths and animation directions preserved (O1/O3 change Mila's height in the shallows only — verify that claim).
3. **Running result, including animation over time**: run the build on a free port (not 5173), drive it with Playwright (`uv run --with playwright`) through the underwater pages 6→7 … 11→12 in sequence and back, language switch, return to the tree, a resize, and ≥ 3 open/close cycles; capture stills and short frame sequences over several seconds (vegetation sway, caustics, particles, the water entry p6→7, the turtle on p7, the water exit p11). Check console errors, clipping, transparency artifacts, Mila walking on/hovering above the water, turtle scale vs Mila. Compare with the executor's boards.
4. **Performance claims** (`evidence/perf.md`): consistency with the code (draw calls 582 → 308 on p9, shader prewarm), protocol (headed GPU-backed Chrome, renderer string recorded), and the open point on uncapped long frames. **Do not run your own FPS measurement in headless Chrome** (software rendering on this laptop is invalid and CPU-heavy: owner rule 2026-11-18, pilot `CLAUDE.md` §3); headless is fine for functional checks and stills. If you run any browser, start it under `nice -n 19`, keep runs bounded and stop it when done.
5. **Checks**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` (no commit of `dist/`). Exact counts and exit codes.
6. **Honesty of the report**: PARTIAL justified; real phone not tested stated; recordings not watched by a person stated; earlier headless perf rounds set aside; delegations listed (AC0: main session Fable 5.2).

No network beyond localhost, no push, no install.

## Output

Write only `docs/missions/2026-11-17-mila-underwater/review-1.md` with:
`VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED`, `Version: 9668453`, findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, an AC table (AC0–AC10 + O1–O3 → proof on this version → VERIFIED / NOT_VERIFIED / FAIL), commands run with exit codes, media you produced (path outside the repo, e.g. `~/.local/share/contes-creole-qa/mila-underwater/review-1/`), and what you did not check. Artistic acceptance is the owner's: judge technical compliance, evidence and visible defects, not taste. Write nothing else; no commit.
