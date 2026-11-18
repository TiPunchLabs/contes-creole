# Mila's height against the sea floor on the entry (6 to 7) and the exit (10 to 11)

Reading note added in correction cycle 1 (2026-11-18). This replay is a simplified model: it places her feet's height and a swim weight, not her rendered body, and its "after" columns describe `f645de0`. The 3 frames it still flags on the exit are the frames 0.14 to 0.19 s after her feet meet the bottom (about 4.06 to 4.11 s here): the swim weight is still above 0.5 while the beach has already lifted her hips to the surface. They were the visible edge of a real fault that this model under-counted, because her body's tilt eases separately and more slowly than the swim weight: measured in the running scene, `f645de0` has 28 frames in which she lies forward with her hips above the surface (`exit-probe.md`). Fixed in `1638c4c`; the figures that count for the exit are those of `exit-probe.md`, not the ones below.

Offline replay of the scene's own formulas (`groundH`, the centripetal Catmull-Rom path of `MILA_VIA`, `easeIO`, the swim weight eased at 3.6 a second) at 60 steps a second. Before: the rule at `3d09931` (`WADE`). After: `milaHeight` and `STAND_DEPTH` from `src/books/mila/world/scene.ts`. Heights in metres, the sea's surface at 0. A fault is: upright with her feet more than 0.15 m above the floor, or stretched out with her body (0.62 m above her feet's height) above the sea. Produced by a scratch simulation (`qa/out/dive-sim.ts.txt`, git-ignored), run through vitest.

### 6>7 (7.6 s, 60 steps a second, every 0.2 s shown)

| t s | path y | sea floor | before: feet y | before: pose | before: fault                               | after: feet y | after: pose  | after: fault |
| --- | ------ | --------- | -------------- | ------------ | ------------------------------------------- | ------------- | ------------ | ------------ |
| 0.0 | 0.04   | 0.04      | 0.04           | stands       |                                             | 0.04          | stands       |              |
| 0.2 | 0.04   | 0.04      | 0.04           | stands       |                                             | 0.04          | stands       |              |
| 0.4 | 0.04   | 0.02      | 0.02           | stands       |                                             | 0.02          | stands       |              |
| 0.6 | 0.04   | -0.01     | -0.01          | stands       |                                             | -0.01         | stands       |              |
| 0.8 | 0.03   | -0.05     | -0.05          | stands       |                                             | -0.05         | stands       |              |
| 1.0 | 0.02   | -0.10     | -0.10          | stands       |                                             | -0.10         | stands       |              |
| 1.2 | 0.02   | -0.17     | -0.17          | stands       |                                             | -0.17         | stands       |              |
| 1.4 | 0.01   | -0.24     | -0.24          | stands       |                                             | -0.24         | stands       |              |
| 1.6 | 0.01   | -0.31     | -0.31          | stands       |                                             | -0.31         | stands       |              |
| 1.8 | 0.00   | -0.40     | -0.40          | stands       |                                             | -0.40         | stands       |              |
| 2.0 | -0.00  | -0.49     | -0.49          | stands       |                                             | -0.49         | stands       |              |
| 2.2 | -0.01  | -0.60     | -0.60          | stands       |                                             | -0.60         | stands       |              |
| 2.4 | -0.03  | -0.71     | -0.59          | turning 0.46 |                                             | -0.71         | stands       |              |
| 2.6 | -0.06  | -0.83     | -0.30          | turning 0.74 | swimming with her body 0.32 m above the sea | -0.83         | stands       |              |
| 2.8 | -0.10  | -0.95     | -0.10          | turning 0.38 | upright 0.86 m above the floor              | -0.85         | turning 0.46 |              |
| 3.0 | -0.16  | -1.11     | -0.16          | turning 0.18 | upright 0.94 m above the floor              | -0.85         | turning 0.74 |              |
| 3.2 | -0.33  | -1.37     | -0.33          | turning 0.40 | upright 1.04 m above the floor              | -0.85         | turning 0.88 |              |
| 3.4 | -0.55  | -1.63     | -0.55          | turning 0.71 | swimming with her body 0.07 m above the sea | -0.85         | swims        |              |
| 3.6 | -0.82  | -1.90     | -0.82          | turning 0.86 |                                             | -0.85         | swims        |              |
| 3.8 | -1.12  | -2.18     | -1.12          | swims        |                                             | -1.12         | swims        |              |
| 4.0 | -1.44  | -2.48     | -1.44          | swims        |                                             | -1.44         | swims        |              |
| 4.2 | -1.77  | -2.82     | -1.77          | swims        |                                             | -1.77         | swims        |              |
| 4.4 | -2.08  | -3.17     | -2.08          | swims        |                                             | -2.08         | swims        |              |
| 4.6 | -2.37  | -3.55     | -2.37          | swims        |                                             | -2.37         | swims        |              |
| 4.8 | -2.80  | -4.23     | -2.80          | swims        |                                             | -2.80         | swims        |              |
| 5.0 | -3.23  | -4.85     | -3.23          | swims        |                                             | -3.23         | swims        |              |
| 5.2 | -3.65  | -5.21     | -3.65          | swims        |                                             | -3.65         | swims        |              |
| 5.4 | -4.04  | -5.71     | -4.04          | swims        |                                             | -4.04         | swims        |              |
| 5.6 | -4.41  | -6.04     | -4.41          | swims        |                                             | -4.41         | swims        |              |
| 5.8 | -4.76  | -6.41     | -4.76          | swims        |                                             | -4.76         | swims        |              |
| 6.0 | -5.07  | -6.69     | -5.07          | swims        |                                             | -5.07         | swims        |              |
| 6.2 | -5.36  | -6.85     | -5.36          | swims        |                                             | -5.36         | swims        |              |
| 6.4 | -5.60  | -7.08     | -5.60          | swims        |                                             | -5.60         | swims        |              |
| 6.6 | -5.82  | -7.25     | -5.82          | swims        |                                             | -5.82         | swims        |              |
| 6.8 | -6.00  | -7.32     | -6.00          | swims        |                                             | -6.00         | swims        |              |
| 7.0 | -6.13  | -7.38     | -6.13          | swims        |                                             | -6.13         | swims        |              |
| 7.2 | -6.23  | -7.45     | -6.23          | swims        |                                             | -6.23         | swims        |              |
| 7.4 | -6.29  | -7.49     | -6.29          | swims        |                                             | -6.29         | swims        |              |
| 7.6 | -6.31  | -7.51     | -6.31          | swims        |                                             | -6.31         | swims        |              |

Frames with a fault (of 457): before 60 (1.00 s), after 0. Largest change of height in one frame: before 0.038 m, after 0.038 m.

### 10>11 (7.6 s, 60 steps a second, every 0.2 s shown)

| t s | path y | sea floor | before: feet y | before: pose | before: fault                               | after: feet y | after: pose  | after: fault |
| --- | ------ | --------- | -------------- | ------------ | ------------------------------------------- | ------------- | ------------ | ------------ |
| 0.0 | -2.50  | -6.05     | -2.50          | swims        |                                             | -2.50         | swims        |              |
| 0.2 | -2.49  | -6.05     | -2.49          | swims        |                                             | -2.49         | swims        |              |
| 0.4 | -2.46  | -6.02     | -2.46          | swims        |                                             | -2.46         | swims        |              |
| 0.6 | -2.41  | -5.99     | -2.41          | swims        |                                             | -2.41         | swims        |              |
| 0.8 | -2.33  | -5.94     | -2.33          | swims        |                                             | -2.33         | swims        |              |
| 1.0 | -2.24  | -5.87     | -2.24          | swims        |                                             | -2.24         | swims        |              |
| 1.2 | -2.12  | -5.74     | -2.12          | swims        |                                             | -2.12         | swims        |              |
| 1.4 | -1.98  | -5.52     | -1.98          | swims        |                                             | -1.98         | swims        |              |
| 1.6 | -1.83  | -5.22     | -1.83          | swims        |                                             | -1.83         | swims        |              |
| 1.8 | -1.65  | -4.88     | -1.65          | swims        |                                             | -1.65         | swims        |              |
| 2.0 | -1.46  | -4.56     | -1.46          | swims        |                                             | -1.46         | swims        |              |
| 2.2 | -1.26  | -4.26     | -1.26          | swims        |                                             | -1.26         | swims        |              |
| 2.4 | -1.05  | -3.90     | -1.05          | swims        |                                             | -1.05         | swims        |              |
| 2.6 | -0.85  | -3.58     | -0.85          | swims        |                                             | -0.85         | swims        |              |
| 2.8 | -0.66  | -3.19     | -0.66          | swims        |                                             | -0.85         | swims        |              |
| 3.0 | -0.49  | -2.68     | -0.49          | swims        | swimming with her body 0.13 m above the sea | -0.85         | swims        |              |
| 3.2 | -0.37  | -2.29     | -0.37          | swims        | swimming with her body 0.25 m above the sea | -0.85         | swims        |              |
| 3.4 | -0.26  | -1.90     | -0.26          | swims        | swimming with her body 0.36 m above the sea | -0.85         | swims        |              |
| 3.6 | -0.16  | -1.50     | -0.16          | turning 0.51 | swimming with her body 0.46 m above the sea | -0.85         | swims        |              |
| 3.8 | -0.07  | -1.10     | -0.07          | turning 0.24 | upright 1.02 m above the floor              | -0.85         | swims        |              |
| 4.0 | 0.01   | -0.69     | -0.61          | turning 0.38 |                                             | -0.69         | turning 0.73 |              |
| 4.2 | 0.08   | -0.28     | -0.28          | turning 0.21 |                                             | -0.28         | turning 0.35 |              |
| 4.4 | 0.15   | 0.12      | 0.12           | turning 0.10 |                                             | 0.12          | turning 0.17 |              |
| 4.6 | 0.21   | 0.19      | 0.19           | stands       |                                             | 0.19          | stands       |              |
| 4.8 | 0.25   | 0.24      | 0.24           | stands       |                                             | 0.24          | stands       |              |
| 5.0 | 0.29   | 0.28      | 0.28           | stands       |                                             | 0.28          | stands       |              |
| 5.2 | 0.32   | 0.31      | 0.31           | stands       |                                             | 0.31          | stands       |              |
| 5.4 | 0.34   | 0.34      | 0.34           | stands       |                                             | 0.34          | stands       |              |
| 5.6 | 0.36   | 0.36      | 0.36           | stands       |                                             | 0.36          | stands       |              |
| 5.8 | 0.38   | 0.38      | 0.38           | stands       |                                             | 0.38          | stands       |              |
| 6.0 | 0.40   | 0.40      | 0.40           | stands       |                                             | 0.40          | stands       |              |
| 6.2 | 0.42   | 0.42      | 0.42           | stands       |                                             | 0.42          | stands       |              |
| 6.4 | 0.43   | 0.43      | 0.43           | stands       |                                             | 0.43          | stands       |              |
| 6.6 | 0.45   | 0.45      | 0.45           | stands       |                                             | 0.45          | stands       |              |
| 6.8 | 0.46   | 0.46      | 0.46           | stands       |                                             | 0.46          | stands       |              |
| 7.0 | 0.47   | 0.47      | 0.47           | stands       |                                             | 0.47          | stands       |              |
| 7.2 | 0.47   | 0.47      | 0.47           | stands       |                                             | 0.47          | stands       |              |
| 7.4 | 0.48   | 0.48      | 0.48           | stands       |                                             | 0.48          | stands       |              |
| 7.6 | 0.48   | 0.48      | 0.48           | stands       |                                             | 0.48          | stands       |              |

Frames with a fault (of 457): before 66 (1.10 s), after 3. Largest change of height in one frame: before 0.103 m, after 0.034 m.
