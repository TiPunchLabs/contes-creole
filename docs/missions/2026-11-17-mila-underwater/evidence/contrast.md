# Text legibility behind the tale text, baseline d60c1a6 vs final 3d09931

Method: scene-only stills (reading UI hidden, so the translucent voile behind the card is NOT part of the background), pixels inside the DOM rects of each text line, relative luminance (WCAG 2). Worst-case contrast = text colour against the p95 background luminance (and p5, lower of the two). Deterministic fake-clock stills, 6 s after arrival. Blocks: num = page label, heading, text = body, gloss = French gloss.

Cells: scene-only bg mean lum / bg p95 lum / text lum / worst contrast (scene-only) / contrast against the median luminance of the same pixels in the full still (includes the voile and the glyphs themselves, so only a rough guide to what the reader sees).

| block                  | baseline                        | final                           | flag                                       |
| ---------------------- | ------------------------------- | ------------------------------- | ------------------------------------------ |
| desktop-fr-p07.heading | 0.0706/0.1671/0.8219/4.02/10.62 | 0.0899/0.1678/0.8219/4.0/9.01   | final lower than baseline; final under 4.5 |
| desktop-fr-p07.num     | 0.063/0.1201/0.5905/3.77/7.05   | 0.0803/0.1222/0.5905/3.72/6.38  | final lower than baseline; final under 4.5 |
| desktop-fr-p07.text    | 0.0833/0.1915/0.8219/3.61/10.55 | 0.0917/0.1656/0.8219/4.04/9.96  | final under 4.5                            |
| desktop-fr-p08.heading | 0.1135/0.3539/0.8219/2.16/9.27  | 0.1186/0.3256/0.8219/2.32/8.9   | final under 4.5                            |
| desktop-fr-p08.num     | 0.0537/0.0621/0.5905/5.71/7.38  | 0.0711/0.0797/0.5905/4.94/6.61  | final lower than baseline                  |
| desktop-fr-p08.text    | 0.104/0.3191/0.8219/2.36/10.61  | 0.1072/0.3053/0.8219/2.45/10.35 | final under 4.5                            |
| desktop-fr-p09.heading | 0.0399/0.0738/0.8219/7.04/12.42 | 0.0499/0.0657/0.8219/7.53/11.51 | no                                         |
| desktop-fr-p09.num     | 0.0378/0.0487/0.5905/6.49/8.47  | 0.0451/0.0476/0.5905/6.56/8.05  | no                                         |
| desktop-fr-p09.text    | 0.0288/0.06/0.8219/7.92/13.42   | 0.0344/0.0436/0.8219/9.31/12.68 | no                                         |
| desktop-fr-p10.heading | 0.0703/0.1038/0.8219/5.67/10.24 | 0.1534/0.1923/0.8219/3.6/7.31   | final lower than baseline; final under 4.5 |
| desktop-fr-p10.num     | 0.07/0.0823/0.5905/4.84/6.45    | 0.1332/0.1494/0.5905/3.21/4.79  | final lower than baseline; final under 4.5 |
| desktop-fr-p10.text    | 0.1049/0.1467/0.8219/4.43/9.06  | 0.1896/0.2301/0.8219/3.11/6.82  | final lower than baseline; final under 4.5 |
| desktop-p07.heading    | 0.087/0.1881/0.8219/3.66/10.15  | 0.0952/0.1742/0.8219/3.89/9.25  | final under 4.5                            |
| desktop-p07.num        | 0.057/0.1323/0.5905/3.51/7.82   | 0.1196/0.1767/0.5905/2.83/4.75  | final lower than baseline; final under 4.5 |
| desktop-p07.text       | 0.1017/0.2413/0.8219/2.99/9.86  | 0.0969/0.2265/0.8219/3.15/9.87  | final under 4.5                            |
| desktop-p08.heading    | 0.1909/0.5319/0.8219/1.5/9.25   | 0.1921/0.4962/0.8219/1.6/8.69   | final under 4.5                            |
| desktop-p08.num        | 0.0536/0.0902/0.5905/4.57/7.01  | 0.073/0.0831/0.5905/4.81/6.6    | no                                         |
| desktop-p08.text       | 0.0954/0.3317/0.8219/2.28/10.45 | 0.0984/0.3189/0.8219/2.36/10.27 | final under 4.5                            |
| desktop-p09.heading    | 0.2468/0.3388/0.8219/2.24/5.3   | 0.2406/0.3183/0.8219/2.37/5.56  | final under 4.5                            |
| desktop-p09.num        | 0.2215/0.264/0.5905/2.04/3.61   | 0.2194/0.2602/0.5905/2.06/3.63  | final under 4.5                            |
| desktop-p09.text       | 0.0901/0.3608/0.8219/2.12/12.06 | 0.0826/0.3062/0.8219/2.45/12.24 | final under 4.5                            |
| desktop-p10.heading    | 0.0729/0.1074/0.8219/5.54/10.21 | 0.1547/0.1953/0.8219/3.55/7.43  | final lower than baseline; final under 4.5 |
| desktop-p10.num        | 0.0599/0.0636/0.5905/5.64/7.28  | 0.1222/0.1294/0.5905/3.57/5.29  | final lower than baseline; final under 4.5 |
| desktop-p10.text       | 0.102/0.1493/0.8219/4.37/9.01   | 0.1996/0.2194/0.8219/3.24/6.4   | final lower than baseline; final under 4.5 |
| mobile-p07.heading     | 0.0596/0.0725/0.8219/7.12/13.44 | 0.1077/0.1449/0.8219/4.47/12.42 | final lower than baseline; final under 4.5 |
| mobile-p07.num         | 0.0734/0.0973/0.5905/4.35/9.94  | 0.1104/0.1443/0.5905/3.3/9.53   | final lower than baseline; final under 4.5 |
| mobile-p07.text        | 0.1027/0.2006/0.8219/3.48/11.58 | 0.1151/0.1992/0.8219/3.5/11.57  | final under 4.5                            |
| mobile-p08.heading     | 0.0835/0.1537/0.8219/4.28/13.28 | 0.1234/0.1895/0.8219/3.64/12.54 | final lower than baseline; final under 4.5 |
| mobile-p08.num         | 0.0557/0.0745/0.5905/5.15/10.26 | 0.1164/0.1323/0.5905/3.51/9.52  | final lower than baseline; final under 4.5 |
| mobile-p08.text        | 0.1389/0.3807/0.8219/2.02/11.41 | 0.1368/0.3477/0.8219/2.19/11.63 | final under 4.5                            |
| mobile-p09.heading     | 0.0429/0.064/0.8219/7.64/13.85  | 0.064/0.0759/0.8219/6.93/13.24  | final lower than baseline                  |
| mobile-p09.num         | 0.0393/0.0499/0.5905/6.41/10.45 | 0.0754/0.0869/0.5905/4.68/9.84  | final lower than baseline                  |
| mobile-p09.text        | 0.0786/0.1893/0.8219/3.64/12.4  | 0.0781/0.1473/0.8219/4.42/12.51 | final under 4.5                            |
| mobile-p10.heading     | 0.0672/0.0805/0.8219/6.68/13.22 | 0.1274/0.1444/0.8219/4.49/11.8  | final lower than baseline; final under 4.5 |
| mobile-p10.num         | 0.0696/0.092/0.5905/4.51/10.01  | 0.1071/0.1268/0.5905/3.62/9.51  | final lower than baseline; final under 4.5 |
| mobile-p10.text        | 0.0622/0.0715/0.8219/7.18/12.81 | 0.1741/0.1959/0.8219/3.55/10.09 | final lower than baseline; final under 4.5 |
| tablet-p07.heading     | 0.0951/0.1891/0.8219/3.65/9.52  | 0.0833/0.1525/0.8219/4.3/9.54   | final under 4.5                            |
| tablet-p07.num         | 0.0712/0.2196/0.5905/2.38/7.7   | 0.1421/0.2062/0.5905/2.5/4.61   | final under 4.5                            |
| tablet-p07.text        | 0.1121/0.2126/0.8219/3.32/9.22  | 0.1073/0.206/0.8219/3.41/9.54   | final under 4.5                            |
| tablet-p08.heading     | 0.2677/0.5342/0.8219/1.49/4.4   | 0.2572/0.5002/0.8219/1.58/4.69  | final under 4.5                            |
| tablet-p08.num         | 0.067/0.1312/0.5905/3.53/6.99   | 0.0796/0.12/0.5905/3.77/6.46    | final under 4.5                            |
| tablet-p08.text        | 0.1569/0.4166/0.8219/1.87/8.68  | 0.1529/0.3917/0.8219/1.97/8.95  | final under 4.5                            |
| tablet-p09.heading     | 0.1062/0.2447/0.8219/2.96/6.66  | 0.1175/0.2459/0.8219/2.95/6.68  | final lower than baseline; final under 4.5 |
| tablet-p09.num         | 0.1224/0.2524/0.5905/2.12/4.57  | 0.1301/0.2502/0.5905/2.13/4.11  | final under 4.5                            |
| tablet-p09.text        | 0.05/0.2304/0.8219/3.11/12.79   | 0.0486/0.1734/0.8219/3.9/12.71  | final under 4.5                            |
| tablet-p10.heading     | 0.0642/0.0859/0.8219/6.42/10.45 | 0.1491/0.18/0.8219/3.79/7.32    | final lower than baseline; final under 4.5 |
| tablet-p10.num         | 0.0611/0.0653/0.5905/5.56/7.28  | 0.1236/0.1321/0.5905/3.52/5.3   | final lower than baseline; final under 4.5 |
| tablet-p10.text        | 0.0922/0.1465/0.8219/4.44/9.79  | 0.1938/0.2148/0.8219/3.29/6.89  | final lower than baseline; final under 4.5 |

