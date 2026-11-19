# Assets and licences — accueil-veillee

Every visual of the new home is either an existing project asset reused as is, or painted at run time by the executor's code (canvas 2D / shaders). No image generation, no third-party image, no new font.

| Asset                                                                                    | Origin                                                                           | Use on the home                                    | Licence / status                    |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| `src/books/mila/assets/cover.webp` (960x640)                                             | Existing project asset (Mila's supplied painting, already the tree card's cover) | Mila's tale page, uncropped, proportions kept      | Project asset, as already published |
| `src/books/ti-kannot/assets/cover.webp` (640x960)                                        | Existing project asset (owner's poster, already the tree card's cover)           | Ti Kannot's tale page, uncropped, proportions kept | Project asset, as already published |
| Sky, clouds, ridges, houses, tree tops, palms                                            | Painted in code (`src/veillee/scene/backdrop.ts`, `paint.ts`)                    | Backdrop planes                                    | Original, executor                  |
| Tiles, stucco, wood, living room, cloth, page edges, bookmarks, leaves, hibiscus, petals | Painted in code (`terrace.ts`, `book.ts`, `branches.ts`, `ambient.ts`)           | Terrace, book and branches                         | Original, executor                  |
| Paper of the pages                                                                       | Painted in code (`page-art.ts`)                                                  | Page textures                                      | Original, executor                  |
| Konpè Lapen and Konpè Zanba drawings                                                     | Painted in code (`src/veillee/portraits/`)                                       | Portrait pages                                     | Original, executor                  |
| Fonts Newsreader, Andika                                                                 | Existing `@fontsource` dependencies (SIL Open Font License)                      | Header, titles, texts                              | Unchanged                           |

The reference boards (`planche-trois-temps.png`, `vue-portrait.png`) are never shipped: they stay outside the repository.
