# Contes Creoles - Phase 4.1 report: technical implementation plan for the "Veillee claire" redesign

## Executive summary

- Objective: turn the accepted (with reservations) phase 3 direction "Veillee claire" (A + C) into an incremental, verifiable implementation plan. No application code change.
- Verdict: PASS (planning level). The plan covers the whole redesign: tokens, fonts, 2D chrome, 3D lighting, Konteur environment, book fiches, lang/a11y, bubble contract, reading screen, edge screens, copy and cleanup. It has 16 missions, a dependency matrix, a test strategy, blocking decisions and a proposed first mission.
- Decisions A1 to A8 are treated as open. Each mission that depends on them is marked BLOCKED until the owner rules. Five new technical decisions (T1 to T5) are added.
- Proposed first mission: M1, baseline capture and QA harness. It changes no application code and depends on none of A1 to A8. It needs only T1 (where the QA script lives).
- Not done by design: no code change, no commit, no merge, no deploy.

## Initial state and scope

- Repo: /home/xgueret/Workspace/01-projets/tipunchlabs/contes-creole, branch main, commit 3964732.
- Working tree before and after the mission: `M src/books/ti-kannot/langue/fr.md` (pre-existing, untouched), `?? digest_contes_creoles_refonte_design.md` (pre-existing).
- Inputs: phase 3 report /tmp/contes-creole-phase3-ac-direction.md; Claude Design project 43434ae5-34d9-42b9-8092-ebf912d69c03 (boards 10 to 13); the source tree.
- Inspected (read-only): index.html, package.json, vite.config.ts, netlify.toml, .github/workflows/ci.yml, doc/development.md, docs/kreyol/AGENT_RULES.md, src/main.ts, src/style.css, src/app/{app,bubble,contract}.ts, src/app/reading-ui/reading-ui.{ts,css}, src/app/language-panel/*.css, src/tree/index.ts, src/tree/fonts.ts, src/tree/lite.ts, src/tree/overlay/overlay.{ts,css}, src/tree/scene/{sky,konteur,landscape,cards}.ts, src/books/ti-kannot/theme.css, src/books/ti-kannot/world/index.ts, src/isolation.test.ts, test file inventory.
- Excluded: any edit, dependency install, asset retouching, Kreyol authoring, contribution feature for class tales.

## Technical analysis by area

### 1. Graphic identity and typography

- Colors are hard-coded per file. There are no global tokens.
  - src/style.css holds the shell: background #050c12, bubble, notice, flash, fallback, vignette and grain. It has a tree-screen override block, `.app:not([data-book])`, added in v14.
  - src/tree/overlay/overlay.css defines `--tree-*` variables on `.tree-overlay`: cream, ink, terracotta, green and shadows.
  - src/app/reading-ui/reading-ui.css defines `--reading-*` variables (accent, text, title, card-bg, card-border, font-display, font-body). This is already a themable surface.
  - index.html carries its own inline loader CSS (#0d2430 / #050c12, Quicksand, Cormorant Garamond), which runs before any bundled CSS.
- Fonts come from 5 @fontsource packages: andika, baloo-2, caveat, cormorant-garamond and quicksand.
  - src/main.ts loads Cormorant 500i/600i and Quicksand 400/500/600.
  - src/tree/fonts.ts loads Baloo 2 700/800 and Andika 400/700.
  - src/books/ti-kannot/world/index.ts:1 loads Caveat 600.
- Fonts used inside canvas: src/tree/scene/cards.ts lines 46, 48 and 61 (`'Baloo 2', 'Andika'`). Cards are redrawn after `document.fonts.ready` (cards.ts:83).
- src/app/loader.ts dismisses the loader after `document.fonts.ready` plus texture load plus 3 frames (src/main.ts). Adding font weight delays first paint.

### 2. Lighting and rendering of the 3D tree

- Renderer: src/shared/three/stage.ts uses ACESFilmic with a default exposure of 1.15. The tree passes 1.05 (src/tree/index.ts, `createStage(... exposure: 1.05 ...)`).
- Fog: `FogExp2("#f6cfae", 0.0105)` in src/tree/index.ts.
- Sky dome: src/tree/scene/sky.ts sets the horizon, mid and top colors as constants inside `DOME_FRAGMENT`. The file also holds the moon, stars (uOpacity 0.55), mists and 340 fireflies (glowPoints).
- Lights in src/tree/scene/landscape.ts:22-31: hemisphere, canopy point light (animated at line 96), base point light, rim and key directional lights.
- The canopy and hollow live in src/tree/scene/tree.ts. Flora is in flora.ts and ground in ground.ts.
- Hard constraint: the scene is built in v13 random order with one `createRng(11)`: `createLandscape`, then `createLightTree`, then `createSky`. A re-grade may change colors, intensities and uniforms. It must not change the number of rng() calls, their order, or any count passed to `count()`, or the layout moves (project CLAUDE.md).

### 3. Konteur environment

- src/tree/scene/konteur.ts builds the following:
  - the photo billboard as a MeshStandardMaterial with emissive #6a5040 at 0.18 (A3);
  - a contact shadow (softSprite #5a3a24);
  - the lantern (glass, cap, point light, glow sprite);
  - a fill light, a seat and the hover lighting, which lerps the lamp from 3 to 22.
- Picking uses only `konteur.plane` (src/tree/index.ts, `pickable`), so new halo objects that stay out of `pickable` cannot steal clicks.
- `KONTEUR_OBSTACLES` (critter avoidance) and `place(aspect)` (wide/narrow positions) must stay unchanged.
- Asset: src/tree/assets/konteur.png has a white opaque floor residue (A2). Fixing it is an asset change, not a code change.

### 4. Book fiches (near-card label)

- src/tree/overlay/overlay.ts holds the label, title, enter button and locked text. `labelTop()` keeps the label above the shelf and is covered by overlay.test.ts.
- In src/tree/index.ts, the frame picks the `best` near card (`near > 0.35`, `onScreen` 12 to 88 % of the width) and calls `overlay.update(t, label, near)`. The Enter key opens `near`.
- src/tree/overlay/shelf.ts holds the shelf. Its tests (shelf.test.ts) pin the strings "Tale · bientot" and "touche encore pour ouvrir".
- The canvas card frame and title are drawn in src/tree/scene/cards.ts. The locked cover is drawn in locked-cover.ts. Book covers come from `manifest.cover` (src/books/ti-kannot/cover.ts).

### 5. Reading screen

- src/app/reading-ui/reading-ui.ts builds the back button, language group, card (label, num, title, body, gloss), dots, the prev/next arrows (aria-label "←"/"→") and the hint "Defilez pour continuer". reading-ui.test.ts:62 pins the hint text.
- src/app/app.ts handles paging input (wheel, touch, keys), Escape, language switching and the language panel attach/detach.
- src/books/ti-kannot/theme.css overrides every `--reading-*` variable under `[data-book="ti-kannot"]`, plus the card structure (parchment, burnt edges, drop cap, side gradient on `.app-book::after`). The scope of A4 is this file.
- src/app/language-panel/language-panel.css reads the `--reading-*` variables, so it follows any reading-frame change automatically.

### 6. Shared bubble contract

- `Bubble.show(text: string, anchor)` in src/app/contract.ts:74 is implemented in src/app/bubble.ts with `textContent`, styled by `.app-bubble` in style.css.
- It has two consumers:
  - The tree's `SAY` strings in src/tree/index.ts combine Kreyol and French in one string separated by "\n". This contradicts docs/kreyol/AGENT_RULES.md section 1, "Never mix French and Kreyol in one UI string", unless the bilingual format is explicit.
  - Ti Kannot: src/books/ti-kannot/world/index.ts:108 shows single-language lines. Its test (world/index.test.ts) mocks `Bubble`.

### 7. Accessibility and language handling

- index.html sets `<html lang="gcf">`, but most UI text is French. No element carries its own `lang`. The reading body has no `lang` matching the story language, and the gloss has no `lang="fr"`.
- The page buttons are named "←"/"→". The reading card is `aria-live="polite"`. The loader is `role="status"`.
- Focus ring: overlay.css uses `outline 3px var(--tree-terracotta)`.
- Reduced motion: `calm` in src/tree/index.ts reduces parallax. The loader stops breathing. The Ti Kannot theme has its own reduced-motion rules.

### 8. Desktop and mobile behavior

- Lite mode (src/tree/lite.ts): at most 4 cores or a coarse pointer, or forced with `?lite=1|0`. It scales counts by 0.45 and caps the pixel ratio at 1.
- Mobile is handled by:
  - `fitFov` and `konteur.place(aspect)`;
  - tap-to-show bubbles held for 4.5 s, and touch climb with a 2.2 factor;
  - the shelf's double tap;
  - media queries in overlay.css, reading-ui.css and theme.css.

### Regression risks identified

- R1, layout drift: rng order or `count()` changes during the 3D re-grade. Mitigation: no new rng calls. New objects (halo, uniforms) consume no randomness. Add a guard test on tree tip positions before M5.
- R2, ACES tone mapping and fog: they shift the target colors, so oklch values from the boards will not match on screen 1:1. Mitigation: iterate on real GPU captures, not on hex equality.
- R3, canvas fonts: replacing Baloo 2 changes how card titles are measured and wrapped. Mitigation: check every card title at 512x720 and in the locked cover.
- R4, load time: the loader waits for `fonts.ready`. More weights mean a later reveal. Mitigation: load only the weights actually used and compare the time to dismiss the loader.
- R5, theme leakage: shell CSS and book theme.css share `--reading-*`. A new default can show through in Ti Kannot wherever the theme does not override it. Mitigation: capture Ti Kannot reading after every shell change.
- R6, interaction 10: replacing the label with the fiche can break the Enter key, locked state, shelf near highlight or the mobile shelf overlap. `labelTop` must have an equivalent.
- R7, bubble contract: changing `Bubble` touches a type shared with every book. Mitigation: make the change additive (union type) so Ti Kannot compiles unchanged.
- R8, Kreyol integrity: splitting `SAY` into tagged lines must reuse the text byte for byte. Mitigation: a test asserts that the joined lines equal the current string.
- R9, string-pinned tests: reading-ui.test.ts:62 and shelf.test.ts:46,47,68 fail on copy changes. They must be updated only under A6/A7.
- R10, public exposure: Netlify auto-deploys main to production (https://contes-creoles.netlify.app/, recorded in memory on 2026-10-04). Merging missions one by one shows a half-redesigned site. See T5.

## Theme architecture proposal

The proposal keeps the existing mechanisms: CSS custom properties, the `[data-book]` scope and the `--reading-*` surface. It adds no theme engine, no runtime theme object and no new dependency.

### Layer 1: global tokens (site design system)

- New file `src/shared/theme/tokens.css`, imported once in src/main.ts. Its rules sit on `:root`.
- It contains:
  - raw palette tokens (ink, ink-2, paper, cream, lampe, braise, feuille, lilac, apricot, rose);
  - font families (`--font-display`, `--font-read`, `--font-mono`);
  - radii, shadows, focus ring (`--focus-ring`, the double ring lampe + ink) and motion durations.
- Why src/shared: universes may import `@shared/*`, but they never import the file. They read tokens through `var()` cascade, so the import isolation rules (src/isolation.test.ts) do not change.
- index.html loader exception: its inline CSS runs before the bundle. It keeps literal values, documented as a mirror of the tokens.

### Layer 2: reusable components (shared chrome)

- These are the shell components: bubble, notice, flash, fallback and vignette/grain (src/style.css), the reading frame (reading-ui.css) and the language panel (language-panel.css).
- Each component keeps its own semantic alias layer. Defaults point to global tokens, for example `--reading-card-bg: var(--paper)` and `--reading-font-body: var(--font-read)`.
- The tree overlay keeps `--tree-*`, remapped to global tokens. The tree stays a universe with its own aliases.
- The `--reading-*` list becomes the documented themable surface for books, documented in doc/architecture.md.

### Layer 3: book identity

- A book stays responsible for its world (3D, sound, characters). Its `src/books/<id>/theme.css`, scoped to `[data-book="<id>"]` and loaded with its world chunk, keeps working as it does today.
- Recommended rule: a book overrides `--reading-*` aliases and may add scoped decoration (paper texture, drop cap). How far structural overrides of the shared frame may go is A4's call, and Ti Kannot is the test case.
- Book fonts stay loaded by the book. Caveat is imported in world/index.ts, so it never weighs on the tree.

### 3D palette

- WebGL colors cannot read CSS variables cheaply. Recommendation: one `src/tree/scene/palette.ts` constant module (sky stops, fog, light colors, Konteur halo/shadow) with comments that point to the matching CSS tokens. Books keep their own 3D palettes.

## Implementation plan (ordered missions)

Conventions for every mission:

- One branch and one PR.
- Gates: `pnpm format:check && pnpm lint --max-warnings=0 && pnpm typecheck && pnpm test && pnpm build`, then GPU visual QA.
- No commit without explicit request. No `--no-verify`.
- Rollback = `git revert` of the merge commit. Production can also be restored instantly with Netlify "Publish deploy" on the previous deploy.
- Type: V = visual only, F = functional (DOM, behavior or contract), Q = QA tooling.

### M1. Baseline capture and QA harness (Q). Proposed first mission.

- Objective: freeze the current behavior and look before anything changes.
- Scope:
  - A Playwright script running on GPU-only Chromium (`--enable-gpu --ignore-gpu-blocklist --use-angle=vulkan --enable-features=Vulkan`, renderer asserted to be "ANGLE (NVIDIA, Vulkan ... RTX 4060)").
  - It drives the 19 interactions and the reading-screen interactions.
  - It captures named states at 1440x900 and 390x844: t=0, mid-climb, near Ti Kannot, near a locked book, shelf focus, Konteur bubble, critter bubble, reading gcf/bi/fr, language panel, `?lite=1`, reduced motion, fallback (`--disable-webgl`, never SwiftShader).
  - It collects console errors, FPS samples over 5 s (full and lite) and the WebGL context count after 5 enter/leave cycles.
- Files: no application file. The script goes in the scratchpad or in a committed `qa/` folder (T1).
- Dependencies: T1 only. It needs no A1 to A8 decision.
- Risks: 3D animation (fireflies, flicker, critters) makes pixel diffs noisy, so screenshots are compared by eye. Only DOM assertions are binary.
- Tests: the harness run twice gives the same DOM assertions and comparable captures.
- Acceptance:
  - each of the 19 interactions has at least one automated or scripted manual check, with a pass/fail result on the current main;
  - the baseline set is stored with a manifest;
  - the GPU renderer is logged.
- DoD: report with captures; no source change; working tree identical apart from `qa/` if T1 says so.
- Rollback: delete the script (trash) or drop the branch.

### M2. Global tokens, zero visual change (F, refactor)

- Objective: introduce layer 1 and wire the alias layers to it with the current values.
- Scope: create src/shared/theme/tokens.css and import it in src/main.ts. Remap the `--tree-*` and `--reading-*` defaults and the literal colors in style.css to tokens that hold today's values.
- Files: src/shared/theme/tokens.css (new), src/main.ts, src/style.css, src/tree/overlay/overlay.css, src/app/reading-ui/reading-ui.css, src/app/language-panel/language-panel.css.
- Dependencies: M1.
- Risks: specificity or cascade changes (tokens on `:root` against `.tree-overlay` scope); Ti Kannot overrides must still win.
- Tests: the existing suite; the M1 harness with every DOM-only state compared to baseline, with 0 visible difference.
- Acceptance: captures identical to baseline by eye on all states; `grep` shows no remaining hex in the remapped files except documented exceptions (index.html loader, 3D).
- DoD: gates green; doc/architecture.md gains a short "Theme layers" section.
- Rollback: revert the PR. There is no data or asset impact.

### M3. Typography swap (V). BLOCKED by A8; Caveat part depends on A4.

- Objective: move to Newsreader, Andika and IBM Plex Mono through tokens.
- Scope:
  - `pnpm add @fontsource/newsreader @fontsource/ibm-plex-mono` with the weights used;
  - point `--font-*` at the new families and replace the family names in canvas (cards.ts, locked-cover.ts if relevant) and in the fallback;
  - the old packages stay installed until M16.
- Files: package.json, pnpm-lock.yaml, src/main.ts, src/tree/fonts.ts, src/shared/theme/tokens.css, src/tree/scene/cards.ts, src/style.css, index.html (loader fonts).
- Dependencies: M2, A8.
- Risks: R3, R4. Ti Kannot keeps Quicksand/Caveat through its own aliases until M13.
- Tests: suite; capture of every card texture; time to dismiss the loader before and after (M1 harness); built CSS/font size compared to `dist/` before.
- Acceptance:
  - no card title clipped at 512x720;
  - loader dismissal delay not more than 20 % above baseline (threshold to confirm with owner);
  - no FOUT on the canvas cards.
- DoD: gates green; captures attached.
- Rollback: revert; the lockfile returns with it.

### M4. "Veillee claire" palette on 2D chrome (V)

- Objective: apply paper, ink, lampe and braise to the tree HUD (brand, intro, climb rail, shelf), bubble, notice, focus ring (double ring lampe + ink) and the vignette/grain on the tree screen.
- Files: src/shared/theme/tokens.css (values), src/tree/overlay/overlay.css, src/style.css.
- Dependencies: M2. It does not need M3, but the order M3 then M4 avoids reviewing the same screens twice.
- Risks: lampe/cream contrast is 1.85, so lampe must never carry text. Readability of the HUD on a lighter sky (M5 changes the background).
- Tests: contrast script (oklch to sRGB to WCAG) over every text/background pair used; keyboard traversal with the focus ring visible on sky and paper; M1 harness.
- Acceptance: every text pair at least 4.5 (at least 3 for 24px and bigger); focus visible on every control; interactions 11, 12 and 19 pass.
- DoD: gates green; side-by-side captures against boards 11 and 12 (D1, D2, M1, M2).
- Rollback: revert.

### M5. Static 3D re-grade: sky, fog, lights, exposure (V)

- Objective: late-afternoon light (lilac, rose and apricot sky; lighter fog), with no time dependence.
- Scope:
  - sky.ts dome colors (moved to uniforms or constants from palette.ts);
  - fog color/density in src/tree/index.ts;
  - light colors and intensities in landscape.ts;
  - exposure in mountTree;
  - optional palette.ts.
- Before it: a guard test (vitest) that pins a sample of `createLightTree` tip positions and flora positions for `createRng(11)`.
- Files: src/tree/scene/sky.ts, src/tree/scene/landscape.ts, src/tree/index.ts, src/tree/scene/palette.ts (new), the new guard test.
- Dependencies: M1. Visual coherence is better after M4.
- Risks: R1, R2; card legibility under new light (interaction 9); hollow (5) and pool of light (7) losing their effect.
- Tests: guard test; GPU captures at t = 0, 0.5 and 1, full and lite; FPS sample not more than 10 % below baseline; no new console error.
- Acceptance:
  - layout identical (guard test plus captures);
  - interactions 4, 5, 6, 7, 8 and 9 still readable;
  - the owner validates the look on the deploy preview.
- DoD: gates green; captures compared to boards D1 and D2.
- Rollback: revert. The values are isolated constants.

### M6. "The climb brings the evening" (V, small F). BLOCKED by A1.

- Objective: sky stops and firefly opacity depend on t.
- Scope:
  - `sky.update(time, cameraPosition, t)` drives a uniform;
  - firefly density is done with opacity, not count (no rng change);
  - with reduced motion the evening value stays fixed.
- Files: src/tree/scene/sky.ts, src/tree/index.ts.
- Dependencies: M5, A1.
- Risks: R1 if done with counts; banding on mobile GPUs.
- Tests: unit test of the t to uniform mapping function; captures at 3 values of t; reduced-motion emulation.
- Acceptance: smooth variation from t=0 to t=1; fixed with reduced motion; guard test green.
- Rollback: revert, which keeps M5.

### M7. Konteur environment (V). A3 needed; the PNG part is BLOCKED by A2.

- Objective: integrate the photo through its surroundings only: a warm halo behind (softSprite), a lilac contact shadow and the existing lantern re-tuned. The photo and its billboard geometry stay unchanged.
- Scope M7a (code): konteur.ts new sprite(s) kept out of `pickable`; the emissive stays at 0.18 unless A3 decides otherwise.
- Scope M7b (asset, only with A2): clean the floor residue in src/tree/assets/konteur.png. The original stays in git history. Before/after alpha diff limited to the residue area, and the person's pixels unchanged (PIL difference bbox outside the figure).
- Files: src/tree/scene/konteur.ts; for M7b src/tree/assets/konteur.png.
- Dependencies: M5 (light context), A3, A2 (M7b).
- Risks: the halo washes out the photo; z-sorting of transparent sprites against the billboard; the bubble anchor stays `anchor()`.
- Tests: hover and tap the Konteur (bubble shows, lamp lerps); critters still avoid it (`KONTEUR_OBSTACLES`); captures at wide and narrow aspect.
- Acceptance: interaction 13 identical in behavior; the photo is not modified by code (no filter, no crop, no material map change); the owner validates.
- Rollback: revert; asset revert for M7b.

### M8. Fiche a filet replacing the near-card label (F). Needs T3 authorization; copy part BLOCKED by A6.

- Objective: show the near book in a fiche outside the tree, joined to the card by a leader line on desktop, and docked above the shelf on mobile.
- Scope:
  - a pure placement function (successor of `labelTop`) computes the fiche box and line endpoints from the card's x/y, the viewport, the shelf top and the narrow/wide mode;
  - the leader line is drawn in SVG or CSS inside the overlay;
  - the enter button "Antre adan kont-la", the locked text "Tale · bientot dans l'arbre" and the Enter key path stay unchanged;
  - no new string until A6 ("ou touche Entree" is held back).
- Files: src/tree/overlay/overlay.ts, overlay.css, overlay.test.ts; src/tree/index.ts only if the label payload needs more fields.
- Dependencies: M4; T3.
- Risks: R6; leader line jitter at 60 fps (needs rounding or smoothing); the fiche covering the Konteur or critters on narrow screens.
- Tests:
  - unit tests of placement (desktop left/right side, mobile docked, shelf clearance, edge clamping);
  - overlay.test updated for ready and locked states;
  - app.test enter flow;
  - harness: Enter key on near, click enter, locked state, shelf highlight sync, 390x844 and 1440x900, keyboard focus order.
- Acceptance:
  - near-book title fully visible in every captured near state, including those where the trunk hid the label before (live captures d5 and m2 from phase 2);
  - every behavior of interaction 10 kept;
  - interaction 11 unchanged.
- DoD: gates green; captures against boards D3, D4, M3 and M4.
- Rollback: revert, which restores the label.

### M9. Card frame and locked cover restyle (V)

- Objective: align the canvas card frame and title band, and the locked cover, with paper and ink.
- Files: src/tree/scene/cards.ts, src/tree/scene/locked-cover.ts. Book covers (`manifest.cover`) stay untouched because they belong to the books.
- Dependencies: M3 (font), M4 (tokens mirrored in palette.ts), M5.
- Risks: R3; texture redraw on `fonts.ready`.
- Tests: capture of every card; hover and near highlight (interaction 9).
- Acceptance: titles legible under the new light; locked books are distinguishable from ready ones without relying on color alone.
- Rollback: revert.

### M10. Language attributes and accessible names (F). Root lang BLOCKED by A5; labels BLOCKED by A6.

- M10a, not blocked: per-passage `lang`.
  - Tree overlay: brand title and intro title as gcf; intro text and hint as fr; enter button as gcf; locked text split into gcf/fr spans.
  - Shelf labels.
  - Reading body: `lang` = current story language; gloss `lang="fr"`.
  - Language panel: `.lang-gcf` with `lang="gcf"`, translation with `lang="fr"`.
  - Notice with `lang="gcf"`; loader line with `lang="gcf"`.
- M10b, A5: `<html lang>` default value.
- M10c, A6: page buttons renamed "Page precedente" / "Page suivante".
- Files: src/tree/overlay/overlay.ts, shelf.ts, src/app/reading-ui/reading-ui.ts, src/app/language-panel/language-panel.ts, src/app/notice.ts, index.html, and the matching tests.
- Dependencies: M8 for the fiche markup (or done before M8 and carried over).
- Risks: no visual change expected. Kreyol text must stay byte-identical, only wrapped.
- Tests: unit assertions on `lang` attributes; accessibility tree dump in the harness; a screen-reader smoke check (Orca) by the owner as an option.
- Acceptance: every Kreyol passage is in an element with `lang="gcf"`; every French passage resolves to fr; no text change apart from A6.
- Rollback: revert.

### M11. Bilingual bubble, additive contract (F). Needs T4.

- Objective: let the bubble render tagged lines, Kreyol in roman first and French in italic second, each with its own `lang`.
- Scope:
  - `Bubble.show(text: string | BubbleLine[], anchor)` with `BubbleLine = { text: string; lang: Lang }` in src/app/contract.ts;
  - src/app/bubble.ts renders spans with `textContent`, never innerHTML;
  - the tree `SAY` strings become line arrays split at the existing "\n" with no character change;
  - Ti Kannot keeps calling with a string.
- Files: src/app/contract.ts, src/app/bubble.ts, new src/app/bubble.test.ts, src/tree/index.ts, src/style.css (bubble line styles).
- Dependencies: M4 (bubble style), M10a.
- Risks: R7, R8; bubble width and clamping change with two-line layouts (`EDGE` clamp).
- Tests:
  - bubble.test: string path and line path, lang attributes, hide/dispose;
  - a test that `SAY` lines joined with "\n" equal the previous literals;
  - ti-kannot world/index.test unchanged and green;
  - harness: Konteur, Lapen and Zanba bubbles on desktop and mobile, plus a Ti Kannot character bubble.
- Acceptance: interactions 13 and 14 unchanged in behavior; no Kreyol change; Ti Kannot compiles and runs without edits.
- Rollback: revert. The contract change is additive, so no book is broken by the revert.

### M12. Shared reading frame (V, small F). Labels part BLOCKED by A6; hint BLOCKED by A7.

- Objective: shell defaults for books without their own theme:
  - paper card and ink text;
  - segmented Kreyol / Bileng / Francais control (same buttons, same `aria-pressed`);
  - progress restyled (dots kept as interactive buttons, num kept);
  - page buttons restyled;
  - bilingual gloss in italic.
- Files: src/app/reading-ui/reading-ui.css, reading-ui.ts (markup classes only), src/app/language-panel/language-panel.css if needed.
- Dependencies: M2, M3, M4; the A4 ruling to decide how much shows in Ti Kannot.
- Risks: R5, since Ti Kannot inherits any default it does not override.
- Tests: reading-ui.test and app.test; harness on every reading interaction (switch language, wheel/swipe/arrows/keys paging, Escape, back, dots, page fade, gloss, panel, book sound button); captures of Ti Kannot before and after to confirm no leakage.
- Acceptance: all reading interactions pass; Ti Kannot captures unchanged apart from what A4 allows; text at 20px desktop and 18px mobile.
- Rollback: revert.

### M13. Ti Kannot alignment (V). BLOCKED by A4; font part tied to A8.

- Objective: apply the A4 decision inside src/books/ti-kannot/theme.css only.
  - If "align": reduce it to accent aliases and scoped texture.
  - If "keep its own frame": only harmonize what A4 lists.
- Files: src/books/ti-kannot/theme.css, possibly src/books/ti-kannot/world/index.ts (font import).
- Dependencies: M12, A4, A8.
- Risks: loss of the book's identity; regression of the reduced-motion rules in theme.css.
- Tests: harness on every Ti Kannot page in gcf, bi and fr at both viewports; language panel open; reduced motion.
- Acceptance: owner validation of the book identity; world untouched (no file under world/ changed except the font import).
- Rollback: revert.

### M14. Edge screens: loader, dive/rise flash, WebGL fallback (V)

- Objective: restyle the inline loader (index.html, literal values mirroring the tokens), `.app-flash` and `.app-fallback`. Behavior and timings stay the same, and the loader line "ka prezante kont gwadloup" is kept verbatim.
- Files: index.html, src/style.css.
- Dependencies: M3, M4.
- Risks: a flash with high contrast against the new lighter scene; the loader no longer matching the first frame.
- Tests: loader.test; harness (cold load, dive, rise, `--disable-webgl` fallback with 5 retries then fallback).
- Acceptance: interactions 1, 15 and 18 unchanged in behavior; no white or black flash mismatch at loader dismissal.
- Rollback: revert.

### M15. Approved copy (F, strings only). BLOCKED by A6 and A7.

- Objective: apply only the French strings the owner approves: "Monter dans l'arbre", "Voir les contes", "Page suivante", "ou touche Entree", the class-tales sentence if a teaser is approved, and hint wording per A7.
- Files: overlay.ts, reading-ui.ts and their tests (reading-ui.test.ts:62, shelf.test.ts strings if affected).
- Dependencies: M8, M10c, M12.
- Risks: R9; no Kreyol is added; class tales stay a non-interactive "en preparation" mention with no form or link.
- Tests: updated string tests; harness.
- Acceptance: only the approved strings changed (diff limited to string literals and tests).
- Rollback: revert.

### M16. Cleanup and final regression (Q, small F)

- Objective:
  - remove unused font packages with `pnpm remove`, but only after `grep` shows no remaining use (Baloo 2, Quicksand, Cormorant, and Caveat per A4/A8);
  - remove dead CSS;
  - update doc/architecture.md and doc/development.md (theme layers, QA harness);
  - run the full harness on the deploy preview.
- Files: package.json, pnpm-lock.yaml, CSS files, docs.
- Dependencies: every other mission.
- Acceptance: the full 19-interaction matrix passes on the deploy preview at both viewports, full and lite; bundle size reported; no console error.
- Rollback: revert.

## Dependency matrix

Columns:

- Mission.
- Depends on (missions).
- Blocked by owner decisions.
- Interactions touched (numbers from the 19-item matrix).
- Type.

| Mission            | Depends on    | Owner decisions | Interactions            | Type |
| ------------------ | ------------- | --------------- | ----------------------- | ---- |
| M1 baseline/QA     | none          | T1              | all (read-only)         | Q    |
| M2 tokens          | M1            | T5              | none (zero diff)        | F    |
| M3 fonts           | M2            | A8, A4 (Caveat) | 1, 9, 12                | V    |
| M4 2D palette      | M2            | none            | 11, 12, 16, 19          | V    |
| M5 3D static grade | M1            | none            | 4, 5, 6, 7, 8, 9        | V    |
| M6 t-evening       | M5            | A1              | 6, 7, 19                | V/F  |
| M7 Konteur env     | M5            | A3, A2 (asset)  | 13                      | V    |
| M8 fiche a filet   | M4            | T3, A6 (hint)   | 10, 11, 19              | F    |
| M9 card frame      | M3, M4, M5    | none            | 9                       | V    |
| M10 lang/a11y      | M8 (optional) | A5, A6          | 11, 12, 19 + reading    | F    |
| M11 bubble         | M4, M10a      | T4              | 13, 14                  | F    |
| M12 reading frame  | M2, M3, M4    | A4, A6, A7      | reading set             | V/F  |
| M13 Ti Kannot      | M12           | A4, A8          | reading set (Ti Kannot) | V    |
| M14 edge screens   | M3, M4        | none            | 1, 15, 18               | V    |
| M15 copy           | M8, M10, M12  | A6, A7          | 10, 12 + reading        | F    |
| M16 cleanup        | all           | A8              | all (final check)       | Q    |

Coverage by interaction:

- Kept untouched: 2 spiral climb, 3 parallax, 14 Lapen/Zanba behavior (bubble style only via M11), 17 lite mode.
- They are still checked in M1 and M16 and after every 3D mission.

Parallelizable after M2:

- the M3/M4/M14 track (2D);
- the M5/M6/M7 track (3D);
- M10a.

Merge order matters only where the dependencies above say so.

## Test and non-regression strategy

- Unit (vitest, happy-dom, CI):
  - keep all 30 existing test files green;
  - add tests for: the rng/layout guard (before M5), the t-evening mapping (M6), fiche placement (M8), `lang` attributes (M10), bubble lines and SAY byte identity (M11);
  - string tests change only under A6/A7.
- Integration (CI): src/app/app.test.ts already covers tree to book to tree, language switching and loading errors. Extend it for the bubble line path and reading-frame classes.
- Isolation: src/isolation.test.ts must stay green. Tokens are consumed through CSS cascade, not imports.
- Navigation and E2E (local GPU harness from M1, not in CI because CI has no GPU and SwiftShader is excluded):
  - the 19 interactions plus the reading set;
  - wheel, keys, touch emulation, shelf double tap, Enter, Escape, back;
  - 5 enter/leave cycles with no WebGL context leak;
  - `?lite=1`, `prefers-reduced-motion`, and the fallback via `--disable-webgl`.
- Desktop and mobile: 1440x900 and 390x844 on every mission, plus 768x1024 at M8 and M12. The owner checks on a real phone on the deploy preview (coarse pointer means lite mode, touch climb, mobile docking of the fiche).
- Accessibility:
  - contrast script on every pair;
  - keyboard order and visible focus;
  - an accessibility tree snapshot (Playwright `ariaSnapshot`) to check names and `lang`;
  - reduced-motion emulation;
  - optional axe-core run in the harness (T1 scope).
- 3D rendering:
  - assert the renderer string;
  - captures at fixed t;
  - FPS samples full and lite (not more than 10 % regression);
  - no console errors;
  - captures compared by eye to baseline and boards; no pixel gating for animated scenes.
- Real-site validation: production auto-deploys main (Netlify). Whether PR deploy previews are enabled is NOT_VERIFIED (T2). The recommended path:
  - each mission is validated on its preview URL with the harness pointed at it, plus the owner's devices, before merge;
  - if previews are off, use `pnpm build && pnpm preview` locally, plus a Netlify branch deploy.

## Blocking decisions

Owner art and content decisions from phase 3, still open:

- A1, t-dependent evening: blocks M6 only.
- A2, cleaning the Konteur PNG residue: blocks M7b only.
- A3, Konteur emissive at 0.18: needed for M7a. Recommendation from phase 3: keep.
- A4, Ti Kannot theme overrides or aligns to the shared frame: blocks M13 and sets how much of M12 shows in Ti Kannot. This is the main blocker of the reading part.
- A5, page default language: blocks M10b.
- A6, new French strings: blocks M8 (hint), M10c, M12 (labels) and M15.
- A7, tu/vous harmonization: blocks M12 (hint) and M15.
- A8, five fonts to three: blocks M3 and the font part of M13 and M16.

New technical decisions:

- T1, QA harness location.
  - Option a: scratchpad only (nothing committed, nothing reproducible by others).
  - Option b: committed `qa/` folder with `@playwright/test` as a devDependency, run manually and never in CI.
  - Recommendation: b, so every mission can rerun the same checks. It adds a dev dependency, which needs approval. Needed for M1.
- T2, Netlify deploy previews for PRs: confirm or enable them in the Netlify site settings (owner action). Needed for real-site validation; not blocking for code.
- T3, explicit authorization to replace the rendering of interaction 10 (label to fiche a filet, behavior kept). Phase 3 justified it but did not get it authorized as such. Blocks M8.
- T4, approval of the additive `Bubble` contract change in @app/contract (shared with books). Blocks M11.
- T5, branch strategy.
  - Option a: one PR per mission into main, so production shows intermediate states.
  - Option b: an integration branch `feat/veillee-claire` that takes the mission PRs and is merged to main once the redesign is coherent.
  - Recommendation: b, because main auto-deploys to the public site (R10). Needed before M2.

## Proposed first mission

M1, baseline capture and QA harness.

- Why first: every other mission's acceptance compares against this baseline. It touches no application code and needs none of A1 to A8.
- Prerequisite: T1 (scratchpad or committed `qa/`). With T1 = b, it adds `@playwright/test` with `pnpm add -D`, after the context7 doc check, and creates `qa/` plus a README line in doc/development.md.
- Output:
  - baseline captures (named states, two viewports, full/lite, reduced motion, fallback);
  - a pass/fail sheet for the 19 interactions and the reading set on main 3964732;
  - FPS and WebGL context figures;
  - a report in /tmp.
- Requires explicit approval to start. Safe: read-only on application code.

## Verification and evidence

- Coverage of all redesign areas (8 areas from the mission): VERIFIED by cross-check against the phase 3 feasibility table and the source files listed above.
- Mission sizing: VERIFIED by design. Each mission touches at most 6 source files, has its own gate and is revertable alone.
- File and line references: VERIFIED by reading the files at commit 3964732. Examples: contract.ts:74, ti-kannot/world/index.ts:108, reading-ui.test.ts:62, shelf.test.ts:46,47,68, cards.ts:46,48,61,83, landscape.ts:22-31.
- Netlify production auto-deploy from main: from project memory (verified on 2026-10-04 in an earlier session), not re-checked now, so NOT_VERIFIED for today.
- PR deploy previews: NOT_VERIFIED.
- Feasibility of the fiche, the re-grade and the bubble in the real WebGL scene: NOT_VERIFIED until M5, M8 and M11 run.

## Deviations, risks and limitations

- No deviation from the mission. No file of the repository was modified.
- Thresholds (loader +20 %, FPS -10 %) are proposals to confirm with the owner.
- Production state can only be judged on GPU captures and owner devices; CI cannot verify rendering.
- The text references Kreyol strings only as they exist in the code; no new Kreyol was written.

## Repository and infrastructure state

- Read-only mission. Branch main, commit 3964732, working tree unchanged: `M src/books/ti-kannot/langue/fr.md`, `?? digest_contes_creoles_refonte_design.md`.
- No commit, push, PR, merge or deploy. Claude Design project unchanged in this phase.

## Recommended next action

- The owner rules on T1 and T5, and ideally T3 and A1 to A8.
- Then, with explicit approval, run M1 (baseline and QA harness). It is safe because it is read-only on application code.
