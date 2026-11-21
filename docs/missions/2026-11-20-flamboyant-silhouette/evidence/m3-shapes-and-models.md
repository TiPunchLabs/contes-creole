# M3 — shape references and the two Blender proposals (AC4)

## Photographs looked at (shape references only, none committed)

Found through the Wikimedia Commons search API, viewed as 960 px thumbnails.

| File page                                                                                 | Licence      | Observed                                                                                                                          |
| ----------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| https://commons.wikimedia.org/wiki/File:Flamboyant_Tree_(Delonix_regia)_(46475663002).jpg | CC BY-SA 2.0 | crown far wider than tall, flat top; sinuous grey limbs showing through; red on the upper face, green below; the rim hangs        |
| https://commons.wikimedia.org/wiki/File:Flame_tree_mali.jpg                               | CC BY 2.0    | short stout trunk, flared foot with roots at the surface; one long low limb far out on one side, the rest of the crown offset (B) |
| https://commons.wikimedia.org/wiki/File:Flamboyant_(Delonix_regia)_branches.jpg           | CC0          | boughs fork alternately, in zigzag, almost in one plane; long bare stretches; much sky between the sprays                         |
| https://commons.wikimedia.org/wiki/File:Delonix_regia_leon.jpg                            | CC BY-SA 3.0 | flowers in dense clusters at the ends of the twigs, feathery leaves between them                                                  |

Two more were downloaded and not used (`Delonix_regia_16.jpg`, `Delonix_regia_4257.jpg`).

## How the models are built

`art/flamboyant/build_flamboyant.py`, run in a background Blender 5.3.0 (the owner's open Blender
session was not touched; the Blender MCP was not used):

```bash
blender -b --factory-startup -P art/flamboyant/build_flamboyant.py -- a   # then: -- b
```

It writes `art/flamboyant/flamboyant-{a,b}.blend` and `src/tree/assets/flamboyant-{a,b}.glb`.
A second run of the final script gave byte-identical GLB files (sha256 compared).

- Authored in the scene's own frame (trunk foot at the origin, opening camera on -z), so the
  models need no turn and no offset in three.js.
- Editable source: each `.blend` holds vertex skeletons (`wood`, `roots`, `boughs`, `twigs`) under
  live Skin and Subdivision modifiers, radii in the skin vertex data, plus the two foliage meshes
  and the attach empties, all parented to `flamboyant-a` / `flamboyant-b`.
- Forks: trunk, leader, scaffold limbs (and B's long limb) are one skinned surface, so their forks
  are continuous. Boughs start inside their scaffold and twigs inside their bough (separate
  surfaces that emerge from the bark, as the published tree's side branches do); the roots emerge
  from the flared foot the same way.
- Taper: every limb thins along its length (`r1 + (r0 - r1)(1 - s)^0.85`); a shoot starts at 0.6 of
  its parent's radius there.
- Roots: six buttress roots leave the foot at two heights and sink below the lawn (y = -0.6) to
  y = -1.35, 2.6 to 3.5 m out (inside the critters' keep-out radius of 4.2 m).
- Materials: three plain matte materials, `wood`, `foliage`, `bloom` (roughness 1, no texture).
- Foliage: provisional lumps only (one flattened icosphere per twig end, about 30 % of them in the
  flower colour, since the visitor looks up at the crown and caps alone would not show).
- Attach points: empties `attach-1` to `attach-5`, one per card slot along the climb (t = 0.2,
  0.37, 0.54, 0.71, 0.88: the 3 slots of today use 1, 3 and 5; 2 and 4 are for a 5-slot tree).
  The repo had no model and so no naming convention for nodes: lower-case kebab-case, like the
  book ids. Each is the end of a bare twig. This naming is a proposal (see report, decisions).

## The two proposals

|                            | A — parasol                                                                      | B — asymmetric                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Trunk                      | upright, first limb at 2.9 m                                                     | leans away from the long limb, which leaves it at 3.0 m                                        |
| Scaffold limbs             | 7, leaving at 2.9, 3.7, 3.7, 4.5, 4.5, 5.4, 5.4 m, then running out almost level | 6 on the crown's side, plus the long limb: 10.9 m out towards the first book, level around 6 m |
| Crown                      | layered, wide and low: tiers from about 6.5 to 11 m                              | offset to the right and back of the opening view, taller (to about 12.5 m)                     |
| Triangles (wood / foliage) | 69 588 / 13 440                                                                  | 68 176 / 11 600                                                                                |
| GLB size raw / gzip -9     | 1 512 836 / 1 179 871 bytes                                                      | 1 452 676 / 1 136 295 bytes                                                                    |
| Threads of the 3 cards     | under 5.5 m each (test), against 6.9 to 8.5 m today                              | first book about 2 m, the other two under 5.5 m                                                |

Published tree, for scale: 59 392 bark and 34 032 crown triangles, no file to transfer.
The GLB weights are prototype weights (float positions and normals, no compression); both use the
same export settings.

Blender stills (front = opening side, profile, back, plan; same scale): `blender-views.jpg`,
originals in `~/.local/share/contes-creole-qa/flamboyant-silhouette/blender/`.
