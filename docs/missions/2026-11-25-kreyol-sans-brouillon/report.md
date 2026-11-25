# Report — Kréyòl texts without draft markers

Mission: contes-creole/2026-11-25-kreyol-sans-brouillon
Verdict: PASS
Version: 41683fe
Branch: chore/kreyol-sans-brouillon (from origin/main 2c31af2)
PR: PR_URL_PLACEHOLDER (open, not draft, not merged)

## Summary

The owner decision (2026-11-25) is applied. No reader-visible draft / bwouyon / à valider marker remains on any Kréyòl text. Kréyòl wording, French and everything else are untouched.

## Markers removed (path:line before)

- src/books/mila-calebassier/story/gcf.md:4 `draft: true` (front matter) removed.
- src/books/mila-calebassier/story/gcf.md:9,21,33,47,61,75,89,103,119,135,151,167 `<!-- label: Bwouyon — à valider -->` (12 page labels) replaced by `<!-- label: Mila é pyé kalbas majik-la -->`. Convention: story/fr.md uses the book title as label on every page, so gcf uses its own existing title (gcf.md line 3). No new Kréyòl wording.
- docs/explanations/ti-kannot/langue/fr.md:4 `draft: true` removed.

Other tales: Ti Kannot and Mila gcf.md had no draft marker (grep over the repo, excluding historical reports).

## Language panel decision

src/app/language-panel/language-panel.ts, language/parse.ts, contract.ts and CSS are unchanged. The badge mechanism is generic, hidden when `draft` is false, and `draft` defaults to false. It is now unused by any content but kept: removal would touch contract, parser, CSS and tests for no reader benefit, and it stays reusable if the owner wants to flag a text again. Dead-code removal is optional follow-up.

## Tests updated (coverage kept)

- src/books/books.test.ts (mila-calebassier): the "unvalidated draft" test became "carries no draft marker, in the file or on any page": gcf.md has no `draft:` line, no `bwouyon` / `à valider` text, 12 pages, every page label equals the gcf story title.
- src/books/books.test.ts (Ti Kannot archived notes): added `expect(notes.draft).toBe(false)`.
- src/app/language-panel/language-panel.test.ts and src/app/language/parse.test.ts unchanged: they use synthetic notes with draft true/false to test the generic mechanism.

## Rules and docs updated

- CLAUDE.md: tree comment and language-notes rule state the owner decision.
- doc/development.md: sample front matter without `draft`; paragraph replaced by the owner decision (front matter still accepts `draft: true`).
- docs/kreyol/AGENT_RULES.md § 3: "Keep draft: true" replaced by the owner decision; uncertain cases still go to variants.md § 3, never into visible text. Other rules (sources, no fix without source) kept.
- docs/kreyol/README.md: status line and validation step 4 reworded.
- docs/kreyol/variants.md row 18 and docs/kreyol/project-glossary.md row "brouillon": reworded (living docs). Prettier realigned the table columns of both files, so their diffs are larger than the content change.
- Not touched (history): docs/kreyol/correction-report.md, docs/kreyol/2026-10-04-review-*.md, docs/missions/**, docs/superpowers/**.
- Remaining mentions in docs/kreyol/orthography.md and grammar-notes.md ("Version 1.0 — brouillon, relecture créolophone en attente") are document metadata, not site text; left as is. Possible follow-up for the owner.

## Checks (exact)

- pnpm install --frozen-lockfile: needed, the worktree had no node_modules.
- pnpm format:check: first run failed on 3 files (project-glossary.md, variants.md table alignment, and this mission's mission.md); the two kreyol files were fixed with prettier. mission.md and report.md are formatted before commit.
- pnpm lint: exit 0.
- pnpm typecheck: exit 0.
- pnpm test: 58 test files passed, 471 tests passed.
- pnpm build: exit 0 (existing chunk-size warning only).
- Pre-commit hooks passed on the commit (no --no-verify).
- Headless check (functional only, system Chrome with GPU flags, vite preview on port 4291, stopped afterwards, port closed; script kept in scratchpad, not committed): for Ti Kannot, Mila (lambi) and Mila calebassier, opened the tale in Kréyòl. Result for each: `.lang-draft` badge present in DOM but not visible, no body text matching bwouyon / brouyon / à valider. Calebassier card shows the title "MILA É PYÉ KALBAS MAJIK-LA" as label.

## Delegations

None. All work and checks done in this session.

## State

Mutating: edits, one commit 41683fe, push, PR. Not merged. No deployment.
