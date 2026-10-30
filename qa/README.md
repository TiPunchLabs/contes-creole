# QA kit — "Veillée claire" redesign

Manual GPU checks for the redesign missions (decision T1, `docs/redesign/decisions.md`). They drive
the built site in Chromium through `@playwright/test`'s library API: no test runner, never in CI
(CI has no GPU, and SwiftShader is excluded).

Run output goes to `qa/out/` (git-ignored) unless `OUT=` points elsewhere. Keep mission evidence in
`~/.local/share/contes-creole-qa/<mission>/`, not in the repo.

## Setup on a new machine

```bash
pnpm install
pnpm exec playwright install chromium   # browser matching the pinned @playwright/test
```

`@playwright/test` is pinned to an exact version so the browser revision stays fixed. Every script
launches with Vulkan flags; `m1.mjs` asserts an NVIDIA renderer and aborts otherwise.

## Serve the build

```bash
pnpm build && pnpm exec vite preview --port 4199 --strictPort   # stop it when done
```

`SITE=` overrides the default `http://localhost:4199/`.

## Tools

| Script         | What it does                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `m1.mjs`       | Regression harness: journeys J1–J4 at 1440x900 and 390x844, reduced motion + lite, fps. On the M4 build: 30 PASS, 1 BASELINE, 1 INFO.                                                                |
| `focus.mjs`    | `focusIndicator(page, locator)`: visible focus measured in pixels around the control, focused vs unfocused. `node qa/focus.mjs` runs its self-test (2 positive, 3 negative cases, exit 1 on a miss). |
| `contrast.mjs` | WCAG ratios of the palette pairs (oklch to sRGB). Exit 1 if a pair is below its minimum. Update the pair list when a mission adds one.                                                               |
| `boards.mjs`   | Captures the 16 screens of phase 3 boards 11 and 12 from Claude Design preview URLs (`B11=`, `B12=`).                                                                                                |
| `compare.mjs`  | Side-by-side sheets, board left, build right: `node qa/compare.mjs <out-dir> D1=<capture.png> M2=<capture.png>`.                                                                                     |

```bash
OUT=~/.local/share/contes-creole-qa/<mission>/m1 node qa/m1.mjs
node qa/focus.mjs
```

## Negative controls

A new check must be shown to fail. `QA_INJECT_CSS` injects a style into the page under test (never
into the app):

```bash
QA_INJECT_CSS='.tree-overlay :focus-visible { box-shadow: none !important; }' node qa/m1.mjs
# expected: only j4.tab-reaches-shelf-with-focus-ring fails
```

`focusIndicator` only works on a static background (the shelf). Over the animated 3D scene, fireflies
can add noise to the measured band.

## Board references (`boards/ref/`)

The 16 PNGs and `manifest.json` were captured on 2026-10-29 from Claude Design project
43434ae5-34d9-42b9-8092-ebf912d69c03 ("11 AC Planches desktop", "12 AC Planches mobile"). They are
committed because the Claude Design MCP stops on 2026-12-14, and the missions after M5 (fiche,
reading frame, edge screens) compare against them. The preview URLs carry a token: pass them through
the environment only, never write them to a file. Refresh the references only on purpose, with
`OUT=qa/boards/ref`.
