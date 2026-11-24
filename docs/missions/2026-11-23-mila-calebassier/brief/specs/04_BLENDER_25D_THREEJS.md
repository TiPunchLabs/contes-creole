# Pipeline Blender → 2,5D → Three.js

## Contrat et inventaire initial
Détecter versions Blender/Three.js, renderer, bundler, formats et système d’animation réels. Conserver WebGL/WebGPU actuel ; aucun changement de backend imposé. Vérifier outils installés avant de promettre MCP, génération d’images ou conversion.
Blender peut être piloté par scripts Python bpy en ligne de commande ou par MCP si déjà configuré. Garder des scripts reproductibles même si la scène a été construite de manière interactive. Ne pas télécharger un pont MCP inconnu pour contourner une absence d’accès.
Exemple de commande, à adapter à l’installation : `blender --background --python-exit-code 1 --python scripts/build_scene.py -- --config configs/scene.json`.

## Découpage spatial
- FG : feuillages détourés peints, peu nombreux, occultation du bord de cadre.
- MG : personnages 3D ou construction existante de Mila ; arbre héros ; calebasses ; sol de contact, racines et objets manipulés.
- BG proche : volumes architecturaux simplifiés et plans de végétation ; vraie géométrie si changement d’angle nécessaire.
- BG lointain : peintures de paysage et masses végétales étagées, sky plate ou dôme selon caméra.
Organiser les couches en collections et groupes nommés ; ne pas aplatir toute la scène en une image. Limiter les grandes couches transparentes superposées : l’overdraw peut coûter plus cher qu’une petite géométrie opaque.

## Sources Blender
Conserver .blend, textures sources, scripts, configuration et seed de génération. Échelle cohérente en mètres ; pivots au sol/charnières/points d’interaction ; noms stables. Blender Z-up et glTF Y-up : laisser l’export gérer la conversion et vérifier orientation réelle après chargement.
Séparer arbre statique, branche active, calebasses secondaires et fruit héros. UV sans étirement visible ; normales et smooth shading propres. Ajuster topologie aux déformations, surtout épaules/coudes/poignets de nouveaux modèles.
Mila : ne pas appliquer aveuglément scale/transformations à un rig animé. Préserver l’original, tester une copie. Si modèle procédural existant, piloter son système d’animation ou prévoir un adaptateur justifié ; aucune migration Blender obligatoire.
Man Ninon : rig simple compatible moteur, pose de repos documentée. IK utile à l’authoring ; baker/échantillonner les mouvements nécessaires à l’export. Les contraintes Blender ne sont pas une garantie de comportement web.

## Animation
Clips nommés suivant conventions du dépôt ; exemples sémantiques : idle, walk, receive, carry, place, reach, stumble, return. In-place avec déplacement runtime OU root motion contrôlé, jamais les deux simultanément. Synchroniser vitesse et foulée.
Préparer sockets main/branche/table. Au transfert de la calebasse, conserver la transformée monde et gérer explicitement l’ownership (branch → hand → table → hand → branch). Une seule instance héros visible. Un fruit distinct est offert au dénouement.
Baker les changements de parent/contraintes si nécessaire, ou orchestrer leurs équivalents dans Three.js. Les attaches ne se transfèrent pas automatiquement comme interactions runtime.
Préserver mains sur coque, doigts plausibles, pieds sur sol. Éviter les intersections robe/bras et racines/pieds. Courbes d’animation sans à-coups, respiration et regard discrets ; pas de boucle de remise du fruit répétée pendant la lecture.

## Matériaux NPR aquarelle
NPR = non-photorealistic rendering. Combiner base color peinte, valeurs douces, roughness adaptée au matériau et contrôle des reflets. Un shader personnalisé n’est envisagé qu’avec le renderer et la version en place.
Blender : textures peintes/UV, variations de pigments et ombres douces préparées. Three.js : matériaux compatibles et, si utile, léger traitement de grain/valeur testé ; ne pas compter sur un transfert automatique des nœuds Blender.
Peintures de fond unlit possibles pour conserver leurs couleurs, mais doivent évoluer avec les états nocturnes et rester raccordées aux objets éclairés. Éviter de baker une ombre de Mila dans un fond alors qu’elle se déplace ailleurs.
Séparer texture de matière, lightmap et ombre de contact. Favoriser masques/teintes pour l’évolution des calebasses et du ciel ; utiliser peu de lumières réelles, pas une shadow light par fruit.
Grain cohérent dans le temps : un bruit recalculé aléatoirement à chaque frame scintille. Tester grain en espace objet/UV et contribution écran légère. Ne pas réduire le visage à une silhouette brouillée.

