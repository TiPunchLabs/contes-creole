# Layout, cinématographie et animatic

## Responsabilité
L’exécuteur assure ces tâches ou les délègue à un sous-agent layout/caméra. Un propriétaire explicite est obligatoire ; la délégation n’exonère pas l’exécuteur de vérifier l’intégration.
La shotlist jointe donne des intentions, pas des coordonnées inventées sans connaissance des modèles. Calculer les vraies positions après blocage et produire les presets exécutables dans le dépôt.

## Géographie
Construire un master layout : maison Mila, chambre et fenêtre correspondante ; calebassier ; chemin ; portail ; maison Man Ninon ; terrasse. Fixer échelle et axes avant de décliner les scènes. Les images ne sont pas un plan cadastral : leurs divergences spatiales doivent être résolues dans ce master layout.
Maintenir direction des déplacements, ligne des regards et continuité de l’axe des 180°. Justifier un changement d’axe par un plan de transition lisible. Aucun mur traversé pour rejoindre un nouveau cadrage.

## Livrable par page
- But narratif, sujet dominant, premier plan / plan d’action / arrière-plan.
- Caméra d’entrée, caméra de lecture, sortie ; position, quaternion ou cible, projection, focale/FOV ou échelle orthographique, near/far.
- Paramètres desktop paysage et mobile portrait ; safe area du texte et des commandes.
- Trajectoire, durée de mouvement et easing, limites angulaires des cartes 2D.
- Action one-shot, état final et boucle d’ambiance ; raccord avec pages voisines.
- Capture de lecture et captures des poses clés, dans le moteur web.

## Projection
Choisir perspective modérée si la parallaxe par distance sert la scène. Une caméra orthographique peut stabiliser une composition mais sa translation ne produit pas à elle seule la même parallaxe dépendante de profondeur : prévoir un mouvement relatif de couches, ou une rotation très limitée, si cette voie est retenue.
Ne pas imposer une orbite libre autour de peintures planes. Tester toutes les trajectoires : aucune tranche, déchirure de projection ou face arrière visible.
Privilégier un petit dolly/track motivé, une contre-plongée douce ou une caméra stable. Pas de mouvement perpétuel qui gêne la lecture.

## Mobile et texte
Ne pas recadrer automatiquement le 16:9 au centre. Recomposer portrait : rapprocher duo, adapter cible et distance, préserver pieds/mains au moment utile. Définir la zone de texte selon le vrai composant existant ; ne pas inventer un pourcentage universel qui masquerait l’action.
Desktop : molette et commandes selon conventions du projet. Mobile : glissement horizontal si intégré/validé, plus commandes accessibles. Pas de navigation automatique. Ne pas réimplémenter globalement l’accueil.

## Animatic
Réaliser les douze plans en proxy/graybox avant détail. Exporter une vidéo muette basse résolution ou une preview séquencée avec identifiants de pages. Les timings de cet animatic sont indicatifs : le lecteur final contrôle le changement de page. Prévoir reduced-motion : caméra fixe et poses finales lisibles sans attendre.
