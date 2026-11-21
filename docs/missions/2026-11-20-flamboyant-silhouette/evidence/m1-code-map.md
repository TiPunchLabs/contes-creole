# M1 code map (AC2)

Base c5c6f0c. File:line refs read on this worktree. Nothing was executed (no build, no browser); numeric extents that need running the generator are marked NOT_VERIFIED.

## 1. Tree model (src/tree/scene/tree.ts)

- createLightTree(rng, {lite, count}) at tree.ts:48-51. Fully procedural, no GLB, no external mesh. Returns { group, tips, update(time, stirred) } (tree.ts:268-275).
- group: THREE.Group at the scene origin (never positioned; index.ts:117-125 adds it as is). Children: canopy group (:140-141) holding puffs (cards, :233) and glow points (:249-265), and the bark mesh (:239-247).
- Origin: trunk foot. Trunk starts at y = -0.8 (grow(V(0,-0.8,0), up, 4.6, 1.05, 0), tree.ts:105): length 4.6, radius 1.05, vertical. Trunk top y = 3.8. Ground and the pool sprite are at about y = -0.4 (landscape.ts:76); roots sink to y = -0.9/-1.05.
- Branching (grow, :56-104): depth 0 trunk; depth 1 = three limbs leaving the trunk top, length 0.68 x, radius 0.62 x, direction (cos*0.7, 1, sin*0.7) normalised (:73-83); plus one vertical depth-2 limb 0.55 x long (:84). Deeper levels: 3 children (depth < 2) else 2 or 3 (65% two), tilt 0.35-0.75, length 0.62-0.76 x, radius 0.6 x, floor d.y >= 0.45 (:87-103). Stops at depth 6 or radius < 0.04 (:67-70); every stop pushes a tip (:68).
- Recentring (:117-136): above y0 = 3.8 the whole crown is shifted toward the trunk axis by the mean tip offset, fully from y = 6.8 (k = min(1, (y - 3.8)/3)), so the crown is centred on the axis.
- Roots: six flat buttresses (:106-116), p0 (0, 0.9, 0), end at radius 1.7-2.1, y = -0.9, branch radius 0.5; rootTube :378-398 (radius 0.4 x taper, stretch 1.35, 8 sides, 10 rings).
- Bark: barkTubes :284-310 merges each branch with its most aligned child into one tube (continuous curve/radius, no ring at joints), side branches start inside the parent limb (startCap) ; limbTube :313-375 (sides 12/7/5 by radius, ridges 0.04 for the thick ones, trunk base flare :360). Material: MeshStandardMaterial #9a6a46, roughness 0.9, vertexColors, withBark + withTreeWind (:239-247).
- Crown: puffCount = tips + 26 anchors (:142, :150-163); flamboyantCrown (:191) gives cards, then innerCards (:197-217), anchorCrown roots them (:220-221). crownSpec at :179-190 (per 8 / lite 5, lobes 7, clusters 22, seed 3).
- Dimensions readable from code: trunk 4.6 m and the tip/crown extents are generated; exact tree height, crown radius and tip count NOT_VERIFIED (not run). Constants the rest of the code assumes: CROWN points camera.ts:105-110 (top y 13.6, near rim y 11.4-11.6 at x +-5.5 / z -6.5 or -3); landscape canopy light at (0, 11, 0) (landscape.ts:21-22); TREE_OBSTACLE [0, 0, 4.2] (wander.ts:43).
- Facing: FACING = hubCam(1).angle - hubCam(0).angle = 1.55 pi (tree.ts:38). group.rotation.y = FACING (:53); returned tips pre-rotated by the same quaternion (:267-270) so threads hook to the turned branches. innerAnchors uses facing hubCam(1) in the tree's own frame (:169).
- update(): leaves.uTime and RUSTLE lerp (:271-274).

## 2. RNG order

- src/tree/index.ts:96-99: rng = createRng(11); landscape = createLandscape(rng, count) (:97); tree = createLightTree(rng, ...) (:98); sky = createSky(rng, count) (:99). createRng is Park-Miller (shared/random.ts).
- Background trees (flora.ts, inside createLandscape, landscape.ts:59) are built BEFORE the tree, so a new central tree cannot change them. createSky (sky.ts:18-80) comes AFTER the tree and draws from the same rng: fireflies (:41-49), stars (:54-58), mists (:78-80). A tree that consumes a different number of draws shifts fireflies, stars, mists and `next`.
- rng() call sites consumed by the tree (tree.ts): :72 (trunk-top rotation, once); :87 (only for depth >= 2, `rng() < 0.65`); :88 (per branching node, base angle); :90 (per child, angle jitter); :91 (per child, tilt); :102 (per child, length); :107-108 (six roots, two each); :154 (per anchor, radius); :156-158 (three, only for the 26 extra anchors); :160 (blaze); :161 (`if (!blaze) rng()` conditional); :254-256 (per leaf point, three: radius, theta, phi) plus glow-points.ts:38-40 (three per point: phase, size, mix), count = opts.count(tips.length * 6) (:251). Everything else in the crown is hashed (foliage.ts flamboyantCrown has no rng; seeds 3/4/5 via hash), the atlas uses its own createRng (foliage.ts:66).
- Guard: layout.test.ts samples the full pipeline (sample() :30-62), compares `next` (the draw after the sky), tips count, first 3 and last tips un-rotated by -FACING (:38), flora, skyline, fireflies, mists, and object-count digests (tree digest objects 5, sum [5,5,5]; :122, :167). Tip count and positions are therefore pinned: replacing the tree breaks the tips part unless the owner-approved exception is recorded; `next`, fireflies, mists and sky digest break unless the draw count is preserved or the replacement draws from a separate rng and consumes the legacy count in createLightTree.

