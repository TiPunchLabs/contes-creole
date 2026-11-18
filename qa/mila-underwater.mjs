// Mila under water (pages 7-10, the dive 6 -> 7 and the surfacing 10 -> 11): deterministic stills,
// frame sequences, performance, leaks and a full journey, so a baseline and a branch can be compared.
// HEADED=1 launches a visible, GPU-backed Chrome instead of headless: the only valid way to take perf
// numbers (the renderer is checked and an nvidia-smi sample is saved to OUT/nvidia-smi.txt). Run every
// browser under `nice -n 19`. PERF_RUNS (default 3), PERF_PASSES (e.g. capped.desktop,uncapped.desktop,
// default all four), PERF_WARMUP ms (default 3000), DET_RUNS (default 3).
// Extra modes: trans (real-clock duration of the turns 6->7..10->11), low (real-clock stills of pages
// 7-10 under CPU_THROTTLE with the scene's data-quality level), text (fake-clock stills of pages 7-10
// with the DOM rects and colours of the text, desktop also in French), determinism (pairwise MAE of
// DET_RUNS page-7 stills), links (linkProgram calls after page 1 is shown, per page, with the frame
// time of the frame holding each; HEADED=1 UNCAP default), conch (stills around the living conch of
// page 9 at two scales, CONCH_TAG; CONCH_REC=x,y,w,h records a clipped sequence), crab (page 5 and the
// turn to page 6 at two scales), longframes (page 9, uncapped: per-frame
// interval, rAF callback time, heap and long tasks for variants B1-B4; LF_VARIANTS, LF_RUNS, LF_SLOW_MS, LF_WIN; LF_SEQ=B2,B1,B2 explicit order, LF_PROFILE=1 CDP CPU profile, LF_TRACE=1 Chrome trace).
// Modes: shots (fake clock, stills + "scène seule" ), motion (fake clock, frame
// sequences, mp4 and contact sheets via ffmpeg/montage), perf (real clock, uncapped and vsync-capped,
// 3 runs per viewport), leak (LEAK_CYCLES open/close cycles, default 6, desktop and mobile: live GL objects, contexts, JS heap), journey (1 -> 12, back to
// 6, forward to 10, resizes, language switch, console errors). GPU only: aborts on a non-NVIDIA renderer.
// Usage: [SITE=url] [OUT=dir] [ONLY=shots,motion,perf,leak,journey] [VPS=desktop,tablet,mobile]
//        [QA_CHANNEL=chrome] [LABEL=text] [REDUCED=1] [CPU_THROTTLE=4] [QA_INJECT_JS=js]
//        node qa/mila-underwater.mjs
// VPS filters every mode (motion: desktop/mobile only, perf/journey: desktop/mobile, leak: desktop).
// CPU_THROTTLE (CDP rate) applies to perf and, when set, to shots. QA_INJECT_JS runs once in the page
// during journey (negative control: `QA_INJECT_JS='throw new Error("x")' ONLY=journey`).
// Outputs in OUT: <vp>-pNN.png, <vp>-pNN-scene.png, <vp>-pNN-seq/, <vp>-tA-B/, *.mp4, sheets,
// determinism.json, perf.json, leak.json, journey.json, conditions.json, manifest.tsv.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";

const expand = (p) => (p.startsWith("~/") ? join(homedir(), p.slice(2)) : p);
const SITE = process.env.SITE ?? "http://localhost:4199/";
const OUT = expand(
  process.env.OUT ?? new URL("./out/mila-underwater/", import.meta.url).pathname,
).replace(/\/?$/, "/");
const MODES = (process.env.ONLY ?? "shots,motion,perf,leak,journey").split(",");
const LABEL = process.env.LABEL ?? "";
const REDUCED = process.env.REDUCED === "1";
const THROTTLE = process.env.CPU_THROTTLE ? Number(process.env.CPU_THROTTLE) : 0;
const INJECT_JS = process.env.QA_INJECT_JS ?? "";
mkdirSync(OUT, { recursive: true });

const GPU = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"];
const UNCAPPED = ["--disable-gpu-vsync", "--disable-frame-rate-limit"];
const EGL_VENDOR = process.env.QA_EGL_VENDOR ?? "/usr/share/glvnd/egl_vendor.d/10_nvidia.json";
const GPU_ENV = { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: EGL_VENDOR };
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
const VPS = (process.env.VPS ?? "desktop,tablet,mobile").split(",").filter((v) => VIEWPORTS[v]);
const vpsFor = (allowed) => VPS.filter((v) => allowed.includes(v));
const FAKE_TIME = new Date("2026-11-17T12:00:00Z");
/** Fake-clock length (ms) of the turn from page N, a little above the measured arrival (50 ms steps). */
const TURN_MS = {
  1: 4450,
  2: 4450,
  3: 8750,
  4: 7700,
  5: 7200,
  6: 7700,
  7: 5500,
  8: 5500,
  9: 5900,
  10: 7700,
};

const conditions = {
  date: new Date().toISOString(),
  site: SITE,
  label: LABEL,
  renderer: null,
  browser: null,
  channel: process.env.QA_CHANNEL || "playwright-chromium",
  launchArgs: { capped: GPU, uncapped: [...GPU, ...UNCAPPED] },
  env: { __EGL_VENDOR_LIBRARY_FILENAMES: EGL_VENDOR },
  viewports: VIEWPORTS,
  reducedMotion: REDUCED,
  cpuThrottle: THROTTLE,
  modes: {},
  failures: [],
};
const MODE_CONDITIONS = {
  shots: { fakeClock: true, cache: "fresh context per run (empty)" },
  motion: { fakeClock: true, cache: "fresh context per viewport (empty)" },
  perf: {
    fakeClock: false,
    cache: "per run: cold = fresh context with empty cache, then warm = reload in the same context",
  },
  leak: { fakeClock: false, cache: "one context, warm after the first open" },
  journey: { fakeClock: false, cache: "fresh context per viewport (empty)" },
  trans: { fakeClock: false, cache: "fresh context per run (empty)" },
  low: { fakeClock: false, cache: "fresh context per viewport (empty)" },
  text: { fakeClock: true, cache: "fresh context per run (empty)" },
  determinism: { fakeClock: true, cache: "fresh context per run (empty)" },
  links: { fakeClock: false, cache: "fresh context (empty)" },
};

/** Screenshot on a paused fake clock, after a real pause so the compositor has presented the last frame. */
async function snap(p, path) {
  await p.waitForTimeout(150);
  await p.screenshot({ path });
}

const pad = (n) => String(n).padStart(2, "0");
const press = (loc, touch) => (touch ? loc.tap() : loc.click());
const writeJSON = (name, data) => writeFileSync(OUT + name, JSON.stringify(data, null, 2));

