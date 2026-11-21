# Owner brief (verbatim, received 2026-11-20 by pilotage)

# Mission Contes Créoles — Remodeler le flamboyant de « Pyébwa a Konesans »

Tu pilotes cette mission dans le projet TiPunchLabs/contes-creole. Lance le travail selon le workflow agentique du dépôt et conduis-le jusqu’à la première décision artistique décrite ci-dessous.

Confie la modélisation Blender et l’intégration Three.js à Claude Code avec le modèle Claude Fable 5.2. Vérifie le modèle actif dans la session d’exécution. Si Fable 5.2 est indisponible, signale-le avant de déléguer à un autre modèle. Confie la revue indépendante à Codex.

## Intention artistique

Le flamboyant est l’arbre autour duquel le visiteur tourne pour choisir un conte. Depuis la caméra d’accueil, le tronc forme aujourd’hui un grand V, plusieurs branches suivent des courbes similaires et la couronne paraît compacte. Nous voulons un arbre adulte au port étalé, reconnaissable à sa silhouette, avec des branches qui paraissent avoir grandi ensemble. Le visiteur doit pouvoir suivre du regard une branche jusqu’au fil qui porte un livre.

Garde le langage visuel de Contes Créoles : volumes stylisés, ciel rose, collines douces, feuillage vert et floraison rouge orangé. Travaille à la distance réelle du visiteur. La mission porte sur le flamboyant central et ses points d’attache. Le Konteur, les animaux, les autres plantes, les textes et la navigation font partie du cadre de comparaison.

## 1. Partir de la bonne scène

- Lis les instructions du dépôt. Identifie la branche qui contient la version de « Pyébwa a Konesans » correspondant à la capture du propriétaire. Si la capture est inaccessible depuis ta session, utilise l’accueil exécutable comme référence.
- Vérifie l’état réel des travaux CANOPY et de la PR #42 avant de choisir ta base. Préserve les acquis présents dans la scène, en particulier le cadrage d’ouverture, le vert au-dessus de la fourche et le mouvement solidaire des branches, des feuilles et des fleurs.
- Repère dans le code le modèle de l’arbre, ses dimensions et son origine, la trajectoire de caméra, les attaches des livres et leurs zones interactives. Vérifie si l’arbre central partage du code ou des matériaux avec les arbres du décor.
- Dans un environnement de travail isolé, capture la version de référence depuis la vue d’ouverture et deux angles de rotation reproductibles. Note le commit de départ, la taille de fenêtre et les positions de caméra.

## 2. Produire deux silhouettes dans Blender

Appuie-toi sur quelques photographies de flamboyants adultes (Delonix regia) pour observer le départ des charpentières, leur étalement et les espaces de ciel entre les branches. Utilise-les comme références de forme.

Construis deux propositions ayant chacune une intention visible depuis l’accueil :

- A — Flamboyant en parasol. Une couronne large, des charpentières qui s’écartent à des hauteurs différentes et une zone abritée perceptible au pied du tronc.
- B — Flamboyant asymétrique. Une longue branche latérale porte visuellement un livre principal. Des branches secondaires équilibrent la masse de l’arbre quand on tourne autour.

Pour les deux variantes, soigne la continuité des volumes aux fourches, la diminution progressive du diamètre, l’implantation des racines et la silhouette de profil. Place des points d’attache nommés selon les conventions du projet. Utilise un matériau mat simple pour le bois et, si nécessaire, quelques masses de feuillage provisoires pour apprécier la couronne. Réserve les textures et la floraison détaillée à la variante retenue.

## 3. Me permettre de choisir dans la page

Exporte les prototypes en GLB et intègre-les dans une preview de développement. Prévois un moyen simple de passer de l’arbre actuel à A puis B en conservant exactement la position de caméra. Réutilise le mécanisme de preview existant si le dépôt en possède un.

Laisse visibles les vrais livres, leurs fils, le Konteur, le titre et la navigation. Conserve le même éclairage, le même cadrage et le même décor pour les trois versions. Vérifie la rotation, la sélection d’un livre et sa lisibilité sur ordinateur et en format mobile.

Demande à Codex d’ouvrir la preview et de vérifier lui-même les points suivants, avec Playwright si disponible :

- À l’ouverture, la silhouette est lisible et les livres restent repérables.
- Pendant la rotation, les fils rejoignent une branche et les couvertures restent accessibles.
- Les fourches paraissent continues depuis les trois angles retenus.
- Le remplacement de l’arbre central n’a pas modifié les arbres du fond.

Corrige les défauts techniques qui empêchent une comparaison équitable. Présente-moi ensuite le lien de preview, les vues comparatives et ta recommandation en quelques lignes. Explique ce que chaque variante apporte à l’accueil et ce qu’elle donne sous son angle le moins favorable. Demande-moi de choisir A, B ou un ajustement précis. Attends ma réponse à ce stade.

## 4. Après mon choix

Finalise uniquement la silhouette choisie. Répartis les bouquets de feuilles et de fleurs le long des ramifications, ménage quelques ouvertures sur le ciel et vérifie que le feuillage conserve du volume pendant la rotation. Raccorde les attaches et les animations au fonctionnement réel de la scène.

Livre la source Blender éditable et le GLB utilisé par Three.js selon l’organisation du projet. Si un script Python a servi à construire ou exporter l’arbre, conserve la version qui reproduit le résultat livré. Charge uniquement le modèle retenu dans le parcours public.

Fais revoir la version finale par Codex dans le navigateur. Compare la référence et le résultat dans les mêmes conditions : captures, poids transféré, appels de rendu et fluidité pendant la rotation. Précise si le mobile a été testé sur appareil réel ou en émulation.

Termine avec la PR, la preview, les preuves visuelles et les réserves éventuelles. La fusion et la publication en production restent à ma décision.