# Text legibility behind the tale text, baseline d60c1a6 vs final 3d09931

Method: scene-only stills (reading UI hidden, so the translucent voile behind the card is NOT part of the background), pixels inside the DOM rects of each text line, relative luminance (WCAG 2). Worst-case contrast = text colour against the p95 background luminance (and p5, lower of the two). Deterministic fake-clock stills, 6 s after arrival. Blocks: num = page label, heading, text = body, gloss = French gloss.

Cells: scene-only bg mean lum / bg p95 lum / text lum / worst contrast (scene-only) / contrast against the median luminance of the same pixels in the full still (includes the voile and the glyphs themselves, so only a rough guide to what the reader sees).

| block                  | baseline                        | final                           | flag                                       |
| ---------------------- | ------------------------------- | ------------------------------- | ------------------------------------------ |
| desktop-fr-p07.heading | 0.0706/0.1671/0.8219/4.02/10.62 | 0.0899/0.1678/0.8219/4.0/9.01   | final lower than baseline; final under 4.5 |
| desktop-fr-p07.num     | 0.063/0.1201/0.5905/3.77/7.05   | 0.0803/0.1222/0.5905/3.72/6.38  | final lower than baseline; final under 4.5 |
| desktop-fr-p07.text    | 0.0833/0.1915/0.8219/3.61/10.55 | 0.0917/0.1656/0.8219/4.04/9.96  | final under 4.5                            |
| desktop-fr-p08.heading | 0.1135/0.3539/0.8219/2.16/9.27  | 0.1186/0.3256/0.8219/2.32/8.9   | final under 4.5                            |
| desktop-fr-p08.num     | 0.0537/0.0621/0.5905/5.71/7.38  | 0.0711/0.0797/0.5905/4.94/6.61  | final lower than baseline                  |
| desktop-fr-p08.text    | 0.104/0.3191/0.8219/2.36/10.61  | 0.1072/0.3053/0.8219/2.45/10.35 | final under 4.5                            |
| desktop-fr-p09.heading | 0.0399/0.0738/0.8219/7.04/12.42 | 0.0499/0.0657/0.8219/7.53/11.51 | no                                         |
| desktop-fr-p09.num     | 0.0378/0.0487/0.5905/6.49/8.47  | 0.0451/0.0476/0.5905/6.56/8.05  | no                                         |
| desktop-fr-p09.text    | 0.0288/0.06/0.8219/7.92/13.42   | 0.0344/0.0436/0.8219/9.31/12.68 | no                                         |
| desktop-fr-p10.heading | 0.0703/0.1038/0.8219/5.67/10.24 | 0.1534/0.1923/0.8219/3.6/7.31   | final lower than baseline; final under 4.5 |
| desktop-fr-p10.num     | 0.07/0.0823/0.5905/4.84/6.45    | 0.1332/0.1494/0.5905/3.21/4.79  | final lower than baseline; final under 4.5 |
| desktop-fr-p10.text    | 0.1049/0.1467/0.8219/4.43/9.06  | 0.1896/0.2301/0.8219/3.11/6.82  | final lower than baseline; final under 4.5 |
| desktop-p07.heading    | 0.087/0.1881/0.8219/3.66/10.15  | 0.0952/0.1742/0.8219/3.89/9.25  | final under 4.5                            |
| desktop-p07.num        | 0.057/0.1323/0.5905/3.51/7.82   | 0.1196/0.1767/0.5905/2.83/4.75  | final lower than baseline; final under 4.5 |
| desktop-p07.text       | 0.1017/0.2413/0.8219/2.99/9.86  | 0.0969/0.2265/0.8219/3.15/9.87  | final under 4.5                            |
| desktop-p08.heading    | 0.1909/0.5319/0.8219/1.5/9.25   | 0.1921/0.4962/0.8219/1.6/8.69   | final under 4.5                            |
| desktop-p08.num        | 0.0536/0.0902/0.5905/4.57/7.01  | 0.073/0.0831/0.5905/4.81/6.6    | no                                         |
| desktop-p08.text       | 0.0954/0.3317/0.8219/2.28/10.45 | 0.0984/0.3189/0.8219/2.36/10.27 | final under 4.5                            |
| desktop-p09.heading    | 0.2468/0.3388/0.8219/2.24/5.3   | 0.2406/0.3183/0.8219/2.37/5.56  | final under 4.5                            |
| desktop-p09.num        | 0.2215/0.264/0.5905/2.04/3.61   | 0.2194/0.2602/0.5905/2.06/3.63  | final under 4.5                            |
| desktop-p09.text       | 0.0901/0.3608/0.8219/2.12/12.06 | 0.0826/0.3062/0.8219/2.45/12.24 | final under 4.5                            |
| desktop-p10.heading    | 0.0729/0.1074/0.8219/5.54/10.21 | 0.1547/0.1953/0.8219/3.55/7.43  | final lower than baseline; final under 4.5 |
| desktop-p10.num        | 0.0599/0.0636/0.5905/5.64/7.28  | 0.1222/0.1294/0.5905/3.57/5.29  | final lower than baseline; final under 4.5 |
| desktop-p10.text       | 0.102/0.1493/0.8219/4.37/9.01   | 0.1996/0.2194/0.8219/3.24/6.4   | final lower than baseline; final under 4.5 |
| mobile-p07.heading     | 0.0596/0.0725/0.8219/7.12/13.44 | 0.1077/0.1449/0.8219/4.47/12.42 | final lower than baseline; final under 4.5 |
| mobile-p07.num         | 0.0734/0.0973/0.5905/4.35/9.94  | 0.1104/0.1443/0.5905/3.3/9.53   | final lower than baseline; final under 4.5 |
| mobile-p07.text        | 0.1027/0.2006/0.8219/3.48/11.58 | 0.1151/0.1992/0.8219/3.5/11.57  | final under 4.5                            |
| mobile-p08.heading     | 0.0835/0.1537/0.8219/4.28/13.28 | 0.1234/0.1895/0.8219/3.64/12.54 | final lower than baseline; final under 4.5 |
| mobile-p08.num         | 0.0557/0.0745/0.5905/5.15/10.26 | 0.1164/0.1323/0.5905/3.51/9.52  | final lower than baseline; final under 4.5 |
| mobile-p08.text        | 0.1389/0.3807/0.8219/2.02/11.41 | 0.1368/0.3477/0.8219/2.19/11.63 | final under 4.5                            |
| mobile-p09.heading     | 0.0429/0.064/0.8219/7.64/13.85  | 0.064/0.0759/0.8219/6.93/13.24  | final lower than baseline                  |
| mobile-p09.num         | 0.0393/0.0499/0.5905/6.41/10.45 | 0.0754/0.0869/0.5905/4.68/9.84  | final lower than baseline                  |
| mobile-p09.text        | 0.0786/0.1893/0.8219/3.64/12.4  | 0.0781/0.1473/0.8219/4.42/12.51 | final under 4.5                            |
| mobile-p10.heading     | 0.0672/0.0805/0.8219/6.68/13.22 | 0.1274/0.1444/0.8219/4.49/11.8  | final lower than baseline; final under 4.5 |
| mobile-p10.num         | 0.0696/0.092/0.5905/4.51/10.01  | 0.1071/0.1268/0.5905/3.62/9.51  | final lower than baseline; final under 4.5 |
| mobile-p10.text        | 0.0622/0.0715/0.8219/7.18/12.81 | 0.1741/0.1959/0.8219/3.55/10.09 | final lower than baseline; final under 4.5 |
| tablet-p07.heading     | 0.0951/0.1891/0.8219/3.65/9.52  | 0.0833/0.1525/0.8219/4.3/9.54   | final under 4.5                            |
| tablet-p07.num         | 0.0712/0.2196/0.5905/2.38/7.7   | 0.1421/0.2062/0.5905/2.5/4.61   | final under 4.5                            |
| tablet-p07.text        | 0.1121/0.2126/0.8219/3.32/9.22  | 0.1073/0.206/0.8219/3.41/9.54   | final under 4.5                            |
| tablet-p08.heading     | 0.2677/0.5342/0.8219/1.49/4.4   | 0.2572/0.5002/0.8219/1.58/4.69  | final under 4.5                            |
| tablet-p08.num         | 0.067/0.1312/0.5905/3.53/6.99   | 0.0796/0.12/0.5905/3.77/6.46    | final under 4.5                            |
| tablet-p08.text        | 0.1569/0.4166/0.8219/1.87/8.68  | 0.1529/0.3917/0.8219/1.97/8.95  | final under 4.5                            |
| tablet-p09.heading     | 0.1062/0.2447/0.8219/2.96/6.66  | 0.1175/0.2459/0.8219/2.95/6.68  | final lower than baseline; final under 4.5 |
| tablet-p09.num         | 0.1224/0.2524/0.5905/2.12/4.57  | 0.1301/0.2502/0.5905/2.13/4.11  | final under 4.5                            |
| tablet-p09.text        | 0.05/0.2304/0.8219/3.11/12.79   | 0.0486/0.1734/0.8219/3.9/12.71  | final under 4.5                            |
| tablet-p10.heading     | 0.0642/0.0859/0.8219/6.42/10.45 | 0.1491/0.18/0.8219/3.79/7.32    | final lower than baseline; final under 4.5 |
| tablet-p10.num         | 0.0611/0.0653/0.5905/5.56/7.28  | 0.1236/0.1321/0.5905/3.52/5.3   | final lower than baseline; final under 4.5 |
| tablet-p10.text        | 0.0922/0.1465/0.8219/4.44/9.79  | 0.1938/0.2148/0.8219/3.29/6.89  | final lower than baseline; final under 4.5 |

