# Review brief 1 — MOBILE-SWIPE-NAV (pilotage → Codex)

- Mission: `contes-creole/2026-11-21-mobile-swipe-nav`
- Mission folder: `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-worktrees/mobile-swipe/docs/missions/2026-11-21-mobile-swipe-nav/`
- Read first: `owner-brief.md` (French, authoritative, including its verification table), `owner-feedback-1.md` (owner change: endless free rotation around the home tree on phones, both directions; tales keep their bounds), `mission.md` (AC1–AC9), then `report.md` (section 0 supersedes sections 1–7 where it says so).
- Version under review (exact product SHA): `23bb7d8e65b9b1aa9de080ae3226792d478e6ac8`. Branch HEAD `64e4388` adds only mission docs on top.
- Diff: `git -C /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-worktrees/mobile-swipe diff c5c6f0c 23bb7d8` (base = `origin/main` `c5c6f0c`, the production site).
- PR #52 (draft), Deploy Preview: https://deploy-preview-52--contes-creoles.netlify.app (built from `64e4388`, same product as `23bb7d8`). Do not comment on the PR, do not push.
- Cycle: 1 of max 3.
- Output: write `review-1.md` in the mission folder, nothing else in the worktree.

## Owner decisions in force (do not flag them as defects)

- Feedback 1 (2026-11-21): on phones the home tree turns endlessly, both directions; the scene follows the finger during the drag and settles on a stop. This replaces the brief's "respect start and end" **for the home only**. In tales, one scene per gesture and the tale's bounds still hold (last scene: no close, no restart).
- D4 (2026-11-21): keep that direction (scene follows the finger); the home hint on phones is « Glisse pour explorer », naming no side, removed after the first successful swipe.
- Owner tried the Deploy Preview on a real phone after D4 (2026-11-21): « test téléphone ok ». This does not replace your checks.

## Focus

1. Drive the UI with Playwright and **real touch input** (CDP `Input.dispatchTouchEvent` or equivalent). A check that calls a scene/page function does not count. You may use `qa/swipe.mjs` as a starting point, but write and run at least some cases of your own against each row of the brief's verification table (home, each tale, long text on a small screen FR + gcf, ambiguous gestures, orientation, desktop/tablet vs base).
2. Home on a phone: L→R and R→L both move; several full turns both ways; a trembling tap on a cover opens the right tale; a swipe starting on a cover does not open it; hint text and removal; no horizontal scrollbar at 390×844 and in landscape.
3. Tales (Ti Kannot, Mila): forward twice + back once shows scene 2 text and decor; bounds; one scene per fast swipe; gestures during a transition; buttons and gestures reach the same state; language switch and back control.
4. Phone detection (`src/shared/gesture.ts`, `src/app/app.ts`, `src/tree/index.ts`): a narrow desktop window and a tablet must keep the base behaviour (wheel, keyboard, vertical drag). Compare base `c5c6f0c` vs `23bb7d8`.
5. Code: universe isolation (no cross-universe imports), listeners scoped to the right surfaces, `touch-action` effects on text scrolling, `prefers-reduced-motion`, cleanup of listeners on navigation.
6. Report claims (`report.md` section 0, AC table, test counts) match what you observe on this SHA.

## Rules

- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` on a **scratch checkout** of `23bb7d8` (e.g. `git worktree add <scratch path> 23bb7d8`, remove it at the end) and quote exact counts. Never modify the mission worktree except `review-1.md`.
- Serve builds on `127.0.0.1` only (`nice -n 19`), or use the Deploy Preview (close the Netlify bar). Stop your servers and browsers at the end.
- Headless Chrome here may fall back to SwiftShader: functional checks and screenshots only, no performance judgement. Bound each run, generous timeouts on transitions.
- Network is enabled only for the Deploy Preview, package caches and Playwright browsers. No other site, no account, no form.
- Reader understanding is NOT_VERIFIED by design (owner's two-reader test); judge only whether it is reported honestly. Real-phone Safari is untested: say what remains at risk.
- Captures, if any: `~/.local/share/contes-creole-qa/mobile-swipe-nav/review-1/`.

## Required format of review-1.md

```
VERDICT: PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED
Version: 23bb7d8e65b9b1aa9de080ae3226792d478e6ac8
Reviewer: codex
```

Then: how you drove the UI (browser, profiles, touch method, build or preview), findings `F<k> [blocker|major|minor] file:line — problem — expected fix`, each with the command or journey and its result on this SHA, then the AC1–AC9 table (AC, status, proof) and the reservations for the owner.
