# Clearance check (O4): every frame, every pair of living forms and solids

Script: qa/mila-clearance.mjs, fake clock, headless GPU Chrome (functional check, not a frame-rate measurement), nice 19. Before = 1638c4c with the read-only probe (Q/clr-base-dist, no BUILD_SHA file in that folder), after = a425401 with the probe (Q/o4-probe-dist, BUILD_SHA a425401d...). Defaults: TOL 0.02 m, REST_SEA 20000 ms, REST_LAND 6000 ms, BACK on; after-long used REST_SEA 40000. Renderer recorded in the json: ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2), browser 157.0.8103.78.

Tolerance: a pair counts when its proxies overlap by more than 0.02 m. Frames measured: before desktop 16651; before mobile 16645; after desktop 16610; after mobile 16629; after-long desktop 21612; after-long mobile 21632.

## Proxies (what stands in for each body)

- mila: capsules: dress (0,0.50,0)-(0,0.86,0) r 0.19; head sphere r 0.13; thighs and shins r 0.035; upper arms r 0.025, forearms r 0.022. Hair buns, hands, feet and the conch she carries are left out
- fish: capsule along the body, 0.18 long, r 0.045, times the fish's size; the tail fin is left out; fish scaled under 0.3 (not yet revealed) are skipped
- turtle: flattened sphere for the shell (r 0.37, half-height 0.11) and a sphere for the head (r 0.1); the flippers are left out
- crab: flattened sphere r 0.45, half-height 0.15 (body and the root of the legs)
- conches: flattened spheres from the bounding boxes of the living conch, the pearl with its valve, the conch on the sand and each piece of debris (85 % of the half-extents)
- rock: flattened sphere: r 1.05 x mean horizontal scale, half-height 0.76 x vertical scale
- coral: flattened sphere around each coral: its branches' widest reach from the foot, half its height
- ground: the scene's own height function; Mila's dress and head, the fish and the turtle are tested against it

## Totals per pair kind

Cells: frames with an overlap / distinct pairs (summed over segments) / deepest overlap in metres. A dash means the kind never overlapped by more than the tolerance in that run.

### desktop

| pair kind     | before               | after | after-long |
| ------------- | -------------------- | ----- | ---------- |
| fish-coral    | 4652 / 183 / 0.426   | -     | -          |
| fish-fish     | 643 / 71 / 0.094     | -     | -          |
| fish-ground   | 13021 / 246 / 0.766  | -     | -          |
| fish-rock     | 9493 / 340 / 0.863   | -     | -          |
| fish-school   | 24 / 4 / 0.057       | -     | -          |
| fish-turtle   | 232 / 8 / 0.262      | -     | -          |
| mila-fish     | 90 / 6 / 0.131       | -     | -          |
| mila-school   | 80 / 13 / 0.196      | -     | -          |
| school-school | 13884 / 1000 / 0.069 | -     | -          |

### mobile

| pair kind     | before             | after | after-long |
| ------------- | ------------------ | ----- | ---------- |
| fish-coral    | 6208 / 178 / 0.460 | -     | -          |
| fish-fish     | 449 / 42 / 0.085   | -     | -          |
| fish-ground   | 1976 / 29 / 0.301  | -     | -          |
| fish-rock     | 7828 / 214 / 1.226 | -     | -          |
| fish-turtle   | 353 / 10 / 0.301   | -     | -          |
| mila-fish     | 94 / 6 / 0.133     | -     | -          |
| mila-school   | 89 / 13 / 0.220    | -     | -          |
| school-school | 7262 / 360 / 0.063 | -     | -          |

## Pair kinds

- kinds that overlapped in the before run: fish-coral, fish-fish, fish-ground, fish-rock, fish-school, fish-turtle, mila-fish, mila-school, school-school
- kinds that overlapped in an after run (after or after-long, either viewport): none
- kinds of the script's list that never overlapped in any of the six runs: mila-turtle, mila-crab, mila-liveConch, mila-pearl, mila-bigConch, mila-debris, mila-rock, mila-coral, mila-ground, fish-liveConch, fish-pearl, school-turtle, school-liveConch, school-pearl, school-rock, school-coral, school-ground, turtle-rock, turtle-coral, turtle-ground, crab-debris, crab-rock, crab-bigConch

## Per segment

