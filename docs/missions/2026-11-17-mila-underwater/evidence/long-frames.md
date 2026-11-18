# Long frames on page 9, uncapped desktop: the build or the frame rate?

Question: over 20 s on page 9 the headed uncapped runs showed 0 frames over 33 ms on the baseline (about 410 fps) and about 33 on the final build (about 500 fps). Is it the change, or running above some frame rate?

Method (mode `longframes` of qa/mila-underwater.mjs): HEADED GPU Chrome 157 on DISPLAY=:0, nice -n 19, uncapped flags (--disable-gpu-vsync --disable-frame-rate-limit) plus --enable-precise-memory-info; WebGL renderer `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)` (checked before every launch); nvidia-smi sample in Q/c1-lf/nvidia-smi.txt. Each run: new browser, open the tale, walk to page 9, 3 s warm-up, measure 20 s, close. Builds alternated B1, B2, B3, B4 per round, 3 rounds. Per frame: interval since the previous rAF, time spent inside the rAF callbacks of that frame (not counting the busy-wait of B3), performance.memory.usedJSHeapSize read once per frame, PerformanceObserver longtask entries (browser threshold 50 ms). Per frame over 33.3 ms: callback time of the frame and of the previous one, heap drop across the frame (threshold 64 KiB), overlap with a long task, interval in multiples of 16.7 ms. A frame counts as "long callback" when its callback or the previous frame's callback took more than 10 ms.

Variants as run (each variant had one calibration run and one adjustment, as allowed):

- B3: busy-wait per rAF callback. 0.4 ms gave 429.6 fps in the calibration run against the baseline calibration 362.4 fps, so it was raised to 0.85 ms. At 0.85 ms the three runs gave 316.7, 363.8 and 295.0 mean fps, so B3 ended up slightly slower than the baseline instead of equal to it (not fine-tuned further).
- B4: a smaller baseline window. 960x600 gave 647.8 fps (above the 500 target) in the calibration run, so 1200x750 was used for the 3 runs, which gave 373.8, 364.9 and 314.6 fps: it did not reach 500 fps. The baseline was not driven to the final build rate in the 3-run set; the calibration run at 960x600 is the only baseline observation above 500 fps (one run, in Q/c1-lf-cal/).
- The per-frame bookkeeping lowers all rates compared with the plain runs (baseline 349 to 385 fps here instead of about 410), the same overhead in every variant.

## Results (3 runs per variant, values per run)

| variant                                                    | mean fps                                 | median fps               | p99 ms           | max ms             | frames >33  | frames >50 | draw calls | mean callback ms      |
| ---------------------------------------------------------- | ---------------------------------------- | ------------------------ | ---------------- | ------------------ | ----------- | ---------- | ---------- | --------------------- |
| B1 baseline d60c1a6, 1440x900                              | 348.71 / 384.67 / 381.68 (median 381.68) | 357.14 / 384.62 / 384.62 | 4 / 3.5 / 3.5    | 6.6 / 6.9 / 6.3    | 0 / 0 / 0   | 0 / 0 / 0  | 582.1      | 2.741 / 2.486 / 2.502 |
| B2 1638c4c, 1440x900                                       | 449.61 / 466.89 / 452.11 (median 452.11) | 500 / 588.24 / 555.56    | 9.5 / 13.3 / 8.2 | 420 / 71.4 / 420.8 | 3 / 23 / 10 | 1 / 10 / 6 | 309.3      | 2.097 / 2.036 / 2.098 |
| B3 1638c4c, rAF callbacks busy-wait 0.85 ms each, 1440x900 | 316.66 / 363.78 / 294.97 (median 316.66) | 322.58 / 370.37 / 344.83 | 4.2 / 3.5 / 15.8 | 7.2 / 5.2 / 210.2  | 0 / 0 / 18  | 0 / 0 / 8  | 308.8      | 2.117 / 1.736 / 2.36  |
| B4 baseline d60c1a6, 1200x750 window                       | 373.78 / 364.92 / 314.55 (median 364.92) | 384.62 / 370.37 / 344.83 | 3.7 / 4.3 / 11.6 | 7 / 7.5 / 89.8     | 0 / 0 / 7   | 0 / 0 / 3  | 582.1      | 2.559 / 2.613 / 3.042 |

