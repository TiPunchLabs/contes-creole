# 🤖 Agent rules — Guadeloupean Creole (gcf)

```text
Language: gcf
Locale: Guadeloupe (BCP 47: gcf-GP)
Preferred orthography: GEREC / conventions guadeloupéennes documentées (GEREC 1 style: è/ò and y always written)
Source hierarchy: A > B > C > D > E — D/E never override A/B
```

Read before generating or modifying any Kréyòl in this project (tale text, language notes, UI strings, HTML).

---

## 1. Never

- **Never mix creoles.** A form attested in Martinican, Haitian, Guyanese or Dominican Creole is not a valid gcf correction. Excluded forms are listed in [variants.md](variants.md) § 2 (`N-yo`, `-tala`, `-a/-an/-lan`, `pyès`, `toutotan`, indefinite `an`).
- **Never "fix" Kréyòl without a source.** If sources A/B cannot settle it, do not change the text: add it to [variants.md](variants.md) § 3 as `À VALIDER PAR UN LOCUTEUR / RÉVISEUR CRÉOLOPHONE` with the options found.
- **Never francize** or translate literally from French; never change meaning, tone, register, cultural references or narrative choices.
- **Never treat a regional variant as an error** (Grande-Terre, Basse-Terre, Marie-Galante, Les Saintes, La Désirade). Keep the original unless the project has a dominant convention, and say so.
- **Never edit `design/`** (frozen mockup).
- **Never mix French and Kréyòl in one UI string.** Use one language, or the explicit bilingual format `Kréyòl · Français` (e.g. `Talè · bientôt`).

## 2. Always

- Check [project-glossary.md](project-glossary.md) first; add any new recurring word with its source (level A–E).
- Follow [orthography.md](orthography.md): no silent letter, `r` → `w` next to a rounded vowel, `è/ò` accented in closed syllables, `y` for [j], hyphen for `-la`, `-lasa`, short pronouns and possessives (`a-y`, `plen-y`).
- Follow [grammar-notes.md](grammar-notes.md): `-la` invariable, plural `sé N-la`, demonstrative `-lasa`, `on`, `té / ka / ké / té ka / pé ké`, `pa`, `pon … pa`, `Sé X ki`, `Ès`.
- Record every change in [correction-report.md](correction-report.md): original, correction, category, explanation, source (level), confidence.
- Apply only **high-confidence** corrections; report the rest.

## 3. Project mechanics

- A change to the tale (`src/books/<id>/story/gcf.md`) must be added to `CORRECTIONS` in `src/books/v13-conversion.test.ts`.
- Language-note examples (`src/books/<id>/langue/fr.md`) are quoted verbatim from `gcf.md`: change both together (`books.test.ts` enforces it).
- Keep `draft: true` in `langue/fr.md` until a Creole speaker has reviewed the notes.
- Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` after any change.

## 4. Glossary

The project glossary lives in [project-glossary.md](project-glossary.md) and is the single source of truth for recurring vocabulary. Highlights:

| Français             | Créole retenu | Note                                |
| -------------------- | ------------- | ----------------------------------- |
| eau                  | dlo           | `dlo-la`, `dlo-lasa`, `dlo an mwen` |
| rivière              | larivyè       | article agglutiné                   |
| robinet              | wobinè        | r → w                               |
| est-ce que           | Ès            | accent                              |
| les (pluriel défini) | sé N-la       | jamais `-yo`                        |
| ce, cette            | N-lasa        | jamais `-tala`                      |
| ne… pas (futur)      | pé ké         |                                     |
| personne             | pon moun … pa | jamais `pyès`                       |
| conte / livre        | kont / liv    |                                     |
| Guadeloupe           | Gwadloup      |                                     |
