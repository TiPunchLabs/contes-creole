# S1 Preproduction — mila-calebassier

Owner of layout and cinematography: the executor (this Claude Code session, `claude-fable-5-2`).
No camera subagent was used. The executable presets are `src/books/mila-calebassier/staging.ts`.

## Art direction, as built

- Medium: a 2.5D sheet. Painted cut-outs (foliage, garden masses, hedges, far relief) and a sky wash
  stand at their own depths around real 3D things (tree, houses, gate, ground, props, the two
  figures). One finishing brush is laid over the whole picture, so painted and lit surfaces end in
  the same hand.
- Paint: every 2D layer and material texture is painted by a seeded script
  (`art/mila-calebassier/scripts/wc.py`, `paint_layers.py`): transparent washes accumulated as
  optical density, pigment pooled at the edge of each wash, granulation in a paper tooth, low
  frequency backruns. No image generator was available; none is claimed.
- Local colour is painted for daylight once. Each page's light key (`world/keys.ts`: dusk, night,
  dark, inside, dawn, from the palette of spec 02) tints the painted layers and drives the lights
  of the 3D things with the same colours, so both darken and warm together. Three warm sources
  (hero calabash, lantern, the tree) light the 3D surfaces as point lights and the painted layers
  through the same positions and ranges.
- Faces: the finishing brush is masked on eyes, mouths and faces (the mask travels in the frame's
  alpha), so the brush never smears Mila's features.
- Grain is a painted static texture, in object space on surfaces and in screen space for the
  sheet: nothing is recomputed per frame, nothing crawls.

## Master layout

Plan: `plan-jardin.png` (drawn from `world/layout.json` and `staging.ts` by
`art/mila-calebassier/scripts/draw_plan.py`). Axes: x east, y up, z south, metres.

- Calabash tree at (0, -3): trunk 2.3 m to the fork, crown radius about 4.6 m. Two low branches bend:
  A to the south-west (pages 3 and 11, hero fruit), B to the south-east (page 12, the fruit given to
  Man Ninon). Fruits hang in the branches and canopy only; the build refuses any hanging point
  nearer than 1.3 m from the trunk axis.
- Mila's house at (-11.5, -8.2), façade and covered terrace turned to the tree (yaw 62°). Her
  bedroom is inside the house, behind the façade's left window: the window of pages 6 and 8 is the
  real one and gives on the real tree. The terrace table of page 12 stands in front of the façade.
- Gate at (7.6, 1.6) in the east fence (low rendered wall and hibiscus hedge); the lane runs north to
  south behind it; Man Ninon's house at (16.5, -2.6) faces the lane.
- Stepping-stone path: Mila's terrace → west foot of the tree → gate → lane → Man Ninon's steps.
  A long surface root crosses it east of the tree (page 9).
- Rooster's perch behind the north hedge at (-2.4, -11).

Axis rule: every exterior lens stands south of the line house – tree – gate and looks north. House
and tree are screen left or centre, gate and Man Ninon's house screen right. "Towards Man Ninon" is
left to right (pages 1, 4, 9), "back to the tree and home" right to left (pages 5, 10, 12). Bedroom
lenses stand inside the room. `world/pages.test.ts` checks both rules on the presets.

## 2D / 3D choices

| Element                                      | Medium                                                                           | Reason                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Mila                                         | procedural 3D, shared module `@shared/mila`                                      | canonical character, unchanged build; IK needed for hands on the fruit       |
| Man Ninon                                    | procedural 3D on the same plan (decision P-NINON)                                | same construction, materials and IK as Mila: one drawing, exact hand contact |
| Tree trunk, limbs, roots, branches A and B   | Blender mesh, GLB; A and B skinned, one clip each                                | real occlusion and parallax; the bend must be reproducible and scrubbed      |
| Foliage                                      | painted cards (4 variants) baked on the limbs in Blender                         | calabash leaves read as painted tufts; sway in the vertex shader             |
| Calabashes                                   | Blender mesh; hero and gift as separate objects                                  | owned, moved and lit one by one                                              |
| Houses, bedroom, gate, walls, table, lantern | Blender mesh, GLB                                                                | architecture must hold several angles (pages 1, 3, 6, 8, 12)                 |
| Rooster                                      | Blender mesh with armature, two clips                                            | small animated prop: the mixer path is exercised on a real rig               |
| Hedges                                       | painted strip on planes in the GLB                                               | long, flat, seen from one side                                               |
| Mid-garden masses, foreground leaves         | painted cut-outs on billboards (vertical axis)                                   | parallax between planes; turned to the lens so no card is seen edge-on       |
| Far relief                                   | painted strip on a ring, night windows as a second additive ring                 | far enough to stay flat                                                      |
| Sky                                          | shader wash coloured by the key over a painted wash map; stars as ordered points | must change with the story; stars go out by groups                           |

