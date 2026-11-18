# Clearance check (O4), round c2: sound predicate

This file replaces the round-o4 clearance.md and clearance.json, whose predicate was unsound (the numbers in those were produced by the earlier version of qa/mila-clearance.mjs). Script now: qa/mila-clearance.mjs with qa/mila-clearance-gap.mjs (commit 2e04279), every living form against every other, every solid and the ground; each pair kind lists how often it was close enough to be measured and its closest approach (negative = overlap).

Builds: before = 1638c4c with the read-only probe (Q/clr-base-dist), after = 7ea9a48 with the probe (Q/c2-probe-dist; the src/ tree of HEAD 2e04279 is identical to 7ea9a48). Settings: TOL 0.02 m, REST_SEA 20000 ms, REST_LAND 6000 ms, BACK on. Headless GPU Chrome, fake clock, nice 19 (functional check, not a frame-rate measurement). Renderer recorded in every json: ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2), 157.0.8103.78.

## Summary

- kinds that overlapped before: crab-ground, fish-coral, fish-fish, fish-ground, fish-rock, fish-school, fish-turtle, mila-fish, mila-school, school-school
- kinds that still overlap after (either viewport): none
- closest approaches after, within the tolerance and therefore not counted as overlaps: liveConch-ground -0.008 m (both viewports; before 0.055 m) and crab-ground +0.008 m (before: overlap 0.032 m at p06), fish-fish +0.009 / +0.012 m, school-school +0.020 / +0.037 m (see the pair-kind tables).
- the new pair kinds crab-ground, crab-debris, liveConch-ground and liveConch-coral exist only in the new predicate; kinds with measured 0 were never close enough to be tested in that run.

## before desktop

Frames 16553; steepestGround 0.772; error None; rocks and corals counted {'rocks': 39, 'corals': 16}; renderer ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2).

| pair kind          | measured | closest (m) |
| ------------------ | -------- | ----------- |
| mila-fish          | 2212     | -0.132      |
| mila-school        | 3919     | -0.200      |
| mila-turtle        | 195      | 0.469       |
| mila-crab          | 0        | -           |
| mila-liveConch     | 0        | -           |
| mila-pearl         | 0        | -           |
| mila-bigConch      | 4315     | 0.186       |
| mila-debris        | 0        | -           |
| mila-rock          | 5        | 0.729       |
| mila-coral         | 0        | -           |
| mila-ground        | 8415     | 0.135       |
| fish-fish          | 79735    | -0.096      |
| fish-school        | 1561     | -0.063      |
| fish-turtle        | 9356     | -0.144      |
| fish-crab          | 0        | -           |
| fish-liveConch     | 0        | -           |
| fish-pearl         | 0        | -           |
| fish-bigConch      | 0        | -           |
| fish-debris        | 0        | -           |
| fish-rock          | 58299    | -0.665      |
| fish-coral         | 29099    | -0.430      |
| fish-ground        | 61667    | -0.769      |
| school-school      | 6383752  | -0.070      |
| school-turtle      | 0        | -           |
| school-crab        | 0        | -           |
| school-liveConch   | 0        | -           |
| school-pearl       | 0        | -           |
| school-bigConch    | 0        | -           |
| school-debris      | 0        | -           |
| school-rock        | 0        | -           |
| school-coral       | 0        | -           |
| school-ground      | 0        | -           |
| turtle-crab        | 0        | -           |
| turtle-liveConch   | 0        | -           |
| turtle-pearl       | 0        | -           |
| turtle-bigConch    | 0        | -           |
| turtle-debris      | 0        | -           |
| turtle-rock        | 0        | -           |
| turtle-coral       | 0        | -           |
| turtle-ground      | 0        | -           |
| crab-liveConch     | 0        | -           |
| crab-pearl         | 0        | -           |
| crab-bigConch      | 0        | -           |
| crab-debris        | 5315     | 0.256       |
| crab-rock          | 0        | -           |
| crab-coral         | 0        | -           |
| crab-ground        | 16553    | -0.032      |
| liveConch-pearl    | 0        | -           |
| liveConch-bigConch | 0        | -           |
| liveConch-debris   | 0        | -           |
| liveConch-rock     | 0        | -           |
| liveConch-coral    | 0        | -           |
| liveConch-ground   | 16553    | 0.055       |

Overlap table (deeper than the tolerance), summed over segments:

| pair kind     | frames with an overlap | distinct pairs | deepest (m) | at segment |
| ------------- | ---------------------- | -------------- | ----------- | ---------- |
| crab-ground   | 16534                  | 34             | 0.032       | p06        |
| fish-coral    | 4515                   | 182            | 0.427       | t08-09     |
| fish-fish     | 626                    | 71             | 0.094       | t10-11     |
| fish-ground   | 13071                  | 257            | 0.767       | p10        |
| fish-rock     | 9482                   | 349            | 0.663       | p10        |
| fish-school   | 16                     | 4              | 0.060       | p08        |
| fish-turtle   | 278                    | 9              | 0.144       | b12-11     |
| mila-fish     | 53                     | 4              | 0.131       | p09        |
| mila-school   | 77                     | 17             | 0.200       | b10-09     |
| school-school | 13857                  | 1010           | 0.070       | b08-07     |

Per segment (overlapping kinds as kind frames/distinct pairs/deepest m; fish figures: swimmers, maxStep m, fastSteps, maxJolt m, jolts). Caveat: during page turns the script advances the fake clock in uneven pieces, so step and jolt figures of the t and b segments are inflated on both builds; the page segments (p07 to p10) are the clean ones.

