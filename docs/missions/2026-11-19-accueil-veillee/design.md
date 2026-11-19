# Design — home « La Veillée » (S2)

Executor: Opus 5.5. Decisions below are reversible unless marked "structuring" (none so far).

## 1. Architecture

- New universe `src/veillee/` (alias `@veillee`), isolated like `src/tree/` (ESLint `no-restricted-imports`: own files, `@shared/*`, `@app/contract`).
- It implements the existing home contract `MountTree` / `TreeHandle` (`dive`, `pause`, `resume`, `dispose`). The shell (`src/app/app.ts`) keeps its call site, flash timings, world mounting, way back and focus restore unchanged. `src/main.ts` mounts `mountVeillee` instead of `mountTree`.
- `src/tree/` stays in the repository, no longer mounted (tree-shaken out of the bundle). Its deletion is left to the owner (open decision D-TREE-KEEP): it still holds tests, the Konteur/random-tale and the classes invitation logic that the new home does not take over. `/#invitation` (classes page back links) still lands on the home; the veillée strips the hash.
- Contract addition (catalogue = single source): `BookManifest.art?: { url, width, height, titleInArt }` is the tale's official visual at its own proportions. Mila and Ti Kannot set it from their existing `assets/cover.webp` (the very files their tree card uses; no copy, no recrop).
- Without WebGL the veillée does not throw: it mounts a flat HTML home (same header, menu, book controls, tale images as `<img>`); the shell's retry/fallback path is kept for safety but no longer reached for the home.

## 2. Layers (2D painted planes vs 3D volumes)

Fixed camera. All painted textures are drawn at run time on canvases (`src/veillee/paint/`), seeded, no image generation, no third-party image.

| Depth (m from camera, desktop) | Layer                                                                                                         | Kind                                | Motion                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| ~140                           | Sky (gradient violet→rose→apricot, brushed)                                                                   | 2D plane, shader                    | none (fixed reference)                                                                        |
| ~120                           | High cloud sheet                                                                                              | 2D plane, scrolling painted texture | drift 1 (slowest)                                                                             |
| ~95                            | Low cloud bank, behind ridges                                                                                 | 2D plane, scrolling                 | drift 2, opposite phase                                                                       |
| ~80 / 60                       | Basse-Terre ridges (far blue, near green)                                                                     | 2D planes, alpha silhouettes        | fixed; a light band crosses the near ridge (shader)                                           |
| ~45 / 30                       | Neighbourhood: houses (lit windows), canopy groups, palms                                                     | 2D planes, alpha                    | canopy groups sway by groups with staggered phases (vertex shader per group)                  |
| 4-8                            | Terrace: tiled floor, low wall (muret), house wall + sliding bay + overhang, chair, child, cushion, plant pot | 3D volumes, painted materials       | child breathes (torso/shoulder), bay light flickers very slightly (TV-free, warm living room) |
| 1.2-2                          | Table + 3D book + bookmarks                                                                                   | 3D                                  | fringes and paper corner tremble; page turn                                                   |
| 0.6-1.5                        | Near branches with leaves and flowers (top corners)                                                           | 3D alpha cards on a branch skeleton | wind with flower lag; cast moving shadows on wall and floor (shadow map, alpha-tested)        |
| floor decal                    | Per-tale ambient: Mila water reflection; Ti Kannot falling flamboyant petals                                  | 3D decal / sprites                  | per tale, crossfades with the selected page                                                   |

- Clouds pass behind the ridges because the ridges are opaque planes in front of the cloud planes (depth order, not a 2D mask). The sky band behind them has full matter (no holes).
- Everything moving has painted matter behind it (sky behind clouds, wall behind leaf shadows, floor under the child). No flat background image.
- Distinct rhythms (seconds per cycle): clouds ~160/220, slope light ~23, canopy groups 4.1-6.3 staggered 0.35 s, near branches 3.3 + gusts 11, flowers lag 0.25 s, child breath 4.6, fringes 2.1, paper corner 7.7, Mila reflection 5.3 (foam pulses on the same phase).

## 3. Book model

- Hardcover: two boards (red cloth) with thickness, rounded spine, page blocks left/right with layered edge texture, gutter dip.
- Static spread pages: curved planes (bow up at the gutter), 24x8 segments, CPU-deformed: the right page's free corner lifts slightly with the breeze.
- One turning leaf: plane 32x6 segments, deformed on the CPU each frame of a turn: the angle along the leaf is the base angle plus a curl that drags the outer edge (`curl * sin(πp) * u^1.6`), integrated along the width so paper length is preserved. Front texture = current right page, back = next left page (mirrored UV). The illustration follows the curvature because it is the leaf's own texture.
- A page of the sequence is one spread. Page textures (canvas 1024x1448 per side): paper colour, grain, deckle edge shade, then the art with its own proportions:
  - landscape art (Mila 3:2) spans the spread across the gutter (left half on the left page, right half on the right page), margins adapted;
  - portrait art (Ti Kannot 2:3) sits on the right page; the left page carries the universe kicker and sub line (painted) above the HTML title area.