/** Launches the GPU browser (system Chrome when the default one cannot start) and refuses a CPU renderer. */
async function launch(extra = []) {
  const opts = { args: [...GPU, ...extra], env: GPU_ENV, headless: process.env.HEADED !== "1" };
  let channel = process.env.QA_CHANNEL || undefined;
  let browser;
  try {
    browser = await chromium.launch({ ...opts, channel });
  } catch (err) {
    if (channel) throw err;
    console.warn(`default Chromium failed (${String(err).split("\n")[0]}); using channel chrome`);
    channel = "chrome";
    browser = await chromium.launch({ ...opts, channel });
  }
  conditions.channel = channel ?? "playwright-chromium";
  conditions.headed = process.env.HEADED === "1";
  conditions.browser = `${browser.browserType().name()} ${browser.version()}`;
  const probe = await browser.newPage();
  const renderer = await probe.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "none";
  });
  await probe.close();
  conditions.renderer = renderer;
  console.log(`renderer ${renderer} | ${conditions.browser} | channel ${conditions.channel}`);
  if (!/NVIDIA/i.test(renderer)) {
    await browser.close();
    throw new Error(`renderer "${renderer}" is not NVIDIA, refusing to run on the CPU`);
  }
  return browser;
}

/** Instruments the Mila canvas only: draw calls/triangles per frame, live GL objects, contexts. */
const INSTRUMENT = () => {
  const KINDS = {
    textures: ["createTexture", "deleteTexture"],
    buffers: ["createBuffer", "deleteBuffer"],
    vertexArrays: ["createVertexArray", "deleteVertexArray"],
    programs: ["createProgram", "deleteProgram"],
    framebuffers: ["createFramebuffer", "deleteFramebuffer"],
    renderbuffers: ["createRenderbuffer", "deleteRenderbuffer"],
  };
  const entries = [];
  const byGl = new WeakMap();
  const track = (gl) => {
    if (byGl.has(gl)) return;
    const e = { ref: new WeakRef(gl), counts: {}, seen: {} };
    for (const k of Object.keys(KINDS)) {
      e.counts[k] = 0;
      e.seen[k] = new WeakSet();
    }
    byGl.set(gl, e);
    entries.push(e);
  };
  const frame = { calls: 0, tris: 0 };
  let rec = null;
  window.__gl = {
    start: () => {
      rec = [];
    },
    stop: () => {
      const r = rec ?? [];
      rec = null;
      return r;
    },
    report: () => {
      const contexts = entries.map((e) => {
        const gl = e.ref.deref();
        return { collected: !gl, lost: gl ? gl.isContextLost() : null, counts: { ...e.counts } };
      });
      const live = {};
      for (const k of Object.keys(KINDS)) live[k] = 0;
      for (const c of contexts)
        if (!c.collected && !c.lost) for (const k of Object.keys(KINDS)) live[k] += c.counts[k];
      return {
        created: entries.length,
        lost: contexts.filter((c) => c.lost).length,
        collected: contexts.filter((c) => c.collected).length,
        live,
        contexts,
      };
    },
    canvas: () => {
      const c = document.querySelector(".mila-gl");
      return c
        ? {
            width: c.width,
            height: c.height,
            cssWidth: c.clientWidth,
            cssHeight: c.clientHeight,
            dpr: window.devicePixelRatio,
            effectivePixelRatio: c.clientWidth ? c.width / c.clientWidth : null,
          }
        : null;
    },
  };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = getContext.call(this, type, ...rest);
    if (ctx && /webgl/.test(type) && this.classList.contains("mila-gl")) track(ctx);
    return ctx;
  };
  const P = WebGL2RenderingContext.prototype;
  for (const [k, [create, del]] of Object.entries(KINDS)) {
    const oc = P[create];
    const od = P[del];
    P[create] = function (...args) {
      const r = oc.apply(this, args);
      const e = byGl.get(this);
      if (e && r) {
        e.counts[k]++;
        e.seen[k].add(r);
      }
      return r;
    };
    P[del] = function (...args) {
      const e = byGl.get(this);
      if (e && args[0] && e.seen[k].has(args[0])) {
        e.counts[k]--;
        e.seen[k].delete(args[0]);
      }
      return od.apply(this, args);
    };
  }
  const tri = (mode, count, inst = 1) =>
    mode === 4 ? (count / 3) * inst : mode === 5 || mode === 6 ? Math.max(0, count - 2) * inst : 0;
  for (const [name, at] of [
    ["drawArrays", (a) => tri(a[0], a[2])],
    ["drawElements", (a) => tri(a[0], a[1])],
    ["drawArraysInstanced", (a) => tri(a[0], a[2], a[3])],
    ["drawElementsInstanced", (a) => tri(a[0], a[1], a[4])],
  ]) {
    const original = P[name];
    P[name] = function (...args) {
      if (byGl.has(this)) {
        frame.calls++;
        frame.tris += at(args);
      }
      return original.apply(this, args);
    };
  }
  const raf = window.requestAnimationFrame.bind(window);
  const tick = (t) => {
    if (rec) rec.push([t, frame.calls, frame.tris]);
    frame.calls = 0;
    frame.tris = 0;
    raf(tick);
  };
  raf(tick);
};

/** Median of a numeric list. */
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const round = (x, d = 2) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : x);

/** Frame statistics over recorded segments ([t, calls, tris] per frame); deltas never span two segments. */
function frameStats(segments) {
  const deltas = [];
  let calls = 0;
  let tris = 0;
  let n = 0;
  let duration = 0;
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i++) {
      deltas.push(seg[i][0] - seg[i - 1][0]);
      calls += seg[i][1];
      tris += seg[i][2];
      n++;
    }
    if (seg.length > 1) duration += seg[seg.length - 1][0] - seg[0][0];
  }
  if (!n) return { frames: 0 };
  const mean = deltas.reduce((s, x) => s + x, 0) / n;
  return {
    frames: n,
    seconds: round(duration / 1000, 1),
    medianFps: round(1000 / median(deltas)),
    meanFps: round(1000 / mean),
    p95Ms: round(quantile(deltas, 0.95)),
    p99Ms: round(quantile(deltas, 0.99)),
    maxMs: round(Math.max(...deltas)),
    over33ms: deltas.filter((d) => d > 33.3).length,
    over50ms: deltas.filter((d) => d > 50).length,
    drawCalls: round(calls / n, 1),
    triangles: round(tris / n, 0),
  };
}

/** Median of each numeric field across runs (recursive on plain objects). */
function medianOf(runs) {
  const first = runs[0];
  if (typeof first === "number") return round(median(runs));
  if (first && typeof first === "object" && !Array.isArray(first)) {
    const out = {};
    for (const k of Object.keys(first)) {
      const vals = runs.map((r) => r?.[k]).filter((v) => v !== undefined && v !== null);
      out[k] = vals.length ? medianOf(vals) : null;
    }
    return out;
  }
  return first;
}

