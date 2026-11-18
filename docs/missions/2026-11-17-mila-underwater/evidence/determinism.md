# Determinism of the fake-clock stills

Three fresh contexts per build, same flow to page 7 (desktop 1440x900), screenshot 6 s after arrival, every pair compared with ImageMagick compare -metric MAE (normalised value in brackets). Runs were nice 19 headless GPU Chrome.

| build            | pair | byte-identical | MAE                  |
| ---------------- | ---- | -------------- | -------------------- |
| baseline d60c1a6 | a-b  | True           | 0 (0)                |
| baseline d60c1a6 | a-c  | False          | 110.864 (0.00169167) |
| baseline d60c1a6 | b-c  | False          | 110.864 (0.00169167) |
| final 3d09931    | a-b  | False          | 74.2432 (0.00113288) |
| final 3d09931    | a-c  | False          | 74.2432 (0.00113288) |
| final 3d09931    | b-c  | True           | 0 (0)                |

Reading: neither build is byte-stable across runs. In each build two of the three stills match and one differs (baseline: c is the outlier at 0.00169; final: a is the outlier at 0.00113). The earlier two-run baseline check that came out identical was therefore luck, not a proof of stability. The pixel differences are small (about 0.1 to 0.2 percent normalised MAE). Earlier f92d8e2 runs are superseded and not discussed here.
