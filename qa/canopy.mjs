// Main flamboyant canopy and opening view (anchored canopy mission): crown viewpoints all around the
// tree through the QA viewer (qa/vegetation/, needs `vite` dev), wind frames from a fixed camera,
// an attachment metric (each card's base to the nearest bark vertex), and the real app's fresh load
// and first wheel / finger swipe on desktop and phones. Run it on the baseline and the branch with
// two OUT folders. Usage: SITE=http://localhost:5173/ OUT=dir [ONLY=metrics,ring,orbit,wind,app] node qa/canopy.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = (process.env.SITE ?? "http://localhost:5173/").replace(/\/?$/, "/");
const OUT = (process.env.OUT ?? new URL("./out/canopy/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const ONLY = (process.env.ONLY ?? "metrics,ring,orbit,wind,app").split(",");
const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const env = {
  ...process.env,
  __EGL_VENDOR_LIBRARY_FILENAMES:
    process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
};
mkdirSync(OUT, { recursive: true });

/** Spiral camera of the tree (src/tree/scene/camera.ts `hubCam`). */
function hub(t) {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 20 - t * 4;
  const y = 1.3 + t * 6.4;
  return [
    [Math.cos(a) * r, y, Math.sin(a) * r],
    [0, y + 2.2 - t * 1.2, 0],
  ];
}

/** A camera on a circle around the crown: azimuth in degrees, distance, height. */
function around(deg, dist, y, lookY = 8.2) {
  const a = (deg * Math.PI) / 180;
  return [
    [Math.cos(a) * dist, y, Math.sin(a) * dist],
    [0, lookY, 0],
  ];
}

const VIEWPORTS = {
  // The reference capture is a 1064×928 crop of a wider window: crop 108 px off each side.
  owner: { viewport: { width: 1280, height: 928 }, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1920, height: 918 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  narrow: {
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  landscape: {
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
const results = { site: SITE, errors: [] };

/** Records page errors under `tag`. */
function watch(page, tag) {
  page.on("pageerror", (e) => results.errors.push(`${tag} pageerror: ${e.message}`));
  page.on(
    "console",
    (m) => m.type() === "error" && results.errors.push(`${tag} console: ${m.text()}`),
  );
}

/** Opens the QA viewer at `size` and waits until it is ready. */
async function viewer(browser, size, tag) {
  const ctx = await browser.newContext({ viewport: size });
  const p = await ctx.newPage();
  watch(p, tag);
  await p.goto(`${SITE}qa/vegetation/index.html`);
  await p.waitForFunction(() => window.__vegReady, null, { timeout: 30000 });
  return { ctx, p };
}

const shot = (p, [pos, look], time) =>
  p.evaluate(([a, b, s]) => window.__veg.shot(a, b, s), [pos, look, time]);

// The climb bar shows t. REVERSED=1 reads the intermediate 08bd473 build (bar = 1 - t, scrolling
// down lowered t), superseded by CANOPY-FACE.
const REVERSED = process.env.REVERSED === "1";
const barOf = (p) =>
  p.$eval(".tree-climb-thumb", (e) => Number(/([\d.e-]+)%/.exec(e.style.top)?.[1] ?? NaN) / 100);
const climbT = async (p) => {
  const bar = await barOf(p);
  return REVERSED ? 1 - bar : bar;
};

const browser = await chromium.launch({ args: GPU, env });
try {
  const probe = await browser.newPage();
  results.renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  await probe.close();
  console.log("renderer", results.renderer);
  if (!/NVIDIA/.test(results.renderer)) throw new Error("not on the NVIDIA GPU, abort");

  if (ONLY.includes("metrics")) {
    const { ctx, p } = await viewer(browser, { width: 640, height: 400 }, "metrics");
    // The main crown is the card mesh with an aSway attribute closest to the origin; the bark is the
    // vertex-coloured standard mesh at the origin. Each card is 12 vertices; vertex 1 is its base.
    results.metrics = await p.evaluate(() => {
      const scene = window.__veg.scene;
      let crown = null;
      let bark = null;
      scene.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const w = o.getWorldPosition(o.position.clone());
        if (w.length() > 0.01) return;
        if (o.geometry.attributes.aSway && o.geometry.attributes.position.count > 3000) crown = o;
        else if (o.material.color?.getHexString() === "9a6a46") bark = o;
      });
      if (!crown || !bark) return { error: "crown or bark not found" };
      const cp = crown.geometry.attributes.position.array;
      const bp = bark.geometry.attributes.position.array;
      const thin = [];
      for (let i = 0; i < bp.length; i += 3)
        if (bp[i + 1] > 3.5) thin.push(bp[i], bp[i + 1], bp[i + 2]);
      const cards = cp.length / 36;
      const dists = [];
      let flat = 0;
      for (let c = 0; c < cards; c++) {
        const o = c * 36;
        // Flower tiles (2, 3, 4) paint their cluster from a fifth of the card: measure there.
        const uv = crown.geometry.attributes.uv.array;
        const tile = Math.floor(uv[c * 24 + 2] * 4) + (uv[c * 24 + 3] < 0.5 ? 4 : 0);
        const k = tile >= 2 && tile <= 4 ? 0.6 : 0;
        const x = cp[o + 3] + (cp[o + 12] - cp[o + 3]) * k,
          y = cp[o + 4] + (cp[o + 13] - cp[o + 4]) * k,
          z = cp[o + 5] + (cp[o + 14] - cp[o + 5]) * k;
        let best = Infinity;
        for (let i = 0; i < thin.length; i += 3) {
          const d = (thin[i] - x) ** 2 + (thin[i + 1] - y) ** 2 + (thin[i + 2] - z) ** 2;
          if (d < best) best = d;
        }
        dists.push(Math.sqrt(best));
        // Card plane normal from base-left, base-right and the top centre.
        const ax = cp[o + 6] - cp[o],
          ay = cp[o + 7] - cp[o + 1],
          az = cp[o + 8] - cp[o + 2];
        const bx = cp[o + 30] - cp[o + 3],
          by = cp[o + 31] - cp[o + 4],
          bz = cp[o + 32] - cp[o + 5];
        const nx = ay * bz - az * by,
          ny = az * bx - ax * bz,
          nz = ax * by - ay * bx;
        if (Math.abs(ny) / Math.hypot(nx, ny, nz) > 0.85) flat++;
      }
      dists.sort((a, b) => a - b);
      const q = (k) => dists[Math.floor((dists.length - 1) * k)];
      return {
        cards,
        crownTriangles: crown.geometry.index.count / 3,
        barkTriangles: bark.geometry.index.count / 3,
        baseToBark: { median: q(0.5), p90: q(0.9), max: q(1) },
        shareOver05m: dists.filter((d) => d > 0.5).length / cards,
        shareOver1m: dists.filter((d) => d > 1).length / cards,
        shareNearHorizontal: flat / cards,
        crownParent: crown.parent?.type,
      };
    });
    console.log("metrics", JSON.stringify(results.metrics));
    await ctx.close();
  }

  if (ONLY.includes("facecheck")) {
    // CANOPY-FACE: the t = 1 camera (POSE=top) on the e2df734 build should match the same camera
    // swung by 1.55π (three.js y-rotation) to the opening azimuth (POSE=opening) on the turned tree, wind paused.
    const { ctx, p } = await viewer(browser, { width: 960, height: 640 }, "facecheck");
    const [pos, look] = hub(1);
    const turn = process.env.POSE === "opening" ? Math.PI * 1.55 : 0;
    const c = Math.cos(turn);
    const sn = Math.sin(turn);
    const at = [pos[0] * c + pos[2] * sn, pos[1], -pos[0] * sn + pos[2] * c];
    await shot(p, [at, look], 4);
    await p.screenshot({ path: `${OUT}facecheck-${process.env.POSE ?? "top"}.png` });
    await ctx.close();
  }

  if (ONLY.includes("ring")) {
    // Twelve azimuths at the climb's mid height and at crown height, wind paused (time 4).
    const { ctx, p } = await viewer(browser, { width: 960, height: 640 }, "ring");
    mkdirSync(`${OUT}ring`, { recursive: true });
    for (const [tag, dist, y] of [
      ["mid", 15, 5.2],
      ["crown", 15, 9],
    ]) {
      for (let deg = 0; deg < 360; deg += 30) {
        await shot(p, around(deg, dist, y), 4);
        await p.screenshot({ path: `${OUT}ring/${tag}-${String(deg).padStart(3, "0")}.png` });
      }
    }
    for (const t of [0, 0.1, 0.2, 0.3, 0.37, 0.45, 0.54, 0.65, 0.75, 0.88, 1]) {
      await shot(p, hub(t), 4);
      await p.screenshot({ path: `${OUT}ring/hub-${String(t).padEnd(4, "0")}.png` });
    }
    await ctx.close();
  }

  if (ONLY.includes("orbit")) {
    // Continuous traversal of the whole climb with the wind running (as in the app).
    for (const [tag, size] of [
      ["desktop", { width: 960, height: 459 }],
      ["mobile", { width: 390, height: 844 }],
    ]) {
      const { ctx, p } = await viewer(browser, size, `orbit-${tag}`);
      mkdirSync(`${OUT}orbit-${tag}`, { recursive: true });
      for (let i = 0; i < 120; i++) {
        await shot(p, hub(i / 119), 4 + i / 24);
        await p.screenshot({ path: `${OUT}orbit-${tag}/${String(i).padStart(3, "0")}.png` });
      }
      await ctx.close();
    }
  }

  if (ONLY.includes("wind")) {
    // Fixed cameras, 4 s of wind at 12 fps, framed on the crown's rim where card bases meet twigs.
    const { ctx, p } = await viewer(browser, { width: 960, height: 640 }, "wind");
    const rim = (deg, r, y) => {
      const a = (deg * Math.PI) / 180;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    for (const [name, view] of [
      // Rim close-up in profile at crown height, and a low three-quarter view up into the rim.
      ["profile", [rim(205, 12.5, 9.4), rim(235, 5.5, 9)]],
      ["three-quarter", [rim(160, 10, 6.4), rim(190, 5, 8.8)]],
    ]) {
      mkdirSync(`${OUT}wind-${name}`, { recursive: true });
      for (let i = 0; i < 48; i++) {
        await shot(p, view, 4 + i / 12);
        await p.screenshot({ path: `${OUT}wind-${name}/${String(i).padStart(3, "0")}.png` });
      }
    }
    await ctx.close();
  }

  if (ONLY.includes("sweep")) {
    // The real app climbed by wheel to fixed values, to find the climb matching a reference view.
    const opts = VIEWPORTS[process.env.VP ?? "owner"];
    const ctx = await browser.newContext({ ...opts, reducedMotion: "no-preference" });
    const p = await ctx.newPage();
    watch(p, "sweep");
    await p.goto(SITE);
    await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
    await p.waitForTimeout(2500);
    const { width: w, height: h } = opts.viewport;
    mkdirSync(`${OUT}sweep`, { recursive: true });
    for (const goal of (process.env.TS ?? "0.25,0.3,0.35,0.4,0.45").split(",").map(Number)) {
      await p.mouse.move(w / 2, h / 2);
      for (let i = 0; i < 40; i++) {
        const now = await climbT(p);
        if (Math.abs(now - goal) < 0.004) break;
        const dy = (goal - now) / 0.00055;
        await p.mouse.wheel(0, Math.max(-400, Math.min(400, REVERSED ? -dy : dy)));
        await p.waitForTimeout(250);
      }
      await p.waitForTimeout(1800);
      await p.screenshot({ path: `${OUT}sweep/t${goal.toFixed(3)}.png` });
    }
    await ctx.close();
  }

  if (ONLY.includes("journey")) {
    // The real app (cards and all) at the same climb values on both builds, from the opening view
    // (t = 1) down to the foot of the spiral, plus one capture per value with the wind 1 s later.
    results.journey = {};
    for (const vp of (process.env.VPS ?? "desktop,mobile").split(",")) {
      const opts = VIEWPORTS[vp];
      const ctx = await browser.newContext({ ...opts, reducedMotion: "no-preference" });
      const p = await ctx.newPage();
      watch(p, `journey-${vp}`);
      await p.goto(SITE);
      await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
      await p.waitForTimeout(2500);
      const { width: w, height: h } = opts.viewport;
      const dir = `${OUT}journey-${vp}/`;
      mkdirSync(dir, { recursive: true });
      const reached = [];
      for (let k = 20; k >= 0; k--) {
        const goal = k / 20;
        await p.mouse.move(w / 2, h * 0.45);
        for (let i = 0; i < 40; i++) {
          const now = await climbT(p);
          if (Math.abs(now - goal) < 0.004) break;
          const dy = (goal - now) / 0.00055;
          await p.mouse.wheel(0, Math.max(-400, Math.min(400, REVERSED ? -dy : dy)));
          await p.waitForTimeout(200);
        }
        await p.waitForTimeout(1400);
        reached.push(Number((await climbT(p)).toFixed(3)));
        await p.screenshot({ path: `${dir}t${goal.toFixed(2)}.png` });
      }
      results.journey[vp] = reached;
      console.log("journey", vp, reached.join(" "));
      await ctx.close();
    }
  }

  if (ONLY.includes("fps")) {
    // Uncapped frame time in the viewer at the opening view and mid-climb, wind running.
    results.fps = {};
    const fast = await chromium.launch({
      args: [...GPU, "--disable-gpu-vsync", "--disable-frame-rate-limit"],
      env,
    });
    for (const mode of ["", "?lite=1"]) {
      const ctx = await fast.newContext({ viewport: { width: 1920, height: 918 } });
      const p = await ctx.newPage();
      await p.goto(`${SITE}qa/vegetation/index.html${mode}`);
      await p.waitForFunction(() => window.__vegReady, null, { timeout: 30000 });
      for (const t of [1, 0.5]) {
        const [pos, look] = hub(t);
        const info = await shot(p, [pos, look], 4);
        const runs = [];
        for (let i = 0; i < 3; i++)
          runs.push(await p.evaluate(([a, b]) => window.__veg.fps(4000, a, b), [pos, look]));
        results.fps[`${mode || "full"} t${t}`] = { info, runs };
        console.log(
          "fps",
          mode || "full",
          t,
          info.calls,
          info.triangles,
          runs.map((r) => r.meanMs.toFixed(2)).join(" "),
        );
      }
      await ctx.close();
    }
    await fast.close();
  }

  if (ONLY.includes("app")) {
    results.app = {};
    for (const vp of (process.env.VPS ?? "owner,desktop,mobile,narrow,landscape").split(",")) {
      const opts = VIEWPORTS[vp];
      const ctx = await browser.newContext({ ...opts, reducedMotion: "no-preference" });
      const p = await ctx.newPage();
      watch(p, `app-${vp}`);
      await p.goto(SITE);
      await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
      await p.waitForTimeout(2500);
      const { width: w, height: h } = opts.viewport;
      const dir = `${OUT}app-${vp}/`;
      mkdirSync(dir, { recursive: true });
      await p.screenshot({ path: `${dir}fresh.png` });
      const start = await climbT(p);
      // Where the books land on screen at the opening view.
      const books = await p.evaluate(() =>
        [...document.querySelectorAll(".tree-shelf button, .tree-shelf a")].map((e) =>
          e.textContent?.trim(),
        ),
      );
      const cdp = opts.hasTouch ? await ctx.newCDPSession(p) : null;
      const track = [start];
      for (let i = 0; i < 16; i++) {
        if (cdp) {
          const pt = (y) => [{ x: w * 0.5, y, id: 1 }];
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: pt(h * 0.6),
          });
          for (let k = 1; k <= 4; k++)
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: pt(h * 0.6 - (h * 0.04 * k) / 4),
            });
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        } else {
          await p.mouse.move(w / 2, h / 2);
          await p.mouse.wheel(0, i < 8 ? 40 : -40);
        }
        await p.waitForTimeout(100);
        track.push(await climbT(p));
        await p.screenshot({ path: `${dir}step-${String(i).padStart(2, "0")}.png` });
      }
      results.app[vp] = { start, track, shelf: books };
      console.log("app", vp, "start", start, "track", track.map((v) => v.toFixed(3)).join(" "));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  writeFileSync(`${OUT}results.json`, JSON.stringify(results, null, 2));
  console.log("errors", results.errors.length);
}
