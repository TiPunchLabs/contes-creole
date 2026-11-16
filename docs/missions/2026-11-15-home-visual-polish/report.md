# Report — 2026-11-15-home-visual-polish

Verdict: PARTIAL
Version: bc064747190c36f4542a01cd0e98d23feca63c68

`Version` is the product HEAD every final check ran on (`bc06474`). The commit that adds this
report and the S2 evidence sits on top of it and touches nothing under `src/`.

Why PARTIAL and not "ready for human validation": two criteria are not verified. AC12 cannot be
(the Codex review is step S3, after this report), and the phone half of AC9 has no evidence (no
device). Everything else in the checklist is verified on `bc06474`. Exact next actions are at
the end.

Three things are kept apart below, as the mission asks:

- Technical compliance: verified by commands and measures, listed per criterion.
- Observed visual improvement: what the before/after captures show, stated by the executor.
- Artistic acceptance: Xavier's, not given here. The opening frame in particular replaces the one
  he validated on 2026-11-09 (CANOPY-FACE).

## Scope delivered

- Branch `feat/home-visual-polish`, base `ef821d2`, product HEAD `bc06474`, local only: no push,
  PR, preview, merge or deploy.
- Executor: Claude Code session `7de48663-1116-4e9e-8682-a99d55b1542b`, model `claude-fable-5-2`.
  No sub-agent was used, for code or anything else.
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

- Files changed under `src/`: `tree/index.ts`, `tree/overlay/overlay.css`,
  `tree/scene/camera.ts`, `canopy.ts`, `konteur.ts`, `critters/{lapen,zanba,parts,wander}.ts`,
  their tests, and the new `tree/assets/konteur.webp`. Nothing under `src/app`, `src/shared`,
  `src/books` or `src/pages`. No text, name, navigation target or reading order changed; no
  dependency added.
- Detail of every kept and dropped change: `AUDIT.md` section 11.

## Acceptance criteria

Evidence paths starting with `evidence/` are in the mission folder; the others are under
`~/.local/share/contes-creole-qa/home-visual-polish/` and listed in
`evidence/s2-media-manifest.tsv`. SHA is the revision the evidence was produced on.

| ID   | Status                                   | Evidence                                                                                                                                                                                                                                                                                                                                        | SHA       |
| ---- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| AC0  | verified (by pilotage)                   | `evidence/ac0-fable-preflight.txt`: launch argv `--model fable`, transcript `message.model = claude-fable-5-2`. The executor confirms the same model id for this session; the check itself is pilotage's                                                                                                                                        | n/a       |
| AC1  | verified                                 | `final/boards/before-after-turntable-lapen.jpg`, `-zanba.jpg` (lit and flat silhouettes, 4 bearings and a walk), `final/boards/before-after-closeups.jpg` (displayed size at DPR 2 and on the emulated phone). Beaded trunk, chest seam and detached feet are gone; outlines differ at displayed size. Left: a faint paler oval on Zanba's rump | `bc06474` |
| AC2  | verified on frame sequences              | `final/video-follow-lapen.mp4`, `-zanba.mp4`, `final/video-characters-rest-*.mp4` and their `-x0.25` copies; notes in `AUDIT.md` 11.6; gait tests in `wander.test.ts`. Read as frames, not watched at speed                                                                                                                                     | `bc06474` |
| AC3  | verified                                 | Shadows shrink and fade with the hop (`final/video-follow-lapen.mp4`), feet hold their ground, edge light on both, no bleaching near the lantern (`s2/60-lamp`)                                                                                                                                                                                 | `bc06474` |
| AC4  | verified                                 | `evidence/s2-final-contrast.json`: every intro and shelf text at or over its minimum on 5 sizes (`AUDIT.md` 11.4); grey views `final/boards/before-after-*-grey.jpg`. Scene lights and palette unchanged                                                                                                                                        | `bc06474` |
| AC5  | verified                                 | Variant boards and choice: `AUDIT.md` section 8 (`variants/board-*.jpg`); before/after `final/boards/before-after-desktop.jpg`, `-mobile.jpg`, thumbnails and grey                                                                                                                                                                              | `bc06474` |
| AC6  | verified, with three named limits        | `final/boards/before-after-intermediate.jpg` (768×1024, 1024×768, 360×640, 430×932), `final/boards/final-layout-sweep.jpg` (10 sizes, no horizontal overflow on any), `final/boards/before-after-climb-*.jpg`. Limits: 844×390, 360×640, 800×600 (`AUDIT.md` 11.7)                                                                              | `bc06474` |
| AC7  | verified                                 | `AUDIT.md` 11.5                                                                                                                                                                                                                                                                                                                                 | `bc06474` |
| AC8  | verified                                 | Gusts measured (`AUDIT.md` 11.1, `evidence/s2-final-wind.json`); trigger, rustle and timings untouched; journeys to both tales, the classes page and the random tale pass (`evidence/s2-final-behaviours.json`)                                                                                                                                 | `bc06474` |
| AC9  | desktop verified; phone **not verified** | `AUDIT.md` 11.3, `evidence/s2-final-perf.json`: 60 FPS capped on the reference laptop, worst uncapped change -6.9 % against the base measured in the same session. Mobile figures are emulation on the laptop GPU; no real device was tested                                                                                                    | `bc06474` |
| AC10 | verified                                 | `evidence/s2-final-behaviours.json`: 43 of 43 (Playwright `reducedMotion`, a live change of the preference, Tab order, arrow keys, Enter, touch taps and finger swipe, emulated)                                                                                                                                                                | `bc06474` |
| AC11 | verified                                 | `pnpm build`, `typecheck`, `lint` exit 0; `pnpm test` 369 passed (356 on the base); other pages 24 of 24 (`evidence/s2-final-pages.json`); console: only `favicon.ico` 404, already on the base                                                                                                                                                 | `bc06474` |
| AC12 | not verified (S3 not run yet)            | No Codex review exists for this revision                                                                                                                                                                                                                                                                                                        | n/a       |

