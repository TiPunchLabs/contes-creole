# 🌴 Kréyòl — référentiel linguistique du projet

> **Langue** : créole guadeloupéen, code `gcf` (Glottolog `guad1242`). Locale : Guadeloupe.
> **Statut** : brouillon — les points marqués **À VALIDER** attendent un locuteur / réviseur créolophone.
> **Objectif** : un kréyòl cohérent, documenté, traçable et révisable, sans mélange avec d'autres créoles.

---

## 📂 Contenu

| Fichier                                                          | Rôle                                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [AGENT_RULES.md](AGENT_RULES.md)                                 | Règles à respecter par tout agent (ou contributeur) qui écrit ou modifie du kréyòl |
| [orthography.md](orthography.md)                                 | Conventions de graphie (GEREC, pratique guadeloupéenne)                            |
| [grammar-notes.md](grammar-notes.md)                             | Points de grammaire employés, formes retenues et formes exclues                    |
| [project-glossary.md](project-glossary.md)                       | Référentiel lexical du projet                                                      |
| [variants.md](variants.md)                                       | Variantes acceptées, exclues, et cas à valider                                     |
| [sources.md](sources.md)                                         | Sources, hiérarchie de confiance A–E, état de consultation                         |
| [correction-report.md](correction-report.md)                     | Audit complet du 2026-10-04 et corrections appliquées                              |
| [2026-10-04-review-ti-kannot.md](2026-10-04-review-ti-kannot.md) | Première revue du conte (intégrée par la PR #5)                                    |

---

## 🗺️ Où se trouve le kréyòl

| Contenu                                         | Fichier                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Conte Ti Kannot                                 | `src/books/ti-kannot/story/gcf.md`                                                     |
| Notes « Lang kréyòl » (exemples cités du conte) | `src/books/ti-kannot/langue/fr.md`                                                     |
| Cartes des livres                               | `src/books/*/book.ts`                                                                  |
| Écran de l'arbre                                | `src/tree/overlay/overlay.ts`, `src/tree/index.ts`                                     |
| Interface                                       | `src/app/` (`app.ts`, `fallback.ts`, `languages.ts`, `reading-ui/`, `language-panel/`) |
| Page HTML                                       | `index.html`                                                                           |

`design/` est une maquette gelée : on n'y touche pas.

---

## ✅ Procédure de validation

1. Une correction proposée est classée (catégorie, source A–E, confiance) dans [correction-report.md](correction-report.md).
2. Seules les corrections à **confiance haute** sont appliquées ; les autres vont dans [variants.md](variants.md) § 3.
3. Un changement du texte du conte s'ajoute à `CORRECTIONS` dans `src/books/v13-conversion.test.ts`, et l'exemple correspondant de `langue/fr.md` est mis à jour (le test exige une citation mot pour mot).
4. Après relecture par un locuteur, on tranche les cas de [variants.md](variants.md) § 3, on met à jour le glossaire, puis on retire `draft: true` de `langue/fr.md`.
