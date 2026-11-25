# S3 checkpoint — vertical slice

Date: 2026-11-23. Checkpoint, not a stop: S4 continues on the same branch.

## What the slice contains

- Page 3 (« La promesse »), final framing on desktop and portrait: Mila's contemporary house
  behind her, branch A bowed over her with its foliage, several calabashes in the branches, the hero
  fruit taken in both hands, mid-garden painted masses, far relief, night key.
- Dark variant, page 9: ink-blue key, the fruit lights a small patch of ground, Mila's face stays
  readable (the finishing brush is masked on faces).
- Wide framing, page 11: whole tree relit, Man Ninon with her lantern, Mila under branch A, house.
- All twelve pages are already blocked and playable (graybox animatic and painted animatic).

## Evidence

In the repository (`evidence/`):

| File                                                         | Content                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `evidence/s2-graybox-desktop.jpg`, `s2-graybox-portrait.jpg` | S2 layout: the twelve reading frames in grey proxies, with page ids |
| `evidence/s3-slice-desktop.jpg`                              | pages 3, 9, 11 at 1440x900                                          |
| `evidence/s3-slice-portrait.jpg`                             | pages 3, 9, 11 at 390x844 and 360x640 (emulated viewports)          |
| `evidence/s3-blender-vs-browser-p03.jpg`                     | same lens, same branch pose: Blender EEVEE (left), browser (right)  |
| `plan-jardin.png`                                            | ground plan and reading lenses                                      |

Outside the repository (`~/.local/share/contes-creole-qa/mila-calebassier/`):

| File                                                                      | Content                                                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `s2/animatic/animatic-desktop-graybox.mp4`, `animatic-mobile-graybox.mp4` | silent graybox animatic, 6 fps, 915 frames each, slate with page id and instant |
| `s3/animatic-painted-desktop.mp4`                                         | painted animatic of the twelve pages, 12 fps                                    |
| `s3/slice/*.png`                                                          | full-size stills of the slice                                                   |
| `s3/compare/*.png`                                                        | the two sources of the Blender/browser comparison                               |

Renderer of every capture: `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2,
OpenGL ES 3.2)`, system Chrome, headless. Phone sizes are emulated viewports, not devices.

## Blender against browser

Method: `art/mila-calebassier/scripts/render_compare.py` rebuilds the scene from the same layout and
painted masters and renders it in EEVEE through page 3's reading lens with branch A fully bent; the
browser frame is the QA viewer at the same page (`CARD=0`, so without the text shift).

What matches: positions and proportions of house, trunk, branch, hero fruit and stepping stones;
orientation (the y-up conversion of the export is right: nothing is mirrored or turned); UV mapping
of bark, walls, hedge and foliage; the bent tip of branch A (Blender's pose equals the exported clip
at its last frame, measured: the socket lands at (-2.004, 1.134, -1.781) in the build report and, read back from the engine at the clip's end, at the same point to five decimals).

What differs, by design: Blender has no figures (Mila and Man Ninon are procedural in the web
engine), no painted billboards (mid-garden masses, far relief, sky wash live in the engine), no
finishing brush; its Principled shading is darker in the shade and casts hard shadows, where the
engine uses soft toon shading, contact blobs and the page's light key.

## An early GLB export, loaded and tested

The three GLB files of the first build were loaded by `GLTFLoader` in the engine the same hour
(`world/assets.ts`, `world/garden.ts`): node names, material names, vertex colours, the two branch
clips and the two rooster clips resolve by name at mount; a missing node, clip or material stops the
mount with its name. The branch clip is scrubbed by time (`action.time`), not played.

## Corrected during the slice

| Found                                                        | Correction                                                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Mila's house stood 2 m from the tree spot and filled page 3  | house moved to (-11.5, -8.2), path and north hedge redrawn                                                        |
| Man Ninon's terrace swallowed the end of page 4's walk       | her house moved 2.3 m east, routes shortened                                                                      |
| Night pages lit like day by the warm lights                  | lower intensities, slower falloff with a 5 m cut-off                                                              |
| Hands and dress burnt out next to the fruit                  | falloff exponent 0.6, weaker source, hands cupped lower on the shell                                              |
| The calabash read as a light bulb                            | shorter and thinner stalk, weaker inner light                                                                     |
| Foreground cut-outs and one garden mass blocked three lenses | masses moved away from the camera positions; foreground cards now placed relative to each lens (none shipped yet) |
| Man Ninon's dress disappeared in one portrait shot           | figures are no longer frustum-culled part by part                                                                 |
| The finishing brush smeared Mila's face                      | brush masked per material through the frame's alpha                                                               |
| Pale fringes around painted cut-outs                         | the painter keeps full pigment colour where coverage fades and bleeds it into the margin                          |
| Far relief showed its tile seam and was too dark             | tileable ridges, lighter near ridge                                                                               |
| Branch foliage covered Mila's head when the branch bowed     | no foliage card on the last fifth of the branch                                                                   |

## Known limits at this checkpoint

- Painted layers are scripted washes: they have the transparency, grain and pooled edges of the
  reference boards, not their drawing. Leaves and flowers are simple stamped shapes.
- Architecture is plain (walls, posts, roof, jalousies); no furniture beyond bed, table and chairs.
- Walk cycles are Mila's existing procedural gait; Man Ninon uses the same cycle with her measures.
- The page-6 "golden reflections on the walls" are only the warm light of the fruit so far.
- No foreground cut-out is placed yet; pages rely on mid-garden masses and the branch for depth.
- Kréyòl text is an unvalidated draft (label on every page, `draft: true`).

## Next (S4)

Per-page polish in motion (pages 6, 8: shutters and hands; page 4 and 10: two-figure walks), foreground
cut-outs per shot, golden reflections of page 6, gestures video of pages 3, 6, 8, 9, 11, cleanup of
sources into the production folder with a manifest, then S5 QA.
