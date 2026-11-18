# Late shader builds (linkProgram calls after page 1 is shown)

Hook on WebGL2RenderingContext.prototype.linkProgram, installed before load; links before the tale shows "Page 01" are counted separately; each later link is attributed to the page label showing at that moment and to its rAF frame (frameMs = duration of that frame, which is short because the call itself returns quickly; any compile stall would show in later frames). One headed (GPU Chrome, nice 19), uncapped, desktop 1440x900 real-clock walk 1 -> 11 with 2.5 s between turns, per build.

| build            | links before Page 01 shown | links after | per page                                   |
| ---------------- | -------------------------- | ----------- | ------------------------------------------ |
| baseline d60c1a6 | 119                        | 13          | {"Page 01": 4, "Page 03": 7, "Page 06": 2} |
| final 3d09931    | 97                         | 0           | {}                                         |

Baseline links after Page 01 (page, frame index, frameMs):

- Page 01, frame 8622, 1.8 ms
- Page 01, frame 8638, 1.9 ms
- Page 01, frame 9010, 2.8 ms
- Page 01, frame 9023, 3 ms
- Page 03, frame 15217, 2.9 ms
- Page 03, frame 15256, 3.3 ms
- Page 03, frame 15272, 3 ms
- Page 03, frame 15359, 2.8 ms
- Page 03, frame 15412, 3.2 ms
- Page 03, frame 15427, 3.3 ms
- Page 03, frame 15523, 2.8 ms
- Page 06, frame 27701, 3 ms
- Page 06, frame 30178, 1.9 ms

Final: no link after Page 01 is shown.

Expected about 9 late builds on the baseline; measured 13 (4 on page 1, 7 on page 3, 2 on page 6, none under water). Final measured 0.
