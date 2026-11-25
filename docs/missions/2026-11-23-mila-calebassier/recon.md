# S0 Reconnaissance — mila-calebassier

Date: 2026-11-23. Executor: Claude Code session, model id `claude-fable-5-2`. Worktree
`contes-creole-worktrees/mila-calebassier`, branch `feat/mila-calebassier`, base `3ce9759`.

## Repository facts (verified)

- Remote: `origin git@github-xgueret:TiPunchLabs/contes-creole.git` (alias matches the git identity rule).
- Stack: Vite 8.3, TypeScript ~6.0, Three.js r186 (`three ^0.186.1`), vitest 5, ESLint 10, Prettier 3.9,
  `@playwright/test` 1.58.2 (pinned). pnpm 10.23. Renderer: `THREE.WebGLRenderer` (WebGL 2), no WebGPU.
- CI (`.github/workflows/ci.yml`): `format:check`, `lint --max-warnings=0`, `typecheck`, `test`, `build`.
- `build/` is git-ignored: production sources must not live in a folder of that name.

## Page system

- `src/app/contract.ts`: a book is a folder `src/books/<id>/` with `book.ts` (`defineBook`). Two kinds:
  - `world` (`BookWorld`: `mount(container, ctx) -> { setPage, setStory, setCardHidden?, dispose }`): the
    shell lays its shared reading UI over the world (text card, language switch, page buttons and
    counter, "Relire le conte", "scène seule" toggle, back button, keys, wheel, phone swipe). Ti Kannot.
  - `immersive` (`ImmersiveWorld`): the book owns text and controls. Mila underwater.
- `src/app/registry.ts` discovers `books/*/book.ts` and `books/*/story/*.md`; `story/gcf.md` is required.
- `src/books/books.test.ts`: a `world` book needs `cover`, `story/gcf.md`, `staging.ts` exporting
  `STAGING` keyed by exactly the page ids, and a non-empty label on every Kréyòl page.
- Universe isolation (ESLint `no-restricted-imports`): a book imports only its own files, `@shared/*`
  and `@app/contract`.
- The shell's session language defaults to Kréyòl (`lang = "gcf"` in `src/app/app.ts`).

## Mobile navigation in force

- `src/shared/gesture.ts` (PR #52): `isPhone()` (touch screen with short side < 600 CSS px), `bindSwipe`.
- For `world` books the shell binds the swipe itself (`goPage(page + direction)`, one page per gesture,
  clamped to the tale; buttons and links ignored). Desktop: wheel through `createPager`, keys
  (arrows, space, PageUp/Down), buttons. No automatic page advance anywhere.
- Consequence: a `world` book inherits the validated navigation with no shell change.

## Mila: real source

- Mila is procedural Three.js, not a GLB and not a Blender rig. She is built inside the closure of
  `createMilaScene` in `src/books/mila/world/scene.ts` (5161 lines): `buildMila()` (lines 2132–2543 at
  `3ce9759`) with helpers `limb`, `skinnedLimb`, `taper`, `withRim`, `sculpt`, `headPoint`, `onHead`,
  `arc`, `makeHand` (1842–2130), arm IK `solveArm` (2552–2582), dress helpers `DRESS`, `dressRadius`,
  `clearOfDress`, `flounce` (62–144), textures `TEX_dress`, `TEX_madras`, `TEX_hair` (canvas, drawn from
  the scene's seeded RNG in module order, 643–760), animation `animateMila` (4130–4291).
- Last commit touching the file: `7ea9a48`. Reference commit for the character: `3ce9759`.
- Canonical look: skin `#6b3a26`, saffron crumpled-paper dress in four flounces (`#eaa12a` family) with
  straps, two hair puffs with red madras ties and bows, gold hoops, bare feet, height about 1.25 m.
  The coral dress of the reference boards is not canonical (brief: the repository is the source of truth).
- Dependencies of the build on the scene: toon materials and ramps, the rim-light wrapper (uniforms
  time/wind/swim), `rr` (seeded RNG, 180 draws for the hair edge), `conchGeometry` (held conch), `scene.add`.

## Tooling (verified by running it)

- Blender 5.3.0 (`/home/xgueret/.local/bin/blender`), headless: engines `BLENDER_EEVEE`,
  `BLENDER_WORKBENCH`, `CYCLES` all render in background mode; `export_scene.gltf` GLB export works.
  Blender's Python 3.13 has numpy 2.3.4, no Pillow.
- System `python3` with numpy 2.3.5 and Pillow 12.1.1; `ffmpeg`, ImageMagick (`convert`, `magick`).
- GPU: NVIDIA GeForce RTX 4060 Laptop (8 GB). System Google Chrome present (`QA_CHANNEL=chrome`).
- Image generator: none found (no generator CLI, no API key in the environment). Painted layers are
  therefore produced by a scripted watercolour painter (numpy + Pillow) written for this mission.
- Not found: `cwebp`, `gltf-transform` (WebP is written by Pillow; no mesh compression is used).
- Disk: 25 GB free on `/` (95 % used).

## Previous missions and material

- `docs/missions/2026-11-17-mila-underwater`, `2026-11-21-mobile-swipe-nav`,
  `2026-11-15-home-visual-polish`: report format, QA kit usage (`qa/*.mjs`, GPU only, evidence outside
  the repo in `~/.local/share/contes-creole-qa/<mission>/`).
- Local POC `~/Téléchargements/mila-calebassier-poc/mila-poc/` (read only): one 2D cut-out shot made by
  cutting the reference boards with rembg. Not reused: the brief forbids cutting the boards into
  textures and projecting boards with Mila drawn in.
- The four reference images were read: storyboard (12 panels, 3D-render look, wooden-free houses,
  fruits on the trunk in several panels: not prescriptive), `01` dusk gardens (transparent washes,
  paper grain), `02` night of the calabashes (indigo night, golden halo), `03` garden in depth
  (foreground leaves, mid garden, house, hills).

## Differences between the brief and the repository, and how they are resolved

| Topic            | Brief                                                          | Repository                          | Resolution                                                                                                                 |
| ---------------- | -------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Mila's outfit    | boards show a coral dress                                      | saffron paper dress, madras ties    | repository wins (brief says so)                                                                                            |
| Mila's medium    | "3D ou procédural existant"                                    | procedural, inside one closure      | extraction to `@shared/mila/` with the underwater tale calling the same code (behaviour-preserving), no Blender conversion |
| Man Ninon        | "3D, fabriquer, blend + GLB si pertinent"                      | no second human exists              | see `preprod.md` decision P-NINON                                                                                          |
| Reading UI       | "texte HTML accessible", project navigation                    | shared reading UI for `world` books | new book is a `world` book; no shell change                                                                                |
| Default language | French is the reference, Kréyòl unvalidated                    | shell opens books in Kréyòl         | Kréyòl file marked as an unvalidated draft on every page label; decision D-GCF at delivery                                 |
| Page 12 text     | "nous en ferons un bol pour notre table"                       | —                                   | `story.fr.json` verbatim (supersedes D-P12 of the cancelled mission)                                                       |
| Sources location | `art/mila-calebassier/{blend,textures/master,scripts,configs}` | no `art/` folder yet                | adopted as is                                                                                                              |
| Sound            | none                                                           | Ti Kannot and Mila have ambience    | no sound, no sound button in this book                                                                                     |

## Baseline evidence

Collected by a Sonnet subagent in an isolated worktree at `3ce9759` (checks with exact counts, baseline
build, underwater stills): `~/.local/share/contes-creole-qa/mila-calebassier/baseline/`. Results are
reported in `report.md`.
