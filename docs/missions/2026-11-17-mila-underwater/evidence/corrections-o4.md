# Corrections O4 and O5 on a425401: motion, conch, nothing else broke

Product HEAD a425401 (5af99d0 living conch, a425401 fish around Mila). Builds: before = Q/c1-dist (1638c4c, plain), after = Q/o4-dist (a425401, plain). Headless GPU Chrome (hardware renderer, nice 19) for stills and frame captures; frame-rate figures only from headed GPU Chrome (section 4).

## 1. Motion of the fish (task 2)

Settings: `ONLY=motion MOTION_FROMS=6,7,8,9 VPS=desktop,mobile`, fake clock, 5 fps frames for the turns (every 200 ms from the click to 1 s after arrival) and 12 fps frames for the page loops (48 frames), mp4 at x1 and x0.25 and contact sheets; before in Q/o4/motion-before, after in Q/o4/motion-after (pages 7, 8, 9, 10 loops and turns 6->7, 7->8, 8->9, 9->10). Boards: Q/boards-o4/motion-<vp>-<p07|p08|p09>-seq.png and motion-<vp>-t07-08 / t08-09 / t09-10 (before left, after right, every 4th frame).

Facts (desktop frames at 0, 0.25, 0.5, 1, 2, 3 s of the page 8 loop and turn 7->8 frames 26 to 31; mobile boards looked at less closely):

- Page 8, before: at the start of the loop a large grey fish sits over Mila's head and body (frame 0), and a large fish crosses in front of her dress and the light at 2 s: she is hidden by fish. After: at the same frames no fish is on her; the school and the larger fish pass beside, above and below her; the school still reads as a school (many small fish with a few larger ones).
- Turn 7->8 arrival: in both builds there are few fish until the camera arrives (frames 26 and 27, 5.2 and 5.4 s), then the school appears. Before, the school looks complete by frame 28 (5.6 s) and the picture changes little after; after, the fish are still being added or growing over frames 28 to 31 (5.6 to 6.2 s) with more and larger fish at each frame. Mean absolute difference between consecutive frames (0-255, frames 28 to 32): desktop before 14.1, 14.7, 14.9 against after 16.2, 18.0, 17.3; mobile before 10.9, 10.0, 10.1, 10.4 against after 15.9, 14.2, 13.6, 12.8. So the opening of the school around her extends over the first second or more after arrival in the after build (only 1 s after arrival is captured by the turn frames; the page loops start 6 s after arrival and show the settled school); it is not one frame as before, and I did not capture a longer opening than about 1 s.
- Nothing frozen or visibly shaking or jumping in the sampled frames; fish near Mila move on beside her. The fish figures per segment from the clearance run (clearance.md) give the largest move between two frames 0.06 m on page 8 (after) against 1.09 m (before, over the whole tale), a coarse figure that is inflated in turns.
- Limits: frames are 200 ms apart (turns) or 83 ms (loops), so a one-frame jump between them or small jitter would not be seen; judged on contact sheets and selected frames, not on the mp4 played in real time.

## 2. The living conch (task 3)

Captures: `ONLY=conch` mode of qa/mila-underwater.mjs, fake clock, headless GPU Chrome; before Q/c1-dist, after Q/o4-dist; desktop 1440x900 at device scale 1 and 2, mobile 390x844 at 2 (normal) and 4. Files Q/o4/conch/<before|after>-<vp>-x<scale>-<a1|a2|a3|b-arrive|c-p09-6s|d1-leave-0.9s|d2-leave-1.8s|p08|e-p10>.png (a = 4.0, 4.5, 5.0 s into the turn 8->9; d = 0.9 and 1.8 s into 9->10). Boards: Q/boards-o4/conch-desktop.png, conch-mobile.png (before and after, normal and doubled, crops around the creature) and conch-<vp>-detail.png (arrival at the doubled scale).

Facts:

- Pages 8 and 10: the creature is not in the picture on either build (desktop stills of page 8 after 6 s and page 10 after 6 s, before and after).
- Turn 8->9: at 4.0 and 4.5 s it is not in view; at 5.0 s and at arrival it is in view at the lower left of the hollow (desktop). After 6 s on page 9 the camera has drawn in and only a cut part (stalk with its white tip and a corner of the foot) is at the bottom-left corner, on both builds. At 0.9 and 1.8 s into 9->10 it is not in view on desktop on either build; I did not find a frame in these captures where it is in view again when she leaves.
- Mobile: at arrival only a part is in view at the left edge (shell tip, foot, stalk), and after 6 s it is out of the frame on both builds.
- Before (arrival, desktop, doubled scale): the dark green shell floats above its orange foot (a gap between them), one stalk with white tip is detached from the head, the lip is turned away, the shell is dark green on the dark floor, and the pearl's glow is cut along a straight line by the sand.
- After (arrival, desktop, doubled scale): the shell is lighter green and cream, sits on the foot, which lies on the floor of the hollow; the lip with a grey and lavender inner edge faces the camera; a stalk with a white tip rises from the head at the right and is joined to it; the glow is a round halo with no straight cut. It reads clearly against the floor at normal size.
- Still wrong or unclear at the doubled scale (after): only one eye stalk is visible (the second is not seen from this side); the pink mouth is not clearly visible (the inner lip shows grey and lavender); the foot looks like a flat orange disc under the shell; I see no seam, hole, part through the sand or the shell, and no fish inside it. The mobile detail at the quadrupled scale is blocky (a rendering resolution limit of the scene), so it is not a reliable view of seams.
- Recording of its motion after: see below.

