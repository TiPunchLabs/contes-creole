# Vérification et livraison

## Matrice d’acceptation
| ID | Critère | Preuve attendue |
| --- | --- | --- |
| A01 | douze pages et texte français complet | comparaison du texte, ordre et ouverture du conte |
| A02 | Mila canonique réutilisée | sources/commit et captures avant/après |
| A03 | plusieurs calebasses dans les branches ; aucune sur le tronc | captures canopée et inspection scène |
| A04 | architecture contemporaine sans case en bois | vues des deux maisons et références |
| A05 | aquarelle cohérente 2D/3D | captures navigateur de jour/nuit ; revue visuelle |
| A06 | profondeur réelle au mouvement | courtes captures vidéo de parallaxe et occultations |
| A07 | caméras documentées pour les douze pages | shotlist finale, presets desktop/portrait, animatic |
| A08 | prises, portage et restitution crédibles | page 3, 6, 8, 9 et 11 en mouvement |
| A09 | pas de régression des contes existants | contrôles adaptés au dépôt et parcours de référence |
| A10 | navigation robuste et accessible | avant/arrière, sauts, commandes et reduced-motion |
| A11 | chargement/fermeture propres | dix cycles de réouverture et métriques ressources |
| A12 | performance mesurée | matériel/viewport/DPR/cache, poids réseau et frame times |
| A13 | sources et reconstruction exploitables | blend/scripts/exports et procédure vérifiée |
| A14 | provenance et licences | registre complet des assets intégrés |
| A15 | version complète reviewable | PR, preview, SHA et revue indépendante finale |

## Scénarios fonctionnels
- Parcourir 1→12 puis 12→1, avec attente longue sur pages 3 et 11 : le don ne se répète pas.
- Naviguer rapidement 2→3→4→3, puis 6→8→6 et 10→11→12→11 ; aucun double fruit, tween concurrent ou état de lumière erroné.
- Fermer pendant un chargement ou une transition ; rouvrir sans événements doublés ni état persistant involontaire.
- Redimensionner et changer orientation pendant une page ; mains, visage, objet et texte restent visibles.
- Tester clavier, boutons tactiles, glissement mobile selon projet et absence d’interception excessive des gestes de lecture.
- Tester reduced-motion et visibilité du texte dans le tableau le plus sombre.
- Vérifier comportement de chargement en cas d’asset absent : pas d’écran muet ni erreur masquée.

## Revue visuelle
Capturer les douze pages au minimum en 1440×900 et 390×844, plus 360×640 pour les pages denses. Ces dimensions sont des points de départ, pas des appareils réellement testés.
Inspecter trajectoires caméras, sorting transparent, franges, shadow acne, clipping, pieds, épaules/robe, prise main-calebasse, changement de parent, direction des marches et continuité spatiale.
Une vidéo des gestes est nécessaire : une capture fixe ne détecte pas glissement ou téléportation.

## Tests et rapport
Utiliser Playwright ou l’outil navigateur déjà présent si disponible, plus scripts et checks exigés du dépôt. N’ajouter des tests automatisés que pour les comportements pertinents : état de page, annulation de transition, lifecycle, texte et absence de régression. Ne pas confondre assertions DOM et qualité artistique.
Mesures mémoire après chauffe puis dix cycles : expliquer la mise en cache attendue ; rechercher une croissance non bornée. Donner p50/p95 des frame times si collecte possible et documenter méthode/durée.
Revue indépendante sur le SHA final ; si changement après revue, revoir les zones modifiées et leurs dépendances.

## Livraison du pilote
Rapport : objectif, résultat, chemins/commits, responsabilités caméra, assets réutilisés/fabriqués, tests et preuves, limites, étapes de reconstruction, PR et preview.
Conserver les réserves comme réserves. Aucun PASS de performance mobile réelle sur la seule base d’une émulation desktop.
Ne pas fusionner main ni publier sans GO explicite. Ne pas laisser la mission au stade d’un POC après vertical slice.
