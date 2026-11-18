# Reduced motion (prefers-reduced-motion: reduce), measured

Method: frame sequences on the fake clock (page loops: 48 frames 1/12 s apart; transitions: every 200 ms from the click to 1 s after arrival). Adjacent MAE = mean absolute pixel difference (0-255 scale, frames downscaled to 480 px wide) between consecutive frames, averaged over the sequence; 0 means a frozen picture. first-vs-last = MAE between first and last frame. Reduced-motion sequences exist for both builds (the baseline reduced run also captured motion, beyond the stills-only request). Transition sequences under reduced motion have 7 frames on both builds: the page changes at the first poll, so there is no animated transition.

## Sequences (adjacent MAE / first-vs-last MAE)

| sequence       | baseline normal | baseline reduced | final normal    | final reduced   |
| -------------- | --------------- | ---------------- | --------------- | --------------- |
| desktop-p07    | 8.748 / 27.154  | 7.64 / 25.654    | 6.953 / 25.482  | 3.36 / 18.593   |
| desktop-p08    | 15.598 / 32.606 | 17.203 / 31.319  | 13.56 / 28.436  | 13.994 / 27.983 |
| desktop-p09    | 5.212 / 17.921  | 3.818 / 9.619    | 4.096 / 15.403  | 1.955 / 8.642   |
| desktop-p10    | 2.473 / 10.805  | 2.797 / 9.527    | 1.484 / 7.664   | 0.97 / 6.775    |
| desktop-t06-07 | 18.655 / 53.796 | 24.431 / 57.455  | 17.381 / 56.439 | 17.755 / 59.914 |
| desktop-t07-08 | 20.919 / 40.65  | 25.636 / 35.527  | 17.104 / 38.4   | 19.659 / 34.329 |
| desktop-t08-09 | 19.786 / 47.003 | 15.822 / 43.977  | 17.495 / 41.899 | 13.816 / 40.535 |
| desktop-t09-10 | 21.701 / 36.668 | 12.399 / 37.747  | 18.17 / 38.997  | 10.881 / 43.053 |
| desktop-t10-11 | 15.596 / 67.165 | 17.587 / 67.885  | 14.767 / 70.043 | 18.413 / 70.844 |
| mobile-p07     | 7.888 / 24.108  | 5.056 / 19.443   | 6.284 / 21.524  | 2.485 / 14.576  |
| mobile-p08     | 8.85 / 25.021   | 8.709 / 22.454   | 7.665 / 18.65   | 6.398 / 18.925  |
| mobile-p09     | 4.96 / 11.324   | 2.229 / 6.368    | 4.488 / 12.929  | 1.027 / 5.907   |
| mobile-p10     | 2.23 / 9.782    | 2.101 / 7.685    | 1.754 / 8.006   | 0.908 / 6.56    |
| mobile-t06-07  | 16.569 / 50.0   | 18.38 / 51.224   | 15.617 / 53.298 | 13.877 / 54.891 |
| mobile-t07-08  | 17.124 / 30.565 | 16.232 / 26.464  | 14.364 / 25.97  | 12.649 / 23.49  |
| mobile-t08-09  | 16.289 / 31.746 | 9.396 / 30.143   | 13.533 / 27.96  | 7.828 / 28.727  |
| mobile-t09-10  | 19.722 / 37.307 | 12.697 / 32.642  | 16.845 / 34.78  | 10.311 / 32.569 |
| mobile-t10-11  | 13.775 / 58.987 | 14.807 / 59.626  | 13.124 / 61.504 | 15.731 / 61.918 |

## Stills, reduced vs normal at the same page (MAE; includes text and any state difference, fake clock both)

| still             | baseline | final  |
| ----------------- | -------- | ------ |
| desktop-p06       | 15.207   | 15.133 |
| desktop-p06-scene | n/a      | n/a    |
| desktop-p07       | 16.653   | 17.348 |
| desktop-p07-scene | 18.084   | 18.716 |
| desktop-p08       | 35.593   | 35.597 |
| desktop-p08-scene | 37.776   | 37.548 |
| desktop-p09       | 28.288   | 27.418 |
| desktop-p09-scene | 29.33    | 28.233 |
| desktop-p10       | 6.635    | 7.33   |
| desktop-p10-scene | 7.124    | 7.619  |
| desktop-p11       | 15.595   | 15.6   |
| desktop-p11-scene | n/a      | n/a    |
| mobile-p06        | 1.866    | 1.897  |
| mobile-p06-scene  | n/a      | n/a    |
| mobile-p07        | 0.903    | 6.747  |
| mobile-p07-scene  | 1.142    | 7.909  |
| mobile-p08        | 7.83     | 13.885 |
| mobile-p08-scene  | 9.788    | 16.6   |
| mobile-p09        | 32.635   | 31.205 |
| mobile-p09-scene  | 34.821   | 32.891 |
| mobile-p10        | 0.855    | 4.206  |
| mobile-p10-scene  | 0.971    | 4.493  |
| mobile-p11        | 0.391    | 0.385  |
| mobile-p11-scene  | n/a      | n/a    |

## Reading (factual)

- Under reduced motion the five page turns become cuts on both builds (7 frames per transition capture instead of 33 to 45).
- The underwater page loops are not frozen under reduced motion on either build. Page 8 moves about as much as with normal motion (final desktop 13.99 reduced vs 13.56 normal; baseline 17.20 vs 15.60); pages 7, 9 and 10 move about half as much or less (final desktop 3.36, 1.96, 0.97) but are not still.
- The final build moves less than the baseline in the same reduced setting on all four pages (desktop 3.36 vs 7.64, 13.99 vs 17.20, 1.96 vs 3.82, 0.97 vs 2.80). This is pixel change between frames; it does not say which element moves.