Recording (after, desktop, device scale 2, crop 480x280 CSS px at x=300, y=440, 100 ms steps from 2 s before arrival on page 9 to 4 s after): 62 frames in Q/o4/conch-rec/, mp4 Q/o4/conch-rec.mp4 at 10 fps (x1) and conch-rec-x025.mp4 (x0.25). What I see in the frames (looked at frames 0, 10, 20, 30, 40 and 61): the creature comes into view as the camera draws in, is fully in the crop from about arrival (frame 20) to about 2 s after (frame 40), seated on its foot on the hollow floor with the lip showing a grey and lavender inner edge and the stalk with two white tips rising at the right; by frame 61 the camera has moved on and it is out of the crop. The stalk's tilt differs a little between frames 20, 30 and 40, but the camera moves at the same time, so I cannot separate its own sway from the camera motion and cannot confirm a slow sway from stills; nothing pops (no jump of shape, no part appearing or vanishing) between the frames I looked at (every 100 ms was captured, only six were viewed).

## 3. Nothing else broke (task 4)

Journey (headless GPU, nice 19): desktop 24 steps, failed [], passed True, mobile 24 steps, failed [], passed True. Console messages (verbatim): desktop error: Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico; desktop error: Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico; mobile error: Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico. Only the /favicon.ico 404, as on every earlier build.

- mila: a425401 143/150 checks passed, baseline d60c1a6 143/150 checks passed; failing now but not on the baseline: none
- mila-nav: a425401 87/110 checks passed, baseline d60c1a6 87/110 checks passed; failing now but not on the baseline: none
- mila-lang: a425401 48/60 checks passed, baseline d60c1a6 48/60 checks passed; failing now but not on the baseline: none
- failures other than the favicon `no-errors` checks: ['FAIL kannot-mobile swipe']

Durations of the five turns (ms, real clock; c1 1638c4c vs a425401, 2 contexts per viewport):

| viewport | transition | 1638c4c     | a425401     | delta of means |
| -------- | ---------- | ----------- | ----------- | -------------- |
| desktop  | 6->7       | 7647 / 7647 | 7651 / 7649 | +3.0           |
| desktop  | 7->8       | 5431 / 5445 | 5431 / 5447 | +1.0           |
| desktop  | 8->9       | 5430 / 5447 | 5447 / 5447 | +8.5           |
| desktop  | 9->10      | 5847 / 5845 | 5831 / 5847 | -7.0           |
| desktop  | 10->11     | 7647 / 7647 | 7646 / 7631 | -8.5           |
| mobile   | 6->7       | 7684 / 7679 | 7675 / 7690 | +1.0           |
| mobile   | 7->8       | 5479 / 5479 | 5480 / 5480 | +1.0           |
| mobile   | 8->9       | 5479 / 5481 | 5482 / 5481 | +1.5           |
| mobile   | 9->10      | 5880 / 5879 | 5878 / 5881 | +0.0           |
| mobile   | 10->11     | 7681 / 7681 | 7679 / 7680 | -1.5           |

Largest absolute difference of means: 8.5 ms.

## 4. Frame rate (headed GPU Chrome, nice 19)

