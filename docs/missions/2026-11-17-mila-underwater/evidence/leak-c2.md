# Leak series, 7ea9a48 (Q/c2-dist), 5 open -> page 8 -> back cycles

Mode `leak` with LEAK_CYCLES=5, desktop and mobile, headless GPU Chrome (ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)), nice 19, real clock, bounded. Per cycle: in the tale at page 8 and back on the tree 2 s after the back button. GL = live objects of the Mila canvas context counted by the instrumentation (textures, buffers, vertex arrays, programs, framebuffers, renderbuffers); they stand in for renderer.info memory (geometries, textures, programs), which is not reachable without a probe in src/ (not available in the plain build). ctx = Mila WebGL contexts created/lost. Heap = JS heap used MB after a forced GC (CDP).

## desktop

| cycle | in tale GL          | in tale heap MB | ctx | on tree GL  | on tree heap MB | ctx |
| ----- | ------------------- | --------------- | --- | ----------- | --------------- | --- |
| 1     | 40,1487,874,66,19,6 | 14.96           | 1/0 | 0,0,0,0,0,0 | 10.27           | 1/1 |
| 2     | 40,1487,874,66,19,6 | 15.49           | 2/1 | 0,0,0,0,0,0 | 10.62           | 2/2 |
| 3     | 40,1487,874,66,19,6 | 15.91           | 3/2 | 0,0,0,0,0,0 | 10.93           | 3/3 |
| 4     | 40,1487,874,66,19,6 | 16.31           | 4/3 | 0,0,0,0,0,0 | 11.2            | 4/4 |
| 5     | 40,1487,874,66,19,6 | 16.73           | 5/4 | 0,0,0,0,0,0 | 11.44           | 5/5 |

Slopes (least squares, MB per cycle): in the tale 0.436, on the tree 0.292; first to last on the tree 1.17 MB. GL objects in the tale constant across cycles: True; GL objects on the tree all zero: True; contexts created = lost on the tree every cycle: True.

## mobile

| cycle | in tale GL          | in tale heap MB | ctx | on tree GL  | on tree heap MB | ctx |
| ----- | ------------------- | --------------- | --- | ----------- | --------------- | --- |
| 1     | 38,1487,387,56,16,2 | 14.12           | 1/0 | 0,0,0,0,0,0 | 10.11           | 1/1 |
| 2     | 38,1487,387,56,16,2 | 14.61           | 2/1 | 0,0,0,0,0,0 | 10.4            | 2/2 |
| 3     | 38,1487,387,56,16,2 | 14.94           | 3/2 | 0,0,0,0,0,0 | 10.61           | 3/3 |
| 4     | 38,1487,387,56,16,2 | 15.53           | 4/3 | 0,0,0,0,0,0 | 10.79           | 4/4 |
| 5     | 38,1487,387,56,16,2 | 15.62           | 5/4 | 0,0,0,0,0,0 | 11.02           | 5/5 |

Slopes (least squares, MB per cycle): in the tale 0.392, on the tree 0.221; first to last on the tree 0.91 MB. GL objects in the tale constant across cycles: True; GL objects on the tree all zero: True; contexts created = lost on the tree every cycle: True.

## Statement

- GL objects: constant in the tale on both viewports (True, True) and zero on the tree; every Mila context created was lost when leaving. Nothing of the GL side grows.
- JS heap: slope in the tale 0.436 (desktop) and 0.392 (mobile) MB per cycle; on the tree 0.292 and 0.221. The JS heap does grow slowly (about 0.2 to 0.4 MB per cycle), as it did on 3d09931 and the baseline; with 5 cycles this is a trend, not a proof of a leak, and no GL object accumulates.
- Comparison with 3d09931 (leak.md, 6 cycles, desktop): heap slope in the tale 0.407 and on the tree 0.261 MB per cycle, programs 66 in the tale, GL constant, contexts balanced.
