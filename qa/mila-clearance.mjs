// Mila's tale, clearance check: on every rendered frame of every page and page turn, measures how
// deep each living form (Mila, the fish, the school, the turtle, the crab) is inside another one or
// inside a solid (rocks, corals, the conches, the pearl, the debris, the ground). Needs a build with
// the read-only probe of qa/mila-probe-inject.mjs. Fake clock, GPU only (functional check, not a
// frame-rate measurement).
// Bodies are stood in for by capsules and ellipsoids (see `PROXIES` below, written to the result).
// Every living form is tested against every other living form, every solid and the ground; a pair
// counts when its stand-ins overlap by more than TOL metres. The gap between two stand-ins is
// computed by qa/mila-clearance-gap.mjs, which never reports an overlap shallower than it is (tested
// there, with known overlaps as controls). The ground is different: its height is read under sampled
// points of each stand-in on every frame, which is a measure, not a bound. The result lists every pair kind with how often it came close
// enough to be measured (`checks`), so a kind with no overlap is told apart from one never tested.
// Usage: SITE=url OUT=dir [VPS=desktop,mobile] [TOL=0.02] [REST_SEA=20000] [REST_LAND=6000]
//        [BACK=1] [SOLIDS=solids.json] [QA_CHANNEL=chrome] node qa/mila-clearance.mjs
// SOLIDS: corals of a build that does not list them (a file written by a run on one that does).
// SAME_AS=dir: also saves, in OUT/same/, the frames at the same segment and frame number as the worst
// frames of an earlier run in `dir` (its clearance-<vp>.json), ringed at the same place of the
// picture: the other build at the instants where that one was at its worst.
// Per segment it also gives the largest move of a fish between two frames (`maxStep`, metres) and the
// number of moves over 0.05 m (`fastSteps`, 3 m/s at 60 frames a second), and the largest change of
// that move from one frame to the next (`maxJolt`, metres; `jolts` counts those over 0.01 m): jumps,
// darts and jitter.
// Outputs in OUT: clearance-<vp>.json, solids.json, worst/<vp>-<segment>-<pair>.jpg (the frame of the
// deepest overlap of each pair kind in each segment, the place ringed).
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { clearanceGeometry } from "./mila-clearance-gap.mjs";

const SITE = process.env.SITE ?? "http://localhost:4196/";
const OUT = (process.env.OUT ?? new URL("./out/mila-clearance/", import.meta.url).pathname).replace(
  /\/?$/,
  "/",
);
const VPS = (process.env.VPS ?? "desktop,mobile").split(",");
const TOL = Number(process.env.TOL ?? 0.02);
const REST_SEA = Number(process.env.REST_SEA ?? 20000);
const REST_LAND = Number(process.env.REST_LAND ?? 6000);
const BACK = process.env.BACK !== "0";
const SOLIDS = process.env.SOLIDS ? JSON.parse(readFileSync(process.env.SOLIDS, "utf8")) : null;
const SAME_AS = process.env.SAME_AS ? process.env.SAME_AS.replace(/\/?$/, "/") : null;
mkdirSync(`${OUT}worst`, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};

/** What stands in for each body (metres, in the body's own frame unless stated). */
const PROXIES = {
  mila: "capsules: dress (0,0.50,0)-(0,0.86,0) r 0.19; head ball r 0.13; thighs and shins r 0.035; upper arms r 0.025, forearms r 0.022. Hair buns, hands, feet and the conch she carries are left out. Against the ground the shins are left out too (she stands on it)",
  fish: "capsule along the body, 0.18 long, r 0.045, times the fish's size; the tail fin is left out; fish scaled under 0.3 (not yet revealed) are skipped",
  turtle:
    "ellipsoid for the shell (half-axes 0.62 x 0.18 x 0.62 in the turtle's frame, turning and tilting with it) and a ball for the head (r 0.16), both times the turtle's scale; the flippers are left out",
  crab: "ellipsoid of its shell (the dome mesh itself: 0.36 x 0.144 x 0.27, turned with the crab); legs, claws and eyes are left out",
  conches:
    "one ellipsoid per mesh of the living conch, of the pearl with its valve, of the conch on the sand and of each piece of debris: exact for a mesh that is a sphere, else 85 % of the mesh's own bounding box, turned with the mesh",
  rock: "flattened sphere: r 1.05 x mean horizontal scale, half-height 0.76 x vertical scale",
  coral:
    "flattened sphere around each coral: its branches' widest reach from the foot, half its height",
  ground:
    "the scene's own height function under 160 points of each stand-in's surface and its lowest point, straight down, for every living body on every frame. This is a sampled measure: unlike the gap between two stand-ins, it is not a bound, and ground relief between the sampled points is not covered",
};
/** Living forms first, then the solids: a pair kind is named in this order. */
const KINDS = [
  "mila",
  "fish",
  "school",
  "turtle",
  "crab",
  "liveConch",
  "pearl",
  "bigConch",
  "debris",
  "rock",
  "coral",
  "ground",
];
const LIVING = 6;