Fish figures: swimmers; maxStep (m, largest move of a fish between two frames); fastSteps (moves over 0.05 m); maxJolt (m, largest change of that move from one frame to the next); jolts (changes over 0.01 m). Caveat: during page turns the script advances the fake clock in uneven pieces, so the step and jolt figures of the t and b segments are inflated on both builds; the page segments (p07 to p10) are the clean ones.

### desktop

Overlap cells: kind frames/distinct pairs/deepest m.

| segment | frames before | frames after | overlaps before                                                                                                                                                                               | overlaps after | swimmers b/a | maxStep b/a   | fastSteps b/a | maxJolt b/a   | jolts b/a  |
| ------- | ------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------ | ------------- | ------------- | ------------- | ---------- |
| p01     | 375           | 375          | fish-coral 18/1/0.168; fish-ground 191/3/0.307; fish-rock 185/5/0.632; school-school 328/27/0.066                                                                                             | none           | 175 / 175    | 0.055 / 0.055 | 298 / 302     | 0.000 / 0.011 | - / 2      |
| t01-02  | 297           | 297          | fish-coral 37/2/0.296; fish-ground 117/2/0.138; fish-rock 59/1/0.660; school-school 244/27/0.058                                                                                              | none           | 175 / 175    | 0.062 / 0.059 | 175 / 167     | 0.025 / 0.019 | 61 / 19    |
| p02     | 375           | 375          | fish-coral 75/2/0.301; fish-ground 354/3/0.535; fish-rock 19/1/0.068; school-school 342/30/0.058                                                                                              | none           | 175 / 175    | 0.055 / 0.054 | 266 / 271     | 0.000 / 0.007 | - / -      |
| t02-03  | 299           | 297          | fish-coral 18/1/0.174; fish-fish 3/1/0.040; fish-ground 124/1/0.222; fish-rock 152/6/0.646; school-school 285/26/0.056                                                                        | none           | 175 / 175    | 0.108 / 0.055 | 183 / 168     | 0.049 / 0.008 | 259 / -    |
| p03     | 375           | 375          | fish-coral 21/1/0.271; fish-fish 3/1/0.042; fish-ground 197/3/0.254; fish-rock 30/1/0.171; school-school 321/24/0.065                                                                         | none           | 175 / 175    | 0.055 / 0.055 | 297 / 294     | 0.000 / 0.011 | - / 2      |
| t03-04  | 561           | 560          | fish-coral 149/5/0.261; fish-ground 204/2/0.661; fish-rock 221/5/0.585; school-school 527/42/0.065                                                                                            | none           | 175 / 175    | 0.090 / 0.054 | 384 / 337     | 0.058 / 0.014 | 508 / 6    |
| p04     | 375           | 375          | fish-fish 8/1/0.049; fish-ground 142/3/0.289; fish-rock 28/1/0.144; school-school 270/19/0.050                                                                                                | none           | 175 / 175    | 0.055 / 0.054 | 272 / 282     | 0.000 / 0.006 | - / -      |
| t04-05  | 499           | 498          | fish-coral 66/3/0.239; fish-ground 208/3/0.587; fish-rock 228/6/0.694; school-school 434/32/0.057                                                                                             | none           | 175 / 175    | 0.056 / 0.055 | 410 / 416     | 0.019 / 0.013 | 20 / 5     |
| p05     | 375           | 375          | fish-coral 86/2/0.367; fish-ground 188/2/0.286; fish-rock 81/2/0.259; school-school 325/24/0.058                                                                                              | none           | 175 / 175    | 0.055 / 0.054 | 272 / 269     | 0.000 / 0.010 | - / 2      |
| t05-06  | 465           | 465          | fish-coral 24/2/0.248; fish-fish 6/2/0.030; fish-ground 240/4/0.368; fish-rock 213/6/0.648; school-school 407/28/0.061                                                                        | none           | 175 / 175    | 0.161 / 0.055 | 369 / 355     | 0.116 / 0.015 | 350 / 6    |
| p06     | 375           | 375          | fish-coral 67/2/0.304; fish-fish 13/1/0.049; fish-ground 99/1/0.133; fish-rock 43/2/0.381; school-school 333/22/0.061                                                                         | none           | 175 / 175    | 0.055 / 0.055 | 290 / 282     | 0.000 / 0.006 | - / -      |
| t06-07  | 500           | 497          | fish-coral 70/4/0.217; fish-fish 52/5/0.053; fish-ground 475/13/0.555; fish-rock 264/11/0.664; school-school 383/29/0.062                                                                     | none           | 175 / 175    | 0.060 / 0.068 | 1046 / 1106   | 0.006 / 0.029 | - / 12     |
| p07     | 1250          | 1250         | fish-coral 458/17/0.381; fish-fish 55/7/0.073; fish-ground 1068/17/0.657; fish-rock 1010/29/0.676; mila-fish 3/1/0.021; school-school 1105/67/0.066                                           | none           | 175 / 175    | 0.060 / 0.061 | 2714 / 2769   | 0.001 / 0.018 | - / 23     |
| t07-08  | 364           | 360          | fish-coral 109/5/0.343; fish-fish 29/3/0.065; fish-ground 364/9/0.471; fish-rock 349/11/0.740; mila-school 7/1/0.060; school-school 364/24/0.063                                              | none           | 240 / 240    | 1.078 / 0.069 | 1400 / 774    | 1.098 / 0.075 | 1210 / 191 |
| p08     | 1250          | 1250         | fish-coral 531/20/0.407; fish-fish 91/9/0.087; fish-ground 1250/18/0.718; fish-rock 943/29/0.771; fish-school 24/4/0.057; mila-school 40/3/0.175; school-school 837/21/0.055                  | none           | 240 / 240    | 0.061 / 0.064 | 2934 / 2688   | 0.001 / 0.022 | - / 18     |
| t08-09  | 362           | 359          | fish-coral 154/8/0.426; fish-ground 362/15/0.387; fish-rock 286/14/0.591; mila-fish 30/1/0.106; school-school 323/28/0.053                                                                    | none           | 240 / 240    | 1.089 / 0.069 | 1142 / 909    | 1.109 / 0.050 | 696 / 261  |
| p09     | 1250          | 1250         | fish-coral 553/18/0.411; fish-fish 48/5/0.092; fish-ground 1250/19/0.755; fish-rock 883/33/0.835; fish-turtle 82/2/0.190; mila-fish 46/2/0.131; school-school 902/52/0.065                    | none           | 240 / 240    | 0.060 / 0.062 | 3021 / 3119   | 0.001 / 0.015 | - / 4      |
| t09-10  | 388           | 384          | fish-coral 124/5/0.310; fish-fish 58/5/0.040; fish-ground 388/12/0.701; fish-rock 323/13/0.651; mila-school 19/3/0.188; school-school 320/18/0.066                                            | none           | 240 / 240    | 0.151 / 0.098 | 1029 / 1576   | 0.102 / 0.039 | 681 / 220  |
| p10     | 1250          | 1250         | fish-coral 542/17/0.364; fish-fish 60/7/0.069; fish-ground 1250/20/0.766; fish-rock 893/30/0.730; fish-turtle 11/1/0.055; school-school 985/62/0.058                                          | none           | 240 / 240    | 0.060 / 0.061 | 2749 / 2744   | 0.001 / 0.019 | - / 12     |
| t10-11  | 497           | 496          | fish-coral 123/6/0.276; fish-fish 42/3/0.094; fish-ground 459/11/0.744; fish-rock 353/16/0.863; school-school 389/32/0.069                                                                    | none           | 240 / 240    | 0.168 / 0.060 | 1252 / 1173   | 0.126 / 0.016 | 944 / 3    |
| p11     | 375           | 375          | fish-coral 197/10/0.327; fish-fish 15/2/0.050; fish-ground 375/10/0.694; fish-rock 300/13/0.615; school-school 370/32/0.056                                                                   | none           | 240 / 240    | 0.060 / 0.060 | 829 / 849     | 0.001 / 0.019 | - / 4      |
| t11-12  | 374           | 374          | fish-coral 77/3/0.217; fish-fish 24/2/0.086; fish-ground 374/9/0.383; fish-rock 285/11/0.660; school-school 265/25/0.052                                                                      | none           | 240 / 240    | 0.172 / 0.063 | 913 / 850     | 0.117 / 0.010 | 708 / 2    |
| p12     | 375           | 375          | fish-coral 121/8/0.252; fish-fish 47/5/0.079; fish-ground 375/9/0.589; fish-rock 263/12/0.656; school-school 350/23/0.060                                                                     | none           | 240 / 240    | 0.060 / 0.060 | 857 / 870     | 0.001 / 0.012 | - / 4      |
| b12-11  | 365           | 365          | fish-coral 154/5/0.275; fish-fish 46/3/0.072; fish-ground 365/7/0.725; fish-rock 326/13/0.713; fish-turtle 52/2/0.062; school-school 365/27/0.058                                             | none           | 240 / 240    | 0.171 / 0.060 | 957 / 889     | 0.126 / 0.012 | 1073 / 7   |
| b11-10  | 369           | 365          | fish-coral 165/8/0.276; fish-ground 369/10/0.699; fish-rock 242/12/0.640; fish-turtle 52/2/0.262; school-school 352/31/0.061                                                                  | none           | 240 / 240    | 0.184 / 0.068 | 1414 / 879    | 0.114 / 0.019 | 657 / 27   |
| b10-09  | 368           | 365          | fish-coral 83/3/0.364; fish-fish 4/1/0.051; fish-ground 368/12/0.650; fish-rock 279/10/0.678; mila-school 13/5/0.196; school-school 355/32/0.065                                              | none           | 240 / 240    | 0.187 / 0.122 | 1232 / 1605   | 0.127 / 0.094 | 981 / 185  |
| b09-08  | 368           | 365          | fish-coral 180/9/0.242; fish-fish 21/4/0.079; fish-ground 346/7/0.289; fish-rock 281/13/0.817; school-school 300/23/0.066                                                                     | none           | 240 / 240    | 1.080 / 0.061 | 1243 / 836    | 1.098 / 0.052 | 700 / 179  |
| b08-07  | 364           | 365          | fish-coral 156/6/0.322; fish-fish 8/1/0.048; fish-ground 364/7/0.681; fish-rock 303/13/0.728; fish-turtle 35/1/0.232; mila-fish 11/2/0.100; mila-school 1/1/0.032; school-school 319/31/0.063 | none           | 175 / 175    | 1.083 / 0.063 | 1612 / 834    | 1.094 / 0.036 | 2244 / 144 |
| b07-06  | 367           | 366          | fish-coral 68/2/0.216; fish-ground 313/3/0.613; fish-rock 166/4/0.690; school-school 318/30/0.067                                                                                             | none           | 175 / 175    | 0.144 / 0.057 | 329 / 300     | 0.098 / 0.013 | 377 / 5    |
| b06-05  | 366           | 368          | fish-coral 18/1/0.155; fish-ground 167/2/0.221; fish-rock 50/2/0.259; school-school 267/25/0.054                                                                                              | none           | 175 / 175    | 0.096 / 0.064 | 312 / 250     | 0.048 / 0.029 | 204 / 43   |
| b05-04  | 371           | 366          | fish-coral 69/2/0.215; fish-fish 7/2/0.048; fish-ground 330/4/0.411; fish-rock 174/6/0.651; school-school 254/26/0.058                                                                        | none           | 175 / 175    | 0.094 / 0.055 | 321 / 195     | 0.044 / 0.019 | 128 / 4    |
| b04-03  | 367           | 367          | fish-coral 71/3/0.241; fish-fish 3/1/0.053; fish-rock 19/3/0.281; school-school 345/16/0.059                                                                                                  | none           | 175 / 175    | 0.096 / 0.058 | 192 / 205     | 0.045 / 0.010 | 151 / -    |
| b03-02  | 369           | 365          | fish-ground 105/3/0.152; fish-rock 118/3/0.253; school-school 308/24/0.049                                                                                                                    | none           | 175 / 175    | 0.109 / 0.055 | 223 / 297     | 0.055 / 0.014 | 211 / 6    |
| b02-01  | 371           | 366          | fish-coral 68/2/0.268; fish-ground 240/2/0.257; fish-rock 124/3/0.666; school-school 292/21/0.066                                                                                             | none           | 175 / 175    | 0.094 / 0.055 | 324 / 310     | 0.035 / 0.014 | 107 / 3    |