/** Page driver: waiting goes through the fake clock when `fake`, else real time. */
function driver(p, touch, fake) {
  const wait = (ms) => (fake ? p.clock.runFor(ms) : p.waitForTimeout(ms));
  const num = () => p.locator(".mila-num").textContent();
  const pageNo = async () => Number((await num()).replace(/\D/g, ""));
  const arrived = (b) =>
    p.evaluate(
      (b) =>
        document.querySelector(".mila-story")?.classList.contains("is-on") &&
        document.querySelector(".mila-num")?.textContent !== b,
      b,
    );
  /** Waits for the page number to change with the text shown; `onStep` sees each fake-clock step. */
  async function waitArrived(before, onStep) {
    if (!fake) {
      await p.waitForFunction(
        (b) =>
          document.querySelector(".mila-story")?.classList.contains("is-on") &&
          document.querySelector(".mila-num")?.textContent !== b,
        before,
        { timeout: 30000, polling: 50 },
      );
      return;
    }
    for (let i = 0; i < 800; i++) {
      if (await arrived(before)) return;
      await p.clock.runFor(onStep?.step ?? 50);
      if (onStep?.fn) await onStep.fn(i);
    }
    throw new Error(`page did not change from ${before}`);
  }
  /** Presses a nav button and waits for the arrival (page 5 first clears debris, then walks). */
  async function turn(btn, onStep) {
    const before = await num();
    const from = Number(before.replace(/\D/g, ""));
    await press(p.locator(btn), touch);
    // fake clock without per-step capture: run the transition's known length in one go (its arrival
    // moment measured on the baseline), so the frame never depends on where a polling step fell
    if (fake && !onStep && btn === ".mila-next" && TURN_MS[from])
      await p.clock.runFor(TURN_MS[from]);
    await waitArrived(before, onStep);
  }
  const next = (onStep) => turn(".mila-next", onStep);
  const prev = (onStep) => turn(".mila-prev", onStep);
  /** Selects Mila's shelf card then opens it; returns ms from the last press to page 1 (real clock). */
  async function open() {
    const shelf = p.locator(".tree-shelf-book").nth(1);
    if (!(await shelf.evaluate((b) => b.classList.contains("is-near")))) {
      await press(shelf, touch);
      await wait(2800);
    }
    const t0 = Date.now();
    await press(shelf, touch);
    if (fake) {
      await p.clock.runFor(2000);
      for (let i = 0; i < 800; i++) {
        const ok = await p.evaluate(
          () =>
            document.querySelector(".mila-story")?.classList.contains("is-on") &&
            document.querySelector(".mila-num")?.textContent === "Page 01",
        );
        if (ok) break;
        await p.clock.runFor(50);
      }
    } else
      await p.waitForFunction(
        () =>
          document.querySelector(".mila-story")?.classList.contains("is-on") &&
          document.querySelector(".mila-num")?.textContent === "Page 01",
        null,
        { timeout: 30000, polling: 50 },
      );
    return Date.now() - t0;
  }
  const goTo = async (n, onArrive) => {
    while ((await pageNo()) < n) {
      await next();
      if (onArrive) await onArrive(await pageNo());
    }
  };
  return { wait, num, pageNo, next, prev, open, goTo, waitArrived };
}

/** Opens a context+page; with `fake`, the clock is installed before load and paused once loaded. */
async function newPage(browser, vp, { fake = false, instrument = false, throttle = 0, log } = {}) {
  const ctx = await browser.newContext({
    ...VIEWPORTS[vp],
    ...(REDUCED ? { reducedMotion: "reduce" } : {}),
  });
  const p = await ctx.newPage();
  if (log) {
    p.on("pageerror", (e) => log({ type: "pageerror", text: e.message }));
    p.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning")
        log({ type: m.type(), text: m.text(), url: m.location()?.url });
    });
    p.on("requestfailed", (r) => log({ type: "requestfailed", text: r.url() }));
  }
  if (throttle) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  }
  if (instrument) await p.addInitScript(INSTRUMENT);
  if (fake) await p.clock.install({ time: FAKE_TIME });
  return { ctx, p };
}

/** Loads the site, and on a fake clock freezes time just after the loader so only runFor advances it. */
let siteOverride = null;
async function load(p, fake) {
  if (fake) {
    // paused before the first byte: only runFor moves time, so the load duration cannot leak in
    await p.clock.pauseAt(new Date(FAKE_TIME.getTime() + 1000));
    await p.goto(siteOverride ?? SITE);
    for (let i = 0; i < 600 && !(await p.locator(".loader.is-done").count()); i++) {
      await p.clock.runFor(100);
      await p.waitForTimeout(20);
    }
    // jump to a fixed absolute time, then align performance.now() (the scene's phase) to 65 s
    await p.clock.pauseAt(new Date(FAKE_TIME.getTime() + 60000));
    const now = await p.evaluate(() => performance.now());
    await p.clock.runFor(Math.max(0, 65000 - now));
    return;
  }
  await p.goto(siteOverride ?? SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
  await p.waitForTimeout(1500);
}

const SCENE_ONLY_CSS =
  ".mila > *:not(.mila-gl){visibility:hidden!important}.reading,.reading *{visibility:hidden!important}";

/** Deterministic stills: pages 6-11, 6 s after arrival, plus the scene alone on 7-10. */
async function shots() {
  /** Walks one viewport to page 11; `each(page)` runs 6 s after the arrival on pages 6-11. */
  async function walk(browser, vp, each) {
    const { ctx, p } = await newPage(browser, vp, { fake: true, throttle: THROTTLE });
    const d = driver(p, vp === "mobile", true);
    await load(p, true);
    await d.open();
    await d.wait(2000);
    await d.goTo(11, async (n) => {
      if (n >= 6) {
        await d.wait(6000);
        await each(p, d, n);
      }
    });
    await ctx.close();
  }
  const browser = await launch();
  try {
    for (const vp of vpsFor(["desktop", "tablet", "mobile"])) {
      await walk(browser, vp, async (p, d, n) => {
        await snap(p, `${OUT}${vp}-p${pad(n)}.png`);
        if (n >= 7 && n <= 10) {
          const style = await p.addStyleTag({ content: SCENE_ONLY_CSS });
          await snap(p, `${OUT}${vp}-p${pad(n)}-scene.png`);
          await style.evaluate((e) => e.remove());
        }
        console.log("shot", vp, n);
      });
    }
  } finally {
    await browser.close();
  }
}

/** Determinism: DET_RUNS (default 3) fresh fake-clock contexts to page 7, MAE of every pair of stills. */
async function determinism() {
  const n = Number(process.env.DET_RUNS ?? 3);
  const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
  const browser = await launch();
  try {
    mkdirSync(`${OUT}determinism/`, { recursive: true });
    const files = [];
    for (let i = 0; i < n; i++) {
      const f = `${OUT}determinism/desktop-p07-${"abcdefgh"[i]}.png`;
      const { ctx, p } = await newPage(browser, "desktop", { fake: true });
      const d = driver(p, false, true);
      await load(p, true);
      await d.open();
      await d.wait(2000);
      await d.goTo(7);
      await d.wait(6000);
      await snap(p, f);
      await ctx.close();
      files.push(f);
    }
    const pairs = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        let mae;
        try {
          execFileSync("compare", ["-metric", "MAE", files[i], files[j], "null:"], {
            stdio: ["ignore", "ignore", "pipe"],
          });
          mae = "0 (0)";
        } catch (err) {
          mae = err.stderr?.toString().trim() ?? String(err);
        }
        pairs.push({
          pair: `${"abcdefgh"[i]}-${"abcdefgh"[j]}`,
          identical: sha(files[i]) === sha(files[j]),
          mae,
        });
      }
    writeJSON("determinism.json", { files, pairs, sha: files.map(sha) });
    console.log("determinism", JSON.stringify(pairs));
  } finally {
    await browser.close();
  }
}

