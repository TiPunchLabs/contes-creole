VERDICT: PASS_WITH_RESERVATIONS
Version: 23bb7d8e65b9b1aa9de080ae3226792d478e6ac8
Reviewer: codex

## How I drove the UI

Reviewed product source and production builds pinned to `23bb7d8`, compared with a separately checked-out and built `c5c6f0c2400d263fe28fbbf0f8217e5f64038460`. Used scratch clones under `/tmp/mobile-swipe-review-{23bb7d8,base}`; reused the installed dependencies. Mission documents were read from the supplied worktree at `64e4388`, including the existing uncommitted brief/mission updates. The difference from product SHA to that HEAD is report documentation only.

Chrome 158.0.8127.36, headless Playwright, SwiftShader. Primary completed phone journeys used 390×844 at DPR 1, touch/mobile enabled, screen 390×844; viewport rotations/resizes included 844×390, 320×568 and 568×320. Most journeys used reduced motion; Mila's transition exclusion was separately tested with reduced motion disabled before mounting the tale. Earlier bulk attempts also used DPR 3 and 0.25; an additional 412×915 attempt was interrupted and is not counted as completed coverage. No physical device was used by this reviewer.

Inputs were browser touch events through CDP `Input.dispatchTouchEvent` (start/move/end/cancel, including two fingers), plus actual UI button taps. Independent MCP journeys used explicit event timestamps, generally 25 ms increments, including a trembling cover tap observed as an 80 ms pointer sequence. I read DOM text, counts, projected cover boxes and progress-bar geometry; I did not call progression/scene functions. Desktop comparisons used Playwright mouse wheel and keyboard; tablet comparison added CDP vertical touch dragging. Servers were started with `nice -n 19`, bound to `127.0.0.1:4271` (product) and `:4272` (base).

Evidence directory: `~/.local/share/contes-creole-qa/mobile-swipe-nav/review-1/`. In particular, `mcp-touch-complete.json` preserves independent Playwright code and returned observations; check logs, unsuccessful bulk-run results, `preview-assets.json`, and `mila-page2.png` are retained there. SwiftShader results establish functionality, not performance.

## Findings

No confirmed acceptance-breaking product defect. No F-numbered product finding is raised.

The unsuccessful bulk runs are not passing-suite evidence: `suite.log` and `suite-dpr1.log` each end at **25/33 PASS**, and `suite-quarter.log` at **0/6 PASS**. They include navigation/entry timeouts and home short/cancelled-gesture assertions against an incompletely settled reference. Independent journeys below supersede those particular inconclusive probes; they do not turn the bulk runs into passes. An early independent script also timed out entering Ti Kannot; the later timestamped cover tap and explicit arrival wait successfully opened the correct tale.

## Independent UI results on the reviewed product

| Journey | Input and observed result |
| --- | --- |
| Home direction and finger following | Initial bulk UI probes passed both directions and held-finger observations: cover x 256→321 when moving right and 256→71 when moving left. Independent subsequent journeys navigated both ways through the actual covers. |
| Endless home rotation | Starting at Mila (near index 1), eight rightward swipes yielded `2,-1,0,1,2,-1,0,1`; eight leftward swipes yielded `0,-1,2,1,0,-1,2,1`. Thus two complete turns each way; −1 is opening, 0 Ti Kannot, 1 Mila, 2 invitation. The earlier DPR-3 run also reached its two-right/three-left-turn assertions. |
| Home hint and overflow | “Glisse pour explorer” appeared initially and disappeared after successful navigation, remaining hidden through the turns. At 390×844 the measured page overflow, shelf scrollbar height and horizontal scroll position were zero. At 844×390, independent swipes reached invitation and returned to Mila; page overflow was zero, shelf scrollbar style `none`, climb bar `hidden`. |
| Covers | A swipe beginning on the cover kept the home open. A timestamped trembling tap opened Ti Kannot, and another opened Mila, each on page 1. These are touch/raycast paths, not programmatic book entry. |
| Home ambiguous gestures | Final explicit-settle check: baseline progress 0.198680, short gesture 0.198545, cancelled swipe 0.198680, second-finger interruption 0.198680; all remain within 0.0015 of the same 0.2 stop, no book opened. This resolves the earlier short/cancelled bulk assertions at that stop. |
| Ti Kannot | Forward twice/back once gave `2 / 12 → 3 / 12 → 2 / 12`. Previous/next buttons returned the same count and card text. Cancelled, vertical, diagonal, 30 px short, and two-finger gestures kept page 2. A 360 px swipe advanced only to page 3. Rotating to 844×390 retained page 3, then a rightward swipe returned to page 2. |
| Ti Kannot long text | At 320×568, page 3: French overflow 118 px, remaining scroll 118→0 and final paragraph visible; page unchanged. Kréyòl overflow 70 px, separately scrolled back to the top and then 70→0 by vertical touch; page unchanged. Language controls answered taps. |
| Ti Kannot bounds/back | UI buttons reached page 12; an extra forward swipe left `12 / 12`. Returning to page 1 and swiping backwards left `1 / 12`. Back returned to the tree at its Ti Kannot stop. |
| Mila | Trembling cover tap opened `Page 01`, `1 / 12`. Forward twice/back once gave `2 / 12 → 3 / 12 → 2 / 12`; buttons returned identical page text/count. Inspected `mila-page2.png`: page-2 text and Mila holding the shell at the shore are displayed together. Cancelled/two-finger gestures kept page 2. |
| Mila text/orientation | Rotation to 568×320 retained page 2; a forward swipe reached page 3. French overflow 69 px and Kréyòl overflow 64 px were each scrolled from the top to zero remaining, final paragraph visible, `3 / 12` unchanged. Language controls answered taps. |
| Mila bounds/back | Buttons reached page 12; extra forward swipe retained `12 / 12`. At page 1 a backwards swipe retained `1 / 12`. Back returned to the tree at Mila. |
| Mila transition, normal motion | Reopened after disabling reduced motion. First swipe disabled next; a second swipe during that move was ignored. After arrival the count was `2 / 12`, not page 3. |