## Page 10 body text and headings, baseline -> final

- desktop-fr-p10.heading: bg mean lum 0.0703 -> 0.1534; scene-only worst 5.67 -> 3.6; with voile 10.24 -> 7.31
- desktop-fr-p10.text: bg mean lum 0.1049 -> 0.1896; scene-only worst 4.43 -> 3.11; with voile 9.06 -> 6.82
- desktop-p10.heading: bg mean lum 0.0729 -> 0.1547; scene-only worst 5.54 -> 3.55; with voile 10.21 -> 7.43
- desktop-p10.text: bg mean lum 0.102 -> 0.1996; scene-only worst 4.37 -> 3.24; with voile 9.01 -> 6.4
- mobile-p10.heading: bg mean lum 0.0672 -> 0.1274; scene-only worst 6.68 -> 4.49; with voile 13.22 -> 11.8
- mobile-p10.text: bg mean lum 0.0622 -> 0.1741; scene-only worst 7.18 -> 3.55; with voile 12.81 -> 10.09
- tablet-p10.heading: bg mean lum 0.0642 -> 0.1491; scene-only worst 6.42 -> 3.79; with voile 10.45 -> 7.32
- tablet-p10.text: bg mean lum 0.0922 -> 0.1938; scene-only worst 4.44 -> 3.29; with voile 9.79 -> 6.89