| segment | frames | overlaps                                                                                                                                                                                               | swimmers | maxStep | fastSteps | maxJolt | jolts |
| ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------- | --------- | ------- | ----- |
| p01     | 375    | crab-ground 375/1/0.031; fish-coral 18/1/0.169; fish-ground 201/3/0.315; fish-rock 187/5/0.448; school-school 328/27/0.065                                                                             | 175      | 0.055   | 299       | 0.000   | -     |
| t01-02  | 294    | crab-ground 294/1/0.031; fish-coral 37/2/0.301; fish-ground 125/2/0.136; fish-rock 57/1/0.647; school-school 241/27/0.062                                                                              | 175      | 0.143   | 275       | 0.137   | 1021  |
| p02     | 375    | crab-ground 375/1/0.031; fish-coral 72/2/0.303; fish-ground 359/3/0.540; fish-rock 20/1/0.062; school-school 343/30/0.056                                                                              | 175      | 0.055   | 267       | 0.000   | -     |
| t02-03  | 295    | crab-ground 295/1/0.031; fish-coral 17/1/0.176; fish-fish 2/1/0.043; fish-ground 128/2/0.233; fish-rock 150/6/0.604; school-school 281/27/0.056                                                        | 175      | 0.163   | 314       | 0.111   | 1657  |
| p03     | 375    | crab-ground 375/1/0.031; fish-coral 21/1/0.276; fish-fish 3/1/0.043; fish-ground 202/3/0.258; fish-rock 30/1/0.171; school-school 320/23/0.060                                                         | 175      | 0.055   | 296       | 0.000   | -     |
| t03-04  | 559    | crab-ground 559/1/0.031; fish-coral 146/5/0.292; fish-ground 196/2/0.663; fish-rock 219/5/0.517; school-school 518/43/0.065                                                                            | 175      | 0.144   | 457       | 0.136   | 1215  |
| p04     | 375    | crab-ground 375/1/0.031; fish-fish 8/1/0.049; fish-ground 155/4/0.299; fish-rock 28/1/0.136; school-school 277/20/0.050                                                                                | 175      | 0.055   | 264       | 0.000   | -     |
| t04-05  | 490    | crab-ground 490/1/0.031; fish-coral 64/3/0.266; fish-ground 202/3/0.586; fish-rock 224/6/0.498; school-school 424/31/0.058                                                                             | 175      | 0.165   | 592       | 0.132   | 2134  |
| p05     | 375    | crab-ground 375/1/0.031; fish-coral 85/2/0.370; fish-ground 202/2/0.291; fish-rock 80/2/0.253; school-school 325/25/0.055                                                                              | 175      | 0.055   | 270       | 0.000   | -     |
| t05-06  | 467    | crab-ground 448/1/0.031; fish-coral 20/1/0.268; fish-fish 5/1/0.026; fish-ground 234/3/0.368; fish-rock 226/6/0.615; school-school 408/26/0.059                                                        | 175      | 0.148   | 384       | 0.116   | 1020  |
| p06     | 375    | crab-ground 375/1/0.032; fish-coral 58/3/0.305; fish-fish 13/1/0.051; fish-ground 109/2/0.143; fish-rock 43/3/0.306; school-school 328/24/0.059                                                        | 175      | 0.055   | 298       | 0.000   | -     |
| t06-07  | 495    | crab-ground 495/1/0.032; fish-coral 55/4/0.251; fish-fish 51/5/0.056; fish-ground 475/13/0.563; fish-rock 265/12/0.659; school-school 375/30/0.063                                                     | 175      | 0.184   | 1396      | 0.133   | 1702  |
| p07     | 1250   | crab-ground 1250/1/0.032; fish-coral 462/16/0.409; fish-fish 55/7/0.074; fish-ground 1124/18/0.666; fish-rock 1017/29/0.582; mila-fish 3/1/0.021; school-school 1109/70/0.066                          | 175      | 0.060   | 2757      | 0.001   | -     |
| t07-08  | 356    | crab-ground 356/1/0.032; fish-coral 109/6/0.372; fish-fish 26/3/0.068; fish-ground 356/10/0.478; fish-rock 341/13/0.645; school-school 356/23/0.063                                                    | 240      | 1.078   | 1726      | 1.098   | 3297  |
| p08     | 1250   | crab-ground 1250/1/0.032; fish-coral 505/19/0.420; fish-fish 92/9/0.087; fish-ground 1250/18/0.723; fish-rock 943/29/0.599; fish-school 16/4/0.060; mila-school 38/4/0.120; school-school 843/22/0.059 | 240      | 0.061   | 2996      | 0.001   | -     |
| t08-09  | 356    | crab-ground 356/1/0.032; fish-coral 170/10/0.427; fish-ground 356/15/0.388; fish-rock 286/13/0.522; mila-school 8/3/0.063; school-school 325/24/0.054                                                  | 240      | 1.078   | 2210      | 1.095   | 4290  |
| p09     | 1250   | crab-ground 1250/1/0.032; fish-coral 521/18/0.421; fish-fish 49/5/0.091; fish-ground 1250/20/0.760; fish-rock 885/33/0.566; fish-turtle 90/2/0.111; mila-fish 46/2/0.131; school-school 899/53/0.065   | 240      | 0.060   | 2957      | 0.001   | -     |
| t09-10  | 381    | crab-ground 381/1/0.032; fish-coral 115/5/0.342; fish-fish 55/5/0.040; fish-ground 381/11/0.708; fish-rock 301/12/0.616; mila-school 18/3/0.139; school-school 318/19/0.067                            | 240      | 0.168   | 1534      | 0.149   | 3760  |
| p10     | 1250   | crab-ground 1250/1/0.032; fish-coral 538/17/0.372; fish-fish 58/7/0.069; fish-ground 1250/20/0.767; fish-rock 893/30/0.663; fish-turtle 19/1/0.060; school-school 992/66/0.061                         | 240      | 0.060   | 2831      | 0.001   | -     |
| t10-11  | 489    | crab-ground 489/1/0.032; fish-coral 113/6/0.280; fish-fish 42/3/0.094; fish-ground 462/11/0.749; fish-rock 376/16/0.620; school-school 383/28/0.068                                                    | 240      | 0.182   | 1662      | 0.135   | 3664  |
| p11     | 375    | crab-ground 375/1/0.032; fish-coral 202/10/0.370; fish-fish 15/2/0.050; fish-ground 375/8/0.701; fish-rock 285/12/0.520; school-school 361/31/0.056                                                    | 240      | 0.060   | 861       | 0.001   | -     |
| t11-12  | 367    | crab-ground 367/1/0.032; fish-coral 62/2/0.248; fish-fish 24/2/0.083; fish-ground 367/11/0.392; fish-rock 274/12/0.636; school-school 273/23/0.065                                                     | 240      | 0.170   | 1509      | 0.112   | 2160  |
| p12     | 375    | crab-ground 375/1/0.032; fish-coral 126/9/0.286; fish-fish 49/5/0.077; fish-ground 375/10/0.590; fish-rock 302/13/0.631; school-school 350/24/0.057                                                    | 240      | 0.060   | 842       | 0.001   | -     |
| b12-11  | 354    | crab-ground 354/1/0.032; fish-coral 166/5/0.321; fish-fish 35/3/0.072; fish-ground 354/8/0.727; fish-rock 316/14/0.590; fish-turtle 116/3/0.144; school-school 354/28/0.062                            | 240      | 0.182   | 1722      | 0.141   | 2473  |
| b11-10  | 366    | crab-ground 366/1/0.032; fish-coral 156/8/0.276; fish-ground 366/11/0.707; fish-rock 243/12/0.600; fish-turtle 20/2/0.072; school-school 347/30/0.061                                                  | 240      | 0.172   | 1367      | 0.116   | 2635  |
| b10-09  | 366    | crab-ground 366/1/0.032; fish-coral 71/2/0.369; fish-fish 3/1/0.052; fish-ground 366/11/0.653; fish-rock 272/13/0.533; mila-school 13/7/0.200; school-school 333/28/0.061                              | 240      | 0.186   | 1082      | 0.149   | 1705  |
| b09-08  | 370    | crab-ground 370/1/0.032; fish-coral 184/9/0.265; fish-fish 29/5/0.079; fish-ground 351/9/0.483; fish-rock 283/15/0.553; school-school 331/27/0.063                                                     | 240      | 1.075   | 1426      | 1.092   | 1977  |
| b08-07  | 361    | crab-ground 361/1/0.032; fish-coral 147/5/0.366; fish-ground 361/8/0.685; fish-rock 299/15/0.587; fish-turtle 33/1/0.117; mila-fish 4/1/0.042; school-school 316/31/0.070                              | 175      | 1.093   | 1955      | 1.103   | 3975  |
| b07-06  | 363    | crab-ground 363/1/0.032; fish-coral 66/2/0.242; fish-ground 315/3/0.619; fish-rock 162/4/0.491; school-school 299/28/0.055                                                                             | 175      | 0.138   | 373       | 0.091   | 1197  |
| b06-05  | 366    | crab-ground 366/1/0.032; fish-coral 16/1/0.161; fish-ground 173/2/0.232; fish-rock 49/2/0.256; school-school 287/27/0.054                                                                              | 175      | 0.142   | 402       | 0.118   | 1659  |
| b05-04  | 364    | crab-ground 364/1/0.032; fish-coral 58/2/0.242; fish-fish 8/2/0.048; fish-ground 293/4/0.418; fish-rock 190/6/0.620; school-school 259/26/0.054                                                        | 175      | 0.122   | 409       | 0.101   | 1130  |
| b04-03  | 369    | crab-ground 369/1/0.032; fish-coral 71/3/0.265; fish-fish 3/1/0.054; fish-rock 38/1/0.222; school-school 352/22/0.059                                                                                  | 175      | 0.124   | 263       | 0.074   | 617   |
| b03-02  | 366    | crab-ground 366/1/0.032; fish-ground 144/4/0.210; fish-rock 82/3/0.196; school-school 295/24/0.049                                                                                                     | 175      | 0.167   | 229       | 0.144   | 914   |
| b02-01  | 359    | crab-ground 359/1/0.032; fish-coral 64/2/0.282; fish-fish 1/1/0.020; fish-ground 214/3/0.264; fish-rock 116/3/0.660; school-school 307/23/0.068                                                        | 175      | 0.165   | 447       | 0.122   | 1274  |

