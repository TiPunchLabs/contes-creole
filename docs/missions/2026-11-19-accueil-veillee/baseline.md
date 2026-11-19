# Baseline — home page at c5c6f0c (S1)

Commit: `c5c6f0c` (origin/main, merge of PR #49). Read-only observation; nothing changed on this commit.

## Catalogue, ids, universes, languages, covers

- Single catalogue: `src/app/registry.ts` globs `src/books/*/book.ts` (eager), sorts by `order`, checks `id === folder` and unique `order`. Stories are lazy (`story/*.md?raw`), notes lazy (`langue/fr.md`).
- Books at c5c6f0c:

| id          | order | ready | title (card.title)                         | card.lang | theme              | entry kind                   | official visual                                                                       |
| ----------- | ----- | ----- | ------------------------------------------ | --------- | ------------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| ti-kannot   | 1     | true  | Ti Kannot é Gwo Rako                       | gcf       | Dlo · L’eau        | `world` (shell reading UI)   | `src/books/ti-kannot/assets/cover.webp`, 640x960, owner's poster, title painted in it |
| zanba       | 2     | false | Zanba é Lapen                              | gcf       | Riz · La ruse      | none                         | none                                                                                  |
| konpe-lapen | 3     | false | Konpè Lapen                                | gcf       | Chimen · Le voyage | none                         | none                                                                                  |
| mila        | 4     | true  | Mila et le lambi qui avait perdu son chant | fr        | La mer             | `immersive` (own reading UI) | `src/books/mila/assets/cover.webp`, 960x640, supplied painting, no title in it        |

- H1 confirmed: published (`ready`) tales are Ti Kannot and Mila; `zanba` and `konpe-lapen` are `ready: false` manifests.
- "Universe grouping": each book folder is one universe (spec `docs/superpowers/specs/2026-09-29-universes-per-book-design.md`); the tree is a further universe (`src/tree/`). There is no grouping above the book: `card.theme` is a label, not a group.
- Languages: `gcf` required, `fr` optional, `en` unused. Shell reading languages `gcf | bi | fr` (`src/app/languages.ts`); the choice lives in the shell's `lang` variable and survives from one tale to the next within a session (no URL, no storage).
- Covers: `book.cover` is a painter for the tree's 512x720 card, which crops the official visual to the tree's cover window (`src/shared/cover.ts`, `COVER_WINDOW`). The home book must use the full visual with its own proportions, so the crop is not reused.

## Routes and the way back

- Two Vite entries: `/` (app) and `/contes-des-classes/` (static page, no Three.js).
- No route for a tale. Entering a tale does not touch the URL; browser back from a tale leaves the site (or returns to the previous page), as before.
- `/#invitation` (RETURN_HASH, `src/tree/invitation.ts`): the classes page's two back links; the tree opens on the invitation slot then strips the hash (`src/tree/index.ts:149`).
- `?lite=1|0` forces the tree's lite mode (`src/tree/lite.ts`).
- Back from a tale: shell `leave()` (`src/app/app.ts`): flash to white 1.1 s, `closeBook()`, `tree.resume(bookId)` (camera back at that book's card), focus restored to `returnFocus` (the element focused when the tale was entered), flash out 1.2 s. Escape and the reading UI's back button call it; Mila calls it through `ImmersiveContext.exit()`.

## Exact call site of the entry transition

- Tree → shell: `ctx.onEnter(bookId)` from the card pick (`src/tree/index.ts` `enter()`), the shelf (`overlay` `onEnter`) and the Konteur's random tale.
- Shell: `src/app/app.ts` `enter()` (world books) and `enterImmersive()` (Mila), both:
  `await Promise.all([activeTree.dive(bookId), flash.to(1, TIMING.dive * 0.45, TIMING.dive * 0.55)])` then `activeTree.pause()`, hide the tree layer, mount the world, `flash.to(0, TIMING.fade)`.
- The choreography itself lives in the universe: `src/tree/index.ts` `frame()` while `diving`: over `DIVE_SECONDS = 1.7`, `d = smoothstep(progress)`; camera lerps to `dest = card - 0.6 * normalize(cam - card)`, i.e. 0.6 units beyond the card along the view line (the camera flies through the card), `look` lerps to the card centre, `fov` lerps from the fitted 50° to 95°, lens shift fades out. The flash starts at 55 % of the dive (0.935 s) and lasts 45 % (0.765 s).
- Timing constants: `TIMING = { dive: 1700, rise: 1100, fade: 1200 }` (`src/app/app.ts`).

## Dependencies on camera or branch coordinates

- The shell depends only on the `TreeHandle` contract (`dive(bookId)`, `pause()`, `resume(fromBookId?)`, `dispose()`) and `MountTree` (throws without WebGL; the shell retries 5 times 1.2 s apart then shows `showFallback`). It never reads camera or branch coordinates.
- Inside the tree: dive target = `cards.position(index)` (card on its branch tip); `resume(id)` sets `t = cardT(index)` (camera height on the climb). These are tree-internal and need no port: the new home provides its own target (the book page) behind the same contract.
- Worlds (Ti Kannot, Mila) do not read anything from the tree.

## Open work touching home

- `gh pr list --state open`: none at framing time and at S1 (2026-11-19).
- Memory notes: PR #49 (Mila underwater) merged; its open items (flaky QA timeout, phone check) do not touch the home.

## Motion of the old home (from code; videos in `evidence/` manifest)

At rest (no input): wind on the canopy (`tree.update(decor)`), sky drift and fireflies (`sky.update`), landscape life, swinging cards, Konteur idle, two critters (Lapen, Zanba) wandering on the lawn with their own speech bubbles, pointer parallax on the camera (x 0.5, y 0.3). During selection: wheel/drag climbs the trunk (camera height eased, factor 4.5/s), hovered or focused card grows with a brighter halo, shelf follows, bubble for the Konteur/critters. Depth cues: fog, layered skyline/landscape, near leaves, parallax.

Reduced motion: decor clock at 0.08 pace, parallax at 0.2.

The videos and measurements of S1 are listed in the "Videos" section below.

## Videos and measurements (S1, delegated capture: Sonnet subagent)

Folder `~/.local/share/contes-creole-qa/accueil-veillee/baseline/` (manifest with sha256 there; copied into `evidence/manifest.md`).
Environment: Chrome 158.0.8127.36 headed, `UNMASKED_RENDERER` = `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`; build of c5c6f0c served by `vite preview`.

- `01-home-desktop-rest.webm` (23.5 s), `02-home-mobile-rest.webm` (23.1 s), `03-home-desktop-selection.webm` (18.1 s), `04-journey-mila-desktop.webm`, `05-journey-tikannot-desktop.webm`, `06-journey-mila-mobile.webm`, contact sheets and screenshots.
- First load (desktop home): 723 972 B over 19 requests (uncompressed preview server). FPS at rest: 60.0.
- Journeys: tree → Mila / Ti Kannot through the shelf (first press approaches, second opens), first scene, back (`.mila-back`, `.reading-back`). Focus after return: the tale's shelf button in all three runs (desktop and mobile).
- Console: only `/favicon.ico` 404 (no favicon in the repo); no page error.

Executor observation of the videos (identity to keep): an entry screen first (loader: logo and « ka prézanté kont gwadloup » until fonts and textures settle, ~2-3 s), then a living clearing: canopy in the wind, cards swinging on their threads, Lapen and Zanba walking on the lawn, Konteur idle, haze and layered hills giving depth, camera breathing with the pointer. The new home keeps « alive in every plane, nothing jumps » and drops the entry screen (brief: « sans écran d'entrée »): the loader is removed; the HTML header and book controls are usable at first paint while the scene fades in.