WebGL renderer ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2), chromium 157.0.8103.78, headed=True; nvidia-smi samples in Q/o4-perf/*/nvidia-smi.txt. Protocol: `perf` mode, passes capped.desktop and capped.mobile, 1 run per invocation, alternating 1638c4c (C) and a425401 (O) three times; each run: cold and warm load, walk to page 6, 3 s warm-up, 20 s on page 7, 20 s on page 9, the transitions. Cells: median FPS/mean/p95 ms/p99 ms/max ms/frames>33/frames>50 (median of 3 runs).

| pass.viewport  | segment                | 1638c4c                        | a425401                        | median FPS % | p95 % | flag                                  |
| -------------- | ---------------------- | ------------------------------ | ------------------------------ | ------------ | ----- | ------------------------------------- |
| capped.desktop | page 7                 | 59.88/59.84/16.8/17/20.8/0/0   | 59.88/59.84/16.8/16.9/34.5/1/0 | 0.0          | 0.0   | frames >33 ms where baseline had none |
| capped.desktop | page 9                 | 59.88/59.8/16.8/17/20.4/0/0    | 59.88/59.79/16.8/16.9/33.4/2/0 | 0.0          | 0.0   | frames >33 ms where baseline had none |
| capped.desktop | transitions all        | 59.88/59.83/16.8/16.9/34.2/1/0 | 59.88/59.86/16.8/16.9/33.4/1/0 | 0.0          | 0.0   | no                                    |
| capped.desktop | transitions underwater | 59.88/59.78/16.8/17/33.4/1/0   | 59.88/59.84/16.8/16.9/25.5/0/0 | 0.0          | 0.0   | no                                    |
| capped.desktop | 6->7                   | 59.88/59.89/16.8/17.1/18.3/0/0 | 59.88/59.89/16.8/16.9/21.7/0/0 | 0.0          | 0.0   | no                                    |
| capped.mobile  | page 7                 | 59.88/59.89/16.8/17/18.5/0/0   | 59.88/59.84/16.8/17.3/23.8/0/0 | 0.0          | 0.0   | no                                    |
| capped.mobile  | page 9                 | 59.88/59.89/16.8/17/21.9/0/0   | 59.88/59.79/16.8/17.2/23.2/0/0 | 0.0          | 0.0   | no                                    |
| capped.mobile  | transitions all        | 59.88/59.9/16.8/17/22.1/0/0    | 59.88/59.9/16.8/17.1/24.9/0/0  | 0.0          | 0.0   | no                                    |
| capped.mobile  | transitions underwater | 59.88/59.92/16.8/17/18/0/0     | 59.88/59.89/16.8/17.2/19.6/0/0 | 0.0          | 0.0   | no                                    |
| capped.mobile  | 6->7                   | 59.88/59.89/16.8/17/18.7/0/0   | 59.88/59.89/16.8/17/18.2/0/0   | 0.0          | 0.0   | no                                    |

- capped.desktop 1638c4c: draw calls p7/p9 295.3/307.7, triangles 717514/815767, programs 66, data-quality p7/p9 ['2', '2', '1']/['2', '2', '1']
- capped.desktop a425401: draw calls p7/p9 295.3/309.5, triangles 717515/829443, programs 66, data-quality p7/p9 ['1', '2', '2']/['1', '2', '2']
- capped.mobile 1638c4c: draw calls p7/p9 163/159.2, triangles 379716/423397, programs 56, data-quality p7/p9 ['2', '2', '2']/['2', '2', '2']
- capped.mobile a425401: draw calls p7/p9 163/159.6, triangles 379693/423624, programs 56, data-quality p7/p9 ['2', '2', '2']/['2', '2', '2']

Page 9 cost of the new per-frame work, `longframes` variants B1 (1638c4c) and B2 (a425401), uncapped headed, 3 runs each (3 s warm-up, 20 s):

| variant | mean fps                 | median fps            | p95 ms          | p99 ms           | max ms              | frames >33   | frames >50 | mean callback ms                     | draw calls |
| ------- | ------------------------ | --------------------- | --------------- | ---------------- | ------------------- | ------------ | ---------- | ------------------------------------ | ---------- |
| 1638c4c | 497.81 / 484.63 / 446.87 | 588.24 / 588.24 / 500 | 2.4 / 2.6 / 3   | 7.4 / 12.2 / 9.1 | 228.2 / 54.2 / 54.4 | 20 / 19 / 10 | 10 / 7 / 4 | 1.906 / 1.961 / 2.112 (median 1.961) | 309        |
| a425401 | 375.85 / 386.52 / 336.26 | 384.62 / 400 / 344.83 | 3.3 / 3.1 / 3.6 | 3.8 / 3.4 / 4.1  | 7.2 / 6.2 / 8.7     | 0 / 0 / 0    | 0 / 0 / 0  | 2.534 / 2.476 / 2.831 (median 2.534) | 310.5      |

Flags (rule: more than 10 % loss, or a new p95 hitch):

- Capped (what a 60 Hz viewer gets): median FPS 59.88 on both builds and both viewports; p95 16.8 ms in all rows; no loss. Two flags by the earlier rule on capped desktop (page 7: 1 frame at 34.5 ms; page 9: 2 frames at 33.4 and 33.x ms, none on 1638c4c in this round); single 33 to 35 ms frames of this size also occurred on 1638c4c in earlier headed rounds, so with 3 runs they are not separated from noise. No p95 hitch.
- data-quality: "1" (not "2") appeared in one capped desktop run of each build (1638c4c run 3, a425401 run 1) and "2" in the others; mobile "2" in all runs. It is the same adaptive switch on both builds; reported as observed.
- Uncapped page 9 (the direct cost of the new per-frame work): mean rAF callback 1.961 to 2.534 ms (median of 3, about +29 %), mean frame rate 485 to 376 fps (median, about -22 %), p95 2.6 to 3.3 ms. This is a loss over 10 % in uncapped frame rate, flagged, with no effect on the capped rate. In the same runs the frames over 33 ms went from 20, 19 and 10 per run on 1638c4c (maximum 228 ms) to 0, 0, 0 on a425401 (maximum 8.7 ms), and p99 from 7.4 to 12.2 ms to 3.4 to 4.1 ms. I did not investigate why; the earlier round C attributed the 1638c4c stalls to blocking native WebGL calls, and a lower uncapped rate is consistent with the thread no longer racing ahead of the GPU (inference).
- Draw calls and programs unchanged (295/309 draw calls desktop, 163/160 mobile; 66 and 56 programs). Triangles on page 9 desktop 815767 to 829443 (+1.7 %), mobile unchanged.
