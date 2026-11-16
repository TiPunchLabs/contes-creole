# Report — 2026-11-15-home-visual-polish

Verdict: PARTIAL
Version: 8d7f8132497a6262b1ee3302968b9061c4f9c59e

`Version` is the product HEAD every final check of correction cycle 2 ran on (`8d7f813`). The
commits on top of it (the cycle's evidence, then this report) touch nothing under `src/`. This
report replaces the one written for `3143928`; Codex reviews 1 and 2 (`review-1.md`,
`review-2.md`, both CHANGES_REQUESTED) and their briefs are committed beside it.

Why PARTIAL: these are not verified, and none of them can be by the executor.

- AC12: review 2 asked for changes; no review exists yet for `8d7f813` (review 3 is the last).
- AC6: the measured faults are gone, at the opening and at the climb stops, but by a rule the
  owner has not seen: a figure the shelf or the frame would cut steps out instead of being shown
  cut. On a phone on its side that leaves the characters out of most of the climb. Whether that
  meets "no awkward cuts or overlaps during animations" is his call; it is listed as mandatory
  below until he makes it.
- AC9, phone half: no device.
- AC2 and AC3, human half: measured on every frame and read as frame sequences by an AI agent;
  nobody has watched the motion play.

Three things are kept apart, as the mission asks:

- Technical compliance: verified by commands and measures, listed per criterion.
- Observed visual improvement: what the captures show, stated by the executor.
- Artistic acceptance: Xavier's, not given here. The opening frame replaces the one he validated
  on 2026-11-09 (CANOPY-FACE).

## Correction cycle 2

| Finding                                                                                                       | Severity | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Evidence on `8d7f813`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1: on short landscape screens the climb leaves figures half behind the shelf (844×390 and 932×430, t = 0.54) | major    | Measured first, up and back, on five sizes: the fault was at nearly every climb stop on those screens, and at a fifth to a quarter of the states on desktop and 1024×768 as well. No camera tilt clears every stop without moving the cards (`AUDIT.md` 13.1), so the spiral was left alone and the rule put on the figures (`d34975b`, `8d7f813`): one that the shelf, the intro text or an edge would cut steps out whole, and comes back whole. Tale access, journey timings and the trigger are untouched | `evidence/c2-final-climb.json`: figure-states behind the shelf or cut by an edge, before → after: 66 → 0 at 844×390, 71 → 0 at 932×430, 23 → 0 at 1440×900, 23 → 0 at 390×844, 28 → 0 at 1024×768. Opening, t = 0.1, 0.2, 0.34, 0.54, 0.75, 0.88, 1 and the return at both sizes: `cycle2/final/checks/board-climbcheck-phone-landscape*.jpg`, `cycle2/final/boards/final-phone-landscape.jpg`. `layout_check.py` now reads the climb states: 0 fault on the 17 opening sizes, 0 on the 10 climb runs (`evidence/c2-final-layout.txt`) |
| F3: AC6 accounted for the opening only                                                                        | minor    | AC6 is accounted below for the whole criterion, opening and animations, and stays in the mandatory list pending the owner's reading of the rule                                                                                                                                                                                                                                                                                                                                                               | this report                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

The trade-off, for the owner. The review asked that the climb keep the figures clear of the shelf
on short landscape screens. It does now, but not by showing them: at those sizes the figures are
whole at the foot of the tree and absent for most of the climb. The alternatives are (a) what was
there before, figures half behind the shelf at most stops; (b) a shelf that gives way on those
screens (smaller, or folded during the climb), which is a change to the shelf and outside this
mission; (c) moving the cards or the spiral, outside it too. The executor's recommendation is to
keep the rule: it removes the fault on every size, costs nothing elsewhere (no figure that was
whole is lost), and a phone on its side is where the scene has least room anyway. If the owner
would rather have the characters present there, (b) is the lead to open.

One more thing the rule changes, stated so that it is decided and not discovered: the Konteur's
shortcut to a random tale is offered only while he is shown. Where he stood half behind the shelf
he could still be clicked; now he cannot until he is whole again. All tales stay on the shelf at
all times.

## Scope delivered

- Branch `feat/home-visual-polish`, base `ef821d2`, product HEAD `8d7f813`, local only: no push,
  PR, preview, merge or deploy.
- Executor: Claude Code session `7de48663-1116-4e9e-8682-a99d55b1542b`, model `claude-fable-5-2`.
  No sub-agent was used.
- Commits on the branch, oldest first:

| Commit    | Subject                                                                |
| --------- | ---------------------------------------------------------------------- |
| `e6b18dd` | docs: add home-visual-polish mission                                   |
| `62939bb` | feat(tree): open on the whole flamboyant with the critters at its foot |
| `88edd66` | docs(missions): audit the home and compare three opening compositions  |
| `04bfacb` | feat(tree): keep the whole tree in view at every window shape          |
| `e60ebab` | feat(tree): rebuild Konpè Lapen and Konpè Zanba, shape and motion      |
| `3016dd0` | feat(tree): calm the clearing under reduced motion, live               |
| `3cdfa59` | perf(tree): serve the Konteur as a WebP derivative                     |
| `0f70c39` | feat(tree): let the breeze come in gusts                               |
| `957e576` | fix(tree): start Lapen a little further in, clear of the shelf         |
| `b76c396` | perf(tree): halve the critters' draw calls, cheapen their limbs        |
| `eaf3f09` | fix(tree): hold the intro hint's contrast on the column layouts        |
| `bc06474` | fix(tree): keep the Konteur's fill light off the critters              |
| `996f0e1` | docs(missions): report S2 of home-visual-polish                        |
| `1a3a104` | docs(missions): add Codex review 1 of home-visual-polish and its brief |
| `c5f4bff` | fix(tree): solve the opening shot so nothing hides behind the shelf    |
| `1868a5c` | fix(tree): plant Zanba's feet, bound every turn, ease every stop       |
| `3143928` | fix(tree): let Lapen hop on the spot when the stage has no room        |
| `34dd13f` | docs(missions): record correction cycle 1 of home-visual-polish        |
| `c91eebc` | docs(missions): report correction cycle 1 of home-visual-polish        |
| `cec5913` | docs(missions): add Codex review 2 of home-visual-polish and its brief |
| `d34975b` | fix(tree): never show a figure the shelf or the frame cuts             |
| `8d7f813` | fix(tree): step out under the intro text too, at a tighter limit       |

- Files changed under `src/` since the base: `tree/index.ts`, `tree/overlay/overlay.css`,
  `tree/overlay/overlay.ts` (one read-only accessor for the shelf's box), `tree/scene/camera.ts`,
  `canopy.ts`, `konteur.ts`, `presence.ts`, `critters/{lapen,zanba,parts,wander}.ts`, their
  tests, and `tree/assets/konteur.webp`. Nothing under `src/app`, `src/shared`, `src/books` or
  `src/pages`. No text, name, navigation target or reading order changed; no dependency added.
- Detail: `AUDIT.md` sections 11 (S2), 12 (cycle 1) and 13 (this cycle).

## Acceptance criteria

Evidence paths starting with `evidence/` are in the mission folder; the others are under
`~/.local/share/contes-creole-qa/home-visual-polish/` and listed in
`evidence/c2-media-manifest.tsv`. Evidence was produced on `8d7f813` unless a row says otherwise.

| ID   | Status                                                                                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC0  | verified (by pilotage and by the reviewer)                                                                  | `evidence/ac0-fable-preflight.txt`; reviews 1 and 2 parsed the transcript: every assistant record reports `claude-fable-5-2`                                                                                                                                                                                                                                                                                                      |
| AC1  | verified                                                                                                    | `cycle2/final/boards/before-after-turntable-lapen.jpg`, `-zanba.jpg`, `before-after-closeups.jpg`. Sampled poses. Left: a faint paler oval on Zanba's rump                                                                                                                                                                                                                                                                        |
| AC2  | verified by per-frame measurement and by an agent's frame-sequence reading; **human playback not verified** | `evidence/c2-final-motion-*.json` (4 687 frames on each of three viewports); frame-sequence notes at ×1 and ×0.25 in `AUDIT.md` 12.2, made on `3143928` (the motion code is unchanged since); videos in `cycle1/final/` and `cycle2/final/`                                                                                                                                                                                       |
| AC3  | verified on the same basis; **human playback not verified**                                                 | Planted-foot drift 0.008 m median and 0.019 m at most per stance; Lapen travels 0.0 m on the ground; shadows follow the hop and the fade                                                                                                                                                                                                                                                                                          |
| AC4  | verified                                                                                                    | `evidence/c2-final-contrast.json`: 9 sizes, all texts at or over their minimum (weakest .tree-intro-kicker at 4.6:1 on `w800`). Measured at the opening only                                                                                                                                                                                                                                                                      |
| AC5  | verified                                                                                                    | Variants and choice: `AUDIT.md` section 8; before/after boards in `cycle2/final/boards/`                                                                                                                                                                                                                                                                                                                                          |
| AC6  | measured faults removed at the opening and at the climb stops; **the means awaits the owner's decision**    | Opening: 0 fault on 17 sizes, resize both ways without a jump. Animations: 310 climb states on 10 sizes, up and back, 0 figure behind the shelf or cut by an edge (`evidence/c2-final-climb.json`, `evidence/c2-final-layout.txt`). Not covered: the instants between stops, where a figure being cut is on screen for up to 0.2 s while it fades. Left: at 667×375 and 1024×540 the compact intro touches the crown's right edge |
| AC7  | verified                                                                                                    | `AUDIT.md` 11.5                                                                                                                                                                                                                                                                                                                                                                                                                   |
| AC8  | verified                                                                                                    | Gusts, trigger and timings untouched; journeys pass (`evidence/c2-final-behaviours.json`); camera equals the spiral from t = 0.14 (unit test)                                                                                                                                                                                                                                                                                     |
| AC9  | desktop verified; phone **not verified**                                                                    | `evidence/c2-final-perf.json`: 60 FPS capped, worst uncapped change -5.9 % against the base measured in the same session. Mobile figures are emulation on the laptop GPU                                                                                                                                                                                                                                                          |
| AC10 | verified                                                                                                    | `evidence/c2-final-behaviours.json`: 43 of 43                                                                                                                                                                                                                                                                                                                                                                                     |
| AC11 | verified                                                                                                    | `pnpm build`, `typecheck`, `lint` exit 0; `pnpm test` 380 passed; other pages 24 of 24; console: only the base's `favicon.ico` 404                                                                                                                                                                                                                                                                                                |
| AC12 | not verified                                                                                                | Reviews 1 and 2: CHANGES_REQUESTED. No review of `8d7f813` yet                                                                                                                                                                                                                                                                                                                                                                    |

## Performance summary

| Measure                                  | Base `ef821d2` | Final `8d7f813`                              |
| ---------------------------------------- | -------------- | -------------------------------------------- |
| Cold load and loader (desktop)           | see right      | 1424 → 717 kB, loader gone at 1735 → 1583 ms |
| Capped FPS, all six sequences            | 59.9           | 59.9                                         |
| Worst uncapped change, same-session base | n/a            | -5.9 %                                       |
| Draw calls at the opening, desktop       | 322            | 311                                          |
| Phone                                    | not measured   | not measured                                 |

Tables: `AUDIT.md` 13.3 (this HEAD), 12.3 and 11.3 (history, protocol).

## Observed visual improvement (executor's reading)

- The flamboyant is a whole shape at the opening on every size captured.
- The Konteur and both critters stand whole above the shelf at the opening on every size checked.
- Along the climb no capture shows a figure half behind the shelf or cut by an edge any more; on
  short landscape screens that is because they are not shown there.
- Not established here: how the motion and the stepping out and in feel at speed.

## Deviations and things to know

- `review-1.md` and `review-2.md` were realigned by prettier (tables only), which the pre-commit
  hook requires.
- The harness's permission check for shell commands failed several times during this cycle; the
  source edits were then made with the file-edit tool. Nothing was skipped because of it.
- Deletions: the scripts send generated frames to the trash. Earlier in the mission they used
  `unlink`, and `rm -f` was used a few times on files generated in the same session.
- A scratch worktree of `ef821d2` is still registered under the session scratchpad, for the
  same-session base build. `git worktree remove` on it, then `git worktree prune`, cleans it.
- `04bfacb` was amended once, unpushed, before any review.
- The site loads an analytics script from `cloud.umami.is`; the QA scripts block it since S2.
- Load and FPS use the production build on ports 5182 (final) and 5183 (base), beside the dev
  server on 5181. All three are stopped at the end of the step.

## Remaining leads

Mandatory, not met:

| Lead                                                                                       | Impact | Effort | Note                                         |
| ------------------------------------------------------------------------------------------ | ------ | ------ | -------------------------------------------- |
| AC12: Codex review 3 of `ef821d2..8d7f813`                                                 | high   | low    | the last allowed                             |
| AC6: the owner's decision on the stepping-out rule (keep it, or open the shelf lead below) | high   | low    | trade-off above and in `AUDIT.md` 13.2       |
| AC2/AC3: a person watches the videos at ×1 and ×0.25 (or the page itself)                  | high   | low    | files in `cycle1/final/` and `cycle2/final/` |
| AC9: frame rate on a real mid-range phone                                                  | high   | low    | needs a device                               |

Optional, by impact over effort:

| Lead                                                                                          | Impact | Effort |
| --------------------------------------------------------------------------------------------- | ------ | ------ |
| Lite pixel ratio on phones (stair-stepped edges at ratio 1), with a device to measure         | high   | low    |
| A shelf that gives way on short landscape screens, so the figures can stay through the climb  | medium | medium |
| Compact intro on short landscape windows (667×375, 1024×540): still touches the crown         | medium | low    |
| Portrait phones: Zanba never walks, the stage being too narrow for his arcs                   | medium | medium |
| Faces: no mouth or brows, expression comes from ears, eyes and posture only                   | medium | medium |
| Zanba's rump: faint paler oval from behind                                                    | low    | low    |
| A favicon (the only console error)                                                            | low    | low    |
| `doc/architecture.md` and `CLAUDE.md`: opening shot, stage, presence rule, new critters, WebP | low    | low    |

## Next actions

1. Codex review 3 of `ef821d2..8d7f813`. No approval needed to start it.
2. Xavier reads the trade-off above and decides on the stepping-out rule.
3. A person plays the character videos at ×1 and ×0.25, or watches the page for a minute.
4. A phone test when a device is at hand.
5. Xavier's artistic acceptance and merge decision.
