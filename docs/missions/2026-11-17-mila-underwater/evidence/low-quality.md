# Forced low quality (final build 3d09931)

The scene sets data-quality on the .mila-gl canvas ("2" high, "1", "0" low), decided by the average frame time of the first 90 frames after a page is shown. CPU_THROTTLE (CDP Emulation.setCPUThrottlingRate) on the real clock drives it (the fake clock cannot). Headless GPU Chrome, nice 19, CPU_THROTTLE=8, 8 s after arrival on each page; stills are real-clock, not pixel-comparable with the fake-clock stills. Performance under throttle was not re-measured in this round (owner rule: headed only).

| viewport | page | data-quality | canvas px / CSS / ratio |
| -------- | ---- | ------------ | ----------------------- |
| desktop  | 7    | 0            | 1440x900 / 1440x900 / 1 |
| desktop  | 8    | 0            | 1440x900 / 1440x900 / 1 |
| desktop  | 9    | 0            | 1440x900 / 1440x900 / 1 |
| desktop  | 10   | 0            | 1440x900 / 1440x900 / 1 |
| mobile   | 7    | 0            | 390x844 / 390x844 / 1   |
| mobile   | 8    | 0            | 390x844 / 390x844 / 1   |
| mobile   | 9    | 0            | 390x844 / 390x844 / 1   |
| mobile   | 10   | 0            | 390x844 / 390x844 / 1   |

data-quality at page 1: desktop=2, mobile=2

Boards: boards-final/low-<vp>-pNN*.png (normal fake-clock still left, throttled real-clock still right).
