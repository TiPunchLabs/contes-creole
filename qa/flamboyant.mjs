// Central flamboyant silhouettes (FLAMBOYANT-SILHOUETTE): the real home at the opening view and at
// each shelf stop (the climb values where a card hangs), for the current tree and the preview
// variants (`?tree=a`, `?tree=b`), on the GPU. Needs `vite` dev for `probe` (it imports the sources).
// Usage: SITE=http://127.0.0.1:5183/ OUT=dir [TREES=current,a,b] [VPS=desktop,mobile]
//        [ONLY=shots,probe,select] [QA_CHANNEL=chrome] node qa/flamboyant.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = (process.env.SITE ?? "http://127.0.0.1:5183/").replace(/\/?$/, "/");
const OUT = (process.env.OUT ?? new URL("./out/flamboyant/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "shots").split(",");
const TREES = (process.env.TREES ?? "current").split(",");
const VPS = (process.env.VPS ?? "desktop,mobile").split(",");
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const env = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
/** Seconds the camera needs to settle on a shelf stop (index.ts eases t at rate 4.5). */
const SETTLE_MS = 3500;
mkdirSync(OUT, { recursive: true });
const results = { site: SITE, trees: TREES, viewports: {}, errors: [], views: [] };

/** The page's URL for a tree variant: the public journey for `current`, the preview switch else. */
const urlOf = (tree) => (tree === "current" ? SITE : `${SITE}?tree=${tree.replace(/&$/, "")}`);

/** Opens the home with a tree variant and waits until the scene is up. */
async function open(browser, vp, tree) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp], reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const tag = `${vp}/${tree}`;
  p.on("pageerror", (e) => results.errors.push(`${tag} pageerror: ${e.message}`));
  p.on(
    "console",
    (m) => m.type() === "error" && results.errors.push(`${tag} console: ${m.text()}`),
  );
  p.on(
    "response",
    (r) => r.status() >= 400 && results.errors.push(`${tag} ${r.status()} ${r.url()}`),
  );
  await p.goto(urlOf(tree));
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
  if (tree !== "current")
    await p.waitForSelector(`[data-tree-preview="${tree.replace(/&$/, "")}"]`, {
      state: "attached",
      timeout: 30000,
    });
  await p.waitForTimeout(2000);
  return { ctx, p };
}

/** Climb value shown by the climb bar. */
const climbT = (p) =>
  p.$eval(".tree-climb-thumb", (e) => Number(/([\d.e-]+)%/.exec(e.style.top)?.[1] ?? NaN) / 100);

