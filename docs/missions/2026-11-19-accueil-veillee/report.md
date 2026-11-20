# Report — accueil-veillee (S1–S5)

Verdict: PARTIAL
Version: af2c913 (last code commit; this report is committed after it)
Executor model: Opus 5.5 (`claude-opus-5-5`, as shown in the session environment)
PR: https://github.com/TiPunchLabs/contes-creole/pull/50 (draft)
Preview: https://deploy-preview-50--contes-creoles.netlify.app

PARTIAL because AC14 needs the Codex review of the last commit (S6, routed by pilotage, not run by the executor), and some brief items are only verified in emulation (no physical phone). The executor's acceptance criteria AC1–AC13 are met, with the artistic reservations listed below.

## Executive summary

The tree home is replaced by « La Veillée » (`src/veillee/`), a new universe behind the existing home contract. The scene is a contemporary Guadeloupe terrace at dusk, a child asleep in an ordinary armchair, and one 3D book of tales on the table. The book alternates the catalogue's published tales (official visuals, uncropped) and two animated portraits (Konpè Lapen, Konpè Zanba). Menu, bookmarks, arrows, entry, catalogue and portrait text are real HTML. The shell's entry transition is reused unchanged, and the tree's dive is ported to the book's page. Mila, then Ti Kannot é Gwo Rako, are wired end to end in both languages. Checks are green: typecheck, lint, 429 tests, build, 27 functional checks. The GPU numbers are 60 FPS at rest and 59.5 during page turns, with no accumulation over 5 round trips.

## Acceptance criteria

| AC                                                | Status                                                   | Proof                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 baseline                                      | VERIFIED                                                 | `baseline.md`; before videos B/baseline (sha256 in `evidence/manifest.md`)                                                                                                                                                                                                                    |
| AC2 terrace, child, one book anchored             | VERIFIED (art reservations R1–R5)                        | final rest videos; `B/final/functional/frame-*.png`                                                                                                                                                                                                                                           |
| AC3 living depth, layers                          | VERIFIED (R1, R4)                                        | `design.md` §2 layer table; rest videos and contact sheets: light band on the near ridge, branches and hibiscus in the wind, leaf shadows on wall and floor, leaf curl; per-tale ambient (Mila foam ↔ tile reflection, Ti Kannot waterfall shimmer + flamboyant petals)                       |
| AC4 3D book, official visual on a deformable page | VERIFIED                                                 | `src/veillee/scene/book.ts`, `page-art.ts`; stills `desktop-tikannot.png`, `desktop-mila.png`, `desktop-turn-mid.png`, `phone-tikannot.png` vs `src/books/*/assets/cover.webp`; Ti Kannot (title painted in the poster) shows no HTML title; accessible name `<title> — entrer dans le conte` |
| AC5 pages from editorial data                     | VERIFIED                                                 | `buildPages` (catalogue only source); test `pages.test.ts` « adds a portrait from editorial data alone » walks the turn both ways without touching `flip.ts` / `book.ts`                                                                                                                      |
| AC6 two portraits, sourced                        | VERIFIED (names provisional)                             | `characters.md`; gestures: Lapen's ear then gaze, Zanba's trunk to a mango, sniff, ear flap; still pose under reduced motion (`reduced-lapen.png`)                                                                                                                                            |
| AC7 navigation                                    | VERIFIED                                                 | functional F2–F5, F8 (keyboard both ways, fast clicks in sync, bookmarks, swipe, tap vs swipe on the art)                                                                                                                                                                                     |
| AC8 entry and back                                | VERIFIED                                                 | journey videos; F6 (same page, focus on its entry, language kept from Mila to Ti Kannot); `compare-entry-before-after.webm`                                                                                                                                                                   |
| AC9 permanent menu                                | VERIFIED                                                 | F5, F7 (catalogue by universe and title, Contact verified channel in a new tab, Le projet opens without the scene, browser back, `/#contes`, `/#invitation`)                                                                                                                                  |
| AC10 mobile, a11y, reduced motion, no WebGL       | VERIFIED (emulation)                                     | F8–F11; frames 390x844, 360x640, 844x390, 1440x900; focus ring (`--focus-ring`)                                                                                                                                                                                                               |
| AC11 all published tales, both languages          | VERIFIED                                                 | Mila and Ti Kannot (the two `ready` books); F6 Français then back to Kréyòl                                                                                                                                                                                                                   |
| AC12 performance                                  | VERIFIED on laptop GPU; NOT_VERIFIED on a physical phone | `evidence/manifest.md` performance table                                                                                                                                                                                                                                                      |
| AC13 no regression                                | VERIFIED                                                 | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` on af2c913: exit 0, 58 files / 429 tests; CI `quality` green on 69e6607 and af2c913; tale code unchanged                                                                                                                             |
| AC14 delivery                                     | PARTIAL                                                  | pushed branch, draft PR, preview, videos, this report; Codex review = S6 (pilotage)                                                                                                                                                                                                           |

## Verified journeys

- Desktop and mobile (emulated): the Mila bookmark, entry by the illustration, Mila's first scene, back on the same page (« Page 3 sur 4 ») with focus on Mila's entry, a page turn (swipe on mobile) to Konpè Zanba's portrait with its text read, the Ti Kannot bookmark, entry, first scene, back. Logs: `B/final/journey/log-journey.json`.
- Home → Le projet → browser back; Contact attributes; `/#contes`, `/#invitation` (F7).
- Without WebGL: HTML book with the official pictures, the portrait drawings in their still pose, arrows, and a catalogue listing both tales (F11). Entering a tale without WebGL reaches the tale's own fallback (tales need WebGL, as before).

