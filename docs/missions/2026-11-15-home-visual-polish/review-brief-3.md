# Review brief 3 — 2026-11-15-home-visual-polish

Reviewer: Codex (`review`), independent, fresh session. Rules: pilot `AGENTS.md` (/home/xgueret/Workspace/01-projets/tipunchlabs/agent-workflow/AGENTS.md). Review 3 of 3: the last allowed. After it, open items go to the owner.

## Inputs

- Repository: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch `feat/home-visual-polish`, local only.
- Version under review: `e03959f` (HEAD). Product HEAD `8d7f813`; `64d81ea` and `e03959f` touch only `docs/missions/`.
- Full diff: `git diff ef821d2 e03959f`. Correction diff since review 2: `git diff c91eebc e03959f` (product commits `d34975b`, `8d7f813`).
- Contract: `mission.md` (AC0–AC12). Previous reviews: `review-1.md`, `review-2.md`.
- Executor artifacts: `report.md` (section "Correction cycle 2" with the trade-off for the owner), `AUDIT.md` section 13, `evidence/c2-final-*`, `evidence/tools/`, media manifests; heavy media in `~/.local/share/contes-creole-qa/home-visual-polish/cycle2/`.

## What to check

1. Review-2 F1 and F3: the climb no longer shows figures cut by the shelf or frame (310 climb states, 10 sizes); verify independently where you can (in-memory camera/projection as before) and inspect the t=0.54 captures at 844×390 and 932×430.
2. The new "step out" rule (figures hidden rather than shown cut): correctness, no flicker/popping at thresholds (hysteresis or fade), behaviour under reduced motion, desktop/portrait sizes not worse than at `c91eebc`.
3. Interaction change disclosed by the executor: the Konteur's random-tale shortcut is not clickable while he is stepped out. Judge whether this changes navigation or business behaviour forbidden by the mission (all tales stay reachable on the shelf), or is a presentation consequence to flag for the owner. State it explicitly either way.
4. Report accuracy: AC6 accounted for the whole criterion, trade-off options (a)/(b)/(c) fairly stated, AC2/AC3 human playback and AC9 phone stated as not verified.
5. Limits: product changes confined to `src/tree/`, no text/name/target/tale/dependency change. Rerun typecheck, lint, tests, build via `node_modules/.bin` (build output outside the repo). No network, no install, no server left running.

## Output

Write only `docs/missions/2026-11-15-home-visual-polish/review-3.md`: `VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED`, `Version: e03959f`, findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, a status line for each review-2 finding, an AC table (VERIFIED / NOT_VERIFIED / FAIL with proof), commands with exit codes, what you did not check, and a short "Owner decisions" list (items only the owner can settle: the step-out trade-off, human playback, phone FPS, artistic acceptance incl. CANOPY-FACE change). Write nothing else; no commit.