p95 per run: B1: 3.5 / 3 / 3.1; B2: 2.9 / 2.6 / 2.9; B3: 3.8 / 3.2 / 3.7; B4: 3.2 / 3.5 / 3.9

## Breakdown of the frames over 33 ms (per run: total; long callback; heap drop; long task overlapping; none of these)

| variant                                                    | run 1         | run 2            | run 3           | interval in multiples of 16.7 ms (all runs) |
| ---------------------------------------------------------- | ------------- | ---------------- | --------------- | ------------------------------------------- |
| B1 baseline d60c1a6, 1440x900                              | 0; 0; 0; 0; 0 | 0; 0; 0; 0; 0    | 0; 0; 0; 0; 0   | none                                        |
| B2 1638c4c, 1440x900                                       | 3; 3; 0; 1; 0 | 23; 23; 0; 10; 0 | 10; 10; 0; 6; 0 | {2: 19, 3: 10, 4: 3, 6: 1, 24: 1, 25: 2}    |
| B3 1638c4c, rAF callbacks busy-wait 0.85 ms each, 1440x900 | 0; 0; 0; 0; 0 | 0; 0; 0; 0; 0    | 18; 18; 0; 8; 0 | {2: 10, 3: 2, 5: 2, 11: 2, 12: 1, 13: 1}    |
| B4 baseline d60c1a6, 1200x750 window                       | 0; 0; 0; 0; 0 | 0; 0; 0; 0; 0    | 7; 7; 0; 4; 0   | {2: 4, 3: 2, 5: 1}                          |

Calibration run (one run each, Q/c1-lf-cal/, B3 at 0.4 ms and B4 at 960x600): B1: 362.35 mean fps, 0 frames >33 ms, max 6.9 ms; B2: 504.3 mean fps, 4 frames >33 ms, max 385.9 ms; B3: 429.55 mean fps, 0 frames >33 ms, max 7 ms; B4: 647.84 mean fps, 0 frames >33 ms, max 5.5 ms.

## Facts

- B1, the baseline, had 0 frames over 33 ms in all three runs (max 6.3 to 6.9 ms) at 349 to 385 fps.
- B2, the final build, had frames over 33 ms in all three runs (3, 23, 10) and in the calibration run (4): in the three runs the maximum frame was 420, 71.4 and 420.8 ms (385.9 ms in calibration). Every one of these frames was flagged "long callback" (its own or the previous frame callback above 10 ms); long tasks overlapped 1, 10 and 6 of them in the three runs (4 of 4 in calibration); no frame was preceded by a heap drop above 64 KiB in any variant. The intervals are mostly 2 to 4 times 16.7 ms with a few stalls of 22 to 25 times (about 400 ms).
- B3, the final build slowed to roughly the baseline rate (316.7, 363.8, 295.0 fps), had 0 frames over 33 ms in two runs and 18 in the third (max 210 ms, 101 long tasks recorded in that run against 3 in the other two).
- B4, the baseline in a smaller window at 373.8, 364.9 and 314.6 fps, had 0 frames over 33 ms in two runs and 7 in the third (max 89.8 ms, 59 long tasks against 4 in the other two). In the calibration run at 960x600 the baseline ran at 647.8 fps (faster than B2) with 0 frames over 33 ms.
- The third round of B3 and B4 (and the 10 long frames of B2 round 3) share unusually many long tasks (101 and 59); B1 in the same round had none. Something other than the build may have disturbed that round, but nothing was recorded that identifies it.

## Inference (marked as such)

- The long frames are not explained by a high frame rate alone: the baseline in the small window (648 fps in calibration, 315 to 374 fps in the runs) showed none in 3 of 4 runs, and the final build slowed to 295 to 430 fps showed none in 3 of 4 runs (calibration included).
- They are tied to the final build in these data (B2 had them in 4 of 4 runs, B1 in 0 of 4), and each is accompanied by a long JavaScript callback and often a long task, not by garbage collection (no heap drop). That points to main-thread work in the final build that occasionally runs for tens to hundreds of ms on page 9 (inference; the data do not say which work).
- The slowed and small-window variants did show long frames in one run each, in a round where long tasks were also frequent, so a part of the effect may come from the environment, not the build (inference). Three runs per variant is a small sample.

Raw per-frame long-frame lists: Q/c1-lf/longframes.json (and the copy in this folder as long-frames.json).

