# Development

## Prerequisites

| Tool       | Version                      |
| ---------- | ---------------------------- |
| Node.js    | ≥ 22.12 (Vite 8 requirement) |
| pnpm       | ≥ 10                         |
| pre-commit | any recent                   |

## Setup

```bash
pnpm install
pre-commit install
```

## Running locally

```bash
pnpm dev        # http://localhost:5173, HMR
pnpm build      # tsc -b && vite build → dist/
pnpm preview    # serve dist/
```

The original mockup can still be opened directly: `xdg-open design/mockup-v13-standalone.html`
(it needs network access — its runtime pulls React and Babel from unpkg).

## Code quality

```bash
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm format:check   # prettier
pre-commit run -a   # everything, as in the git hook
```

## Testing

```bash
pnpm test           # vitest run
pnpm test:watch
```

Tests are co-located (`*.test.ts`). `src/books/books.test.ts` and `src/books/v13-conversion.test.ts`
guard the book manifests and the tale content; `src/isolation.test.ts` guards the universe import rules.

## Conventions

- Conventional Commits, GitHub Flow (`feat/…`, `fix/…` branches + PR to `main`).
- Tale text is authored content: keep it byte-identical when moving it around.

## Language notes

A book may ship `src/books/<id>/langue/fr.md`, shown in the "Lang kréyòl" panel (burger, top right):

```markdown
---
lang: fr
title: Lang kréyòl
draft: true
---

## « té ka » : ce qui durait {#te-ka}

Short takeaway, visible to everyone.

> Bonmaten, larivyè-la **té ka** chanté. {ye-krik}
> Le matin, la rivière chantait.

### Pou alé pli lwen

Optional detail, collapsed.
```

An example is two `>` lines: the Kréyòl sentence ending with the `{page-id}` it comes from, then its
translation. `pnpm test` fails if the sentence is not found verbatim on that page of `story/gcf.md`.
Remove `draft: true` only after a Creole speaker has reviewed the notes.

## Troubleshooting

| Symptom                                | Cause / fix                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| "Pyébwa-la pa ka limé…" / black canvas | WebGL context lost or disabled — reload; check `chrome://gpu`                 |
| `typescript-eslint` peer warning       | TypeScript bumped to 7.x — stay on `~6.0` until typescript-eslint supports it |
| Build warns chunk > 500 kB             | Three.js; expected until code-splitting per tale world                        |