/** Frame-interval study on page 9 (uncapped): per-frame interval, rAF callback time, JS heap, long tasks. */
async function longframes() {
  const variants = (process.env.LF_VARIANTS ?? "B1,B2,B3,B4").split(",");
  const runs = Number(process.env.LF_RUNS ?? 3);
  const sites = {
    old: process.env.LF_SITE_OLD ?? "http://localhost:4198/",
    new: process.env.LF_SITE_NEW ?? "http://localhost:4197/",
  };
  const slowMs = Number(process.env.LF_SLOW_MS ?? 0.4);
  const smallWin = (process.env.LF_WIN ?? "960x600").split("x").map(Number);
  const spec = {
    B1: { site: "old" },
    B2: { site: "new" },
    B3: { site: "new", slow: slowMs },
    B4: { site: "old", win: smallWin },
    B5: { site: "new", win: smallWin },
  };
  const out = {
    label: LABEL,
    date: new Date().toISOString(),
    headed: process.env.HEADED === "1",
    slowMs,
    smallWin,
    variants: {},
  };
  const seq = process.env.LF_SEQ
    ? process.env.LF_SEQ.split(",").map((v, i) => [v, i])
    : Array.from({ length: runs }, (_, r) => variants.map((v) => [v, r])).flat();
  const PROF = process.env.LF_PROFILE === "1";
  const TRACE = process.env.LF_TRACE === "1";
  for (const [v, r] of seq) {
    const sp = spec[v];
    siteOverride = sites[sp.site];
    const browser = await launch([...UNCAPPED, "--enable-precise-memory-info"]);
    try {
      const ctx = await browser.newContext({
        ...VIEWPORTS.desktop,
        ...(sp.win ? { viewport: { width: sp.win[0], height: sp.win[1] } } : {}),
      });
      const p = await ctx.newPage();
      await p.addInitScript(INSTRUMENT);
      await p.addInitScript((slow) => {
        const raf = window.requestAnimationFrame.bind(window);
        const fr = { t: [], cb: [], heap: [], idx: new Map() };
        const tasks = [];
        window.__lf = { fr, tasks, mark: 0 };
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) tasks.push([e.startTime, e.duration]);
          }).observe({ type: "longtask", buffered: true });
        } catch {
          /* longtask unsupported */
        }
        window.requestAnimationFrame = (cb) =>
          raf((t) => {
            if (slow) {
              const end = performance.now() + slow;
              while (performance.now() < end);
            }
            const s0 = performance.now();
            let i = fr.idx.get(t);
            if (i === undefined) {
              i = fr.t.length;
              fr.idx.set(t, i);
              if (fr.idx.size > 64) fr.idx.delete(fr.idx.keys().next().value);
              fr.t.push(t);
              fr.cb.push(0);
              fr.heap.push(performance.memory ? performance.memory.usedJSHeapSize : -1);
            }
            try {
              return cb(t);
            } finally {
              fr.cb[i] += performance.now() - s0;
            }
          });
      }, sp.slow ?? 0);
      const d = driver(p, false, false);
      await load(p, false);
      await d.open();
      await d.goTo(9);
      await d.wait(3000);
      await p.evaluate(() => {
        window.__lf.mark = window.__lf.fr.t.length;
        window.__gl.start();
      });
      let cdp = null;
      let pageStart = null;
      let clockPairs = null;
      if (PROF || TRACE) cdp = await ctx.newCDPSession(p);
      if (PROF) {
        await cdp.send("Profiler.enable");
        await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
        await cdp.send("Profiler.start");
        await cdp.send("Performance.enable");
        pageStart = await p.evaluate(() => performance.now());
        clockPairs = [];
        for (let k = 0; k < 7; k++) {
          const a = await p.evaluate(() => performance.now());
          const m = await cdp.send("Performance.getMetrics");
          const b = await p.evaluate(() => performance.now());
          clockPairs.push({ a, b, ts: m.metrics.find((x) => x.name === "Timestamp")?.value });
        }
      }
      if (TRACE) {
        await cdp.send("Tracing.start", {
          transferMode: "ReturnAsStream",
          categories: "gpu,toplevel,blink.user_timing,v8,disabled-by-default-gpu.service",
        });
        pageStart = await p.evaluate(() => performance.now());
      }
      if (process.env.HEADED === "1" && r === 0) nvidiaSample(`longframes ${v}`);
      await d.wait(20000);
      const tag = `${v}-r${r + 1}`;
      if (PROF) {
        const { profile } = await cdp.send("Profiler.stop");
        writeFileSync(
          `${OUT}profile-${tag}.cpuprofile`,
          JSON.stringify({ pageStart, clockPairs, profile }),
        );
      }
      if (TRACE) {
        const done = new Promise((res) => cdp.once("Tracing.tracingComplete", res));
        await cdp.send("Tracing.end");
        const { stream } = await done;
        let text = "";
        for (;;) {
          const chunk = await cdp.send("IO.read", { handle: stream });
          text += chunk.data;
          if (chunk.eof) break;
        }
        writeFileSync(`${OUT}trace-${tag}.json`, text);
        writeFileSync(`${OUT}trace-${tag}.meta.json`, JSON.stringify({ pageStart }));
      }
      const data = await p.evaluate(() => {
        const seg = window.__gl.stop();
        const { fr, tasks, mark } = window.__lf;
        return {
          t: fr.t.slice(mark),
          cb: fr.cb.slice(mark),
          heap: fr.heap.slice(mark),
          tasks,
          seg,
          vw: innerWidth,
          vh: innerHeight,
        };
      });
      const iv = [];
      for (let i = 1; i < data.t.length; i++) iv.push(data.t[i] - data.t[i - 1]);
      const stats = frameStats([data.seg]);
      const longs = [];
      iv.forEach((x, k) => {
        if (x <= 33.3) return;
        const i = k + 1;
        const t0 = data.t[i - 1];
        const t1 = data.t[i];
        longs.push({
          t0: round(t0, 3),
          t1: round(t1, 3),
          intervalMs: round(x),
          multiplesOf16_7: Math.round(x / 16.7),
          cbMs: round(data.cb[i]),
          cbPrevMs: round(data.cb[i - 1]),
          heapDropBytes: data.heap[i - 1] > 0 ? data.heap[i - 1] - data.heap[i] : null,
          longTask: data.tasks.some(([s, du]) => s < t1 && s + du > t0),
        });
      });
      const flag = (l) => ({
        cb: l.cbMs > 10 || l.cbPrevMs > 10,
        heap: (l.heapDropBytes ?? 0) > 65536,
        task: l.longTask,
      });
      const breakdown = {
        total: longs.length,
        longCallback: 0,
        heapDrop: 0,
        longTask: 0,
        none: 0,
      };
      for (const l of longs) {
        const f = flag(l);
        if (f.cb) breakdown.longCallback++;
        if (f.heap) breakdown.heapDrop++;
        if (f.task) breakdown.longTask++;
        if (!f.cb && !f.heap && !f.task) breakdown.none++;
      }
      const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
      const rec = {
        viewport: [data.vw, data.vh],
        frames: iv.length,
        meanFps: round(1000 / mean),
        medianFps: round(1000 / median(iv)),
        p95Ms: round(quantile(iv, 0.95)),
        p99Ms: round(quantile(iv, 0.99)),
        maxMs: round(Math.max(...iv)),
        over33: iv.filter((x) => x > 33.3).length,
        over50: iv.filter((x) => x > 50).length,
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        meanCbMs: round(data.cb.reduce((a, b) => a + b, 0) / data.cb.length, 3),
        breakdown,
        multiples: longs.reduce(
          (m, l) => ((m[l.multiplesOf16_7] = (m[l.multiplesOf16_7] ?? 0) + 1), m),
          {},
        ),
        longTasksTotal: data.tasks.length,
        longs,
      };
      (out.variants[v] ??= []).push(rec);
      console.log(
        "longframes",
        v,
        `run ${r + 1}`,
        rec.viewport.join("x"),
        "mean",
        rec.meanFps,
        "over33",
        rec.over33,
        JSON.stringify(breakdown),
      );
      writeJSON("longframes.json", out);
      await ctx.close();
    } finally {
      await browser.close();
    }
  }
  siteOverride = null;
}

