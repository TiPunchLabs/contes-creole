# Mila et le calebassier magique — production sources

Everything the tale's files are built from. The scripts are the source of truth: seeded, no
download, no network. Heavy derived files (`blend/`, `textures/master/`) are git-ignored and can
be rebuilt; a copy with a sha256 manifest is kept in the owner's production folder
(`contes-creole-assets/mila-calebassier-production/sources/`).

## Tools

- Blender 5.3 (headless), Python 3 with numpy and Pillow (painter), ImageMagick and ffmpeg (QA only).

## Rebuild

From the repository root:

```bash
# 1. Painted layers and material textures: masters (PNG) and runtime exports (WebP)
python3 art/mila-calebassier/scripts/paint_layers.py
# 2. Models, rigs, clips, sockets: GLB files, the build report and the .blend
blender -b --factory-startup --python-exit-code 1 \
  -P art/mila-calebassier/scripts/build_assets.py -- --blend
# 3. Ground plan of the mission folder
python3 art/mila-calebassier/scripts/draw_plan.py
```

Outputs:

| Path                                                         | Content                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `art/mila-calebassier/textures/master/src_*.png`             | painted masters (git-ignored)                                          |
| `src/books/mila-calebassier/assets/tex/rt_*.webp`            | runtime textures                                                       |
| `src/books/mila-calebassier/assets/glb/{tree,set,props}.glb` | runtime models                                                         |
| `src/books/mila-calebassier/world/assets.json`               | build report read by the engine (fruit positions, bent sockets, table) |
| `art/mila-calebassier/blend/mila_calebassier.blend`          | Blender scene with packed masters (git-ignored)                        |

The master layout is `src/books/mila-calebassier/world/layout.json`; Blender and the web engine
both read it. Geometry is authored in the web engine's axes (x east, y up, z south, metres) and
converted by `meshkit.py`; the glTF exporter converts back.

## Scripts

| Script                      | Role                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `scripts/wc.py`             | watercolour painter: washes as optical density, pooled edges, granulation, cut-outs without pale fringes   |
| `scripts/paint_layers.py`   | every 2D layer and material texture (`--only name,name`)                                                   |
| `scripts/meshkit.py`        | mesh builder for bpy (tubes, lathes, boxes, walls, UVs, vertex colours, skin weights)                      |
| `scripts/build_assets.py`   | tree, branches A and B (armature, clip, socket), fruits, houses, bedroom, gate, props, rooster; GLB export |
| `scripts/render_compare.py` | one EEVEE still through a lens given in the engine's axes, to compare with the browser                     |
| `scripts/draw_plan.py`      | ground plan with each page's reading lens                                                                  |

## Conventions

- `src_` painted masters, `rt_` runtime exports; `ref_` is reserved for the owner's reference
  boards, which are not in the repository and are never used as textures.
- GLB materials are placeholders named by surface (`bark`, `wall_mila`, `gourd`…): the engine
  paints each surface by its material name (`world/garden.ts`).
- Vertex colours carry data, not tint: foliage (r sway, g phase), ground (r path, g shade),
  fruits in the branches (r light group).
- Clips: `A_offer`, `B_offer` (branches), `rooster_stir`, `rooster_crow`; sockets `socket_A`,
  `socket_B` under the last bone of each branch.

## Licence and provenance

Every file here was written or generated for this mission by the scripts above. No third-party
model, photograph or texture is included. The four reference boards of the brief are intent only.
