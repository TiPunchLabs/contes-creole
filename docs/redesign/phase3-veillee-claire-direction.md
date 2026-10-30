# Contes Creoles - Phase 3 report: unified art direction A + C ("Veillee claire")

## Executive summary

- Objective: deepen a hybrid of direction A (Veillee) and direction C (Planche), much less dark than A, covering home, tree navigation, book titles, reading screen and Konteur integration, desktop and mobile, with an interaction preservation matrix, accessibility, feasibility and pending decisions.
- Verdict: PASS (design-level). All acceptance criteria are addressed in viewable Claude Design boards. Limitation: the mockups are schematic HTML/CSS compositions of the 3D scene, not renders of the real re-graded WebGL scene.
- Accomplished: unified direction "Veillee claire" (late-afternoon light, night kept only as text ink), 8 desktop + 8 mobile screens, user journey, 19-item matrix, accessibility plan, feasibility table, 8 decisions (A1-A8).
- Not done (by design): no implementation, no repo change, no commit, no deploy.

## Initial state and scope

- Repo: contes-creole, branch main, commit 3964732. Working tree before and after: `M src/books/ti-kannot/langue/fr.md` (pre-existing, not touched), `?? digest_contes_creoles_refonte_design.md` (pre-existing).
- Inputs: phase 1-2 deliverables in the same Claude Design project; user decisions: A+C hybrid, keep Konteur photo unchanged, include reading screen, class tales stay "en preparation", no new Kreyol text.
- Excluded: code changes, Kreyol authoring, contribution features.

## Work performed

