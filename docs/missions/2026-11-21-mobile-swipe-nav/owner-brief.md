# Owner brief (verbatim, received 2026-11-21 by pilotage)

# Mission Contes Créoles — Navigation horizontale sur smartphone

Tu pilotes cette mission dans le dépôt `TiPunchLabs/contes-creole`. Suis le workflow du projet : implémentation par Claude Code, revue indépendante par Codex, puis PR avec une préversion Netlify testable sur téléphone. La fusion et la publication en production restent ma décision.

## Objectif

Deux lecteurs sur smartphone ont eu la même difficulté : ils ont essayé de faire glisser la scène horizontalement alors que le site attendait un geste vertical. Corrige ce décalage sur la page d’accueil et dans tous les contes accessibles depuis le site, notamment *Ti Kannot é Gwo Rako* et *Le secret du coquillage rose*.

Le critère de réussite est simple : un lecteur qui découvre le site sur son téléphone doit pouvoir explorer l’accueil, ouvrir un conte, avancer d’une scène et revenir à la précédente sans explication orale.

## Comportement attendu

- Sur smartphone, glisser le doigt de droite à gauche avance d’une scène. Glisser de gauche à droite revient à la précédente. La règle est identique sur l’accueil et dans les contes, en portrait et en paysage.
- Un geste volontaire parcourt une seule scène, même s’il est long ou rapide. Aux extrémités, respecter le début et la fin du parcours. Un geste supplémentaire sur la dernière scène ne doit ni fermer le conte ni le relancer.
- Un geste principalement vertical laisse la scène en place. Si un texte dépasse l’écran, le lecteur peut le faire défiler jusqu’à la dernière ligne, en français comme en créole.
- Un appui sur une couverture ouvre le bon conte, même si le doigt a légèrement bougé. À l’inverse, un balayage qui commence sur une couverture ne doit pas ouvrir le livre au relâchement. Vérifier aussi le sélecteur de langue et les commandes de retour.
- Sur l’accueil mobile, adapter l’indication de navigation existante. Si aucun indice n’existe, afficher discrètement « Glisse vers la gauche pour explorer », puis le retirer après la première navigation réussie. Respecter les conventions linguistiques du projet.
- Dans les contes, réutiliser les boutons précédent/suivant s’ils existent. À défaut, prévoir deux commandes tactiles discrètes, nommées pour les lecteurs d’écran, sans masquer le récit. Les boutons et les gestes doivent conduire exactement au même état.
- Limiter cette évolution aux smartphones. Préserver la navigation actuelle à la molette, au pavé tactile et au clavier sur ordinateur, ainsi que le comportement actuel sur tablette. Un ordinateur avec une fenêtre étroite ne doit pas basculer vers les gestes mobiles sur le seul critère de largeur.

## Consignes à l’exécuteur

1. Lis les instructions du dépôt et identifie, pour l’accueil et chaque conte, ce qui pilote réellement la progression : défilement, index de scène, chronologie d’animation ou déplacement de caméra. Vérifie les travaux en cours sur l’accueil avant de choisir la base de la branche.
2. Branche le geste mobile sur le mécanisme de progression déjà en place. Si une animation dépend d’un défilement continu, fais avancer cette même animation jusqu’au prochain repère narratif. Le décor, la caméra, le texte et l’indicateur de progression doivent rester synchronisés, y compris au retour arrière.
3. Réutilise la logique commune lorsque les parcours le permettent. Limite la reconnaissance des gestes aux surfaces concernées. Préserve le défilement des textes, le zoom natif et les préférences de réduction des animations.
4. Traite les gestes courts, diagonaux ou interrompus et les gestes successifs pendant une transition. Garde les modifications centrées sur la navigation. La direction artistique, le contenu des contes et la mise en scène restent hors périmètre.

## Vérification et revue

Demande au reviewer Codex de vérifier le comportement depuis l’interface avec Playwright. Un test qui appelle directement une fonction « scène suivante » ne valide pas la reconnaissance du geste.

| Parcours | Résultat à vérifier |
|---|---|
| Accueil mobile | Avancer, revenir, puis toucher une couverture ouvre le bon conte. Balayer depuis la couverture permet de poursuivre l’exploration. |
| Chaque conte | Depuis la première scène, avancer deux fois puis revenir une fois affiche le texte et le décor de la deuxième scène. Vérifier aussi les bornes du parcours. |
| Lecture sur petit écran | Sur une scène au texte long, atteindre la dernière ligne par défilement vertical sans changer de scène. Tester en français et en créole. |
| Gestes ambigus | Un tap légèrement tremblé reste un tap. Un geste principalement vertical, annulé ou à deux doigts ne tourne pas la page. Un balayage rapide ne saute pas deux scènes. |
| Orientation | Tourner le téléphone en cours de lecture conserve la scène et permet de poursuivre dans les deux sens. |
| Ordinateur et tablette | Comparer avec la version de départ. Vérifier notamment la molette et le clavier sur ordinateur, y compris avec une fenêtre étroite. |

Exécute les contrôles existants du dépôt. Dans le rapport, précise les navigateurs, les profils émulés et les appareils physiques effectivement testés. Distingue la validation technique du geste de sa compréhension par les lecteurs.

## Livraison

Fournis le lien de la PR, celui de la préversion Netlify correspondant au commit relu, le verdict de Codex et les éventuelles réserves. Joins si possible une courte capture montrant un aller-retour sur l’accueil, puis dans un conte.

Prépare cette consigne pour les deux lecteurs à l’origine du retour, sans leur révéler le geste : « Depuis l’accueil, trouve un conte, ouvre-le, lis les deux premières scènes, puis reviens à la première. » La préversion doit être prête pour cet essai avant ma décision de fusion.
