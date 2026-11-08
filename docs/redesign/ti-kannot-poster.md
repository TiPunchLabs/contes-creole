# Ti Kannot é Gwo Rako — poster redesign (TKP)

Plan for the owner mission of 2026-11-07. Rulings: TKP-* in [decisions.md](decisions.md). Evidence
and review: `~/.local/share/contes-creole-qa/ti-kannot-poster/`.

## Starting point

- The island (PAY-ART3) keeps its layout, cameras (`staging.ts`), story positions and RNG order:
  every change below re-paints or animates what is there, with no new placement draws.
- The grade before: cyan-white skies, a vignette that washes into the paper, lime greens, flat
  saturated red roofs, faceted grey rocks. The poster: peach and apricot sky, gold light,
  turquoise and pale green sea with white foam, varied soft greens, terracotta roofs, rounded
  rocks, a cascading river.

## Art direction, as implemented

| Poster quality                              | Change                                                                                                                                                                                                                                                                                                                            | Files                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Peach and apricot sky, gold light           | Day skies per page move to peach zeniths and gold horizons; the narrative moods stay (dusk p3, white noon of the drought, grey p6, night p7, rain and rainbow p12). Warm cloud banks low on the horizon; warm mist; the far islets become low hazy humps and the haze leans aqua (they had read as a tan wall behind the island). | `staging.ts`, `world/sky.ts`                      |
| Painted, soft edges                         | Watercolour pass: no saturation lift, warmer paper, a lighter vignette so the image no longer fades to white, green hues pulled towards the poster's yellow-greens. Ground colours blend between faces instead of one flat colour per facet.                                                                                      | `world/paint.ts`, `world/island/ground.ts`        |
| Turquoise and pale green sea, delicate foam | New sea colours, a pale lagoon band, a broken double line of foam on the shore that breathes slowly, warmer, softer sun glints.                                                                                                                                                                                                   | `world/water.ts`                                  |
| Waterfall and streams                       | The river ribbon carries its own steepness: steep reaches turn into white cascades with faster streaks, the slow reaches stay clear.                                                                                                                                                                                              | `world/water.ts`                                  |
| Rounded rocks, sandy shore                  | The source rock becomes a rounded boulder, pale on top with moss and a damp foot (same size and position, so the perch is unchanged); dam, river and path stones are rounded at the same reach (island plan unchanged, checked); a ring of rounded shore rocks in the shallows, placed with their own RNG.                        | `world/island/source.ts`, `world/island/shore.ts` |
| Warm roofs, small Creole houses             | Terracotta and warm green roofs, cream and ochre walls.                                                                                                                                                                                                                                                                           | `world/island/landscape.ts`                       |
| Varied greens, flamboyants                  | Ground and foliage palettes retuned (warm meadow, deeper forest, flamboyant red-orange).                                                                                                                                                                                                                                          | `world/island/ground.ts`, `world/island/flora.ts` |
| Living world, quiet sea                     | Foliage sways gently in the wind (vertex shader, no new geometry); none with reduced motion.                                                                                                                                                                                                                                      | `world/island/scenery.ts`                         |

Characters, the camera glides and the page timing are unchanged (CAM-SCOPE): the narrative already
drives where the two characters stand and how the island changes page by page.

## Educational interface

- The "Lang kréyòl" burger and dialog appear because the shell attaches the panel when a book has
  `langue/fr.md`. The file moves to `docs/explanations/ti-kannot/langue/fr.md`: the tale no longer
  shows the burger, the dialog or its overlay. No shared code changes and no other tale is affected.
  Mila never had notes.
- The notes stay verified against the tale (`books.test.ts` keeps checking every quoted example
  against `story/gcf.md`), ready for a future explanatory page.
- Kept, as reading functions: the language switch (Kréyòl, Bileng, Français), the page counter
  and buttons, the scroll hint, the sound button, the "scène seule" toggle (hides the text card) and
  the characters' speech bubbles (lines of the tale itself).

## Cover in the tree

- `assets/cover.webp` is the supplied poster, resized for the 512×720 card texture (no retouching).
- New optional `BookCard.poster`: the cover fills the card inside its lamp frame and the tree paints
  no title over it (the poster carries its own). The title stays in the accessible shelf and the
  tree's label. Other books are unchanged (the flag is opt-in).
- The poster fits the card window by its width: at most about 1 % of the height is trimmed, above
  the title and below "Un conte créole", where the poster has only sky and sea.

- Short phones (TKP-R1, lifts M2-MOB for this point only): when the docked fiche would cover the
  near card, the tree shifts its view up (`camera.setViewOffset`) by just what the card needs, eased
  in as the card comes near. Every card benefits; where the card already clears the fiche (tall
  phones, tablets) the shift stays at 0 to 3 px, and wide screens are unchanged. The lift never
  pushes a card's top edge above 8 px, and it settles on the top of the card's sway instead of
  following it (TKP-R2).
- Known limit (TKP-R2): at 320×568 the invitation's fiche is too tall for its whole card; the card
  rises to the top edge and its bottom title strip, repeated by the fiche, stays behind it. The
  tree's book layout is to be reworked in a later mission.

## Title

The poster reads "Tinnot é Gwo Rako"; the book id, card title and tale text keep
"Ti Kannot é Gwo Rako" (TKP-NAME). Reported, not renamed.

## Checks

- Gates: prettier, eslint, tsc, vitest, build.
- GPU captures with `qa/world.mjs` (12 pages, desktop 1440×900 and mobile 390×844, with the card
  and in "scène seule"), before and after, plus the uncapped fps sample.
- `qa/tkp.mjs`: the tree cover at desktop and mobile size, no language panel in the tale, the
  language switch, all pages, the way back, reduced motion, and Mila still opening on page 1.
- Codex review per `codex-review.md`.
