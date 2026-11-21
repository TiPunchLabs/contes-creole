# Report — 2026-11-21-mobile-swipe-nav

Verdict: PARTIAL
Version: 631429a2cc3dcfd36ce4c8cdabfeb18c8a64e51a

`Version` is the product HEAD (`631429a`): the last commit that touches `src/`. The delivered branch HEAD carries on top of it only the mission files, the evidence and this report.

Why PARTIAL and not PASS: steps N1 to N4 are done and every technical criterion that can be checked here is verified, but three things required by the brief are not: the Codex review (step R1, routed by pilotage, not started), a test on a real phone (none was available to this session), and the two readers' understanding of the gesture (the owner's test). CI `quality` failed once on a test unrelated to this change and was re-run (section 5).

Session model: `claude-fable-5-2` (Claude Fable 5.2), confirmed at the start of the session.

## 1. What was done

- Pull request: https://github.com/TiPunchLabs/contes-creole/pull/52 (draft, base `main`).
- Deploy Preview: https://deploy-preview-52--contes-creoles.netlify.app (follows the branch HEAD; `src/` is that of `631429a`).
- Branch `feat/mobile-swipe-nav` from `origin/main` `c5c6f0c`, pushed. No merge, no production publication.

Commits:

- `71f910a` feat(nav): turn scenes with horizontal swipes on smartphones
- `631429a` fix(nav): detect smartphones by touch screen and screen size
- `d81d3de` docs(missions): brief, mission and progression map
- the commit of this report

Behaviour on a smartphone:

- Right-to-left swipe: one scene forward. Left-to-right: one scene back. Same rule on the home and in Ti Kannot and Mila, portrait and landscape.
- One scene per touch, whatever its length or speed. Both ends are respected; on the last page a swipe does nothing (no close, no restart).
- A mostly vertical move keeps the scene. On a long passage it scrolls the text to its last line.
- A tap whose finger trembles (up to 12 px) opens the cover. A swipe that starts on a cover explores and does not open it.
- Home hint: « Glisse vers la gauche pour explorer » with a left arrow replaces « Fais défiler · Glisse avec le doigt »; it is removed after the first successful swipe and does not come back.
- Tales: the existing previous/next buttons are kept (already named « Page précédente » / « Page suivante »). A swipe calls the same function as the button.
- Ti Kannot's first-page hint « Défilez pour continuer » (down arrow) becomes « Glissez pour continuer » (left arrow) on smartphones. See decision D2.

Unchanged on computers and tablets: wheel, trackpad, keyboard, vertical finger drag, both hints.

Files (15 files in `src/`, +680 −19 against `c5c6f0c`, tests included):

- `src/shared/gesture.ts` (new): `detectPhone`, `createSwipeTracker`, `bindSwipe`. `src/shared/gesture.test.ts` (new, 17 tests).
- `src/tree/index.ts`, `src/tree/scene/camera.ts` (`climbStops`, `strideStop`), `src/tree/overlay/overlay.ts` and `.css` (hint).
- `src/app/app.ts`, `src/app/reading-ui/reading-ui.ts` and `.css`.
- `src/books/mila/world/index.ts` and `mila.css`; `src/books/ti-kannot/world/index.ts` (tap on a character, see section 4).
- `qa/swipe.mjs` (new), `qa/README.md`, `doc/architecture.md`, `CLAUDE.md` (one line), `.prettierignore` (the owner brief is kept verbatim).

## 2. Acceptance criteria

| AC                                                                     | Status                                                                                                                         | Evidence                                                                                                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 progression map                                                    | VERIFIED                                                                                                                       | `evidence/n1-progression-map.md`                                                                                                       |
| AC2 behaviour list on phones                                           | VERIFIED in emulation (Chrome), NOT_VERIFIED on a real phone                                                                   | section 3, runs `home`, `kannot`, `mila`, `ends`, `text`                                                                               |
| AC3 ambiguous gestures                                                 | VERIFIED in emulation                                                                                                          | section 3; unit tests of the tracker                                                                                                   |
| AC4 home hint                                                          | VERIFIED                                                                                                                       | `home-0-hint.png`, `home-landscape-hint.png`; checks `hint-invites-swipe`, `hint-removed-after-first-navigation`, `hint-stays-removed` |
| AC5 buttons reused, same state as gestures                             | VERIFIED                                                                                                                       | checks `buttons-lead-to-the-same-text` and `buttons-lead-to-the-same-decor` in `kannot` and `mila`                                     |
| AC6 desktop and tablet unchanged; zoom, reduced motion, sync, rotation | VERIFIED with one 0.001 reading difference (section 3); native zoom: unchanged, see section 4                                  | `legacy-base/legacy.json`, `legacy-branch/legacy.json`, `legacy.diff`                                                                  |
| AC7 repo checks, CI                                                    | Local: VERIFIED. CI: first run failed on an unrelated flaky test, re-run requested, result NOT_VERIFIED at the time of writing | section 5                                                                                                                              |
| AC8 PR, Deploy Preview, capture                                        | PR and preview: VERIFIED. Capture: `round-trip.mp4`, recorded on `71f910a`                                                     | section 1, section 3                                                                                                                   |
| AC9 this report                                                        | done                                                                                                                           | this file                                                                                                                              |

