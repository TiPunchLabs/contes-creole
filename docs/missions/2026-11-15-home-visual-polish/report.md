# Report — 2026-11-15-home-visual-polish

Verdict: PARTIAL
Version: 31439283160bd55b658c3372acea31d3255eb190

`Version` is the product HEAD every final check of correction cycle 1 ran on (`3143928`). The
two commits on top of it (the cycle's evidence, then this report) touch nothing under `src/`. This report replaces the one written for `bc06474`; Codex review 1 (`review-1.md`,
CHANGES_REQUESTED on `996f0e1`) and its brief are committed beside it.

Why PARTIAL: three things are not verified, and none of them can be by the executor.

- AC12: review 1 asked for changes; no review exists yet for `3143928`.
- AC9, phone half: no device.
- AC2 and AC3, human half: the motion was measured on every frame and read as frame sequences by
  an AI agent. Nobody has watched it play at ×1 and ×0.25.

Three things are kept apart, as the mission asks:

- Technical compliance: verified by commands and measures, listed per criterion.
- Observed visual improvement: what the captures show, stated by the executor.
- Artistic acceptance: Xavier's, not given here. The opening frame replaces the one he validated
  on 2026-11-09 (CANOPY-FACE).

## Correction cycle 1

| Finding                                         | Severity | What was done                                                                                                                                                                                                                                                  | Evidence on `3143928`                                                                                                                                                                                                                                            |
| ----------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1: figures hidden by the shelf at 844×390      | major    | `c5f4bff`: distance and tilt of the opening camera are solved for the screen, so the Konteur's feet rest above the shelf and the crown below the intro; critters no nearer the camera than he is. The same check found and fixed the fault at eight more sizes | Layout check: 0 fault on 17 sizes (`evidence/c1-final-layout.txt`); opening, 45 s of motion and climb at 844×390, opening and climb at 932×430 (`cycle1/final/boards/final-phone-landscape.jpg`, videos); `AUDIT.md` 12.1                                        |
| F2: 6.5 m camera jump across aspect 1.2         | major    | Same commit: one continuous solution in width and height replaces the per-layout shots                                                                                                                                                                         | Unit test across the limit, one pixel at a time, both directions; live resize of an open page both directions: largest move 0.347 m per step, 0.13 m at the layout switch, 0 step with a figure cut, hidden or under the intro (`evidence/c1-final-resize.json`) |
| F3: AC statuses overstated; motion not observed | minor    | Statuses corrected below. Every frame of 75 s read from the scene on three viewports; that found real defects (feet drifting, snap turns, dead stops), fixed in `1868a5c` and `3143928`; frame-sequence notes at ×1 and ×0.25 recorded, labelled as an agent's | `evidence/c1-final-motion-*.json`, `AUDIT.md` 12.2                                                                                                                                                                                                               |

## Scope delivered

- Branch `feat/home-visual-polish`, base `ef821d2`, product HEAD `3143928`, local only: no push,
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

- Files changed under `src/` since the base: `tree/index.ts`, `tree/overlay/overlay.css`,
  `tree/scene/camera.ts`, `canopy.ts`, `konteur.ts`, `critters/{lapen,zanba,parts,wander}.ts`,
  their tests, and `tree/assets/konteur.webp`. Nothing under `src/app`, `src/shared`, `src/books`
  or `src/pages`. No text, name, navigation target or reading order changed; no dependency added.
- Detail: `AUDIT.md` sections 11 (S2) and 12 (this cycle).

## Acceptance criteria

Evidence paths starting with `evidence/` are in the mission folder; the others are under
`~/.local/share/contes-creole-qa/home-visual-polish/` and listed in
`evidence/c1-media-manifest.tsv`. All evidence below was produced on `3143928` unless a row says
otherwise.

| ID   | Status                                                                                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC0  | verified (by pilotage and by the reviewer)                                                                  | `evidence/ac0-fable-preflight.txt`; review 1 parsed the transcript: every assistant record reports `claude-fable-5-2`                                                                                                                                                                                                                                                     |
| AC1  | verified                                                                                                    | `cycle1/final/boards/before-after-turntable-lapen.jpg`, `-zanba.jpg`, `before-after-closeups.jpg`. Sampled poses, not every animated pose. Left: a faint paler oval on Zanba's rump                                                                                                                                                                                       |
| AC2  | verified by per-frame measurement and by an agent's frame-sequence reading; **human playback not verified** | `evidence/c1-final-motion-*.json` (4 687 frames on each of three viewports), notes at ×1 and ×0.25 in `AUDIT.md` 12.2, videos and `-x0.25` copies in `cycle1/final/`, gait and turn tests in `wander.test.ts`                                                                                                                                                             |
| AC3  | verified on the same basis; **human playback not verified**                                                 | Planted-foot drift 0.008 m median and 0.019 m at most per stance; Lapen travels 0 m on the ground; shadows follow the hop; no bleaching by the lantern (`s2/60-lamp`)                                                                                                                                                                                                     |
| AC4  | verified                                                                                                    | `evidence/c1-final-contrast.json`: 9 sizes, all texts at or over their minimum, weakest .tree-intro-kicker at 4.63:1 on `w800` (needs 4.5); grey boards. Measured at the opening only                                                                                                                                                                                     |
| AC5  | verified                                                                                                    | Variants and choice: `AUDIT.md` section 8; before/after boards in `cycle1/final/boards/`                                                                                                                                                                                                                                                                                  |
| AC6  | verified at the opening, with named limits                                                                  | Layout check 0 fault on 17 sizes; resize both directions without a jump; phones on their side captured at opening, in motion and along the climb. Left: at 667×375 and 1024×540 the compact intro touches the crown's right edge; along the climb (not at the opening) on short landscape screens the critters can pass under the shelf, as on the base (`AUDIT.md` 12.4) |
| AC7  | verified                                                                                                    | `AUDIT.md` 11.5                                                                                                                                                                                                                                                                                                                                                           |
| AC8  | verified                                                                                                    | Gusts (`evidence/c1-final-wind.json`), trigger and timings untouched; journeys pass (`evidence/c1-final-behaviours.json`); camera equals the spiral from t = 0.14 (unit test)                                                                                                                                                                                             |
| AC9  | desktop verified; phone **not verified**                                                                    | `evidence/c1-final-perf.json`: 60 FPS capped, worst uncapped change -2.7 % against the base measured in the same session. Mobile figures are emulation on the laptop GPU                                                                                                                                                                                                  |
| AC10 | verified                                                                                                    | `evidence/c1-final-behaviours.json`: 43 of 43                                                                                                                                                                                                                                                                                                                             |
| AC11 | verified                                                                                                    | `pnpm build`, `typecheck`, `lint` exit 0; `pnpm test` 372 passed; other pages 24 of 24; console: only the base's `favicon.ico` 404                                                                                                                                                                                                                                        |
| AC12 | not verified                                                                                                | Review 1: CHANGES_REQUESTED on `996f0e1`. No review of `3143928` yet                                                                                                                                                                                                                                                                                                      |

