# Report — 2026-11-20-flamboyant-silhouette, phase 1

Verdict: PASS
Version: fe80966b60ad389703df7e4ec05cc4231957506d

`Version` is the product head (`fe80966`): the last commit that touches `src/`, `art/`, `qa/` and
the build configuration. The branch head delivered carries on top of it only the mission folder
(brief, mission, evidence, this report); a report cannot name the commit that contains it, the pull
request names the delivered head. Pull request: #51 (draft).

Why PASS: steps M1 to M5 are done and AC1 to AC8 are verified, the Deploy Preview included (last
section). Review R1 (Codex, in the browser) and decision D1 (owner) come next and are not part of
this verdict; phase 2 has not been started.

Session model: Claude Fable 5.2, model id `claude-fable-5-2` (stated by the session's environment
header; confirmed at the start of the transcript).

## What the owner has to choose between

Comparison sheets (current, A, B; opening and the three book stops; same build, same camera):
`evidence/compare-desktop.jpg` (1440x900) and `evidence/compare-mobile.jpg` (390x844, emulated).
Full-size captures: `~/.local/share/contes-creole-qa/flamboyant-silhouette/final/`.
Preview: add `?tree=a` or `?tree=b` to the preview address; the three buttons then swap the tree
without moving the camera.

A — parasol.

- Brings: the tree reads as an adult flamboyant from the first frame. The crown is wide and low,
  in tiers, with sky between them; the limbs leave the trunk one after the other instead of in a
  V, and the space under the crown reads as shelter over the Konteur and the animals. It is the
  calm, balanced picture, and it looks alike from every side of the climb.
- Least favourable: at the first book stop on a phone, and wherever the camera is close, the low
  tiers fill the top of the frame and the tree is mostly foliage, with little trunk and limb to
  read. No single branch leads the eye to a book: the three threads leave the rim at a slant
  (about 4 m, against 7 to 8.5 m today).

B — asymmetric.

- Brings: one gesture. A long, low, sinuous limb leaves the trunk at 3 m and runs out to the
  first book, which hangs from its tip by a 2 m thread: at the opening on a desktop screen the eye
  goes from the trunk along the limb to Ti Kannot's card. The crown sits on the other side and
  balances it. It is the silhouette one remembers.
- Least favourable: on a phone at the opening the long limb leaves the frame on the left before
  reaching its book, so the gesture is cut; it is whole again one swipe later. At the first book
  stop the limb comes straight at the camera and is seen end-on. From the back of the climb
  (book 2) the tree looks lopsided, with the limb's sprays in a row like a hedge. The other two
  books hang as in A, without a limb of their own.

Recommendation: B, with one adjustment to ask for if it is chosen: decide in phase 2 whether the
phone opening should show the limb's end. The brief asks that the visitor can follow a branch to
the thread that carries a book: B does it, plainly, for the first book; A only shortens the
threads. B is also the further from the present tree, so the remodel shows. A is the safer choice
if the owner wants the same picture from every side and on every screen.

Both are prototypes: plain matte wood, foliage as lumps (about a third of them in the flower
colour). Neither should be judged on leaves, flowers or bark.

## Acceptance criteria

| AC  | Status    | Evidence                                                                                                                                                                                                                       |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 | VERIFIED  | `evidence/m1-base.md`: PR #42 merged 2026-11-09 (`acc7f2a`), CANOPY-FACE still in the code, base `c5c6f0c`                                                                                                                     |
| AC2 | VERIFIED  | `evidence/m1-code-map.md`                                                                                                                                                                                                      |
| AC3 | VERIFIED  | `evidence/m2-reference.md`, `evidence/reference/probe.json`; captures outside the repo                                                                                                                                         |
| AC4 | VERIFIED  | `art/flamboyant/`, `src/tree/assets/flamboyant-{a,b}.glb`, `evidence/m3-shapes-and-models.md`, `evidence/blender-views.jpg`; the `.blend` files were written and re-read by Blender in background, not opened in its interface |
| AC5 | VERIFIED  | `evidence/m4-preview.md`, sheets; Deploy Preview checked once, see the last section                                                                                                                                            |
| AC6 | VERIFIED  | `evidence/m4-preview.md`, `evidence/scenery-select.json` (`scenery equal: true`), `layout.test.ts` unchanged                                                                                                                   |
| AC7 | VERIFIED  | format, lint, typecheck pass; 57 test files, 414 tests; build without model or preview code                                                                                                                                    |
| AC8 | this file |                                                                                                                                                                                                                                |

