# Clearance over the ground without the early-out (review 3, F5)

Review 3 found that the clearance check skipped the ground test for a body it judged high enough
over the ground, from a slope figure that was not a bound (the largest axis component of a finite
difference on a 0.2 m grid). The early-out is removed in `qa/mila-clearance.mjs`: the ground is
now read under every living body on every frame. The slope is still recorded (as the norm of the
gradient on that grid), for the reader only; no test relies on it.

What this measure is: the scene's height function read straight down under 160 points of each
stand-in's surface and under its lowest point. It is a sampled measure. Unlike the gap between
two stand-ins, which is a proven bound (never above the true gap), it does not cover ground relief
between the sampled points.

Run: product `7ea9a48` with the read-only probe, checker at this commit, TOL 0.02 m, REST_SEA
20000 ms, REST_LAND 6000 ms, every page and turn forwards and back, headless GPU Chrome on a fake
clock under `nice -n 19` (functional check, not a frame-rate measurement), renderer
`ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2, OpenGL ES 3.2)`.
Raw results: `clr-f5/clearance-desktop.json` and `clearance-mobile.json` in the media folder.

| Pair kind             | Desktop: times measured, closest | Mobile layout: times measured, closest |
| --------------------- | -------------------------------- | -------------------------------------- |
| Mila – ground         | 15 842, +0.133 m                 | 16 407, +0.138 m                       |
| fish – ground         | 1 162 097, +0.099 m              | 722 639, +0.117 m                      |
| school – ground       | 2 217 880, +0.691 m              | 1 476 630, +0.645 m                    |
| turtle – ground       | 15 842, +0.646 m                 | 16 407, +0.646 m                       |
| crab – ground         | 15 842, +0.008 m                 | 16 407, +0.008 m                       |
| living conch – ground | 15 842, −0.008 m                 | 16 407, −0.008 m                       |

Frames: 15 842 (desktop), 16 407 (mobile layout). Overlaps deeper than the tolerance, in any of
the 53 pair kinds, ground included: none on either layout. The living conch rests 8 mm in the
sand, inside the tolerance. Steepest ground on the grid: 0.77.

Not to be read from this run: the fish's step and jolt figures. The heavier per-frame measure
makes the fake clock advance in larger, uneven steps, which inflates them (largest step 0.27 m);
the figures of `clearance.md` stand for those.
