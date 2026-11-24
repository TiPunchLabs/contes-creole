# Mila et le calebassier magique — dossier de production
Version du 23 novembre 2026. Mission complète : conte web animé de douze pages en 2,5D aquarelle, fabriqué avec Claude Code et Blender, intégré dans Three.js.

## Démarrage
1. Extraire ce dossier dans un répertoire de ressources accessible au pilote et à l’exécuteur.
2. Donner au pilote le contenu de `PROMPT_PILOTE.md` et le chemin absolu du dossier extrait.
3. Le pilote lit toutes les spécifications et les quatre images de `references/` avant de déléguer.
4. Conserver ce dossier comme brief de mission ; versionner les documents et sources produits dans le dépôt selon ses conventions.

## Ordre des références
Instructions actuelles du propriétaire > texte et contraintes de ce dossier > storyboard narratif > planches d’ambiance > improvisation de l’exécuteur.
Les maisons en bois de versions antérieures, les calebasses sur le tronc, les variantes de visage/vêtements dans les images et les poses hors récit ne sont pas des prescriptions.

## Contenu
- `PROMPT_PILOTE.md` : mission à copier au pilote.
- `specs/01_CONTE_FR.md` : texte complet adapté au calebassier.
- `specs/02_DIRECTION_ARTISTIQUE.md` : style et continuité visuelle.
- `specs/03_CAMERA_LAYOUT.md` et `data/shotlist.csv` : découpage des douze scènes.
- `specs/04_BLENDER_25D_THREEJS.md` : pipeline technique et animation.
- `specs/05_ASSETS.md` et `data/assets.csv` : ressources fournies et ressources à fabriquer.
- `specs/06_QA_LIVRAISON.md` : critères, preuves et livrables.
- `specs/07_PROMPTS_ASSETS_2D.md` : briefs pour fabriquer les couches peintes.
- `specs/08_SOURCES.md` : documentation officielle et pistes artistiques.
- `data/story.fr.json` : texte français structuré ; contenu, pas API imposée.
- `references/` : storyboard calebassier et trois planches aquarelle.
- `MANIFEST_SHA256.txt` : inventaire vérifiable.

## Statut des assets
Les quatre PNG sont de véritables références visuelles incluses. Ils ne sont PAS des textures de production détourées, des modèles GLB ou un rig prêt à importer. Le dossier décrit précisément les assets à extraire du projet, à peindre ou à fabriquer. Aucun personnage 3D n’est fourni : réutiliser Mila depuis le dépôt réel. La réalisation, l’export et les performances restent à vérifier par l’équipe de production.

La combinaison des trois planches est une direction de travail issue de la conversation, à éprouver par une scène représentative. Aucune nouvelle validation humaine n’est nécessaire pour chaque choix courant. Fusion main et publication nécessitent le GO du propriétaire.
