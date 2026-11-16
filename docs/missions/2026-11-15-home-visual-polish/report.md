# Report — 2026-11-15-home-visual-polish

Verdict: PARTIAL
Version: 2a6ed4c3ec6855704edb816d5935b0a8409c92b1

`Version` is the product HEAD every final check of correction cycle 3 ran on (`2a6ed4c`). The
commits on top of it (the cycle's evidence, then this report) touch nothing under `src/`. This
report replaces the one written for `8d7f813`. Codex reviews 1 to 3 (all CHANGES_REQUESTED) and
their briefs are committed beside it. Cycle 3 was authorized by the owner on 2026-11-16 beyond the
review cap, with a review 4 (`mission.md`, Log).

## Owner decision, 2026-11-16 (after review 4)

Codex review 4 of `2a6ed4c` (`review-4.md`): CHANGES_REQUESTED, with two findings left. The owner
then decided (`mission.md`, Log, decisions D-FINAL, MERGE, DEPLOY, CLEANUP; his words: « contes-creole
j'accepte on peut pousser en prod et tout clean et mettre à jour en local »):

- F7 (AC6: the shelf still cuts the Konteur at 14 states on four sizes, and 31 critter-states) is
  accepted as a recorded exception.
- F8 (AC9: the desktop climb, uncapped, is 10.46 % under the base for a limit of 10 %) is
  accepted as a recorded exception.
- The result is accepted artistically, O1 to O5 included.
- Push, pull request to `main`, merge after a green CI, production through Netlify, and cleanup
  are authorized.

The verdict stays PARTIAL as a statement of what was verified: AC6 and AC9 are not met as
written, and two things are still not verified by anyone: playback of the character motion by a
person at ×1 and ×0.25 (AC2, AC3), and the frame rate on a real phone (AC9). The rest of this
report is as written before the review and the decision.

Why PARTIAL: these are not verified or not fully met; all but the AC9 desktop margin are beyond
what the executor can verify.

- AC12: review 4 of `2a6ed4c` asks for changes (F7, F8); see the owner's decision above.
- AC6: nothing steps out any more and far fewer figures are cut, but not none: the Konteur's legs
  are behind the shelf around the first card on short landscape screens, and his feet at one stop
  at 1280×720 (14 states,
  119 on the base), and a wandering critter can still pass behind it (31
  critter-states of 682, 299 on the base). Whether that residue is acceptable is the owner's and the reviewer's
  call.
- O5: the lantern reads as a lantern on the captures; whether it is the one he wants is the
  owner's eye.
- O3 and O4: the ears are reshaped, read as attached on the captures and stay out of the body on
  every frame measured; whether they please, and hold in every moment of play, is the owner's eye.
- O1 and O2: the camera looks at the trunk axis at every climb value and its pitch, height,
  distance and lens only ever go one way (measured and tested), but whether the turn _reads_ as
  centred and settles cleanly under a real trackpad or finger only a person watching can say.
- AC9, desktop half: capped, 60 FPS with no slow frame. Uncapped, the mean of three rounds is
  6.4 to 10.5 % under the base: one sequence of six is half a point past the −10 % limit, within
  the spread between rounds. A frame cost of 14 to 34 % found on `725a942` was removed in
  `2a6ed4c` (`AUDIT.md` 14.9).
- AC9, phone half: no device.
- AC2 and AC3, human half: measured on every frame and read as frame sequences by an AI agent;
  nobody has watched the motion play.

Three things are kept apart, as the mission asks:

- Technical compliance: verified by commands and measures, listed per criterion.
- Observed visual improvement: what the captures show, stated by the executor.
- Artistic acceptance: Xavier's, not given here. The opening frame replaces the one he validated
  on 2026-11-09 (CANOPY-FACE), and the climb now looks lower than the spiral he validated.

## Correction cycle 3

| Finding                                                                          | Severity | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Evidence on `2a6ed4c`                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner: the characters appear and disappear during the climb                      | owner    | The step-out rule of cycle 2 is removed whole (`presence.ts` deleted): the figures are always there. To keep them clear of the shelf the camera's pitch along the climb is solved instead (`climbPitch` in `camera.ts`): lowered by what keeps the Konteur's feet above the shelf while he is in the frame, never further than the cards ahead leave room for, and never coming back up (O2). The spiral's path, the cards, timings, trigger and journey are untouched                                                  | `evidence/c3-final-climb.json` against `evidence/c3-base-climb.json`, true climb values, 11 sizes: figure-states cut, base → final: 73 → 9 at 844×390, 66 → 9 at 932×430, 69 → 8 at 667×375, 40 → 3 at 1440×900, 41 → 5 at 1024×768, 45 → 6 at 1280×720, 34 → 1 at 1920×1080, 43 → 2 at 1920×839, 1 → 0 at 390×844, 4 → 2 at 768×1024, 2 → 0 at 360×640. Konteur: 119 → 14. Captures up and back: `cycle3/final/checks/board-climbcheck-*.jpg` |
| O1 (owner): during the rotation the scene no longer seems to turn about its axis | owner    | Cause: since cycle 1 the opening aimed the camera up to 3.2 m beside the trunk and swung it back during the first 39° of turn. The camera now looks at the trunk axis at every climb value; the opening's sideways placement is a shift of the lens, given back evenly over the whole climb. Tests assert the look-at point on the axis and a one-way orbit on ten screens                                                                                                                                              | `evidence/c3-final-pivot.json`, `c3-base-pivot.json`, `c3-c2-pivot.json`: the line of sight missed the trunk axis by up to 3.152 m on `8d7f813`, 0 m now (0 on the base). Frame sequences of the rotation, base and final: `cycle3/base/board-pivot-*.jpg`, `cycle3/final/checks/board-pivot-*.jpg`                                                                                                                                            |
| O2 (owner): a rebound when the scene pivots towards the next card                | owner    | Read frame by frame on the owner's capture and on an instrumented run at its window size: the climb value and the angle about the trunk never overshoot; the pitch did, by the tilt introduced in `aae0e5f` (from the opening to the second card: 7.1° down by 8.9° and back to 5.0°). The pitch is now one falling curve over the climb (`240c4f5`); a test holds pitch, height, distance and lens shift to one direction on ten screens                                                                               | `evidence/c3-final-settle.json`, `c3-o2-before-settle.json`, `c3-base-settle.json`: largest move of the pitch against its travel, 12 legs per size: 9.3° on `aae0e5f`, 0.00° on the final by wheel (0.20° by finger drag, the pointer parallax, 0.20° on the base). The same journey filmed at 1920×839: `cycle3/final/checks/settle-w1920x839.webm`                                                                                           |
| O3 (owner): the elephant's ears                                                  | owner    | Each ear was a flattened ball, pink over most of its front: a disc beside the head. It is now a leaf with a thick root hinged inside the temple, a broad top, a hanging lobe, a rim that curls back and the pink kept to its hollow (`69ab983`, hinge moved by O4). Same draw calls. Not a limit of the rig                                                                                                                                                                                                             | Before and after at four bearings, displayed size and ×2: `cycle3/final/boards/o3-zanba-ears-before-after.jpg`; `AUDIT.md` 14.5                                                                                                                                                                                                                                                                                                                |
| O4 (owner): the new ears sometimes sink into the body                            | owner    | Measured on every frame of a minute: on `69ab983` part of an ear's blade was inside the body on 3750 of 3750 frames at 1440×900, up to 459 vertices and 38 cm deep; 3750 of 3750 frames at 390×844, up to 300 vertices and 32 cm deep. The ears are hinged higher with a shorter lobe, and each frame their pose is solved against the body as it then is: an ear fans as far back as it wants and lifts off the shoulder by what keeps its blade clear; held further forward when no lift is enough. Nothing is hidden | `evidence/c3-final-ears.json` against `c3-o4-before-ears.json`: 0 of 11250 frames with a blade vertex in the body on 3 sizes, least clearance 4.1 cm. Extremes of the run beside the owner's build: `cycle3/final/boards/o4-zanba-ears-extremes.jpg`; `AUDIT.md` 14.6                                                                                                                                                                          |
| O5 (owner): a black-and-white triangle at the Konteur's foot                     | owner    | It was his lantern, in the scene since the base: a pale cylinder bleached by the lights, under a near-black cone, which from the climb's higher angles read as a stray wedge. Fixed at the source: a bronze base, a shaped bronze cap, a handle and dark amber glass lit from within. Nothing hidden; same place and light                                                                                                                                                                                              | Before and after at the same framings, desktop ×2 and mobile, eight climb values: `cycle3/final/boards/o5-konteur-lantern-before-after.jpg`; `AUDIT.md` 14.7                                                                                                                                                                                                                                                                                   |
| F4: the climb harness did not check the progress reached                         | major    | `climb_check.py` reads the climb bar, corrects until the value asked for is read, records it and marks a missed stop; `layout_check.py` fails on a missed stop, an uncovered end or a gap. The whole climb was captured again on ten sizes, up and back. The tables of `AUDIT.md` 13 are corrected in 14.1: on six sizes they described the first third or half of the climb                                                                                                                                            | 341 states, 0 missed stop; `layout_check.py`: 0 fault on the 18 opening sizes, 4 failed climb run of 11 (`evidence/c3-final-layout.txt`)                                                                                                                                                                                                                                                                                                       |
| F5: the Konteur's random-tale entry point was lost where he stepped out          | major    | Gone with the rule: his entry point is offered by the base's own test again, and the tilt keeps its pointer point clear of the shelf                                                                                                                                                                                                                                                                                                                                                                                    | `evidence/c3-final-teller.json` against `c3-base-teller.json`, 31 stops on 11 sizes: 0 stop lost against the base; offered at 277 stops (261 on the base); pointer and keyboard open a tale at 66 of 66 tries                                                                                                                                                                                                                                  |
| F6: the report ruled all camera work out of scope                                | minor    | Corrected here: camera, framing and staging changes are within the mission as long as tale access, trigger, journey duration and the cards are kept, and that is what this cycle used. What stays out of this cycle's scope is a change to the shelf's own behaviour. The cycle-2 sentence "costs nothing elsewhere" was wrong: it cost the random-tale entry point (F5)                                                                                                                                                | this report; `AUDIT.md` 14.1                                                                                                                                                                                                                                                                                                                                                                                                                   |

What is left, for the owner and the reviewer. No rule hides a figure any more and nothing pops.
Two things can still be cut by the shelf, and slide behind it as the ground does:

- The Konteur's legs, on short landscape screens, around the first card, and his feet at 1280×720
  at one stop (up t = 0.14 at 844×390; up t = 0.20 at 844×390; back t = 0.20 at 844×390; back t = 0.14 at 844×390; up t = 0.14 at 932×430; up t = 0.20 at 932×430; back t = 0.20 at 932×430; back t = 0.14 at 932×430; up t = 0.14 at 667×375; up t = 0.20 at 667×375; back t = 0.20 at 667×375; back t = 0.14 at 667×375; up t = 0.14 at 1280×720; back t = 0.14 at 1280×720). The first
  version of this cycle kept him whole there by tilting down for him and back up after; that
  coming back was the rebound of O2. A pitch that only goes one way cannot clear him there without
  pushing the last card off the top of the screen.
- A wandering critter: 31 of 682 critter-states, most often small and far
  near the top of the climb, sometimes under the intro text while it fades. No camera can keep
  every point of their lawn above the shelf (computed, `AUDIT.md` 14.3).

No softer treatment (a mist above the shelf) was added for a residue of this size; it is the lead
to open if the owner wants none of it.

What the fix costs: from the first card on, the camera looks lower than the validated spiral did
(by 2 to 9° depending on the screen) and stays lower to the top; cards sit higher on screen, and
at the top of the climb on short landscape screens the crown's top leaves the frame. On wide
screens the trunk is a little left of the centre for the first part of the climb and comes back to
it by the top.

## Scope delivered

- Branch `feat/home-visual-polish`, base `ef821d2`, product HEAD `2a6ed4c`, local only: no push,
  PR, preview, merge or deploy.
- Executor: Claude Code session `7de48663-1116-4e9e-8682-a99d55b1542b`, model `claude-fable-5-2`.
  The executor's own session stayed on that model throughout. Delegations, by the owner's
  decision O-MODEL (`mission.md`, Log):

  | Task                                                                                                                                                                                                                    | Model                        |
  | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
  | Mechanical pass over the first full run (`725a942`): read every log of the chain, run the document generator, prettier, the media manifest, then `typecheck`, `lint`, `test`, `build`, and report figures and anomalies | Claude Sonnet, one sub-agent |

  Its report flagged the frame cost of `AUDIT.md` 14.9, the 1280×720 stop of the Konteur and a
  miscounted line in `settle.py`. Reading those, the fix, the rerun on `2a6ed4c`, every
  product decision and this report's wording were done by the executor. No other sub-agent was
  used in the mission.

- Commits on the branch, oldest first:

| Commit    | Subject                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| `e6b18dd` | docs: add home-visual-polish mission                                           |
| `62939bb` | feat(tree): open on the whole flamboyant with the critters at its foot         |
| `88edd66` | docs(missions): audit the home and compare three opening compositions          |
| `04bfacb` | feat(tree): keep the whole tree in view at every window shape                  |
| `e60ebab` | feat(tree): rebuild Konpè Lapen and Konpè Zanba, shape and motion              |
| `3016dd0` | feat(tree): calm the clearing under reduced motion, live                       |
| `3cdfa59` | perf(tree): serve the Konteur as a WebP derivative                             |
| `0f70c39` | feat(tree): let the breeze come in gusts                                       |
| `957e576` | fix(tree): start Lapen a little further in, clear of the shelf                 |
| `b76c396` | perf(tree): halve the critters' draw calls, cheapen their limbs                |
| `eaf3f09` | fix(tree): hold the intro hint's contrast on the column layouts                |
| `bc06474` | fix(tree): keep the Konteur's fill light off the critters                      |
| `996f0e1` | docs(missions): report S2 of home-visual-polish                                |
| `1a3a104` | docs(missions): add Codex review 1 of home-visual-polish and its brief         |
| `c5f4bff` | fix(tree): solve the opening shot so nothing hides behind the shelf            |
| `1868a5c` | fix(tree): plant Zanba's feet, bound every turn, ease every stop               |
| `3143928` | fix(tree): let Lapen hop on the spot when the stage has no room                |
| `34dd13f` | docs(missions): record correction cycle 1 of home-visual-polish                |
| `c91eebc` | docs(missions): report correction cycle 1 of home-visual-polish                |
| `cec5913` | docs(missions): add Codex review 2 of home-visual-polish and its brief         |
| `d34975b` | fix(tree): never show a figure the shelf or the frame cuts                     |
| `8d7f813` | fix(tree): step out under the intro text too, at a tighter limit               |
| `64d81ea` | docs(missions): record correction cycle 2 of home-visual-polish                |
| `e03959f` | docs(missions): report correction cycle 2 of home-visual-polish                |
| `69b2d44` | docs(missions): add Codex review 3 of home-visual-polish and its brief         |
| `aae0e5f` | fix(tree): keep the figures in the climb and turn about the trunk              |
| `240c4f5` | fix(tree): tilt one way along the climb, so the view settles without a rebound |
| `69ab983` | fix(tree): give Zanba ears that grow from his head                             |
| `7482c74` | fix(tree): keep Zanba's ears out of his body in every pose                     |
| `725a942` | fix(tree): make the Konteur's lantern read as a lantern                        |
| `2a6ed4c` | perf(tree): search Zanba's ear clearance at a third of the cost                |

- Files changed under `src/` since the base: `tree/index.ts`, `tree/overlay/overlay.css`,
  `tree/scene/camera.ts`, `cards.ts` (two constants shared with the camera), `canopy.ts`,
  `konteur.ts`, `critters/{lapen,zanba,parts,wander}.ts`, their tests, and
  `tree/assets/konteur.webp`. `presence.ts` and the overlay accessors of cycle 2 are gone. Nothing under `src/app`, `src/shared`, `src/books` or
  `src/pages`. No text, name, navigation target or reading order changed; no dependency added.
- Detail: `AUDIT.md` sections 11 (S2), 12 (cycle 1), 13 (cycle 2, corrected by 14.1) and 14 (this
  cycle).

## Acceptance criteria

Evidence paths starting with `evidence/` are in the mission folder; the others are under
`~/.local/share/contes-creole-qa/home-visual-polish/` and listed in
`evidence/c3-media-manifest.tsv`. Evidence was produced on `2a6ed4c` unless a row says otherwise.

| ID   | Status                                                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC0  | verified (by pilotage and by the reviewer)                                                                                            | `evidence/ac0-fable-preflight.txt`; reviews 1 to 3 parsed the transcript: every assistant record reports `claude-fable-5-2`                                                                                                                                                                                                                                                                                                                                                  |
| AC1  | verified                                                                                                                              | `cycle3/final/boards/before-after-turntable-lapen.jpg`, `-zanba.jpg`, `before-after-closeups.jpg`. Sampled poses. Left: a faint paler oval on Zanba's rump                                                                                                                                                                                                                                                                                                                   |
| AC2  | verified by per-frame measurement and by an agent's frame-sequence reading; **human playback not verified**                           | `evidence/c3-final-motion-*.json` (4 687 frames on each of three viewports); frame-sequence notes at ×1 and ×0.25 in `AUDIT.md` 12.2, made on `3143928` (the motion code is unchanged since); videos in `cycle1/final/`, `cycle2/final/` and `cycle3/final/`                                                                                                                                                                                                                 |
| AC3  | verified on the same basis; **human playback not verified**                                                                           | Planted-foot drift 0.008 m median and 0.019 m at most per stance; Lapen travels 0.0 m on the ground; shadows follow the hop and the fade                                                                                                                                                                                                                                                                                                                                     |
| AC4  | verified                                                                                                                              | `evidence/c3-final-contrast.json`: 9 sizes, all texts at or over their minimum (weakest .tree-intro-kicker at 4.62:1 on `w800`). Measured at the opening only                                                                                                                                                                                                                                                                                                                |
| AC5  | verified                                                                                                                              | Variants and choice: `AUDIT.md` section 8; before/after boards in `cycle3/final/boards/`                                                                                                                                                                                                                                                                                                                                                                                     |
| AC6  | opening verified; along the climb far fewer cuts, **not none: owner's and reviewer's call**                                           | Opening: 0 fault on 18 sizes, resize both ways without a jump. Animations: 341 climb states on 11 sizes at verified climb values, up and back; Konteur cut at 14 (119 on the base); critters cut at 31 of 682 (299 on the base), listed in `evidence/c3-final-layout.txt`. Settled states only: nothing fades or pops between them any more, but the instants between stops are not measured. Left: at 667×375 and 1024×540 the compact intro touches the crown's right edge |
| AC7  | verified                                                                                                                              | `AUDIT.md` 11.5                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| AC8  | verified at the states measured                                                                                                       | Gusts, trigger and timings untouched; journeys pass (`evidence/c3-final-behaviours.json`); the camera's position equals the spiral's from t = 0.14 (unit test), its look-at point is lower on the same axis; no leg overshoots (`evidence/c3-final-settle.json`); the random-tale entry point is offered wherever the base offered it and opens a tale by pointer and keyboard (`evidence/c3-final-teller.json`)                                                             |
| AC9  | desktop at the limit (one uncapped sequence of six at -10.5 % for a limit of −10 %, 60 FPS capped everywhere); phone **not verified** | `evidence/c3-final-perf.json`: 60 FPS capped, uncapped change -10.5 to -6.4 % against the base over three alternating rounds (limit −10 %; `725a942` read -14.0 to -34.1 % in one round, and the cause was removed in `2a6ed4c`, `AUDIT.md` 14.9). Mobile figures are emulation on the laptop GPU                                                                                                                                                                            |
| AC10 | verified                                                                                                                              | `evidence/c3-final-behaviours.json`: 43 of 43                                                                                                                                                                                                                                                                                                                                                                                                                                |
| AC11 | verified                                                                                                                              | `pnpm build`, `typecheck`, `lint` exit 0; `pnpm test` 378 passed; other pages 24 of 24; console: only the base's `favicon.ico` 404                                                                                                                                                                                                                                                                                                                                           |
| AC12 | not verified                                                                                                                          | Reviews 1 to 3: CHANGES_REQUESTED. No review of `2a6ed4c` yet                                                                                                                                                                                                                                                                                                                                                                                                                |

## Performance summary

| Measure                                                 | Base `ef821d2` | Final `2a6ed4c`                              |
| ------------------------------------------------------- | -------------- | -------------------------------------------- |
| Cold load and loader (desktop)                          | see right      | 1424 → 718 kB, loader gone at 1735 → 1621 ms |
| Capped FPS, all six sequences                           | 59.9           | 59.9                                         |
| Worst uncapped change, mean of three alternating rounds | n/a            | -10.5 % (single first round: -16.4 %)        |
| Draw calls at the opening, desktop                      | 322            | 317                                          |
| Phone                                                   | not measured   | not measured                                 |

Tables: `AUDIT.md` 14.9 (this HEAD), 13.3, 12.3 and 11.3 (history, protocol).

## Observed visual improvement (executor's reading)

- The flamboyant is a whole shape at the opening on every size captured.
- The Konteur and both critters stand whole above the shelf at the opening on every size checked.
- Along the climb the Konteur and the critters stay in the picture: on a phone on its side they
  are whole at most stops where the base showed them half behind the shelf.
- The rotation frames show the trunk holding its place on screen through the turn, and the
  filmed journey shows the view tilting one way and stopping.
- Not established here: how the turn, the tilt and the motion feel at speed.

## Deviations and things to know

- `review-1.md` and `review-2.md` were realigned by prettier (tables only), which the pre-commit
  hook requires.
- `review-3.md` too. In cycle 2 the harness's permission check for shell commands failed several
  times; the source edits were then made with the file-edit tool.
- The two step-out commits were undone with `git revert --no-commit` inside the cycle's fix commit
  rather than as two revert commits.
- The full run of this cycle was stopped four times, when O2, O3, O4 and then O5 changed the
  product (partial results of the last in `cycle3/interim-7482c74/`); the
  partial results of the second are kept as `cycle3/interim-240c4f5/` (they were sent to the trash
  by mistake and restored from it). A fifth full run completed on `725a942` and showed the frame
  cost of `AUDIT.md` 14.9; it is kept as `cycle3/interim-725a942/`. Every figure given for the
  final state comes from the run on `2a6ed4c` that followed. The base and cycle-2 figures
  beside them (`cycle3/base`, `cycle3/c2`) were measured during the run on `725a942` and not
  taken again, their code being unchanged; the base frame rates were taken again in each round.
- `boards.sh` exits 1: it asks for four landscape-phone climb captures that `captures.py` no
  longer takes at those sizes. The other boards are made. `settle.py` exits 1 whenever a leg is
  flagged, which the portrait phone's pointer parallax does on the base too; `layout_check.py`
  exits 1 on the Konteur states listed above.
- The pilot was told of the result through its Herdr pane, at the owner's request.
- A second scratch worktree, of `8d7f813`, was added under the session scratchpad to measure the
  pivot the owner saw; like the first it is left registered.
- Deletions: the scripts send generated frames to the trash. Earlier in the mission they used
  `unlink`, and `rm -f` was used a few times on files generated in the same session.
- A scratch worktree of `ef821d2` is still registered under the session scratchpad, for the
  same-session base build. `git worktree remove` on it, then `git worktree prune`, cleans it.
- `04bfacb` was amended once, unpushed, before any review.
- The site loads an analytics script from `cloud.umami.is`; the QA scripts block it since S2.
- Load and FPS use the production builds on ports 5182 (final) and 5184 (base), beside dev
  servers on 5181 (final), 5183 (base) and 5185 (`8d7f813`). All are stopped at the end of the step.

## Remaining leads

Mandatory, not met:

| Lead                                                                                                                   | Impact | Effort | Note                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------- |
| AC12: Codex review 4 of `ef821d2..2a6ed4c`                                                                             | high   | low    | authorized by the owner's decision                                  |
| O1, O2, O3 and the climb: the owner watches the turn, the climb, Zanba's ears and the lantern on the page              | high   | low    | only a person can say the turn reads as centred and settles cleanly |
| AC6: the owner's and reviewer's reading of what the shelf still cuts (the Konteur's legs on short landscape, critters) | high   | low    | counts and list above                                               |
| AC2/AC3: a person watches the videos at ×1 and ×0.25 (or the page itself)                                              | high   | low    | files in `cycle3/final/`                                            |
| AC9: frame rate on a real mid-range phone                                                                              | high   | low    | needs a device                                                      |

Optional, by impact over effort:

| Lead                                                                                                                 | Impact | Effort |
| -------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| Lite pixel ratio on phones (stair-stepped edges at ratio 1), with a device to measure                                | high   | low    |
| A soft mist above the shelf during the climb, or a shelf that gives way on short screens, for the critters still cut | medium | medium |
| Compact intro on short landscape windows (667×375, 1024×540): still touches the crown                                | medium | low    |
| Portrait phones: Zanba never walks, the stage being too narrow for his arcs                                          | medium | medium |
| Faces: no mouth or brows, expression comes from ears, eyes and posture only                                          | medium | medium |
| Zanba's rump: faint paler oval from behind                                                                           | low    | low    |
| A favicon (the only console error)                                                                                   | low    | low    |
| `doc/architecture.md` and `CLAUDE.md`: opening shot, lens shift, climb pitch, new critters, WebP                     | low    | low    |

## Next actions

1. A person plays the character videos at ×1 and ×0.25, or watches the page for a minute (AC2, AC3).
2. A phone test when a device is at hand (AC9).
