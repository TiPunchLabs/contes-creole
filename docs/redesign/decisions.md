# "Veillée claire" redesign — decision register

Single source for the owner's art and architecture decisions on the redesign. Every mission brief
or plan copies the rulings it depends on from here, verbatim and with their IDs, and a ruling always
wins over a conflicting scope item: stop and report instead of implementing it.

Rules for this file:

- Quote the original wording. Do not paraphrase a ruling; add context in "Constraint" only.
- A decision with no recorded ruling stays `OPEN`, even if work went ahead in practice.
- Append a new ruling here before writing the next brief.

Sources referenced below:

- [phase3]: `docs/redesign/phase3-veillee-claire-direction.md` (copy of the phase 3 report, Claude
  Design project 43434ae5-34d9-42b9-8092-ebf912d69c03, boards 10 to 13).
- [plan]: `docs/redesign/phase4-1-implementation-plan.md` (phase 4.1 implementation plan).
- [S-eaa62a80]: Claude Code orchestrator session eaa62a80-fcc1-4cbf-ad9e-67b1dda65a48, 2026-10-29,
  owner answers to multiple-choice questions (option label quoted as selected).
- [M3.1], [H2.1], [M4.1], [M4.2]: owner mission prompts of 2026-10-29 (French, quoted verbatim).
- [M8]: owner mission prompt of 2026-10-30 ("Mission M8 : Fiches à filet", French, quoted verbatim).
- [M10b+c]: owner mission prompt of 2026-10-30 ("Mission M10b+c : Langue HTML, noms accessibles et
  cohérence linguistique", French, quoted verbatim).
- [M11]: owner mission prompt of 2026-10-30 ("Mission M11 : Bulles bilingues accessibles", French,
  quoted verbatim).
- Mission reports: `~/.local/share/contes-creole-qa/reports/` (durable copies of the `/tmp` reports).

## Direction inputs (before A1–A8)

| ID  | Status | Ruling (verbatim)                                                                                                                          | Source          |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| P3  | RULED  | "user decisions: A+C hybrid, keep Konteur photo unchanged, include reading screen, class tales stay "en preparation", no new Kreyol text." | [phase3] §Scope |

Constraint: the Konteur photo stays unchanged and no Kréyòl text is added by the redesign.

## Art and content decisions (A1–A8)

Original question wording is from [phase3] "Decisions required"; what each one blocks is from
[plan] "Blocking decisions".

| ID  | Question (verbatim, [phase3])                                                                                                                                                                      | Blocks ([plan])                         | Status                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- |
| A1  | "adopt "the climb brings the evening" (sky + firefly density depend on t)? Recommendation: yes. Not blocking."                                                                                     | M6                                      | OPEN                             |
| A2  | "clean the white floor residue under the Konteur stool in the PNG (detourage fix, touches the file)? No recommendation; needs owner consent."                                                      | M7b                                     | OPEN                             |
| A3  | "keep Konteur material emissive at 0.18? Recommendation: keep."                                                                                                                                    | M7a                                     | OPEN                             |
| A4  | "Ti Kannot theme (parchment, Caveat, teal) overrides the shared reading frame, or aligns to it (book keeps accent + world)? Boards show alignment. Blocks reading-frame implementation."           | M13; how much of M12 shows in Ti Kannot | OPEN (M3-scoped ruling A4-M3)    |
| A5  | "page default language: `lang="fr"` + `gcf` passages (recommended) or `gcf` + `fr` passages."                                                                                                      | M10b                                    | RULED 2026-10-30 (see A5)        |
| A6  | "approve new French strings: "Monter dans l'arbre", "Voir les contes", "Page suivante", "ou touche Entree", "Des contes imagines par des classes de primaire, relus avant d'entrer dans l'arbre."" | M8 (hint), M10c, M12 (labels), M15      | PARTIAL 2026-10-30 (see A6-M10c) |
| A7  | "harmonize "Defilez pour continuer" (vous) with tree "Fais defiler" (tu)?"                                                                                                                         | M12 (hint), M15                         | OPEN                             |
| A8  | "consolidate five font families to three (Newsreader, Andika, IBM Plex Mono); depends on A4 for Caveat."                                                                                           | M3; font part of M13 and M16            | RULED 2026-10-29 (see A8)        |

### Rulings

- **A8** — RULED 2026-10-29, [S-eaa62a80]. Selected: "Approve A8 as proposed (Recommended)", option
  text: "Newsreader / Andika / IBM Plex Mono through the --font-\* tokens, canvas cards and loader. Old
  packages stay installed until M16."
  - Implemented in M3: commit ebeefb4, PR #9, merged into `feat/veillee-claire` as b096200.
- **A4-M3** — RULED 2026-10-29 for M3 only, [S-eaa62a80]. Selected: "Keep Ti Kannot fonts
  (Recommended)", option text: "theme.css untouched; Quicksand and Caveat stay loaded for it. A4 stays
  open for M13."
  - Constraint: until A4 is ruled, `src/books/ti-kannot/theme.css` is not edited and Ti Kannot's reading
    screen keeps Caveat and Quicksand, page counter included.
- **A5** — RULED 2026-10-30, [M10b+c]: "Utiliser `lang="fr"` sur l'élément HTML racine." "Les
  passages créoles devront explicitement déclarer `lang="gcf"` lorsqu'ils n'héritent plus correctement
  de leur langue."
- **A6-M10c** — PARTIAL 2026-10-30, [M10b+c]: "Autoriser uniquement les formulations françaises
  suivantes : « Page précédente » « Page suivante »" "Les autres changements éditoriaux prévus dans A6
  restent non autorisés."
  - Constraint: "Monter dans l'arbre", "Voir les contes", "ou touche Entree" and the classes sentence
    stay OPEN; no new Kréyòl text.

## Technical decisions (T1–T5)

Original wording is from [plan] "Blocking decisions".

| ID  | Question (verbatim, [plan])                                                                                                                                                                          | Status                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | "QA harness location." Option a: "scratchpad only"; option b: "committed `qa/` folder with `@playwright/test` as a devDependency". Recommendation: b.                                                | RULED 2026-10-29, [M4.2]: "**Option B : kit QA versionné dans le dépôt.**" Implemented in `qa/` (see below).                                                         |
| T2  | "Netlify deploy previews for PRs: confirm or enable them in the Netlify site settings (owner action)."                                                                                               | OPEN. Observed: PRs #8 and #9 carry no Netlify check (M2.1, M3.1 reports); Netlify side not verified.                                                                |
| T3  | "explicit authorization to replace the rendering of interaction 10 (label to fiche a filet, behavior kept)."                                                                                         | RULED 2026-10-30, [M8]: "Cette mission autorise explicitement le remplacement de l'étiquette actuelle par ce nouveau dispositif (décision T3)."                      |
| T4  | "approval of the additive `Bubble` contract change in @app/contract (shared with books)."                                                                                                            | RULED 2026-10-30, [M11]: "L'évolution du contrat `Bubble` est autorisée dans les limites suivantes" (see T4 below).                                                  |
| T5  | "branch strategy." Option a: "one PR per mission into main"; option b: "an integration branch `feat/veillee-claire` that takes the mission PRs and is merged to main once the redesign is coherent." | APPLIED (option b), explicit ruling wording not found. Evidence: PR #8 and PR #9 target `feat/veillee-claire` and were merged by the owner; `main` stays at 3964732. |

## Mission rulings (M3 and after)

| ID       | Date       | Ruling (verbatim)                                                                                                                                                                                                                                                                                       | Source        | Constraint                                                                    |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| M3-LOAD  | 2026-10-29 | Selected "20% (Recommended)" for "loader dismissal delay ≤ 20% above the M1 baseline (threshold to confirm with owner)".                                                                                                                                                                                | [S-eaa62a80]  | Font changes may delay loader dismissal by at most +20 %.                     |
| M3-DEV   | 2026-10-29 | Selected "Restart Dev in auto mode (Recommended)" for the secondary Developer's permission mode.                                                                                                                                                                                                        | [S-eaa62a80]  | Applies to a secondary Claude Developer, if one is used.                      |
| M3-CODEX | 2026-10-29 | Selected "Trust and continue (Recommended)" for Codex's "Trust this folder?" on the repo.                                                                                                                                                                                                               | [S-eaa62a80]  | Repo is trusted in Codex config; other paths are not.                         |
| D-1      | 2026-10-29 | Orchestrator applied A4-M3 over M3 brief scope item 5 (counter in IBM Plex Mono); reported as information, not ruled separately.                                                                                                                                                                        | M3 POC report | Rulings beat brief scope items.                                               |
| D-2      | 2026-10-29 | "conserver IBM Plex Mono et son token. Son utilisation effective est reportée à M12."                                                                                                                                                                                                                   | [M3.1]        | `--font-mono` and the package stay; first consumer is M12.                    |
| D-3      | 2026-10-29 | "autorisation de créer le commit M3, de pousser la branche et d'ouvrir une PR vers `feat/veillee-claire`."                                                                                                                                                                                              | [M3.1]        | One-off authorization for M3; not valid for later missions.                   |
| H2-ARCH  | 2026-10-29 | "Claude Code principal : architecture, planification et implémentation. Codex CLI : review indépendante. Herdr TUI : coordination. Developer Claude Code secondaire : facultatif, uniquement si justifié."                                                                                              | [H2.1]        | No systematic secondary Developer; Codex reviews independently.               |
| H2-REG   | 2026-10-29 | "Créer un registre des décisions dans : `docs/redesign/decisions.md`" and "Conserver les preuves techniques volumineuses dans : `~/.local/share/contes-creole-qa/`".                                                                                                                                    | [H2.1]        | This file; evidence stays outside the repo.                                   |
| H-1      | 2026-10-29 | "Créer un commit contenant exclusivement les trois fichiers CSS M4." "Pousser `feat/veillee-claire-m4-palette`." "Ouvrir une PR vers `feat/veillee-claire`." "Ne pas effectuer de merge."                                                                                                               | [M4.1]        | One-off for M4. Done: commit 07a356d, PR #11; merged by the owner as d4d9a96. |
| H-2      | 2026-10-29 | "Supprimer le worktree temporaire utilisé pour la review M4, après vérification et conservation des preuves nécessaires." "Nettoyer uniquement les ressources temporaires créées par M4." "Préserver les autres worktrees, sessions Herdr et serveurs préexistants."                                    | [M4.1]        | Done in M4.1 (review copied out first; `trash` then `git worktree prune`).    |
| H-3      | 2026-10-29 | "Accepter provisoirement les écarts documentés entre M4 et les planches 11/12 : Curseur du rail de progression. Disques pleins des livres verrouillés." "Ne pas modifier leur apparence dans cette mission." "Ne pas considérer cette acceptation provisoire comme une décision artistique définitive." | [M4.1]        | Provisional, not an art ruling: both may be revisited (candidates M8/M12).    |

### T4 ruling — Bubble contract

- [M11]: "L'évolution du contrat `Bubble` est autorisée dans les limites suivantes :" "Elle doit
  répondre à un besoin concret identifié dans les appels existants." "Elle doit être minimale." "Elle
  doit préserver les appels existants avec une chaîne simple." "Elle ne doit pas imposer de migration
  aux contes qui n'utilisent pas de messages bilingues." "Elle ne doit pas introduire de moteur de
  traduction ou de système de dialogue générique."
- Constraint: `show` keeps accepting a plain string; the only new form is a list of `{ lang, text }`
  segments, used by the tree's bilingual lines.

### T1 ruling — QA kit in the repo

- [M4.2] asks for "une migration minimale du kit situé dans : `~/.local/share/contes-creole-qa/kit/` vers un répertoire versionné `qa/`" with "une dépendance Playwright explicite et compatible".
- Constraint: tools and the board references live in `qa/` (`qa/README.md`); run output goes to the git-ignored `qa/out/` or a mission folder. Execution reports and large captures stay in `~/.local/share/contes-creole-qa/` (H2-REG still applies). The harness runs on a local GPU only, never in CI.
