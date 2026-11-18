// Mila's tale, clearance check: on every rendered frame of every page and page turn, measures how
// deep each living form (Mila, the fish, the school, the turtle, the crab) is inside another one or
// inside a solid (rocks, corals, the conches, the pearl, the debris, the ground). Needs a build with
// the read-only probe of qa/mila-probe-inject.mjs. Fake clock, GPU only (functional check, not a
// frame-rate measurement).
// Bodies are stood in for by capsules and flattened spheres (see `PROXIES` below, written to the
// result): a pair counts when its proxies overlap by more than TOL metres.
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
  mila: "capsules: dress (0,0.50,0)-(0,0.86,0) r 0.19; head sphere r 0.13; thighs and shins r 0.035; upper arms r 0.025, forearms r 0.022. Hair buns, hands, feet and the conch she carries are left out",
  fish: "capsule along the body, 0.18 long, r 0.045, times the fish's size; the tail fin is left out; fish scaled under 0.3 (not yet revealed) are skipped",
  turtle:
    "flattened sphere for the shell (r 0.37, half-height 0.11) and a sphere for the head (r 0.1); the flippers are left out",
  crab: "flattened sphere r 0.45, half-height 0.15 (body and the root of the legs)",
  conches:
    "flattened spheres from the bounding boxes of the living conch, the pearl with its valve, the conch on the sand and each piece of debris (85 % of the half-extents)",
  rock: "flattened sphere: r 1.05 x mean horizontal scale, half-height 0.76 x vertical scale",
  coral:
    "flattened sphere around each coral: its branches' widest reach from the foot, half its height",
  ground:
    "the scene's own height function; Mila's dress and head, the fish and the turtle are tested against it",
};

