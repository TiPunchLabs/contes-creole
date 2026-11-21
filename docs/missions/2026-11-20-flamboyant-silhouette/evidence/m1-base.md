# M1 base (AC1)

Checked on worktree branch feat/flamboyant-silhouette, HEAD c5c6f0c (git rev-parse HEAD). All commands read-only.

## 1. PR #42 and the CANOPY work

- `gh pr view 42 --json state,mergedAt,mergeCommit,title` worked: state MERGED, mergedAt 2026-11-09T18:27:40Z, mergeCommit acc7f2afcac024992ab8495fd3ea803a40ae5d32, title "feat(tree): flamboyant sprays rooted on their twigs, tree turned to face the opening view".
- `git log --oneline --merges -30`: acc7f2a "Merge pull request #42 from TiPunchLabs/feat/anchored-canopy" is an ancestor of main (between e2df734 #41 and 76b5223 #43). c5c6f0c (#49) is the head.
- CANOPY commits on the branch (git log --grep=CANOPY returned none; found by path with git log -- src/tree/scene/tree.ts): 08bd473 sprays rooted on twigs, opening under the crown; 30a3ce8 tree turned to face the opening view, keep the original opening; 150732e green sprays along the inner limbs above the fork; fccb840 inner green as the crown's own sprays; 13fdb47 clear the limbs above the fork, root the crown before inner sprays. 13fdb47 is the second parent of acc7f2a.
- Since 13fdb47, `git log 13fdb47..c5c6f0c -- tree.ts` returns nothing: src/tree/scene/tree.ts is byte-identical to its CANOPY state. canopy.ts changed once (0f70c39 "let the breeze come in gusts", gust factor in FIELD, canopy.ts:267-268). cards.ts changed once (aae0e5f, literals 12.2 and 0.3 became CARD_RADIUS / CARD_RISE, same values).
- Branches: `git branch -a` shows no feat/anchored-canopy (deleted after merge).

## 2. CANOPY rulings (docs/redesign/decisions.md)

Sources at lines 74-83, rulings table at lines 234-237.

- CANOPY-AIM (line 234): leaves and flowers must visibly grow from branches and move with them; extend a branch with a short tapered twig where a link is missing; keep the umbrella silhouette, red/green palette and natural openings. Implemented by canopy.ts rooting cards on bark or added twigs, one wind for bark and cards. Art left open (D-CANOPY-ART).
- CANOPY-OPEN (line 235): owner chose to open at t = 1 with the climb reversed. Superseded by CANOPY-FACE the same day (implemented in 08bd473, reverted).
- CANOPY-FACE (line 236): owner asks that the home load on the second capture's framing (foot of the tree, clearing and Konteur visible at once), the main flamboyant pivoted about its vertical axis to present the face seen in the first capture, camera path and animation kept. Implemented as: opening, path, gestures and climb bar back to e2df734 (t = 0 at the foot); tree group turned by FACING = 1.55 pi about the trunk foot; tips returned turned so threads hook to the turned branches while cards keep their places on the path.
- CANOPY-GRN (line 237): more green foliage on the face shown at the opening, above the main fork and along the inner branches, anchored to twigs, sky kept visible, red/green balance kept. Implemented by innerAnchors: 22 anchors spaced at least 0.8 m, no inner card below 8 m (owner: remove the leaves from that zone), faces turned out, rooted by anchorCrown.

## 3. Opening today versus CANOPY-FACE

- CANOPY-FACE still in code and unchanged: tree.ts:38 `FACING = hubCam(1) - hubCam(0)` (1.55 pi), tree.ts:53 `group.rotation.y = FACING`, tree.ts:267-270 tips turned by FACING, facing.test.ts asserts both (31 lines). Only the doc comment is misplaced: the FACING comment block (tree.ts:30-34) sits above INNER_FLOOR (tree.ts:36), FACING itself is at tree.ts:38.
- hubCam (camera.ts:37-44) is unchanged since 13fdb47: `git diff 13fdb47 c5c6f0c -- camera.ts` deletes only its signature line (THREE.Vector3 became Spot). At t = 0 the camera is at (0, 1.3, -20) looking at (0, 3.5, 0).
- At CANOPY-FACE the opening was that plain spiral start, no staging (git show 13fdb47:src/tree/scene/camera.ts has only cardT and hubCam).
- Mission 2026-11-15-home-visual-polish (PR #48, d60c1a6) added in camera.ts: openingShot (camera.ts:171-230, solved back, lift 0.3, truck, lookLift, lens shift), stagedCam (233-246, eases the opening in over t in [0, OPENING_END], OPENING_END = 0.14 at camera.ts:66), lensShift (253-255), pitch table and climbPitch (270-377), treeCam (385-389, always looks at the trunk axis), shiftLens (395-400), openingStage (411-440), clearances / konteurSpot / CROWN. index.ts frame() (367-394) applies them.
- Its report records risk R2: the opening frame differs from the one the owner validated on 2026-11-09 (AUDIT.md:284-288, report.md:60-61, review-1.md:63). The owner then accepted the result artistically, R2/O1-O5 included, and approved push to production (report.md "Owner decision, 2026-11-16", commit 11ce00d). So the current opening is the owner-accepted one.
- Net: the tree is still turned by FACING (CANOPY-FACE kept); the camera framing is no longer the bare spiral foot but home-visual-polish's solved shot (same direction, camera on the -z side at t = 0, further back, lens-shifted so the tree sits left of the column on wide screens; per-screen values NOT_VERIFIED here, see M2 captures).

## 4. Base chosen: origin/main c5c6f0c

- `git branch -a`: local main, docs/mila-baseline (2 commits ahead of main, docs only by name; not inspected further), feat/accueil-veillee (8 ahead), feat/veillee-reprise (14 ahead), feat/veillee-fauteuil (17 ahead), feat/flamboyant-silhouette (this branch, 0 ahead). Remote: origin/main, origin/feat/accueil-veillee, origin/HEAD.
- All three veillee branches fork from c5c6f0c (git merge-base) and, per mission.md section 1, were archived by the owner on 2026-11-20; they add a different home (La Veillee terrace), not the deployed tree home.
- c5c6f0c contains PR #42 (acc7f2a), PR #48 home-visual-polish (d60c1a6) and PR #49; the memory index records the tree home as live on production. No other branch is a better base: none carries newer tree-home work.
- Owner capture not attached (mission.md section 1): the executable home on c5c6f0c is the reference.

## 5. Acquis to preserve

Opening framing

- camera.ts:66 OPENING_END; :171-230 openingShot; :233-246 stagedCam; :253-255 lensShift; :395-400 shiftLens; :385-389 treeCam; index.ts:371-394 frame() wiring (lens shift, fov via fitFov, parallax).
- FACING: tree.ts:38, :53, :267-270 (tree turned so the face of the climb's end meets the opening view).
- Layout constraints that read the crown: CROWN points camera.ts:105-110 (top y 13.6, rim y 11.4-11.6, +-5.5 x, -6.5 z) drive how far the camera backs off; a taller or wider crown changes the solved shot (openingShot fits CROWN under the top clearance). Keep the new crown within these or update CROWN knowingly (brief: do not change the opening camera).
- Tests: camera.test.ts, facing.test.ts.

Green above the fork (CANOPY-GRN)

- tree.ts:36 INNER_FLOOR = 8.0; :168-178 innerAnchors call (facing hubCam(1), spread 1.9, low INNER_FLOOR + 0.4, count 22, gap 0.8, r 0.75, seed 5); :197-217 innerCards (no card below INNER_FLOOR, normals turned out 0.45, partner card in full mode); :221 anchorCrown for the inner cards.
- canopy.ts:210-243 innerAnchors; canopy.test.ts "innerAnchors".

Branches, leaves and flowers moving together

- canopy.ts:261-274 FIELD (treeWind, one field of local position, grows with height above 3.2 and distance from axis, gusts); :277-292 withTreeWind (bark); :299-325 withCrownWind (cards, plus per-card flutter by aSway and aPhase); :253 RUSTLE (hover rustle); :64-163 anchorCrown (cards rooted on bark/twigs, one phase per twig via hash(own, seed)); :246-250 phaseAttribute.
- Wiring in tree.ts: :220-226 crown = own + added with phases; :232 aPhase attribute; :233-236 puffs material withCrownWind(cardMaterial(foliageAtlas), 0.06); :239-247 bark including the added twigs, withTreeWind(withBark(...)); :271-274 update drives leaves uTime and RUSTLE (hover/focus stirs it, index.ts:399).
- Driver of the wind clock: SWAY_TIME (foliage.ts:37) is written only in flora.ts:500 (landscape.update -> flora.update, index.ts:397). The central tree's wind depends on it.
- Tests: canopy.test.ts (anchoring, phases, inner anchors).