## 3. Camera path (src/tree/scene/camera.ts, src/shared/three/stage.ts, src/tree/index.ts)

- hubCam :37-44: angle a = -pi/2 + t * 1.55 pi, radius 20 - 4t, y = 1.3 + 6.4t, look (0, y + 2.2 - 1.2t, 0). Camera at t = 0: (0, 1.3, -20).
- cardT :7-8 (0.2 + i * 0.68/(n-1); single book 0.5). CARD_RADIUS 12.2, CARD_RISE 0.3 (:33-34).
- openingShot :171-230, OPENING_END 0.14 (:66), stagedCam :233-246, lensShift :253-255, shiftLens :395-400, pitchTable/climbPitch :270-377, treeCam :385-389 (look.y = out.y + tan(pitch) * horizontal reach, always at the trunk axis), openingStage :411-440, clearances :97-102, konteurSpot :70-72 (Konteur z = -12.5, x 1.9-4.4), CROWN :105-110.
- fitFov(base 50, aspect) stage.ts:31-35 (BASE_FOV 50, MIN_ASPECT 1.25, MAX_FOV 78), used at camera.ts:196, :272, :419 and index.ts:373.
- frame() index.ts:367-394: treeCam, fov, lensShift, dive blend (:375-384), shiftLens (:390), pointer parallax camera.position += pointer.x * 0.5, pointer.y * 0.3 (x parallax factor 0.2 under reduced motion) (:392-393), lookAt (:394). Climb: wheel/keys/touch move target (index.ts:177-179, :294-350), t eased (:370).
- The camera never reads the tree mesh; it reads only CROWN constants and the Konteur/ground.

## 4. Book attach points, threads, hit zones

