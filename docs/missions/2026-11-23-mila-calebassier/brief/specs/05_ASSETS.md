# Assets : fournis, réutilisés et à produire

## Fichiers effectivement fournis
| Fichier | Usage | Limites |
| --- | --- | --- |
| references/00_storyboard_calebassier.png | progression des douze scènes | variantes personnage, poses et détails non canoniques |
| references/01_jardins_crepuscule.png | palette, grain et lumière douce | pas une texture détourée |
| references/02_nuit_calebasses.png | valeurs nocturnes et réveil lumineux | ne pas copier les gestes divergents du texte |
| references/03_jardin_profondeur.png | composition multiplans et architecture | images d’intention, pas scènes Blender |

## Inventaire de production
`data/assets.csv` liste chaque asset à réutiliser ou fabriquer. Les modèles, rigs, clips et couches RGBA ne sont pas encore produits dans ce dossier de préparation.
Première tâche de l’exécuteur : compléter un registre avec chemin source, auteur/origine, licence, date, format, dimensions, poids, rôle et statut (à faire / en cours / validé dans moteur). Aucune ligne ne doit rester implicitement assimilée à un fichier existant.

## Protection de Mila
Rechercher l’implémentation et ses dépendances réelles. Noter les fichiers et le commit de référence, capturer face/profil/3-quarts et comparer après intégration. Les planches montrent une interprétation illustrative qui n’autorise pas à redessiner le personnage.

## Références et recherche
Chercher des références actuelles en Guadeloupe et des vues botaniques. Images de recherche = observation ; ne pas les intégrer comme textures sans droit de réutilisation.
Pour les fichiers réellement incorporés : provenance, licence et attribution documentées. Ne pas utiliser de modèle externe lourd uniquement parce qu’il est disponible. Préférer quelques ressources cohérentes et réutilisables.
Si un générateur d’images est disponible et autorisé, utiliser les briefs joints. S’il ne l’est pas, produire des textures peintes/bakées avec les outils réellement disponibles ou signaler la ressource manquante ; ne pas livrer un faux fichier vide comme asset final.

## Convention indicative
Sources : `art/mila-calebassier/` avec `blend/`, `textures/master/`, `scripts/`, `configs/`.
Runtime : dossier d’assets adapté au dépôt avec GLB, textures optimisées et données caméra.
Nommer par fonction et version ; distinguer `ref_`, `src_` et `rt_` si compatible avec le projet. Ne pas publier les sources Blender lourdes dans le bundle web.
