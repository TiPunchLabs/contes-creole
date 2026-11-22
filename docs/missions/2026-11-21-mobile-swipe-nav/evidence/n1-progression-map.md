# N1 — Progression map (AC1)

Line references are those of commit 71f910a; the later product commit only changes `detectPhone()` in `src/shared/gesture.ts`. "Base" is `origin/main` c5c6f0c.

## Base check

- `git fetch origin` then `git rev-parse origin/main` = c5c6f0c2400d263fe28fbbf0f8217e5f64038460: the branch starts from the deployed commit.
- `gh pr list --state open`: no open PR.
- Tales reachable from the site: `ready: true` in `src/books/ti-kannot/book.ts:7` and `src/books/mila/book.ts:7`. `zanba` and `konpe-lapen` are `ready: false` and `treeSlots()` (`src/tree/invitation.ts`) leaves them out.
- Mila's manifest title is "Mila et le lambi qui avait perdu son chant" (`src/books/mila/book.ts`, `story/gcf.md:3`). The name "Le secret du coquillage rose" used by the brief is the owner's name for the same tale (same wording in `docs/missions/2026-11-17-mila-underwater/mission.md:5`); no file in `src/` contains it.
- `/contes-des-classes/` (`contes-des-classes/index.html`) links only back to the tree (`/#invitation`) and to external pages: it opens no tale and has no scene navigation. Out of scope.

## What drives progress

| Screen                                  | Progress variable                                                                                  | Driven by (base)                                                                                                                                                              | Camera, decor, text and indicator follow from                                                                                                                                                                                 | Swipe hooks in (branch)                                                                                                                                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (tree)                             | Continuous climb `target` in [0, 1], eased into `t` each frame (`src/tree/index.ts:396`)           | wheel `climb(e.deltaY)` (`:317`), vertical finger drag `climb(dy * 2.2)` (`:330`), keys `climb(±140)` (`:369`, `:372`), shelf `target = cardT(index)` (`:237`)                | `treeCam(t, …)` (`:397`), `cards.update`, `overlay.update(t, …)` (`:441`): intro opacity and climb bar from `t` (`src/tree/overlay/overlay.ts:155-156`), near card and shelf highlight                                        | `stride()` (`:193`) sets `target` to the next or previous landmark of `climbStops()` (`src/tree/scene/camera.ts:11`: the opening view, then each card's `cardT`), through `bindSwipe` (`:468`). Same variable as wheel, keys and shelf: camera, decor, labels and climb bar follow as before. |
| Ti Kannot (and any book with a `world`) | Page index `page` in the shell (`src/app/app.ts`)                                                  | `goPage()` (`:284`) from the page buttons (`src/app/reading-ui/reading-ui.ts:105-107`), keys (`:365`), wheel and vertical drag through `createPager` (`:321`, `:336`, `:351`) | `book.handle.setPage(page)` (`:291`) → the world's `setPage` (`src/books/ti-kannot/world/index.ts:259`): camera shot `frameShot(index)`, decor eased by `pageF` (`:187`); `reading.render()` (`:147`): text, counter, buttons | `onSwipe: goPage(page + direction)` (`:400`): the very function the buttons call.                                                                                                                                                                                                             |
| Mila (immersive)                        | Scene page `scene.page`, moved by a timed camera transition (`src/books/mila/world/scene.ts:3906`) | `go()` (`src/books/mila/world/index.ts:196`) from its page buttons, keys (`:290`), wheel and vertical drag through `createPager` (`:309`, `:314`)                             | `scene.go(to)` runs the camera and Mila along the page's path; `onLeave` hides the text (`:217`), `onArrive` shows the page's text and updates counter and buttons (`:226`, `:175`)                                           | `onSwipe` (`:332`) calls `go(page ± 1)` within pages 1–12 and never during a move, like the buttons (disabled while moving). `scene.go` itself ignores a request during a transition (`scene.ts:3907`).                                                                                       |

No screen uses the document's scroll: `html, body` are `overflow: hidden` and `.app` is `touch-action: none` (`src/style.css:19`). The only native scrollers are the long passages (`.reading-card`, `.mila-story-scroll`) and the tree's shelf (`touch-action: pan-x`, `src/tree/overlay/overlay.css:191`).

## Smartphone definition

`detectPhone()` (`src/shared/gesture.ts`): `(any-pointer: coarse)` and `min(screen.width, screen.height) < 600` CSS px.

- The window's size is never read: a narrow desktop window is not a phone (no touch pointer, and a large screen).
- Tablets and touch laptops have a touch pointer but a screen short side of 600 px or more (iPad mini 744, 8-inch Android tablets 600): they keep the base behaviour.
- The short side does not change when the phone turns, so the mode holds in portrait and landscape.
- The primary pointer and hover are not asked. The first version (71f910a) required `(pointer: coarse)` and no `(hover: hover)`; it was widened so that a phone that names its stylus as primary pointer is not left with the old vertical gesture. That stylus behaviour is an assumption from memory, not something tested here.
- Observed in headless Chrome 158 on 2026-11-21 (`legacy.json` and the `phone-detected` checks): 390×844 touch → phone; 844×390 touch → phone; 320×568 and 568×320 touch → phone; 820×1180 touch → not phone; 390×844 and 1440×900 without touch → not phone.

## Gesture rules (`createSwipeTracker`, `src/shared/gesture.ts:58`)

- Tap: the finger stays within 12 px of where it landed and lifts within 600 ms.
- Beyond 12 px the gesture takes its axis once: horizontal when |dx| > |dy|, else vertical. A vertical gesture never changes scene.
- A horizontal gesture is judged at release: at least 40 px of horizontal travel, still more horizontal than vertical. One scene at most per touch, whatever its length or speed. Coming back to the start cancels it.
- A second finger voids the touch until a new first finger lands. `pointercancel` drops it.
- Touches that start on a control (`button`, `a`, the tree's shelf) are left to the control.