## Entry transition: reused vs adapted

- Reused unchanged: `src/app/app.ts` `enter()` / `enterImmersive()` / `leave()`, `TIMING` (dive 1.7 s, flash from 55 %, rise 1.1 s, fade 1.2 s), world mounting, focus restore, Escape.
- Adapted (ported from `src/tree/index.ts` `frame()` into `src/veillee/scene/camera.ts` `divePose`): same length (1.7 s), the same `smoothstep` ease, look to the target, fov from the rest value to 95°, fly-through. The target is the selected tale's illustration centre on the 3D page, not a card on a branch. The overshoot keeps its proportion: 0.6 for a 2.1-high card becomes `0.6 × pageHeight / 2.1`. `resume(bookId)` reselects that tale's page flat (no turn).
- Back focus: the shell refocuses what opened the tale. When that element is gone (a closed catalogue panel), the tale's entry on its page takes the focus.

## Tree universe: kept and removed

- `src/tree/` stays in the repository, no longer mounted and tree-shaken out of the bundle (decision D-TREE-KEEP). Not carried to the new home: the Konteur and his random tale, Lapen/Zanba wandering 3D critters, the class invitation slot. The classes page stays reachable from « Le projet », and its back links (`/#invitation`) land on the new home.
- The loader splash in `index.html` is removed (brief: no entry screen). `src/app/loader.ts` is now unused (kept, tested, harmless).
- Shared: `/contes-des-classes/` back label « Retour à l'arbre » → « Retour à l'accueil ».

## Character sources and chosen variants

Konpè Lapen (rabbit, male) and Konpè Zanba (elephant, male): GEREC spelling attested in the official Guadeloupean Creole curriculum. Details, sources S1–S8 and ambiguities A1–A4 are in `characters.md`. The owner's « Kompè » and « Komè Zamba » are not attested; the variants above are provisional.

## Artistic reservations

- R1 The cloud sheets drift behind the ridges, but they read discreetly against a sky band that is narrow in the fixed framing.
- R2 The child is built from simple volumes: a readable sleeping silhouette with breathing, but not painted like the reference.
- R3 The living room through the sliding bay reads weakly at this oblique angle (a warm panel more than a room).
- R4 Every backdrop plane is painted in code (gouache-like dabs, lobed crowns, rugged ridges). Matter and colour follow the boards, but they stay less rich than the reference's painting.
- R5 The book's illustration shows the official visuals as they are: Ti Kannot's poster carries its own painted title, so no HTML title duplicates it; the lettering is the poster's, not re-typed.

## Test limits

- Every motion video and performance number comes from headed Chrome on an RTX 4060 Laptop GPU. Mobile is device emulation on that GPU, not a physical phone (none named by the owner).
- Functional checks and stills ran headless (no performance taken headless).
- The `vite preview` served bytes are uncompressed; Netlify serves them compressed.
- Suspension when the tab is hidden (`visibilitychange` → `stage.stop`): code read only, not measured. Suspension while a tale is open: measured (5/5 stopped).
- The draw calls (163–169 including the shadow pass) exceed the 80 planned in `design.md` §8. 60 FPS holds on this GPU; a phone measurement is still to do.
- Tales without WebGL: unchanged behaviour (they need WebGL); the home itself works without it.
- CI on 3c60b42 failed on `qa/mila-clearance-gap.test.mjs` (5 s timeout, a known flaky test noted after PR #49), green on 69e6607 and af2c913.

## Delegations (model economy)

| Task                                                                                                                                                         | Subagent model |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| S1 before videos, screenshots, first-load and FPS baseline                                                                                                   | Sonnet         |
| Character source research (web)                                                                                                                              | Sonnet         |
| S3 rest and journey recordings, contact sheets, manifest                                                                                                     | Sonnet         |
| S5 final rest/journey/functional runs, before/after comparisons, manifest (its perf run failed on a script race; the executor fixed the script and ran perf) | Sonnet         |

Design, artistic and product-code decisions, and development debugging runs: executor (Opus 5.5).

## Open decisions

- A1–A3 names: keep `Konpè Lapen` / `Konpè Zanba` (recommended, attested); the alternative is the owner's working names, written as a deliberate variant. If Zamba should be female, that is an invention to state as such (A2).
- D-BACK-LABEL: the tales' back buttons still read « Pyébwa a Konesans » (the tree's name; Mila's button is tale code). Recommendation: a neutral label such as « Kont Kréyòl » or « Accueil » in both the shell and Mila, changed together. Leaving it means a label pointing to a tree that is gone.
- D-TREE-KEEP: delete `src/tree/` (and `src/app/loader.ts`) in a follow-up once the owner validates the new home. Recommended after merge; keeping it costs nothing at run time.
- D-MENU-PROJET: « Le projet » is a new static page built from texts already published, plus one sentence describing the book. Owner copy is welcome.
- D-START-PAGE: the book opens on the first tale in catalogue order (Ti Kannot). Opening on Mila, as the boards suggest, is a one-line change.

## Recommended next action

S6: pilotage routes the Codex review of af2c913 (Playwright: `qa/veillee-functional.mjs`, `qa/veillee.mjs`; visual inspection of the preview). The executor then corrects any findings on this branch. No merge and no production publication without the owner.