## Where the stall is (round C)

Rules: headed Chrome 157 on the hardware GPU (WebGL renderer `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`, checked before every launch), nice 19, uncapped flags, page 9, 3 s warm-up then 20 s, builds served on 4197 (1638c4c) and 4198 (baseline). CDP Profiler at a 200 us sampling interval, started right after the warm-up. Raw data: Q/c1-lf2/ (c1c/ holds the three profiles used here, c2/ the small-window runs, plus an unaligned first set in c1/ and an unused set in c1b/).

Budget: 12 browser runs were used (c1: 3, c1b: 3, c1c: 3, c2: 3). The c1 profiles were taken without a clock reference and could not be aligned to the frame records; the c1b set ran before a code edit that adds the reference had been applied (the edit failed on a formatting mismatch), so it is the same as c1; the c1c set carries a CDP clock reference (Performance.getMetrics Timestamp against performance.now(), 7 pairs, smallest round trip used) and is the data analysed below. C3 (Chrome trace) was not run: the budget was used up.

### Facts

- The main thread is saturated while uncapped: (idle) is 0.4% of the samples in every profile (B2 and B1), so it never waits for the next frame; about 70 to 81% of the samples are JavaScript, 13 to 24% native calls without a URL, about 4% (program).
- During every stall the thread is inside a single native WebGL call. For B2 run 1, 21 callbacks above 10 ms were matched in time (windows of 36 to 62 ms); 1045 of the 1122 ms in those windows are native calls without a URL and 72 ms JavaScript. The dominant leaf per window is `uniformMatrix4fv` in 16 of 21 windows (798 ms), then `uniformMatrix3fv` (95 ms, 2 windows), `uniform3f` (92 ms, 2 windows) and `drawElements` (51 ms, 1 window). In B2 run 3 the same pattern holds (see the tables).
- The JS caller chain for the stall is three.js uniform upload: `renderBufferDirect > wt (setProgram) > setValue / upload > Nl (uniformMatrix4fv setter) > uniformMatrix4fv`, or `renderBufferDirect > c > drawElements`; minified names with source text are in the tables below.
- Stalls are 36 to 54.5 ms long between frame starts, about 2 to 3.3 times 16.7 ms; the matched callbacks run 36 to 62 ms.
- No garbage collection appears in the stall windows ((garbage collector) is 0.2% of the run); JavaScript in the windows is 72 ms of 1122 ms.
- C2, B2 (1638c4c) in a 960x600 window, 3 runs, uncapped: mean fps 879.75 / 869.37 / 800.84, median fps 909.09 / 909.09 / 833.33, p99 1.7 / 1.8 / 2 ms, max 4.6 / 8.2 / 5.2 ms, frames >33 ms 0 / 0 / 0, frames >50 ms 0 / 0 / 0, draw calls 184.1, mean callback 1.051 / 1.063 / 1.154 ms. The 1440x900 B2 runs of this round gave 14 to 22 frames >33 ms at 463 to 465 fps (profiled; the c1-round unprofiled runs gave 3 to 23).
- Whole-run self time of `uniformMatrix4fv`: B2 2226 ms (11.1%) in run 1 and 2047 ms (10.2%) in run 3; baseline B1 539 ms (2.7%). Native calls without a URL are 23.6% of the B2 samples and 13.4% of the B1 samples. The B1 control profile contains one frame over 33 ms in the record (max 159.8 ms), which could not be placed inside the profiled interval, so there is no baseline stall stack.

### Inference (marked as such)

- The hypothesis fits: the stalls are time spent blocked inside native WebGL calls (most often a uniform upload), not JavaScript doing long work, and they disappear when the pixel count drops by 2.2 times (960x600: 0 long frames in 3 runs, at about 870 fps) even though the frame rate is higher there. That points to the GPU side (the command buffer or the GPU process) not keeping up and the renderer thread being held in whichever GL call finds the buffer full; the quantisation near multiples of 16.7 ms hints at a presentation/vsync-related wait on the GPU side. None of this was measured on the GPU process (C3 was not run), so the exact waiting point inside Chrome is not shown.
- The call that is blocked in is the most frequent one (`uniformMatrix4fv`), so it may simply be the call that most often finds the buffer full, not a cause by itself.
- B2 spends about four times as much time in `uniformMatrix4fv` as the baseline (2.0 to 2.2 s against 0.54 s per 20 s) while issuing about half the draw calls; this is consistent with the thread waiting in the call (inference).