### mobile

Overlap cells: kind frames/distinct pairs/deepest m.

| segment | frames before | frames after | overlaps before                                                                                                                                                           | overlaps after | swimmers b/a | maxStep b/a   | fastSteps b/a | maxJolt b/a   | jolts b/a |
| ------- | ------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------ | ------------- | ------------- | ------------- | --------- |
| p01     | 375           | 375          | fish-coral 190/4/0.365; fish-rock 139/4/0.775; school-school 75/7/0.048                                                                                                   | none           | 111 / 111    | 0.042 / 0.042 | - / -         | 0.000 / 0.006 | - / -     |
| t01-02  | 299           | 299          | fish-coral 31/1/0.126; fish-ground 31/1/0.033; fish-rock 75/3/0.739; school-school 121/9/0.062                                                                            | none           | 111 / 111    | 0.051 / 0.046 | 1 / -         | 0.028 / 0.009 | 38 / -    |
| p02     | 375           | 375          | fish-coral 18/1/0.059; school-school 166/7/0.056                                                                                                                          | none           | 111 / 111    | 0.042 / 0.042 | - / -         | 0.000 / 0.009 | - / -     |
| t02-03  | 299           | 297          | fish-coral 207/3/0.394; fish-rock 129/3/0.571; school-school 83/6/0.046                                                                                                   | none           | 111 / 111    | 0.042 / 0.042 | - / -         | 0.004 / 0.004 | - / -     |
| p03     | 375           | 375          | fish-rock 142/3/0.568; school-school 193/9/0.061                                                                                                                          | none           | 111 / 111    | 0.042 / 0.046 | - / -         | 0.000 / 0.007 | - / -     |
| t03-04  | 561           | 561          | fish-coral 52/3/0.153; fish-ground 111/1/0.274; fish-rock 73/2/0.391; school-school 180/9/0.057                                                                           | none           | 111 / 111    | 0.042 / 0.042 | - / -         | 0.005 / 0.005 | - / -     |
| p04     | 375           | 375          | fish-coral 243/4/0.237; fish-rock 177/2/0.520; school-school 75/7/0.047                                                                                                   | none           | 111 / 111    | 0.043 / 0.042 | - / -         | 0.000 / 0.008 | - / -     |
| t04-05  | 501           | 500          | fish-coral 67/4/0.221; fish-ground 108/1/0.093; fish-rock 81/2/0.593; school-school 345/12/0.058                                                                          | none           | 111 / 111    | 0.057 / 0.043 | 5 / -         | 0.040 / 0.013 | 107 / 10  |
| p05     | 375           | 375          | fish-coral 81/2/0.460; fish-rock 59/1/0.122; school-school 357/13/0.062                                                                                                   | none           | 111 / 111    | 0.043 / 0.043 | - / -         | 0.000 / 0.005 | - / -     |
| t05-06  | 468           | 466          | fish-coral 229/7/0.333; fish-rock 166/4/0.783; school-school 378/12/0.063                                                                                                 | none           | 111 / 111    | 0.055 / 0.045 | 1 / -         | 0.024 / 0.005 | 21 / -    |
| p06     | 375           | 375          | fish-ground 46/1/0.056; school-school 315/13/0.061                                                                                                                        | none           | 111 / 111    | 0.042 / 0.042 | - / -         | 0.000 / 0.005 | - / -     |
| t06-07  | 499           | 500          | fish-coral 306/8/0.229; fish-fish 17/3/0.045; fish-rock 321/11/1.226; fish-turtle 12/1/0.067; school-school 280/13/0.062                                                  | none           | 111 / 111    | 0.064 / 0.154 | 671 / 633     | 0.001 / 0.135 | - / 8     |
| p07     | 1250          | 1250         | fish-coral 608/13/0.388; fish-fish 50/3/0.051; fish-ground 290/4/0.252; fish-rock 614/16/1.194; mila-fish 64/4/0.133; school-school 919/28/0.060                          | none           | 111 / 111    | 0.064 / 0.064 | 1696 / 1712   | 0.001 / 0.015 | - / 4     |
| t07-08  | 362           | 362          | fish-coral 102/5/0.384; fish-fish 6/1/0.068; fish-rock 123/5/0.333; mila-fish 4/1/0.089; mila-school 16/1/0.219; school-school 107/7/0.052                                | none           | 150 / 150    | 1.063 / 0.080 | 720 / 462     | 1.063 / 0.079 | 257 / 117 |
| p08     | 1250          | 1250         | fish-coral 614/15/0.434; fish-fish 48/5/0.060; fish-ground 155/2/0.115; fish-rock 826/21/1.056; fish-turtle 32/1/0.138; mila-school 42/3/0.219; school-school 154/8/0.056 | none           | 150 / 150    | 0.064 / 0.064 | 1672 / 1681   | 0.001 / 0.012 | - / 17    |
| t08-09  | 362           | 362          | fish-coral 79/3/0.410; fish-ground 144/2/0.291; fish-rock 268/7/0.858; mila-school 5/1/0.038; school-school 101/5/0.056                                                   | none           | 150 / 150    | 1.056 / 0.064 | 623 / 556     | 1.056 / 0.040 | 251 / 151 |
| p09     | 1250          | 1250         | fish-coral 492/14/0.392; fish-fish 19/2/0.040; fish-ground 154/3/0.138; fish-rock 769/16/1.186; fish-turtle 60/1/0.191; mila-fish 26/1/0.124; school-school 548/23/0.060  | none           | 150 / 150    | 0.064 / 0.064 | 1874 / 1906   | 0.001 / 0.011 | - / 6     |
| t09-10  | 390           | 385          | fish-coral 184/4/0.453; fish-fish 57/4/0.073; fish-ground 75/1/0.252; fish-rock 120/5/1.036; fish-turtle 43/1/0.205; mila-school 12/3/0.220; school-school 216/12/0.048   | none           | 150 / 150    | 0.127 / 0.090 | 653 / 968     | 0.065 / 0.015 | 286 / 23  |
| p10     | 1250          | 1250         | fish-coral 562/14/0.413; fish-fish 82/6/0.084; fish-ground 246/4/0.216; fish-rock 777/16/0.989; school-school 566/26/0.056                                                | none           | 150 / 150    | 0.064 / 0.065 | 1783 / 1797   | 0.001 / 0.018 | - / 20    |
| t10-11  | 500           | 499          | fish-coral 110/6/0.366; fish-fish 19/3/0.085; fish-ground 175/1/0.205; fish-rock 357/11/0.925; fish-turtle 20/1/0.144; school-school 231/15/0.058                         | none           | 150 / 150    | 0.106 / 0.064 | 751 / 733     | 0.064 / 0.022 | 211 / 10  |
| p11     | 375           | 375          | fish-coral 260/11/0.341; fish-fish 16/2/0.060; fish-rock 133/7/1.204; school-school 118/6/0.050                                                                           | none           | 150 / 150    | 0.064 / 0.064 | 511 / 519     | 0.001 / 0.013 | - / 4     |
| t11-12  | 374           | 373          | fish-coral 45/4/0.177; fish-fish 47/3/0.085; fish-rock 284/11/0.973; fish-turtle 64/2/0.301; school-school 250/11/0.056                                                   | none           | 150 / 150    | 0.172 / 0.072 | 545 / 512     | 0.156 / 0.023 | 348 / 16  |
| p12     | 375           | 375          | fish-coral 216/7/0.412; fish-fish 25/3/0.075; fish-rock 259/9/0.758; fish-turtle 7/1/0.130; school-school 141/11/0.062                                                    | none           | 150 / 150    | 0.064 / 0.064 | 530 / 556     | 0.001 / 0.012 | - / 6     |
| b12-11  | 367           | 368          | fish-coral 258/6/0.458; fish-fish 53/5/0.084; fish-ground 59/1/0.098; fish-rock 270/7/1.146; school-school 70/6/0.054                                                     | none           | 150 / 150    | 0.064 / 0.068 | 576 / 591     | 0.001 / 0.016 | - / 8     |
| b11-10  | 367           | 364          | fish-coral 161/5/0.290; fish-fish 10/2/0.046; fish-rock 287/11/1.149; school-school 132/12/0.049                                                                          | none           | 150 / 150    | 0.091 / 0.064 | 580 / 576     | 0.052 / 0.012 | 114 / 6   |
| b10-09  | 369           | 366          | fish-coral 178/5/0.204; fish-ground 5/1/0.035; fish-rock 277/9/1.022; fish-turtle 50/1/0.251; mila-school 14/5/0.200; school-school 225/13/0.054                          | none           | 150 / 150    | 0.107 / 0.116 | 552 / 1103    | 0.067 / 0.091 | 171 / 117 |
| b09-08  | 366           | 366          | fish-coral 80/4/0.346; fish-ground 119/1/0.301; fish-rock 185/6/1.221; school-school 119/7/0.053                                                                          | none           | 150 / 150    | 1.069 / 0.064 | 676 / 464     | 1.070 / 0.037 | 250 / 96  |
| b08-07  | 365           | 366          | fish-coral 223/9/0.391; fish-ground 84/2/0.121; fish-rock 240/7/1.202; school-school 149/11/0.056                                                                         | none           | 111 / 111    | 1.054 / 0.064 | 531 / 430     | 1.066 / 0.038 | 180 / 91  |
| b07-06  | 366           | 366          | fish-coral 24/1/0.078; fish-ground 79/1/0.089; fish-rock 99/3/0.743; school-school 129/8/0.057                                                                            | none           | 111 / 111    | 0.044 / 0.043 | - / -         | 0.010 / 0.006 | - / -     |
| b06-05  | 366           | 366          | fish-coral 37/2/0.131; fish-ground 16/1/0.062; fish-rock 42/1/0.146; school-school 23/1/0.038                                                                             | none           | 111 / 111    | 0.042 / 0.043 | - / -         | 0.000 / 0.006 | - / -     |
| b05-04  | 365           | 366          | fish-coral 217/4/0.424; fish-rock 178/3/0.500; fish-turtle 65/1/0.225; school-school 85/5/0.045                                                                           | none           | 111 / 111    | 0.043 / 0.043 | - / -         | 0.004 / 0.007 | - / -     |
| b04-03  | 365           | 366          | fish-coral 30/1/0.123; fish-rock 86/2/0.199; school-school 206/13/0.059                                                                                                   | none           | 111 / 111    | 0.042 / 0.043 | - / -         | 0.000 / 0.005 | - / -     |
| b03-02  | 365           | 365          | fish-coral 94/4/0.146; fish-ground 79/1/0.133; fish-rock 111/3/0.516; school-school 122/8/0.057                                                                           | none           | 111 / 111    | 0.043 / 0.043 | - / -         | 0.000 / 0.006 | - / -     |
| b02-01  | 369           | 366          | fish-coral 210/4/0.342; fish-rock 161/3/0.420; school-school 83/7/0.048                                                                                                   | none           | 111 / 111    | 0.044 / 0.043 | - / -         | 0.010 / 0.006 | - / -     |