## before mobile

Frames 16676; steepestGround 0.772; error None; rocks and corals counted {'rocks': 39, 'corals': 16}; renderer ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2).

| pair kind          | measured | closest (m) |
| ------------------ | -------- | ----------- |
| mila-fish          | 2163     | -0.133      |
| mila-school        | 2659     | -0.204      |
| mila-turtle        | 195      | 0.469       |
| mila-crab          | 0        | -           |
| mila-liveConch     | 0        | -           |
| mila-pearl         | 0        | -           |
| mila-bigConch      | 4358     | 0.207       |
| mila-debris        | 0        | -           |
| mila-rock          | 12       | 0.704       |
| mila-coral         | 0        | -           |
| mila-ground        | 8498     | 0.135       |
| fish-fish          | 37050    | -0.089      |
| fish-school        | 115      | 0.152       |
| fish-turtle        | 6055     | -0.136      |
| fish-crab          | 0        | -           |
| fish-liveConch     | 715      | 0.533       |
| fish-pearl         | 0        | -           |
| fish-bigConch      | 0        | -           |
| fish-debris        | 0        | -           |
| fish-rock          | 58353    | -0.935      |
| fish-coral         | 46281    | -0.472      |
| fish-ground        | 6888     | -0.306      |
| school-school      | 2919417  | -0.064      |
| school-turtle      | 0        | -           |
| school-crab        | 0        | -           |
| school-liveConch   | 0        | -           |
| school-pearl       | 0        | -           |
| school-bigConch    | 0        | -           |
| school-debris      | 0        | -           |
| school-rock        | 0        | -           |
| school-coral       | 0        | -           |
| school-ground      | 0        | -           |
| turtle-crab        | 0        | -           |
| turtle-liveConch   | 0        | -           |
| turtle-pearl       | 0        | -           |
| turtle-bigConch    | 0        | -           |
| turtle-debris      | 0        | -           |
| turtle-rock        | 0        | -           |
| turtle-coral       | 0        | -           |
| turtle-ground      | 0        | -           |
| crab-liveConch     | 0        | -           |
| crab-pearl         | 0        | -           |
| crab-bigConch      | 0        | -           |
| crab-debris        | 5347     | 0.256       |
| crab-rock          | 0        | -           |
| crab-coral         | 0        | -           |
| crab-ground        | 16676    | -0.032      |
| liveConch-pearl    | 0        | -           |
| liveConch-bigConch | 0        | -           |
| liveConch-debris   | 0        | -           |
| liveConch-rock     | 0        | -           |
| liveConch-coral    | 33352    | 0.483       |
| liveConch-ground   | 16676    | 0.055       |