Decision P-NINON (reversible, for the owner if wanted): the brief lists Man Ninon as "3D, fabriquer,
blend + GLB si pertinent". She is built procedurally in the web engine with the shared limb, hand
and head builders instead of a Blender rig. Reasons: one visual family with Mila, the same two-bone
IK for hands on the fruit and the lantern (a baked clip cannot adapt to a runtime target), no second
shading model. The Blender rig path of the brief is still exercised by the two skinned branches and
the rooster.

## Asset breakdown

See `asset-register.md` (one line per asset of `brief/data/assets.csv`, with source, format, size,
status).

## Final shotlist

Executable values: `staging.ts` (per page: intent, size, move, landscape and portrait lenses with
entry and reading frames, duration, portrait priority, continuity). Summary:

| Page | Shot                                       | Move                         | Place                       | Key           |
| ---- | ------------------------------------------ | ---------------------------- | --------------------------- | ------------- |
| 1    | general, child's eye height, from the lane | light dolly in               | gate, garden, house behind  | dusk          |
| 2    | wide from behind Mila, low angle           | push in, tilt up about 14°   | under the tree              | dusk to night |
| 3    | close three-quarter                        | discreet push in             | branch A, hands             | night         |
| 4    | medium two-shot, full figures              | lateral tracking             | lane to Man Ninon's house   | night         |
| 5    | close on face and fruit                    | almost fixed                 | path, tree behind           | night         |
| 6    | medium interior                            | short pan                    | bedroom: bed, table, window | inside        |
| 7    | general, echo of page 1                    | fixed                        | gate, garden                | night to dark |
| 8    | medium three-quarter at the window         | slight pull back             | bedroom                     | inside        |
| 9    | low three-quarter                          | short follow                 | root across the path        | dark          |
| 10   | medium two-shot                            | reveal from the gate side    | path near the gate          | dark, lantern |
| 11   | medium to wide                             | pull back, tilt up about 17° | branch A, whole tree, sky   | dark to night |
| 12   | calm wide                                  | very slow pull back          | tree, terrace, table        | dawn          |

Page change: a short dip to paper (0.22 s down, 0.5 s up); the new page starts on its entry lens.
Reduced motion: the dip only; each page is shown on its reading lens with its final poses.

## Page state model

`world/pages.ts`: each page is a function of its own clock that fills one `Frame` (poses, owner of
the hero calabash, branch bends, shutters, lights, stars, lantern, rooster). Nothing is kept between
frames, so a page can be entered directly, left mid-action and entered again. The hero calabash is
one object blended between three anchors (branch socket, Mila's carry point, bedside table); hands
follow the fruit, never the reverse. A page change retargets the dip, so rapid input cannot start
two transitions.

## Initial budgets (targets of spec 04, to be measured in S5)

| Item                             | Target              | Built so far                                                                 |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------- |
| Transfer of the tale's own files | about 10 MB or less | GLB 0.93 MB, textures 2.2 MB, cover 0.07 MB (before compression by the host) |
| Visible triangles                | alert at 250 k      | about 70 k to 100 k per page                                                 |
| Draw calls                       | alert at 150        | to be measured over a whole frame (finish pass included)                     |
| Textures                         | 1K to 2K, no 4K     | largest runtime sheets 2048x512 and 1536x1536                                |
| Phone pixel ratio                | capped near 1.5     | capped at 1.5 on coarse pointers, lighter brush                              |