/** Runs in the page: measures after every frame the scene has drawn. */
function pageProbe(G, TOL, SOLIDS, WANTED, KINDS, LIVING) {
  const st = {
    seg: null,
    segs: {},
    shots: {},
    same: {},
    frames: 0,
    err: null,
    solids: null,
    checks: {},
    maxSlope: 0,
  };
  window.__clr = st;
  const raf = window.requestAnimationFrame.bind(window);
  let lastV = -1;
  window.requestAnimationFrame = (cb) =>
    raf((t) => {
      cb(t);
      const M = window.__mila;
      if (!M || !st.seg || !M.fish) return;
      const v = M.fish.instanceMatrix.version;
      if (v === lastV) return;
      lastV = v;
      try {
        measure(M);
      } catch (e) {
        st.err = String((e && e.stack) || e);
      }
    });

  let statics = null;
  const last = new Map();
  function buildStatics(M) {
    const T = M.THREE;
    /** One ellipsoid per mesh under `o`: the sphere itself, or 85 % of the mesh's own box. */
    const shapes = (o, only) => {
      const out = [];
      o.updateWorldMatrix(true, true);
      o.traverse((m) => {
        if (!m.isMesh || !m.visible || (only && !only(m))) return;
        const e = m.matrixWorld.elements;
        const col = (k, f) => [e[k * 4] * f, e[k * 4 + 1] * f, e[k * 4 + 2] * f];
        const g = m.geometry;
        let c = new T.Vector3();
        let half;
        if (g.type === "SphereGeometry") half = [1, 1, 1].map(() => g.parameters.radius);
        else {
          if (!g.boundingBox) g.computeBoundingBox();
          g.boundingBox.getCenter(c);
          const s = g.boundingBox.getSize(new T.Vector3());
          half = [s.x, s.y, s.z].map((v) => 0.425 * v);
        }
        c = c.applyMatrix4(m.matrixWorld);
        out.push({ c: [c.x, c.y, c.z], ax: [col(0, half[0]), col(1, half[1]), col(2, half[2])] });
      });
      return out;
    };
    const rocks = M.scene.children
      .filter((o) => o.isMesh && o.material === M.rockMat)
      .map((o, i) => ({
        id: `rock${i}`,
        c: [o.position.x, o.position.y, o.position.z],
        r: 1.05 * 0.5 * (o.scale.x + o.scale.z),
        ry: 0.76 * o.scale.y,
      }));
    const roots = new Map();
    M.scene.traverse((o) => {
      const g = o.isMesh && o.geometry;
      if (!g || !g.attributes.aRoot || g.attributes.aRoot.itemSize !== 4) return;
      const R = g.attributes.aRoot;
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const key = `${R.getX(i)},${R.getY(i)},${R.getZ(i)}`;
        let e = roots.get(key);
        if (!e)
          roots.set(key, (e = { x: R.getX(i), y: R.getY(i), z: R.getZ(i), h: R.getW(i), r: 0 }));
        e.r = Math.max(e.r, Math.hypot(P.getX(i) - e.x, P.getZ(i) - e.z));
      }
    });
    let corals = [...roots.values()].map((e, i) => ({
      id: `coral${i}`,
      c: [e.x, e.y + e.h / 2, e.z],
      r: Math.max(e.r, 0.1),
      ry: e.h / 2 + 0.05,
    }));
    if (!corals.length && SOLIDS) corals = SOLIDS.corals;
    // The steepest the ground gets (norm of the gradient, on a 0.2 m grid of the whole scene):
    // recorded for the reader only, no test relies on it.
    let maxSlope = 0;
    for (let x = -40; x <= 60; x += 0.2)
      for (let z = -70; z <= 40; z += 0.2) {
        const h = M.groundH(x, z);
        maxSlope = Math.max(
          maxSlope,
          Math.hypot(M.groundH(x + 0.2, z) - h, M.groundH(x, z + 0.2) - h) / 0.2,
        );
      }
    st.maxSlope = maxSlope;
    const noHalo = (m) => !m.material?.transparent || m.material.opacity > 0.5;
    statics = {
      rocks,
      corals,
      liveConch: shapes(M.liveConch),
      bigConch: shapes(M.bigConch),
      pearl: shapes(M.pearl, noHalo),
      maxSlope,
      shapes,
    };
    st.solids = {
      rocks,
      corals,
      liveConch: statics.liveConch,
      bigConch: statics.bigConch,
      pearl: statics.pearl,
    };
  }

  function note(cat, pair, g, at, M) {
    const S = st.segs[st.seg];
    let c = S.cats[cat];
    if (!c)
      c = S.cats[cat] = {
        pairFrames: 0,
        frames: 0,
        last: -1,
        pairs: {},
        max: 0,
        who: "",
        frame: 0,
      };
    c.pairFrames++;
    if (c.last !== S.frames) {
      c.frames++;
      c.last = S.frames;
    }
    c.pairs[pair] = Math.max(c.pairs[pair] ?? 0, -g);
    if (-g > c.max + 0.005) {
      c.max = -g;
      c.who = pair;
      c.frame = S.frames;
      if (M.camera) {
        const v = new M.THREE.Vector3(at[0], at[1], at[2]).project(M.camera);
        const cv = document.querySelector(".mila-gl") ?? document.querySelector("canvas");
        st.shots[`${st.seg}|${cat}`] = {
          x: (v.x + 1) / 2,
          y: (1 - v.y) / 2,
          front: v.z < 1,
          url: Object.keys(st.shots).length < 400 ? cv.toDataURL("image/jpeg", 0.85) : null,
          depth: -g,
          pair,
          frame: S.frames,
        };
      }
    }
  }

  function measure(M) {
    const T = M.THREE;
    if (!statics) buildStatics(M);
    const S = st.segs[st.seg] ?? (st.segs[st.seg] = { frames: 0, cats: {} });
    S.frames++;
    st.frames++;
    for (const w of WANTED)
      if (w.seg === st.seg && w.frame === S.frames) {
        const cv = document.querySelector(".mila-gl") ?? document.querySelector("canvas");
        st.same[`${w.seg}|${w.cat}`] = { ...w, url: cv.toDataURL("image/jpeg", 0.85) };
      }
    const tmp = new T.Vector3();
    const wp = (o) => {
      o.getWorldPosition(tmp);
      return [tmp.x, tmp.y, tmp.z];
    };
    // Mila
    const m = M.mila;
    m.g.updateWorldMatrix(true, true);
    const bp = (x, y, z) => {
      tmp.set(x, y, z).applyMatrix4(m.body.matrixWorld);
      return [tmp.x, tmp.y, tmp.z];
    };
    const head = wp(m.head);
    const mila = [
      { a: bp(0, 0.5, 0), b: bp(0, 0.86, 0), r: 0.19 },
      { a: head, b: head, r: 0.13 },
    ];
    for (const L of m.legs) {
      const h = wp(L.hip);
      const k = wp(L.knee);
      const a = wp(L.ankle);
      mila.push({ a: h, b: k, r: 0.035 }, { a: k, b: a, r: 0.035, shin: true });
    }
    for (const A of m.arms) {
      const s = wp(A.sh);
      const e = wp(A.el);
      const h = wp(A.hand);
      mila.push({ a: s, b: e, r: 0.025 }, { a: e, b: h, r: 0.022 });
    }
    // fish
    const swimmers = [];
    for (const [mesh, name] of [
      [M.fish, "fish"],
      [M.school, "school"],
    ]) {
      const e = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i++) {
        const o = i * 16;
        const s = Math.hypot(e[o], e[o + 1], e[o + 2]);
        if (s < 0.3) continue;
        const zl = Math.hypot(e[o + 8], e[o + 9], e[o + 10]) || 1;
        const z = [e[o + 8] / zl, e[o + 9] / zl, e[o + 10] / zl];
        const p = [e[o + 12], e[o + 13], e[o + 14]];
        const hl = 0.09 * s;
        swimmers.push({
          id: `${name}${i}`,
          kind: name,
          p,
          a: [p[0] - z[0] * hl, p[1] - z[1] * hl, p[2] - z[2] * hl],
          b: [p[0] + z[0] * hl, p[1] + z[1] * hl, p[2] + z[2] * hl],
          r: 0.045 * s,
        });
      }
    }
    // how the fish move from one frame to the next: a jump or a dart would show here
    S.swimmers = Math.min(S.swimmers ?? 1e9, swimmers.length);
    for (const f of swimmers) {
      const q = last.get(f.id);
      if (q && q.frame === st.frames - 1) {
        const step = Math.hypot(f.p[0] - q.p[0], f.p[1] - q.p[1], f.p[2] - q.p[2]);
        if (!(step >= 0)) S.notNumbers = (S.notNumbers ?? 0) + 1;
        if (step > (S.maxStep ?? 0)) {
          S.maxStep = step;
          S.maxStepWho = f.id;
        }
        if (step > 0.05) S.fastSteps = (S.fastSteps ?? 0) + 1;
        const v = [f.p[0] - q.p[0], f.p[1] - q.p[1], f.p[2] - q.p[2]];
        if (q.v) {
          const jolt = Math.hypot(v[0] - q.v[0], v[1] - q.v[1], v[2] - q.v[2]);
          if (jolt > (S.maxJolt ?? 0)) {
            S.maxJolt = jolt;
            S.maxJoltWho = f.id;
          }
          if (jolt > 0.01) S.jolts = (S.jolts ?? 0) + 1;
        }
        last.set(f.id, { p: f.p, frame: st.frames, v });
      } else last.set(f.id, { p: f.p, frame: st.frames });
    }
    // turtle
    M.turtle.updateWorldMatrix(true, false);
    const te = M.turtle.matrixWorld.elements;
    const tp = (x, y, z) => {
      tmp.set(x, y, z).applyMatrix4(M.turtle.matrixWorld);
      return [tmp.x, tmp.y, tmp.z];
    };
    const tcol = (k, f) => [te[k * 4] * f, te[k * 4 + 1] * f, te[k * 4 + 2] * f];
    const th = tp(0, 0.07, 0.78);
    const turtle = [
      { c: tp(0, 0.09, 0.05), ax: [tcol(0, 0.62), tcol(1, 0.18), tcol(2, 0.62)] },
      { a: th, b: th, r: 0.16 * M.turtle.scale.x },
    ];
    // crab: its shell is the first mesh of its group
    const dome = M.crab.g.children.find((o) => o.isMesh);
    const crab = statics.shapes(M.crab.g, (o) => o === dome);
    // the bodies of this frame: living forms, then solids
    const bodies = [];
    const add = (kind, id, parts, groundParts) => {
      const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (const p of parts) {
        p.box ??= G.box(p);
        for (let k = 0; k < 3; k++) {
          b[k] = Math.min(b[k], p.box[k]);
          b[k + 3] = Math.max(b[k + 3], p.box[k + 3]);
        }
      }
      bodies.push({ kind, rank: KINDS.indexOf(kind), id, parts, box: b, groundParts });
    };
    add(
      "mila",
      "mila",
      mila,
      mila.filter((c) => !c.shin),
    );
    for (const f of swimmers) add(f.kind, f.id, [f]);
    add("turtle", "turtle", turtle);
    add("crab", "crab", crab);
    add("liveConch", "liveConch", statics.liveConch);
    add("pearl", "pearl", statics.pearl);
    add("bigConch", "bigConch", statics.bigConch);
    M.debris
      .filter((d) => d.mesh.visible && d.mesh.scale.x > 0.75)
      .forEach((d) => add("debris", `debris${M.debris.indexOf(d)}`, statics.shapes(d.mesh)));
    for (const s of statics.rocks) add("rock", s.id, [s]);
    for (const s of statics.corals) add("coral", s.id, [s]);
    // a pair is measured once the boxes around its two bodies are within NEAR metres
    const NEAR = 0.3;
    const seen = (cat, g) => {
      const c = (st.checks[cat] ??= { measured: 0, closest: Infinity });
      c.measured++;
      if (g < c.closest) c.closest = g;
    };
    for (let i = 0; i < bodies.length && bodies[i].rank < LIVING; i++) {
      const A = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const B = bodies[j];
        const a = A.box;
        const b = B.box;
        if (
          a[0] > b[3] + NEAR ||
          b[0] > a[3] + NEAR ||
          a[1] > b[4] + NEAR ||
          b[1] > a[4] + NEAR ||
          a[2] > b[5] + NEAR ||
          b[2] > a[5] + NEAR
        )
          continue;
        const cat = `${A.kind}-${B.kind}`;
        let least = Infinity;
        for (const p of A.parts)
          for (const q of B.parts) {
            const h = G.gap(p, q, -TOL);
            least = Math.min(least, h.g);
            if (h.g < -TOL) note(cat, `${A.id}+${B.id}`, h.g, h.at, M);
          }
        seen(cat, least);
      }
      // the ground: every living body on every frame, with no early rejection
      const cat = `${A.kind}-ground`;
      let least = Infinity;
      for (const p of A.groundParts ?? A.parts) {
        const h = G.overGround(p, M.groundH);
        least = Math.min(least, h.g);
        if (h.g < -TOL) note(cat, A.id, h.g, h.at, M);
      }
      seen(cat, least);
    }
  }
}