Overlap table (deeper than the tolerance), summed over segments:

| pair kind     | frames with an overlap | distinct pairs | deepest (m) | at segment |
| ------------- | ---------------------- | -------------- | ----------- | ---------- |
| crab-ground   | 16658                  | 34             | 0.032       | p06        |
| fish-coral    | 6144                   | 171            | 0.470       | p05        |
| fish-fish     | 448                    | 39             | 0.089       | t10-11     |
| fish-ground   | 2115                   | 30             | 0.304       | b09-08     |
| fish-rock     | 7819                   | 209            | 0.932       | t06-07     |
| fish-turtle   | 387                    | 10             | 0.132       | t11-12     |
| mila-fish     | 92                     | 5              | 0.131       | p07        |
| mila-school   | 87                     | 18             | 0.204       | p08        |
| school-school | 7264                   | 357            | 0.064       | p07        |

Per segment (overlapping kinds as kind frames/distinct pairs/deepest m; fish figures: swimmers, maxStep m, fastSteps, maxJolt m, jolts). Caveat: during page turns the script advances the fake clock in uneven pieces, so step and jolt figures of the t and b segments are inflated on both builds; the page segments (p07 to p10) are the clean ones.

| segment | frames | overlaps                                                                                                                                                                                            | swimmers | maxStep | fastSteps | maxJolt | jolts |
| ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- | --------- | ------- | ----- |
| p01     | 376    | crab-ground 376/1/0.031; fish-coral 189/4/0.393; fish-rock 141/4/0.679; school-school 77/7/0.047                                                                                                    | 111      | 0.042   | -         | 0.020   | 17    |
| t01-02  | 301    | crab-ground 301/1/0.031; fish-coral 30/1/0.137; fish-ground 38/1/0.039; fish-rock 71/3/0.662; school-school 118/9/0.060                                                                             | 111      | 0.110   | 46        | 0.073   | 385   |
| p02     | 375    | crab-ground 375/1/0.031; fish-coral 16/1/0.064; school-school 174/7/0.059                                                                                                                           | 111      | 0.042   | -         | 0.000   | -     |
| t02-03  | 296    | crab-ground 296/1/0.031; fish-coral 204/3/0.445; fish-rock 127/3/0.457; school-school 77/6/0.045                                                                                                    | 111      | 0.070   | 14        | 0.038   | 199   |
| p03     | 375    | crab-ground 375/1/0.031; fish-rock 142/3/0.531; school-school 190/9/0.061                                                                                                                           | 111      | 0.042   | -         | 0.000   | -     |
| t03-04  | 559    | crab-ground 559/1/0.031; fish-coral 49/3/0.204; fish-ground 116/1/0.282; fish-rock 79/2/0.291; school-school 178/9/0.060                                                                            | 111      | 0.088   | 37        | 0.052   | 369   |
| p04     | 375    | crab-ground 375/1/0.031; fish-coral 242/4/0.268; fish-rock 170/2/0.461; school-school 81/7/0.045                                                                                                    | 111      | 0.043   | -         | 0.000   | -     |
| t04-05  | 499    | crab-ground 499/1/0.031; fish-coral 60/3/0.261; fish-ground 117/1/0.095; fish-rock 80/2/0.463; school-school 336/11/0.060                                                                           | 111      | 0.083   | 32        | 0.055   | 423   |
| p05     | 375    | crab-ground 375/1/0.031; fish-coral 88/2/0.470; fish-rock 61/1/0.109; school-school 364/13/0.060                                                                                                    | 111      | 0.043   | -         | 0.000   | -     |
| t05-06  | 470    | crab-ground 452/1/0.031; fish-coral 218/7/0.331; fish-rock 168/4/0.694; school-school 380/12/0.060                                                                                                  | 111      | 0.127   | 22        | 0.085   | 349   |
| p06     | 375    | crab-ground 375/1/0.032; fish-ground 54/1/0.071; school-school 313/13/0.060                                                                                                                         | 111      | 0.042   | -         | 0.000   | -     |
| t06-07  | 506    | crab-ground 506/1/0.032; fish-coral 305/8/0.298; fish-fish 17/2/0.026; fish-rock 308/10/0.932; fish-turtle 9/1/0.032; school-school 271/13/0.060                                                    | 111      | 0.131   | 763       | 0.090   | 903   |
| p07     | 1250   | crab-ground 1250/1/0.032; fish-coral 615/12/0.401; fish-fish 53/3/0.050; fish-ground 323/4/0.253; fish-rock 602/16/0.868; mila-fish 67/4/0.131; school-school 921/28/0.064                          | 111      | 0.064   | 1679      | 0.001   | -     |
| t07-08  | 361    | crab-ground 361/1/0.032; fish-coral 75/4/0.404; fish-fish 5/1/0.063; fish-rock 144/5/0.247; mila-school 7/2/0.092; school-school 96/7/0.047                                                         | 150      | 1.060   | 750       | 1.061   | 669   |
| p08     | 1250   | crab-ground 1250/1/0.032; fish-coral 632/14/0.463; fish-fish 51/5/0.058; fish-ground 161/2/0.123; fish-rock 822/20/0.866; fish-turtle 38/1/0.078; mila-school 43/3/0.204; school-school 145/8/0.047 | 150      | 0.064   | 1680      | 0.001   | -     |
| t08-09  | 358    | crab-ground 358/1/0.032; fish-coral 55/2/0.415; fish-ground 147/2/0.297; fish-rock 257/6/0.589; school-school 100/5/0.060                                                                           | 150      | 1.058   | 770       | 1.060   | 911   |
| p09     | 1250   | crab-ground 1250/1/0.032; fish-coral 509/13/0.464; fish-fish 20/2/0.043; fish-ground 164/3/0.146; fish-rock 789/16/0.834; fish-turtle 59/1/0.105; mila-fish 25/1/0.127; school-school 566/25/0.056  | 150      | 0.064   | 1884      | 0.001   | -     |
| t09-10  | 385    | crab-ground 385/1/0.032; fish-coral 165/4/0.468; fish-fish 56/4/0.072; fish-ground 80/1/0.255; fish-rock 101/4/0.835; fish-turtle 59/2/0.080; mila-school 19/6/0.203; school-school 206/11/0.050    | 150      | 0.184   | 633       | 0.133   | 302   |
| p10     | 1251   | crab-ground 1251/1/0.032; fish-coral 566/14/0.416; fish-fish 83/6/0.089; fish-ground 269/4/0.219; fish-rock 797/16/0.760; school-school 567/27/0.059                                                | 150      | 0.064   | 1777      | 0.001   | -     |
| t10-11  | 500    | crab-ground 500/1/0.032; fish-coral 97/4/0.382; fish-fish 28/3/0.089; fish-ground 178/1/0.218; fish-rock 360/11/0.687; fish-turtle 20/1/0.089; school-school 231/15/0.063                           | 150      | 0.121   | 813       | 0.068   | 520   |
| p11     | 377    | crab-ground 377/1/0.032; fish-coral 280/11/0.373; fish-fish 5/1/0.062; fish-rock 137/7/0.828; school-school 113/6/0.049                                                                             | 150      | 0.172   | 561       | 0.152   | 348   |
| t11-12  | 375    | crab-ground 375/1/0.032; fish-coral 20/2/0.057; fish-fish 55/3/0.082; fish-rock 288/10/0.673; fish-turtle 76/2/0.132; school-school 262/13/0.058                                                    | 150      | 0.198   | 582       | 0.150   | 582   |
| p12     | 375    | crab-ground 375/1/0.032; fish-coral 216/7/0.414; fish-fish 15/2/0.021; fish-ground 2/1/0.022; fish-rock 235/7/0.490; school-school 122/9/0.056                                                      | 150      | 0.064   | 510       | 0.001   | -     |
| b12-11  | 364    | crab-ground 364/1/0.032; fish-coral 278/6/0.470; fish-fish 50/5/0.083; fish-ground 60/1/0.104; fish-rock 290/8/0.816; school-school 78/7/0.052                                                      | 150      | 0.141   | 631       | 0.108   | 740   |
| b11-10  | 375    | crab-ground 375/1/0.032; fish-coral 167/5/0.346; fish-fish 10/2/0.039; fish-rock 296/12/0.693; school-school 138/11/0.049                                                                           | 150      | 0.192   | 630       | 0.131   | 397   |
| b10-09  | 369    | crab-ground 369/1/0.032; fish-coral 141/5/0.230; fish-ground 41/1/0.242; fish-rock 264/9/0.806; fish-turtle 51/1/0.128; mila-school 12/5/0.174; school-school 241/13/0.053                          | 150      | 0.101   | 613       | 0.071   | 396   |
| b09-08  | 372    | crab-ground 372/1/0.032; fish-coral 122/5/0.363; fish-ground 105/2/0.304; fish-rock 161/5/0.915; mila-school 5/1/0.060; school-school 132/6/0.051                                                   | 150      | 1.064   | 868       | 1.064   | 1292  |
| b08-07  | 372    | crab-ground 372/1/0.032; fish-coral 195/9/0.410; fish-ground 74/2/0.126; fish-rock 261/8/0.834; mila-school 1/1/0.033; school-school 130/9/0.053                                                    | 111      | 1.054   | 782       | 1.065   | 855   |
| b07-06  | 369    | crab-ground 369/1/0.032; fish-coral 23/1/0.105; fish-ground 99/1/0.087; fish-rock 99/3/0.623; school-school 150/9/0.057                                                                             | 111      | 0.045   | -         | 0.016   | 13    |
| b06-05  | 368    | crab-ground 368/1/0.032; fish-coral 94/4/0.454; fish-rock 42/1/0.107; school-school 17/1/0.045                                                                                                      | 111      | 0.065   | 4         | 0.028   | 54    |
| b05-04  | 368    | crab-ground 368/1/0.032; fish-coral 153/3/0.422; fish-rock 176/3/0.377; fish-turtle 75/1/0.132; school-school 125/6/0.045                                                                           | 111      | 0.084   | 55        | 0.056   | 456   |
| b04-03  | 366    | crab-ground 366/1/0.032; fish-coral 29/1/0.169; fish-rock 86/2/0.185; school-school 155/11/0.059                                                                                                    | 111      | 0.075   | 14        | 0.036   | 149   |
| b03-02  | 370    | crab-ground 370/1/0.032; fish-coral 90/5/0.199; fish-ground 87/1/0.148; fish-rock 174/4/0.380; school-school 159/8/0.062                                                                            | 111      | 0.074   | 17        | 0.047   | 354   |
| b02-01  | 369    | crab-ground 369/1/0.032; fish-coral 221/4/0.412; fish-rock 91/2/0.302; school-school 51/6/0.037                                                                                                     | 111      | 0.106   | 80        | 0.056   | 355   |

