# Owner feedback 2 (2026-11-24, on the preview of a6e1062)

Verbatim: « améliorer la demarche de la mamie de manière général les 2 personnages donne l'impression d'être pied nud donc corriger ces 2 problème »

Pilot reading:

1. Man Ninon's walk, on every page where she walks: improve the gait as a whole (it reads stiff/mechanical): weight shift, heel-to-toe roll, knee and hip bend, arm counter-swing on the free arm, pace and stride suited to an older woman, no foot sliding on the ground, no foot through the ground or the dress hem. The lantern arm (page 10) and the gift/fruit carrying poses keep their contact.
2. Both figures look barefoot: give Mila and Man Ninon visible footwear consistent with a contemporary Guadeloupe garden at dusk (e.g. closed sandals or simple shoes for Mila, slippers/closed shoes for Man Ninon), readable at desktop and phone sizes, in the watercolour material language of the tale.

Constraint from the mission: Mila's figure lives in `src/shared/mila/`. The underwater Mila tale must stay unchanged (A02/A09): footwear is an option of the shared figure, off by default, on in the calebassier tale.

## Addendum (2026-11-24, same cycle 4)

Verbatim: « je pense qu'on peut encore améliorer les silouhettes des personnages sans tout casser demande à l'exéteur d'améliorer la silouhette des personnages (model fable 5.2) »

Pilot reading: improve the silhouettes of Mila and Man Ninon (readable outline at small size and against the garden: proportions, head/body ratio, shoulders and arms, dress shape and hem, hair, posture; Man Ninon reads as an older woman), incrementally, without rebuilding the figures and without breaking owner feedback 1 (arms clear of the dress), the carry contacts, F1–F3 and the visibility check. Work on the mission's model (Fable 5.2), not delegated. Mila's changes stay an option of `src/shared/mila/` enabled only in the calebassier tale (underwater tale unchanged).

## Footwear precision (2026-11-24)

Verbatim: « des chaussures fermé légère pour les 2 personnages qui reste dans l'harmonie du contes »

Pilot reading: both figures wear light closed shoes (no sandals, no slippers): low, soft, simple shapes (e.g. canvas or soft leather flats/ballerinas for Mila, light closed walking shoes for Man Ninon), colours and texture taken from the tale's palette and watercolour materials, no bright or branded look. This replaces the « e.g. » options of point 2 above.

## Page transitions (2026-11-24)

Verbatim: « améliore aussi les transitions entre les pages un effet qui ne casse pas la naration »

Pilot reading: improve the transition between two pages of this tale with an effect that keeps the story flowing (e.g. a watercolour wash or paper bleed dissolve, or a short camera glide that links the end of one page to the start of the next, in the tale's palette), short (about 0.5–1 s), never hiding the text change or the subject, interruptible by fast navigation (keys, swipe, buttons) without stacking, reduced motion = a plain short cross-fade or a cut. Scope: inside the calebassier book (its world/staging/theme), not the shared shell: the home tree and the other tales keep their transitions.

## Addendum 2 — Man Ninon's back (owner, 2026-11-24T20:30Z, seen live on the dev server)

Owner, verbatim: « la mamie semble bossus à corriger »

Pilot reading: Man Ninon reads as hunchbacked. Straighten her upper back and shoulders: an elder's slight forward lean and soft shoulders are fine, a hump is not. Check the torso/shoulder geometry and the rest pose and walk cycle (spine/neck bend), in profile and three-quarter views, on every page where she appears, without breaking the arm-clear-of-dress and lantern/gift readability already fixed. Same cycle 4, part of the silhouette work (Fable 5.2, not delegated). Show before/after captures in the report.

## Addendum 3 — page 12 root crossing (owner, 2026-11-24, seen live on the dev server)

Owner, verbatim: « fixer: page 12 les personnage traverse la racine »

Pilot reading: on page 12 the characters walk through a tree root. No figure (Mila, Man Ninon, carried props) may intersect a root or any ground prop at any instant of the page, in normal and reduced motion, at the reading frame and during the walk. Fix the path or the root placement, keep the composition. Add an automated check for figure/root (and figure/scene-prop) interpenetration along the page paths, with a negative control, and sweep every page for the same defect (cf. owner feedback 1, p5 plant crossing). Before/after captures in the report.