const browser = await chromium.launch({
  channel: process.env.QA_CHANNEL || undefined,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"],
  env: {
    ...process.env,
    __EGL_VENDOR_LIBRARY_FILENAMES:
      process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json",
  },
});
try {
  for (const vp of VPS) {
    const ctx = await browser.newContext({ ...VIEWPORTS[vp] });
    const p = await ctx.newPage();
    const touch = vp !== "desktop";
    const press = (l) => (touch ? l.tap() : l.click());
    const run = (ms) => p.clock.runFor(ms);
    // the clock first: it replaces requestAnimationFrame, which the probe then wraps
    await p.clock.install({ time: new Date("2026-11-17T12:00:00Z") });
    const wanted = SAME_AS
      ? Object.entries(
          JSON.parse(readFileSync(`${SAME_AS}clearance-${vp}.json`, "utf8")).shots,
        ).map(([key, s]) => ({
          seg: key.split("|")[0],
          cat: key.split("|")[1],
          frame: s.frame,
          x: s.x,
          y: s.y,
          front: s.front,
        }))
      : [];
    await p.addInitScript(
      `(${pageProbe.toString()})((${clearanceGeometry.toString()})(), ${TOL}, ` +
        `${JSON.stringify(SOLIDS)}, ${JSON.stringify(wanted)}, ${JSON.stringify(KINDS)}, ${LIVING})`,
    );
    await p.goto(SITE);
    for (let i = 0; i < 200 && !(await p.locator(".loader.is-done").count()); i++) await run(250);
    const renderer = await p.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const e = gl?.getExtension("WEBGL_debug_renderer_info");
      return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "none";
    });
    console.log(`${vp}: renderer ${renderer}`);
    if (!/NVIDIA/i.test(renderer)) throw new Error(`renderer "${renderer}" is not NVIDIA`);
    await run(1500);
    const shelf = p.locator(".tree-shelf-book").nth(1);
    await press(shelf);
    await run(2800);
    await press(shelf);
    const num = () => p.evaluate(() => document.querySelector(".mila-num")?.textContent);
    const shown = () =>
      p.evaluate(() => document.querySelector(".mila-story")?.classList.contains("is-on"));
    for (let i = 0; i < 200 && ((await num()) !== "Page 01" || !(await shown())); i++)
      await run(100);
    if (!(await p.evaluate(() => !!window.__mila)))
      throw new Error("no probe in this build: see qa/mila-probe-inject.mjs");
    const seg = (name) => p.evaluate((n) => (window.__clr.seg = n), name);
    const pad = (n) => String(n).padStart(2, "0");
    const turn = async (btn, name) => {
      const before = await num();
      await seg(name);
      await press(p.locator(btn));
      for (let i = 0; i < 400 && ((await num()) === before || !(await shown())); i++) await run(50);
      await run(300);
    };
    for (let pg = 1; pg <= 12; pg++) {
      await seg(`p${pad(pg)}`);
      await run(pg >= 7 && pg <= 10 ? REST_SEA : REST_LAND);
      if (pg < 12) await turn(".mila-next", `t${pad(pg)}-${pad(pg + 1)}`);
    }
    if (BACK)
      for (let pg = 12; pg > 1; pg--) await turn(".mila-prev", `b${pad(pg)}-${pad(pg - 1)}`);
    await seg(null);
    const res = await p.evaluate(() => window.__clr);
    if (res.err) console.warn(`probe error: ${res.err}`);
    if (SAME_AS) mkdirSync(`${OUT}same`, { recursive: true });
    const pictures = [
      ...Object.entries(res.shots).map(([key, s]) => [key, s, "worst"]),
      ...Object.entries(res.same).map(([key, s]) => [key, s, "same"]),
    ];
    for (const [key, s, dir] of pictures) {
      if (!s.url) continue;
      const [segName, cat] = key.split("|");
      const file = `${OUT}${dir}/${vp}-${segName}-${cat}.jpg`;
      writeFileSync(file, Buffer.from(s.url.split(",")[1], "base64"));
      if (s.front && s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1)
        try {
          const dim = execFileSync("identify", ["-format", "%w %h", file]).toString().split(" ");
          const x = Math.round(s.x * dim[0]);
          const y = Math.round(s.y * dim[1]);
          const r = Math.round(dim[0] * 0.035);
          execFileSync("mogrify", [
            "-fill",
            "none",
            "-stroke",
            "#ff2bd6",
            "-strokewidth",
            String(Math.max(2, Math.round(dim[0] / 480))),
            "-draw",
            `circle ${x},${y} ${x + r},${y}`,
            file,
          ]);
        } catch (e) {
          console.warn(`could not ring ${file}: ${String(e).split("\n")[0]}`);
        }
      delete s.url;
      s.file = `${dir}/${vp}-${segName}-${cat}.jpg`;
    }
    for (const s of Object.values(res.segs))
      for (const c of Object.values(s.cats)) {
        c.distinctPairs = Object.keys(c.pairs).length;
        delete c.pairs;
        delete c.last;
      }
    if (res.solids?.corals?.length && !existsSync(`${OUT}solids.json`))
      writeFileSync(`${OUT}solids.json`, JSON.stringify(res.solids));
    const out = {
      site: SITE,
      viewport: vp,
      renderer,
      browser: browser.version(),
      tolerance: TOL,
      restSea: REST_SEA,
      restLand: REST_LAND,
      proxies: PROXIES,
      error: res.err,
      frames: res.frames,
      counts: {
        rocks: res.solids?.rocks.length,
        corals: res.solids?.corals.length,
      },
      steepestGround: res.maxSlope,
      // Every kind of pair the check looks at. `measured`: times a pair of that kind was within
      // 0.3 m (boxes) and its gap was computed, over the whole run; 0 means the two were never that
      // near. `closest`: the smallest gap found, metres; for a gap over -TOL it is a lower bound
      // (the search stops once the pair is known to be clear), exact between two capsules.
      checks: Object.fromEntries(
        KINDS.slice(0, LIVING).flatMap((a, i) =>
          KINDS.slice(i)
            .filter((b) => a !== b || a === "fish" || a === "school")
            .map((b) => {
              const c = res.checks[`${a}-${b}`];
              return [`${a}-${b}`, { measured: c?.measured ?? 0, closest: c?.closest ?? null }];
            }),
        ),
      ),
      segments: res.segs,
      shots: res.shots,
      same: res.same,
    };
    writeFileSync(`${OUT}clearance-${vp}.json`, JSON.stringify(out, null, 1));
    const total = {};
    for (const s of Object.values(res.segs))
      for (const [cat, c] of Object.entries(s.cats)) {
        const t = (total[cat] ??= { frames: 0, max: 0 });
        t.frames += c.frames;
        t.max = Math.max(t.max, c.max);
      }
    const segs = Object.values(res.segs);
    console.log(
      `${vp}: ${res.frames} frames, fish in the sea ${Math.min(...segs.map((s) => s.swimmers))} or more, ` +
        `largest step ${Math.max(...segs.map((s) => s.maxStep ?? 0)).toFixed(3)} m, steps over 0.05 m: ` +
        `${segs.reduce((n, s) => n + (s.fastSteps ?? 0), 0)}, largest jolt ` +
        `${Math.max(...segs.map((s) => s.maxJolt ?? 0)).toFixed(3)} m, jolts over 0.01 m: ` +
        `${segs.reduce((n, s) => n + (s.jolts ?? 0), 0)}, not numbers: ` +
        `${segs.reduce((n, s) => n + (s.notNumbers ?? 0), 0)}`,
    );
    console.log(`  steepest ground ${res.maxSlope.toFixed(2)}; pair kinds:`);
    for (const [cat, c] of Object.entries(out.checks))
      console.log(
        `  ${cat.padEnd(20)} measured ${String(c.measured).padStart(7)}` +
          (c.measured ? `, closest ${c.closest.toFixed(3)} m` : ""),
      );
    console.log("  overlaps deeper than the tolerance:");
    for (const [cat, t] of Object.entries(total).sort())
      console.log(
        `  ${cat.padEnd(18)} ${String(t.frames).padStart(6)} frames, deepest ${t.max.toFixed(3)} m`,
      );
    await ctx.close();
  }
} finally {
  await browser.close();
}