## after desktop

Frames 16657; steepestGround 0.772; error None; rocks and corals counted {'rocks': 39, 'corals': 16}; renderer ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2).

| pair kind          | measured | closest (m) |
| ------------------ | -------- | ----------- |
| mila-fish          | 909      | 0.384       |
| mila-school        | 1424     | 0.345       |
| mila-turtle        | 193      | 0.469       |
| mila-crab          | 0        | -           |
| mila-liveConch     | 0        | -           |
| mila-pearl         | 0        | -           |
| mila-bigConch      | 4360     | 0.192       |
| mila-debris        | 0        | -           |
| mila-rock          | 5        | 0.730       |
| mila-coral         | 0        | -           |
| mila-ground        | 8490     | 0.133       |
| fish-fish          | 94913    | 0.009       |
| fish-school        | 1478     | 0.038       |
| fish-turtle        | 2362     | 0.155       |
| fish-crab          | 0        | -           |
| fish-liveConch     | 0        | -           |
| fish-pearl         | 0        | -           |
| fish-bigConch      | 0        | -           |
| fish-debris        | 0        | -           |
| fish-rock          | 20521    | 0.283       |
| fish-coral         | 2840     | 0.450       |
| fish-ground        | 92       | 0.071       |
| school-school      | 6106890  | 0.020       |
| school-turtle      | 0        | -           |
| school-crab        | 0        | -           |
| school-liveConch   | 0        | -           |
| school-pearl       | 0        | -           |
| school-bigConch    | 0        | -           |
| school-debris      | 0        | -           |
| school-rock        | 0        | -           |
| school-coral       | 0        | -           |
| school-ground      | 0        | -           |
| turtle-crab        | 0        | -           |
| turtle-liveConch   | 0        | -           |
| turtle-pearl       | 0        | -           |
| turtle-bigConch    | 0        | -           |
| turtle-debris      | 0        | -           |
| turtle-rock        | 0        | -           |
| turtle-coral       | 0        | -           |
| turtle-ground      | 0        | -           |
| crab-liveConch     | 0        | -           |
| crab-pearl         | 0        | -           |
| crab-bigConch      | 0        | -           |
| crab-debris        | 5357     | 0.254       |
| crab-rock          | 0        | -           |
| crab-coral         | 0        | -           |
| crab-ground        | 16657    | 0.008       |
| liveConch-pearl    | 0        | -           |
| liveConch-bigConch | 0        | -           |
| liveConch-debris   | 0        | -           |
| liveConch-rock     | 0        | -           |
| liveConch-coral    | 0        | -           |
| liveConch-ground   | 16657    | -0.008      |