## Deviations, limits, things to know

- The opening camera, the cards' places, the Konteur, the animals, the other plants, the texts
  and the navigation are untouched. `cards.ts` gained `hang()` (threads re-hung on a model's
  attach points) and now writes the thread's upper end every frame; for the published tree the
  end is the same fixed point as before.
- Books do not hang on the tree in this scene: the cards stand on the camera's spiral, 12.2 m
  from the trunk, and only the thread's upper end belongs to the tree. So a branch can lead to a
  thread, but no crown of this size reaches above all three cards. B's long limb does it for
  one.
- With a proposal shown, the thread tops follow the wind of their twig (`treeWindAt`). The
  published tree's do not (unchanged). Motion was looked at in stills under reduced motion only:
  how wood and lumps move together is NOT_VERIFIED by eye.
- Not measured, by design of phase 1: frame rate, draw calls, smoothness, a real phone. Mobile
  is Chrome emulation at 390x844.
- Weight: each GLB is about 1.5 MB (1.15 MB gzip), uncompressed prototype export, loaded only in
  the preview. The published tree is generated and transfers nothing: phase 2 has to bring the
  chosen model's weight down (fewer triangles in the boughs, quantisation or meshopt) and say
  what the home then transfers.
- `mission.md` and `owner-brief.md` were reformatted by Prettier (table alignment, one blank
  line each) because CI runs `pnpm format:check` on them; no word changed.
- `*.blend1` (Blender backups) is now ignored; two such files from the first runs are still on
  disk in `art/flamboyant/`, untracked, not deleted.
- A 404 on `favicon.ico` shows in the console of the dev server; it is on `c5c6f0c` too.
- The Blender MCP was not used and the owner's running Blender was not touched: all builds ran
  in separate background processes.

## Decisions for the pilot or the owner

- D1 (owner): A, B, or a precise adjustment.
- Places chosen without asking, easy to change before phase 2: Blender sources and script in
  `art/flamboyant/` (`design/` is reference-only), models in `src/tree/assets/`, attach nodes
  named `attach-1` to `attach-5` by slot along the climb (the repo had no convention for model
  nodes). `.blend` files are committed as plain binaries (about 0.26 MB each).

## Delegations

- Sonnet subagent: `evidence/m1-base.md` and `evidence/m1-code-map.md` (read-only study of the
  repo, git and `gh`); its facts on PR #42, the base and the RNG order were used after I had read
  the tree, camera, cards and canopy sources myself; its line references were not all re-checked.
- Everything else (modelling, product code, captures, check chain, this report) ran in this
  session. The capture and check commands were single scripts, not worth a hand-off.

## Processes

Dev server on 127.0.0.1:5183 stopped at the end; no browser or Blender process of this session
left running.

## Deploy Preview

Checked once, on branch head `dcdf899` (same `src/` as `fe80966`):

- CI `quality`: pass (run 44859521105).
- Netlify: `https://deploy-preview-51--contes-creoles.netlify.app` ready.
  Owner links: `…netlify.app/?tree=a` and `…netlify.app/?tree=b` (the buttons then switch).
- `qa/flamboyant.mjs` against that address, desktop 1440x900, `current`, `a`, `b`: the twelve views
  were captured, the switch reported each proposal in the scene, and the opening with B was
  looked at (`~/.local/share/contes-creole-qa/flamboyant-silhouette/deploy-preview/`). Without the
  parameter the published tree shows and no button appears.
- Netlify lays its own "Collaborate on this Deploy Preview" bar over the bottom of the page, on
  top of the shelf's lower edge: it is Netlify's, it can be closed with its cross, and it is not
  in production. The phone size and the selection check were run on the local server only.
