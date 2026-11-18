# Corrections round: product f645de0 (owner corrections O1 to O3) against baseline d60c1a6

Build f645de058f6ac4f451021b83ec0afa47d2ce49a7 (Q/o-dist). Changes since 3d09931: Mila wades on the bottom to chest depth then swims just under the surface at the 6->7 entry and the 10->11 exit; the turtle on page 7 is scaled to 0.6. The 3-run headed table at 3d09931 is in perf.md; this file is a confirmation round only (LABEL o-f645de0, folders Q/o, Q/o-regress, Q/o-perf, Q/boards-o).

## Journey (headless GPU Chrome, nice 19, desktop and mobile)

| viewport | steps | failed | passed |
| -------- | ----- | ------ | ------ |
| desktop  | 24    | []     | True   |
| mobile   | 24    | []     | True   |

Console messages (verbatim), and any not present on the baseline:

- desktop error (page 0): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
- desktop error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico
- mobile error (page 1): Failed to load resource: the server responded with a status of 404 (Not Found) http://localhost:4197/favicon.ico

## Regression suites (qa/mila.mjs, mila-nav.mjs, mila-lang.mjs)

- mila: f645de0 143/150 checks passed; baseline 143/150 checks passed; failing now but not on baseline: none; failing on baseline but not now: none
- mila-nav: f645de0 87/110 checks passed; baseline 87/110 checks passed; failing now but not on baseline: none; failing on baseline but not now: none
- mila-lang: f645de0 48/60 checks passed; baseline 48/60 checks passed; failing now but not on baseline: none; failing on baseline but not now: none
- failing assertions other than the favicon 404 `no-errors` checks: ['FAIL kannot-mobile swipe']

## Transition durations (real clock, ms, click to new page text; 2 contexts per viewport)

| viewport | transition | baseline    | f645de0     | delta of means |
| -------- | ---------- | ----------- | ----------- | -------------- |
| desktop  | 6->7       | 7650 / 7644 | 7644 / 7631 | -9.5           |
| desktop  | 7->8       | 5445 / 5447 | 5447 / 5447 | +1.0           |
| desktop  | 8->9       | 5448 / 5446 | 5445 / 5431 | -9.0           |
| desktop  | 9->10      | 5845 / 5846 | 5847 / 5846 | +1.0           |
| desktop  | 10->11     | 7647 / 7647 | 7647 / 7646 | -0.5           |
| mobile   | 6->7       | 7689 / 7686 | 7677 / 7678 | -10.0          |
| mobile   | 7->8       | 5479 / 5465 | 5480 / 5480 | +8.0           |
| mobile   | 8->9       | 5481 / 5461 | 5464 / 5464 | -7.0           |
| mobile   | 9->10      | 5878 / 5879 | 5864 / 5880 | -6.5           |
| mobile   | 10->11     | 7679 / 7681 | 7678 / 7681 | -0.5           |

Largest absolute difference of means: 10.0 ms (unchanged within that).

## Late shader builds (headed uncapped desktop walk 1 -> 11)

links before Page 01 shown: 97; after: 0; per page: {} (3d09931: 0 after, baseline: 13).

## Perf, 1 run per build, confirmation only; the 3-run table at 3d09931 is in perf.md

Headed GPU Chrome (chromium 157.0.8103.78, headed=True), WebGL renderer ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2), nice 19, alternating B then F, passes capped desktop, capped mobile, uncapped desktop. One run per build, so medians are single values and the uncapped rows are noisy. Cells: medianFPS/meanFPS/p95 ms/p99 ms/max ms/frames>33/frames>50.