Overlap table (deeper than the tolerance), summed over segments:

| pair kind | frames with an overlap | distinct pairs | deepest (m) | at segment |
| --------- | ---------------------- | -------------- | ----------- | ---------- |
| none      | 0                      | 0              | -           | -          |

Per segment (overlapping kinds as kind frames/distinct pairs/deepest m; fish figures: swimmers, maxStep m, fastSteps, maxJolt m, jolts). Caveat: during page turns the script advances the fake clock in uneven pieces, so step and jolt figures of the t and b segments are inflated on both builds; the page segments (p07 to p10) are the clean ones.

| segment | frames | overlaps | swimmers | maxStep | fastSteps | maxJolt | jolts |
| ------- | ------ | -------- | -------- | ------- | --------- | ------- | ----- |
| p01     | 375    | none     | 175      | 0.055   | 302       | 0.011   | 2     |
| t01-02  | 300    | none     | 175      | 0.071   | 186       | 0.044   | 167   |
| p02     | 375    | none     | 175      | 0.054   | 271       | 0.007   | -     |
| t02-03  | 299    | none     | 175      | 0.096   | 203       | 0.055   | 207   |
| p03     | 375    | none     | 175      | 0.055   | 294       | 0.011   | 2     |
| t03-04  | 563    | none     | 175      | 0.072   | 386       | 0.032   | 203   |
| p04     | 375    | none     | 175      | 0.054   | 270       | 0.006   | -     |
| t04-05  | 500    | none     | 175      | 0.085   | 437       | 0.063   | 231   |
| p05     | 375    | none     | 175      | 0.054   | 269       | 0.010   | 2     |
| t05-06  | 466    | none     | 175      | 0.106   | 362       | 0.058   | 294   |
| p06     | 375    | none     | 175      | 0.055   | 296       | 0.006   | -     |
| t06-07  | 497    | none     | 175      | 0.097   | 1139      | 0.047   | 207   |
| p07     | 1250   | none     | 175      | 0.061   | 2803      | 0.018   | 28    |
| t07-08  | 361    | none     | 240      | 0.080   | 790       | 0.072   | 377   |
| p08     | 1250   | none     | 240      | 0.063   | 2724      | 0.022   | 18    |
| t08-09  | 362    | none     | 240      | 0.117   | 971       | 0.081   | 496   |
| p09     | 1250   | none     | 240      | 0.062   | 3118      | 0.015   | 4     |
| t09-10  | 386    | none     | 240      | 0.086   | 1562      | 0.032   | 212   |
| p10     | 1250   | none     | 240      | 0.061   | 2807      | 0.019   | 11    |
| t10-11  | 498    | none     | 240      | 0.079   | 1197      | 0.051   | 415   |
| p11     | 375    | none     | 240      | 0.060   | 862       | 0.019   | 4     |
| t11-12  | 375    | none     | 240      | 0.094   | 856       | 0.073   | 424   |
| p12     | 375    | none     | 240      | 0.060   | 893       | 0.012   | 4     |
| b12-11  | 371    | none     | 240      | 0.141   | 1013      | 0.088   | 1300  |
| b11-10  | 369    | none     | 240      | 0.100   | 941       | 0.070   | 621   |
| b10-09  | 369    | none     | 240      | 0.126   | 1647      | 0.080   | 850   |
| b09-08  | 368    | none     | 240      | 0.077   | 842       | 0.047   | 426   |
| b08-07  | 368    | none     | 175      | 0.096   | 927       | 0.062   | 641   |
| b07-06  | 369    | none     | 175      | 0.101   | 316       | 0.077   | 470   |
| b06-05  | 367    | none     | 175      | 0.077   | 280       | 0.056   | 195   |
| b05-04  | 368    | none     | 175      | 0.067   | 245       | 0.035   | 56    |
| b04-03  | 367    | none     | 175      | 0.069   | 184       | 0.036   | 105   |
| b03-02  | 367    | none     | 175      | 0.087   | 231       | 0.060   | 194   |
| b02-01  | 367    | none     | 175      | 0.092   | 318       | 0.054   | 255   |