## Final lower than baseline, scene-only worst contrast (23 of 48 blocks)

- desktop-fr-p07.heading: 4.02 -> 4.0
- desktop-fr-p07.num: 3.77 -> 3.72
- desktop-fr-p08.num: 5.71 -> 4.94
- desktop-fr-p10.heading: 5.67 -> 3.6
- desktop-fr-p10.num: 4.84 -> 3.21
- desktop-fr-p10.text: 4.43 -> 3.11
- desktop-p07.num: 3.51 -> 2.83
- desktop-p10.heading: 5.54 -> 3.55
- desktop-p10.num: 5.64 -> 3.57
- desktop-p10.text: 4.37 -> 3.24
- mobile-p07.heading: 7.12 -> 4.47
- mobile-p07.num: 4.35 -> 3.3
- mobile-p08.heading: 4.28 -> 3.64
- mobile-p08.num: 5.15 -> 3.51
- mobile-p09.heading: 7.64 -> 6.93
- mobile-p09.num: 6.41 -> 4.68
- mobile-p10.heading: 6.68 -> 4.49
- mobile-p10.num: 4.51 -> 3.62
- mobile-p10.text: 7.18 -> 3.55
- tablet-p09.heading: 2.96 -> 2.95
- tablet-p10.heading: 6.42 -> 3.79
- tablet-p10.num: 5.56 -> 3.52
- tablet-p10.text: 4.44 -> 3.29