## 3. Verification

Evidence folder: `~/.local/share/contes-creole-qa/mobile-swipe-nav/` (not in the repo).

What was actually used:

- Browser: Google Chrome 158.0.8127.36, headless, through `@playwright/test` 1.58.2 (`QA_CHANNEL=chrome`), on the NVIDIA GPU (renderer `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`). No SwiftShader.
- Input: real touch events through CDP `Input.dispatchTouchEvent` (the browser's gesture pipeline, `touch-action` and native scroll included). No check calls a page or scene function.
- Emulated profiles (touch, mobile): 390×844 @3, 844×390 @3, 320×568 @2, 568×320 @2. Tablet: 820×1180 @2 touch. Desktop: 1440×900 and a narrow 390×844 window, no touch.
- Physical devices: none. Safari / WebKit, Firefox, Samsung Internet: not tested.
- Served build: local `vite preview` of the branch on `127.0.0.1:4217`, not the Deploy Preview (its Netlify bar covers the bottom controls).

Phone journeys on `631429a` (`final.log`, `final/results.json`): 81/81 PASS, exit 0.

- `home` (390×844): hint, first and second cover (`t` = 0.2 then 0.54), back; vertical, diagonal, short (30 px), cancelled, two-finger and out-and-back moves leave `t` unchanged; a 360 px swipe in 30 ms moves one landmark; a swipe starting on the cover moves on without opening; both ends hold (`t` = 0 and 0.879, still on `/`); the shelf still answers taps; a trembling tap on the cover opens `ti-kannot`.
- `kannot` (390×844, entered by its cover): forward twice and back once shows `2 / 12` « On ti zwazo é on gwo krab »; the buttons reach the same counter, title and language; decor compared on the scene above the text: page 2 by swipe against page 2 by button differs by 0.18 (mean absolute difference, 0 to 255) against 17.21 between page 2 and page 3; a swipe starting on the text card turns the page; vertical, diagonal, two-finger and cancelled moves keep the page; a fast long swipe turns one page; first page and last page hold (`12 / 12`, tale still open); rotation to 844×390 and back keeps the page and both directions work; the language switch and the back control answer taps; the home answers swipes after the return.
- `mila` (390×844, entered by its cover, real time): the same journey (`Page 02`, `2 / 12`, decor 3.44 against 22.83); a second swipe 0.7 s into a transition is ignored, like the disabled buttons; first page holds at `Page 01`; language switch and back control work.
- `ends` (844×390, reduced motion): home hint and swipes in landscape; Mila opened by its cover; last page `12 / 12` holds after two more swipes (tale open, no restart); rotation to portrait keeps `Page 12`; both directions work after it.
- `text`: Ti Kannot at 320×568, page 3, overflow 70 px in Kréyòl and 118 px in French: vertical touches reach the last line, counter unchanged, one more vertical touch at the end changes nothing, then a horizontal swipe on the long text turns the page. Mila's text only overflows on a small phone in landscape (568×320): page 3 in Kréyòl (64 px), page 1 in French (69 px), same results.
- No console error in any run (the analytics script is blocked in the harness, see section 4).

Negative control (`negative-control-base.log`): `home` on the base build `c5c6f0c` gives 0/13 PASS and exit 1; the checks can fail.

Desktop and tablet, base against branch (`ONLY=legacy`, same script on both builds, reduced motion):

- First comparison, branch at `71f910a`: the two `legacy.json` were identical (empty diff).
- Second comparison, branch at `631429a`: one difference, desktop `homeKeyUp` 0.088 (base) against 0.089 (branch). All other values identical, including every page counter, both hints and `phone: false` for desktop, narrow window and tablet. Hypothesis, not proven: reading noise of the eased climb (the harness accepts the camera as settled under 0.0015 per 300 ms). The comparison was not repeated.
- Values (branch): desktop and narrow window: wheel on the home 0.165, ArrowDown 0.242, wheel in Ti Kannot `2 / 12`, keys `4 / 12` then `3 / 12`, Mila wheel `Page 02`, keys `Page 03` then `Page 02`. Tablet: vertical finger drag climbs the home (0.29) and turns the page in Ti Kannot and Mila; a sideways drag changes nothing (0.291, same page), as on the base.

Capture: `video/round-trip.mp4` (68 s, 390×844, touches shown as dots): home forward, forward, back; Ti Kannot opened by its cover, forward twice, back once; return; Mila the same. Recorded on `71f910a`; not re-recorded after `631429a`, which only changes the detection rule. It was not watched by a person.

Delegation (model economy): one Sonnet subagent ran the base build, the first legacy comparison, the negative control, a full phone run on `71f910a` (81/81) and the video. Design, product code, the harness, and the final runs on `631429a` were done in this session.

Technical validation of the gesture and reader understanding are two different things. The first is verified in emulation as above. The second (a reader finds the gesture without being told) is NOT_VERIFIED until the owner's test with the two readers.

## 4. Deviations, risks and limits

- No real phone. Emulated touch in desktop Chrome does not reproduce iOS Safari. Known and untested there: a swipe that starts at the very edge of the screen is the system's back/forward gesture and never reaches the page; behaviour of `touch-action: pan-y` on the two text scrollers.
- Smartphone rule: `(any-pointer: coarse)` and screen short side under 600 CSS px. The mission suggested primary pointer coarse and no hover; the first commit did that, the second widened it so a phone that names its stylus as primary pointer is not left out. That stylus behaviour is recalled, not tested. Side effects: a touch laptop whose reported screen is under 600 px (heavy browser zoom in a browser that scales `screen`) would be taken for a phone; unfolded foldables of 600 px or more behave as tablets.
- On a smartphone the vertical drag no longer climbs the home or turns pages. This is the brief's rule ("un geste principalement vertical laisse la scène en place"), stated here because it removes the gesture phone readers had until now.
- The home's progress indicator is still the vertical climb bar on the right. It stays in sync with swipes but its orientation does not match the new gesture. Not changed: art direction is out of scope (decision D1).
- Direction on the home: a swipe to the left raises the camera along the existing path around the tree. Whether that reads as "forward" was not judged by a person.
- Native zoom: `.app` was already `touch-action: none` on the base, which blocks pinch zoom inside the app. Unchanged. Two-finger touches are ignored by the recogniser.
- Ti Kannot's world: a tap on a character is now measured as the distance from the press (both axes) instead of the vertical path, on every touch device. Without it a sideways swipe over a character also made it speak. On tablets a trembling tap is slightly more tolerant; no navigation effect.
- Mila, crab page: the scene removes a piece of debris on finger-down (existing behaviour), so a swipe that starts on debris also removes it.
- Read in the code, not tested: on computers, in Mila, ArrowLeft or a wheel-up on page 1 calls `scene.go(0)`, which the scene accepts. Existing behaviour, outside this mission; swipes are bounded to pages 1 to 12.
- The first harness runs (before the analytics script was blocked) requested `cloud.umami.is/script.js` from the local build and got a 404. No personal data was involved.
- Conflict between brief and mission: none found.

## 5. Repository state

- Branch `feat/mobile-swipe-nav`, pushed, tracking `origin/feat/mobile-swipe-nav`. Working tree clean after the report commit.
- Local checks on `631429a`: `pnpm format:check` clean; `pnpm lint` 0 problem; `pnpm typecheck` clean; `pnpm test` 56 files, 432 tests passed (base: 405); `pnpm build` succeeded.
- CI on `d81d3de`: `quality` failed in `pnpm test`, 431 passed and 1 failed: `qa/mila-clearance-gap.test.mjs`, "Test timed out in 5000ms". This file is not touched by the branch and the same timeout is a known open item of the mila-underwater mission. The failed job was re-run once (`gh run rerun 44921927882 --failed`); its result was not waited for. Netlify `deploy-preview`: pass.
- Local servers: the base preview (4218) is stopped; the branch preview on `127.0.0.1:4217` is stopped at the end of the session. The base tree extracted for the comparison remains in the session scratch folder.
- All operations on `main` and production: none.

## 6. Decisions required

- D1 — Home progress indicator. The vertical climb bar stays on smartphones. Options: keep it; hide it on smartphones; redraw it horizontally (art direction, a separate change). No recommendation without the reader test. Not blocking.
- D2 — Ti Kannot hint on smartphones. « Glissez pour continuer » replaces « Défilez pour continuer », because the old text asked for the gesture that no longer works there. The brief only named the home hint. Options: keep the new wording; other wording; remove the hint on smartphones. Recommendation: keep. Not blocking.
- D3 — CI. If the re-run fails again on the same timeout, the flaky test needs its own fix (raise its timeout); not done here because it is outside the mission.

## 7. Next action

- Pilotage: check the CI re-run on PR #52, then route the Codex review (R1) with Playwright from the interface. `qa/swipe.mjs` is one way in; the reviewer should also drive its own cases. Review on a local build or with the Netlify bar closed.
- Owner, before the merge decision: a real phone on the Deploy Preview (close the Netlify bar with ×), then the instruction for the two readers, as written in the brief: « Depuis l’accueil, trouve un conte, ouvre-le, lis les deux premières scènes, puis reviens à la première. »
