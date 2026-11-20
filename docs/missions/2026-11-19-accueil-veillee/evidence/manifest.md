# Evidence manifest — accueil-veillee

Heavy media stay outside the repository in `~/.local/share/contes-creole-qa/accueil-veillee/` (B below). Detailed manifests with durations: `B/baseline/manifest.md`, `B/s3-manifest.md`, `B/final/manifest.md`.

Environment for every video and performance number: Chrome 158.0.8127.36, headed, `UNMASKED_RENDERER` = `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`, ANGLE on EGL with the NVIDIA vendor pinned, `nice -n 19`, build served by `vite preview` (uncompressed). Mobile = Chrome device emulation (390x844, DPR 2, touch) on the same laptop GPU, not a physical phone. Functional runs and stills: headless Chrome on the same GPU (no performance number taken headless).

## Before (c5c6f0c)

| File                                        | sha256                                                           |
| ------------------------------------------- | ---------------------------------------------------------------- |
| B/baseline/01-home-desktop-rest.webm        | afc45e058726e3de78ae5fc7cbdbbd3fdee4d5662102246895b1594ffd718a93 |
| B/baseline/02-home-mobile-rest.webm         | dea8e847a6dc025bf1f05016a8c72ae1a4dcaa1761d1386b8a7336990fc77625 |
| B/baseline/03-home-desktop-selection.webm   | a072e5853c375d3694debc4b7adeb7d46b47a4cbc7d02b1f329b0b0f4b2a2f9d |
| B/baseline/04-journey-mila-desktop.webm     | 2c58a953ef3d5099f775b254c2c8edb70ac6a4995732f992f8375b899ca9bd8a |
| B/baseline/05-journey-tikannot-desktop.webm | 5d903df377008bc26aca6c6c4c68fed43e6ba90e3f5d48b9e7a4f9f96feb998c |
| B/baseline/06-journey-mila-mobile.webm      | 126aee529c90909dbd1f96b694e272c3cb52d9f627a12401350fde513765470e |

## S3 (aac453a)

| File                           | sha256                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| B/rest/rest-desktop.webm       | accae02c5236da2d7db494f25eb29eff4db08163ff5b2a29279f1c9a3c1e178a |
| B/rest/rest-mobile.webm        | 6e14c3137389bd8c83e4bcf327303ced14de3db60ccaed8ce8943f7491502fa1 |
| B/journey/journey-desktop.webm | 380668bc6c50cef926607b9b18be76035a5a7ce95c12947b340e9dc2842fc3b6 |
| B/journey/journey-mobile.webm  | d8da1e123cfa4841faef412505e51191f1ecbf7010367e4505a25fdf3f96fcb1 |

## Final

Videos recorded on 3c60b42. The later commits change neither the scene's layout nor its motion: 69e6607 merges leaf geometries with the same random sequence, af2c913 restyles the portrait text card. Perf on 69e6607 (same scene as af2c913); functional run on af2c913.

| File                                         | What                                                                                        | sha256                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| B/final/rest/rest-desktop.webm               | 22 s at rest, then a page turn, 1440x900                                                    | b494c912173215633dda7074e1f4466af715b3247fd4724eb8d5d71e4cc0d122 |
| B/final/rest/rest-mobile.webm                | same, 390x844 emulated                                                                      | b829d1066226081c19a79678b69381b9b5c19a38b129051c84b4b96a108ea10a |
| B/final/journey/journey-desktop.webm         | Mila → first scene → back same page → turn → Zanba portrait text → Ti Kannot → scene → back | 29f03315605940c0e5c375a65b297ea5d71df0d2536029562b96cfb8956b30df |
| B/final/journey/journey-mobile.webm          | same with taps and a swipe                                                                  | 154f37ff5a946382c6189a6dd6eca2725f0cf6ba3c5caa4ba2103d11ac293cec |
| B/final/compare-rest-before-after.webm       | before 4–20 s next to after 4–20 s, at rest                                                 | 6f51f9032f0b33ae90744e9929784971b23d9ea01fded7c88511098f67db744f |
| B/final/compare-navigation-before-after.webm | tree selection 0–16 s next to book navigation 0–16 s                                        | b3008b8a5d1c8a14a7c91341ca436778ef3bcc6dd7c81e94d35bddf168ec0d01 |
| B/final/compare-entry-before-after.webm      | entry into Mila, before 6–10 s next to after 5–9 s                                          | be80d65ac5e14c40433a449793aca0a0bbf241ef0510719a76060026c8a91314 |
| B/final/perf/log-perf.json                   | perf run (69e6607)                                                                          | a81e30d2c2ac3190586299501c4c4c5431a51f435813a3af148b0bd1fe5641d1 |
| B/final/functional/check-log.json            | 27 functional checks (af2c913) + stills in the same folder                                  | 3c7b6334d7182ae993ffb8325346f23da347191cab7bf0fd40005508c3f3eb77 |

## Performance (69e6607, desktop 1440x900 and mobile emulation)

| Measure                                                      | Desktop             | Mobile (emulated, lite mode) | Before (c5c6f0c, desktop) |
| ------------------------------------------------------------ | ------------------- | ---------------------------- | ------------------------- |
| First load, transferred bytes (preview server, uncompressed) | 567 786             | 567 486                      | 723 972                   |
| FPS at rest, 20 s                                            | 60                  | 60                           | 60.0 (10 s)               |
| FPS during page turns, 10 s                                  | 59.5                | 58.8                         | n/a                       |
| Draw calls per frame (main + shadow pass)                    | 163–169             | 137–142                      | n/a                       |
| GPU geometries / textures after 1st → 5th round trip         | 133 / 42 → 133 / 42 | 108 / 39 → 110 / 41          | n/a                       |
| Terrace rendering while a tale is open                       | stopped (5/5)       | stopped (5/5)                | n/a                       |

Main JS chunk 41.5 kB (15.7 kB gzip); the scene (`run-*.js`, 33.4 kB) and Three.js load after the HTML home is usable.
