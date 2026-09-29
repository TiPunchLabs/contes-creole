# Pyébwa a Sav — Kont Gwadloup

Interactive 3D Guadeloupean Creole tales. Climb the _Pyébwa a Sav_ (the tree of tales), pick a
book-card from its branches and dive into the tale's world, page by page, in Kréyòl, French or
bilingual mode.

First tale: **Ti Kannot é Gwo Rako** — a little bird, a greedy crab and a river running dry.

## Prerequisites

- Node.js ≥ 22.12
- pnpm ≥ 10
- A WebGL-capable browser

## Setup

```bash
pnpm install
pre-commit install
```

## Usage

```bash
pnpm dev          # dev server on http://localhost:5173
pnpm build        # type-check + production build into dist/
pnpm preview      # serve the production build
pnpm test         # vitest
pnpm lint         # eslint
pnpm format       # prettier
```

## Project status

The reference design is the Claude Design mockup `design/mockup-v13-standalone.html`, with its
extracted sources in `design/v13/`. The port to Vite + TypeScript + Three.js is in progress — see
`doc/architecture.md`.

## License

MIT — see [LICENSE](LICENSE).
