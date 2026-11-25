# Mission — Kréyòl texts without "draft" markers

- Mission id: `contes-creole/2026-11-25-kreyol-sans-brouillon`
- Worktree: `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole-worktrees/kreyol-sans-brouillon`, branch `chore/kreyol-sans-brouillon` from `origin/main` `2c31af2` (PR #54 merged).
- Pilot: pilotage. Executor: one Claude Code session in this worktree. Owner: Xavier.

## Owner decision (quoted, 2026-11-25)

« enlève toutes les notions broyon sur les textes créole du projet je corrigerais au fil de l'eau » — the owner takes responsibility for the Kréyòl and will correct it over time. This supersedes the project rule "keep `draft: true` until a Creole speaker has reviewed" (CLAUDE.md, `doc/development.md`, `docs/kreyol/AGENT_RULES.md`, `docs/kreyol/README.md`). It closes D-GCF of the calebassier mission.

## Expected result

No reader-visible "draft / bwouyon / à valider" marker on any Kréyòl text of the site, in every book (Ti Kannot, Mila underwater, Mila calebassier, and any other), and the project's rules no longer require one.

Known spots (verify, find any other):

- `src/books/mila-calebassier/story/gcf.md`: `draft: true` and the 12 page labels `<!-- label: Bwouyon — à valider -->` (replace each label with what that page's label should be by the project's convention, e.g. as the French story or the other tales do; if labels are optional, remove them).
- `docs/explanations/ti-kannot/langue/fr.md`: `draft: true`.
- Language panel (`src/app/language-panel/language-panel.ts`): the « bwouyon — à valider » badge shows only when `draft` is true. Keep the mechanism (it is generic and hidden when false) unless it is dead code after the change; say what you chose.
- Tests asserting the draft state (`src/books/books.test.ts:149-153`, others): update them to assert the new state (no draft, no draft label), not delete coverage.
- Rules/docs: CLAUDE.md, `doc/development.md`, `docs/kreyol/AGENT_RULES.md`, `docs/kreyol/README.md`: state the owner decision (published without draft marker, owner corrects over time); keep the other Kréyòl rules (sources, no "fix" without source). Historical reports (`docs/kreyol/correction-report.md`, `docs/kreyol/2026-10-04-review-*.md`, `docs/missions/**`) stay as history: do not rewrite them.

## Limits

- Do not change any Kréyòl wording itself (text, glossary, variants), the French, or anything else.
- Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, exact counts. A quick headless check (functional only) that the language panel shows no draft badge for each book in Kréyòl; stop what you start; never use port 4180.
- Commit (Conventional Commits), push (remote must use `github-xgueret`), open a PR (not draft) to `main`. Do not merge.
- Model economy: mechanical checks may go to a cheaper subagent; list delegations.

## Report

`report.md` (English): Verdict, `Version:` <commit SHA>, files changed, every marker removed (path:line before), tests, PR link. End your turn with: report ready, Version = <sha>

## Pilot decisions

- No Codex review: text/flag removal with tests; the pilot checks the diff and CI. Merge after the pilot's diff check and green CI, under the owner's instruction above (the owner wants the markers gone from the site).
