# contes-creole — Pyébwa a Sav

Interactive 3D Guadeloupean Creole tales (Kréyòl / French / bilingual), built with Three.js.

**Project type**: node-frontend — Vite 8 + TypeScript 6 + Three.js r186, vanilla (no UI framework).

## Commands

```bash
pnpm install
pnpm dev            # dev server
pnpm build          # tsc -b && vite build
pnpm typecheck
pnpm test           # vitest run
pnpm lint           # eslint (flat config)
pnpm format         # prettier --write
```

## Structure

```
design/                        # reference only — never edited, excluded from lint/format
  mockup-v13-standalone.html   # original Claude Design export (self-unpacking bundle)
  v13/                         # extracted sources: template.html, scene13.js, kont-data.js, konteur.png
docs/superpowers/              # spec + plan for the universes-per-book architecture
src/
  main.ts                      # boot: wires the tree universe into the app shell
  app/                         # shell shared by every universe
    app.ts                     # state machine tree | dive | book | rise, transitions, global keys
    contract.ts                # TreeUniverse, BookManifest, BookWorld, Story types + defineBook()
    registry.ts                # discovers books/*/book.ts, sorts by `order`, loads stories lazily
    story/parse.ts             # Markdown story parser (no dependency)
    reading-ui/                # text card, language switch, dots, arrows, back button, bubble
    transition.ts, backdrop.ts, bubble.ts, fallback.ts, languages.ts, paging.ts, notice.ts
  shared/                      # optional toolbox: random.ts (createRng), math.ts, three/ helpers
  tree/                        # tree universe: index.ts (mountTree), scene/, overlay/, assets/konteur.png
  books/
    ti-kannot/                 # book.ts, cover.ts, staging.ts, theme.css, story/{gcf,fr}.md, world/
    zanba/, konpe-lapen/       # manifest only (book.ts), ready: false
public/                        # static assets
doc/                           # architecture.md, development.md
```

## Code style

- English identifiers, comments and commits (Conventional Commits). Tale **content** stays in
  Kréyòl / French — never "fix" Creole spelling without asking.
- Strict TypeScript; no `any`. Docstrings on functions, no obvious inline comments.
- Universes: `src/tree/` and each `src/books/<id>/` are isolated (ESLint `no-restricted-imports`).
  They may import only their own files, `@shared/*` and `@app/contract`. Add a book = add a folder
  with `book.ts` (+ `story/gcf.md`, `cover.ts`, `staging.ts`, `world/` when ready).
- Tale text lives in `src/books/<id>/story/<lang>.md` (gcf required, fr, en). Format: spec §4 in
  `docs/superpowers/specs/2026-09-29-universes-per-book-design.md`.
- Each universe owns its own seeded RNG (`createRng`). The tree scene is built in the v13 random
  order (`createLandscape` → `createLightTree` → `createSky`, one `createRng(11)`) — reordering
  changes the layout.
- Each world's mount disposes whatever it built if it throws.
- Package manager: pnpm only.

## Gotchas

- TypeScript is pinned to `~6.0`: typescript-eslint 8.x does not support TS 7 yet.
- `design/v13/scene13.js` imports `'__THREE__'` — a placeholder the mockup runtime replaced at
  load time. Port it to `import * as THREE from "three"`.

## Hosting

GitHub only — `TiPunchLabs/contes-creole` (private). Terraform lives in
`~/Workspace/02-infrastructure/contes-creole/`.