| pass.viewport    | segment                | baseline                        | f645de0                            | flag                                                                                                |
| ---------------- | ---------------------- | ------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| uncapped.desktop | page 7                 | 625/512.54/2.3/12.1/54.2/24/9   | 714.29/500.96/2.3/15.8/87.8/25/17  | no                                                                                                  |
| uncapped.desktop | page 9                 | 416.67/413.11/2.8/3.2/6.7/0/0   | 666.67/501.48/2.4/14.2/70.9/32/21  | frames >33 ms where baseline had none; frames >50 ms where baseline had none; max 70.9 ms vs 6.7 ms |
| uncapped.desktop | transitions all        | 588.24/497.81/2.6/12/71/22/7    | 714.29/495.33/2.7/18.4/140.8/43/25 | no                                                                                                  |
| uncapped.desktop | transitions underwater | 555.56/478.3/2.7/8.9/71/10/4    | 714.29/476.81/2.9/18.5/140.8/27/16 | no                                                                                                  |
| uncapped.desktop | 6->7                   | 666.67/496.77/2.7/18.3/53.9/7/2 | 769.23/491.52/5.8/18.5/86.8/5/5    | no                                                                                                  |
| capped.desktop   | page 7                 | 59.88/59.74/16.9/17.2/34.5/2/0  | 59.88/59.84/16.9/17.2/33.3/1/0     | no                                                                                                  |
| capped.desktop   | page 9                 | 59.88/59.89/16.8/17.1/20/0/0    | 59.88/59.84/16.8/17/34.5/1/0       | frames >33 ms where baseline had none                                                               |
| capped.desktop   | transitions all        | 59.88/59.9/16.8/17.1/20.5/0/0   | 59.88/59.86/16.8/17.1/33.4/1/0     | frames >33 ms where baseline had none                                                               |
| capped.desktop   | transitions underwater | 59.88/59.9/16.8/17.1/20.5/0/0   | 59.88/59.9/16.8/17/19.4/0/0        | no                                                                                                  |
| capped.desktop   | 6->7                   | 59.88/59.89/16.9/17.2/17.4/0/0  | 59.88/59.89/16.9/17.1/17.3/0/0     | no                                                                                                  |
| capped.mobile    | page 7                 | 59.88/59.9/17/17.2/17.7/0/0     | 59.88/59.89/17/17.3/17.6/0/0       | no                                                                                                  |
| capped.mobile    | page 9                 | 59.88/59.89/16.9/17.2/17.7/0/0  | 59.88/59.89/17/17.3/17.8/0/0       | no                                                                                                  |
| capped.mobile    | transitions all        | 59.88/59.9/17/17.3/17.9/0/0     | 59.88/59.89/17/17.3/17.9/0/0       | no                                                                                                  |
| capped.mobile    | transitions underwater | 59.88/59.9/17/17.3/17.9/0/0     | 59.88/59.9/17/17.3/17.4/0/0        | no                                                                                                  |
| capped.mobile    | 6->7                   | 59.88/59.9/16.9/17.3/17.7/0/0   | 59.88/59.89/16.9/17.2/17.6/0/0     | no                                                                                                  |

data-quality (real clock, after 20 s): uncapped.desktop: p7=2 p9=2, capped.desktop: p7=2 p9=2, capped.mobile: p7=2 p9=2

Draw calls / triangles / programs at page 7 and 9 (f645de0): uncapped.desktop: dc 295.4/308.6, tri 717521/816642, programs 66/66; capped.desktop: dc 295.3/307.7, tri 717512/815760, programs 66/66; capped.mobile: dc 163/159.5, tri 379700/423482, programs 56/56

nvidia-smi sample (raw: o-perf/*/nvidia-smi.txt in Q; chrome GPU process lines):

    1948508, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platform=waylan
    1951541, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platform=waylan
    1951541, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platform=waylan
    1957382, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platform=waylan
    1960429, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platform=waylan
    1960429, /opt/google/chrome/chrome --type=gpu-process --gpu-recent-crash-count=0 --no-sandbox --disable-dev-shm-usage --disable-breakpad --ozone-platform=waylan

## Boards (Q/boards-o/)

- desktop-p07-turtle-frame000.png
- desktop-t06-07.png
- desktop-t10-11.png
- mobile-p07-turtle-frame000.png
- mobile-t06-07.png
- mobile-t10-11.png

## Recordings of the two transitions (Q/o/, x1 and x0.25 speed; frames in the folders of the same name)

- o/desktop-t06-07-x025.mp4
- o/desktop-t06-07.mp4
- o/desktop-t10-11-x025.mp4
- o/desktop-t10-11.mp4
- o/mobile-t06-07-x025.mp4
- o/mobile-t06-07.mp4
- o/mobile-t10-11-x025.mp4
- o/mobile-t10-11.mp4

Turtle on page 7: in view at frame 000 on both viewports, boards-o/<vp>-p07-turtle-frame000.png (before | after).

## Notes

- Capped desktop shows a single 33 to 35 ms frame on page 9 and in the transitions of the f645de0 run (the baseline run had none there, but the 3d09931 round showed the same kind of isolated frame on the baseline); one run per build cannot separate that from noise. The uncapped desktop page 9 flag repeats the pattern already reported at 3d09931 (long frames in headed uncapped mode, higher mean FPS).
- Frames (boards-o, 2.0 to 4.6 s): at 6->7 the wading Mila is partly translucent and pale from about 2.4 to 3.2 s, only her hair is visible at about 3.4 to 3.6 s (a small dark shape that can read as a rock, desktop and mobile), then she appears swimming under the surface at 3.8 s. At 10->11 only her head is visible from about 2.8 to 3.4 s, then the body at 3.8 s. No frame shows her feet above the water. The turtle on page 7 is smaller, partly behind the grass, and does not overlap Mila.
