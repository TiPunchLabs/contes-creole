# "Veillée claire" redesign — progress state

Single resume point for the autonomous finalization mission (owner prompt of 2026-10-30, "Mission
globale — Finalisation autonome"). Decisions and their wording live in
[decisions.md](decisions.md); evidence and reports live in `~/.local/share/contes-creole-qa/`.

## Integrated into `feat/veillee-claire`

| Work                              | PR  | Merge commit |
| --------------------------------- | --- | ------------ |
| M2 tokens                         | #8  | f602503      |
| Decision register                 | #10 | 81f9875      |
| QA kit in `qa/` (T1)              | #12 | 23f8735      |
| M3 typography                     | #9  | b096200      |
| M4 2D palette                     | #11 | d4d9a96      |
| M5 3D re-grade                    | #13 | 733369b      |
| M9 cards                          | #14 | 84c9af5      |
| M8 fiche à filet                  | #15 | 2f5a8d0      |
| M10a languages, tree rename       | #16 | 52c8aa5      |
| M10b+c root lang, names           | #17 | 33a8671      |
| M11 bilingual bubbles             | #18 | 3366599      |
| Edge screens and cleanup (M14+16) | #19 | a07c854      |
| Bubble French line in italic      | #20 | 09f9c81      |
| Cards clear of flora, no hollow   | #22 | see git log  |
| Nature pass (flora, fireflies)    | #23 | see git log  |

## Remaining work

- None that is unblocked. The redesign is ready for the owner's evaluation; the evaluation pack and
  final report are in `~/.local/share/contes-creole-qa/final-evaluation/` and
  `~/.local/share/contes-creole-qa/reports/contes-creole-veillee-claire-final.md`.

## Awaiting owner's artistic review

- Nature pass (2026-10-30): buried breadfruits moved out of the mornes, palm / banana / tree-fern
  crowns fan out (Euler order fix), banana leaves with a midrib, 110 fireflies near the plants, a
  few visible stars. Open art points: star brightness, the banana in the foreground of the climb
  around t = 0.375. Evidence: `~/.local/share/contes-creole-qa/nature/`.

- Home screen "Mission Accueil" (2026-10-30): the intro becomes board C's editorial column (no
  card, paper wash) on wide screens and a top band on a paper veil on portrait and narrow screens;
  the site title "Pyébwa a Konesans" heads that column as the page `<h1>` (badge removed), and the "Imaginé
  par xgueret" signature is removed from the home screen (owner's adjustments, same PR). Branch `feat/veillee-claire-accueil`, PR to `feat/veillee-claire`,
  not merged. Evidence: `~/.local/share/contes-creole-qa/accueil/`.

- Konteur integration "Mission Konteur" (2026-10-30): cut-out cleaned in `konteur.png` (alpha only:
  floor residue under the stool, detached specks, keyed slivers on the right sleeve); flat contact
  shadow under the feet instead of a hidden upright sprite; the stray seat rock removed; Konteur
  moved inwards (x 5.2 → 4.4 wide, 2.3 → 1.9 narrow) so he is no longer cut by the left edge;
  slightly warmer idle lantern glow. Emissive 0.18 kept (A3 still open). Branch
  `feat/veillee-claire-konteur`, PR to `feat/veillee-claire`, not merged. Evidence:
  `~/.local/share/contes-creole-qa/konteur/`.

## Blocked on owner decisions (no work started)

- M6 "the climb brings the evening": A1.
- M7a Konteur halo: not done (no visual need found in the Konteur mission); emissive: A3.
- M12 shared reading frame and M13 Ti Kannot alignment: A4 (the shared frame has no other
  consumer until a second book is ready).
- M15 approved copy: A6 (rest) and A7.
- Deploy previews: T2.

## Next action

- Owner evaluation: VALIDÉ, AJUSTEMENTS CIBLÉS or À REVOIR, and rulings on the open decisions
  above. Never open a PR to `main` or deploy without explicit authorization.