const browser = await chromium.launch({
  args: GPU,
  env,
  channel: process.env.QA_CHANNEL || undefined,
});
try {
  const probe = await browser.newPage();
  results.renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  console.log("renderer", results.renderer);
  if (!/NVIDIA/.test(results.renderer)) throw new Error("not on the NVIDIA GPU, abort");

  if (ONLY.includes("probe")) {
    // Geometry of the procedural tree and the camera at each stop, read from the sources.
    await probe.goto(`${SITE}qa/vegetation/index.html`);
    results.probe = await probe.evaluate(
      async (sizes) => {
        const { createRng } = await import("/src/shared/random.ts");
        const { createLandscape } = await import("/src/tree/scene/landscape.ts");
        const { createLightTree, FACING } = await import("/src/tree/scene/tree.ts");
        const cam = await import("/src/tree/scene/camera.ts");
        const { fitFov } = await import("/src/shared/three/stage.ts");
        const rng = createRng(11);
        createLandscape(rng, (n) => n);
        const tree = createLightTree(rng, { lite: false, count: (n) => n });
        tree.group.updateMatrixWorld(true);
        const Vector3 = tree.tips[0].constructor;
        const THREE = { Vector3 };
        const r4 = (n) => Math.round(n * 1e3) / 1e3;
        const boxes = {};
        tree.group.traverse((o) => {
          if (!o.isMesh) return;
          const at = o.geometry.attributes.position;
          const min = [Infinity, Infinity, Infinity];
          const max = [-Infinity, -Infinity, -Infinity];
          const v = new Vector3();
          for (let i = 0; i < at.count; i++) {
            v.fromBufferAttribute(at, i).applyMatrix4(o.matrixWorld);
            v.toArray().forEach((c, k) => {
              min[k] = Math.min(min[k], c);
              max[k] = Math.max(max[k], c);
            });
          }
          const key = o.geometry.attributes.aSway ? "crown" : "bark";
          boxes[key] = { min: min.map(r4), max: max.map(r4) };
          boxes[`${key}Triangles`] = (o.geometry.index ?? at).count / 3;
        });
        const tips = tree.tips.map((t) => t.toArray().map(r4));
        const radial = tree.tips.map((t) => Math.hypot(t.x, t.z));
        const stops = [0, 0.2, 0.54, 0.88, 1];
        const cameras = {};
        for (const [name, [w, h]] of Object.entries(sizes)) {
          cameras[name] = stops.map((t) => {
            const pos = new THREE.Vector3();
            const look = new THREE.Vector3();
            const a = cam.treeCam(t, w / h, pos, look, h);
            return {
              t,
              azimuthDeg: r4((a * 180) / Math.PI),
              position: pos.toArray().map(r4),
              lookAt: look.toArray().map(r4),
              fov: r4(fitFov(50, w / h)),
              lensShift: r4(cam.lensShift(t, w / h, h)),
            };
          });
        }
        const cards = [0, 1, 2].map((i) => {
          const pos = new THREE.Vector3();
          const t = cam.cardT(i, 3);
          const a = cam.hubCam(t, pos, new THREE.Vector3()) + (i % 2 ? 0.06 : -0.06);
          const at = new THREE.Vector3(
            Math.cos(a) * cam.CARD_RADIUS,
            pos.y + cam.CARD_RISE,
            Math.sin(a) * cam.CARD_RADIUS,
          );
          let best = tree.tips[0];
          for (const tip of tree.tips) if (tip.distanceTo(at) < best.distanceTo(at)) best = tip;
          return {
            t: r4(t),
            position: at.toArray().map(r4),
            threadTop: best.toArray().map(r4),
            threadLength: r4(best.distanceTo(at.clone().setY(at.y + 1.05))),
          };
        });
        return {
          facingRad: r4(FACING),
          boxes,
          tipCount: tips.length,
          tipHeight: [
            r4(Math.min(...tips.map((t) => t[1]))),
            r4(Math.max(...tips.map((t) => t[1]))),
          ],
          tipReach: [r4(Math.min(...radial)), r4(Math.max(...radial))],
          tips,
          cameras,
          cards,
        };
      },
      Object.fromEntries(
        Object.entries(VIEWPORTS).map(([k, v]) => [k, [v.viewport.width, v.viewport.height]]),
      ),
    );
    console.log("probe ok", JSON.stringify(results.probe.boxes));
  }
  await probe.close();

  if (ONLY.includes("shots")) {
    for (const vp of VPS) {
      results.viewports[vp] = VIEWPORTS[vp];
      for (const tree of TREES) {
        const { ctx, p } = await open(browser, vp, tree);
        const stops = await p.locator(".tree-shelf-book").count();
        const snap = async (name) => {
          const file = `${vp}-${name}-${tree}.png`;
          await p.screenshot({ path: OUT + file });
          const t = await climbT(p);
          results.views.push({ vp, tree, name, file, t });
          console.log("shot", file, "t =", t.toFixed(3));
        };
        await snap("0-opening");
        for (let i = 0; i < stops; i++) {
          const book = p.locator(".tree-shelf-book").nth(i);
          if (VIEWPORTS[vp].hasTouch) await book.tap();
          else await book.click();
          // Park the pointer on the frame's centre: no parallax, no hovered card.
          if (!VIEWPORTS[vp].hasTouch) await p.mouse.move(2, 2);
          await p.waitForTimeout(SETTLE_MS);
          await snap(`${i + 1}-stop${i + 1}`);
        }
        await ctx.close();
      }
    }
  }

  if (ONLY.includes("scenery")) {
    // Everything in the scene but the central tree and the cards' threads, digested per variant:
    // object count, vertex count and summed positions of the landscape and the sky (the groups
    // built before and after the tree on the shared random stream). Equal digests across variants
    // mean the swap moved nothing else.
    results.scenery = {};
    for (const tree of TREES.includes("current") ? TREES : ["current", ...TREES]) {
      const { ctx, p } = await open(browser, "desktop", tree === "current" ? "current&" : tree);
      results.scenery[tree] = await p.evaluate(() => {
        const scene = window.__treePreview.scene;
        const r = (n) => Math.round(n * 1e4) / 1e4;
        const digest = (root) => {
          let objects = 0;
          let vertices = 0;
          const sum = [0, 0, 0];
          root.traverse((o) => {
            objects++;
            const at = o.geometry?.attributes?.position;
            if (!at || o.isSprite) return;
            vertices += at.count;
            // Static geometry only: points and instanced meshes are checked by their buffers' sums.
            for (let i = 0; i < at.count; i += 7)
              sum[i % 3] += at.getX(i) + at.getY(i) + at.getZ(i);
          });
          // Placement of the direct children (plants, hills, lights): what a shifted random
          // stream would move. Deeper transforms animate (sway, drift) and are left out.
          const placed = [0, 0, 0];
          for (const o of root.children) {
            placed[0] += o.position.x;
            placed[1] += o.scale.y;
            placed[2] += o.position.z;
          }
          return { objects, vertices, sum: sum.map(r), placed: placed.map(r) };
        };
        // index.ts adds: landscape, tree, sky, konteur, cards, lapen, zanba (then the proposal).
        const [landscape, central, sky] = scene.children;
        const skyDigest = digest(sky);
        // The sky's own children follow the camera and the clock: geometry only.
        delete skyDigest.placed;
        return {
          landscape: digest(landscape),
          sky: skyDigest,
          centralVisible: central.visible,
          sceneChildren: scene.children.length,
        };
      });
      console.log("scenery", tree, JSON.stringify(results.scenery[tree]));
      await ctx.close();
    }
    const [first, ...rest] = Object.values(results.scenery);
    results.sceneryEqual = rest.every(
      (d) =>
        JSON.stringify(d.landscape) === JSON.stringify(first.landscape) &&
        JSON.stringify(d.sky) === JSON.stringify(first.sky),
    );
    console.log("scenery equal:", results.sceneryEqual);
  }

  if (ONLY.includes("select")) {
    // Rotation and selection with each tree: wheel climbs, the near card's entry point opens its tale.
    results.select = [];
    for (const vp of VPS) {
      for (const tree of TREES) {
        const { ctx, p } = await open(browser, vp, tree);
        const touch = Boolean(VIEWPORTS[vp].hasTouch);
        const before = await climbT(p);
        if (touch) {
          const client = await ctx.newCDPSession(p);
          await client.send("Input.synthesizeScrollGesture", {
            x: 195,
            y: 420,
            yDistance: -260,
            speed: 800,
            gestureSourceType: "touch",
          });
        } else {
          await p.mouse.move(720, 450);
          await p.mouse.wheel(0, 500);
        }
        await p.waitForTimeout(SETTLE_MS);
        const after = await climbT(p);
        const book = p.locator(".tree-shelf-book").nth(0);
        if (touch) await book.tap();
        else await book.click();
        await p.waitForTimeout(SETTLE_MS);
        const entry = p.locator("button.tree-book");
        const named = (await entry.textContent())?.trim() ?? "";
        const box = await entry.boundingBox();
        const { width, height } = VIEWPORTS[vp].viewport;
        const whole =
          box !== null &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= width &&
          box.y + box.height <= height;
        // The 3D pick on the card itself (not the DOM entry point): press the card's centre.
        if (box) {
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 2;
          if (touch) await p.touchscreen.tap(x, y);
          else await p.mouse.click(x, y);
        }
        await p.waitForTimeout(4000);
        // The shell marks the open book on its root (app.ts `root.dataset.book`).
        const opened = await p.evaluate(() => document.querySelector(".app")?.dataset.book ?? null);
        const url = p.url();
        await p.screenshot({ path: `${OUT}${vp}-select-${tree}.png` });
        results.select.push({
          vp,
          tree,
          climbBefore: before,
          climbAfter: after,
          named,
          whole,
          opened,
          url,
        });
        console.log(
          "select",
          vp,
          tree,
          JSON.stringify({ before, after, named, whole, opened, url }),
        );
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}results-${ONLY.join("+")}.json`, JSON.stringify(results, null, 2));
  if (results.errors.length) console.log("errors", results.errors);
}