## Base comparison and code review

Independent home comparisons used desktop 1440×900, narrow desktop 390×844 with a 1440×900 screen and no touch, and touch tablet 820×1180. Both versions lacked `data-phone` and kept “Fais défiler · Glisse avec le doigt”.

The same wheel(0,240), ArrowDown, ArrowUp sequence produced these sampled progress values (these are eased, time-dependent readings, not exact target comparisons):

| Profile | Base wheel/down/up | Product wheel/down/up |
| --- | --- | --- |
| Desktop | 0.089 / 0.180 / 0.146 | 0.089 / 0.180 / 0.146 |
| Narrow desktop | 0.121 / 0.202 / 0.138 | 0.121 / 0.200 / 0.139 |
| Tablet | 0.118 / 0.200 / 0.139 | 0.115 / 0.197 / 0.139 |

A 140 px vertical tablet drag then reached 0.289 on both. These observations support unchanged input selection/progression; small intermediate differences do not establish a regression. I did not independently repeat the complete desktop/tablet tale matrix or physical trackpad input. Executor `fb1-legacy/legacy.json` and `legacy-base/legacy.json` exist and agree with the report's stated broader comparison, but remain executor evidence.

Source checks:

- `src/shared/gesture.ts:22` and `:27`: touch capability plus screen short side under 600, not window width. Phone mode is read at mount; viewport rotation preserves the selection.
- `src/tree/index.ts:202`, `:417`, `:499` and `src/tree/scene/camera.ts:412`: phone ring/drag branch; non-phone climb and camera retain the base paths.
- `src/app/app.ts:284`, `:393`: shell swipe and buttons use the same clamped `goPage`, including world's `setPage` and reading render. `src/books/mila/world/index.ts:331` uses the existing `go`, bounds and moving guard. Thus decor/camera updates use the existing page mechanisms rather than a separate swipe-only index.
- Universe imports remain isolated; ESLint passes. Listeners attach to the tree/app/Mila surfaces, with controls excluded. Tree/app unbind on dispose; Mila's local listeners are owned by its removed root, and its window listeners/timers are removed on dispose. A discarded local unbinder alone does not establish a retained-listener leak.
- Text `touch-action: pan-y` is backed by the actual scrolling results above; shell fallback vertical scrolling is present for its card. Reduced-motion behavior was exercised in both tales, and the normal-motion transition guard separately.
- Native pinch zoom was already blocked by `.app { touch-action: none }` at `src/style.css:19` on the base; that file is unchanged. The report explicitly acknowledges this. Successful native zoom is not independently verified and must not be inferred from these gesture results.
- Both ready tales were checked; `zanba` and `konpe-lapen` are not ready. The classes page has no additional tale progression.

## Acceptance criteria