Created (Claude Design project 43434ae5-34d9-42b9-8092-ebf912d69c03, https://claude.ai/design/p/43434ae5-34d9-42b9-8092-ebf912d69c03):

- `assets/konteur.webp`: downscaled copy (130x221) of `src/tree/assets/konteur.png`, no retouching.
- `10 AC Direction unifiee.dc.html`: concept, A/C/A+C comparison table, palette with contrast ratios, typography, backgrounds/textures/lighting, interactive component states, Konteur integration (current vs proposed, with the real photo).
- `11 AC Planches desktop.dc.html`: D1 home (tree at t=0), D2 climb, D3 near book ready (fiche a filet), D4 near book locked + keyboard focus on shelf, D5 reading Kreyol, D6 reading bileng, D7 Konteur + companion bubbles, D8 loader.
- `12 AC Planches mobile.dc.html`: M1-M8, same states at 390x844 (fiche docked above shelf, reading as bottom sheet).
- `13 AC Parcours matrice faisabilite.dc.html`: user journey, 19-item matrix, reading-screen interactions, accessibility, feasibility table, risks, decisions A1-A8.
- Phase 1-2 files (00, 01, A, B, C) kept unchanged for comparison.

Inspected (read-only): `src/app/reading-ui/reading-ui.ts`, `src/books/ti-kannot/theme.css`, `src/books/ti-kannot/story/{gcf,fr}.md`, `src/app/languages.ts`, `src/app/language-panel/language-panel.ts`, `src/app/contract.ts` (Bubble), `src/books/ti-kannot/world/index.ts`, `package.json`, `src/tree/assets/konteur.png`.

Executed: palette contrast computation (oklch -> sRGB -> WCAG), `pnpm view` for 3 font packages, Playwright GPU headless screenshots of each board for visual verification.

## Direction summary

- Moment: late afternoon sliding to evening; sky lilac -> rose -> apricot; interface on paper (oklch .985 .012 85).
- Night reused as ink: text oklch(.27 .045 280). Single accent "lampe" oklch(.78 .14 70) for light and selection only.
- Typography: Newsreader (titles, speech), Andika (reading + UI, already in project), IBM Plex Mono (numbers). Bilingual rule: Kreyol roman first, French italic second, `lang` per passage.
- Titles: C's leader-line labels become a "fiche a filet" placed off the tree (desktop) or docked above the shelf (mobile).
- Konteur: photo unchanged; integration only through environment (warm halo behind, lilac contact shadow, ground lantern) and bubble style. Bubble text = existing `SAY.teller`.
- Reading: shared frame (paper card, segmented Kreyol/Bileng/Francais, numbered progress, labelled page buttons); book world untouched.
- Home: no new page; tree at t=0 with C's editorial column (fades with the existing 1 - 9t rule).

## Verification and evidence

- Less dark than A: VERIFIED visually (boards 11/12; background L .82-.90 vs A L .19).
- Titles legible desktop and mobile: VERIFIED in mockups (D3, D4, M3, M4); fiche shown readable even with a branch over the card. Real 3D behavior NOT_VERIFIED.
- Konteur photo unchanged: VERIFIED. Uploaded asset pixel-identical to local downscale (PIL ImageChops difference bbox None); no filter/crop applied in boards.
- Contrasts: VERIFIED by computation: ink/cream 13.71, ink2/cream 7.06, ink/apricot 10.44, ink/lilac 8.58, paper-on-ink 13.71, braise/cream 4.68, lampe/cream 1.85 (therefore never text), feuille/cream 4.18 (not used for text).
- Font packages exist: VERIFIED `@fontsource/newsreader` 5.3.0, `@fontsource/ibm-plex-mono` 5.3.0, `@fontsource/andika` 5.3.0.
- Reading page buttons accessible names are "←"/"→": VERIFIED in `src/app/reading-ui/reading-ui.ts`.
- Books depend on shared Bubble contract: VERIFIED (`src/books/ti-kannot/world/index.ts:108` uses `ctx.bubble.show`; `contract.ts:74` `show(text: string, ...)`).
- Konteur PNG floor residue: VERIFIED in original file (opaque whitish area under the stool, alpha 255 in crop 150-450 x 880-1020).
- Kreyol: VERIFIED no new Kreyol string; all Kreyol in boards copied from code/stories (SAY strings, shelf/overlay strings, card titles/subs/themes, gcf.md page 1, loader line).
- Board rendering: VERIFIED via screenshots; only console error is a generic 404 on a non-page resource (present on every board, page renders fully).
- Issues found and fixed during verification: shelf label "Se kont-la" wrapping (desktop), D4 note overflow, misleading M7 note about Konteur/critter collision (existing code already has `KONTEUR_OBSTACLES`; overlap seen on site is screen-space).

## 19-interaction matrix (summary)

- Conserved (6): 2 spiral climb, 3 pointer parallax, 4 breathing/rustling canopy, 8 flora, 14 Lapen/Zanba, 17 lite mode.
- Adapted (12): 1 loader, 5 hollow, 6 sky, 7 fireflies/light/pool, 9 hanging cards, 11 shelf, 12 intro + climb rail, 13 Konteur, 15 dive/rise flash, 16 vignette/grain, 18 WebGL fallback, 19 keyboard/reduced motion.
- Replaced (1): 10 near-card label + enter button -> fiche a filet. Justification: trunk occlusion observed on live site captures (d5, m2). Behavior kept: follows near card, "Antre adan kont-la", locked "Tale · bientot dans l'arbre", Enter key.
- Removed: none.
- Reading-screen interactions (language switch, paging by wheel/swipe/arrows, Escape, back, dots, page fade, bileng gloss, "Lang kreyol" panel, book sound button): all conserved, restyled only.

## Accessibility (identified)

- Contrast rules above; reading text 20px desktop / 18px mobile, Andika.
- Keyboard order defined; double focus ring (lampe + ink) visible on sky and paper.
- Touch targets 48-56px (language toggle 44px); mobile fiche within thumb reach.
- Reduced motion: existing behavior kept; adds no halo pulse, no animated leader line, no t-dependent sky.
- Language: current `<html lang="gcf">` with mostly French UI, no per-passage `lang`, bubbles mix both languages in one text node; proposal tags every passage; page default language left to decision A5.
- Page buttons renamed "Page precedente" / "Page suivante".

## Feasibility

- No new 3D dependency, no architecture change, isolation rules respected, `createRng(11)` order untouched (new Konteur objects consume no randomness).
- S: palette tokens (`--tree-*`, `--reading-*`), fonts, sky/fog/light values, Konteur halo/shadow/lantern (reuse `softSprite`, critter blob shadow), loader/fallback/flash/vignette, `lang` attributes.
- M: fiche a filet in `overlay.ts` (+ `overlay.test.ts`, `labelTop`), bilingual bubble (touches `@app/contract` Bubble shared with books), reading frame (`reading-ui.*`, Ti Kannot theme per A4), optional t-dependent sky.
- Note: `src/tree/scene/cards.ts` uses fonts in canvas covers; font swap affects it.

## Deviations, risks and limitations

- Mockups are schematic; real re-graded 3D look NOT_VERIFIED.
- The new light is close to the existing v14 dusk; differentiation relies on ink, typography, fiches and reading-frame unity. Risk of a refonte perceived as too subtle.
- Bubble contract change impacts book worlds.
- Konteur photo remains a different visual regime from low-poly 3D; mitigated, not solved (accepted per user decision).
- New French UI strings introduced in mockups (pending A6).
- Konteur thumbnail in project is downscaled (130x221) for upload cost; original asset untouched.

## Repository and infrastructure state

- Read-only for the repository. Branch main, commit 3964732, working tree identical to session start.
- No commit, push, PR, merge, deploy. Claude Design project modified (new files only + one asset).

## Decisions required

- A1: adopt "the climb brings the evening" (sky + firefly density depend on t)? Recommendation: yes. Not blocking.
- A2: clean the white floor residue under the Konteur stool in the PNG (detourage fix, touches the file)? No recommendation; needs owner consent.
- A3: keep Konteur material emissive at 0.18? Recommendation: keep.
- A4: Ti Kannot theme (parchment, Caveat, teal) overrides the shared reading frame, or aligns to it (book keeps accent + world)? Boards show alignment. Blocks reading-frame implementation.
- A5: page default language: `lang="fr"` + `gcf` passages (recommended) or `gcf` + `fr` passages.
- A6: approve new French strings: "Monter dans l'arbre", "Voir les contes", "Page suivante", "ou touche Entree", "Des contes imagines par des classes de primaire, relus avant d'entrer dans l'arbre."
- A7: harmonize "Defilez pour continuer" (vous) with tree "Fais defiler" (tu)?
- A8: consolidate five font families to three (Newsreader, Andika, IBM Plex Mono); depends on A4 for Caveat.

## Recommended next action

- Owner reviews boards 10-13 and answers A1-A8.
- Then, if requested, write an incremental implementation plan (phase 4) ordered to avoid regressions: tokens and fonts, sky/light values, Konteur environment, fiche a filet, lang attributes, bubble contract, reading frame. Requires explicit approval; not started.
