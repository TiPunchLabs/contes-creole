# Leak, 6 open -> page 8 -> back cycles (desktop, capped, real clock), baseline d60c1a6 vs final 3d09931

Heap = JS heap used MB after forced GC (CDP). GL = live objects on non-lost Mila contexts (textures,buffers,vertexArrays,programs,framebuffers,renderbuffers). ctx = created/lost Mila WebGL contexts.

| cycle | build    | in tale p8 GL        | in tale heap | in tale ctx | on tree GL  | on tree heap | on tree ctx |
| ----- | -------- | -------------------- | ------------ | ----------- | ----------- | ------------ | ----------- |
| 1     | baseline | 40,2308,865,101,19,6 | 15.58        | 1/0         | 0,0,0,0,0,0 | 10.09        | 1/1         |
| 1     | final    | 40,1483,871,66,19,6  | 14.59        | 1/0         | 0,0,0,0,0,0 | 10.17        | 1/1         |
| 2     | baseline | 40,2308,865,101,19,6 | 16.33        | 2/1         | 0,0,0,0,0,0 | 10.39        | 2/2         |
| 2     | final    | 40,1483,871,66,19,6  | 15.12        | 2/1         | 0,0,0,0,0,0 | 10.51        | 2/2         |
| 3     | baseline | 40,2308,865,101,19,6 | 16.94        | 3/2         | 0,0,0,0,0,0 | 10.67        | 3/3         |
| 3     | final    | 40,1483,871,66,19,6  | 15.53        | 3/2         | 0,0,0,0,0,0 | 10.81        | 3/3         |
| 4     | baseline | 40,2308,865,101,19,6 | 17.54        | 4/3         | 0,0,0,0,0,0 | 10.9         | 4/4         |
| 4     | final    | 40,1483,871,66,19,6  | 15.95        | 4/3         | 0,0,0,0,0,0 | 11.05        | 4/4         |
| 5     | baseline | 40,2308,865,101,19,6 | 18.08        | 5/4         | 0,0,0,0,0,0 | 11.13        | 5/5         |
| 5     | final    | 40,1483,871,66,19,6  | 16.3         | 5/4         | 0,0,0,0,0,0 | 11.28        | 5/5         |
| 6     | baseline | 40,2308,865,101,19,6 | 18.72        | 6/5         | 0,0,0,0,0,0 | 11.45        | 6/6         |
| 6     | final    | 40,1483,871,66,19,6  | 16.65        | 6/5         | 0,0,0,0,0,0 | 11.49        | 6/6         |

Slope of heap per cycle (least squares, MB/cycle):

| build    | in tale | on tree | first to last on tree |
| -------- | ------- | ------- | --------------------- |
| baseline | 0.616   | 0.264   | 1.36                  |
| final    | 0.407   | 0.261   | 1.32                  |

Programs live in the tale at page 8: baseline 101, final 66. Buffers 2308 vs 1483, vertex arrays 865 vs 871.
