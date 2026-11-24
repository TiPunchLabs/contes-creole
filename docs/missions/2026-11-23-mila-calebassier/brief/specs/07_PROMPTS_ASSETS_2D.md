# Briefs de fabrication des couches peintes

Ces textes sont destinés à l’outil de peinture/génération réellement disponible, pas une obligation d’utiliser un fournisseur. Adapter dimensions et projections à la caméra finale. Produire les couches séparément ; ne pas détourer aveuglément une planche entière.

## Socle commun
Univers contemporain de Guadeloupe, aquarelle poétique sur papier fin à grain discret, lavis transparents, granulation et bords sélectifs. Même palette et éclairage que les objets 3D. Pas de texte, cadres de storyboard, personnages, calebasse héros ou ombres de personnages déjà dessinés. Pas de cabane, case en bois, bungalow touristique, temple, château ou décor patrimonial imposé. Maisons ordinaires maçonnées, enduites et couvertes, ouvertures adaptées au climat.
Les exports de végétation destinés au découpage ont une vraie transparence alpha, sans damier peint. Les fonds opaques peuvent rester opaques. Prévoir overscan et zones cachées reconstituées.

## A — Premier plan végétal RGBA
Peindre quelques groupes indépendants de feuilles et de fougères, valeurs suffisamment sombres pour cadrer mais sans obstruer le sujet. Pas de décor complet derrière. Bords doux mais silhouette lisible ; variations jour/nuit cohérentes. Livrer pivots et positions envisagés ; ne pas remplir tout le viewport de couches transparentes.

## B — Jardin intermédiaire RGBA
Masses végétales du jardin en groupes détachés et espacés, niveau de détail modéré, sans arbre héros ni personnages. Fournir plusieurs silhouettes complémentaires plutôt qu’une seule haie répétée. Même hauteur d’horizon et direction lumineuse que le master layout.

## C — Paysage lointain opaque
Relief guadeloupéen et habitat contemporain discret dans un jardin habité. Faible contraste, simplification atmosphérique, pas de palmier décoratif omniprésent. Préparer le fond pour des cadrages paysage et portrait sans étirer l’image. Séparer ciel et relief si la variation lumineuse le demande.

## D — Ciel et color keys
Crépuscule abricot/lavande ; nuit indigo ; nuit atténuée lisible ; aube pêche. Même composition géographique. Étoiles séparées en masque/groupes pilotables, sans étoiles imposées sur les couches de relief.

## E — Textures de matière
Pigments d’écorce, enduit de façade, sol, tissu et coque lisse de calebasse. Sans reflets directionnels forts ou ombres de personnages ; préparer UV et répétition pour éviter les coutures. La coque reste lisse, jamais l’aspect granuleux d’un fruit à pain. Lumière magique dans un masque ou un canal distinct.

## Validation avant intégration
Contrôler profil couleur, alpha, dimensions, poids, continuité des couches, échelle et visibilité lors de la trajectoire caméra. Vérifier les fichiers par leurs pixels, pas leur nom. Les images de référence de ce dossier sont de l’intention artistique ; elles ne satisfont pas à elles seules ces livrables.