/** The living conch of page 9: stills around pages 8 to 10 at a normal and a doubled scale (CONCH_DSF), plus a clipped recording. */
async function conch() {
  const tag = process.env.CONCH_TAG ?? "build";
  const rec = process.env.CONCH_REC ? process.env.CONCH_REC.split(",").map(Number) : null;
  const browser = await launch();
  try {
    for (const vp of vpsFor(["desktop", "mobile"])) {
      const base = VIEWPORTS[vp];
      const scales = rec
        ? [base.deviceScaleFactor * 2]
        : [base.deviceScaleFactor, base.deviceScaleFactor * 2];
      for (const dsf of scales) {
        const ctx = await browser.newContext({ ...base, deviceScaleFactor: dsf });
        const p = await ctx.newPage();
        await p.clock.install({ time: FAKE_TIME });
        const d = driver(p, vp === "mobile", true);
        await load(p, true);
        await d.open();
        await d.wait(2000);
        const name = (k) => `${OUT}${tag}-${vp}-x${dsf}-${k}.png`;
        await d.goTo(8);
        await d.wait(6000);
        if (!rec) await snap(p, name("p08"));
        await press(p.locator(".mila-next"), vp === "mobile");
        if (rec) {
          await p.clock.runFor(3400);
          for (let i = 0; i < 62; i++) {
            await p.waitForTimeout(150);
            await p.screenshot({
              path: `${OUT}${tag}-${vp}-x${dsf}-rec-${pad3(i)}.png`,
              clip: { x: rec[0], y: rec[1], width: rec[2], height: rec[3] },
            });
            await p.clock.runFor(100);
          }
        } else {
          await p.clock.runFor(4000);
          for (const k of ["a1", "a2", "a3"]) {
            await snap(p, name(k));
            if (k !== "a3") await p.clock.runFor(500);
          }
          for (let i = 0; i < 400 && !(await d.pageNo().then((n) => n === 9)); i++)
            await p.clock.runFor(50);
          await snap(p, name("b-arrive"));
          await p.clock.runFor(6000);
          await snap(p, name("c-p09-6s"));
          await press(p.locator(".mila-next"), vp === "mobile");
          await p.clock.runFor(900);
          await snap(p, name("d1-leave-0.9s"));
          await p.clock.runFor(900);
          await snap(p, name("d2-leave-1.8s"));
          for (let i = 0; i < 400 && !(await d.pageNo().then((n) => n === 10)); i++)
            await p.clock.runFor(50);
          await p.clock.runFor(6000);
          await snap(p, name("e-p10"));
        }
        console.log("conch", tag, vp, dsf);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
}

/** The crab of page 5: stills on the settled page and during the turn to page 6 (debris cleared first), at a normal and a doubled scale. */
async function crab() {
  const tag = process.env.CONCH_TAG ?? "build";
  const browser = await launch();
  try {
    for (const vp of vpsFor(["desktop", "mobile"])) {
      const base = VIEWPORTS[vp];
      for (const dsf of [base.deviceScaleFactor, base.deviceScaleFactor * 2]) {
        const ctx = await browser.newContext({ ...base, deviceScaleFactor: dsf });
        const p = await ctx.newPage();
        await p.clock.install({ time: FAKE_TIME });
        const d = driver(p, vp === "mobile", true);
        await load(p, true);
        await d.open();
        await d.wait(2000);
        const name = (k) => `${OUT}${tag}-${vp}-x${dsf}-crab-${k}.png`;
        await d.goTo(5);
        await d.wait(6000);
        await snap(p, name("p05"));
        await press(p.locator(".mila-next"), vp === "mobile");
        let t = 0;
        for (const [k, at] of [
          ["t1", 1000],
          ["t2", 2500],
          ["t3", 4000],
          ["t4", 6000],
        ]) {
          await p.clock.runFor(at - t);
          t = at;
          await snap(p, name(k));
        }
        console.log("crab", tag, vp, dsf);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
}

/** Runs an ffmpeg encode of numbered PNGs at `fps`, scaled to even dimensions. */
function encode(dir, fps, out) {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(fps),
      "-i",
      `${dir}/%03d.png`,
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-pix_fmt",
      "yuv420p",
      out,
    ],
    { stdio: "inherit" },
  );
}

/** Builds the two mp4 (real speed, x0.25) and the contact sheet (every 4th frame) of a sequence. */
function finishSequence(dir, name, realFps) {
  encode(dir, realFps, `${OUT}${name}.mp4`);
  encode(dir, realFps / 4, `${OUT}${name}-x025.mp4`);
  const frames = readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .filter((_, i) => i % 4 === 0)
    .map((f) => join(dir, f));
  try {
    execFileSync("montage", [
      ...frames,
      "-tile",
      "6x",
      "-geometry",
      "+3+3",
      "-resize",
      "320x",
      "-label",
      "%f",
      `${OUT}${name}-sheet.png`,
    ]);
  } catch (err) {
    console.warn(`montage failed for ${name}: ${String(err).split("\n")[0]}`);
  }
}

/** Frame sequences of pages 7-10 (48 frames at 1/12 s) and of the five transitions (every 200 ms). */
async function motion() {
  const browser = await launch();
  try {
    for (const vp of vpsFor(["desktop", "mobile"])) {
      const { ctx, p } = await newPage(browser, vp, { fake: true });
      const d = driver(p, vp === "mobile", true);
      await load(p, true);
      await d.open();
      await d.wait(2000);
      await d.goTo(6);
      await d.wait(4000);
      for (let from = 6; from <= 10; from++) {
        const to = from + 1;
        if (!MOTION_FROMS.includes(from)) {
          await d.next();
          await d.wait(6000);
          continue;
        }
        const dir = `${OUT}${vp}-t${pad(from)}-${pad(to)}`;
        mkdirSync(dir, { recursive: true });
        let k = 0;
        const shoot = () => snap(p, `${dir}/${pad3(k++)}.png`);
        await shoot();
        await d.next({
          step: 200,
          fn: async () => {
            await shoot();
          },
        });
        for (let i = 0; i < 5; i++) {
          await p.clock.runFor(200);
          await shoot();
        }
        finishSequence(dir, `${vp}-t${pad(from)}-${pad(to)}`, 5);
        console.log("transition", vp, from, to, `${k} frames`);
        if (to >= 7 && to <= 10 && process.env.MOTION_SEQ !== "0") {
          await d.wait(5000);
          const sdir = `${OUT}${vp}-p${pad(to)}-seq`;
          mkdirSync(sdir, { recursive: true });
          for (let i = 0; i < 48; i++) {
            await snap(p, `${sdir}/${pad3(i)}.png`);
            await p.clock.runFor(83);
          }
          finishSequence(sdir, `${vp}-p${pad(to)}-seq`, 12);
          console.log("sequence", vp, to);
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}
/** Pages a motion run captures the turn from (MOTION_FROMS, default 6,7,8,9,10; MOTION_SEQ=0 skips the page loops). */
const MOTION_FROMS = (process.env.MOTION_FROMS ?? "6,7,8,9,10").split(",").map(Number);
const pad3 = (n) => String(n).padStart(3, "0");

/** Cold and warm load times: goto to the loader, the last press to page 1, and goto to page 1. */
async function timedLoad(p, d, reload) {
  const t0 = Date.now();
  if (reload) await p.reload();
  else await p.goto(SITE);
  await p.waitForSelector(".loader.is-done", { state: "attached", timeout: 30000 });
  const loaderMs = Date.now() - t0;
  await p.waitForTimeout(1500);
  const openMs = await d.open();
  return {
    gotoToLoaderDoneMs: loaderMs,
    openPressToPage1Ms: openMs,
    gotoToPage1Ms: Date.now() - t0,
    note: "gotoToPage1Ms includes the fixed waits of the opening flow (1.5 s + 2.8 s card select)",
  };
}

/** The scene's adaptive quality level ("2" high, "1", "0" low) on the Mila canvas, null when absent. */
const quality = (p) =>
  p.evaluate(() => document.querySelector(".mila-gl")?.dataset.quality ?? null);

/** One perf run on one fresh context: cold + warm load, page 7, transitions, page 9. */
async function perfRun(browser, vp) {
  const touch = vp === "mobile";
  const { ctx, p } = await newPage(browser, vp, { instrument: true, throttle: THROTTLE });
  const d = driver(p, touch, false);
  const run = {};
  const rec = (f) => p.evaluate(f);
  const warm = Number(process.env.PERF_WARMUP ?? 3000);
  const t0 = Date.now();
  try {
    run.coldLoad = await timedLoad(p, d, false);
    run.warmLoad = await timedLoad(p, d, true);
    await d.goTo(6);
    await d.wait(2000);
    const segments = [];
    const underwater = [];
    const turn = async (fn, isUnderwater) => {
      await rec(() => window.__gl.start());
      await fn();
      const seg = await rec(() => window.__gl.stop());
      segments.push(seg);
      if (isUnderwater) underwater.push(seg);
      return seg;
    };
    run.transition6to7 = frameStats([await turn(() => d.next(), false)]);
    const stay = async (n) => {
      await d.wait(warm);
      await rec(() => window.__gl.start());
      await d.wait(20000);
      const seg = await rec(() => window.__gl.stop());
      return {
        ...frameStats([seg]),
        liveGl: (await rec(() => window.__gl.report())).live,
        contexts: (await rec(() => window.__gl.report())).created,
        quality: await quality(p),
        page: n,
      };
    };
    run.page7 = await stay(7);
    run.canvas = await rec(() => window.__gl.canvas());
    if (process.env.HEADED === "1") nvidiaSample(`page 7, ${vp}, ${process.env.LABEL ?? ""}`);
    await turn(() => d.next(), true);
    await turn(() => d.next(), true);
    run.page9 = await stay(9);
    await turn(() => d.next(), true);
    await turn(() => d.next(), false);
    run.transitionsAll = frameStats(segments);
    run.transitionsUnderwater = frameStats(underwater);
    run.wallSeconds = Math.round((Date.now() - t0) / 1000);
  } finally {
    await ctx.close();
  }
  return run;
}

/** Appends an nvidia-smi process list (compute apps and the full listing) taken while the page renders. */
function nvidiaSample(note) {
  const text = [`## ${note} ${new Date().toISOString()}`];
  for (const args of [["--query-compute-apps=pid,name,used_memory", "--format=csv"], []]) {
    try {
      text.push(`$ nvidia-smi ${args.join(" ")}`, execFileSync("nvidia-smi", args).toString());
    } catch (err) {
      text.push(`nvidia-smi failed: ${String(err).split("\n")[0]}`);
    }
  }
  appendFileSync(`${OUT}nvidia-smi.txt`, text.join("\n") + "\n");
}

/** Perf passes (PERF_PASSES, default every pass.viewport), PERF_RUNS runs each, each run and the median. */
async function perf() {
  const out = {
    label: LABEL,
    date: new Date().toISOString(),
    headed: process.env.HEADED === "1",
    renderer: null,
    browser: null,
    cpuThrottle: THROTTLE,
    passes: {},
  };
  const runsPer = Number(process.env.PERF_RUNS ?? 3);
  const wanted = (
    process.env.PERF_PASSES ?? "uncapped.desktop,uncapped.mobile,capped.desktop,capped.mobile"
  ).split(",");
  for (const [pass, extra] of [
    ["uncapped", UNCAPPED],
    ["capped", []],
  ]) {
    const vps = vpsFor(["desktop", "mobile"]).filter((vp) => wanted.includes(`${pass}.${vp}`));
    if (!vps.length) continue;
    const browser = await launch(extra);
    out.renderer = conditions.renderer;
    out.browser = conditions.browser;
    try {
      for (const vp of vps) {
        const runs = [];
        for (let i = 0; i < runsPer; i++) {
          console.log(`perf ${pass} ${vp} run ${i + 1}`);
          runs.push(await perfRun(browser, vp));
          writeJSON("perf.json", out);
        }
        const { viewport, deviceScaleFactor } = VIEWPORTS[vp];
        out.passes[`${pass}.${vp}`] = {
          launchFlags: [...GPU, ...extra],
          viewport,
          deviceScaleFactor,
          runs,
          median: medianOf(runs),
        };
        writeJSON("perf.json", out);
      }
    } finally {
      await browser.close();
    }
  }
}

/** Shader links after page 1 is shown (per page, with the frame time of the frame holding each), one walk 1 -> 11. */
async function links() {
  const browser = await launch(process.env.UNCAP === "0" ? [] : UNCAPPED);
  const out = { label: LABEL, date: new Date().toISOString(), headed: process.env.HEADED === "1" };
  try {
    const { ctx, p } = await newPage(browser, "desktop", {});
    await p.addInitScript(() => {
      window.__links = [];
      window.__frames = [];
      const lp = WebGL2RenderingContext.prototype.linkProgram;
      WebGL2RenderingContext.prototype.linkProgram = function (program) {
        window.__links.push({
          page: document.querySelector(".mila-num")?.textContent ?? "-",
          frame: window.__frames.length,
        });
        return lp.call(this, program);
      };
      let last = 0;
      const tick = (t) => {
        if (last) window.__frames.push(t - last);
        last = t;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const d = driver(p, false, false);
    await load(p, false);
    await d.open();
    await p.evaluate(() => {
      window.__mark = window.__links.length;
    });
    for (let n = 2; n <= 11; n++) {
      await d.wait(2500);
      await d.next();
    }
    await d.wait(2500);
    const r = await p.evaluate(() => ({
      before: window.__mark,
      links: window.__links.slice(window.__mark).map((l) => ({
        ...l,
        frameMs: Math.round((window.__frames[l.frame] ?? -1) * 10) / 10,
      })),
    }));
    const perPage = {};
    for (const l of r.links) perPage[l.page] = (perPage[l.page] ?? 0) + 1;
    out.linksBeforePage1Shown = r.before;
    out.linksAfterPage1Shown = r.links.length;
    out.perPage = perPage;
    out.links = r.links;
    await ctx.close();
  } finally {
    await browser.close();
  }
  writeJSON("links.json", out);
  console.log(
    "links",
    out.linksBeforePage1Shown,
    "before;",
    out.linksAfterPage1Shown,
    "after",
    JSON.stringify(out.perPage),
  );
}

/** JS heap in MB after a forced GC (CDP). */
async function heap(cdp) {
  await cdp.send("HeapProfiler.collectGarbage");
  const h = await cdp.send("Runtime.getHeapUsage");
  return { usedMB: round(h.usedSize / 1048576), totalMB: round(h.totalSize / 1048576) };
}

/** Six open -> page 8 -> back cycles: Mila GL contexts, live objects and JS heap, in the tale and on the tree. */
async function leak() {
  const browser = await launch();
  const cycles = Number(process.env.LEAK_CYCLES ?? 6);
  const out = {
    label: LABEL,
    date: new Date().toISOString(),
    renderer: conditions.renderer,
    viewports: {},
  };
  try {
    for (const vp of vpsFor(["desktop", "mobile"])) {
      const touch = vp === "mobile";
      const rec = [];
      out.viewports[vp] = rec;
      if (vp === "desktop") out.cycles = rec;
      const { ctx, p } = await newPage(browser, vp, { instrument: true });
      const cdp = await ctx.newCDPSession(p);
      await cdp.send("HeapProfiler.enable");
      const d = driver(p, touch, false);
      await load(p, false);
      const sample = async () => {
        const gl = await p.evaluate(() => window.__gl.report());
        return {
          contextsCreated: gl.created,
          contextsLost: gl.lost,
          contextsCollected: gl.collected,
          liveGl: gl.live,
          heap: await heap(cdp),
        };
      };
      for (let c = 1; c <= cycles; c++) {
        await d.open();
        await d.goTo(8);
        await d.wait(2000);
        const inTale = await sample();
        await press(p.locator(".mila-back"), touch);
        await d.wait(2000);
        const onTree = await sample();
        rec.push({ cycle: c, inTalePage8: inTale, onTree });
        console.log("leak", vp, "cycle", c, JSON.stringify(onTree));
        writeJSON("leak.json", out);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

/** Journey 1 -> 12, back to 6, forward to 10, resizes, language switch, back to the tree and reopen. */
async function journey() {
  const out = { label: LABEL, date: new Date().toISOString(), viewports: {} };
  const browser = await launch();
  try {
    for (const vp of vpsFor(["desktop", "mobile"])) {
      const touch = vp === "mobile";
      const steps = [];
      const consoleLog = [];
      let current = 0;
      const { ctx, p } = await newPage(browser, vp, {
        log: (e) => consoleLog.push({ ...e, page: current }),
      });
      const d = driver(p, touch, false);
      const step = async (name, fn) => {
        try {
          const detail = await fn();
          steps.push({ name, ok: true, detail: detail ?? "" });
        } catch (err) {
          steps.push({ name, ok: false, detail: String(err).split("\n")[0] });
          console.log("FAIL", vp, name, String(err).split("\n")[0]);
        }
        try {
          current = (await d.pageNo()) || current;
        } catch {
          /* tree: no page counter */
        }
      };
      const shot = (name) => p.screenshot({ path: `${OUT}journey-${vp}-${name}.png` });
      await load(p, false);
      await step("open-page-1", async () => `${await d.open()} ms`);
      if (INJECT_JS)
        await p.evaluate((js) => {
          setTimeout(() => (0, eval)(js), 0);
        }, INJECT_JS);
      const resizes =
        vp === "desktop"
          ? [
              [1024, 768],
              [1440, 900],
            ]
          : [
              [844, 390],
              [390, 844],
            ];
      for (let n = 2; n <= 12; n++) {
        await step(`next-to-${pad(n)}`, async () => {
          await d.next();
          const got = await d.pageNo();
          if (got !== n) throw new Error(`expected page ${n}, got ${got}`);
        });
      }
      for (let n = 11; n >= 6; n--) {
        await step(`prev-to-${pad(n)}`, async () => {
          await d.prev();
          const got = await d.pageNo();
          if (got !== n) throw new Error(`expected page ${n}, got ${got}`);
        });
      }
      for (let n = 7; n <= 10; n++) {
        await step(`forward-to-${pad(n)}`, async () => {
          await d.next();
          const got = await d.pageNo();
          if (got !== n) throw new Error(`expected page ${n}, got ${got}`);
          await d.wait(2000);
          if (n === 7 || n === 9) {
            const lang = (l) => press(p.locator(`.reading-langs [data-lang="${l}"]`), touch);
            await lang("fr");
            await d.wait(1500);
            const lg = await p.locator(".mila-story").getAttribute("lang");
            await shot(`p${pad(n)}-fr`);
            await lang("gcf");
            await d.wait(1000);
            return `story lang after fr switch: ${lg}`;
          }
          if (n === 8) {
            await shot("p08-before-resize");
            for (const [w, h] of resizes) {
              await p.setViewportSize({ width: w, height: h });
              await d.wait(1500);
              await shot(`p08-${w}x${h}`);
            }
          }
        });
      }
      await step("back-to-tree", async () => {
        await p.locator(".mila-back").click();
        await d.wait(2000);
      });
      await step("reopen", async () => {
        await d.open();
      });
      // the site has no favicon.ico (browser default request, 404): kept in the log, not counted as a failure
      const errors = consoleLog.filter(
        (e) => e.type !== "warning" && !/\/favicon\.ico$/.test(e.url ?? ""),
      );
      out.viewports[vp] = {
        steps,
        failedSteps: steps.filter((s) => !s.ok).map((s) => s.name),
        console: consoleLog,
        passed: steps.every((s) => s.ok) && errors.length === 0,
      };
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  out.passed = Object.values(out.viewports).every((v) => v.passed);
  writeJSON("journey.json", out);
  console.log("journey passed:", out.passed);
}

/** Lists every produced file with its sha256 and size. */
function manifest() {
  const rows = ["path\tsha256\tbytes"];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) walk(f);
      else if (name !== "manifest.tsv")
        rows.push(
          `${relative(OUT, f)}\t${createHash("sha256").update(readFileSync(f)).digest("hex")}\t${statSync(f).size}`,
        );
    }
  };
  walk(OUT);
  writeFileSync(OUT + "manifest.tsv", rows.join("\n") + "\n");
}

/** Real-clock duration of the turns 6->7 ... 10->11 (click to the new page's text), 2 contexts per viewport. */
async function trans() {
  const out = { label: LABEL, date: new Date().toISOString(), viewports: {} };
  const browser = await launch();
  try {
    for (const vp of vpsFor(["desktop", "mobile"])) {
      const runs = [];
      for (let r = 0; r < 2; r++) {
        const { ctx, p } = await newPage(browser, vp, { throttle: THROTTLE });
        const d = driver(p, vp === "mobile", false);
        await load(p, false);
        await d.open();
        await d.goTo(6);
        await d.wait(2500);
        const run = {};
        for (let from = 6; from <= 10; from++) {
          const before = await d.num();
          await p.evaluate(() => {
            window.__t = performance.now();
          });
          await press(p.locator(".mila-next"), vp === "mobile");
          await p.waitForFunction(
            (b) =>
              document.querySelector(".mila-story")?.classList.contains("is-on") &&
              document.querySelector(".mila-num")?.textContent !== b,
            before,
            { timeout: 30000, polling: "raf" },
          );
          run[`${from}-${from + 1}`] = Math.round(
            await p.evaluate(() => performance.now() - window.__t),
          );
          await d.wait(1500);
        }
        runs.push(run);
        await ctx.close();
      }
      out.viewports[vp] = runs;
      console.log("trans", vp, JSON.stringify(runs));
    }
  } finally {
    await browser.close();
  }
  writeJSON("trans.json", out);
}

/** Real-clock stills of pages 7-10 under CPU_THROTTLE, with the adaptive quality level read at each. */
async function low() {
  if (!THROTTLE) throw new Error("low mode needs CPU_THROTTLE");
  const out = {
    label: LABEL,
    date: new Date().toISOString(),
    cpuThrottle: THROTTLE,
    viewports: {},
  };
  const browser = await launch();
  try {
    for (const vp of vpsFor(["desktop", "mobile"])) {
      const { ctx, p } = await newPage(browser, vp, { instrument: true, throttle: THROTTLE });
      const d = driver(p, vp === "mobile", false);
      await load(p, false);
      await d.open();
      const rec = { atPage1: await quality(p), pages: {} };
      await d.goTo(7);
      await d.wait(8000);
      for (let n = 7; n <= 10; n++) {
        if (n > 7) {
          await d.next();
          await d.wait(8000);
        }
        const q = await quality(p);
        await p.screenshot({ path: `${OUT}${vp}-p${pad(n)}.png` });
        const style = await p.addStyleTag({ content: SCENE_ONLY_CSS });
        await p.screenshot({ path: `${OUT}${vp}-p${pad(n)}-scene.png` });
        await style.evaluate((e) => e.remove());
        rec.pages[n] = {
          quality: q,
          canvas: await p.evaluate(() => window.__gl.canvas()),
        };
        console.log("low", vp, n, "quality", q);
      }
      out.viewports[vp] = rec;
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  writeJSON("low.json", out);
}

/** DOM rects (CSS px) and colours of the tale text on the current page, for the legibility measure. */
const textRects = (p) =>
  p.evaluate(() => {
    const box = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
    const blocks = {};
    for (const [name, sel] of [
      ["num", ".mila-num"],
      ["heading", ".mila-heading"],
      ["text", ".mila-text"],
      ["gloss", ".mila-gloss"],
    ]) {
      const el = document.querySelector(sel);
      if (!el || el.hidden || !el.getClientRects().length) continue;
      const lines = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) lines.push(box(r));
      }
      const cs = getComputedStyle(el);
      blocks[name] = { color: cs.color, fontSize: cs.fontSize, opacity: cs.opacity, lines };
    }
    const card = document.querySelector(".mila-story-scroll").getBoundingClientRect();
    return { lang: document.querySelector(".mila-story").lang, card: box(card), blocks };
  });

/** Pages 7-10 on the fake clock (same flow as shots) with the text rects: stills, scene-only, JSON. */
async function text() {
  const browser = await launch();
  try {
    const runs = [...vpsFor(["desktop", "tablet", "mobile"]).map((vp) => [vp, "gcf"])];
    if (VPS.includes("desktop")) runs.push(["desktop", "fr"]);
    mkdirSync(`${OUT}text/`, { recursive: true });
    for (const [vp, lang] of runs) {
      const { ctx, p } = await newPage(browser, vp, { fake: true });
      const d = driver(p, vp === "mobile", true);
      await load(p, true);
      await d.open();
      await d.wait(2000);
      if (lang === "fr") {
        await p.locator('.reading-langs [data-lang="fr"]').click();
        await d.wait(1500);
      }
      const tag = lang === "gcf" ? vp : `${vp}-${lang}`;
      await d.goTo(10, async (n) => {
        if (n < 7) return;
        await d.wait(6000);
        const rects = await textRects(p);
        await snap(p, `${OUT}text/${tag}-p${pad(n)}.png`);
        const style = await p.addStyleTag({ content: SCENE_ONLY_CSS });
        await snap(p, `${OUT}text/${tag}-p${pad(n)}-scene.png`);
        await style.evaluate((e) => e.remove());
        writeJSON(`text/${tag}-p${pad(n)}.json`, { viewport: VIEWPORTS[vp], ...rects });
        console.log("text", tag, n);
      });
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

const RUN = {
  shots,
  motion,
  perf,
  leak,
  journey,
  trans,
  low,
  text,
  determinism,
  links,
  longframes,
  conch,
  crab,
};
try {
  for (const mode of MODES) {
    if (!RUN[mode]) continue;
    conditions.modes[mode] = MODE_CONDITIONS[mode];
    console.log(`== ${mode}`);
    try {
      await RUN[mode]();
    } catch (err) {
      console.error(`mode ${mode} failed:`, err);
      conditions.failures.push({ mode, error: String(err) });
      process.exitCode = 1;
    }
  }
} finally {
  // a partial re-run (ONLY=shots) keeps the modes recorded by earlier runs in the same OUT
  if (existsSync(OUT + "conditions.json")) {
    const before = JSON.parse(readFileSync(OUT + "conditions.json", "utf8"));
    conditions.modes = { ...before.modes, ...conditions.modes };
    conditions.failures = [...(before.failures ?? []), ...conditions.failures];
  }
  writeJSON("conditions.json", conditions);
  if (existsSync(OUT)) manifest();
}
