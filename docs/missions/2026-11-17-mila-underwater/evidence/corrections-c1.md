# Round c1: product 1638c4c against f645de0 and baseline d60c1a6 (functional)

Build 1638c4c26c2a433970522f672650a23447e3fe8b (Q/c1-dist). Change since f645de0: at the 10->11 exit Mila rights herself while still swimming, about 3 m before the shallows. Headless GPU Chrome, nice 19, fake clock for frames; LABEL c1-1638c4c; folders Q/c1, Q/c1-regress, Q/boards-c1. Frame capture for this round used MOTION_FROMS=6,10 MOTION_SEQ=0 (only the 6->7 and 10->11 turns are captured; the walk between them is plain), so ambient motion phase can differ from the earlier full-flow runs; the scripted camera and Mila paths are tied to the click.

## Journey

| viewport | steps | failed | passed |
| -------- | ----- | ------ | ------ |
| desktop  | 24    | []     | True   |
| mobile   | 24    | []     | True   |

Console (verbatim; new = not present on baseline):

- desktop error (page 0): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
- desktop error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
- mobile error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico

## Transition durations (ms, real clock, 2 contexts per viewport)

| viewport | transition | baseline    | f645de0     | 1638c4c     | max abs delta of means vs baseline / vs f645de0 |
| -------- | ---------- | ----------- | ----------- | ----------- | ----------------------------------------------- |
| desktop  | 6->7       | 7650 / 7644 | 7644 / 7631 | 7647 / 7647 | 0.0 / 9.5                                       |
| desktop  | 7->8       | 5445 / 5447 | 5447 / 5447 | 5431 / 5445 | 8.0 / 9.0                                       |
| desktop  | 8->9       | 5448 / 5446 | 5445 / 5431 | 5430 / 5447 | 8.5 / 0.5                                       |
| desktop  | 9->10      | 5845 / 5846 | 5847 / 5846 | 5847 / 5845 | 0.5 / 0.5                                       |
| desktop  | 10->11     | 7647 / 7647 | 7647 / 7646 | 7647 / 7647 | 0.0 / 0.5                                       |
| mobile   | 6->7       | 7689 / 7686 | 7677 / 7678 | 7684 / 7679 | 6.0 / 4.0                                       |
| mobile   | 7->8       | 5479 / 5465 | 5480 / 5480 | 5479 / 5479 | 7.0 / 1.0                                       |
| mobile   | 8->9       | 5481 / 5461 | 5464 / 5464 | 5479 / 5481 | 9.0 / 16.0                                      |
| mobile   | 9->10      | 5878 / 5879 | 5864 / 5880 | 5880 / 5879 | 1.0 / 7.5                                       |
| mobile   | 10->11     | 7679 / 7681 | 7678 / 7681 | 7681 / 7681 | 1.0 / 1.5                                       |

Largest absolute difference of means: 9.0 ms vs baseline, 16.0 ms vs f645de0.

## Regression suites

- mila: 1638c4c 143/150 checks passed; baseline 143/150 checks passed; failing now but not on baseline: none; failing on baseline but not now: none
- mila-nav: 1638c4c 87/110 checks passed; baseline 87/110 checks passed; failing now but not on baseline: none; failing on baseline but not now: none
- mila-lang: 1638c4c 48/60 checks passed; baseline 48/60 checks passed; failing now but not on baseline: none; failing on baseline but not now: none
- failures other than the favicon 404 `no-errors` checks: ['FAIL kannot-mobile swipe']

## Frame descriptions, 10->11, 2.8 to 4.8 s (desktop boards; mobile board shows the same sequence)

Read from boards-c1/desktop-t10-11.png and a zoom of frames 2.8, 3.2, 3.6, 4.0, 4.4, 4.8 s. Feet and legs under the water cannot be seen through the water surface in these frames.

- d60c1a6 (baseline): at 2.8 s she lies flat on the water surface (head and dress, horizontal). At 3.2 s she is tilted forward, still near horizontal, with her legs trailing behind her above the water. At 3.6 s she is leaning and nearly upright with the body above the water, standing at the shallows at about 4.0 s, upright and walking on the sand from 4.4 s. This is the "lying, legs in the air" look the owner corrected.
- f645de0: from 2.8 to 3.4 s only her dark hair is visible at the waterline (a small dark shape that can read as a rock); at 3.8 s a pale, translucent dress appears below the head; at 4.0 s she is nearly upright in the shallows with the lower dress faded through the water; upright and walking from 4.4 s. No legs in the air, no jump in height seen at this sampling (200 ms).
- 1638c4c: the same hair-only look at 2.8 to 3.2 s; at 3.6 s the head and the top of the yellow dress are visible and she looks upright already (earlier than f645de0, whose body is still hidden at 3.6 s); at 4.0 s upright wading with the lower dress still faded; upright and walking from 4.4 s. No legs in the air, no sliding-upright pose and no jump seen at 200 ms sampling.
- Oddities seen in both corrected builds: the hair-only moment (2.8 to 3.4 s) and the translucent lower dress while wading. Limits: 200 ms frames and 280 px thumbnails; fast jumps between frames would not be seen.

## 6->7, f645de0 against 1638c4c (2.0 to 4.6 s)

The 6->7 frames are the same within noise. Mean absolute pixel difference between f645de0 and 1638c4c frames 2.0 to 4.6 s (every 200 ms, frames downscaled to 320x200, 0-255 scale): desktop 0.05 to 0.11, mobile 0.00 on all 14 frames. So the entry looks unchanged (boards-c1/desktop-t06-07.png and mobile-t06-07.png, rows 1-2 f645de0, rows 3-4 1638c4c).

## Boards and recordings

- boards-c1/desktop-t06-07.png
- boards-c1/desktop-t10-11.png
- boards-c1/mobile-t06-07.png
- boards-c1/mobile-t10-11.png

- c1/desktop-t06-07-x025.mp4
- c1/desktop-t06-07.mp4
- c1/desktop-t10-11-x025.mp4
- c1/desktop-t10-11.mp4
- c1/mobile-t06-07-x025.mp4
- c1/mobile-t06-07.mp4
- c1/mobile-t10-11-x025.mp4
- c1/mobile-t10-11.mp4
