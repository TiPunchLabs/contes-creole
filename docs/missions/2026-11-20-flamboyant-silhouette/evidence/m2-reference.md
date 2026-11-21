# M2 — reference captures (AC3)

Start commit: `c5c6f0c` (origin/main, branch `feat/flamboyant-silhouette` before any change).
Tool: `qa/flamboyant.mjs` (`ONLY=probe,shots`), system Chrome headless on ANGLE/EGL, renderer
`ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`, dev
server `http://127.0.0.1:5183/`, `prefers-reduced-motion: reduce` (decor clock at 0.08, so two runs
frame the same picture), pointer parked (no parallax).

Command:

```bash
ONLY=probe,shots OUT=~/.local/share/contes-creole-qa/flamboyant-silhouette/reference \
  QA_CHANNEL=chrome node qa/flamboyant.mjs
```

Views. The opening is the fresh load (t = 0). The rotation angles are the shelf stops: a click on
shelf entry n sets the climb to `cardT(n)` (index.ts `onShelf`), read back from the climb bar.
Stops 2 and 3 are the two retained rotation angles; stop 1 is kept as a third.

| View    | Climb t | Azimuth | Desktop 1440x900 (DPR 1) camera / look-at                 | Mobile 390x844 (DPR 2, touch) camera / look-at  |
| ------- | ------- | ------- | --------------------------------------------------------- | ----------------------------------------------- |
| opening | 0       | -90°    | (1.5, 1.6, -23.685) / (0, 4.658, 0), lens shift -0.158    | (0, 1.6, -21.695) / (0, 8.269, 0), lens shift 0 |
| stop 1  | 0.2     | -34.2°  | (15.88, 2.58, -10.792) / (0, 1.625, 0), lens shift -0.127 | (15.88, 2.58, -10.792) / (0, 4.54, 0)           |
| stop 2  | 0.54    | 60.66°  | (8.741, 4.756, 15.552) / (0, 3.868, 0), lens shift -0.073 | (8.741, 4.756, 15.552) / (0, 6.308, 0)          |
| stop 3  | 0.88    | 155.52° | (-14.999, 6.932, 6.829) / (0, 6.08, 0), lens shift -0.019 | (-14.999, 6.932, 6.829) / (0, 8.076, 0)         |

Vertical field of view: 50° on desktop, 78° on the phone size (`fitFov`). Values computed by
`treeCam` from the sources (`reference/probe.json`, `cameras`).

Files (outside the repo, hashes in `manifest.sha256` there):
`~/.local/share/contes-creole-qa/flamboyant-silhouette/reference/{desktop,mobile}-{0-opening,1-stop1,2-stop2,3-stop3}-current.png`.

Measured on the published tree (`reference/probe.json`):

- bark box x -6.85..6.26, y -1.22..12.84, z -6.09..7.10; crown cards x -7.28..6.77, y 7.18..13.36;
- 59 392 bark triangles, 34 032 crown triangles; 301 thread tips, height 9.78..12.68, 0.30..6.34 m
  from the trunk axis;
- the three cards hang at 12.2 m from the axis, at y 2.88, 5.06 and 7.23; their threads run 8.46,
  6.94 and 8.18 m from the nearest tip.

Console: one 404 per fresh browser context, `favicon.ico` (no icon is declared in `index.html`;
present on `c5c6f0c`, unrelated to the tree).
