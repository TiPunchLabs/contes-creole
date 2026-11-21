# M4 — preview in the page, checks (AC5, AC6, AC7)

## The switch

- `?tree=current|a|b` shows three buttons (Actuel / A · parasol / B · asymétrique) that swap the
  central tree in place: no reload, so the camera stays exactly where it is. The address keeps the
  choice. Without the parameter nothing changes and no button shows.
- Enabled on the dev server and in builds made with `VITE_TREE_PREVIEW=1`, set for Netlify deploy
  previews in `netlify.toml`. A production build drops it: `pnpm build` gives 0 `.glb` file and 0
  script mentioning `tree-preview` or `GLTFLoader` in `dist/assets` (checked); a build with the
  flag emits `preview-*.js` (47 kB) and the two models.
- The existing mechanisms were looked at first: `?lite=` (same pattern, reused) and the dev-only
  viewer `qa/vegetation/` (no books, no Konteur, no title, so not what the brief asks for).
- Code: `src/tree/preview/` (`choice.ts`, `proposal.ts`, `index.ts`), a hook in
  `src/tree/index.ts`, `cards.ts` `hang()` (threads re-hung on the model's attach points),
  `canopy.ts` `treeWindAt()` (the thread tops follow the same wind field as the wood).
- Same wind: the models' three materials are patched with the tree's own `withTreeWind`, so wood
  and foliage masses bend with the field the published tree uses. Seen in stills only (reduced
  motion); how it looks moving is NOT_VERIFIED here.

## Same camera, lights, framing, scenery (AC5, AC6)

- The published tree is always built, in the same place of the build order, whichever tree is
  shown (`index.ts`: landscape, tree, sky on one `createRng(11)`), and only hidden when a proposal
  is shown. The preview draws no random number. `layout.test.ts` (pinned draws) is unchanged and
  passes.
- Measured in the page (`ONLY=scenery`, `scenery-select.json`): for `current`, `a` and `b` the
  landscape (386 objects, 98 618 vertices, summed vertex samples, placement of its children) and
  the sky (18 objects, 803 vertices, summed vertex samples) give identical digests:
  `scenery equal: true`. The background flamboyants are in the landscape group.
- Captures of the three trees at the same four views, both sizes:
  `~/.local/share/contes-creole-qa/flamboyant-silhouette/final/`, sheets `compare-desktop.jpg` and
  `compare-mobile.jpg` (copies, downscaled, next to this file; rows opening, stop 1, 2, 3 on
  desktop; columns current, A, B).

## Rotation and selection (AC5)

`ONLY=select`, each tree, desktop 1440x900 (mouse) and 390x844 (touch):

| Check                                              | current | A   | B   |
| -------------------------------------------------- | ------- | --- | --- |
| wheel / finger swipe climbs (t 0 to 0.275 / 0.333) | yes     | yes | yes |
| near card named "Ti Kannot é Gwo Rako — Antré…"    | yes     | yes | yes |
| press on the card opens `ti-kannot` (shell's root) | yes     | yes | yes |

The card's entry point was not wholly inside the 1440x900 frame at the moment measured, for the
three trees alike (it is on the phone size): not a difference between them, not looked into.

## Unit tests added

`src/tree/preview/choice.test.ts` (3) and `models.test.ts` (3 per model): the five attach points
and six meshes are there, the model stands at the origin under the opening view's crown height,
cards 1, 2, 3 hang from attach 1, 3, 5 by threads under 5.5 m, and no ray from a card's near
camera to the card meets the model.

## Check chain (AC7), on the final tree of files

| Command                      | Result                           |
| ---------------------------- | -------------------------------- |
| `pnpm format:check`          | all files pass                   |
| `pnpm lint --max-warnings=0` | 0 error, 0 warning               |
| `pnpm typecheck`             | pass                             |
| `pnpm test`                  | 57 files, 414 tests passed       |
| `pnpm build`                 | built; no model, no preview code |

Known and left: `favicon.ico` 404 on the dev server, already on `c5c6f0c`.
Not measured in phase 1: frame rate, draw calls, smoothness (phase 2, GPU headed run). The
proposals add 6 meshes for 2 (bark, crown) plus the crown's glow points, which the proposals do
not have.