## after mobile

Frames 16661; steepestGround 0.772; error None; rocks and corals counted {'rocks': 39, 'corals': 16}; renderer ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2).

| pair kind          | measured | closest (m) |
| ------------------ | -------- | ----------- |
| mila-fish          | 1228     | 0.339       |
| mila-school        | 1000     | 0.404       |
| mila-turtle        | 192      | 0.469       |
| mila-crab          | 0        | -           |
| mila-liveConch     | 0        | -           |
| mila-pearl         | 0        | -           |
| mila-bigConch      | 4355     | 0.203       |
| mila-debris        | 0        | -           |
| mila-rock          | 11       | 0.704       |
| mila-coral         | 0        | -           |
| mila-ground        | 8490     | 0.133       |
| fish-fish          | 40625    | 0.012       |
| fish-school        | 115      | 0.201       |
| fish-turtle        | 2021     | 0.142       |
| fish-crab          | 0        | -           |
| fish-liveConch     | 0        | -           |
| fish-pearl         | 0        | -           |
| fish-bigConch      | 0        | -           |
| fish-debris        | 0        | -           |
| fish-rock          | 20516    | 0.190       |
| fish-coral         | 3458     | 0.428       |
| fish-ground        | 67       | 0.089       |
| school-school      | 2800191  | 0.037       |
| school-turtle      | 0        | -           |
| school-crab        | 0        | -           |
| school-liveConch   | 0        | -           |
| school-pearl       | 0        | -           |
| school-bigConch    | 0        | -           |
| school-debris      | 0        | -           |
| school-rock        | 0        | -           |
| school-coral       | 0        | -           |
| school-ground      | 0        | -           |
| turtle-crab        | 0        | -           |
| turtle-liveConch   | 0        | -           |
| turtle-pearl       | 0        | -           |
| turtle-bigConch    | 0        | -           |
| turtle-debris      | 0        | -           |
| turtle-rock        | 0        | -           |
| turtle-coral       | 0        | -           |
| turtle-ground      | 0        | -           |
| crab-liveConch     | 0        | -           |
| crab-pearl         | 0        | -           |
| crab-bigConch      | 0        | -           |
| crab-debris        | 5367     | 0.254       |
| crab-rock          | 0        | -           |
| crab-coral         | 0        | -           |
| crab-ground        | 16661    | 0.008       |
| liveConch-pearl    | 0        | -           |
| liveConch-bigConch | 0        | -           |
| liveConch-debris   | 0        | -           |
| liveConch-rock     | 0        | -           |
| liveConch-coral    | 16661    | 0.674       |
| liveConch-ground   | 16661    | -0.008      |

Overlap table (deeper than the tolerance), summed over segments:

| pair kind | frames with an overlap | distinct pairs | deepest (m) | at segment |
| --------- | ---------------------- | -------------- | ----------- | ---------- |
| none      | 0                      | 0              | -           | -          |