### Profile tables

#### B2 run 1: 465.06 mean fps, 22 frames >33 ms, 21 long callbacks matched

Profile covers 20130 ms of main-thread samples at 200 us. Share by kind over the whole run: js 70.9%, native (no url) 23.6%, (program) 4.4%, (anonymous) 0.5%, (idle) 0.4%, (garbage collector) 0.2%.

Top 15 functions by self time over the whole run (minified names; source text is 25 chars before to 70 after the reported column):

| ms   | %    | function              | url:line:col                | source text                                                                                         |
| ---- | ---- | --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| 2226 | 11.1 | uniformMatrix4fv      | native/internal             |                                                                                                     |
| 1183 | 5.9  | Vd.renderBufferDirect | main-Cs_jHWom.js:4220:29376 | `nderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ee);let o=i.isMesh&&i.matrixWorld.determina`   |
| 883  | 4.4  | (program)             | native/internal             |                                                                                                     |
| 815  | 4.1  | wt                    | main-Cs_jHWom.js:4220:41306 | `n}return null}function wt(e,t,n,r,i){t.isScene!==!0&&(t=Ee),Ne.resetTextureUnits();let a=t.fog,`   |
| 796  | 4.0  | Tl                    | main-Cs_jHWom.js:4118:1898  | `rn!1;return!0}function Tl(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function El(e,t){let n=`   |
| 731  | 3.6  | T                     | main-Cs_jHWom.js:4196:5828  | `ght=r}return a}function T(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.is`   |
| 717  | 3.6  | ht                    | main-Cs_jHWom.js:4220:34659 | `.renderEnd()};function ht(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.is`   |
| 670  | 3.3  | h                     | main-Cs_jHWom.js:4169:2274  | `?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial\|\|i.i` |
| 601  | 3.0  | bt                    | main-Cs_jHWom.js:4220:38321 | `(I,t,n,r,i,a)}function bt(e,t,n){t.isScene!==!0&&(t=Ee);let r=H.get(e),i=k.state.lights,a=k.sta`   |
| 589  | 2.9  | updateMatrixWorld     | main-Cs_jHWom.js:1:61440    | `date=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsU`   |
| 555  | 2.8  | bindVertexArray       | native/internal             |                                                                                                     |
| 551  | 2.7  | setFromEuler          | main-Cs_jHWom.js:1:11223    | `lback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o`   |
| 511  | 2.5  | intersectsObject      | main-Cs_jHWom.js:1:151961   | `urn this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBou`   |
| 468  | 2.3  | drawElements          | native/internal             |                                                                                                     |
| 370  | 1.8  | d                     | main-Cs_jHWom.js:3823:11252 | `VertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o`   |

Stall windows (callback > 10 ms matched through the CDP clock): dominant leaf per window.