- Slots today: treeSlots(books) = books with ready true, then INVITATION (invitation.ts:43-45). ready true: ti-kannot (order 1) and mila (order 4) (src/books/*/book.ts:6-7); zanba and konpe-lapen ready false. Registry sorts by order (registry.ts:46). So 3 slots: Ti Kannot, Mila, the invitation; cardT = 0.2, 0.54, 0.88.
- cards.ts createCards(books, tips) :146-228: card i sits at angle hubCam(cardT).a + (i odd ? 0.06 : -0.06), radius CARD_RADIUS 12.2 from the trunk axis, y = camera y + CARD_RISE (:156-160). Cards hang on the camera spiral, NOT on the tree: positions do not depend on the tree model.
- Thread: nearest tip to the card (:181-189), Line from that tip to card.position + (0, 1.05, 0) (:190-196); update moves the end to y + 1.05 * scale each frame (:217-219). Colour #7a5236, opacity 0.85 (:148-152). The tip is a static point (not wind-displaced), so the thread end does not follow the bark sway.
- Sizes: plane 1.5 x 2.1 (:162), back plane same, halo 2.8 x 3.4 (:171), CARD_SCALE 1.18 (:143) times (1 + near*0.1 + hover*0.08) (:213); near = 1 - |t - c.t| / 0.22 (:211); card faces camera (lookAt :208).
- Pointer pick: index.ts:268-280 raycasts only `pickable` = card planes, konteur.plane, two critters (:175); the tree is not pickable. Hover/tap/click handlers :294-332.
- DOM entry points: overlay.ts :99-113 (button .tree-book, link .tree-book-invite, button .tree-teller), positioned each frame by place() :64-69 from cardBox() :39-49 (screen box derived from the card's projected centre and under-point: unit = (y - cy)/1.25, 1.5 x 2.1 units), index.ts:414-428. CSS .tree-hit overlay.css:115-125 (pointer-events none, focus ring only). The card is "near" when near > 0.35 and x in 12%-88% of the width (index.ts:364-365, :408).
- Tests: overlay.test.ts, shelf.test.ts, invitation.test.ts, occlusion.test.ts (see 6).

## 5. Sharing between the central tree and other vegetation

Used by both the central tree and background vegetation (flora.ts):

- flamboyantCrown (foliage.ts:438), also flora.ts:268 for the far flamboyants; cardsGeometry (foliage.ts:106; flora.ts:192, 295, 760).
- cardMaterial (foliage.ts:192-215; flora.ts:164, 210, 758). The central crown has its own material instance (tree.ts:235), no sway option; flora uses sway 0.05/0.06.
- foliageAtlas(tile) (foliage.ts:42): module-level Map cache keyed by tile size, ONE texture per size shared by the central crown (tree.ts:235, 512 or lite 256) and flora (flora.ts:162, 758). Disposing or editing the atlas affects both.
- SWAY_TIME (foliage.ts:37): module-level uniform object shared by withSway (foliage.ts:243), withTreeWind and withCrownWind (canopy.ts:279, 301). Only writer: flora.update (flora.ts:500), reached via landscape.update (index.ts:397). The central tree wind stops if the landscape update is removed.
- patchShader (foliage.ts:225-237): chains onBeforeCompile, extends customProgramCacheKey; shared program cache by key (tree-wind, crown-wind-0.06, haze, glow...). Same-key materials share a WebGL program, no shared state besides uniforms objects.
- tubesGeometry, bezier, hash, Tube type (organic.ts), withBark (organic.ts:283-306, program key `bark-<strength>`, bark strength 0.16 central vs 0.13 flora.ts:111): used by both.
- withHaze/withGlow/withSaturation are applied inside cardMaterial (foliage.ts:210-212) for both; the central bark has no withHaze, flora bark does (flora.ts:111).
- glowPoints (shared/three/glow-points.ts) used by tree (:249), landscape grass (landscape.ts:61), sky.
  Exclusive to the central tree: canopy.ts (imported only by tree.ts and canopy.test.ts), RUSTLE, withTreeWind, withCrownWind, anchorCrown, innerAnchors, tubeSupports, phaseAttribute, FACING, INNER_FLOOR, barkTubes/limbTube/rootTube, cards.ts/CARD_*.
  Not used by the tree: leaves.ts (pinnateFrond, broadLeaf) is flora-only (flora.ts:22); skyline.ts uses none of the tree helpers; critters and konteur none.
  Coupling outside the tree files: landscape.ts lights (canopyLight (0,11,0), baseLight (1,2,-3), pool (0,-0.4,0)) assume a crown centred on the axis near y 11; FLORA_OBSTACLES and sky fireflies are placed around plants, not around the tree.
  Cache risks for a replacement: foliageAtlas size cache and SWAY_TIME are global; a new tree should reuse them (same atlas size, same uniform) and must not mutate them. A GLB tree with its own materials avoids touching flora materials. Two materials sharing a customProgramCacheKey but different patch code would collide (patchShader key must stay unique per code).

## 6. Obstacles and tests tied to the tree shape

- TREE_OBSTACLE = [0, 0, 4.2] (wander.ts:43), used as critter obstacle (index.ts:116), in blocked() (wander.ts:198) and in wander.test.ts (:74, :85, :142). Radius 4.2 is the critters' keep-out circle at the foot, not derived from the mesh; RING min 5.2 (wander.ts:44).
- layout.test.ts: pins the createRng(11) layout (tips, flora, skyline, fireflies, mists, next, object-count digests); expected values must never be regenerated to pass a visual change (comment :66-69).
- occlusion.test.ts: builds the real scene, casts rays from each card's near camera; every card must be less than 2% hidden by opaque non-transparent meshes (lite and full); also flora not inside hills (:76-94). A new tree must not hide the card planes from hubCam(cardT).
- canopy.test.ts: anchorCrown rooting, phases per twig, bloom slide, cross cards, innerAnchors placement and determinism.
- facing.test.ts: FACING turns the climb-end side toward the opening camera; the foot (0, -0.8, 0) is unmoved by it.
- camera.test.ts: hubCam path, treeCam follows spiral, no rebound, look at trunk axis, opening composition per aspect, no jump on resize, crown (CROWN) under the top clearance, openingStage. Depends on CROWN only, not on the mesh.

## 7. Existing preview and dev mechanisms

- src/tree/lite.ts: detectLite reads `?lite=1`/`?lite=0` from location.search (:14-19); consumed in mountTree (index.ts:74) and passed down as `lite` and `count`. Same pattern can carry a `?tree=` switch (read once at mount, before createLightTree at index.ts:98).
- qa/vegetation/index.html + view.js: dev-only viewer (vite dev, never built) rebuilding landscape, createLightTree (view.js:35-37), sky, konteur with a scriptable camera (window.__veg.shot / fps), `?lite=1`. Driven by qa/vegetation.mjs and qa/canopy.mjs.
- qa/canopy.mjs: modes via ONLY= metrics, ring, orbit, wind, app (default all); viewports owner 1280x928, desktop 1920x918, mobile 390x844, narrow 320x568, landscape 844x390 (:35-60); needs SITE and OUT. hub(t) mirrors hubCam (:23-31).
- Untracked qa/flamboyant.mjs exists in the worktree (git status), not read, not part of base.
- GLB/GLTF: `grep -rn "GLTFLoader|\.glb|\.gltf|GLTF" src qa package.json vite.config.*` returned nothing: no loader, no model asset, no gltf dependency in src.
