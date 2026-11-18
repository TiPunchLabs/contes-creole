# Round c2: measurements of 7ea9a48 (corrections cycle 2)

Build 7ea9a48 (Q/c2-dist, plain; the src/ tree of branch HEAD 2e04279 is identical, 2e04279 only adds qa files). Before for the stills = a425401 (Q/o4-dist). Clearance (task 2) is in clearance.md and leak-c2.md for task 3; this file is tasks 4 to 6.

## Perf, one headed capped run (task 4)

WebGL renderer ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2), chromium 157.0.8103.78, headed=True; nice 19; passes capped desktop and capped mobile, ONE run, no series. Cells: median FPS/mean/p95 ms/p99 ms/max ms/frames>33 ms/frames>50 ms.

| pass.viewport  | segment                | cells                          |
| -------------- | ---------------------- | ------------------------------ |
| capped.desktop | page 7                 | 59.88/59.79/16.8/16.8/33.4/2/0 |
| capped.desktop | page 9                 | 59.88/59.9/16.8/16.8/18.6/0/0  |
| capped.desktop | transitions all        | 59.88/59.83/16.8/16.8/33.4/2/0 |
| capped.desktop | transitions underwater | 59.88/59.83/16.8/16.8/33.4/1/0 |
| capped.desktop | 6->7                   | 59.88/59.76/16.8/16.8/33.4/1/0 |
| capped.mobile  | page 7                 | 57.47/58.22/18.2/18.5/21.2/0/0 |
| capped.mobile  | page 9                 | 57.47/57.88/18.2/18.4/18.7/0/0 |
| capped.mobile  | transitions all        | 57.47/57.82/18.2/18.5/21.3/0/0 |
| capped.mobile  | transitions underwater | 57.47/57.86/18.2/18.4/21.3/0/0 |
| capped.mobile  | 6->7                   | 57.47/57.68/18.3/18.7/18.9/0/0 |

- capped.desktop: draw calls p7/p9 295.3/309.7, triangles 717514/829510, programs 66, data-quality p7/p9 2/2, pixel ratio 1, run 131 s
- capped.mobile: draw calls p7/p9 163/159.5, triangles 379705/423486, programs 56, data-quality p7/p9 2/2, pixel ratio 1.4, run 131 s

nvidia-smi sample taken while the page rendered (chrome GPU process lines; raw text Q/c2-perf/nvidia-smi.txt):

    2604274, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platf
    2604274, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platf

Notes: the first attempt of this perf run failed at the warm reload (a 30 s timeout waiting for page 1; the run was stopped and repeated once with the same command, which completed); the figures are from the completed run. Capped desktop shows 2 frames at 33.4 ms on page 7 (single frames of this size appear in earlier headed rounds); capped mobile has a median of 57.47 FPS and p95 18.2 ms in this one run (earlier headed mobile runs gave 59.88 FPS), so a single run cannot say whether this is noise.
The uncapped page-9 longframes pair was dropped (round cut short by the coordinator).

## Functional (task 5)

Journey (headless GPU, nice 19): desktop 24 steps, failed [], passed True, mobile 24 steps, failed [], passed True. Console (verbatim): desktop error: Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico; desktop error: Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico; mobile error: Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico.

- mila: 7ea9a48 143/150 checks passed, baseline d60c1a6 143/150 checks passed; failing now but not on the baseline: none
- mila-nav.mjs and mila-lang.mjs were not run to the end: the round was cut short while mila-nav was running, so their results are dropped.
- failures other than the favicon `no-errors` checks: none

Turn durations (ms, real clock, 2 contexts per viewport; a425401 vs 7ea9a48):

