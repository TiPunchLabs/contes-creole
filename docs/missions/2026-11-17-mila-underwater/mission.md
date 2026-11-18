# Mission — 2026-11-17-mila-underwater

## Objective

Owner brief, 2026-11-17 (pasted to pilotage, English; binding points below): enrich the underwater world of Mila's tale "Le secret du coquillage rose" inside its **existing Three.js implementation**, by studying selectively the visual concepts and techniques of https://github.com/Noniv/abyssal-garden. Result: a coherent, poetic, living Caribbean underwater storybook atmosphere — clear turquoise water, soft depth, warm filtered light, restrained pink accents tied to the shell — with Mila, the shell and the narrative action dominant. Focused improvement of Mila's underwater environment only; no general redesign of Contes Créoles. Deliver implementation, independent review and a reviewable PR with its Netlify deploy preview; no merge, no production deploy.

## Roles

| Role     | Who                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Pilot    | Claude Code `pilotage` (agent-workflow)                                                                                         |
| Executor | separate Claude Code session `exec-mila`, started with `--model fable` (`executor_args` of project `contes-creole`) — Fable 5.2 |
| Reviewer | Codex CLI `review` (fallback `review-claude` only per pilot CLAUDE.md §4b)                                                      |
| Arbiter  | Xavier: artistic acceptance, merge, production                                                                                  |

## Initial state (verified by pilotage, 2026-11-17)