| frame interval ms | prev cb ms | own cb ms | dominant leaf    | leaf ms | window samples ms | chain (6 deepest JS frames)                                           |
| ----------------- | ---------- | --------- | ---------------- | ------- | ----------------- | --------------------------------------------------------------------- |
| 53.4              | 54.4       | 2.2       | uniformMatrix4fv | 51.9    | 56.3              | T > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv     |
| 37.1              | 51.6       | 2.2       | drawElements     | 49.0    | 53.5              | T > T > T > Vd.renderBufferDirect > c > drawElements                  |
| 36.3              | 43.5       | 1.9       | uniformMatrix4fv | 41.0    | 45.6              | T > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv     |
| 36.7              | 49.3       | 2.2       | uniformMatrix4fv | 47.5    | 51.3              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 54.5              | 59.8       | 2.4       | uniformMatrix4fv | 57.6    | 61.8              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 36.4              | 35.9       | 2.3       | uniformMatrix4fv | 33.9    | 38.0              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 53.4              | 59.3       | 2.3       | uniformMatrix4fv | 57.3    | 61.2              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 53.7              | 59.3       | 2.4       | uniformMatrix4fv | 57.2    | 61.3              | yt > Vd.renderBufferDirect > wt > upload > $l > uniformMatrix4fv      |
| 54                | 54.7       | 2.4       | uniformMatrix4fv | 52.2    | 56.9              | T > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv     |
| 53.6              | 57.5       | 2.2       | uniformMatrix4fv | 55.2    | 59.6              | T > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv     |
| 53.8              | 55.1       | 2.2       | uniformMatrix4fv | 52.9    | 57.1              | yt > Vd.renderBufferDirect > wt > setOptional > Nl > uniformMatrix4fv |
| 53.8              | 55.1       | 2.4       | uniformMatrix4fv | 52.7    | 56.9              | yt > Vd.renderBufferDirect > wt > upload > $l > uniformMatrix4fv      |
| 36.2              | 38.2       | 2.3       | uniformMatrix4fv | 36.2    | 40.1              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 36.4              | 50.2       | 2.2       | uniform3f        | 48.3    | 52.2              | wt > upload > setValue > setValue > kl > uniform3f                    |
| 36.2              | 42         | 2.3       | uniformMatrix4fv | 40.3    | 43.8              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 36.2              | 51.3       | 2.2       | uniformMatrix4fv | 48.4    | 53.4              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 36.2              | 46.2       | 2.2       | uniform3f        | 43.4    | 48.3              | wt > upload > setValue > setValue > kl > uniform3f                    |
| 54                | 57.8       | 2.3       | uniformMatrix4fv | 55.5    | 59.9              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 54.4              | 60.6       | 2.2       | uniformMatrix4fv | 58.7    | 62.6              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv    |
| 53.9              | 59.3       | 2.5       | uniformMatrix3fv | 56.6    | 61.3              | yt > Vd.renderBufferDirect > wt > setValue > Ml > uniformMatrix3fv    |
| 36.5              | 39.2       | 2.2       | uniformMatrix3fv | 37.2    | 41.3              | yt > Vd.renderBufferDirect > wt > setValue > Ml > uniformMatrix3fv    |

Total in stall windows: 1122 ms; by kind: native (no url) 1045, js 72, (program) 5, (idle) 1.

Leaves in stall windows (ms): uniformMatrix4fv 798; uniformMatrix3fv 95; uniform3f 92; drawElements 51; Vd.renderBufferDirect 7; Tl 5

JS caller of the native call in stall windows (native call <- parent frame):

| ms  | native call      | parent function | url:line:col                | source text                                                                                           |
| --- | ---------------- | --------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| 689 | uniformMatrix4fv | Nl              | main-Cs_jHWom.js:4118:3320  | `,xl),Tl(n,r)}}function Nl(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(wl(n,t))return;e`     |
| 109 | uniformMatrix4fv | $l              | main-Cs_jHWom.js:4118:6567  | `is.addr,!1,n)}function $l(e,t){let n=Cl(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}func`     |
| 95  | uniformMatrix3fv | Ml              | main-Cs_jHWom.js:4118:3119  | `,Sl),Tl(n,r)}}function Ml(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(wl(n,t))return;e`     |
| 92  | uniform3f        | kl              | main-Cs_jHWom.js:4118:2350  | `r,t),Tl(n,t)}}function kl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x\|\|n[1]!==t.y\|\|n[2]!=` |
| 51  | drawElements     | c               | main-Cs_jHWom.js:4072:3666  | `ytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==`     |
| 3   | bindVertexArray  | l               | main-Cs_jHWom.js:3823:11166 | `eVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArr`     |

#### B2 run 3: 463.16 mean fps, 14 frames >33 ms, 13 long callbacks matched

Profile covers 20077 ms of main-thread samples at 200 us. Share by kind over the whole run: js 71.3%, native (no url) 23.5%, (program) 4.1%, (anonymous) 0.5%, (idle) 0.4%, (garbage collector) 0.2%.

Top 15 functions by self time over the whole run (minified names; source text is 25 chars before to 70 after the reported column):