- Effects layer: separate meshes above the page (Mila foam shader masked to the sea band; Ti Kannot waterfall shimmer masked to the river), never baked into the page texture.
- Bookmarks: three ribbons out of the top edge with painted motifs (Mila: wave/turtle, Ti Kannot: flamboyant, portraits: leaf), fringed ends trembling. Their HTML buttons sit on the projected ribbon tops.

## 4. Page-turn and navigation

- Sequence = `buildPages(books, portraits)` (`src/veillee/pages.ts`): tale pages from the catalogue (`ready` books in `order`), portraits inserted from editorial data (`after: <book id>`). The turn component only sees `Page[]`. Adding a portrait = adding an entry to `src/veillee/portraits/index.ts` (data + painter); a test adds a fixture portrait and checks it without touching the turn code.
- Selection index changes at once (HTML title, link name, destination); the leaf animates from the shown page to the target. Fast gestures: a new request while turning completes the current leaf quickly (×4) then turns again; multi-page jumps (bookmarks) turn one leaf with the target textures (no flip storm).
- Input: prev/next buttons, ArrowLeft/Right (+ PageUp/Down), horizontal swipe on the book (threshold 40 px and |dx| > 1.4 |dy|), tap vs swipe distinguished (tap = < 10 px and < 450 ms). Clicks on the illustration go through an HTML button laid over its projected rectangle (accessible name = tale title + action), so the click target is real HTML.
- Entry: only tale pages carry the entry button. Portraits show their text in place (HTML), no entry.
- Reduced motion: the leaf does not lift; the spread changes with a 180 ms crossfade; portraits show an expressive still pose; decor clock at 0.08 (project precedent).

## 5. Entry transition adaptation

- Reused unchanged: the shell's `enter()` / `enterImmersive()` / `leave()`, `TIMING`, the flash, world mounting, focus restore, Escape.
- Reused as choreography: `DIVE_SECONDS = 1.7`, `smoothstep`, `dest = target - k * normalize(cam - target)`, look to target, fov from rest to 95°, lens shift fading. Adapted: the target is the tale's illustration centre on the 3D page (world position of the art centre), and `k = 0.6 * pageHeight / 2.1` (the tree card was 2.1 high), so the move has the same proportions relative to what is entered. `resume(bookId)` re-selects that tale's page (spread shown flat, no turn) and the shell refocuses the entry button that opened it.

## 6. Menu and classic pages

- Header (HTML, rendered before the scene): brand « Contes Créoles » + nav Accueil, Les contes, Le projet, Contact; a « Menu » button under 760 px.
- Accueil: `/` (`aria-current="page"`).
- Les contes: an HTML panel on the home listing the catalogue by universe (theme) and title, each with « Ouvrir le conte » (shell entry) and « Voir dans le livre » (turns to its page). Opens instantly from the menu, also via `/#contes`. It is also the no-WebGL access.
- Le projet: new static page `/le-projet/` (third Vite entry, no Three.js), built only from texts already published in the repo (meta description, README line, footer « Contes Créoles, un projet TiPunchLabs », the classes invitation and its link). Open decision D-MENU-PROJET (owner copy).
- Contact: `https://xgueret.tipunchlabs.fr/#tp-contact` (verified in `contes-des-classes/index.html:165` and decision M2-FORM), new tab with the project's external-link convention. No other contact data exists in the repo; none invented.

## 7. Mobile and accessibility

- Camera pose interpolated on aspect: landscape pose (book bottom-left third, child right) and portrait pose (raised and closer: child upper right, book lower half, as `vue-portrait.png`). Low height (844x390): landscape pose with header compacted.
- Portrait text: HTML card over the right page on desktop, under the book on phones (stable, not deformed).
- Focus visible on every control; contrast: controls on frosted dark plates, never bare text on the animated sky.
- Silent scene: no audio.

## 8. Render budget

- Pixel ratio ≤ 1.5 (lite ≤ 1). One shadow-casting light, 1024² map (lite 512²), only near branches cast, floor/wall/table receive.
- Target draws < 80, triangles < 120 k. Page textures: 4 canvases of 1024x1448 alive (current + target spread), portrait canvases redrawn at 30 Hz only while their page is shown.
- Rendering stops when the tab is hidden (`visibilitychange`) and when the shell pauses the home (tale open). `renderer.info` checked over ≥ 5 round trips (no growth of geometries/textures).