Per segment (overlapping kinds as kind frames/distinct pairs/deepest m; fish figures: swimmers, maxStep m, fastSteps, maxJolt m, jolts). Caveat: during page turns the script advances the fake clock in uneven pieces, so step and jolt figures of the t and b segments are inflated on both builds; the page segments (p07 to p10) are the clean ones.

| segment | frames | overlaps | swimmers | maxStep | fastSteps | maxJolt | jolts |
| ------- | ------ | -------- | -------- | ------- | --------- | ------- | ----- |
| p01     | 375    | none     | 111      | 0.042   | -         | 0.006   | -     |
| t01-02  | 299    | none     | 111      | 0.063   | 5         | 0.049   | 129   |
| p02     | 375    | none     | 111      | 0.042   | -         | 0.009   | -     |
| t02-03  | 299    | none     | 111      | 0.043   | -         | 0.008   | -     |
| p03     | 375    | none     | 111      | 0.046   | -         | 0.007   | -     |
| t03-04  | 562    | none     | 111      | 0.072   | 8         | 0.057   | 148   |
| p04     | 375    | none     | 111      | 0.042   | -         | 0.007   | -     |
| t04-05  | 503    | none     | 111      | 0.045   | -         | 0.019   | 16    |
| p05     | 375    | none     | 111      | 0.043   | -         | 0.005   | -     |
| t05-06  | 466    | none     | 111      | 0.079   | 13        | 0.058   | 238   |
| p06     | 375    | none     | 111      | 0.042   | -         | 0.006   | -     |
| t06-07  | 501    | none     | 111      | 0.068   | 645       | 0.050   | 124   |
| p07     | 1250   | none     | 111      | 0.064   | 1718      | 0.017   | 4     |
| t07-08  | 362    | none     | 150      | 0.092   | 460       | 0.077   | 124   |
| p08     | 1250   | none     | 150      | 0.064   | 1675      | 0.015   | 13    |
| t08-09  | 361    | none     | 150      | 0.098   | 599       | 0.081   | 512   |
| p09     | 1250   | none     | 150      | 0.064   | 1905      | 0.013   | 8     |
| t09-10  | 385    | none     | 150      | 0.157   | 1005      | 0.123   | 334   |
| p10     | 1250   | none     | 150      | 0.065   | 1802      | 0.016   | 21    |
| t10-11  | 502    | none     | 150      | 0.078   | 739       | 0.043   | 116   |
| p11     | 375    | none     | 150      | 0.064   | 519       | 0.012   | 4     |
| t11-12  | 375    | none     | 150      | 0.092   | 521       | 0.048   | 107   |
| p12     | 375    | none     | 150      | 0.064   | 544       | 0.011   | 4     |
| b12-11  | 366    | none     | 150      | 0.078   | 596       | 0.043   | 140   |
| b11-10  | 372    | none     | 150      | 0.107   | 601       | 0.087   | 249   |
| b10-09  | 369    | none     | 150      | 0.123   | 1164      | 0.094   | 204   |
| b09-08  | 367    | none     | 150      | 0.075   | 458       | 0.037   | 164   |
| b08-07  | 369    | none     | 111      | 0.075   | 445       | 0.036   | 166   |
| b07-06  | 366    | none     | 111      | 0.045   | -         | 0.014   | 10    |
| b06-05  | 367    | none     | 111      | 0.048   | -         | 0.019   | 16    |
| b05-04  | 368    | none     | 111      | 0.053   | 1         | 0.021   | 43    |
| b04-03  | 367    | none     | 111      | 0.042   | -         | 0.012   | 2     |
| b03-02  | 368    | none     | 111      | 0.065   | 5         | 0.050   | 131   |
| b02-01  | 367    | none     | 111      | 0.082   | 14        | 0.047   | 178   |

## Boards of worst frames (what they show)

Files: Q/boards-c2/clearance-desktop.png (10 pairs) and clearance-mobile.png (9 pairs); each pair is the before frame at its deepest segment for a kind that overlapped before (mila-* kinds first), beside the after frame at the same segment and frame number, ringed at the same place. Sources: Q/c2/clr-before/worst/_.jpg and Q/c2/clr-after/same/_.jpg. I looked at both layouts in full and at three pairs enlarged.

- mila-fish (desktop p09, mobile p07): before, a fish is inside Mila (a yellow-green fish through her head on desktop, enlarged; a blue fish through her dress on mobile, enlarged). After, at the same instant the ringed place shows Mila alone, no fish.
- mila-school (desktop b10-09, mobile p08): before, the school crosses her head and body; after, the ringed place is clear and the school is around her.
- school-school (desktop b08-07: a large yellow fish covers her face before; mobile p07): after, no fish on her. In the mobile p07 after frame (a different instant from the ringed one) two blue fish sit just above and behind her dress, beside it and not inside it (looked at enlarged).
- fish-school p08 (desktop): the ringed place is a fish by a light before, and a single fish at the same place after; no two fish share a place in the after frame.
- crab-ground p06 (desktop and mobile), fish-coral, fish-fish (t10-11), fish-ground, fish-rock, fish-turtle: the overlap is not visible in the before frame (the crab, coral, rock, ground or turtle are out of view, hidden or too small, or the fish is below the surface of the ground), so those pairs show nothing different in the pictures; the numbers are the evidence for them.
- Nothing in any after frame looks like a fish inside Mila, a rock, a coral or another fish.
- Limits: one instant per pair; stand-in shapes (capsules, ellipsoids), not the exact meshes; tail fins left out.