## Boards of worst frames (what they show)

Files: Q/boards-o4/clearance-desktop.png and clearance-mobile.png (4 columns: before frame, after frame at the same segment and frame number, ringed at the same place; two deepest segments per pair kind present before; the selection is in the left column labels). Sources: Q/o4/clr-before/worst/_.jpg and Q/o4/clr-after/same/_.jpg. Looked at all desktop and mobile pairs.

- mila-fish and mila-school (desktop p09, t08-09, b10-09, t09-10; mobile p07, p09, t09-10, p08): before, the ring sits on Mila's head, dress or body with a fish visibly overlapping her (a yellow fish at her head on p09, fish crossing her dress on t09-10 and b10-09, a fish over her dress on mobile p07). After, at the same instant the ringed place shows Mila alone: the school or fish are beside or around her, none on her. In desktop b10-09 the school opens around her where it covered her before.
- fish-fish and school-school: before, two or more fish share a place in the ring on t10-11 (desktop), b07-06 (desktop, a yellow fish covers Mila's face in the before frame) and p09. On the t10-11, t11-12 and t05-06/p05 frames (page 11, 12 and 5-6, above the water) the ringed place is not visible in the picture in either build (the overlapping fish are under the water surface or hidden), so the pair shows nothing different. After: the same instants show separate fish or none in view.
- fish-school (desktop p08): ring at the top right shows two fish touching before; after the two are apart.
- fish-turtle (desktop b11-10, b08-07; mobile t11-12, b10-09): the overlap is not visible in the before frames (fish and turtle are out of view or hidden at those instants); the after frames show nothing at the place either.
- fish-rock, fish-coral and fish-ground (desktop p09, t10-11, t08-09, p10; mobile t06-07, b09-08, p05, b12-11, t08-09): in most before frames the ring is on open water or on a place where the rock, coral or ground hides the fish, so the overlap cannot be seen in the picture; desktop p09 fish-ground ringed at Mila's wand light shows nothing identifiable in the before frame or in the after frame (the ring is on the bright light of the wand).
- Nothing in any after frame looks like a fish inside Mila, a rock, a coral or another fish. In the after frames the pearl and conch region differs from before because of the O5 conch change, not because of fish.
- Limits: a frame is one instant; the check is on proxies (capsules, flattened spheres), not the exact meshes, and tail fins are left out (see proxies).