## Final lower than baseline with the voile included (37 of 48 blocks)

- desktop-fr-p07.heading: 10.62 -> 9.01
- desktop-fr-p07.num: 7.05 -> 6.38
- desktop-fr-p07.text: 10.55 -> 9.96
- desktop-fr-p08.heading: 9.27 -> 8.9
- desktop-fr-p08.num: 7.38 -> 6.61
- desktop-fr-p08.text: 10.61 -> 10.35
- desktop-fr-p09.heading: 12.42 -> 11.51
- desktop-fr-p09.num: 8.47 -> 8.05
- desktop-fr-p09.text: 13.42 -> 12.68
- desktop-fr-p10.heading: 10.24 -> 7.31
- desktop-fr-p10.num: 6.45 -> 4.79
- desktop-fr-p10.text: 9.06 -> 6.82
- desktop-p07.heading: 10.15 -> 9.25
- desktop-p07.num: 7.82 -> 4.75
- desktop-p08.heading: 9.25 -> 8.69
- desktop-p08.num: 7.01 -> 6.6
- desktop-p08.text: 10.45 -> 10.27
- desktop-p10.heading: 10.21 -> 7.43
- desktop-p10.num: 7.28 -> 5.29
- desktop-p10.text: 9.01 -> 6.4
- mobile-p07.heading: 13.44 -> 12.42
- mobile-p07.num: 9.94 -> 9.53
- mobile-p07.text: 11.58 -> 11.57
- mobile-p08.heading: 13.28 -> 12.54
- mobile-p08.num: 10.26 -> 9.52
- mobile-p09.heading: 13.85 -> 13.24
- mobile-p09.num: 10.45 -> 9.84
- mobile-p10.heading: 13.22 -> 11.8
- mobile-p10.num: 10.01 -> 9.51
- mobile-p10.text: 12.81 -> 10.09
- tablet-p07.num: 7.7 -> 4.61
- tablet-p08.num: 6.99 -> 6.46
- tablet-p09.num: 4.57 -> 4.11
- tablet-p09.text: 12.79 -> 12.71
- tablet-p10.heading: 10.45 -> 7.32
- tablet-p10.num: 7.28 -> 5.3
- tablet-p10.text: 9.79 -> 6.89

## Final under 4.5 with the voile included (2 blocks)

- desktop-p09.num: baseline 3.61, final 3.63
- tablet-p09.num: baseline 4.57, final 4.11