## Performance summary

| Measure                                  | Base `ef821d2` | Final `bc06474` |
| ---------------------------------------- | -------------- | --------------- |
| Cold load, transferred (desktop)         | 1 424 kB       | 715 kB          |
| Capped FPS, all six sequences            | 59.9           | 59.9            |
| Worst uncapped change, same-session base | n/a            | -6.9 %          |
| Draw calls at the opening, desktop       | 322            | 284             |
| Phone                                    | not measured   | not measured    |

Full tables, protocol and the intermediate regression that was corrected: `AUDIT.md` 11.3.

## Observed visual improvement (executor's reading)

- The flamboyant is a whole shape at the opening on every size captured but 360×640, where its
  top stays under the band's fade.
- The three characters read as one group at its foot; both critters stay visible over 30 s on
  desktop and the emulated phone.
- Zanba and Lapen no longer show joins between pieces at twice the displayed size.
- What the captures cannot show is in `AUDIT.md` 11.6: nobody watched the motion at speed.

## Deviations and things to know

- Deletions against the user's `trash` rule: the capture scripts remove their intermediate frames
  with `unlink`, and `rm -f` was used a few times on files generated in the same session. Nothing
  outside the mission's own QA output was removed.
- A scratch worktree of `ef821d2` remains registered, for the same-session base build:
  `<scratchpad>/base`. It is not removed (that is a deletion); `git worktree remove` on it, then
  `git worktree prune`, cleans it.
- `04bfacb` was amended once, before any review and unpushed, to fix a test import its first
  version broke.
- The pre-commit hooks do not run `tsc` or the tests; both were run by hand before each commit
  from then on.
- `mission.md` was reformatted by prettier (tables only) and `__pycache__/` was added to
  `.gitignore`, both in S1.
- The site loads an analytics script from `cloud.umami.is`. S1's runs did not block it; from
  S2 on the scripts answer it locally or block it. Whether S1's runs were counted is not known.
- Load and FPS use the production build on ports 5182 (final) and 5183 (base), beside the dev
  server on 5181. All three are stopped at the end of the step.

## Remaining leads

Unmet mandatory criteria:

| Lead                                      | Impact | Effort | Note                                                |
| ----------------------------------------- | ------ | ------ | --------------------------------------------------- |
| AC12: Codex review of `ef821d2..bc06474`  | high   | low    | step S3                                             |
| AC9: frame rate on a real mid-range phone | high   | low    | needs a device; the preview or a LAN build would do |

Optional, by impact over effort:

| Lead                                                                                  | Impact | Effort |
| ------------------------------------------------------------------------------------- | ------ | ------ |
| Lite pixel ratio on phones (stair-stepped edges at ratio 1), with a device to measure | high   | low    |
| Landscape phones (844×390): shelf over the group, title on the crown's edge           | medium | medium |
| 360×640: crown top under the band                                                     | medium | low    |
| Critters seen from the far side of the climb (they keep to the opening side)          | medium | medium |
| Faces: no mouth or brows, expression comes from ears, eyes and posture only           | medium | medium |
| Zanba's rump: faint paler oval from behind                                            | low    | low    |
| A favicon (the only console error)                                                    | low    | low    |
| `doc/architecture.md` and `CLAUDE.md`: opening shots, stage, new critters, WebP       | low    | low    |
| An external pass on the characters (Blender) is not needed for the defects found      | n/a    | n/a    |

## Next actions

1. S3: Codex review of `ef821d2..bc06474` with `AUDIT.md`, this report and
   `evidence/s2-media-manifest.tsv`. No approval needed to start it.
2. A phone test, when a device is at hand, to close AC9.
3. S4: Xavier's artistic acceptance and merge decision.