## Images 2D
Livrer sources multicouches si disponibles, exports PNG RGBA pour découpes, masters sans texte et sans personnages. Chaque plan : profondeur, dimensions, pivot, profil colorimétrique, cadrages supportés et masque éventuel. Reconstituer les zones cachées si la caméra peut les révéler.
Tester alphaTest/alphaHash si disponibles, ou alpha blending maîtrisé. Adapter depthWrite, ordre de rendu et sorting au cas réel : ne pas désactiver la profondeur globalement. Éliminer franges claires et halos aux bords.
Un matte painting n’autorise pas des rotations arbitraires. Les projection-mapped planes demandent une caméra de référence et une enveloppe de déplacement limitée. En cas d’échec de raccord, ajouter une géométrie simple ou une nouvelle couche plutôt que masquer au flou.

## Export et intégration
Exporter modèles/clips compatibles en GLB/glTF 2.0. Vérifier armatures, morphs, actions/NLA et échantillonnage dans la version installée. Tester les clips un par un après export. Ne pas supposer que Grease Pencil, shaders NPR, compositor, lumières de zone, contraintes ou effets de visibilité sont conservés.
Gérer les effets de lumière/ciel dans le moteur ou les baker dans des ressources dédiées. Garder noms de groupes nécessaires aux sockets et à l’animation ; éviter de fusionner un objet animé dans une géométrie statique.
Charger via les mécanismes du projet (GLTFLoader si approprié) ; AnimationMixer pour clips compatibles. Ne pas remplacer des animations procédurales valides par un mixer artificiel.
Harmoniser gestion des couleurs : textures de couleur en sRGB selon API installée, données de normal/roughness non colorimétriques, calculs d’éclairage linéaires, sortie et tone mapping contrôlés. Comparer Blender/GLB/navigateur sur une mire simple et sur Mila. Pas de double conversion ou d’image aquarelle délavée par une mauvaise exposition.

## États de page
Définir une source de vérité : enter(page), sample(page, progress), settle(page), exit/dispose ou équivalent existant. Reconstruire l’état sans dépendre de la lecture de toutes les pages précédentes. Annuler tweens, écouteurs et tâches d’une page quittée ; ignorer les chargements devenus obsolètes.
Définir pour chaque page : personnages/poses, owner de la calebasse, volets, lumières, étoiles, caméra, commandes et état de texte. Les transitions longues doivent rester interruptibles. Mode reduced-motion : poses finales et changements lumineux doux sans travelling imposé.

## Budget initial à mesurer, pas résultat garanti
Cibles de départ pour cadrer l’optimisation : 30 fps stables sur téléphone de référence, 60 fps desktop si possible ; pas de pic systématique >100 ms lors des changements chauds ; ~150 draw calls et ~250k triangles visibles comme seuils d’alerte initiaux ; entrée jouable autour de 10 Mo transférés compressés si réaliste, textures communes plutôt 1K–2K, aucune 4K systématique ; DPR mobile plafonné vers 1,5 à ajuster.
Ces chiffres sont des hypothèses de mission, pas des normes ni des performances mesurées. Enregistrer matériel, navigateur, viewport, DPR, cache, poids réseau et métriques avant d’ajuster. Surveiller aussi mémoire textures décodées, transparence et shaders.
Instancing pour éléments répétitifs compatibles ; atlas si utile ; chargement progressif par voisinage de pages ; compression mesh/texture uniquement si décodeurs et pipeline disponibles et gain mesuré.
Partager géométries et textures avec ownership clair. À fermeture : annuler RAF/tweens, stopper actions/mixers, libérer uniquement ressources possédées, traiter render targets et bitmaps selon loader. Ne pas disposer les assets communs encore utilisés par un autre conte.
