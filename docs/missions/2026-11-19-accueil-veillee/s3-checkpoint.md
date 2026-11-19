# S3 checkpoint — full Mila journey

- S3 commit: `aac453a` (branch `feat/accueil-veillee`, pushed). Later S4 commits continue on the same branch.
- Draft PR: https://github.com/TiPunchLabs/contes-creole/pull/50
- Deploy Preview: https://deploy-preview-50--contes-creoles.netlify.app (Netlify check "Deploy Preview ready!")
- Executor model: Opus 5.5 (`claude-opus-5-5`).
- Decision: no structuring artistic question; S4 continued without waiting.

## Videos (headed Chrome 158.0.8127.36, `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`)

Recorded with `qa/veillee.mjs` on the S3 build (delegated run, Sonnet subagent). Folder `~/.local/share/contes-creole-qa/accueil-veillee/`, manifest `s3-manifest.md` there.

| File                           | Shows                                                                                                                        | Duration | sha256             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| `rest/rest-desktop.webm`       | 1440x900, 22 s untouched, then one page turn                                                                                 | 29.6 s   | `accae02c…178a`    |
| `rest/rest-mobile.webm`        | 390x844 @2x, same                                                                                                            | 29.3 s   | `6e14c313…02fa1`   |
| `journey/journey-desktop.webm` | Mila bookmark → entry → first scene → back on Mila's page → turn → Zanba portrait (text) → Ti Kannot bookmark → entry → back | 36.4 s   | `380668bc…b3f6`    |
| `journey/journey-mobile.webm`  | same with taps and a swipe                                                                                                   | 36.5 s   | `d8da1e12…f96fcb1` |

Journey log (both viewports): every status matched its step; back from Mila → « Page 3 sur 4 : Mila et le lambi qui avait perdu son chant »; final focus on the tale's entry button (`button.v-art`).

## What the rest video shows (executor's viewing of the contact sheet)

Fixed camera; a warm light band crosses the near ridge; the near branches and their hibiscus move with the breeze and their shadows slide on the low wall; the leaf lifts with its curl at the turn. Clouds drift but read faintly (reservation R1).

## Open questions (none blocking)

- A1–A3 character names: provisional `Konpè Lapen` / `Konpè Zanba` (sources in `characters.md`); the owner's `Kompè` / `Komè Zamba` are not attested.
- D-BACK-LABEL: the tales' back buttons still read « Pyébwa a Konesans » (the tree's name). Kept: Mila's is tale code, the shell's matches it. Owner to decide on a new label (e.g. « Kont Kréyòl » / « Accueil »).
- D-TREE-KEEP: `src/tree/` is kept, unmounted. Delete in a follow-up?
- D-MENU-PROJET: « Le projet » is a new static page built from texts already published; owner copy welcome.

## Artistic reservations at S3

- R1 clouds faint; R2 the child is built from simple volumes (readable silhouette, not painted); R3 the living room through the bay reads weakly at this angle; R4 the backdrop is painted in code (brush dabs, lobed crowns), less rich than the reference's gouache.
