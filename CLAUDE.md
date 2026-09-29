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
src/
  main.ts                      # entry (temporary bootstrap until the v13 scene is ported)
  content/                     # typed tale data: types.ts, tales.ts, ti-kannot.ts (+ tests)
public/                        # static assets (konteur.png)
doc/                           # architecture.md, development.md
```

## Code style

- English identifiers, comments and commits (Conventional Commits). Tale **content** stays in
  Kréyòl / French — never "fix" Creole spelling without asking.
- Strict TypeScript; no `any`. Docstrings on functions, no obvious inline comments.
- The scene must stay framework-agnostic: `createScene(canvas, data)` returning
  `{ frame, pick, resetWorld, dispose }`; the UI layer only drives it.
- One world module per tale; tale data (text + `env` per page) lives in `src/content/`.
- Package manager: pnpm only.

## Gotchas

- TypeScript is pinned to `~6.0`: typescript-eslint 8.x does not support TS 7 yet.
- `design/v13/scene13.js` imports `'__THREE__'` — a placeholder the mockup runtime replaced at
  load time. Port it to `import * as THREE from "three"`.
- `kr.g` (French gloss) exists on every page but the mockup never displays it.

## Hosting

GitHub only — `TiPunchLabs/contes-creole` (private). Terraform lives in
`~/Workspace/02-infrastructure/contes-creole/`.