| viewport | transition | a425401     | 7ea9a48     | delta of means |
| -------- | ---------- | ----------- | ----------- | -------------- |
| desktop  | 6->7       | 7651 / 7649 | 7644 / 7643 | -6.5           |
| desktop  | 7->8       | 5431 / 5447 | 5428 / 5431 | -9.5           |
| desktop  | 8->9       | 5447 / 5447 | 5447 / 5444 | -1.5           |
| desktop  | 9->10      | 5831 / 5847 | 5846 / 5847 | +7.5           |
| desktop  | 10->11     | 7646 / 7631 | 7649 / 7645 | +8.5           |
| mobile   | 6->7       | 7675 / 7690 | 7679 / 7684 | -1.0           |
| mobile   | 7->8       | 5480 / 5480 | 5464 / 5481 | -7.5           |
| mobile   | 8->9       | 5482 / 5481 | 5462 / 5480 | -10.5          |
| mobile   | 9->10      | 5878 / 5881 | 5879 / 5880 | +0.0           |
| mobile   | 10->11     | 7679 / 7680 | 7681 / 7681 | +1.5           |

Largest absolute difference of means: 10.5 ms.

## Stills: living conch and crab (task 6)

Captures: modes `conch` and `crab` of qa/mila-underwater.mjs, fake clock, headless GPU Chrome, nice 19; before Q/o4-dist (a425401, port 4198), after Q/c2-dist (7ea9a48, port 4197); desktop 1440x900 at scale 1 and 2, mobile 390x844 at scale 2 and 4. Files Q/c2/conch/<before|after>-<vp>-x<scale>-<a1|a2|a3|b-arrive|c-p09-6s|d1-leave-0.9s|d2-leave-1.8s|p08|e-p10>.png and Q/c2/crab/<before|after>-<vp>-x<scale>-crab-<p05|t1|t2|t3|t4>.png (t1 to t4 = 1.0, 2.5, 4.0, 6.0 s after the press on page 5; the debris are cleared by that press and the crab walks, so these frames are the turn 5 -> 6 as the driver reaches it). Boards: Q/boards-c2/conch-desktop.png, conch-mobile.png (a3, arrival and page 9 after 6 s at normal scale, arrival at the doubled scale; before on top, after below) and crab-desktop.png, crab-mobile.png (page 5 at both scales, t2 and t3 at the doubled scale, matched crops).

Living conch (arrival on page 9, desktop, doubled scale, enlarged on the foot):

- Both builds show the same shell on its orange foot with the lip's grey and lavender edge and the stalk with two white tips; the after foot is slightly lower and longer under the shell and its underside is a little tilted. At this lighting the sea floor under the creature is almost black, so there is no visible sand line to judge a gap or a sinking by eye: I cannot see a gap under the foot in either build and cannot see it sunk. The proof of contact is the clearance run: liveConch-ground closest approach +0.055 m (a gap) on the before build 1638c4c and -0.008 m (8 mm into the ground, inside the 0.02 m tolerance) on 7ea9a48.
- On mobile the creature is only partly in view at arrival and out of frame after 6 s on both builds, as before.

Crab (page 5):

- Settled page 5, doubled scale (desktop and mobile): the crab's shell sits visibly higher in the after build, with a strip of shadow between the shell's underside and the sand; in the before build the shell underside is nearly on the sand. The leg tips reach the sand and their shadows in both builds; I see no foot floating above its shadow in the after frames. No overlap of shell and sand is visible after.
- During the walk (t2 and t3, doubled scale): the crab walks with its shell clear of the sand and its leg tips at the sand in the after frames; the lowest tips end at their shadows. At t3 on desktop the camera is close and the near legs still reach the sand. No pop between frames seen at the 1.5 s steps.
- Limits: four frames after the press, not a continuous recording; the debris were cleared by the press on both builds (the crab walks in all t frames), so the page-5 frame shows the debris still in place.

## Dropped or not done (round cut short)

- Dropped: qa/mila-nav.mjs and qa/mila-lang.mjs on 7ea9a48 (mila-nav was stopped at its fifth check; its partial log is in Q/c2-regress/mila-nav.log and is not a result), and the uncapped page-9 longframes pair.
- Kept although the cut came later: the turn-duration comparison and the conch and crab stills, which had finished before the cut.
- Before clearance runs and boards: done (clearance.md), as are the leak series (leak-c2.md) and the journey.