## Performance summary

| Measure                                  | Base `ef821d2` | Final `3143928`                              |
| ---------------------------------------- | -------------- | -------------------------------------------- |
| Cold load and loader (desktop)           | see right      | 1424 → 716 kB, loader gone at 1735 → 1591 ms |
| Capped FPS, all six sequences            | 59.9           | 59.9                                         |
| Worst uncapped change, same-session base | n/a            | -2.7 %                                       |
| Draw calls at the opening, desktop       | 322            | 311                                          |
| Phone                                    | not measured   | not measured                                 |

Tables: `AUDIT.md` 12.3 (this HEAD) and 11.3 (protocol, history).

## Observed visual improvement (executor's reading)

- The flamboyant is a whole shape at the opening on every size captured, under the band or beside
  the column.
- The Konteur and both critters stand above the shelf and inside the frame on every size checked,
  phones on their side included, and stay there for the 75 s read.
- Zanba and Lapen show no join between pieces at twice the displayed size; Zanba's feet hold the
  ground and he walks his turns.
- Not established here: how the motion feels at speed. That needs a person.

## Deviations and things to know

- `review-1.md` was realigned by prettier (its table only), which the pre-commit hook requires.
- Deletions: the scripts now send generated frames to the trash (`trash`). Earlier in the mission
  they used `unlink`, and `rm -f` was used a few times on files generated in the same session.
- A scratch worktree of `ef821d2` is still registered under the session scratchpad, for the
  same-session base build. `git worktree remove` on it, then `git worktree prune`, cleans it.
- `04bfacb` was amended once, unpushed, before any review.
- The site loads an analytics script from `cloud.umami.is`; the QA scripts block it since S2.
  Whether S1's runs were counted is not known.
- Load and FPS use the production build on ports 5182 (final) and 5183 (base), beside the dev
  server on 5181. All three are stopped at the end of the step.

## Remaining leads

Mandatory, not met:

| Lead                                                                      | Impact | Effort | Note                                              |
| ------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------- |
| AC12: Codex review 2 of `ef821d2..3143928`                                | high   | low    | next step                                         |
| AC2/AC3: a person watches the videos at ×1 and ×0.25 (or the page itself) | high   | low    | files in `cycle1/final/`, list in `AUDIT.md` 12.2 |
| AC9: frame rate on a real mid-range phone                                 | high   | low    | needs a device                                    |

Optional, by impact over effort:

| Lead                                                                                            | Impact | Effort |
| ----------------------------------------------------------------------------------------------- | ------ | ------ |
| Lite pixel ratio on phones (stair-stepped edges at ratio 1), with a device to measure           | high   | low    |
| Compact intro on short landscape windows (667×375, 1024×540): still touches the crown           | medium | low    |
| Portrait phones: Zanba never walks, the stage being too narrow for his arcs                     | medium | medium |
| Short landscape screens: critters can pass under the shelf along the climb (not at the opening) | low    | medium |
| Critters seen from the far side of the climb (they keep to the opening side)                    | medium | medium |
| Faces: no mouth or brows, expression comes from ears, eyes and posture only                     | medium | medium |
| Zanba's rump: faint paler oval from behind                                                      | low    | low    |
| A favicon (the only console error)                                                              | low    | low    |
| `doc/architecture.md` and `CLAUDE.md`: opening shot, stage, new critters, WebP                  | low    | low    |

## Next actions

1. Codex review 2 of `ef821d2..3143928` (review 2 of 3). No approval needed to start it.
2. A person plays `cycle1/final/video-follow-lapen.mp4`, `video-follow-zanba.mp4` and
   `video-characters-rest-*.mp4` at ×1 and their `-x0.25` copies, or watches the page for a minute.
3. A phone test when a device is at hand.
4. Xavier's artistic acceptance and merge decision.
