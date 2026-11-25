# Mission au pilote — Mila et le calebassier magique

Tu pilotes la production COMPLÈTE d’un conte web animé de douze pages dans le projet Contes Créoles. Ce dossier est le brief autonome. Lis son README, toutes les spécifications, les données et les quatre images avant de transmettre des directives à l’exécuteur.

## Résultat attendu
Un univers original en 2,5D avec effet aquarelle poétique, une narration animée par page, une preview complète intégrée au site. Blender sert à fabriquer, préparer et animer les ressources ; Three.js assure la lecture interactive. Il ne s’agit ni d’une bande dessinée, ni d’un diaporama de douze images, ni d’une simple vidéo, ni d’un POC isolé.

## Contraintes prioritaires
- Réutiliser le personnage de Mila du conte précédent : identité, silhouette, coiffure, tenue et corrections existantes. Rechercher sa vraie source dans le dépôt. Ne pas supposer que Mila est déjà un GLB ou possède un rig Blender. Si elle est procédurale, conserver cette voie tant qu’une conversion n’est pas justifiée ; ne pas réinventer le personnage pour faciliter Blender.
- Calebassier, jamais arbre à pain. Plusieurs calebasses lisses suspendues aux BRANCHES dans la canopée ; aucune calebasse intégrée au tronc. La calebasse principale doit pouvoir passer de la branche aux mains puis revenir à sa place.
- Maisons antillaises contemporaines, maçonnées/enduites, terrasse couverte et ouvertures adaptées au climat. Aucune case en bois ou esthétique archaïsante par défaut.
- Matière aquarelle : lavis, granulation, bords sélectifs, profondeur atmosphérique. Éviter le contraste entre personnages plastiques et fonds peints. Ne pas remplacer le travail artistique par un filtre plein écran.
- Le texte complet et le dénouement adapté sont dans `specs/01_CONTE_FR.md` et `data/story.fr.json`. Ne pas reprendre la conclusion de l’arbre à pain : la calebasse servira à fabriquer un bol, elle ne constitue pas le repas.
- Pas de son ni de voix dans cette mission. Ne pas présenter une traduction créole générée comme validée.
- Préserver les contes et travaux existants. Respecter les instructions du dépôt et le workflow en place.

## Responsabilités et délégation
Le pilote orchestre, l’exécuteur réalise et l’équipe assure une revue indépendante selon le workflow du dépôt.
L’exécuteur DOIT prendre en charge le layout et la cinématographie, ou déléguer explicitement cette partie à un sous-agent dédié. Cette délégation est autorisée. Il reste responsable de l’intégration et de la cohérence finale.
Le responsable caméra produit pour CHACUNE des douze pages : intention, échelle de plan, position/cible, projection/FOV ou échelle orthographique, limites de déplacement, cadrage desktop ET mobile, zone du texte, mouvements d’entrée/sortie et continuité des axes. Il fournit un animatic et des captures. Ne pas laisser les angles de caméra être un effet secondaire de la géométrie.
Si un sous-agent caméra intervient, lui remettre le texte, la shotlist, les références, le plan du jardin et les contraintes des couches 2D. Il livre des presets versionnés compatibles avec la vraie version du moteur, pas seulement des recommandations en prose.

## Déroulement autonome
1. Reconnaissance : instructions, branches, dépendances, moteur et versions, système de pages, navigation mobile en vigueur, sources de Mila, assets et missions précédentes. Documenter les différences avec ce brief sans écraser de travaux.
2. Préproduction : direction artistique synthétique, plan au sol du jardin, asset breakdown, choix 2D/3D, shotlist finale et budgets initiaux. Prévoir un cheminement logique maison de Mila → arbre → portail → maison de Man Ninon.
3. Layout/blocking : douze plans simplifiés et animatic sans son ; tester le portrait dès cette étape.
4. Vertical slice : finaliser la page 3 (Mila reçoit une calebasse), avec maison moderne visible, plusieurs calebasses dans les branches, couches peintes et matières harmonisées. Contrôler aussi une variante sombre page 9 et un cadrage large page 11. Comparer Blender et navigateur.
5. Production complète : fabriquer les assets réutilisables, préparer UV/textures/rig/clips nécessaires et intégrer les douze pages. Le jalon de la scène représentative ne doit pas devenir un arrêt à un POC. Corriger puis poursuivre la mission.
6. QA, revue indépendante, corrections et PR prête à examiner avec preview. Pas de fusion main ni de publication sans GO.

## Exigences de réalisation
Utiliser les spécifications techniques jointes comme contrat de résultat, à adapter aux versions installées. Aucune mise à niveau massive ou nouvelle bibliothèque générale pour cette mission.
Combiner décors peints multiplans, géométrie de contact et éléments 3D animés. Assurer parallaxe, occultations et ombres de contact. Ne pas projeter les planches entières comme fonds avec Mila déjà dessinée dedans.
Enregistrer les sources .blend, scripts bpy reproductibles, textures maîtresses, exports web et licences. Construire tôt un export glTF/GLB réellement testé ; les shaders, contraintes et effets de compositing Blender ne sont pas automatiquement portables.
La navigation doit respecter le système mobile horizontal s’il est présent/validé dans le projet. Ne pas modifier globalement l’accueil ou les autres contes dans cette mission. Pas d’avancement automatique imposé.
Chaque page restaure un état déterministe ; gérer les retours arrière, changements rapides, ouverture directe supportée, fermeture et réouverture. Conserver texte HTML accessible et préférence de réduction des mouvements.

## Achèvement et preuves
Appliquer `specs/06_QA_LIVRAISON.md`. Livrer les douze pages, les sources, la documentation de reconstruction, les captures desktop/mobile, les preuves d’animation, les mesures et le rapport de revue sur le SHA final.
Énoncer clairement les limites artistiques ou matérielles restantes. Un test automatisé vert ne prouve pas la qualité de l’aquarelle, des mains ou des caméras. Ne pas déclarer un essai sur téléphone réel si seule une émulation a été faite.
Avancer sans solliciter le propriétaire pour les choix courants. Demander uniquement une décision structurante non couverte, un accès indispensable ou une modification du périmètre. Ne pas prétendre disposer d’un outil de génération d’images, de Blender ou d’un modèle particulier sans l’avoir vérifié.