| ms   | %    | function              | url:line:col                | source text                                                                                         |
| ---- | ---- | --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| 2047 | 10.2 | uniformMatrix4fv      | native/internal             |                                                                                                     |
| 1227 | 6.1  | Vd.renderBufferDirect | main-Cs_jHWom.js:4220:29376 | `nderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ee);let o=i.isMesh&&i.matrixWorld.determina`   |
| 815  | 4.1  | (program)             | native/internal             |                                                                                                     |
| 789  | 3.9  | wt                    | main-Cs_jHWom.js:4220:41306 | `n}return null}function wt(e,t,n,r,i){t.isScene!==!0&&(t=Ee),Ne.resetTextureUnits();let a=t.fog,`   |
| 774  | 3.9  | ht                    | main-Cs_jHWom.js:4220:34659 | `.renderEnd()};function ht(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.is`   |
| 740  | 3.7  | T                     | main-Cs_jHWom.js:4196:5828  | `ght=r}return a}function T(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.is`   |
| 714  | 3.6  | Tl                    | main-Cs_jHWom.js:4118:1898  | `rn!1;return!0}function Tl(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function El(e,t){let n=`   |
| 710  | 3.5  | bindVertexArray       | native/internal             |                                                                                                     |
| 671  | 3.3  | h                     | main-Cs_jHWom.js:4169:2274  | `?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial\|\|i.i` |
| 618  | 3.1  | drawElements          | native/internal             |                                                                                                     |
| 616  | 3.1  | bt                    | main-Cs_jHWom.js:4220:38321 | `(I,t,n,r,i,a)}function bt(e,t,n){t.isScene!==!0&&(t=Ee);let r=H.get(e),i=k.state.lights,a=k.sta`   |
| 560  | 2.8  | updateMatrixWorld     | main-Cs_jHWom.js:1:61440    | `date=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsU`   |
| 559  | 2.8  | setFromEuler          | main-Cs_jHWom.js:1:11223    | `lback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o`   |
| 513  | 2.6  | intersectsObject      | main-Cs_jHWom.js:1:151961   | `urn this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBou`   |
| 344  | 1.7  | d                     | main-Cs_jHWom.js:3823:11252 | `VertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o`   |

Stall windows (callback > 10 ms matched through the CDP clock): dominant leaf per window.

| frame interval ms | prev cb ms | own cb ms | dominant leaf    | leaf ms | window samples ms | chain (6 deepest JS frames)                                        |
| ----------------- | ---------- | --------- | ---------------- | ------- | ----------------- | ------------------------------------------------------------------ |
| 53.8              | 58.4       | 2.4       | uniformMatrix4fv | 56.3    | 60.2              | T > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv  |
| 36.6              | 50.5       | 2.4       | uniformMatrix4fv | 48.3    | 52.5              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv |
| 53.5              | 57.5       | 2.2       | uniformMatrix4fv | 55.5    | 59.3              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv |
| 36.5              | 43.7       | 2.2       | uniformMatrix4fv | 40.8    | 45.6              | T > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv  |
| 36.4              | 37.5       | 2.3       | drawElements     | 34.5    | 39.5              | T > T > T > Vd.renderBufferDirect > c > drawElements               |
| 36.3              | 40.2       | 2         | uniformMatrix4fv | 37.9    | 42.4              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv |
| 53.2              | 59.2       | 2.5       | bindVertexArray  | 57.6    | 61.2              | vt > yt > Vd.renderBufferDirect > s > l > bindVertexArray          |
| 36.2              | 45.6       | 1.8       | drawElements     | 43.4    | 47.6              | Ed.render > T > T > Vd.renderBufferDirect > c > drawElements       |
| 53.5              | 61.5       | 1.9       | uniformMatrix4fv | 59.5    | 63.7              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv |
| 36.6              | 46.6       | 2.3       | bindVertexArray  | 44.3    | 48.4              | vt > yt > Vd.renderBufferDirect > s > l > bindVertexArray          |
| 35.9              | 36.3       | 2         | uniformMatrix4fv | 34.4    | 38.5              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv |
| 36.3              | 40.4       | 2.4       | drawElements     | 37.7    | 42.5              | gt > vt > yt > Vd.renderBufferDirect > c > drawElements            |
| 36                | 37.6       | 3.8       | uniformMatrix4fv | 34.7    | 39.5              | yt > Vd.renderBufferDirect > wt > setValue > Nl > uniformMatrix4fv |

Total in stall windows: 641 ms; by kind: native (no url) 592, js 46, (program) 3, (idle) 0, (anonymous) 0.

Leaves in stall windows (ms): uniformMatrix4fv 369; drawElements 117; bindVertexArray 103; Vd.renderBufferDirect 4; (program) 3; h 3

JS caller of the native call in stall windows (native call <- parent frame):