/** Runs in the page: measures after every frame the scene has drawn. */
function pageProbe(TOL, SOLIDS, WANTED) {
  const st = { seg: null, segs: {}, shots: {}, same: {}, frames: 0, err: null, solids: null };
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

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const mix = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  const cl = (x) => Math.min(1, Math.max(0, x));
  /** Closest points of two segments: distance and the point between them. */
  function segSeg(p1, q1, p2, q2) {
    const d1 = sub(q1, p1);
    const d2 = sub(q2, p2);
    const r = sub(p1, p2);
    const a = dot(d1, d1);
    const e = dot(d2, d2);
    const f = dot(d2, r);
    let s = 0;
    let t = 0;
    if (a <= 1e-12 && e <= 1e-12) {
      /* two points */
    } else if (a <= 1e-12) t = cl(f / e);
    else {
      const c = dot(d1, r);
      if (e <= 1e-12) s = cl(-c / a);
      else {
        const b = dot(d1, d2);
        const den = a * e - b * b;
        s = den > 1e-12 ? cl((b * f - c * e) / den) : 0;
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = cl(-c / a);
        } else if (t > 1) {
          t = 1;
          s = cl((b - c) / a);
        }
      }
    }
    const c1 = mix(p1, q1, s);
    const c2 = mix(p2, q2, t);
    const d = sub(c1, c2);
    return { d: Math.hypot(d[0], d[1], d[2]), at: mix(c1, c2, 0.5) };
  }
  /** Signed gap between two shapes (negative: overlap). A shape is a capsule {a,b,r} or a flattened sphere {c,r,ry}. */
  function gap(A, B) {
    if (A.c && !B.c) return gap(B, A);
    if (A.c && B.c) return gap({ a: A.c, b: A.c, r: Math.min(A.r, A.ry) }, B);
    if (!B.c) {
      const h = segSeg(A.a, A.b, B.a, B.b);
      return { g: h.d - A.r - B.r, at: h.at };
    }
    // flattened sphere: stretch the heights around its centre so it is round
    const k = B.r / B.ry;
    const lift = (p) => [p[0], B.c[1] + (p[1] - B.c[1]) * k, p[2]];
    const h = segSeg(lift(A.a), lift(A.b), B.c, B.c);
    const at = [h.at[0], B.c[1] + (h.at[1] - B.c[1]) / k, h.at[2]];
    return { g: h.d - A.r - B.r, at };
  }

  let statics = null;
  const last = new Map();
  function buildStatics(M) {
    const T = M.THREE;
    const box = new T.Box3();
    const flat = (o, id) => {
      o.updateWorldMatrix(true, true);
      box.setFromObject(o);
      const c = box.getCenter(new T.Vector3());
      const s = box.getSize(new T.Vector3());
      return { id, c: [c.x, c.y, c.z], r: 0.425 * 0.5 * (s.x + s.z), ry: 0.425 * s.y };
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
    statics = {
      rocks,
      corals,
      liveConch: flat(M.liveConch, "liveConch"),
      bigConch: flat(M.bigConch, "bigConch"),
      pearl: (() => {
        // the pearl and its valve, without the halo sprite
        const parts = M.pearl.children.filter((o) => o.isMesh);
        const b = new T.Box3();
        M.pearl.updateWorldMatrix(true, true);
        for (const o of parts) b.expandByObject(o);
        const c = b.getCenter(new T.Vector3());
        const s = b.getSize(new T.Vector3());
        return { id: "pearl", c: [c.x, c.y, c.z], r: 0.425 * 0.5 * (s.x + s.z), ry: 0.425 * s.y };
      })(),
      flat,
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
          url: cv.toDataURL("image/jpeg", 0.85),
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
      { a: bp(0, 0.5, 0), b: bp(0, 0.86, 0), r: 0.19, core: true },
      { a: head, b: head, r: 0.13, core: true },
    ];
    for (const L of m.legs) {
      const h = wp(L.hip);
      const k = wp(L.knee);
      const a = wp(L.ankle);
      mila.push({ a: h, b: k, r: 0.035 }, { a: k, b: a, r: 0.035 });
    }
    for (const A of m.arms) {
      const s = wp(A.sh);
      const e = wp(A.el);
      const h = wp(A.hand);
      mila.push({ a: s, b: e, r: 0.025 }, { a: e, b: h, r: 0.022 });
    }
    const mc = bp(0, 0.62, 0);
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
    const ts = M.turtle.scale.x;
    const tp = (x, y, z) => {
      tmp.set(x, y, z).applyMatrix4(M.turtle.matrixWorld);
      return [tmp.x, tmp.y, tmp.z];
    };
    const th = tp(0, 0.07, 0.78);
    const turtle = [
      { c: tp(0, 0.09, 0.05), r: 0.62 * ts, ry: 0.18 * ts },
      { a: th, b: th, r: 0.16 * ts },
    ];
    const tc = turtle[0].c;
    // crab, debris
    const cp = M.crab.g.position;
    const crab = { c: [cp.x, cp.y, cp.z], r: 0.45, ry: 0.15 };
    const debris = M.debris
      .filter((d) => d.mesh.visible && d.mesh.scale.x > 0.75)
      .map((d, i) => statics.flat(d.mesh, `debris${i}`));
    const near = (p, q, d) =>
      Math.abs(p[0] - q[0]) < d && Math.abs(p[1] - q[1]) < d && Math.abs(p[2] - q[2]) < d;
    const test = (cat, pair, A, B) => {
      const h = gap(A, B);
      if (h.g < -TOL) note(cat, pair, h.g, h.at, M);
    };
    const fixed = [
      ["liveConch", [statics.liveConch]],
      ["pearl", [statics.pearl]],
      ["bigConch", [statics.bigConch]],
      ["debris", debris],
      ["rock", statics.rocks],
      ["coral", statics.corals],
    ];
    // Mila against everything
    for (const f of swimmers)
      if (near(f.p, mc, 1.6)) for (const c of mila) test(`mila-${f.kind}`, f.id, c, f);
    for (const c of mila) {
      for (const t of turtle) test("mila-turtle", "turtle", c, t);
      test("mila-crab", "crab", c, crab);
      for (const [name, list] of fixed)
        for (const s of list) if (near(s.c, mc, s.r + 1.6)) test(`mila-${name}`, s.id, c, s);
      if (c.core)
        for (const p of [c.a, c.b]) {
          const g = p[1] - c.r - M.groundH(p[0], p[2]);
          if (g < -TOL) note("mila-ground", "ground", g, p, M);
        }
    }
    // fish against fish, the turtle, the solids and the ground
    for (let i = 0; i < swimmers.length; i++) {
      const f = swimmers[i];
      for (let j = i + 1; j < swimmers.length; j++) {
        const o = swimmers[j];
        if (near(f.p, o.p, 0.45))
          test(f.kind === o.kind ? `${f.kind}-${f.kind}` : "fish-school", `${f.id}+${o.id}`, f, o);
      }
      if (near(f.p, tc, 1.2)) for (const t of turtle) test(`${f.kind}-turtle`, f.id, f, t);
      for (const [name, list] of fixed) {
        if (name === "bigConch" || name === "debris") continue;
        for (const s of list)
          if (near(s.c, f.p, s.r + 0.4)) test(`${f.kind}-${name}`, `${f.id}+${s.id}`, f, s);
      }
      const g = f.p[1] - f.r - M.groundH(f.p[0], f.p[2]);
      if (g < -TOL) note(`${f.kind}-ground`, f.id, g, f.p, M);
    }
    // the turtle and the crab against the solids
    for (const t of turtle) {
      for (const name of ["rock", "coral"])
        for (const s of statics[`${name}s`])
          if (near(s.c, tc, s.r + 1.2)) test(`turtle-${name}`, s.id, t, s);
      const p = t.c ?? t.a;
      const g = p[1] - (t.ry ?? t.r) - M.groundH(p[0], p[2]);
      if (g < -TOL) note("turtle-ground", "turtle", g, p, M);
    }
    for (const d of debris) test("crab-debris", d.id, crab, d);
    for (const s of statics.rocks) if (near(s.c, crab.c, s.r + 1)) test("crab-rock", s.id, crab, s);
    test("crab-bigConch", "bigConch", crab, statics.bigConch);
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
      `(${pageProbe.toString()})(${TOL}, ${JSON.stringify(SOLIDS)}, ${JSON.stringify(wanted)})`,
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
    for (const [cat, t] of Object.entries(total).sort())
      console.log(
        `  ${cat.padEnd(18)} ${String(t.frames).padStart(6)} frames, deepest ${t.max.toFixed(3)} m`,
      );
    await ctx.close();
  }
} finally {
  await browser.close();
}