| AC | Status | Proof / limit |
| --- | --- | --- |
| AC1 | VERIFIED | Read progression map and re-derived the three mechanisms from source above. Report §0 supplements the map's older home description with the current ring; the map's old line references are not current ring documentation. |
| AC2 | VERIFIED | Independent Chrome touch journeys above: both tales, bounds, scrolling FR/gcf, cover interaction, language/back, orientation; home interpreted under feedback 1 and D4. This is technical emulation coverage, not physical Safari or reader comprehension. |
| AC3 | VERIFIED | Independent short/diagonal/vertical/cancel/two-finger/long-fast cases; normal-motion Mila transition exclusion; recognizer unit tests included in the 438 passing tests. Bulk-run failures remain disclosed. |
| AC4 | VERIFIED | Initial hint, removal and persistence checked from UI; D4 wording/icon and French language marker checked in overlay source/tests. No invented Kréyòl string. |
| AC5 | VERIFIED | Actual button/touch comparisons returned identical text/count in each tale; source proves both paths drive the same world/page mechanism. Independent pixel-difference decor comparison was not repeated. |
| AC6 | NOT_VERIFIED | Home base comparisons and phone orientation/reduced motion checked; same page-to-world wiring inspected. Complete independent non-phone tale/trackpad regression, native pinch operation and pixel-level decor equivalence remain unchecked. |
| AC7 | NOT_VERIFIED | All underlying local quality tools passed, including 438/438 tests in 56/56 files and production build. Exact `pnpm` invocations were sandbox-blocked; CI was not independently queried under the brief's network restriction. |
| AC8 | NOT_VERIFIED | Supplied PR #52 URL; preview HTTP 200 and all 15 built JS/CSS assets byte-identical to this SHA's build. Current screenshot captured. Existing `video/round-trip.mp4` is reported as recorded on older `71f910a`; no new current-product video was verified. PR draft/current checks were not independently queried. |
| AC9 | VERIFIED | Supplied report at documentation HEAD declares PARTIAL, correct product Version, model/delegations/profiles and no executor physical device, and distinguishes reader understanding as NOT_VERIFIED. Its 438-test claim is independently reproduced. Historical sections/CI claims are explicitly versioned/superseded by §0. |

## Commands run

Working directory for product checks: scratch checkout of exact `23bb7d8`.

- `git clone --shared --no-checkout <mission-worktree> /tmp/mobile-swipe-review-23bb7d8`, then `git checkout --detach 23bb7d8e65b9b1aa9de080ae3226792d478e6ac8` → exit 0. Equivalent base clone/checkout at `c5c6f0c` → exit 0.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` → **each exit 1**, before its script: `ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK`, “Failed to open the store operation lock at "pnpm-store-operation-locks": Read-only file system (os error 30)”. No escalation requested.
- `node_modules/.bin/prettier --check .` → exit 0, all matched files formatted.
- `node_modules/.bin/eslint .` → exit 0.
- `node_modules/.bin/tsc --noEmit` → exit 0.
- `node_modules/.bin/vitest run` → exit 0, **56 files passed; 438 tests passed**, no failed tests.
- `node_modules/.bin/tsc -b` → exit 0; `node_modules/.bin/vite build` → exit 0, **145 modules transformed**; existing large-chunk warning. Base `node_modules/.bin/vite build` → exit 0, 144 modules.
- `git diff c5c6f0c 23bb7d8`, source reads, `git diff 23bb7d8 64e4388 --stat` → exit 0; code reviewed against named product SHA, later HEAD changes report only.
- Bounded bulk Playwright attempts, using `qa/swipe.mjs` and scratch adaptations → unsuccessful summaries **25/33, 25/33, 0/6** as disclosed. Launch shell sessions were interrupted; do not treat their shell exit as the child's test exit.
- Independent Playwright MCP/CDP journeys → returned the observations in the tables and saved transcript; no direct scene progression calls.
- Preview-only Python HTTP comparison → exit 0; **15/15 JS/CSS assets identical** to local product build, main bundle SHA-256 `3f576fb0c4e71302a075004f9fc3b44501e06d1be8b1e5ce7c788d7263527c3e`.
- Final `git status --short` before writing this review → only the pre-existing mission edit and untracked review brief; product HEAD remained `64e4388`. No push or PR comment.
- Scratch removal → exit 0, both scratch directories removed. Playwright browser/context closure completed.
- Preview launch sessions terminated (exit 143), but final `ss -ltnp 'sport = :4271 or sport = :4272'` still lists both loopback listeners without process IDs.

## Not checked / reservations for the owner

- Reader understanding: **NOT_VERIFIED by design**. The owner-reported “test téléphone ok” after D4 is recorded in the supplied mission/brief, not presented as this reviewer's physical-device test. The two-reader discovery test remains the owner's step.
- Real-phone Safari/WebKit, Firefox, native pinch operation, physical trackpad behavior and full independent desktop/tablet tale regression remain unverified. No performance or rotation-feel judgement from SwiftShader.
- The old round-trip video does not demonstrate the current endless-home behavior. Source and independent touch results cover the current behavior; a refreshed video would make handoff clearer.
- CI run/status is an executor report claim, not independently revalidated here. The five exact package-manager commands could not run through their wrapper in this sandbox; their underlying tools did run successfully.
- Cleanup limitation: **127.0.0.1:4271 and :4272 still listen after launch-session termination**. Scratch roots are removed, so these are leftover preview processes, not a publication. The sandbox PID namespace shows only its own command processes; `ss` exposes no listener PID, so I could not target the remaining servers without widening permissions. They require host-side termination. Browsers were closed; no permission escalation was attempted.