| ms  | native call      | parent function | url:line:col                | source text                                                                                           |
| --- | ---------------- | --------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| 369 | uniformMatrix4fv | Nl              | main-Cs_jHWom.js:4118:3320  | `,xl),Tl(n,r)}}function Nl(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(wl(n,t))return;e`     |
| 117 | drawElements     | c               | main-Cs_jHWom.js:4072:3666  | `ytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==`     |
| 103 | bindVertexArray  | l               | main-Cs_jHWom.js:3823:11166 | `eVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArr`     |
| 1   | uniform3f        | kl              | main-Cs_jHWom.js:4118:2350  | `r,t),Tl(n,t)}}function kl(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x\|\|n[1]!==t.y\|\|n[2]!=` |
| 1   | uniformMatrix4fv | $l              | main-Cs_jHWom.js:4118:6567  | `is.addr,!1,n)}function $l(e,t){let n=Cl(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}func`     |
| 0   | drawArrays       | a               | main-Cs_jHWom.js:3823:15583 | `ction i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.`     |

#### B1 control (run 2): 363.23 mean fps, 1 frames >33 ms, 1 long callbacks matched

Profile covers 20077 ms of main-thread samples at 200 us. Share by kind over the whole run: js 81.4%, native (no url) 13.4%, (program) 3.9%, (anonymous) 0.7%, (idle) 0.4%, (garbage collector) 0.2%.

Top 15 functions by self time over the whole run (minified names; source text is 25 chars before to 70 after the reported column):

| ms   | %   | function              | url:line:col                | source text                                                                                         |
| ---- | --- | --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| 1622 | 8.1 | Vd.renderBufferDirect | main-BAp1VNdY.js:4220:29376 | `nderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ee);let o=i.isMesh&&i.matrixWorld.determina`   |
| 1426 | 7.1 | T                     | main-BAp1VNdY.js:4196:5828  | `ght=r}return a}function T(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.is`   |
| 1027 | 5.1 | wt                    | main-BAp1VNdY.js:4220:41306 | `n}return null}function wt(e,t,n,r,i){t.isScene!==!0&&(t=Ee),Ne.resetTextureUnits();let a=t.fog,`   |
| 942  | 4.7 | Tl                    | main-BAp1VNdY.js:4118:1898  | `rn!1;return!0}function Tl(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function El(e,t){let n=`   |
| 821  | 4.1 | bindVertexArray       | native/internal             |                                                                                                     |
| 789  | 3.9 | (program)             | native/internal             |                                                                                                     |
| 739  | 3.7 | ht                    | main-BAp1VNdY.js:4220:34659 | `.renderEnd()};function ht(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.is`   |
| 728  | 3.6 | intersectsObject      | main-BAp1VNdY.js:1:151961   | `urn this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBou`   |
| 639  | 3.2 | updateMatrixWorld     | main-BAp1VNdY.js:1:61440    | `date=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsU`   |
| 623  | 3.1 | d                     | main-BAp1VNdY.js:3823:11252 | `VertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o`   |
| 539  | 2.7 | uniformMatrix4fv      | native/internal             |                                                                                                     |
| 536  | 2.7 | h                     | main-BAp1VNdY.js:4169:2274  | `?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial\|\|i.i` |
| 470  | 2.3 | bt                    | main-BAp1VNdY.js:4220:38321 | `(I,t,n,r,i,a)}function bt(e,t,n){t.isScene!==!0&&(t=Ee);let r=H.get(e),i=k.state.lights,a=k.sta`   |
| 459  | 2.3 | p                     | main-BAp1VNdY.js:3823:11708 | `{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();fo`   |
| 450  | 2.2 | drawElements          | native/internal             |                                                                                                     |

Stall windows (callback > 10 ms matched through the CDP clock): dominant leaf per window.

| frame interval ms | prev cb ms | own cb ms | dominant leaf | leaf ms | window samples ms | chain (6 deepest JS frames) |
| ----------------- | ---------- | --------- | ------------- | ------- | ----------------- | --------------------------- |

Total in stall windows: 0 ms; by kind: .

Leaves in stall windows (ms):

JS caller of the native call in stall windows (native call <- parent frame):

| ms  | native call | parent function | url:line:col | source text |
| --- | ----------- | --------------- | ------------ | ----------- |