- Repo `/home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole`, `main` = `origin/main` = `d60c1a6` (merge of PR #48), clean, single worktree. Branch `feat/mila-underwater` created by pilotage from `d60c1a6` in the main checkout (same convention as the previous mission). No dev server listening at framing time.
- Stack: Vite 8 + TypeScript 6 + Three.js `^0.186.1` (r186), vanilla. Mila world: `src/books/mila/world/` (`scene.ts` 4618 lines, `index.ts`, `noise.ts`, `audio.ts`, `mila.css`, tests). Story: `src/books/mila/story/{gcf,fr}.md` (12 pages).
- Already present in `scene.ts` (to read and build on, not to duplicate): `addCaustics()` (onBeforeCompile on lit materials, line ~736), `FogExp2` lerped NIGHT_FOG→SEA_FOG under water (~490, ~4119), underwater camera (~3367), waterline gap (~3522, ~4048), adaptive quality (drops Kuwahara pass, then pixel ratio/shadows; ~3963), composer + bloom + paint pass, `renderer.setAnimationLoop`, reduced motion read in `index.ts:132`.
- PRs on this repo receive a Netlify deploy preview (checks "Pages changed / Redirect rules / Header rules — contes-creoles" on PR #48). CI: `.github/workflows/ci.yml`. Remote `git@github-xgueret:TiPunchLabs/contes-creole.git`.
- Previous Mila work: commits `50e21d1`, `2b4f874`, `8ca3ea3`, `854a5bc`… and `docs/redesign/` (decisions, status). Previous mission `docs/missions/2026-11-15-home-visual-polish/` is a reference for evidence format.

## Authorizations and limits

- Work on `feat/mila-underwater` (base `d60c1a6`), atomic Conventional Commits. Scratch worktrees allowed for baseline captures (record their paths; remove at mission end only with owner approval of the deletion).
- Authorized at the end, after the final review verdict: push `feat/mila-underwater` to `origin` (check `git remote -v` uses alias `github-xgueret`, `ssh -T git@github-xgueret` → `Hi xgueret!`), open a PR to `main`, let Netlify build its deploy preview and record the preview URL. **Not authorized**: merge, production deploy, force-push to `main`, deleting branches.
- Scope: Mila's underwater environment (pages and transitions actually under water). Do not modify the tree, other tales, bilingual content/story text, audio or navigation, except a strictly necessary integration fix (justify it). Do not invent plot events, alter the text or impose a "restoration of the sea" sequence.
- Keep Three.js r186 and the existing renderer, composer and animation loop. No engine abstraction, generic effects framework, second engine, WebGPU migration, Three.js upgrade, second animation loop, or expensive full-screen effect without measured benefit. Small scoped shaders (onBeforeCompile / ShaderMaterial) allowed when they solve a specific visible need.
- Upstream code: clone `https://github.com/Noniv/abyssal-garden` into a scratch directory outside the repo (e.g. `~/.local/share/contes-creole-qa/mila-underwater/upstream/`), read only — never run its install/build/scripts. Record the commit SHA examined. Copied/adapted fragments keep the MIT copyright + license notice (in the file header or a `THIRD_PARTY_NOTICES`-style file next to the code) and an origin comment (repo, path, commit). No transplant of the upstream renderer, navigation, world generator or full shader system.
- Dev servers on dedicated ports (e.g. `pnpm dev --port 5182 --strictPort`), never 5173 (owner); stop them at the end.
- Heavy media (screenshots, videos, traces) in `~/.local/share/contes-creole-qa/mila-underwater/`; mission folder keeps `AUDIT.md`, `report.md`, `evidence/` (text results + manifest: path, sha256, capture conditions).
- **Executor model (mandatory, owner):** the executor session runs on **Fable 5.2** (`claude-fable-5-2`, launched with `--model fable`). If the session is not on Fable 5.2, stop and report to pilotage before any implementation. No silent substitution. Model economy (pilot CLAUDE.md §3): the executor may delegate mechanical/verification tasks (captures, measurement runs, log parsing, manifests, report assembly) to subagents on a cheaper model; art-direction, shader and product-code decisions stay on Fable 5.2. `report.md` lists each delegation (task, subagent model) and confirms the main session's model.
- Iteration cap: 3 Codex reviews (2 correction cycles). Escalate to pilotage (not Xavier) only genuine blockers or decisions outside this brief, with evidence; continue independent work.

## Work brief for the executor (binding)

### 1. Baseline (current code, not historical reports)

Identify: Three.js version, renderer, composer passes, materials, animation loop and cleanup/dispose path; the pages and transitions that actually happen under water (read `story/fr.md` and the camera/page table in `scene.ts`); existing lighting, fog, caustics, vegetation, particles, quality levels and reduced-motion behaviour; narrative, camera framing and Mila's choreography on those pages; available design references (`docs/redesign/`, `design/`, prototype notes).
Capture each underwater page before changes at 1440×900 and 390×844 CSS px (+ one intermediate, e.g. 1024×768), at reproducible moments (fixed page, settle time, seed/time control if possible), plus short recordings of motion. Record capture protocol (browser, GPU acceleration, DPR, viewport, cache) so captures are reproducible.
Performance baseline under documented conditions: load (cold/warm stated), frame times (median FPS and p95 frame time over ≥ 20 s after warm-up on a representative underwater page and on a transition), `renderer.info` (calls, triangles, textures, geometries, programs), quality level reached by the adaptive system.

### 2. Abyssal Garden study (guide, not a research project)

Read `source/src/shaders.js`, `source/src/world.js`, `source/src/quality.js` and relevant parts of `source/src/main.js` at a recorded commit. In `AUDIT.md`: what the source actually does (cite file:line) vs your own interpretation, then a short mapping table **upstream idea → benefit for Mila → simplest Three.js approach in this code** for depth/colour, filtered light, caustics, vegetation motion, composition, particles, quality scaling; mark each retained / adapted / rejected with a one-line reason.

### 3. Art direction (priorities in order)

A. **Depth and colour** — clear foreground / midground / background; distant objects lose contrast and merge into turquoise water; nearby characters and reading areas stay clear.
B. **Filtered light** — gentle light from above, slow restrained caustics on appropriate surfaces (sand, rocks, coral, not on UI or characters' faces unless it reads naturally), coherent light direction; no flat overlays, harsh beams, flicker or excess bloom.
C. **Living vegetation** — rooted, flexible motion of suitable existing plants via a shared current with per-plant phase/amplitude/flexibility variation; bases anchored, no rigid whole-object oscillation; Caribbean-inspired seagrass composition with existing plants, no giant kelp forest.
D. **Water presence** — sparse suspended particles, optional subtle background life; no constant bubble streams, visual noise or new animals competing with characters.
E. **Natural composition** — fix repetitive placement / visibly assembled rocks and plants where it strengthens depth and framing.
Prioritize A–C; D–E only with visible benefit. Keep Mila, the shell and the narrative action dominant; keep the tale's illustration style and page composition; character paths and animation directions unchanged.

### 4. Execution

Establish the treatment on **one representative underwater page first** (internal checkpoint recorded in `AUDIT.md` with before/after, not an owner approval), then apply it consistently to all relevant underwater pages and transitions. Loop per change: hypothesis → change → capture/measure → compare → keep or revert. Use the design skills available in the session to assess composition, colour, movement and readability (not shader-only work). Reuse resources; dispose every mission-owned geometry/material/texture/render target in the existing cleanup path. Control transparency overdraw, particle counts, pixel ratio and geometry. Integrate effects into the existing adaptive quality and reduced-motion behaviour (low quality keeps the essential art direction; reduced motion stills or strongly calms decorative motion). Add tests only for meaningful new logic or regressions; no snapshot tests encoding implementation details.

### 5. Verification

Before/after with matched camera positions, viewports and equivalent animation moments; short recordings (before/after) of vegetation, caustics, particles and transitions. Pages checked in sequence, revisited (back and forth), across transitions into and out of the water, with resize, language switch (gcf/fr), return to the tree, and repeated open/close of the tale (≥ 5 cycles) watching `renderer.info.memory` and JS heap for leaks. Zero new console errors. Performance after = same protocol as baseline; targets 60 fps desktop and 30 fps mobile **on hardware actually tested**; a desktop mobile viewport is a layout check only — state explicitly that real-phone GPU testing is unavailable unless a device is named. If the baseline misses a target, report baseline and delta and remove or simplify any effect causing a material regression (> 10 % median FPS or new p95 hitches). Run `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`.

## Acceptance criteria (each line in `report.md`: VERIFIED / NOT_VERIFIED / NOT_REACHED, evidence, SHA)

| ID   | Criterion                                                                                                                                                                                                        | Verification                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| AC0  | Executor session runs on Fable 5.2                                                                                                                                                                               | pilotage: launch argv `--model fable`, session header, transcript `model` = `claude-fable-5-2`; recorded in report |
| AC1  | Upstream studied at a recorded commit; mapping idea → benefit → approach; retained/adapted/rejected; MIT notices for reused code                                                                                 | `AUDIT.md` section with file:line citations; notice + origin comments in code                                      |
| AC2  | Visibly improved depth/colour separation (fg/mg/bg, distance fade) with clear characters and reading areas                                                                                                       | matched before/after captures desktop + mobile, greyscale/contrast check of text areas                             |
| AC3  | Gentle filtered light and restrained caustics, coherent direction, no flicker/harsh beams/excess bloom                                                                                                           | captures + recordings ×1 and ×0.25                                                                                 |
| AC4  | Rooted, flexible, varied vegetation motion with anchored bases                                                                                                                                                   | recordings, note on shared current + per-plant variation                                                           |
| AC5  | Coherent result across all relevant underwater pages and transitions; Mila, shell and action dominant; illustration style kept                                                                                   | per-page before/after board, transition recordings                                                                 |
| AC6  | Preserved navigation, language switch, return to tree, character paths and animation directions; story text unchanged                                                                                            | journey script + `git diff --stat` on story/audio/tree/other books = empty                                         |
| AC7  | No new clipping, transparency artifacts, console errors or resource leaks (revisits, resize, ≥ 5 open/close cycles)                                                                                              | logs, `renderer.info` before/after cycles, heap samples                                                            |
| AC8  | Performance: before/after under same documented conditions; targets 60 fps desktop / 30 fps mobile on tested hardware, or baseline + delta and simplification of regressing effects; real-device status explicit | perf table + protocol                                                                                              |
| AC9  | Integrated with adaptive quality and reduced motion; low quality keeps the art direction                                                                                                                         | captures at forced low quality and with `reducedMotion: reduce`                                                    |
| AC10 | Build, typecheck, tests, lint pass                                                                                                                                                                               | command outputs and exit codes                                                                                     |
| AC11 | Independent review on the final SHA with code and running-result inspection (incl. animation over time), no open blocker                                                                                         | Codex `review-N.md` naming the final SHA                                                                           |
| AC12 | Branch pushed, PR opened to `main`, Netlify deploy preview URL recorded; no merge                                                                                                                                | PR URL, preview URL, `gh pr view` state OPEN                                                                       |

Closing rule: `PASS` only if AC0–AC11 are verified (AC8 may pass with an explicit real-device limitation); otherwise `PARTIAL`/`BLOCKED` with the exact missing items. Always separate technical compliance, observed visual improvement, and Xavier's artistic acceptance.

## Deliverables

1. Branch `feat/mila-underwater`, atomic commits, base `d60c1a6`, final HEAD SHA.
2. `AUDIT.md`: baseline, upstream study + mapping (with upstream commit), checkpoint page result, kept/reverted changes, autonomous decisions, limits.
3. Before/after captures and recordings (media outside the repo, manifest in `evidence/`).
4. Performance table and reproducible protocol (real hardware vs emulation).
5. `report.md` (`Verdict:`, `Version:` = HEAD SHA): upstream ideas retained/adapted/rejected, changed files and choices, AC checklist, performance, model evidence and delegations, limitations.
6. PR + deploy preview link (after final review).

## Steps

- S1 executor (Fable 5.2): baseline + upstream study + checkpoint page treatment; `AUDIT.md`; commit. Continue to S2 without waiting (internal checkpoint).
- S2 executor (Fable 5.2): treatment across all underwater pages, verification, perf, `report.md`; commit.
- S3 Codex review `review-1.md` on the exact SHA (diff `d60c1a6..<sha>`, code + running result with Playwright, animation over time); corrections by the same executor session; max 3 reviews.
- S4 executor: push branch, open PR, record deploy preview URL in `report.md` (after final review verdict without blocker).
- S5 pilotage: delivery summary for Xavier (artistic acceptance, merge decision).

## State

- Phase: S1 to dispatch.
- Review cycle: 0 of 3.

## Log

- 2026-11-17 (owner brief): mission framed from the owner's pasted brief "MISSION — MILA: ENRICH THE UNDERWATER WORLD USING THREE.JS"; it authorizes implementation, independent review, push + PR + deploy preview; not merge or production.
