import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { disposeObject } from "@shared/three/dispose";
import { glowPoints, type GlowPoints } from "@shared/three/glow-points";
import { clamp, lerp } from "@shared/math";
import { createRng } from "@shared/random";
import type { Ambience } from "./audio";
import { easeIO, fbm, GLSL_NOISE, lerpAngle, smooth, vnoise, walkEase } from "./noise";
import { CRAB_PAGE, PAGE_COUNT } from "./text";
import {
  addSeaFog,
  createSeaDust,
  SEA_GLSL,
  SEA_SUN_GLSL,
  seaLight,
  SWAY_GLSL,
  type SeaDust,
  type SeaUniforms,
} from "./underwater";

/** What the scene needs from the page around it. */
export interface SceneHooks {
  audio: Ambience;
  reduceMotion: boolean;
  /** Phone-class device: lighter geometry, no shadows, no Kuwahara pass. */
  small: boolean;
  /** A page change starts (text hides, counter updates). */
  onLeave(to: number): void;
  /** The camera has arrived on page `to`. */
  onArrive(to: number): void;
  /** Every piece of debris is gone: the crab is free. */
  onFreed(): void;
  /** Tracked timeout, cleared when the world is disposed. */
  later(fn: () => void, ms: number): void;
}

export interface MilaScene {
  readonly page: number;
  /** A page transition is running, or about to (the crab's debris clearing first). */
  readonly moving: boolean;
  /** Target page, or -1 when the request is refused (busy, out of range). */
  go(to: number): void;
  /** Lands on a page at once, without the camera flight (the tale opens straight on page 1). */
  show(to: number): void;
  /** Puts the crab's debris back for a new reading. */
  resetCrab(): void;
  setMotion(on: boolean): void;
  dispose(): void;
}

type Uniform<T> = { value: T };
type V3 = THREE.Vector3;
const V3 = (x = 0, y = 0, z = 0): V3 => new THREE.Vector3(x, y, z);

/** Mila's paper dress, one flounce per row: yTop, yBot, rTop, rBot, jag, seed (body space). */
export const DRESS: [number, number, number, number, number, number][] = [
  [0.935, 0.77, 0.074, 0.098, 0, 1],
  [0.84, 0.69, 0.092, 0.158, 0.035, 2],
  [0.75, 0.6, 0.13, 0.205, 0.045, 3],
  [0.665, 0.455, 0.17, 0.255, 0.055, 4],
];
/** Clearance between an arm's axis and the dress surface (limb radius plus a small gap). */
export const ARM_CLEARANCE = 0.035;

/**
 * Widest radius of the dress at height `y` (body space): the flounce profile of `flounce()` with
 * its crumpled folds at their largest. 0 above and below the dress.
 */
export function dressRadius(y: number): number {
  let r = 0;
  for (const [yTop, yBot, rTop, rBot] of DRESS) {
    if (y > yTop || y < yBot) continue;
    const t = (yTop - y) / (yTop - yBot);
    r = Math.max(r, lerp(rTop, rBot, Math.pow(t, 0.8)) * (1 + 0.083 * t + 0.035 * t * t));
  }
  return r;
}

/**
 * Moves a hand target (body space) out of the dress: the hand rests against the flounces instead
 * of sinking into them. `lean` widens the clearance on the side the wind blows the hem to.
 */
export function clearOfDress(h: THREE.Vector3, lean = 0): THREE.Vector3 {
  const need = dressRadius(h.y) + ARM_CLEARANCE + lean;
  const r = Math.hypot(h.x, h.z);
  if (need > 0 && r < need) {
    if (r < 1e-6) h.x = need;
    else {
      h.x *= need / r;
      h.z *= need / r;
    }
  }
  return h;
}

/** One crumpled paper flounce of the dress (lathe), `aHem` 0 at its top to 1 at its hem. */
export function flounce(
  yTop: number,
  yBot: number,
  rTop: number,
  rBot: number,
  jag = 0.05,
  seedK = 0,
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const R = 10;
  for (let i = 0; i <= R; i++) {
    const t = i / R;
    pts.push(new THREE.Vector2(lerp(rTop, rBot, Math.pow(t, 0.8)), lerp(yTop, yBot, t)));
  }
  const g = new THREE.LatheGeometry(pts, 96);
  const p = g.attributes.position;
  const hem = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const t = (yTop - y) / (yTop - yBot);
    // crumpled paper folds and flounces
    const cr =
      1 +
      (fbm(Math.cos(a) * 3 + seedK, Math.sin(a) * 3 + t * 2, 3) - 0.5) * 0.2 * t +
      Math.sin(a * 14 + seedK * 3) * 0.035 * t * t +
      Math.sin(a * 31 + seedK) * 0.008 * t;
    let ny = y;
    if (t > 0.9)
      ny -=
        ((fbm(a * 4 + seedK, 1, 2) - 0.3) * jag +
          (0.5 + 0.5 * Math.sin(a * 14 + seedK * 3)) * 0.022) *
        smooth(0.9, 1, t);
    p.setXYZ(i, x * cr, ny, z * cr);
    hem[i] = t;
  }
  g.setAttribute("aHem", new THREE.BufferAttribute(hem, 1));
  g.computeVertexNormals();
  return g;
}

/**
 * The turtle's lap around the meadow at angle `ta` (it grows with time): offset from the meadow's
 * centre on its ellipse, and the heading that turns its head (local +z) along the way it swims.
 */
export function turtleCourse(ta: number): { x: number; z: number; heading: number } {
  const rx = TURTLE_R * 1.3;
  const rz = TURTLE_R;
  return {
    x: Math.cos(ta) * rx,
    z: Math.sin(ta) * rz,
    heading: Math.atan2(-Math.sin(ta) * rx, Math.cos(ta) * rz),
  };
}
const TURTLE_R = 2.6;

/** Pages where Mila holds the conch to her ear. */
const HOLD_PAGES = new Set([0, 1, 2, 3, 4, 5, 11, 12]);
/** Golden reflections on the sea, per page. */
const GOLD = [1, 1, 0.5, 0.04, 0.5, 0.35, 0.25, 0.5, 0.5, 0.5, 0.6, 1.3, 1.6];
/** Inner glow of the held conch, per page. */
const GLOW = [0.12, 0.15, 0.75, 0.2, 0.35, 0.3, 0.25, 0.3, 0.3, 0.35, 0.4, 0.6, 0.42];
/**
 * Seconds per transition: the prototype's proportions, about a tenth shorter so the text returns
 * sooner; the walks keep a child's stroll (under two steps a second).
 */
const DURATIONS: Record<string, number> = {
  "0>1": 6.2,
  "1>2": 4.4,
  "2>3": 4.4,
  "3>4": 8.6,
  "4>5": 7.6,
  "5>6": 5.4,
  "6>7": 7.6,
  "7>8": 5.4,
  "8>9": 5.4,
  "9>10": 5.8,
  "10>11": 7.6,
  "11>12": 5.6,
};

interface CamDef {
  pos: V3;
  tgt: V3;
  subj: V3;
}

interface Trans {
  from: number;
  to: number;
  t: number;
  dur: number;
  posC: THREE.CatmullRomCurve3 | null;
  posPts: V3[];
  tgtC: THREE.CatmullRomCurve3 | null;
  tgtPts: V3[];
  milaC: THREE.CatmullRomCurve3;
  mRy0: number;
  mRy1: number;
  gold0: number;
  /** Set when Mila travels: the camera rides with her (see `CamRig`). */
  rig: CamRig | null;
}

/**
 * The camera's place around Mila at both ends of a move she makes, as a bearing, a distance and a
 * height from her, and what it looks at, as an offset from her. In between, the camera keeps
 * station on her and swings from one to the other: she never leaves the frame, and the angle only
 * ever changes gradually.
 */
interface CamRig {
  az0: number;
  az1: number;
  r0: number;
  r1: number;
  y0: number;
  y1: number;
  look0: V3;
  look1: V3;
}

interface Leg {
  hip: THREE.Bone;
  knee: THREE.Bone;
  ankle: THREE.Bone;
  sx: number;
  prevC: number;
}

interface Arm {
  sd: number;
  L1: number;
  L2: number;
  sh: THREE.Bone;
  el: THREE.Bone;
  hand: THREE.Group;
  S: V3;
}

interface MilaRig {
  g: THREE.Group;
  pose: THREE.Group;
  inner: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: Leg[];
  puffs: THREE.Group[];
  closed: THREE.Group;
  open: THREE.Group;
  held: THREE.Mesh;
  arms: Arm[];
  cord: THREE.Mesh;
  walk: number;
  swim: number;
  swimW: number;
  hold: number;
  moving: number;
  pitch: number;
  phase: number;
  snap: boolean;
  prev: V3 | null;
}

interface Debris {
  mesh: THREE.Mesh;
  gone: boolean;
  t: number;
  home: V3;
}

interface Sign {
  g: THREE.Group;
  ring: THREE.Mesh;
  halo: THREE.SpriteMaterial;
  core: THREE.SpriteMaterial;
  /** The small drawing at its heart (steps, grass, spiral). */
  icon: THREE.SpriteMaterial;
  /** The wake it leaves: its last positions, newest first. */
  wake: THREE.Points;
  wakeT: number;
  /** The light's own colour at full strength. */
  tint: THREE.Color;
  /** Eased brightness (1 = full): lower close to the camera and behind the text. */
  dim: number;
  sc: number;
}

interface Thread {
  from: number;
  prog: Uniform<number>;
}

interface LeafData {
  p: V3;
  q: THREE.Euler;
  s: number;
  ph: number;
}

interface FishData {
  r: number;
  a: number;
  s: number;
  y: number;
  ph: number;
  sc: number;
  grp: number;
  vis: number;
}

interface SchoolFish {
  a: number;
  r: number;
  h: number;
  sp: number;
  ph: number;
  sc: number;
}

interface Flipper {
  pv: THREE.Group;
  s: number;
  big: number;
}

interface Burst {
  m: THREE.Points;
  vel: V3[];
  t: number;
}

/** Prototype `shoreZ`: the waterline's z for a given x. */
const shoreZ = (x: number): number =>
  1.5 + Math.sin(x * 0.13) * 1.0 + Math.sin(x * 0.05 + 0.4) * 1.2;

/** Prototype `groundH`: beach above the shore, sea floor below, a deep hollow off shore. */
function groundH(x: number, z: number): number {
  const s = z - shoreZ(x);
  let h: number;
  if (s > 0)
    h =
      0.12 +
      1.6 * (1 - Math.exp(-s * 0.09)) +
      (fbm(x * 0.15, z * 0.15, 3) - 0.5) * 0.6 * smooth(1, 6, s);
  else
    h =
      0.12 -
      9 * (1 - Math.exp(s * 0.085)) +
      (fbm(x * 0.2, z * 0.2, 3) - 0.5) * 1.4 * smooth(-2, -8, s) +
      Math.sin(x * 1.3 + z * 0.4) * 0.05 * smooth(-1, -5, s);
  h -= 6.5 * Math.exp(-((x - 14) ** 2 + (z + 38) ** 2) / 160);
  return h;
}

/** Mila's place on pages 1-3 and 11-12, on the beach. */
export const HOME = new THREE.Vector3(3, 0, 5.5);
HOME.y = groundH(HOME.x, HOME.z);
/** Mila on page 4, at the water's edge. */
export const M4 = new THREE.Vector3(8.2, 0, shoreZ(8.2) + 0.45);
M4.y = groundH(M4.x, M4.z);
/** The two rocks by the shore between HOME and page 4: x, z, size (see `buildRocks`). */
export const SHORE_ROCKS: [number, number, number][] = [
  [5.1, 4.4, 0.35],
  [5.7, 4.0, 0.22],
];
/** The walk 3 -> 4 passes on the landward side of the shore rocks. */
export const AROUND_ROCKS = new THREE.Vector3(5.3, 0, 5.6);
AROUND_ROCKS.y = groundH(AROUND_ROCKS.x, AROUND_ROCKS.z);

/**
 * Depth of the conch's spiral groove (prototype `surf`). JavaScript reads `a*b*(c)%1` left to
 * right, so the prototype's last `% 1` applies to the whole product: keep that grouping.
 */
export function conchGroove(th: number, y: number, sp: number): number {
  return (0.14 * sp * (((th / (Math.PI * 2) + (1 - y) * 4.4) % 1) + 1)) % 1;
}

/** Underwater zones kept free of rocks and coral (cameras and Mila). */
const KEEP_CLEAR: [number, number, number][] = [
  [9 - 2.6, -19 + 2.6, 3.2],
  [9 - 5, -19 + 6.2, 4.5],
  [14.5 - 2.8, -37.5 + 2.6, 3],
  [14.5 - 5, -37.5 + 6, 4.5],
  [11.5 - 1.2, -28 + 2.2, 3],
  [11.5 + 1.1, -28 + 5.1, 3.2],
  [6.8, -9.5, 3],
  [3.4, -9.3, 3],
  [7.9, -14.2, 2.6],
  [12.8, -24.6, 2.6],
  [13.5, -32.4, 2.6],
  [4.2, -8.2, 2.6],
  [10.5, -38.1, 2.8],
  [10.2, -39.2, 2.8],
];
const isClear = (x: number, z: number): boolean =>
  KEEP_CLEAR.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) > r);

const WAVES_GLSL = `
float shoreZ(float x){return 1.5+sin(x*.13)*1.+sin(x*.05+.4)*1.2;}
float waves(vec2 p,float t){
  float h=sin(p.x*.17+p.y*.52+t*.9)*.09;
  h+=sin(-p.x*.31+p.y*.86+t*1.35)*.05;
  h+=sin(p.x*.68+p.y*1.55-t*1.8)*.022;
  h+=sin(p.x*1.3-p.y*.4+t*2.3)*.01;
  return h;}
`;

const QUAD_VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

/**
 * Builds Mila's night beach and sea (prototype "Le monde de Mila V3") on `canvas`, sized to
 * `container`, and starts its loop. Throws when WebGL 2 is unavailable; the caller then reads the
 * tale as text.
 */
export function createMilaScene(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  hooks: SceneHooks,
): MilaScene {
  const { audio, reduceMotion, small: isSmall } = hooks;
  const rnd = createRng(7);
  const rr = (a: number, b: number): number => a + (b - a) * rnd();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  const listeners: (() => void)[] = [];
  /** Adds a listener removed on dispose. */
  function listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ): void {
    target.addEventListener(type, fn as EventListener);
    listeners.push(() => target.removeEventListener(type, fn as EventListener));
  }
  const timer = new THREE.Timer();
  let composer: EffectComposer | null = null;
  const passes: { dispose(): void }[] = [];
  const scene = new THREE.Scene();

  /** Stops everything and frees GPU memory; safe to call twice. */
  let disposed = false;
  function release(): void {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    listeners.forEach((off) => off());
    timer.dispose();
    for (const b of bursts) disposeObject(b.m);
    scene.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
      if (o instanceof THREE.DirectionalLight) o.shadow.dispose();
    });
    disposeObject(scene);
    passes.forEach((p) => p.dispose());
    composer?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    throw new Error("Mila: WebGL 2 is required");
  }

  const U = {
    time: { value: 0 },
    gold: { value: 1 },
    song: { value: 0 },
    under: { value: 0 },
    part: { value: 0 },
    partC: { value: V3(9, -7, -19) },
    caus: { value: 1 },
    moonDir: { value: V3(0.02, 0.42, -1).normalize() },
    camPos: { value: V3() },
    wind: { value: 0 },
    glow: { value: 0.15 },
    calm: { value: 0 },
    swimD: { value: 0 },
  };
  /** The water's own uniforms (see `underwater.ts`); `uSea` is the camera's `under`. */
  const SEA: SeaUniforms = {
    uSea: U.under,
    uSeaSun: { value: seaLight(U.moonDir.value) },
    uFlow: { value: 0 },
    uSway: { value: reduceMotion ? 0.3 : 1 },
  };
  /** Decorative motion runs at this share of the world's pace (calmer under reduced motion). */
  const FLOW_RATE = reduceMotion ? 0.3 : 1;
  /** How wet the sheet is (0..1): it peaks just after a page turn. */
  const U_wash = { value: 0 };
  /** Seconds since the last animated page turn. */
  let sinceTurn = Infinity;
  const WASH_SECONDS = 1.7;
  const U_bigGlow = { value: 0.08 };
  const U_liveGlow = { value: 0.1 };

  const size = (): { w: number; h: number } => ({
    w: container.clientWidth || 1,
    h: container.clientHeight || 1,
  });
  const camera = new THREE.PerspectiveCamera(40, size().w / size().h, 0.05, 900);
  const NIGHT_FOG = new THREE.Color("#2b3f52");
  const SEA_FOG = new THREE.Color("#0d4f57");
  const fog = new THREE.FogExp2(NIGHT_FOG.clone(), 0.0042);
  scene.fog = fog;
  scene.background = new THREE.Color("#123440");

  /* ---------- painted canvas textures ---------- */
  function canvasTex(
    w: number,
    h: number,
    draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
    repeat?: number,
  ): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    if (!g) throw new Error("Mila: 2D canvas unavailable");
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
    }
    return t;
  }
  function strokes(
    g: CanvasRenderingContext2D,
    w: number,
    h: number,
    n: number,
    colors: string[],
    len: [number, number] = [6, 22],
    wid: [number, number] = [1, 3],
    alpha = 0.35,
    angle: number | null = null,
  ): void {
    for (let i = 0; i < n; i++) {
      g.strokeStyle = colors[(rnd() * colors.length) | 0];
      g.globalAlpha = alpha * rr(0.5, 1);
      g.lineWidth = rr(wid[0], wid[1]);
      g.lineCap = "round";
      const x = rnd() * w;
      const y = rnd() * h;
      const a = angle === null ? rnd() * Math.PI : angle + rr(-0.35, 0.35);
      const l = rr(len[0], len[1]);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(
        x + Math.cos(a) * l * 0.5 + rr(-2, 2),
        y + Math.sin(a) * l * 0.5 + rr(-2, 2),
        x + Math.cos(a) * l,
        y + Math.sin(a) * l,
      );
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  // Texture order matters: each one draws from the seeded generator (prototype module order).
  const TEX_sand = canvasTex(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = "#e9e2d6";
      g.fillRect(0, 0, w, h);
      strokes(
        g,
        w,
        h,
        2600,
        ["#ffffff", "#f6e7cf", "#d8c9b3", "#fff6e0", "#cbb79c", "#efd9c0"],
        [5, 18],
        [1, 3.2],
        0.45,
      );
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = rnd() < 0.5 ? "rgba(80,60,40,.18)" : "rgba(255,255,255,.25)";
        g.fillRect(rnd() * w, rnd() * h, 1.2, 1.2);
      }
    },
    22,
  );
  // Twice the prototype's resolution, same strokes and draws: the paper's brushwork reads finer.
  const TEX_dress = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#eaa12a";
    g.fillRect(0, 0, w, h);
    strokes(
      g,
      w,
      h,
      700,
      ["#f7c04d", "#d98a1c", "#ffd877", "#c97716", "#f2ad37"],
      [18, 72],
      [2, 5.5],
      0.5,
      Math.PI / 2,
    );
    strokes(g, w, h, 120, ["#8a4b0e", "#b5651a"], [14, 46], [0.8, 1.6], 0.4);
  });
  const TEX_leaf = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(128, 150, 10, 128, 128, 130);
    gr.addColorStop(0, "#7eae4a");
    gr.addColorStop(0.7, "#4f8a3a");
    gr.addColorStop(1, "#d7c25a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    strokes(g, w, h, 500, ["#93c25c", "#3f7430", "#6aa043", "#b6cf62"], [8, 26], [1.5, 4], 0.35);
    g.strokeStyle = "#c4573d";
    g.lineCap = "round";
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.36;
      g.globalAlpha = 0.75;
      g.lineWidth = i === 4 ? 3.2 : 1.8;
      g.beginPath();
      g.moveTo(128, 236);
      g.quadraticCurveTo(
        128 + Math.cos(a) * 50,
        236 + Math.sin(a) * 60,
        128 + Math.cos(a) * 120,
        128 + Math.sin(a) * 112 + 20,
      );
      g.stroke();
    }
    g.globalAlpha = 1;
  });
  const TEX_turtle = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#6b6a33";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        const cx = x * 56 + (y % 2) * 28 + 10;
        const cy = y * 52 + 12;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          g.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 24);
        }
        g.closePath();
        const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 26);
        gr.addColorStop(0, "#b38a3e");
        gr.addColorStop(1, "#5d4f22");
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = "#e3c77a";
        g.lineWidth = 2.4;
        g.stroke();
      }
    strokes(g, w, h, 300, ["#3d3a1a", "#c8a85a"], [4, 14], [1, 2], 0.4);
  });
  const TEX_madras = canvasTex(
    64,
    64,
    (g, w, h) => {
      g.fillStyle = "#d8352a";
      g.fillRect(0, 0, w, h);
      const band = (c: string, x: number, wd: number, a: number): void => {
        g.globalAlpha = a;
        g.fillStyle = c;
        g.fillRect(x, 0, wd, h);
        g.fillRect(0, x, w, wd);
      };
      band("#f2c230", 6, 10, 0.75);
      band("#f2c230", 38, 10, 0.75);
      band("#2f8a4a", 22, 6, 0.7);
      band("#ffffff", 54, 2, 0.6);
      band("#1d3f8a", 28, 2, 0.5);
      g.globalAlpha = 1;
    },
    3,
  );
  const TEX_can = canvasTex(128, 128, (g, w) => {
    g.fillStyle = "#b8322b";
    g.fillRect(0, 0, w, w);
    g.fillStyle = "#e8e2d4";
    g.fillRect(0, 48, w, 26);
    g.fillStyle = "#b8322b";
    g.font = "bold 20px sans-serif";
    g.fillText("~ ~", 40, 68);
  });
  const TEX_hair = canvasTex(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = "#160e0b";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        // same draws as the prototype, drawn on a sheet twice as fine
        const r = rr(1.5, 4.5) * 2;
        g.strokeStyle = ["#3b2519", "#2a1912", "#4d3020", "#0b0605"][(rnd() * 4) | 0];
        g.globalAlpha = rr(0.4, 0.9);
        g.lineWidth = rr(0.8, 1.8) * 1.5;
        g.beginPath();
        for (let a = 0; a < rr(4, 9); a += 0.5) {
          g.lineTo(x + Math.cos(a) * r * (a / 8 + 0.3), y + Math.sin(a) * r * (a / 8 + 0.3));
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    },
    6,
  );
  const glowTex = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  });
  glowTex.colorSpace = THREE.NoColorSpace;

  /* soft toon ramps, gouache-like */
  const ramp = (values: number[], filter: THREE.MagnificationTextureFilter): THREE.DataTexture => {
    const t = new THREE.DataTexture(new Uint8Array(values), values.length, 1, THREE.RedFormat);
    t.minFilter = filter;
    t.magFilter = filter;
    t.needsUpdate = true;
    return t;
  };
  const toonRamp = ramp([46, 92, 150, 210, 255], THREE.NearestFilter);
  const softRamp = ramp([70, 100, 130, 160, 188, 212, 232, 246, 255], THREE.LinearFilter);
  const toonSoft = (
    color: THREE.ColorRepresentation,
    o: THREE.MeshToonMaterialParameters = {},
  ): THREE.MeshToonMaterial =>
    new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: softRamp, ...o });
  const toon = (
    color: THREE.ColorRepresentation,
    o: THREE.MeshToonMaterialParameters = {},
  ): THREE.MeshToonMaterial =>
    new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: toonRamp, ...o });

  const MEADOW = V3(9, 0, -19);
  MEADOW.y = groundH(MEADOW.x, MEADOW.z);
  const DEEP = V3(14.5, 0, -37.5);
  DEEP.y = groundH(DEEP.x, DEEP.z);
  const SCHOOL = V3(11.5, 0, -28);
  SCHOOL.y = groundH(SCHOOL.x, SCHOOL.z);
  U.partC.value.copy(MEADOW);

  /**
   * Underwater caustics on a lit material: the net of light the swell throws on the sea floor.
   * It lies along the light's own path, only on faces turned to it, drifts slowly, and thins out
   * with distance into an even glow.
   */
  function addCaustics(mat: THREE.Material): void {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFlow = SEA.uFlow;
      sh.uniforms.uCaus = U.caus;
      sh.uniforms.uSeaSun = SEA.uSeaSun;
      sh.vertexShader =
        "varying vec3 vWP;\n" +
        sh.vertexShader.replace(
          "#include <project_vertex>",
          "#include <project_vertex>\n vWP=(modelMatrix*vec4(transformed,1.)).xyz;",
        );
      sh.fragmentShader =
        "varying vec3 vWP;\nuniform float uFlow;uniform float uCaus;\n" +
        SEA_SUN_GLSL +
        `
float caust(vec2 uv,float t){vec2 p=mod(uv*1.1,6.2831)-250.;vec2 i=p;float c=1.;float inten=.005;
 for(int n=0;n<4;n++){float tt=t*(1.-(3.5/float(n+1)));i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
 c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
 c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}
` +
        sh.fragmentShader.replace(
          "#include <opaque_fragment>",
          `
 float uw=smoothstep(0.05,-0.8,vWP.y);
 if(uw>0.){
  // Adapted from Abyssal Garden (MIT, see underwater.ts), source/src/shaders.js lines 243-251
  // and 372: the pattern is cast along the light, kept to the faces that look at it, and eased
  // to its mean far away, where it would only shimmer.
  vec2 cq=vWP.xz-uSeaSun.xz*(vWP.y/uSeaSun.y);
  float cd=length(vWP-cameraPosition);
  float lit=smoothstep(.05,.5,dot(inverseTransformDirection(normal,viewMatrix),uSeaSun));
  float cpat=.72+.28*sin(cq.x*.23+uFlow*.11)*sin(cq.y*.19-uFlow*.09);
  float cs=mix(caust(cq*.55,uFlow*.42)*cpat,.08,smoothstep(9.,26.,cd))*uCaus*lit;
  vec3 cc=mix(vec3(1.,.86,.62),vec3(.55,.95,.85),smoothstep(-1.,-9.,vWP.y));
  outgoingLight+=cc*cs*uw*exp(vWP.y*.07)*.72;
  // the deeper the floor, the more red the light has lost on its way down
  outgoingLight*=mix(vec3(1.),exp(vec3(.1,.026,.018)*vWP.y)*1.06,uw);}
#include <opaque_fragment>`,
        );
    };
  }

  /* =====================================================================
     TERRAIN: beach and sea floor
     ===================================================================== */
  function buildTerrain(): void {
    const seg = isSmall ? 170 : 240;
    const geo = new THREE.PlaneGeometry(170, 170, seg, seg);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -25);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const dry = new THREE.Color("#dba457");
    const dry2 = new THREE.Color("#e8bd6c");
    const dry3 = new THREE.Color("#bf7c3a");
    const wet = new THREE.Color("#8b6439");
    const sh = new THREE.Color("#7fae96");
    const mid = new THREE.Color("#2f7470");
    const deep = new THREE.Color("#1b4658");
    const olive = new THREE.Color("#58683a");
    /** The sunset the wet sand mirrors along the waterline. */
    const sheen = new THREE.Color("#c98f88");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const h = groundH(x, z);
      p.setY(i, h);
      const s = z - shoreZ(x);
      const n = fbm(x * 0.25, z * 0.25, 3);
      if (h > 0.05) {
        c.copy(dry)
          .lerp(dry2, smooth(0.35, 0.7, n))
          .lerp(dry3, smooth(0.55, 0.85, fbm(x * 0.08 + 9, z * 0.08, 2)) * 0.6);
        c.lerp(wet, smooth(1.4, 0, s) * 0.85);
        c.lerp(sheen, smooth(0.75, 0.05, s) * 0.32);
      } else {
        c.copy(sh)
          .lerp(mid, smooth(-0.2, -4, h))
          .lerp(deep, smooth(-6, -14, h));
        c.multiplyScalar(0.85 + n * 0.3);
        const md = Math.hypot(x - MEADOW.x, z - MEADOW.z);
        c.lerp(olive, smooth(12, 4, md) * 0.45);
      }
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: TEX_sand });
    addCaustics(mat);
    // The sand the swash has just left stays dark and takes a little of the sky, then dries: the
    // beach and the sea meet in a moving wet edge, not on a line.
    const caustics = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      caustics.call(mat, sh, r);
      sh.uniforms.uTime = U.time;
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "varying vec3 vWP;",
          "varying vec3 vWP;\nuniform float uTime;\nfloat shoreZ(float x){return 1.5+sin(x*.13)*1.+sin(x*.05+.4)*1.2;}",
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
 float sS=vWP.z-shoreZ(vWP.x);float sW=sin(uTime*.55)*.55+sin(uTime*.9+vWP.x*.2)*.2;
 float sWet=smoothstep(1.05+sW*.55,.2+sW*.55,sS)*smoothstep(-.6,.0,sS+sW*.2);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.66,.64,.68)+vec3(.045,.02,.03),sWet);`,
        );
    };
    mat.customProgramCacheKey = () => "mila-sand";
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    scene.add(m);
  }

  /* =====================================================================
     PAINTED SKY: gradient, swirls around the moon, clouds, stars
     ===================================================================== */
  function buildSky(): THREE.Mesh {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      uniforms: {
        uMoon: U.moonDir,
        uTime: U.time,
        uUnder: U.under,
        uSong: U.song,
        uSea: SEA.uSea,
        uSeaSun: SEA.uSeaSun,
      },
      vertexShader: `varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:
        GLSL_NOISE +
        SEA_GLSL +
        `
uniform vec3 uMoon;uniform float uTime,uUnder,uSong;varying vec3 vDir;
void main(){
 vec3 d=normalize(vDir);float h=d.y;float az=atan(d.x,-d.z);
 vec3 top=lin(vec3(.035,.17,.2)),mid=lin(vec3(.06,.3,.33)),vio=lin(vec3(.4,.3,.46)),ora=lin(vec3(.95,.5,.34)),pink=lin(vec3(.93,.52,.5));
 // az wraps behind the beach (towards the land): there, everything that depends on it eases to
 // a second, unbroken reading of the angle, so no seam shows in the sky
 float back=smoothstep(1.7,2.7,abs(az));float az2=mod(az+6.2831853,6.2831853);
 float warm=mix(smoothstep(-.9,.5,az),.5,back);
 vec3 hz=mix(mix(vio,pink,.5),ora,warm);
 vec3 c=mix(hz,vio,smoothstep(.0,.08,h));
 c=mix(c,mid,smoothstep(.06,.26,h));
 c=mix(c,top,smoothstep(.26,.85,h));
 float cl=mix(fbm(vec2(az*3.2+uTime*.004,h*16.)),fbm(vec2(az2*3.2+9.+uTime*.004,h*16.)),back);
 float cloud=smoothstep(.5,.72,cl)*smoothstep(.3,.07,h)*smoothstep(.0,.04,h);
 c=mix(c,mix(lin(vec3(.98,.6,.5)),lin(vec3(.5,.36,.56)),smoothstep(.05,.2,h)),cloud*.8);
 vec3 m=normalize(uMoon);vec3 t1=normalize(cross(m,vec3(0,1,0)));vec3 t2=cross(t1,m);
 vec2 q=vec2(dot(d,t1),dot(d,t2));float r=length(q);vec2 dir=q/max(r,1e-4);
 float rr=r+(fbm(dir*2.2+r*3.)-.5)*.09;
 float s1=sin(rr*95.+fbm(dir*6.+rr*10.+uTime*.015)*6.);
 float sn=noise(dir*5.+vec2(rr*150.,rr*20.));
 float sm=smoothstep(.25,1.,s1)*smoothstep(.35,.8,sn)*smoothstep(-.02,.12,h);
 c+=mix(lin(vec3(.2,.5,.5)),lin(vec3(1.,.85,.55)),exp(-r*5.))*sm*(.045+exp(-r*3.)*.2)*(1.+uSong*.8);
 float bt=mix(noise(vec2(az*55.,h*150.))*.6+noise(vec2(az*130.,h*40.))*.4,noise(vec2(az2*55.,h*150.))*.6+noise(vec2(az2*130.,h*40.))*.4,back);
 c*=.9+bt*.18;
 vec2 sg=vec2(az*90.,h*90.);vec2 id=floor(sg);float rs=hash(id);vec2 f=fract(sg)-.5;
 float tw=.55+.45*sin(uTime*(1.5+rs*3.)+rs*40.);
 c+=vec3(1.,.93,.75)*step(.982,rs)*smoothstep(.13,.0,length(f))*tw*smoothstep(.1,.35,h)*1.6;
 float md=acos(clamp(dot(d,m),-1.,1.));float R=.052;
 float disc=smoothstep(R,R-.0025,md);vec2 mq=q/R;
 float cr=fbm(mq*2.4+3.)*.7+fbm(mq*7.)*.3;
 vec3 mc=mix(lin(vec3(1.,.88,.66)),lin(vec3(.9,.66,.44)),smoothstep(.35,.75,cr))*1.9;
 c=mix(c,mc,disc);
 c+=lin(vec3(1.,.74,.46))*(exp(-md*12.)*.22+exp(-md*35.)*.35)*(1.-disc);
 c=mix(c,lin(vec3(.02,.09,.12)),smoothstep(.0,-.06,h));
 if(uUnder>0.)c=mix(c,seaWater(d,cameraPosition.y),uUnder);
 gl_FragColor=vec4(c,1.);
}`,
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(400, 64, 32), mat);
    m.renderOrder = -100;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  }

  /* =====================================================================
     SEA: waves, golden threads, foam, moon path, underwater face
     ===================================================================== */
  function buildOcean(): void {
    const geo = new THREE.PlaneGeometry(420, 420, isSmall ? 200 : 300, isSmall ? 200 : 300);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -150);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      fog: true,
      depthWrite: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
      vertexShader:
        WAVES_GLSL +
        `
uniform float uTime,uCalm;varying vec3 vWP;varying float vShore;
#include <fog_pars_vertex>
void main(){vec4 w=modelMatrix*vec4(position,1.);float s=w.z-shoreZ(w.x);float att=smoothstep(3.,-6.,s);
 w.y+=waves(w.xz,uTime)*att*(1.-.72*uCalm);vWP=w.xyz;vShore=s;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
}`,
      fragmentShader:
        GLSL_NOISE +
        WAVES_GLSL +
        `
uniform float uTime,uGold,uSong,uCalm;uniform vec3 uMoonDir,uCamPos;varying vec3 vWP;varying float vShore;
#include <fog_pars_fragment>
void main(){
 float t=uTime;vec2 p=vWP.xz;float e=.06;float att=smoothstep(3.,-6.,vShore)*(1.-.72*uCalm);
 float h0=waves(p,t);
 vec3 n=normalize(vec3(-(waves(p+vec2(e,0.),t)-h0)/e*att,1.,-(waves(p+vec2(0.,e),t)-h0)/e*att));
 float dn=noise(p*vec2(1.1,3.2)+vec2(t*.35,t*.12))-noise(p*vec2(2.3,4.4)-vec2(t*.25,0.));
 n=normalize(n+vec3(dn*.1,0.,dn*.16));
 vec3 V=normalize(uCamPos-vWP);float dist=length(uCamPos-vWP);
 vec3 col;float alpha=1.;
 if(!gl_FrontFacing){
   float up=clamp(-V.y,0.,1.);
   col=mix(lin(vec3(.05,.34,.38)),lin(vec3(.5,.88,.82)),pow(up,2.5));
   col+=lin(vec3(.7,1.,.9))*smoothstep(.55,.95,noise(p*1.6+t*.4)*noise(p*.9-t*.3)*2.)*.35*up;
   col+=lin(vec3(1.,.9,.7))*pow(max(dot(-V,normalize(uMoonDir+vec3(0.,.6,0.))),0.),40.)*1.2;
 } else {
   float tn=noise(p*vec2(.33,.9)+vec2(t*.05,0.));
   vec3 deep=lin(vec3(.02,.15,.19)),turq=lin(vec3(.06,.47,.48)),teal2=lin(vec3(.1,.33,.4));
   col=mix(deep,teal2,smoothstep(.3,.7,noise(p*vec2(.12,.4))));
   col=mix(col,turq,smoothstep(.55,.85,tn)*.6+smoothstep(-10.,-1.,vShore)*.55);
   float br=noise(vec2(p.x*.8,p.y*3.5)+vec2(t*.2,0.));
   col*=.85+br*.3;
   float fres=pow(1.-max(dot(n,V),0.),3.);
   vec3 R=reflect(-V,n);float hz=clamp(R.y,0.,1.);
   vec3 sky=mix(lin(vec3(.9,.5,.4)),lin(vec3(.06,.26,.3)),smoothstep(0.,.3,hz));
   col=mix(col,sky,fres*.65);
   float md=max(dot(R,normalize(uMoonDir)),0.);
   col+=lin(vec3(1.,.84,.58))*(pow(md,700.)*4.2+pow(md,50.)*.4)*(.6+.4*noise(p*3.+t));
   float g=p.y*.5+sin(p.x*.11+t*.22)*.9+fbm(p*.07+vec2(t*.02,0.))*2.2;
   float f=abs(fract(g)-.5);float w=fwidth(g)*1.3+.012;
   float line=1.-smoothstep(w*.4,w,f);
   float frag=smoothstep(.5,.72,noise(vec2(p.x*.09-t*.12,p.y*.28)));
   float gold=line*frag*smoothstep(80.,15.,dist)*uGold;
   col+=lin(vec3(1.,.78,.36))*gold*(1.6+uSong*1.6);
   float wash=sin(t*.55)*.55+sin(t*.9+p.x*.2)*.2;
   // sparks along the moon's path, and the sea's own light where the swash stirs it
   col+=lin(vec3(1.,.9,.7))*pow(md,24.)*smoothstep(.78,.97,noise(p*6.+vec2(t*.8,-t*.5)))*.2;
   float bio=smoothstep(.9,.99,noise(p*vec2(19.,27.)+vec2(t*.6,-t*.9)))*smoothstep(-5.,-.4,vShore)*smoothstep(.3,-.3,vShore-wash);
   col+=lin(vec3(.35,.95,.9))*bio*(.4+uSong*.5)*(1.-.4*uCalm);
   float band=smoothstep(-1.7+wash,-.15+wash,vShore);
   float fl=noise(p*vec2(2.2,6.)+vec2(t*.3,-t*.2));
   float ln=1.-smoothstep(.0,.06,abs(fract(vShore*.8-t*.22)-.5)-.4);
   float foam=band*smoothstep(.35,.7,fl)+ln*smoothstep(-4.,-1.,vShore)*smoothstep(.0,-.6,vShore)*.6;
   col=mix(col,lin(vec3(.93,.95,.88)),clamp(foam,0.,1.)*.6*(1.-.55*uCalm));
   // the sheet of water thins to nothing on the sand, under a last thread of foam
   float lip=.25+wash;
   col=mix(col,lin(vec3(.95,.96,.9)),smoothstep(lip-.42,lip-.08,vShore)*smoothstep(.25,.6,fl)*.55*(1.-.4*uCalm));
   alpha=mix(1.,.5,smoothstep(-3.,.2,vShore))*smoothstep(lip,lip-.5,vShore);
   if(vShore>lip)discard;
 }
 gl_FragColor=vec4(col,alpha);
 #include <fog_fragment>
}`,
    });
    Object.assign(mat.uniforms, {
      uCalm: U.calm,
      uTime: U.time,
      uGold: U.gold,
      uSong: U.song,
      uMoonDir: U.moonDir,
      uCamPos: U.camPos,
    });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 2;
    m.frustumCulled = false;
    scene.add(m);
  }

  /* =====================================================================
     DISTANT MOUNTAINS and village lights
     ===================================================================== */
  function ridge(o: {
    z: number;
    x0: number;
    x1: number;
    hmax: number;
    seedK: number;
    color: string;
    rim: string;
    steps?: number;
    base?: number;
    curveZ?: number;
  }): void {
    const { z, x0, x1, hmax, seedK, color, rim, steps = 160, base = -3, curveZ = 0 } = o;
    const pos: number[] = [];
    const idx: number[] = [];
    const cols: number[] = [];
    const c1 = new THREE.Color(color);
    const c2 = new THREE.Color(rim);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(x0, x1, t);
      const env = Math.sin(Math.PI * t) ** 0.6;
      const h =
        (fbm(x * 0.02 + seedK, seedK, 4) * 1.4 - 0.25) * hmax * env +
        Math.exp(-(((t - 0.55) * 5) ** 2)) * hmax * 0.5;
      const zz = z + Math.sin(t * Math.PI) * curveZ;
      pos.push(x, base, zz, x, Math.max(h, 0.5), zz);
      cols.push(c1.r * 0.6, c1.g * 0.6, c1.b * 0.6, c2.r, c2.g, c2.b);
      if (i < steps) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    g.setIndex(idx);
    scene.add(
      new THREE.Mesh(
        g,
        new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, side: THREE.DoubleSide }),
      ),
    );
  }
  function buildDistance(): void {
    ridge({ z: -260, x0: -260, x1: 260, hmax: 44, seedK: 3.1, color: "#2b2440", rim: "#7a4a62" });
    ridge({ z: -175, x0: -60, x1: 200, hmax: 30, seedK: 7.7, color: "#1c2c40", rim: "#b8603f" });
    ridge({
      z: -95,
      x0: 30,
      x1: 150,
      hmax: 11,
      seedK: 1.3,
      color: "#123030",
      rim: "#2f5a44",
      curveZ: -10,
    });
    const n = 70;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = rr(10, 150);
      p[i * 3 + 1] = rr(0.6, 4);
      p[i * 3 + 2] = rr(-178, -170);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    scene.add(
      new THREE.Points(
        g,
        new THREE.PointsMaterial({
          color: new THREE.Color(2.2, 1.4, 0.6),
          size: 2.2,
          sizeAttenuation: false,
          fog: false,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    for (let i = 0; i < 7; i++) {
      const pm = makePalm(rr(7, 11), "#152a26");
      pm.position.set(rr(42, 70), rr(2, 5), rr(-98, -88));
      pm.scale.setScalar(rr(1.2, 1.6));
      pm.rotation.y = rnd() * 6;
      scene.add(pm);
    }
  }

  /* =====================================================================
     VEGETATION: palms, sea grape
     ===================================================================== */
  function makePalm(h: number, color: string): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
    });
    const tg = new THREE.CylinderGeometry(0.09, 0.16, h, 14, 16, true);
    const tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i) + h / 2;
      tp.setX(i, tp.getX(i) + (y / h) ** 2 * h * 0.18);
      tp.setY(i, y);
    }
    tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg, mat));
    const top = V3(h * 0.18, h, 0);
    for (let k = 0; k < 9; k++) {
      const fg = new THREE.PlaneGeometry(0.55, 2.8, 2, 14);
      const fp = fg.attributes.position;
      for (let i = 0; i < fp.count; i++) {
        const y = fp.getY(i) + 1.4;
        const x = fp.getX(i);
        fp.setXYZ(i, x * (1 - y / 3) * 1.2, y, 0);
        const a = y / 2.8;
        fp.setY(i, y * Math.cos(a * 0.9) * 0.9);
        fp.setZ(i, -(a * a) * 1.6);
      }
      fg.computeVertexNormals();
      const f = new THREE.Mesh(fg, mat);
      f.position.copy(top);
      f.rotation.y = (k / 9) * Math.PI * 2 + rr(-0.2, 0.2);
      f.rotation.x = -0.35;
      g.add(f);
    }
    return g;
  }

  const dummy = new THREE.Object3D();
  let leaves: THREE.InstancedMesh;
  const leafData: LeafData[] = [];
  function buildSeaGrape(): void {
    const g = new THREE.Group();
    scene.add(g);
    const bark = toon("#6e4a36");
    const base = V3(7.5, groundH(7.5, 6.2) - 0.1, 6.2);
    const branches = [
      [base, V3(7.1, 1.4, 5.8), V3(6.5, 2.5, 5.2), V3(5.5, 3.2, 4.6)],
      [V3(6.5, 2.5, 5.2), V3(5.7, 3.2, 3.8), V3(4.7, 3.5, 3.0), V3(3.7, 3.6, 2.6)],
      [V3(5.5, 3.2, 4.6), V3(4.6, 3.2, 5.6), V3(4.0, 3.0, 6.6), V3(3.6, 2.8, 7.4)],
      [V3(7.1, 1.4, 5.8), V3(7.9, 2.6, 4.8), V3(7.7, 3.6, 3.6), V3(6.9, 4.2, 2.6)],
      [V3(5.7, 3.2, 3.8), V3(6.1, 3.9, 2.8), V3(5.7, 4.5, 2.0)],
    ];
    const tips: V3[] = [];
    branches.forEach((pts, i) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 40, i === 0 ? 0.17 : 0.075, 12, false);
      const m = new THREE.Mesh(geo, bark);
      m.castShadow = true;
      g.add(m);
      for (let k = 0; k <= 12; k++) tips.push(curve.getPoint(0.25 + (0.75 * k) / 12));
    });
    const lg = new THREE.CircleGeometry(0.42, 20);
    const lp = lg.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      const x = lp.getX(i);
      const y = lp.getY(i);
      lp.setZ(i, x * x * 0.9 + y * y * 0.35);
    }
    lg.translate(0, 0.38, 0);
    lg.computeVertexNormals();
    const lm = new THREE.MeshLambertMaterial({ map: TEX_leaf, side: THREE.DoubleSide });
    const N = isSmall ? 150 : 230;
    leaves = new THREE.InstancedMesh(lg, lm, N);
    leaves.castShadow = true;
    for (let i = 0; i < N; i++) {
      const tp = tips[(rnd() * tips.length) | 0];
      const p = tp.clone().add(V3(rr(-0.7, 0.7), rr(-0.4, 0.5), rr(-0.7, 0.7)));
      const q = new THREE.Euler(rr(-1.2, 1.2), rr(0, 6.28), rr(-1, 1));
      const s = rr(0.75, 1.25);
      leafData.push({ p, q, s, ph: rnd() * 6.28 });
    }
    // A few leaves very close to the camera (frame, occlusion on the way back).
    for (const p of [
      V3(3.9, 3.05, 7.5),
      V3(4.5, 2.85, 7.9),
      V3(3.3, 3.3, 7.1),
      V3(5.0, 3.1, 7.2),
      V3(2.9, 3.45, 7.6),
    ]) {
      leafData.pop();
      leafData.unshift({
        p,
        q: new THREE.Euler(rr(0.6, 1.2), rr(0, 6), rr(-0.5, 0.5)),
        s: rr(1.1, 1.5),
        ph: rnd() * 6,
      });
    }
    g.add(leaves);
    const fg = new THREE.SphereGeometry(0.065, 10, 8);
    const fm = toon("#ffffff");
    const NF = isSmall ? 120 : 200;
    const fruits = new THREE.InstancedMesh(fg, fm, NF);
    const fc = new THREE.Color();
    const greens = ["#8fb54c", "#a9c25a", "#6e9a3c", "#7b3d5a", "#5b2c48", "#9b5d6a"];
    for (let i = 0; i < NF; i++) {
      const cl = (i / 8) | 0;
      const tp = tips[(cl * 7) % tips.length];
      const p = tp
        .clone()
        .add(V3(Math.sin(cl) * 0.3, -0.25 - (i % 8) * 0.07, Math.cos(cl * 1.7) * 0.3))
        .add(V3(rr(-0.06, 0.06), 0, rr(-0.06, 0.06)));
      dummy.position.copy(p);
      dummy.scale.setScalar(rr(0.8, 1.15));
      dummy.updateMatrix();
      fruits.setMatrixAt(i, dummy.matrix);
      fruits.setColorAt(i, fc.set(greens[(cl + (i % 3)) % greens.length]));
    }
    g.add(fruits);
    const pm = makePalm(6.5, "#2a4a33");
    pm.position.set(12.5, groundH(12.5, 10), 10);
    pm.rotation.y = -0.6;
    g.add(pm);
    const pm2 = makePalm(5.4, "#284636");
    pm2.position.set(17, groundH(17, 8.5), 8.5);
    pm2.rotation.y = 0.8;
    g.add(pm2);
  }
  function updateSeaGrape(t: number): void {
    for (let i = 0; i < leafData.length; i++) {
      const L = leafData[i];
      dummy.position.copy(L.p);
      dummy.rotation.set(
        L.q.x + Math.sin(t * 1.1 + L.ph) * 0.07,
        L.q.y + Math.sin(t * 0.7 + L.ph * 1.3) * 0.05,
        L.q.z + Math.sin(t * 1.6 + L.ph) * 0.06,
      );
      dummy.scale.setScalar(L.s);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;
  }

  /* =====================================================================
     ROCKS
     ===================================================================== */
  const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  addCaustics(rockMat);
  const ROCK_FOOT = new THREE.Color("#3d3f4b");
  const ROCK_CROWN = new THREE.Color("#73747f");
  const ROCK_WARM = new THREE.Color("#8a7f7c");
  const ROCK_ALGAE = new THREE.Color("#46594f");
  /**
   * A water-worn rock: the prototype's lumps (same noise, same draws) carried by a fine welded
   * sphere, so the light rolls over it; painted dark and damp at its foot, paler on its crown,
   * with worn warm patches and a little algae low down.
   */
  function rock(x: number, z: number, s: number, sink = 0.25): void {
    const raw = new THREE.IcosahedronGeometry(1, 3);
    raw.deleteAttribute("normal");
    raw.deleteAttribute("uv");
    const g = mergeVertices(raw);
    raw.dispose();
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const tint = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = V3(p.getX(i), p.getY(i), p.getZ(i));
      const up = v.y;
      const n = fbm(v.x * 1.3 + x, v.y * 1.3 + z, 3);
      const fine = fbm(v.x * 4.1 + z, v.z * 4.1 + x + v.y * 2.3, 2);
      tint.copy(ROCK_FOOT).lerp(ROCK_CROWN, smooth(-0.5, 0.75, up));
      tint.lerp(ROCK_WARM, smooth(0.5, 0.8, fine) * smooth(-0.1, 0.6, up) * 0.6);
      tint.lerp(ROCK_ALGAE, smooth(0.45, 0.75, n) * smooth(0.2, -0.6, up) * 0.7);
      tint.multiplyScalar(0.92 + fine * 0.16);
      tint.toArray(colors, i * 3);
      v.multiplyScalar(0.75 + n * 0.6 + (fine - 0.5) * 0.05);
      p.setXYZ(i, v.x, v.y * 0.72, v.z);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, rockMat);
    m.scale.set(s * rr(0.9, 1.4), s, s * rr(0.9, 1.3));
    m.rotation.y = rnd() * 6;
    m.position.set(x, groundH(x, z) + s * 0.72 - sink * s, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    if (groundH(x, z) > 0.05) beachRocks.push([x, z, s]);
  }
  const beachRocks: [number, number, number][] = [];
  /**
   * Tufts of beach grass in the lee of the rocks on the sand, and fireflies under the sea grape and
   * the palms. Their own RNG: the prototype's draws, and so its layout, are untouched.
   */
  function buildBeachLife(): void {
    const own = createRng(97);
    const blades: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 7; k++) {
      const h = 0.2 + own() * 0.16;
      const blade = new THREE.PlaneGeometry(0.035, h, 1, 4);
      const bp = blade.attributes.position;
      const lean = 0.25 + own() * 0.5;
      for (let i = 0; i < bp.count; i++) {
        const t = bp.getY(i) / h + 0.5;
        bp.setXYZ(i, bp.getX(i) * (1 - t * 0.85), t * h, t * t * h * lean);
      }
      blade.rotateY(k * 2.4 + own());
      blade.translate((own() - 0.5) * 0.08, 0, (own() - 0.5) * 0.08);
      blade.computeVertexNormals();
      blades.push(blade);
    }
    const tuftGeo = mergeGeometries(blades);
    for (const blade of blades) blade.dispose();
    const perRock = 2;
    const grass = new THREE.InstancedMesh(
      tuftGeo,
      new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
      beachRocks.length * perRock,
    );
    const tint = new THREE.Color();
    let n = 0;
    for (const [x, z, sz] of beachRocks) {
      for (let k = 0; k < perRock; k++) {
        // one tuft at each flank of the rock, a little to landward: beside it, never across it
        const a = (k ? Math.PI : 0) + (k ? -1 : 1) * (0.25 + own() * 0.45);
        const r = sz * (1.25 + own() * 0.3);
        const gx = x + Math.cos(a) * r;
        const gz = z + Math.sin(a) * r;
        dummy.position.set(gx, groundH(gx, gz) - 0.01, gz);
        dummy.rotation.set(0, own() * 6.28, 0);
        dummy.scale.setScalar(0.55 + own() * 0.45);
        dummy.updateMatrix();
        grass.setMatrixAt(n, dummy.matrix);
        grass.setColorAt(n, tint.set(own() < 0.5 ? "#8f9a52" : "#a39a58"));
        n++;
      }
    }
    grass.receiveShadow = true;
    scene.add(grass);
    const haunts: [number, number, number, number][] = [
      [5.6, 2.2, 4.6, 2.6],
      [7.2, 1.6, 6.4, 1.6],
      [12.5, 1.8, 10, 1.8],
      [17, 1.6, 8.5, 1.6],
    ];
    fireflies = glowPoints(
      own,
      44,
      (i) => {
        const [x, y, z, r] = haunts[i % haunts.length];
        return [x + (own() - 0.5) * 2 * r, y + (own() - 0.5) * 1.6, z + (own() - 0.5) * 2 * r];
      },
      { size: 0.3, drift: reduceMotion ? 0 : 0.6, a: "#fff0a0", b: "#d2ff9c" },
    );
    scene.add(fireflies);
  }
  let fireflies: GlowPoints;

  /* =====================================================================
     A FISHERMAN'S CANOE far out, towards the horizon of page 4
     ===================================================================== */
  /** Where the canoe lies at anchor: seen from page 4 between the headland and Mila. */
  const BOAT_AT = V3(45, 0, -15);
  let boat: { g: THREE.Group; rod: THREE.Group; glow: THREE.Sprite } | null = null;
  /**
   * A painted canoe with one fisherman, a line out and a lantern at the bow: it rides the swell,
   * swings a little on its anchor, and the man lifts his rod now and then.
   */
  function buildBoat(): void {
    const g = new THREE.Group();
    // hull: the lower half of a stretched sphere, pinched to a point at both ends, with sheer
    const hull = new THREE.SphereGeometry(1, 36, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const hp = hull.attributes.position;
    const colors = new Float32Array(hp.count * 3);
    const paint = [
      new THREE.Color("#f3ead8"),
      new THREE.Color("#c8463a"),
      new THREE.Color("#2c6f96"),
    ];
    for (let i = 0; i < hp.count; i++) {
      const xn = hp.getX(i);
      const y = hp.getY(i);
      const pinch = 0.3 + 0.7 * (1 - Math.abs(xn) ** 1.6);
      hp.setXYZ(i, xn * 2.3, y * 0.5 + 0.2 * xn * xn, hp.getZ(i) * 0.58 * pinch);
      // white gunwale, a red stripe, then the blue of the hull
      paint[y > -0.14 ? 0 : y > -0.3 ? 1 : 2].toArray(colors, i * 3);
    }
    hull.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    hull.computeVertexNormals();
    const wood = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(hull, wood));
    const plain = (color: string): THREE.MeshLambertMaterial =>
      new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
    // thwarts
    for (const x of [-0.9, 0.2, 1.1]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.85), plain("#8a6a44"));
      bench.position.set(x, -0.08, 0);
      g.add(bench);
    }
    // the fisherman, seated aft, under a wide straw hat
    const man = new THREE.Group();
    man.position.set(-0.9, 0, 0);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 4, 10), plain("#31475a"));
    body.position.y = 0.3;
    body.rotation.z = -0.12;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), plain("#5a3323"));
    head.position.set(0.05, 0.72, 0);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.16, 18), plain("#d9b871"));
    hat.position.set(0.05, 0.86, 0);
    man.add(body, head, hat);
    // his rod, hinged at his hands, and the line that drops from its tip
    const rod = new THREE.Group();
    rod.position.set(0.2, 0.42, 0.12);
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 2.2, 6), plain("#6b4b2c"));
    cane.position.y = 1.1;
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.5, 4), plain("#e8e2d0"));
    line.position.set(0.7, 1.95, 0);
    line.rotation.z = Math.PI / 2 - 0.25;
    rod.add(cane, line);
    rod.rotation.z = -1.0;
    man.add(rod);
    g.add(man);
    // the lantern at the bow: a small flame the dusk picks up from the shore
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), plain("#6b4b2c"));
    post.position.set(1.85, 0.42, 0);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.7) }),
    );
    flame.position.set(1.85, 0.82, 0);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(1.5, 0.95, 0.45),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.position.copy(flame.position);
    glow.scale.setScalar(1.6);
    g.add(post, flame, glow);
    g.position.copy(BOAT_AT);
    g.rotation.y = 0.5;
    // a little larger than life, so it reads as a canoe from the beach
    g.scale.setScalar(1.4);
    scene.add(g);
    boat = { g, rod, glow };
  }
  /** The canoe on the swell (the sea shader's two long waves), swinging at anchor. */
  function updateBoat(t: number): void {
    if (!boat) return;
    const calm = 1 - 0.72 * U.calm.value;
    const x = BOAT_AT.x + Math.sin(t * 0.05) * 1.4;
    const z = BOAT_AT.z + Math.cos(t * 0.037) * 1.1;
    const swell =
      (Math.sin(x * 0.17 + z * 0.52 + t * 0.9) * 0.09 +
        Math.sin(-x * 0.31 + z * 0.86 + t * 1.35) * 0.05) *
      calm;
    boat.g.position.set(x, swell + 0.12, z);
    boat.g.rotation.set(
      Math.sin(t * 1.1) * 0.05 * calm,
      0.5 + Math.sin(t * 0.06) * 0.25,
      Math.cos(x * 0.17 + z * 0.52 + t * 0.9) * 0.06 * calm,
    );
    // now and then he lifts the rod, then lets it down again
    const lift = Math.max(0, Math.sin(t * 0.45)) ** 6;
    boat.rod.rotation.z = -1.0 + lift * 0.45;
    boat.glow.scale.setScalar(1.6 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 3.1) * 0.06);
  }
  function buildRocks(): void {
    for (const [x, z, sz] of SHORE_ROCKS) rock(x, z, sz);
    rock(1.2, 3.9, 0.28);
    rock(0.6, 4.4, 0.18);
    // the crab's cove
    rock(16.1, 3.4, 0.5);
    rock(16.6, 5.0, 0.42);
    rock(15.4, 1.8, 0.32);
    rock(13.6, 6.0, 0.3);
    rock(17.6, 2.5, 0.45);
    rock(10.6, 7.6, 0.36);
    // the rock hiding the way from page 3 to 4
    rock(10.4, 5.2, 0.5);
    for (let i = 0, n = 0; i < 80 && n < 16; i++) {
      const a = rnd() * 6.28;
      const r = rr(5, 13);
      const x = MEADOW.x + Math.cos(a) * r;
      const z = MEADOW.z + Math.sin(a) * r;
      if (isClear(x, z)) {
        rock(x, z, rr(0.4, 1.1), 0.4);
        n++;
      }
    }
    for (let i = 0, n = 0; i < 80 && n < 12; i++) {
      const a = rnd() * 6.28;
      const r = rr(3.5, 10);
      const x = DEEP.x + Math.cos(a) * r;
      const z = DEEP.z + Math.sin(a) * r;
      if (isClear(x, z)) {
        rock(x, z, rr(0.5, 1.5), 0.4);
        n++;
      }
    }
  }

  /* =====================================================================
     CONCH: procedural spiral shell (spikes, flared lip, pink inside)
     ===================================================================== */
  function fixNormals(geo: THREE.BufferGeometry): void {
    const n = geo.attributes.normal;
    for (let i = 0; i < n.count; i++) {
      const x = n.getX(i);
      const y = n.getY(i);
      const z = n.getZ(i);
      const l = Math.hypot(x, y, z);
      if (!(l > 1e-6)) n.setXYZ(i, 0, 1, 0);
      else n.setXYZ(i, x / l, y / l, z / l);
    }
    n.needsUpdate = true;
  }
  function conchGeometry({
    outer = "#efd9bd",
    band = "#c49a6e",
    lipCol = "#f3aaa2",
    inA = "#ffd5c4",
    inB = "#e86f80",
    knobs = 9,
    rows = 72,
    segs = 72,
  } = {}): THREE.BufferGeometry {
    const pos: number[] = [];
    const col: number[] = [];
    const inn: number[] = [];
    const idx: number[] = [];
    const cO = new THREE.Color(outer);
    const cB = new THREE.Color(band);
    const cL = new THREE.Color(lipCol);
    const iA = new THREE.Color(inA);
    const iB = new THREE.Color(inB);
    const c = new THREE.Color();
    const ci = new THREE.Color();
    const profile: [number, number][] = [
      [0, 1.0],
      [0.06, 0.93],
      [0.12, 0.86],
      [0.19, 0.79],
      [0.27, 0.72],
      [0.38, 0.64],
      [0.47, 0.55],
      [0.5, 0.44],
      [0.47, 0.3],
      [0.41, 0.13],
      [0.33, -0.06],
      [0.24, -0.27],
      [0.15, -0.47],
      [0.085, -0.63],
      [0.045, -0.76],
      [0, -0.82],
    ];
    const prof = new THREE.CatmullRomCurve3(
      profile.map(([r, y]) => V3(r, y, 0)),
      false,
      "centripetal",
    );
    const tab: [number, number][] = [];
    for (let k = 0; k <= 400; k++) {
      const q = prof.getPoint(k / 400);
      tab.push([q.y, q.x]);
    }
    const rAt = (y: number): number => {
      for (let k = 1; k < tab.length; k++) {
        if (tab[k][0] <= y) {
          const [y1, r1] = tab[k - 1];
          const [y2, r2] = tab[k];
          return lerp(r1, r2, (y - y1) / (y2 - y1 || 1));
        }
      }
      return 0;
    };
    const Y0 = -0.6;
    const Y1 = 0.5;
    const hw = (y: number): number =>
      y < Y0 || y > Y1 ? 0 : 0.5 * Math.pow(Math.sin((Math.PI * (y - Y0)) / (Y1 - Y0)), 0.55);
    const P = V3();
    const W = segs + 1;
    const surf = (y: number, th: number, r0: number): V3 => {
      let r = r0;
      const kb = Math.exp(-(((y - 0.6) / 0.07) ** 2));
      r += 0.12 * kb * Math.pow(Math.max(0, Math.cos(th * knobs + y * 6)), 6);
      const sp = smooth(0.58, 0.7, y);
      r *= 1 - conchGroove(th, y, sp);
      return V3(r * Math.cos(th), y, r * Math.sin(th));
    };
    for (let i = 0; i <= rows; i++) {
      prof.getPoint(i / rows, P);
      const y = P.y;
      const r0 = P.x;
      for (let j = 0; j <= segs; j++) {
        const th = -Math.PI + (j / segs) * Math.PI * 2;
        const q = surf(y, th, r0);
        pos.push(q.x, q.y, q.z);
        const bandN = 0.5 + 0.5 * Math.sin(y * 26 + fbm(th * 2, y * 4, 2) * 5);
        const nearSlit =
          smooth(1.3, 0.35, Math.abs(th)) * smooth(0.62, 0.3, y) * smooth(-0.75, -0.4, y);
        c.copy(cO)
          .lerp(cB, bandN * 0.4 * smooth(-0.7, 0.2, y))
          .lerp(cL, nearSlit * 0.55);
        col.push(c.r, c.g, c.b);
        ci.copy(iA).lerp(
          iB,
          smooth(0.3, 0, Math.abs(th)) * 0.4 +
            smooth(0.4, -0.2, y) * 0.4 +
            fbm(th * 3, y * 3, 2) * 0.2,
        );
        inn.push(ci.r, ci.g, ci.b);
      }
    }
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < segs; j++) {
        const ym = lerp(prof.getPoint(i / rows).y, prof.getPoint((i + 1) / rows).y, 0.5);
        const thm = -Math.PI + ((j + 0.5) / segs) * Math.PI * 2;
        if (Math.abs(thm) < hw(ym)) continue;
        const a = i * W + j;
        const b = a + W;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    // flared lip on the +θ side of the slit, rising as a wing above the shoulder
    const base = pos.length / 3;
    const LR = 40;
    const LC = 10;
    const edge: V3[] = [];
    const lipLight = new THREE.Color("#ffe6d8");
    for (let i = 0; i <= LR; i++) {
      const y = lerp(Y0 + 0.02, Y1 + 0.04, i / LR);
      const t = (y - Y0) / (Y1 - Y0);
      const r0 = rAt(y);
      const th = Math.max(hw(y), 0.06);
      const E = surf(y, th, r0);
      const O = V3(Math.cos(th), 0, Math.sin(th));
      const T = V3(-Math.sin(th), 0, Math.cos(th));
      const L =
        0.42 * Math.pow(Math.sin(Math.PI * clamp(t * 0.92 + 0.04, 0, 1)), 0.7) +
        0.18 * smooth(0.6, 1, t);
      for (let k = 0; k <= LC; k++) {
        const w = k / LC;
        const q = E.clone()
          .addScaledVector(O, (0.55 * w - 0.12 * Math.sin(Math.PI * w)) * L)
          .addScaledVector(T, 0.75 * w * L);
        q.y += 0.28 * w * w * smooth(0.55, 1, t) - 0.06 * w * smooth(0.4, 0, t);
        pos.push(q.x, q.y, q.z);
        c.copy(cO).lerp(cL, 0.35 + 0.45 * w);
        col.push(c.r, c.g, c.b);
        ci.copy(iA)
          .lerp(iB, 0.25 + 0.5 * (1 - w))
          .lerp(lipLight, w * w * 0.5);
        inn.push(ci.r, ci.g, ci.b);
        if (k === LC) edge.push(q.clone());
      }
    }
    const lipIdx: number[] = [];
    for (let i = 0; i < LR; i++)
      for (let k = 0; k < LC; k++) {
        const a = base + i * (LC + 1) + k;
        const b = a + LC + 1;
        lipIdx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    {
      const at = (k: number): V3 => V3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
      const k0 = base + 20 * (LC + 1) + 5;
      const pa = at(k0);
      const pb = at(k0 + LC + 1);
      const pc = at(k0 + 1);
      const n = pb.sub(pa).cross(pc.sub(pa));
      if (n.x > 0)
        for (let q = 0; q < lipIdx.length; q += 3) {
          const t = lipIdx[q + 1];
          lipIdx[q + 1] = lipIdx[q + 2];
          lipIdx[q + 2] = t;
        }
    }
    idx.push(...lipIdx);
    // thick roll along the lip's edge
    const tg = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(edge),
      edge.length * 3,
      0.028,
      8,
      false,
    );
    const tp = tg.attributes.position;
    const b0 = pos.length / 3;
    for (let q = 0; q < tp.count; q++) {
      pos.push(tp.getX(q), tp.getY(q), tp.getZ(q));
      c.copy(cL).lerp(cO, 0.25);
      col.push(c.r, c.g, c.b);
      inn.push(c.r, c.g, c.b);
    }
    const ti = tg.index;
    if (ti) for (let q = 0; q < ti.count; q++) idx.push(ti.getX(q) + b0);
    tg.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute("aInner", new THREE.Float32BufferAttribute(inn, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    fixNormals(geo);
    geo.computeBoundingBox();
    const bb = geo.boundingBox as THREE.Box3;
    const ctr = bb.getCenter(V3());
    const sz = bb.getSize(V3());
    geo.translate(-ctr.x, -ctr.y, -ctr.z);
    const sc = 1 / Math.max(sz.x, sz.y, sz.z);
    geo.scale(sc, sc, sc);
    return geo;
  }
  function conchMaterial(glowU: Uniform<number>): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = glowU;
      sh.uniforms.uTime = U.time;
      sh.vertexShader =
        "attribute vec3 aInner;varying vec3 vInner;\n" +
        sh.vertexShader.replace(
          "#include <color_vertex>",
          "#include <color_vertex>\nvInner=aInner;",
        );
      sh.fragmentShader =
        "varying vec3 vInner;uniform float uGlow;uniform float uTime;\n" +
        sh.fragmentShader
          .replace(
            "#include <color_fragment>",
            "#include <color_fragment>\nif(!gl_FrontFacing) diffuseColor.rgb=vInner;",
          )
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\nif(!gl_FrontFacing) totalEmissiveRadiance+=vInner*uGlow*(.75+.25*sin(uTime*2.6));",
          );
    };
    return m;
  }

  /* =====================================================================
     MILA
     ===================================================================== */
  function limb(a: V3, b: V3, r: number, mat: THREE.Material): THREE.Mesh {
    const d = b.clone().sub(a);
    const len = d.length();
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 0.4), 4, 10),
      mat,
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
    m.castShadow = true;
    return m;
  }
  /** One skinned mesh bending at its joints; axis +1 for arms (up), -1 for legs (down). */
  function skinnedLimb(
    mat: THREE.Material,
    o: { lens: number[]; radii: number[]; axis?: number; offsets?: (t: number) => number },
  ): { mesh: THREE.SkinnedMesh; bones: THREE.Bone[] } {
    const { lens, radii, axis = 1, offsets } = o;
    const radial = 16;
    const rings = 40;
    const blend = 0.035;
    const total = lens.reduce((a, b) => a + b, 0);
    const pos: number[] = [];
    const si: number[] = [];
    const sw: number[] = [];
    const idx: number[] = [];
    const rAt = (t: number): number => {
      const f = t * (radii.length - 1);
      const i = Math.min(radii.length - 2, Math.floor(f));
      const u = f - i;
      const k = u * u * (3 - 2 * u);
      return lerp(radii[i], radii[i + 1], k);
    };
    const cuts: number[] = [];
    let acc = 0;
    for (let b = 0; b < lens.length - 1; b++) {
      acc += lens[b];
      cuts.push(acc);
    }
    const off = offsets ?? ((): number => 0);
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const d = -0.012 + t * (total + 0.016);
      const r = rAt(clamp(d / total, 0, 1));
      let bone = 0;
      for (const c of cuts) if (d > c) bone++;
      let w = [0, 0, 0, 0];
      w[bone] = 1;
      for (let b = 0; b < cuts.length; b++) {
        const k = smooth(cuts[b] - blend, cuts[b] + blend, d);
        if (Math.abs(d - cuts[b]) < blend) {
          w = [0, 0, 0, 0];
          w[b] = 1 - k;
          w[b + 1] = k;
        }
      }
      const zoff = off(t);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        pos.push(Math.cos(a) * r, axis * d, Math.sin(a) * r + zoff);
        const ids = [0, 1, 2, 3].sort((p, q) => w[q] - w[p]);
        si.push(...ids);
        sw.push(...ids.map((q) => w[q]));
      }
    }
    const W = radial + 1;
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * W + j;
        const b = a + W;
        if (axis > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    const bones: THREE.Bone[] = [];
    let parent: THREE.Object3D = mesh;
    for (let b = 0; b < lens.length + 1; b++) {
      const bn = new THREE.Bone();
      bn.position.y = b === 0 ? 0 : axis * lens[b - 1];
      parent.add(bn);
      bones.push(bn);
      parent = bn;
    }
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    return { mesh, bones };
  }
  /** Tapered tube (arms, fingers, neck). */
  function taper(
    pts: V3[],
    radii: number[],
    mat: THREE.Material,
    seg = 22,
    rad = 14,
    caps = true,
  ): THREE.Group {
    const c = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const fr = c.computeFrenetFrames(seg, false);
    const pos: number[] = [];
    const idx: number[] = [];
    const rAt = (t: number): number => {
      const f = t * (radii.length - 1);
      const i = Math.min(radii.length - 2, Math.floor(f));
      const u = f - i;
      const k = u * u * (3 - 2 * u);
      return lerp(radii[i], radii[i + 1], k);
    };
    const P = V3();
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      c.getPointAt(t, P);
      const r = rAt(t);
      const N = fr.normals[i];
      const B = fr.binormals[i];
      for (let j = 0; j <= rad; j++) {
        const a = (j / rad) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        pos.push(
          P.x + (N.x * ca + B.x * sa) * r,
          P.y + (N.y * ca + B.y * sa) * r,
          P.z + (N.z * ca + B.z * sa) * r,
        );
      }
    }
    const W = rad + 1;
    for (let i = 0; i < seg; i++)
      for (let j = 0; j < rad; j++) {
        const a = i * W + j;
        const b = a + W;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    fixNormals(g);
    const grp = new THREE.Group();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    grp.add(m);
    if (caps) {
      for (const [t, r] of [
        [0, radii[0]],
        [1, radii[radii.length - 1]],
      ]) {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 14, 10), mat);
        c.getPointAt(t, sp.position);
        grp.add(sp);
      }
    }
    return grp;
  }
  /** Warm rim light detaching the silhouette from the night. */
  function withRim<M extends THREE.Material>(
    mat: M,
    color = "#ffb27a",
    k = 0.45,
    extraV = "",
    extraHead = "",
  ): M {
    const rc = new THREE.Color(color);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = { value: rc };
      sh.uniforms.uRimK = { value: k };
      sh.uniforms.uTime = U.time;
      sh.uniforms.uWind = U.wind;
      sh.uniforms.uSwim = U.swimD;
      if (extraV)
        sh.vertexShader =
          extraHead +
          sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n" + extraV);
      sh.fragmentShader =
        "uniform vec3 uRim;uniform float uRimK;\n" +
        sh.fragmentShader.replace(
          "#include <opaque_fragment>",
          `float fr=pow(1.-clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.),2.6);outgoingLight+=uRim*fr*uRimK*(.4+.6*smoothstep(-.2,.6,normal.y+.3));
#include <opaque_fragment>`,
        );
    };
    // Each rim variant compiles its own program.
    mat.customProgramCacheKey = () => `rim:${color}:${k}:${extraV.length}`;
    return mat;
  }

  /** Sculpted head: jaw, chin, full cheeks, eye sockets, back of the skull. */
  function sculpt(v: V3): V3 {
    let x = v.x;
    let y = v.y;
    let z = v.z;
    const out = V3();
    const jaw = smooth(-0.05, -1, y);
    x *= 1 - jaw * 0.27;
    z *= 1 - jaw * 0.1;
    if (y < -0.3 && z > 0) z += 0.05 * Math.exp(-((x / 0.32) ** 2 + ((y + 0.82) / 0.22) ** 2));
    let bump = 0;
    for (const sx of [-1, 1]) {
      bump +=
        0.032 *
        Math.exp(
          -(((x - sx * 0.5) / 0.25) ** 2 + ((y + 0.3) / 0.22) ** 2 + ((z - 0.7) / 0.32) ** 2),
        );
      bump -=
        0.045 *
        Math.exp(
          -(((x - sx * 0.35) / 0.15) ** 2 + ((y - 0.06) / 0.12) ** 2 + ((z - 0.9) / 0.2) ** 2),
        );
    }
    bump += 0.025 * Math.exp(-((x / 0.5) ** 2 + ((y - 0.42) / 0.2) ** 2 + ((z - 0.85) / 0.3) ** 2));
    if (z < 0) {
      z *= 1.1;
      y += z * z * 0.04;
    }
    bump += 0.075 * Math.exp(-((x / 0.3) ** 2 + ((y + 0.24) / 0.3) ** 2 + ((z - 0.92) / 0.3) ** 2));
    out.set(x * 0.87, y * 1.04, z * 0.97).addScaledVector(v, bump);
    return out;
  }
  const HEAD_R = 0.126;
  function headPoint(dir: V3): { p: V3; n: V3 } {
    const d = dir.clone().normalize();
    const p = sculpt(d).multiplyScalar(HEAD_R);
    const e1 = V3(0, 1, 0).cross(d).normalize();
    if (e1.lengthSq() < 0.1) e1.set(1, 0, 0);
    const e2 = d.clone().cross(e1).normalize();
    const p1 = sculpt(d.clone().addScaledVector(e1, 0.01).normalize())
      .multiplyScalar(HEAD_R)
      .sub(p);
    const p2 = sculpt(d.clone().addScaledVector(e2, 0.01).normalize())
      .multiplyScalar(HEAD_R)
      .sub(p);
    const n = p2.clone().cross(p1).normalize();
    if (n.dot(d) < 0) n.negate();
    return { p, n };
  }
  function onHead(dir: V3, lift = 0): THREE.Group {
    const { p, n } = headPoint(dir);
    const g = new THREE.Group();
    g.position.copy(p).addScaledVector(n, lift);
    // local frame: z = normal, x = horizontal
    const xAxis = V3(0, 1, 0).cross(n).normalize();
    if (xAxis.x < 0 && dir.x >= -0.2) xAxis.negate();
    if (dir.x < -0.2 && xAxis.z < 0) xAxis.negate();
    const yAxis = n.clone().cross(xAxis).normalize();
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, n));
    return g;
  }
  const arc = (a: V3, b: V3, c: V3, r: number, mat: THREE.Material): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, b, c), 16, r, 6, false),
      mat,
    );
  /** Hand holding the conch: palm towards the target, fingers curled. */
  function makeHand(mat: THREE.Material, matL: THREE.Material): THREE.Group {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), mat);
    palm.scale.set(1.05, 1.15, 0.55);
    h.add(palm);
    for (let k = 0; k < 4; k++) {
      const x = -0.0135 + k * 0.009;
      const L = [0.85, 1, 0.95, 0.75][k];
      h.add(
        taper(
          [V3(x, 0.02, 0.002), V3(x, 0.02 + 0.014 * L, 0.008), V3(x, 0.02 + 0.017 * L, 0.02)],
          [0.0066, 0.006, 0.0054],
          matL,
          8,
          8,
        ),
      );
    }
    h.add(
      taper(
        [V3(0.02, -0.006, 0.004), V3(0.026, 0.004, 0.014), V3(0.022, 0.012, 0.022)],
        [0.0074, 0.0064, 0.0056],
        matL,
        8,
        8,
      ),
    );
    return h;
  }

  function buildMila(): MilaRig {
    const g = new THREE.Group();
    const pose = new THREE.Group();
    pose.position.y = 0.62;
    g.add(pose);
    const inner = new THREE.Group();
    inner.position.y = -0.62;
    pose.add(inner);
    const body = new THREE.Group();
    inner.add(body);
    const SKIN = "#6b3a26";
    const skin = withRim(toonSoft(SKIN), "#ffb27a", 0.4);
    const skinL = withRim(toonSoft("#7b4630"), "#ffb27a", 0.4);
    const dark = toon("#1c0e09");
    const lipU = toonSoft("#6e3129");
    const lipD = toonSoft("#83402f");
    const white = toon("#f2ebe0");
    const hairM = withRim(
      new THREE.MeshToonMaterial({
        color: new THREE.Color("#ffffff"),
        map: TEX_hair,
        gradientMap: softRamp,
        side: THREE.DoubleSide,
      }),
      "#c98a5a",
      0.35,
    );
    // crumpled paper dress, flounces moving in the wind
    const dressMat = withRim(
      new THREE.MeshToonMaterial({
        color: new THREE.Color("#ffffff"),
        map: TEX_dress,
        gradientMap: softRamp,
        side: THREE.DoubleSide,
      }),
      "#ffd27a",
      0.35,
      // On the sand each flounce flutters at its own hem (aHem). In the water the dress moves as
      // one garment: what narrows and sways it is the height along the whole dress (whole), the
      // same for every flounce at a given height, so the tiers stay nested and never part.
      `float an=atan(transformed.z,transformed.x);float w=1.+uWind*(2.5-uSwim*1.8);
      float whole=clamp((${DRESS[0][0].toFixed(3)}-position.y)/${(DRESS[0][0] - DRESS[DRESS.length - 1][1]).toFixed(3)},0.,1.);
      float hem=mix(aHem,whole,uSwim);float hh=hem*hem;
      transformed.xz*=mix(1.,.72,uSwim*whole);transformed.y-=uSwim*whole*.05;
      transformed.x+=(sin(uTime*2.2+an*3.*(1.-uSwim)+transformed.y*9.)*.016+.022*(1.-uSwim)+uWind*.05*(1.-uSwim*.7))*hh*w;
      transformed.z+=cos(uTime*1.8+an*2.*(1.-uSwim))*.012*hh*w;
      transformed.y+=sin(uTime*3.+an*4.*(1.-uSwim))*.012*hh*uWind;`,
      "attribute float aHem;uniform float uTime;uniform float uWind;uniform float uSwim;\n",
    );
    for (const L of DRESS) {
      const m = new THREE.Mesh(flounce(...L), dressMat);
      m.castShadow = true;
      body.add(m);
    }
    const strapM = withRim(toon("#d98d1f"), "#ffd27a", 0.3);
    for (const sx of [-1, 1])
      body.add(
        taper(
          [V3(sx * 0.044, 0.912, 0.066), V3(sx * 0.076, 0.945, 0.005), V3(sx * 0.05, 0.91, -0.066)],
          [0.009, 0.01, 0.009],
          strapM,
          14,
          8,
          false,
        ),
      );
    // shaped legs (knee, calf, ankle) and feet with toes
    const legs: Leg[] = [];
    for (const sx of [-1, 1]) {
      const L = skinnedLimb(skin, {
        lens: [0.245, 0.222],
        axis: -1,
        radii: [0.041, 0.037, 0.032, 0.028, 0.03, 0.031, 0.026, 0.02, 0.018],
        offsets: (t) =>
          0.012 * Math.sin(Math.PI * clamp(t * 2, 0, 1)) -
          0.012 * Math.sin(Math.PI * clamp(t * 2 - 1, 0, 1)),
      });
      L.mesh.position.set(sx * 0.05, 0.52, 0);
      inner.add(L.mesh);
      const [hip, knee, ankle] = L.bones;
      const ft = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 10), skin);
      ft.scale.set(0.6, 0.36, 1.42);
      ft.position.set(0, -0.024, 0.03);
      ankle.add(ft);
      const heel = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 8), skin);
      heel.position.set(0, -0.016, -0.012);
      ankle.add(heel);
      for (let k = 0; k < 5; k++) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.0078 - k * 0.0008, 8, 6), skinL);
        t.position.set((k - 2) * 0.0078 * -sx + 0.002 * sx, -0.03, 0.093 - Math.abs(k - 1) * 0.004);
        ankle.add(t);
      }
      legs.push({ hip, knee, ankle, sx, prevC: 0 });
    }
    // neck, shoulders, tapered arms
    body.add(
      taper(
        [V3(0, 0.87, -0.004), V3(0, 0.95, -0.01), V3(0, 1.02, -0.016)],
        [0.038, 0.03, 0.032],
        skin,
        10,
        14,
      ),
    );
    for (const sx of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.0285, 14, 10), skin);
      sh.position.set(sx * 0.098, 0.896, 0);
      body.add(sh);
    }
    const conchPos = V3(0.18, 1.125, -0.04);
    const arms: Arm[] = [-1, 1].map((sd) => {
      const L1 = 0.145;
      const L2 = 0.135;
      const lim = skinnedLimb(skin, {
        lens: [L1, L2],
        axis: 1,
        radii: [0.029, 0.027, 0.024, 0.021, 0.0195, 0.019, 0.017, 0.015],
      });
      lim.mesh.position.set(sd * 0.098, 0.896, 0);
      body.add(lim.mesh);
      const hand = makeHand(skin, skinL);
      hand.scale.setScalar(0.88);
      body.add(hand);
      return { sd, L1, L2, sh: lim.bones[0], el: lim.bones[1], hand, S: V3(sd * 0.098, 0.896, 0) };
    });
    // pendant cord (seen when the conch hangs at her neck)
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.0028, 6, 40), toon("#3a2214"));
    cord.position.set(0, 0.935, 0.012);
    cord.rotation.x = Math.PI / 2 - 0.45;
    cord.scale.set(1, 1.15, 1);
    body.add(cord);
    // sculpted head
    const head = new THREE.Group();
    head.position.set(0, 1.115, 0);
    body.add(head);
    const hg = new THREE.SphereGeometry(1, 64, 48);
    const hp = hg.attributes.position;
    const hc = new Float32Array(hp.count * 3);
    const cS = new THREE.Color(SKIN);
    const cB = new THREE.Color("#8d4636");
    const cD = new THREE.Color("#4f2919");
    const tc = new THREE.Color();
    const vv = V3();
    for (let i = 0; i < hp.count; i++) {
      vv.set(hp.getX(i), hp.getY(i), hp.getZ(i));
      const q = sculpt(vv).multiplyScalar(HEAD_R);
      hp.setXYZ(i, q.x, q.y, q.z);
      let blush = 0;
      for (const sx of [-1, 1])
        blush +=
          Math.exp(-(((vv.x - sx * 0.5) / 0.2) ** 2 + ((vv.y + 0.3) / 0.17) ** 2)) *
          (vv.z > 0 ? 1 : 0);
      const sock =
        Math.exp(-(((Math.abs(vv.x) - 0.35) / 0.16) ** 2 + ((vv.y - 0.1) / 0.1) ** 2)) *
        (vv.z > 0.5 ? 1 : 0);
      tc.copy(cS)
        .lerp(cB, Math.min(1, blush) * 0.28)
        .lerp(cD, sock * 0.18);
      hc[i * 3] = tc.r;
      hc[i * 3 + 1] = tc.g;
      hc[i * 3 + 2] = tc.b;
    }
    hg.setAttribute("color", new THREE.BufferAttribute(hc, 3));
    hg.computeVertexNormals();
    const headM = withRim(toonSoft("#ffffff", { vertexColors: true }), "#ffb27a", 0.4);
    const sk = new THREE.Mesh(hg, headM);
    sk.castShadow = true;
    head.add(sk);
    // broad soft nose
    const nose = onHead(V3(0, -0.14, 1), -0.004);
    nose.add(
      taper(
        [V3(0, 0.026, -0.01), V3(0, 0.014, 0.002), V3(0, 0.003, 0.01)],
        [0.0055, 0.0072, 0.0092],
        skin,
        8,
        10,
        false,
      ),
    );
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 14, 10), skin);
    tip.scale.set(1.5, 0.95, 0.85);
    tip.position.set(0, -0.004, 0.012);
    nose.add(tip);
    const nostril = toonSoft("#3b1c12");
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 8), skin);
      w.position.set(sx * 0.0125, -0.008, 0.003);
      nose.add(w);
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 8, 6), nostril);
      n.scale.set(1.5, 0.55, 1);
      n.position.set(sx * 0.0078, -0.0152, 0.007);
      nose.add(n);
    }
    head.add(nose);
    // full lips
    const mouth = onHead(V3(0, -0.47, 0.88), -0.002);
    const ul = new THREE.Mesh(new THREE.SphereGeometry(0.02, 18, 10), lipU);
    ul.scale.set(1.35, 0.38, 0.5);
    ul.position.set(0, 0.0045, 0.002);
    mouth.add(ul);
    const ll = new THREE.Mesh(new THREE.SphereGeometry(0.019, 18, 10), lipD);
    ll.scale.set(1.2, 0.48, 0.52);
    ll.position.set(0, -0.0075, 0.0015);
    mouth.add(ll);
    head.add(mouth);
    // closed eyes (lids, lashes) / open eyes (brown iris, highlight)
    const closed = new THREE.Group();
    const open = new THREE.Group();
    head.add(closed, open);
    const mc = onHead(V3(0, -0.47, 0.88), 0);
    mc.add(
      arc(V3(-0.02, 0.0012, 0.006), V3(0, -0.0006, 0.0085), V3(0.02, 0.0012, 0.006), 0.0013, dark),
    );
    closed.add(mc);
    const mo = onHead(V3(0, -0.47, 0.88), 0);
    mo.add(
      arc(V3(-0.029, 0.007, 0.008), V3(0, -0.012, 0.013), V3(0.029, 0.007, 0.008), 0.0026, dark),
    );
    open.add(mo);
    const lidLine = toon("#4a2617");
    const iris = toon("#3b1d10");
    const pupil = toon("#050302");
    const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const brow = toon("#1d100b");
    const hoopM = withRim(toon("#e9b949"), "#fff0b0", 0.6);
    for (const sx of [-1, 1]) {
      const e = onHead(V3(sx * 0.41, 0.04, 0.91), 0.001);
      e.scale.setScalar(1.18);
      e.add(arc(V3(-0.022, 0.004, 0), V3(0, -0.009, 0.003), V3(0.022, 0.003, 0), 0.0033, dark));
      for (let k = 0; k < 5; k++) {
        const t = 0.2 + k * 0.17;
        const px = lerp(-0.022, 0.022, t);
        const py = lerp(0.004, 0.003, t) - 0.0125 * 4 * t * (1 - t) * 0.75;
        const l = new THREE.Mesh(new THREE.ConeGeometry(0.0016, 0.009, 4), dark);
        l.position.set(px, py - 0.004, 0.003);
        l.rotation.z = (px * sx > 0 ? -0.5 : -0.15) * sx + Math.PI;
        l.rotation.x = -0.4;
        e.add(l);
      }
      e.add(
        arc(V3(-0.02, 0.014, -0.001), V3(0, 0.02, 0.001), V3(0.02, 0.013, -0.001), 0.0018, lidLine),
      );
      closed.add(e);
      const eo = onHead(V3(sx * 0.41, 0.05, 0.91), -0.004);
      eo.scale.setScalar(1.18);
      const sc = new THREE.Mesh(new THREE.SphereGeometry(0.0165, 16, 12), white);
      sc.scale.set(1.25, 0.95, 0.5);
      eo.add(sc);
      const ir = new THREE.Mesh(new THREE.SphereGeometry(0.0108, 16, 12), iris);
      ir.scale.set(1, 1, 0.45);
      ir.position.z = 0.0055;
      eo.add(ir);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.0056, 10, 8), pupil);
      pu.scale.set(1, 1, 0.4);
      pu.position.z = 0.0085;
      eo.add(pu);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0029, 8, 6), shine);
      hl.position.set(0.004, 0.005, 0.0105);
      eo.add(hl);
      eo.add(
        arc(V3(-0.024, 0.002, 0.004), V3(0, 0.02, 0.008), V3(0.024, 0.004, 0.004), 0.0034, dark),
      );
      open.add(eo);
      // eyebrows
      const b = onHead(V3(sx * 0.42, 0.25, 0.88), 0.001);
      b.scale.setScalar(1.1);
      b.add(arc(V3(-0.021, -0.002, 0), V3(0, 0.005, 0.0015), V3(0.02, -0.001, 0), 0.0024, brow));
      head.add(b);
      // ears and gold hoops
      const ea = onHead(V3(sx, -0.03, -0.05), -0.006);
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0021, 6, 24), hoopM);
      hoop.position.set(0, -0.036, 0.004);
      hoop.rotation.y = Math.PI / 2;
      ea.add(hoop);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.022, 0.0072, 8, 18, Math.PI * 1.55),
        skin,
      );
      rim.rotation.z = sx > 0 ? -2.2 : -0.95;
      rim.scale.set(0.85, 1.2, 1);
      ea.add(rim);
      const inn = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 8), skinL);
      inn.scale.set(0.7, 1.05, 0.35);
      ea.add(inn);
      head.add(ea);
    }
    open.visible = false;
    // hair: curly cap, two textured puffs, saffron madras ties
    const cg = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, 1.58);
    const cp = cg.attributes.position;
    const xAxis = V3(1, 0, 0);
    for (let i = 0; i < cp.count; i++) {
      vv.set(cp.getX(i), cp.getY(i), cp.getZ(i)).applyAxisAngle(xAxis, -0.9);
      const curl =
        (vnoise(vv.x * 16 + 3, vv.y * 16 + vv.z * 11) - 0.5) * 0.07 +
        (fbm(vv.x * 5, vv.z * 5 + vv.y * 3, 2) - 0.5) * 0.05;
      const q = sculpt(vv).multiplyScalar(HEAD_R * (1.055 + curl));
      cp.setXYZ(i, q.x, q.y, q.z);
    }
    cg.computeVertexNormals();
    const cap = new THREE.Mesh(cg, hairM);
    cap.castShadow = true;
    head.add(cap);
    {
      const NE = 90;
      const edge = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 8, 6), hairM, NE);
      const oo = new THREE.Object3D();
      for (let i = 0; i < NE; i++) {
        const ph = (i / NE) * Math.PI * 2;
        const th = 1.55 + rr(-0.04, 0.03);
        vv.set(
          Math.sin(th) * Math.cos(ph),
          Math.cos(th),
          Math.sin(th) * Math.sin(ph),
        ).applyAxisAngle(xAxis, -0.9);
        oo.position.copy(sculpt(vv).multiplyScalar(HEAD_R * 1.04));
        oo.scale.setScalar(rr(0.7, 1.25));
        oo.updateMatrix();
        edge.setMatrixAt(i, oo.matrix);
      }
      head.add(edge);
    }
    const puffs: THREE.Group[] = [];
    const madM = withRim(
      new THREE.MeshToonMaterial({
        map: TEX_madras,
        gradientMap: toonRamp,
        side: THREE.DoubleSide,
      }),
      "#ffd0a0",
      0.3,
    );
    for (const sx of [-1, 1]) {
      const pg = new THREE.Group();
      const pos = V3(sx * 0.088, 0.108, -0.045);
      pg.position.copy(pos);
      const ig = new THREE.IcosahedronGeometry(1, 5);
      const ip = ig.attributes.position;
      for (let i = 0; i < ip.count; i++) {
        vv.set(ip.getX(i), ip.getY(i), ip.getZ(i));
        const r =
          1 +
          (fbm(vv.x * 2.5 + sx * 7, vv.y * 2.5 + vv.z * 1.7, 3) - 0.5) * 0.35 +
          (vnoise(vv.x * 11 + vv.z * 7, vv.y * 11) - 0.5) * 0.16;
        vv.multiplyScalar(r);
        ip.setXYZ(i, vv.x, vv.y * 0.92, vv.z);
      }
      ig.computeVertexNormals();
      const pm = new THREE.Mesh(ig, hairM);
      pm.scale.setScalar(0.066);
      pm.castShadow = true;
      pg.add(pm);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0095, 8, 20), madM);
      const dir = pos.clone().normalize();
      tie.position.copy(dir.clone().multiplyScalar(-0.042));
      tie.quaternion.setFromUnitVectors(V3(0, 0, 1), dir);
      pg.add(tie);
      // small madras bow
      const bow = new THREE.Group();
      bow.position.copy(tie.position).add(V3(0, -0.012, -0.026));
      pg.add(bow);
      for (const bx of [-1, 1]) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), madM);
        l.scale.set(1.25, 0.75, 0.35);
        l.position.set(bx * 0.016, 0, 0);
        l.rotation.z = bx * 0.35;
        bow.add(l);
        const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.035), madM);
        tl.position.set(bx * 0.008, -0.02, 0);
        tl.rotation.z = bx * 0.3;
        bow.add(tl);
      }
      bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), madM));
      head.add(pg);
      puffs.push(pg);
    }
    // small conch held to the ear
    const held = new THREE.Mesh(conchGeometry({ rows: 56, segs: 56 }), conchMaterial(U.glow));
    held.scale.setScalar(0.17);
    held.position.copy(conchPos);
    held.rotation.set(-0.2, Math.PI, -0.35);
    held.castShadow = true;
    body.add(held);
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    scene.add(g);
    return {
      g,
      pose,
      inner,
      body,
      head,
      legs,
      puffs,
      closed,
      open,
      held,
      arms,
      cord,
      walk: 0,
      swim: 0,
      swimW: 0,
      hold: 1,
      moving: 0,
      pitch: 0,
      phase: 0,
      snap: false,
      prev: null,
    };
  }

  const Y_AXIS = V3(0, 1, 0);
  const _m4 = new THREE.Matrix4();
  const _e = V3();
  const _d = V3();
  const _pd = V3();
  const _hc = V3();
  /** Two-bone arm IK: shoulder S to hand target H, elbow towards `pole`. */
  function solveArm(A: Arm, H: V3, pole: V3, look: V3, up: V3): void {
    _d.subVectors(H, A.S);
    let dist = _d.length();
    const mx = A.L1 + A.L2 - 0.003;
    if (dist > mx) {
      _d.multiplyScalar(mx / dist);
      dist = mx;
    }
    _hc.copy(A.S).add(_d);
    _d.normalize();
    const a = (A.L1 * A.L1 - A.L2 * A.L2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, A.L1 * A.L1 - a * a));
    _pd.subVectors(pole, A.S);
    _pd.addScaledVector(_d, -_pd.dot(_d));
    if (_pd.lengthSq() < 1e-8) _pd.set(0, 0, -1);
    _pd.normalize();
    _e.copy(A.S).addScaledVector(_d, a).addScaledVector(_pd, h);
    const qs = A.sh.quaternion.setFromUnitVectors(Y_AXIS, _pd.subVectors(_e, A.S).normalize());
    _pd.subVectors(_hc, _e).normalize();
    const fwd = _pd.clone();
    A.el.quaternion.setFromUnitVectors(
      Y_AXIS,
      _pd.applyQuaternion(qs.clone().invert()).normalize(),
    );
    A.hand.position.copy(_hc).addScaledVector(fwd, 0.012);
    let target = look;
    if (target.distanceToSquared(A.hand.position) < 1e-8)
      target = A.hand.position.clone().add(V3(0, -1, 0));
    _m4.lookAt(target, A.hand.position, up.clone().normalize());
    A.hand.quaternion.setFromRotationMatrix(_m4);
  }
  // breaststroke: left hand path in body space (the right one is mirrored)
  const SWIM_CURVE = new THREE.CatmullRomCurve3(
    [
      V3(0.045, 1.29, 0.1),
      V3(0.2, 1.24, 0.06),
      V3(0.27, 1.1, 0.06),
      V3(0.16, 0.96, 0.13),
      V3(0.06, 1.0, 0.17),
      V3(0.04, 1.16, 0.15),
    ],
    true,
    "centripetal",
  );
  const HOLD_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, Math.PI, -0.35));
  const PEND_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, Math.PI / 2, 0));
  const HOLD_P = V3(0.18, 1.125, -0.04);
  const PEND_P = V3(0, 0.835, 0.13);

  /* =====================================================================
     BIG FOREGROUND CONCH, LIVING CONCH, PEARL
     ===================================================================== */
  let bigConch: THREE.Mesh;
  /** Size of the conch lying on the beach (the prototype's was 0.95, nearly Mila's height). */
  const CONCH_ON_SAND = 0.42;
  let liveConch: THREE.Group;
  let pearl: THREE.Group;
  let pearlHalo: THREE.Sprite;
  function buildConches(): void {
    bigConch = new THREE.Mesh(conchGeometry({ rows: 90, segs: 90 }), conchMaterial(U_bigGlow));
    // A lambi beside a child: large enough to read in the sand, not a shell her own size.
    bigConch.scale.setScalar(CONCH_ON_SAND);
    // nearer Mila than the prototype's, so the smaller shell still sits in the opening and closing
    // frames; clear of her walk towards the rocks
    const bx = 3.55;
    const bz = 6.0;
    bigConch.position.set(bx, groundH(bx, bz) + 0.21 * CONCH_ON_SAND, bz);
    bigConch.rotation.set(0.65, -0.55, Math.PI / 2);
    bigConch.castShadow = true;
    bigConch.receiveShadow = true;
    scene.add(bigConch);
    // living conch: algae-covered shell with foot and eyes
    const lg = conchGeometry({
      outer: "#8f8455",
      band: "#5d6a3a",
      lipCol: "#e4a08c",
      inA: "#ffc7b0",
      inB: "#e56b78",
    });
    liveConch = new THREE.Group();
    const sh = new THREE.Mesh(lg, conchMaterial(U_liveGlow));
    sh.scale.setScalar(1.35);
    sh.rotation.set(0, 0.4, -Math.PI / 2 + 0.1);
    liveConch.add(sh);
    const footM = toon("#c9734c");
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), footM);
    foot.scale.set(1.9, 0.45, 1.1);
    foot.position.set(-0.15, -0.36, 0);
    liveConch.add(foot);
    const eyeM = toon("#f1e6c8");
    const pupilM = toon("#1a1a1a");
    for (const s of [-1, 1]) {
      liveConch.add(
        limb(V3(-0.55, -0.35, 0.2 + s * 0.06), V3(-0.72, -0.18, 0.22 + s * 0.1), 0.016, footM),
      );
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), eyeM);
      e.position.set(-0.73, -0.16, 0.22 + s * 0.1);
      liveConch.add(e);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), pupilM);
      pu.position.set(-0.755, -0.155, 0.22 + s * 0.1);
      liveConch.add(pu);
    }
    liveConch.position.set(DEEP.x + 0.6, DEEP.y + 0.55, DEEP.z + 0.4);
    liveConch.rotation.y = 0.9;
    scene.add(liveConch);
    // the pearl: it stays at the bottom
    pearl = new THREE.Group();
    const pm = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 32, 24),
      new THREE.MeshStandardMaterial({
        color: "#fff3ee",
        emissive: new THREE.Color(1.6, 1.35, 1.3),
        roughness: 0.25,
      }),
    );
    pearl.add(pm);
    pearlHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(1, 0.85, 0.85),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.8,
      }),
    );
    pearlHalo.scale.setScalar(1.6);
    pearl.add(pearlHalo);
    const valve = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      toon("#d8c4b4", { side: THREE.DoubleSide }),
    );
    valve.scale.set(1, 0.35, 1);
    valve.rotation.x = Math.PI;
    valve.position.y = -0.02;
    pearl.add(valve);
    pearl.position.set(DEEP.x - 0.9, groundH(DEEP.x - 0.9, DEEP.z + 0.9) + 0.2, DEEP.z + 0.9);
    scene.add(pearl);
  }

  /* =====================================================================
     CRAB + DEBRIS
     ===================================================================== */
  let crab: {
    g: THREE.Group;
    legs: { pv: THREE.Group; s: number; i: number }[];
    claws: { pv: THREE.Group; pin: THREE.Group; s: number }[];
    base: V3;
    freedAt: number;
  };
  const debris: Debris[] = [];
  function buildCrab(): void {
    const g = new THREE.Group();
    const shell = toon("#d0532f");
    const shell2 = toon("#e9844c");
    const dk = toon("#1a1210");
    // The shell is one painted dome: deeper red in blotches, a warm rim, a pale underside.
    const deep = new THREE.Color("#a93a22");
    const rim = new THREE.Color("#f2985a");
    const pale = new THREE.Color("#f3d9b8");
    const base = new THREE.Color("#d0532f");
    const painted = toonSoft("#ffffff", { vertexColors: true });
    const dome = new THREE.SphereGeometry(0.16, 32, 22);
    {
      const P = dome.attributes.position;
      const N = dome.attributes.normal;
      const colors = new Float32Array(P.count * 3);
      const tint = new THREE.Color();
      for (let i = 0; i < P.count; i++) {
        const up = N.getY(i);
        const blotch =
          Math.sin(P.getX(i) * 38 + P.getZ(i) * 17) * Math.cos(P.getZ(i) * 43 - P.getX(i) * 13);
        tint.copy(base).lerp(deep, smooth(0.15, 0.7, blotch) * smooth(0.2, 0.8, up) * 0.75);
        tint.lerp(rim, (1 - smooth(0.05, 0.45, Math.abs(up))) * 0.6);
        tint.lerp(pale, smooth(0.25, 0.6, -up));
        tint.toArray(colors, i * 3);
      }
      dome.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    const b = new THREE.Mesh(dome, painted);
    b.scale.set(1.25, 0.5, 0.95);
    b.castShadow = true;
    g.add(b);
    const legs: { pv: THREE.Group; s: number; i: number }[] = [];
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const pv = new THREE.Group();
        pv.position.set(s * 0.16, 0, (i - 1.5) * 0.07);
        pv.rotation.y = s * (0.35 - i * 0.24);
        // thigh, shin and a pointed foot, each slimmer than the last
        const knee = V3(s * 0.13, 0.07, 0);
        const ankle = V3(s * 0.2, -0.02, 0);
        pv.add(limb(V3(0, 0, 0), knee, 0.019, shell));
        pv.add(limb(knee, ankle, 0.014, shell));
        const foot = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.075, 10), shell2);
        foot.position.set(s * 0.215, -0.05, 0);
        foot.rotation.z = Math.PI + s * 0.4;
        foot.castShadow = true;
        pv.add(foot);
        g.add(pv);
        legs.push({ pv, s, i });
      }
    const claws: { pv: THREE.Group; pin: THREE.Group; s: number }[] = [];
    for (const s of [-1, 1]) {
      const pv = new THREE.Group();
      pv.position.set(s * 0.12, 0.03, 0.13);
      pv.add(limb(V3(0, 0, 0), V3(s * 0.08, 0.05, 0.12), 0.022, shell));
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), shell2);
      c1.scale.set(0.8, 0.6, 1.2);
      c1.position.set(s * 0.1, 0.07, 0.19);
      c1.castShadow = true;
      pv.add(c1);
      // the fixed finger and the one that snaps, both tapering to a point
      const finger = (): THREE.Mesh => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.085, 12), shell2);
        f.rotation.x = Math.PI / 2;
        f.position.z = 0.04;
        f.castShadow = true;
        return f;
      };
      const fixed = finger();
      fixed.position.set(s * 0.1, 0.055, 0.275);
      pv.add(fixed);
      const pin = new THREE.Group();
      pin.position.set(s * 0.1, 0.08, 0.24);
      pin.add(finger());
      pv.add(pin);
      g.add(pv);
      claws.push({ pv, pin, s });
    }
    const eyeWhite = toonSoft("#fbf6ea");
    const glint = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    for (const s of [-1, 1]) {
      g.add(limb(V3(s * 0.05, 0.05, 0.1), V3(s * 0.07, 0.15, 0.13), 0.01, shell));
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), eyeWhite);
      e.position.set(s * 0.07, 0.165, 0.13);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), dk);
      pu.position.set(s * 0.072, 0.167, 0.148);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), glint);
      hl.position.set(s * 0.078, 0.175, 0.158);
      g.add(e, pu, hl);
    }
    g.scale.setScalar(1.8);
    const cx = 14.6;
    const cz = 4.15;
    g.position.set(cx, groundH(cx, cz) + 0.12, cz);
    g.rotation.y = -1.9;
    scene.add(g);
    crab = { g, legs, claws, base: g.position.clone(), freedAt: 0 };
    // debris blocking the way
    const bottle = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.07, 0),
          new THREE.Vector2(0.075, 0.18),
          new THREE.Vector2(0.03, 0.25),
          new THREE.Vector2(0.025, 0.32),
          new THREE.Vector2(0, 0.32),
        ],
        16,
      ),
      new THREE.MeshStandardMaterial({
        color: "#4f9a72",
        roughness: 0.2,
        transparent: true,
        opacity: 0.75,
      }),
    );
    bottle.rotation.z = Math.PI / 2.2;
    bottle.position.set(13.85, 0, 4.55);
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16),
      new THREE.MeshLambertMaterial({ map: TEX_can }),
    );
    can.rotation.set(1.3, 0, 0.4);
    can.position.set(13.95, 0, 3.75);
    const bagG = new THREE.SphereGeometry(0.16, 14, 10);
    const bp = bagG.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const n = fbm(bp.getX(i) * 9, bp.getY(i) * 9 + bp.getZ(i) * 5, 2);
      bp.setXYZ(i, bp.getX(i) * (0.8 + n * 0.5), bp.getY(i) * 0.35, bp.getZ(i) * (0.8 + n * 0.5));
    }
    bagG.computeVertexNormals();
    const bag = new THREE.Mesh(
      bagG,
      new THREE.MeshStandardMaterial({
        color: "#e8efe9",
        roughness: 0.4,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
    );
    bag.position.set(14.25, 0, 4.95);
    for (const d of [bottle, can, bag]) {
      d.scale.setScalar(1.5);
      d.position.y = groundH(d.position.x, d.position.z) + 0.06;
      d.castShadow = true;
      scene.add(d);
      debris.push({ mesh: d, gone: false, t: 0, home: d.position.clone() });
    }
  }

  /* =====================================================================
     SEA GRASS MEADOW, TURTLE, FISH, CORAL
     ===================================================================== */
  let turtle: THREE.Group;
  const flippers: Flipper[] = [];
  let fish: THREE.InstancedMesh;
  const fishData: FishData[] = [];
  let school: THREE.InstancedMesh;
  const schoolData: SchoolFish[] = [];
  const schoolCtr = V3();
  let dust: SeaDust;
  let grass: THREE.InstancedMesh;
  let tufts: THREE.InstancedMesh;
  const rays: THREE.Mesh[] = [];
  /** Where the conch Mila carries is: the dust near it takes its pink. */
  const U_conchAt = { value: V3(0, 99, 0) };
  /** Width of the sea-grass blades: wider when the adaptive quality keeps half of them. */
  const U_wide = { value: 1 };
  /**
   * Follows the adaptive quality in the water: less dust below the top level; at the lowest, half
   * the sea grass (wider blades fill in) and every other shaft. Colour, depth and light stay.
   */
  function thinSea(level: number): void {
    const motes = dust.geometry.attributes.aSeed.count;
    dust.geometry.setDrawRange(0, level < 2 ? Math.ceil(motes / 2) : motes);
    const blades = grass.instanceMatrix.count;
    grass.count = level === 0 ? Math.ceil(blades / 2) : blades;
    const short = tufts.instanceMatrix.count;
    tufts.count = level === 0 ? Math.ceil(short / 2) : short;
    U_wide.value = level === 0 ? 1.6 : 1;
    rays.forEach((r, i) => {
      r.visible = level > 0 || i % 2 === 0;
    });
    canvas.dataset.quality = String(level);
  }
  function buildMeadow(): void {
    const bg = new THREE.PlaneGeometry(0.07, 1, 1, 7);
    bg.translate(0, 0.5, 0);
    const bpos = bg.attributes.position;
    for (let i = 0; i < bpos.count; i++) {
      const y = bpos.getY(i);
      bpos.setX(i, bpos.getX(i) * (1 - y * 0.6));
    }
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    // Each blade is rooted and bends in the current all plants share (`seaSway`): its place gives
    // it a phase, a suppleness and a delay of its own, and a tall blade gives more than a short one.
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFlow = SEA.uFlow;
      sh.uniforms.uSway = SEA.uSway;
      sh.uniforms.uPart = U.part;
      sh.uniforms.uPartC = U.partC;
      sh.uniforms.uWide = U_wide;
      sh.vertexShader =
        "uniform float uPart,uWide;uniform vec3 uPartC;\n" +
        SWAY_GLSL +
        sh.vertexShader.replace(
          "#include <project_vertex>",
          `
      vec4 wp=modelMatrix*instanceMatrix*vec4(transformed*vec3(uWide,1.,1.),1.);
      vec4 root=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
      float tall=length(instanceMatrix[1].xyz);
      float sd=fract(sin(dot(root.xz,vec2(12.9898,78.233)))*43758.5453);
      float flex=mix(.6,1.3,fract(sd*7.31))*(.55+.3*tall);
      vec2 sw=seaSway(root.xz,position.y,flex,sd)*tall;
      float hh=position.y*position.y;
      vec2 away=root.xz-uPartC.xz;float dd=length(away);
      wp.xz+=sw+normalize(away+1e-4)*uPart*smoothstep(3.2,.5,dd)*hh*1.5;
      // a bent blade keeps its length: its tip comes down as it leans
      wp.y-=uPart*smoothstep(3.,.5,dd)*hh*.3+dot(sw,sw)/(2.*max(tall*position.y,.08));
      vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;`,
        );
    };
    const N = isSmall ? 2200 : 4200;
    grass = new THREE.InstancedMesh(bg, mat, N);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const pal = ["#2f8a7a", "#3fa08a", "#6f8a3a", "#879a45", "#2b7266", "#56a88f"];
    for (let i = 0; i < N; i++) {
      let a: number;
      let r: number;
      let x: number;
      let z: number;
      let tries = 0;
      do {
        a = rnd() * 6.28;
        r = Math.sqrt(rnd()) * 11;
        x = MEADOW.x + Math.cos(a) * r * 1.2;
        z = MEADOW.z + Math.sin(a) * r;
      } while (Math.hypot(x - (MEADOW.x - 5), z - (MEADOW.z + 6.2)) < 3.2 && ++tries < 20);
      o.position.set(x, groundH(x, z) - 0.05, z);
      o.rotation.set(rr(-0.15, 0.15), rnd() * 6.28, rr(-0.15, 0.15));
      const h = rr(0.7, 2.2) * (1 - r / 16);
      o.scale.set(rr(0.8, 1.4), h, 1);
      o.updateMatrix();
      grass.setMatrixAt(i, o.matrix);
      grass.setColorAt(i, c.set(pal[(rnd() * pal.length) | 0]).multiplyScalar(rr(0.8, 1.15)));
    }
    scene.add(grass);
    // The same blade, short, in tufts: an understorey where the tall grass thins out, and a few
    // clumps along Mila's way in the shallows, so the sand between the pages is not bare. Its own RNG:
    // the placements drawn after this keep theirs.
    {
      const own = createRng(53);
      const or = (a: number, b: number): number => a + (b - a) * own();
      const spots: [V3, number, number, number][] = [
        [MEADOW, 5, 14.5, isSmall ? 50 : 84],
        [SCHOOL, 2, 9, isSmall ? 10 : 18],
        [V3(6.8, 0, -9.5), 1.5, 7, isSmall ? 12 : 20],
      ];
      const roots: [number, number][] = [];
      for (const [ctr, r0, r1, n] of spots)
        for (let k = 0; k < n; k++) {
          const a = own() * 6.28;
          const r = or(r0, r1);
          const cx = ctr.x + Math.cos(a) * r * (ctr === MEADOW ? 1.2 : 1);
          const cz = ctr.z + Math.sin(a) * r;
          const blades = 9 + ((own() * 10) | 0);
          for (let j = 0; j < blades; j++) {
            const ba = own() * 6.28;
            const br = Math.sqrt(own()) * 0.42;
            roots.push([cx + Math.cos(ba) * br, cz + Math.sin(ba) * br]);
          }
        }
      tufts = new THREE.InstancedMesh(bg, mat, roots.length);
      const tpal = ["#8fae4a", "#6f9a4e", "#a3b85c", "#5f8f5a", "#7aa86a"];
      roots.forEach(([x, z], i) => {
        o.position.set(x, groundH(x, z) - 0.03, z);
        o.rotation.set(or(-0.3, 0.3), own() * 6.28, or(-0.3, 0.3));
        o.scale.set(or(1.0, 1.6), or(0.22, 0.6), 1);
        o.updateMatrix();
        tufts.setMatrixAt(i, o.matrix);
        tufts.setColorAt(i, c.set(tpal[(own() * tpal.length) | 0]).multiplyScalar(or(0.8, 1.1)));
      });
      scene.add(tufts);
    }
    // Branching corals and gorgonians. All the limbs of one colour make one mesh; each vertex knows
    // the foot of its coral and how tall it stands, so the branches give a little in the current.
    const corM = ["#e2785e", "#b55a87", "#e9a65a"].map((color) => {
      const m = toon(color);
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uFlow = SEA.uFlow;
        sh.uniforms.uSway = SEA.uSway;
        sh.vertexShader =
          "attribute vec4 aRoot;\n" +
          SWAY_GLSL +
          sh.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
      float ch=clamp((position.y-aRoot.y)/aRoot.w,0.,1.);
      transformed.xz+=seaSway(aRoot.xz,ch,.17,fract(aRoot.x*3.7+aRoot.z*1.3))*aRoot.w;`,
          );
      };
      m.customProgramCacheKey = () => "coral";
      return m;
    });
    const corG: THREE.BufferGeometry[][] = [[], [], []];
    for (let k = 0, tries = 0; k < 16 && tries < 200; tries++) {
      const a = rnd() * 6.28;
      const r = rr(2, 9);
      const cx = DEEP.x + Math.cos(a) * r;
      const cz = DEEP.z + Math.sin(a) * r;
      if (!isClear(cx, cz)) continue;
      k++;
      const base = V3(cx, groundH(cx, cz) - 0.05, cz);
      const limbs: THREE.BufferGeometry[] = [];
      let top = base.y;
      const grow = (p: V3, dir: V3, len: number, dep: number): void => {
        const e = p.clone().add(dir.clone().multiplyScalar(len));
        const part = limb(p, e, 0.05 * (1 - dep * 0.2), corM[k % 3]);
        part.updateMatrix();
        limbs.push(part.geometry.applyMatrix4(part.matrix));
        top = Math.max(top, e.y);
        if (dep < 3)
          for (let j = 0; j < 2; j++) {
            const nd = dir
              .clone()
              .add(V3(rr(-0.7, 0.7), rr(0.1, 0.5), rr(-0.7, 0.7)))
              .normalize();
            grow(e, nd, len * 0.72, dep + 1);
          }
      };
      grow(base, V3(0, 1, 0), rr(0.35, 0.6), 0);
      for (const g of limbs) {
        const n = g.attributes.position.count;
        const root = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) root.set([base.x, base.y, base.z, top - base.y], i * 4);
        g.setAttribute("aRoot", new THREE.BufferAttribute(root, 4));
        corG[k % 3].push(g);
      }
    }
    corG.forEach((parts, i) => {
      if (!parts.length) return;
      const coral = new THREE.Mesh(mergeGeometries(parts), corM[i]);
      parts.forEach((g) => g.dispose());
      coral.castShadow = true;
      scene.add(coral);
    });
    // turtle
    turtle = new THREE.Group();
    const tm = toon("#7d8a52");
    const tm2 = toon("#a5ad6c");
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshToonMaterial({ map: TEX_turtle, gradientMap: toonRamp }),
    );
    shell.scale.set(1, 0.48, 1.25);
    turtle.add(shell);
    const pl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10), tm2);
    pl.scale.set(1, 0.16, 1.15);
    pl.position.y = 0.01;
    turtle.add(pl);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), tm);
    hd.scale.set(0.85, 0.75, 1.25);
    hd.position.set(0, 0.07, 0.78);
    turtle.add(hd);
    const eyeM = toon("#141414");
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeM);
      e.position.set(s * 0.085, 0.12, 0.9);
      turtle.add(e);
    }
    for (const [s, zf, big] of [
      [-1, 0.42, 1],
      [1, 0.42, 1],
      [-1, -0.5, 0],
      [1, -0.5, 0],
    ]) {
      const pv = new THREE.Group();
      pv.position.set(s * 0.45, 0, zf);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8), tm);
      f.scale.set(big ? 0.75 : 0.35, 0.06, big ? 0.26 : 0.18);
      f.position.set(s * (big ? 0.32 : 0.15), 0, big ? -0.08 : -0.05);
      f.rotation.y = s * (big ? 0.5 : 0.3);
      pv.add(f);
      turtle.add(pv);
      flippers.push({ pv, s, big });
    }
    turtle.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.castShadow = true;
    });
    scene.add(turtle);
    // fish
    const merged = makeFishGeo();
    const NF = isSmall ? 60 : 100;
    fish = new THREE.InstancedMesh(merged, fishMaterial(8), NF);
    const fc = ["#f6c443", "#3d8fd6", "#ef7f63", "#5fc3a8", "#b48fe0", "#f3e27a"];
    for (let i = 0; i < NF; i++) {
      fish.setColorAt(i, c.set(fc[i % fc.length]));
      fishData.push({
        r: rr(1.5, 5.5),
        a: rnd() * 6.28,
        s: rr(0.25, 0.55) * (rnd() < 0.5 ? 1 : -1),
        y: rr(0.8, 3.2),
        ph: rnd() * 6,
        sc: rr(0.7, 1.3),
        grp: i % 3,
        vis: i < NF * 0.35 ? 1 : 0,
      });
    }
    scene.add(fish);
    // the school: one body made of a hundred and forty fish
    const NS = isSmall ? 90 : 140;
    // The prototype asks for 12, but both fish materials shared one program there, so the school
    // swam with the speed-8 wiggle the owner saw: keep that.
    school = new THREE.InstancedMesh(merged, fishMaterial(8), NS);
    const sc = ["#cfe6ea", "#a8d2dc", "#e4efeb", "#8cc2d2", "#f0dc9a"];
    for (let i = 0; i < NS; i++) {
      school.setColorAt(i, c.set(sc[i % sc.length]));
      schoolData.push({
        a: rnd() * 6.28,
        r: rr(1.0, 2.1),
        h: rr(-0.7, 1),
        sp: rr(0.7, 1.1),
        ph: rnd() * 6,
        sc: rr(0.55, 0.8),
      });
    }
    schoolCtr.set(SCHOOL.x, SCHOOL.y + 2.6, SCHOOL.z);
    scene.add(school);
    // The prototype's plankton drew 1500 numbers here; they are still drawn so everything placed
    // after it keeps its place.
    for (let i = 0; i < 1500; i++) rnd();
    dust = createSeaDust(createRng(41), isSmall ? 320 : 640, SEA, U_conchAt, U.glow);
    dust.renderOrder = 3;
    scene.add(dust);
    // Shafts of moonlight: soft sheets hanging from the surface along the light's own slant. Each
    // turns about that axis to face the camera, so they all lean the same way from every page.
    const rayM = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uFlow: SEA.uFlow, uUnder: U.under, uSeaSun: SEA.uSeaSun },
      vertexShader: `uniform vec3 uSeaSun;varying vec2 vUv;varying float vD,vPh;
      void main(){vUv=uv;vec3 base=modelMatrix[3].xyz;vPh=base.x*1.7+base.z;
       vec3 side=normalize(cross(uSeaSun,cameraPosition-base));
       vec3 wp=base+uSeaSun*position.y+side*position.x;vD=length(wp-cameraPosition);
       gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,
      fragmentShader: `uniform float uFlow,uUnder;varying vec2 vUv;varying float vD,vPh;
      void main(){float x=vUv.x*2.-1.;
       float a=exp(-x*x*4.)*(1.-x*x)*pow(vUv.y,1.5)*smoothstep(1.,.9,vUv.y);
       a*=(.7+.3*sin(uFlow*.33+vPh))*smoothstep(1.5,6.,vD)*exp(-vD*.045);
       gl_FragColor=vec4(mix(vec3(.5,.95,.85),vec3(1.,.88,.66),vUv.y)*a*.2*uUnder,1.);}`,
    });
    for (let i = 0; i < 9; i++) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(rr(1.5, 3), 18).translate(0, -9, 0), rayM);
      // the light slants towards the shore as it goes down: the shafts start further out to sea
      r.position.set(rr(2, 18), -0.15, rr(-38, -10) - 7);
      rnd();
      r.frustumCulled = false;
      scene.add(r);
      rays.push(r);
    }
  }
  function makeFishGeo(): THREE.BufferGeometry {
    const parts: [THREE.BufferGeometry, "body" | "fin" | "eye"][] = [];
    const add = (geo: THREE.BufferGeometry, shade: "body" | "fin" | "eye"): void => {
      // The parts keep their own normals: a turned body is round, not faceted.
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      parts.push([g, shade]);
    };
    const prof = (
      [
        [0, -0.15],
        [0.013, -0.13],
        [0.021, -0.1],
        [0.038, -0.05],
        [0.05, 0],
        [0.049, 0.05],
        [0.04, 0.09],
        [0.026, 0.12],
        [0.011, 0.14],
        [0, 0.148],
      ] as const
    ).map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(30), 28);
    body.rotateX(Math.PI / 2);
    body.scale(0.48, 1, 1);
    add(body, "body");
    const fin = (pts: [number, number][]): THREE.ShapeGeometry => {
      const sh = new THREE.Shape();
      sh.moveTo(pts[0][0], pts[0][1]);
      for (const q of pts.slice(1)) sh.lineTo(q[0], q[1]);
      return new THREE.ShapeGeometry(sh);
    };
    const tail = fin([
      [0.125, 0.012],
      [0.215, 0.078],
      [0.182, 0],
      [0.215, -0.078],
      [0.125, -0.012],
    ]);
    tail.rotateY(Math.PI / 2);
    add(tail, "fin");
    const dors = fin([
      [-0.06, 0.04],
      [0.0, 0.088],
      [0.03, 0.082],
      [0.075, 0.036],
    ]);
    dors.rotateY(Math.PI / 2);
    add(dors, "fin");
    const anal = fin([
      [0.03, -0.034],
      [0.085, -0.028],
      [0.07, -0.06],
    ]);
    anal.rotateY(Math.PI / 2);
    add(anal, "fin");
    for (const sx of [-1, 1]) {
      const pf = fin([
        [0, 0],
        [0.04, -0.022],
        [0.034, 0.012],
      ]);
      pf.rotateX(Math.PI / 2);
      pf.rotateZ(sx * 0.5);
      pf.translate(sx * 0.02, -0.014, 0.04);
      add(pf, "fin");
      const e = new THREE.SphereGeometry(0.0085, 12, 8);
      e.translate(sx * 0.0205, 0.013, 0.098);
      add(e, "eye");
    }
    const pos: number[] = [];
    const nor: number[] = [];
    const col: number[] = [];
    for (const [g, shade] of parts) {
      const P = g.attributes.position;
      const N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i);
        const y = P.getY(i);
        const z = P.getZ(i);
        pos.push(x, y, z);
        nor.push(N.getX(i), N.getY(i), N.getZ(i));
        let c: number;
        if (shade === "body") {
          c = lerp(1, 0.5, smooth(-0.03, 0.05, y));
          if (Math.abs(z - 0.035) < 0.012 || Math.abs(z + 0.03) < 0.01) c *= 0.7;
          if (z > 0.115) c *= 0.85;
        } else if (shade === "fin") c = 0.82;
        else c = 0.04;
        col.push(c, c, c);
      }
      g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  function fishMaterial(speed: number): THREE.MeshToonMaterial {
    const m = toon("#ffffff", { vertexColors: true, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.time;
      sh.vertexShader =
        "uniform float uTime;\n" +
        sh.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
    #ifdef USE_INSTANCING
    float ph=dot(instanceMatrix[3].xyz,vec3(1.7,2.3,3.1));
    #else
    float ph=0.;
    #endif
    float back=smoothstep(.06,-.21,position.z);
    transformed.x+=sin(uTime*${speed.toFixed(1)}+ph-position.z*14.)*.05*back+sin(uTime*${speed.toFixed(1)}+ph)*.006;`,
        );
    };
    m.customProgramCacheKey = () => `fish:${speed}`;
    return m;
  }

  /* =====================================================================
     GLOWS, SIGNS (the three voices), GOLDEN THREAD
     ===================================================================== */
  function iconTex(kind: "pas" | "herbe" | "spirale", color: string): THREE.CanvasTexture {
    return canvasTex(128, 128, (g) => {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineCap = "round";
      g.lineWidth = 7;
      if (kind === "pas") {
        for (let i = 0; i < 3; i++) {
          g.save();
          g.translate(38 + i * 26, 82 - i * 18);
          g.rotate(-0.5);
          g.beginPath();
          g.ellipse(0, 0, 7, 12, 0, 0, 6.28);
          g.fill();
          g.restore();
        }
      }
      if (kind === "herbe") {
        g.beginPath();
        g.moveTo(44, 104);
        g.bezierCurveTo(40, 60, 80, 58, 74, 22);
        g.stroke();
        g.beginPath();
        g.moveTo(64, 104);
        g.bezierCurveTo(70, 74, 96, 70, 96, 44);
        g.stroke();
      }
      if (kind === "spirale") {
        g.beginPath();
        for (let a = 0; a < 14; a += 0.1) {
          const r = 3 + a * 3.1;
          g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
        }
        g.stroke();
      }
    });
  }
  const SIGNS: Sign[] = [];
  /** A light's heart: bright in the middle, thinning evenly to nothing: no outline, no disc. */
  const orbTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.18, "rgba(255,255,255,0.9)");
    gr.addColorStop(0.4, "rgba(255,255,255,0.34)");
    gr.addColorStop(0.65, "rgba(255,255,255,0.1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  function buildSigns(): void {
    const defs = [
      { k: "pas", c: new THREE.Color(1.6, 0.95, 0.45), ic: "#5a2c08" },
      { k: "herbe", c: new THREE.Color(0.65, 1.5, 0.8), ic: "#103a22" },
      { k: "spirale", c: new THREE.Color(1.7, 0.7, 0.75), ic: "#5a1420" },
    ] as const;
    defs.forEach((d) => {
      const g = new THREE.Group();
      const haloM = new THREE.SpriteMaterial({
        map: glowTex,
        color: d.c,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Sprite(haloM);
      halo.scale.setScalar(0.9);
      g.add(halo);
      // The heart of the light is a soft glow that thins towards its edge, not a flat disc.
      const coreM = new THREE.SpriteMaterial({
        map: orbTex,
        color: d.c.clone().multiplyScalar(0.9),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const core = new THREE.Sprite(coreM);
      core.scale.setScalar(0.4);
      g.add(core);
      const iconM = new THREE.SpriteMaterial({
        map: iconTex(d.k, d.ic),
        transparent: true,
        depthWrite: false,
      });
      const ic = new THREE.Sprite(iconM);
      ic.scale.setScalar(0.2);
      g.add(ic);
      // Round it turns the conch's own spiral: each light is a voice come out of the shell.
      const ring = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            Array.from({ length: 40 }, (_, k) => {
              const t = k / 39;
              // a single curl, like the lip of the shell: more turns would read as rings
              const a = t * Math.PI * 2.4;
              const r = 0.035 + 0.15 * t;
              return V3(Math.cos(a) * r, Math.sin(a) * r, 0);
            }),
          ),
          90,
          0.0055,
          6,
        ),
        new THREE.MeshBasicMaterial({
          color: d.c,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      g.add(ring);
      g.scale.setScalar(0.001);
      scene.add(g);
      // A wake of fading sparks behind it, so its path through the air or the water can be read.
      const wakeG = new THREE.BufferGeometry();
      const wakeN = 16;
      wakeG.setAttribute("position", new THREE.BufferAttribute(new Float32Array(wakeN * 3), 3));
      const fade = new Float32Array(wakeN * 3);
      for (let k = 0; k < wakeN; k++) {
        const f = (1 - k / wakeN) ** 2;
        fade.set([d.c.r * f, d.c.g * f, d.c.b * f], k * 3);
      }
      wakeG.setAttribute("color", new THREE.BufferAttribute(fade, 3));
      const wake = new THREE.Points(
        wakeG,
        new THREE.PointsMaterial({
          map: glowTex,
          size: 0.13,
          vertexColors: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      wake.frustumCulled = false;
      scene.add(wake);
      SIGNS.push({
        g,
        ring,
        halo: haloM,
        core: coreM,
        icon: iconM,
        wake,
        wakeT: 0,
        tint: d.c.clone(),
        dim: 1,
        sc: 0,
      });
    });
  }
  const threadMat = (prog: Uniform<number>): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: { uProg: prog, uTime: U.time, uSong: U.song, uCamPos: U.camPos },
      vertexShader: `varying vec2 vUv;varying vec3 vWP;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:
        GLSL_NOISE +
        `uniform float uProg,uTime,uSong;uniform vec3 uCamPos;varying vec2 vUv;varying vec3 vWP;
   void main(){float x=vUv.x;if(x>uProg)discard;float head=smoothstep(uProg-.06,uProg,x);
    float pencil=.55+.45*noise(vec2(x*260.,vUv.y*6.+uTime*.6));
    float a=pencil*(.55+head*1.6)*(1.-uSong*.72);a*=exp(-length(vWP-uCamPos)*.03);
    gl_FragColor=vec4(vec3(1.,.76,.34)*a*1.6,a);}`,
    });
  const THREADS: Thread[] = [];

  /* =====================================================================
     LIGHTS
     ===================================================================== */
  const hemi = new THREE.HemisphereLight(
    new THREE.Color("#6fb2b8"),
    new THREE.Color("#b8743e"),
    1.05,
  );
  const amb = new THREE.AmbientLight(new THREE.Color("#29465a"), 0.6);
  const moonL = new THREE.DirectionalLight(new THREE.Color("#ffe2b6"), 2.3);
  const rimL = new THREE.DirectionalLight(new THREE.Color("#ff9a63"), 1.1);
  const fillL = new THREE.DirectionalLight(new THREE.Color("#ffb987"), 0.85);
  function buildLights(): void {
    scene.add(hemi, amb);
    moonL.castShadow = !isSmall;
    moonL.shadow.mapSize.set(2048, 2048);
    const sc = moonL.shadow.camera;
    sc.left = -9;
    sc.right = 9;
    sc.top = 9;
    sc.bottom = -9;
    sc.near = 1;
    sc.far = 80;
    moonL.shadow.bias = -0.0006;
    moonL.shadow.normalBias = 0.03;
    moonL.shadow.radius = 2.5;
    scene.add(moonL, moonL.target);
    rimL.position.set(30, 8, -60);
    scene.add(rimL);
    fillL.position.set(-8, 5, 30);
    scene.add(fillL);
  }

  /* =====================================================================
     POST: bloom + "gouache" pass (light Kuwahara, grain, paper, vignette)
     ===================================================================== */
  let bloom: UnrealBloomPass;
  let paintPass: ShaderPass;
  function buildPost(): EffectComposer {
    const { w, h } = size();
    const ext = renderer.extensions;
    const canHalf = ext.has("EXT_color_buffer_half_float") || ext.has("EXT_color_buffer_float");
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: canHalf ? THREE.HalfFloatType : THREE.UnsignedByteType,
      samples: isSmall || isSafari || !canHalf ? 0 : 4,
    });
    const comp = new EffectComposer(renderer, rt);
    const render = new RenderPass(scene, camera);
    comp.addPass(render);
    // guard: a single NaN/infinite pixel blackens the screen once spread by the bloom
    const guard = new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: QUAD_VERTEX,
      fragmentShader: `uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);
      if(!(c.r==c.r)||!(c.g==c.g)||!(c.b==c.b)||c.r>1e4||c.g>1e4||c.b>1e4)c=vec4(.03,.12,.14,1.);
      gl_FragColor=vec4(clamp(c.rgb,0.,40.),1.);}`,
    });
    comp.addPass(guard);
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.45, 0.55, 0.88);
    comp.addPass(bloom);
    paintPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uRes: { value: new THREE.Vector2(w, h) },
        uTime: U.time,
        uKuwa: { value: isSmall ? 0 : 1 },
        uUnder: U.under,
        uWash: U_wash,
      },
      vertexShader: QUAD_VERTEX,
      fragmentShader:
        GLSL_NOISE +
        `uniform sampler2D tDiffuse;uniform vec2 uRes;uniform float uTime,uKuwa,uUnder,uWash;varying vec2 vUv;
    vec3 kuwa(vec2 uv){vec2 px=1.5/uRes;vec3 m0=vec3(0),m1=vec3(0),m2=vec3(0),m3=vec3(0),s0=vec3(0),s1=vec3(0),s2=vec3(0),s3=vec3(0);
      for(int j=0;j<=2;j++)for(int i=0;i<=2;i++){vec2 o=vec2(float(i),float(j))*px;vec3 c;
        c=texture2D(tDiffuse,uv+vec2(-o.x,-o.y)).rgb;m0+=c;s0+=c*c;
        c=texture2D(tDiffuse,uv+vec2(o.x,-o.y)).rgb;m1+=c;s1+=c*c;
        c=texture2D(tDiffuse,uv+vec2(o.x,o.y)).rgb;m2+=c;s2+=c*c;
        c=texture2D(tDiffuse,uv+vec2(-o.x,o.y)).rgb;m3+=c;s3+=c*c;}
      m0/=9.;m1/=9.;m2/=9.;m3/=9.;
      float v0=dot(s0/9.-m0*m0,vec3(1)),v1=dot(s1/9.-m1*m1,vec3(1)),v2=dot(s2/9.-m2*m2,vec3(1)),v3=dot(s3/9.-m3*m3,vec3(1));
      vec3 r=m0;float mv=v0;if(v1<mv){mv=v1;r=m1;}if(v2<mv){mv=v2;r=m2;}if(v3<mv){r=m3;}return r;}
    void main(){vec2 asp=vec2(uRes.x/uRes.y,1.);
      vec2 w=vec2(noise(vUv*asp*90.+uUnder*uTime*.5),noise(vUv*asp*90.+17.+uUnder*uTime*.5))-.5;
      // a page turn (uWash) wets the sheet: the paint runs further before it settles again
      vec2 uv=vUv+w*(.0016+uUnder*.004+uWash*.014);
      vec3 base=texture2D(tDiffuse,uv).rgb;vec3 c=base;if(!(base.r==base.r))base=vec3(0.);
      if(uKuwa>.5)c=mix(base,kuwa(uv),.85);
      float paper=fbm(vUv*asp*220.)*.6+noise(vUv*asp*vec2(900.,140.))*.4;
      c*=.9+paper*.18;
      float gr=hash(vUv*uRes+fract(uTime*7.)*100.)-.5;c+=gr*.025*(c+.04);
      float vg=smoothstep(1.25,.35,length((vUv-.5)*vec2(1.15,1.)));c*=mix(.62,1.,vg);
      // the wash blooms from blotches of the paper, lifting the gouache to a pale, even tone
      float wet=smoothstep(.75-uWash*.75,1.05-uWash*.75,fbm(vUv*asp*3.+11.)+uWash*.25);
      c=mix(c,mix(c,vec3(dot(c,vec3(.333)))*vec3(1.04,1.,.94)+vec3(.07,.06,.05),.6),wet*uWash*.85);
      gl_FragColor=vec4(max(c,0.),1.);}`,
    });
    comp.addPass(paintPass);
    const output = new OutputPass();
    comp.addPass(output);
    passes.push(render, guard, bloom, paintPass, output);
    return comp;
  }

  /* =====================================================================
     FRAMING PER PAGE (camera, target, Mila's position)
     ===================================================================== */
  /** Underwater camera: above Mila, three-quarter front, Mila in the right half (text on the left). */
  function orbitCam(
    m: V3,
    ry: number,
    az: number,
    d: number,
    h: number,
    shift: number,
    lookDown: number,
  ): CamDef {
    const mc = m.clone();
    mc.y += 0.62;
    const a = ry + az;
    const pos = mc.clone().add(V3(Math.sin(a) * d, h, Math.cos(a) * d));
    const view = mc.clone().sub(pos).normalize();
    const r = V3()
      .crossVectors(view, V3(0, 1, 0))
      .normalize();
    const tgt = mc.clone().addScaledVector(r, -shift * d);
    tgt.y -= lookDown;
    return { pos, tgt, subj: mc };
  }
  const m4 = M4;
  const m5 = V3(12.55, 0, 4.35);
  m5.y = groundH(m5.x, m5.z);
  const M6 = V3(10.6, 0, 0);
  M6.z = shoreZ(M6.x) - 0.1;
  M6.y = groundH(M6.x, M6.z);
  const m7 = V3(MEADOW.x - 2.6, MEADOW.y + 2.1, MEADOW.z + 2.6);
  const m8 = V3(SCHOOL.x - 1.2, SCHOOL.y + 3.0, SCHOOL.z + 2.2);
  const m9 = V3(DEEP.x - 2.0, DEEP.y + 1.0, DEEP.z + 1.9);
  const m10 = V3(6.8, -2.5, -9.5);
  const h = HOME;
  const MILA_AT: { p: V3; ry: number }[] = [
    { p: h.clone(), ry: -Math.PI / 2 }, // 0 cover
    { p: h.clone(), ry: -Math.PI / 2 },
    { p: h.clone(), ry: -Math.PI / 2 },
    { p: h.clone(), ry: -Math.PI / 2 },
    { p: m4, ry: Math.PI / 2 - 0.25 }, // 4 the path
    { p: m5, ry: Math.PI / 2 - 0.35 }, // 5 the crab
    { p: M6, ry: Math.PI }, // 6 at the water's edge, facing the open sea
    { p: m7, ry: Math.PI / 2 + 0.4 }, // 7 the garden
    { p: m8, ry: Math.PI / 2 + 0.7 }, // 8 the school of fish
    { p: m9, ry: Math.PI / 2 + 0.5 }, // 9 the pearl
    { p: m10, ry: 0.15 }, // 10 rising towards the moon
    { p: h.clone(), ry: -Math.PI / 2 },
    { p: h.clone(), ry: -Math.PI / 2 },
  ];
  const CAMS: CamDef[] = [
    { pos: V3(-6, 6.5, 22), tgt: V3(6, 12, -60), subj: V3(-2, 5, 0) },
    {
      pos: V3(h.x - 0.1, h.y + 0.6, h.z + 2.85),
      tgt: V3(h.x - 2.2, h.y + 1.25, h.z - 5),
      subj: V3(h.x, h.y + 0.75, h.z),
    },
    {
      pos: V3(h.x - 0.32, h.y + 1.2, h.z + 1.05),
      tgt: V3(h.x - 0.38, h.y + 1.15, h.z - 0.5),
      subj: V3(h.x, h.y + 1.12, h.z),
    },
    {
      pos: V3(h.x + 1.25, h.y + 1.5, h.z + 3.7),
      tgt: V3(h.x - 2.4, h.y + 0.55, h.z - 8),
      subj: V3(h.x, h.y + 0.8, h.z),
    },
    {
      pos: V3(m4.x - 3.3, groundH(m4.x - 3.3, m4.z + 0.9) + 0.55, m4.z + 0.9),
      tgt: V3(m4.x + 3.8, 0.45, m4.z - 0.9),
      subj: V3(m4.x + 0.8, 0.6, m4.z),
    },
    {
      pos: V3(13.7, 1.3, -0.4),
      tgt: V3(14.1, 0.5, 4.3),
      subj: V3(m5.x + 1.1, m5.y + 0.4, m5.z - 0.2),
    },
    {
      pos: V3(M6.x + 1.5, groundH(M6.x + 1.5, M6.z + 2.3) + 0.65, M6.z + 2.3),
      tgt: V3(M6.x - 0.9, 0.55, M6.z - 4.5),
      subj: V3(M6.x, M6.y + 0.7, M6.z),
    },
    orbitCam(m7, Math.PI / 2 + 0.4, 1.0, 2.6, 0.95, 0.2, 0.08),
    orbitCam(m8, Math.PI / 2 + 0.7, 0.9, 3.0, 1.0, 0.2, 0.05),
    {
      pos: V3(DEEP.x - 4.9, DEEP.y + 2.5, DEEP.z - 2.3),
      tgt: V3(DEEP.x - 0.8, DEEP.y + 1.15, DEEP.z + 0.8),
      subj: V3(DEEP.x - 1.45, DEEP.y + 0.9, DEEP.z + 1.4),
    },
    orbitCam(m10, 0.15, 1.35, 2.7, 0.75, 0.2, -0.25),
    {
      pos: V3(0.75, h.y + 1.3, 3.3),
      tgt: V3(h.x + 0.35, h.y + 1.0, h.z + 0.35),
      subj: V3(h.x, h.y + 0.9, h.z),
    },
    {
      pos: V3(h.x - 0.05, h.y + 0.62, h.z + 2.6),
      tgt: V3(h.x - 2.2, h.y + 1.25, h.z - 5),
      subj: V3(h.x, h.y + 0.75, h.z),
    },
  ];
  const MILA_VIA: Record<string, V3[]> = {
    "3>4": [AROUND_ROCKS],
    "4>5": [V3(10.3, groundH(10.3, 3.6), 3.6)],
    "6>7": [V3(M6.x - 0.2, -0.15, M6.z - 1.6), V3(M6.x - 1.2, -2.4, M6.z - 6)],
    "7>8": [V3(10, -4.4, -22)],
    "8>9": [V3(12.4, -7.6, -31)],
    "9>10": [V3(11, -6.2, -21)],
    "10>11": [V3(5, -0.5, -1.5), V3(3.8, groundH(3.8, 3.2) + 0.02, 3.2)],
  };
  /** Intermediate camera stops for a transition (occlusions, dives). */
  function viaFor(from: number, to: number): [V3, V3][] {
    // Only the way in from the cover needs a route: on every other move the camera swings round
    // Mila (see `CamRig`).
    const V: Record<string, [V3, V3][]> = {
      "0>1": [
        [V3(-1, 4.5, 15), V3(2, 4, -30)],
        [V3(2.6, 3.2, 10.3), V3(1, 2.4, -4)],
      ],
    };
    const fwd = V[`${from}>${to}`];
    if (fwd) return fwd;
    const back = V[`${to}>${from}`];
    return back ? back.slice().reverse() : [];
  }
  /** Portrait screens: step back from the subject so it stays in frame. */
  function adaptForAspect(cam: CamDef): { pos: V3; tgt: V3 } {
    const a = camera.aspect;
    if (a >= 1.05 || cam === CAMS[0]) return { pos: cam.pos.clone(), tgt: cam.tgt.clone() };
    const k = 1 + (1.05 / a - 1) * 0.4;
    const pos = cam.subj.clone().add(cam.pos.clone().sub(cam.subj).multiplyScalar(k));
    const tgt = cam.tgt.clone().lerp(cam.subj, 0.65);
    tgt.y -= 0.22 * (k - 1);
    return { pos, tgt };
  }

  /* =====================================================================
     NAVIGATION
     ===================================================================== */
  let page = 0;
  let trans: Trans | null = null;
  /** The crab's debris are clearing before the walk to the next page: input waits for it. */
  let freeing = false;
  const camState = { pos: V3(), tgt: V3() };
  /** Stand-in the shot is composed on; the real camera eases towards it. */
  const aimCam = new THREE.PerspectiveCamera();
  /** Time constants (seconds) of the camera's ease in position and in angle. */
  const CAM_EASE = { move: 0.3, turn: 0.45 };
  const CAM_RIDE = { move: 0.1, turn: 0.16 };
  /** Sea-floor heights between which Mila goes from swimming to standing on the bottom. */
  const WADE = { from: -0.95, stand: -0.62 };
  /**
   * Her gestures with the light: `reach` holds her open hand out to the pearl's light (page 9),
   * `fist` closes it on nothing, `hug` folds her arms on the three voices (page 10).
   */
  const gesture = { reach: 0, fist: 0, hug: 0 };
  /** Height either side of the sea's surface the riding camera does not rest in. */
  const WATERLINE_GAP = 0.22;
  /** The next frame places the camera at once (first frame, cuts, direct page jumps). */
  let camSnap = true;
  let pageStart = 0;
  let freed = false;
  let mila: MilaRig;

  function go(to: number, instant = false): void {
    if (trans || freeing || to < 0 || to > PAGE_COUNT || to === page) return;
    const from = page;
    if (to === CRAB_PAGE + 1 && from === CRAB_PAGE && !freed) {
      freeAll();
      freeing = true;
      hooks.later(() => {
        freeing = false;
        go(to);
      }, 1700);
      return;
    }
    const still = reduceMotion || instant;
    if (still) camSnap = true;
    const dur = still ? 0 : (DURATIONS[`${from}>${to}`] ?? 5.5);
    const end = adaptForAspect(CAMS[to]);
    const via = still ? [] : viaFor(from, to);
    const posPts = [camState.pos.clone(), ...via.map((v) => v[0]), end.pos];
    const tgtPts = [camState.tgt.clone(), ...via.map((v) => v[1]), end.tgt];
    const mFrom = mila.g.position.clone();
    const mTo = MILA_AT[to].p.clone();
    const mvia = still
      ? []
      : (MILA_VIA[`${from}>${to}`] ?? (MILA_VIA[`${to}>${from}`] ?? []).slice().reverse()).map(
          (v) => v.clone(),
        );
    const milaC = new THREE.CatmullRomCurve3([mFrom, ...mvia, mTo], false, "centripetal");
    let rig: CamRig | null = null;
    // She is the subject of every page but the cover: the camera swings round her whether she
    // travels or stays, so no move ever leaves her behind.
    if (!still && (milaC.getLength() > 0.4 || (from >= 1 && to >= 1))) {
      const o0 = camState.pos.clone().sub(mFrom);
      const o1 = end.pos.clone().sub(mTo);
      const az0 = Math.atan2(o0.x, o0.z);
      const turn = Math.atan2(o1.x, o1.z) - az0;
      rig = {
        az0,
        // the short way round
        az1: az0 + Math.atan2(Math.sin(turn), Math.cos(turn)),
        r0: Math.hypot(o0.x, o0.z),
        r1: Math.hypot(o1.x, o1.z),
        y0: o0.y,
        y1: o1.y,
        look0: camState.tgt.clone().sub(mFrom),
        look1: end.tgt.clone().sub(mTo),
      };
    }
    trans = {
      from,
      to,
      t: 0,
      dur: Math.max(dur, 0.001),
      rig,
      posC: posPts.length > 2 ? new THREE.CatmullRomCurve3(posPts, false, "centripetal") : null,
      posPts,
      tgtC: tgtPts.length > 2 ? new THREE.CatmullRomCurve3(tgtPts, false, "centripetal") : null,
      tgtPts,
      milaC,
      mRy0: mila.g.rotation.y,
      mRy1: MILA_AT[to].ry,
      gold0: U.gold.value,
    };
    if (!still) sinceTurn = 0;
    page = to;
    hooks.onLeave(to);
    audio.onPage(to);
  }
  function finishTransition(): void {
    if (!trans) return;
    const to = trans.to;
    trans = null;
    pageStart = timer.getElapsed();
    hooks.onArrive(to);
  }
  function freeAll(): void {
    for (const d of debris) if (!d.gone) removeDebris(d);
  }
  function removeDebris(d: Debris): void {
    d.gone = true;
    d.t = 0;
    audio.chime(0);
    burst(d.mesh.position);
    if (debris.every((x) => x.gone) && !freed) {
      freed = true;
      crab.freedAt = timer.getElapsed();
      hooks.onFreed();
      hooks.later(() => audio.chime(2), 900);
    }
  }

  /* footprints in the sand and contact shadow under Mila */
  let prints: THREE.InstancedMesh;
  let blob: THREE.Mesh;
  let printI = 0;
  const _fw = V3();
  function buildGroundMarks(): void {
    const tex = canvasTex(64, 128, (g, w, hh) => {
      g.clearRect(0, 0, w, hh);
      g.fillStyle = "rgba(60,32,12,1)";
      g.beginPath();
      g.ellipse(32, 82, 15, 30, 0, 0, 6.28);
      g.fill();
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.ellipse(18 + k * 7, 40 - Math.abs(k - 1) * 3, 4.2 - k * 0.4, 5.5 - k * 0.4, 0, 0, 6.28);
        g.fill();
      }
    });
    prints = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.075, 0.15).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        fog: true,
      }),
      48,
    );
    const o = new THREE.Object3D();
    o.scale.setScalar(0);
    o.updateMatrix();
    for (let i = 0; i < 48; i++) prints.setMatrixAt(i, o.matrix);
    prints.renderOrder = 1;
    scene.add(prints);
    const bt = canvasTex(128, 128, (g, w, hh) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, "rgba(30,15,5,.55)");
      gr.addColorStop(0.6, "rgba(30,15,5,.18)");
      gr.addColorStop(1, "rgba(30,15,5,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, hh);
    });
    blob = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false }),
    );
    blob.renderOrder = 1;
    scene.add(blob);
  }
  function footprint(L: Leg): void {
    L.ankle.getWorldPosition(_fw);
    const gh = groundH(_fw.x, _fw.z);
    if (gh < 0.08) return;
    dummy.position.set(_fw.x, gh + 0.006, _fw.z);
    dummy.rotation.set(0, mila.g.rotation.y, 0);
    dummy.scale.set(L.sx < 0 ? -1 : 1, 1, 1);
    dummy.updateMatrix();
    prints.setMatrixAt(printI, dummy.matrix);
    printI = (printI + 1) % 48;
    prints.instanceMatrix.needsUpdate = true;
  }
  function updateGround(): void {
    const gp = mila.g.position;
    const gh = groundH(gp.x, gp.z);
    const on = gp.y > -0.2 && gh > -0.05;
    blob.visible = on;
    if (on) {
      blob.position.set(gp.x, gh + 0.008, gp.z);
      blob.rotation.y = mila.g.rotation.y;
    }
  }

  /* golden sparks */
  const bursts: Burst[] = [];
  function burst(p: V3): void {
    const n = 24;
    const arr = new Float32Array(n * 3);
    const vel: V3[] = [];
    for (let i = 0; i < n; i++) {
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y + 0.1;
      arr[i * 3 + 2] = p.z;
      vel.push(V3(rr(-1, 1), rr(0.6, 2), rr(-1, 1)).multiplyScalar(0.9));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const m = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        map: glowTex,
        color: new THREE.Color(2, 1.5, 0.6),
        size: 0.14,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(m);
    bursts.push({ m, vel, t: 0 });
  }

  /* =====================================================================
     LOOP
     ===================================================================== */
  let wtime = 0;
  let motion = 1;
  let motionT = 1;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const tmpV = V3();
  const tmpV2 = V3();
  const perf = { n: 0, sum: 0, done: false, level: 2 };
  const HEMI_SKY = new THREE.Color("#6fb2b8");
  const HEMI_SKY_SEA = new THREE.Color("#5fd0c4");
  const HEMI_GROUND = new THREE.Color("#b8743e");
  const HEMI_GROUND_SEA = new THREE.Color("#1b5a5a");
  let sky: THREE.Mesh;

  function animateMila(rdt: number): void {
    const M = mila;
    const target = trans ? trans.to : page;
    const afloat =
      M.g.position.y < -0.25 && groundH(M.g.position.x, M.g.position.z) < WADE.stand ? 1 : 0;
    M.swimW = lerp(M.swimW, afloat, Math.min(1, rdt * 3.6));
    if (M.snap) {
      M.swimW = afloat;
      M.hold = HOLD_PAGES.has(target) && M.swimW < 0.3 ? 1 : 0;
      M.snap = false;
    }
    M.hold = lerp(M.hold, HOLD_PAGES.has(target) && M.swimW < 0.3 ? 1 : 0, Math.min(1, rdt * 1.8));
    M.swim = M.swimW;
    M.walk = (1 - M.swimW) * M.moving;
    const gp = M.g.position;
    if (!M.prev) M.prev = gp.clone();
    const stepD = Math.hypot(gp.x - M.prev.x, gp.z - M.prev.z);
    M.prev.copy(gp);
    M.phase +=
      (((1 - M.swimW) * Math.min(stepD, 0.05)) / 0.36) * Math.PI +
      // the idle stroke follows the motion control; a stroke that carries her along does not
      rdt * M.swimW * (2.6 * motion + M.moving * 2.6);
    U.swimD.value = M.swimW;
    const u = (((M.phase / (Math.PI * 2)) % 1) + 1) % 1;
    // pendant / held conch
    M.held.position.lerpVectors(PEND_P, HOLD_P, M.hold);
    M.held.quaternion.slerpQuaternions(PEND_Q, HOLD_Q, M.hold);
    M.held.scale.setScalar(lerp(0.1, 0.17, M.hold));
    M.cord.visible = M.hold < 0.6;
    // body: upright on the sand, stretched out when swimming
    const hover = page === 10 && !trans ? 1.15 : 1.0;
    // stretched out when she swims; on the sand she leans a little into her stride
    const tilt =
      M.swimW * (lerp(hover, 1.3, clamp(M.moving * 1.5, 0, 1)) + M.pitch) + 0.06 * M.walk;
    M.pose.rotation.x = lerp(M.pose.rotation.x, tilt, Math.min(1, rdt * 2.5));
    const breath = smooth(0.15, 0.38, u) * (1 - smooth(0.45, 0.65, u));
    M.head.rotation.x =
      -M.pose.rotation.x * 0.5 - breath * 0.22 * M.swimW + Math.sin(wtime * 0.45) * 0.02;
    // hip sway when walking
    M.pose.rotation.z = Math.sin(M.phase) * 0.045 * M.walk;
    M.body.rotation.y = Math.sin(M.phase) * 0.07 * M.walk;
    // her head stays level while the hips sway
    M.head.rotation.y = -Math.sin(M.phase) * 0.05 * M.walk;
    M.head.rotation.z = -Math.sin(M.phase) * 0.03 * M.walk;
    M.pose.position.y = 0.62;
    M.body.position.z = 0;
    // legs: walk (thigh, knee bending on the pass, flat foot) and breaststroke kick
    const rec = smooth(0.3, 0.55, u) * (1 - smooth(0.6, 0.72, u));
    const abd = smooth(0.48, 0.62, u) * (1 - smooth(0.68, 0.86, u));
    M.legs.forEach((L) => {
      const ph = M.phase + (L.sx > 0 ? Math.PI : 0);
      const cph = Math.cos(ph);
      const wHip = -Math.sin(ph) * 0.4;
      const wKnee = 0.05 + Math.pow(Math.max(0, cph), 1.4) * 0.95;
      const wAnk = -(wHip + wKnee) + Math.max(0, -Math.sin(ph + 0.9)) * 0.22 * Math.max(0, -cph);
      const sHip = -0.8 * rec;
      const sKnee = 1.85 * rec;
      const sAnk = 0.95 * (1 - rec) - 0.2 * rec;
      const wW = M.walk;
      const wS = M.swimW;
      L.hip.rotation.x = wHip * wW + sHip * wS;
      L.knee.rotation.x = wKnee * wW + sKnee * wS + 0.04 * (1 - wW - wS);
      L.ankle.rotation.x = wAnk * wW + sAnk * wS;
      L.hip.rotation.z = L.sx * (0.04 * wS + 0.38 * abd * wS);
      // the foot lands: a print in the sand
      if (wW > 0.3 && L.prevC > 0 && cph <= 0) footprint(L);
      L.prevC = cph;
    });
    // the standing foot touches the ground: the body drops as the longest leg shortens
    let reach = 0;
    for (const L of M.legs) {
      const hr = L.hip.rotation.x;
      const k = L.knee.rotation.x;
      reach = Math.max(
        reach,
        0.245 * Math.cos(hr) * Math.cos(L.hip.rotation.z) + 0.222 * Math.cos(hr + k),
      );
    }
    M.inner.position.y = -0.62 - (0.467 - reach) * (1 - M.swimW) - 0.006 * (1 - M.swimW);
    // what the tale says of her hands
    const sincePage = timer.getElapsed() - pageStart;
    const still9 = page === 9 && !trans;
    gesture.reach = lerp(
      gesture.reach,
      still9 ? smooth(1.2, 2.6, sincePage) * (1 - smooth(5.0, 6.2, sincePage)) : 0,
      Math.min(1, rdt * 4),
    );
    gesture.fist = lerp(
      gesture.fist,
      still9 ? smooth(4.2, 4.8, sincePage) * (1 - smooth(6.6, 7.6, sincePage)) : 0,
      Math.min(1, rdt * 6),
    );
    const hugging =
      (page === 10 && !trans) ||
      (!!trans && trans.to === 10 && trans.from === 9 && trans.t > 0.3) ||
      (!!trans && trans.from === 10 && trans.to === 11 && trans.t < 0.45);
    gesture.hug = lerp(gesture.hug, hugging ? 1 : 0, Math.min(1, rdt * 2.5));
    const lightLocal = M.body.worldToLocal(
      V3(liveConch.position.x - 0.3, liveConch.position.y + 0.9, liveConch.position.z),
    );
    // arms
    const wS = M.swimW;
    const wH = (1 - wS) * M.hold;
    const wR = (1 - wS) * (1 - M.hold);
    const cp = M.held.position;
    const sp = SWIM_CURVE.getPoint(u < 0.62 ? u / 0.62 : 0);
    for (const A of M.arms) {
      const sd = A.sd;
      const hH = sd > 0 ? cp.clone().add(V3(0.003, -0.07, -0.012)) : V3(-0.135, 0.67, 0.06);
      const hP = A.S.clone().add(sd > 0 ? V3(0.25, -0.25, -0.15) : V3(-0.12, 0, -0.3));
      const rH = V3(
        sd * 0.15,
        0.65,
        0.03 - Math.sin(M.phase + (sd > 0 ? 0 : Math.PI)) * 0.13 * M.walk,
      );
      const rP = A.S.clone().add(V3(sd * 0.12, 0, -0.3));
      const sH = V3(sp.x * sd, sp.y, sp.z);
      const sP = A.S.clone().add(V3(sd * 0.35, -0.05, -0.15));
      // the hem leans towards +x in the wind (dress shader): give the left hand that much more room
      const H = clearOfDress(
        hH.multiplyScalar(wH).addScaledVector(rH, wR).addScaledVector(sH, wS),
        sd > 0 ? 0.03 + U.wind.value * 0.06 : 0,
      );
      const Pp = hP.multiplyScalar(wH).addScaledVector(rP, wR).addScaledVector(sP, wS);
      const look = (sd > 0 ? cp.clone() : hH.clone().add(V3(0.2, 0, 0)))
        .multiplyScalar(wH)
        .addScaledVector(H.clone().add(V3(-sd * 0.2, 0, 0)), wR)
        .addScaledVector(H.clone().add(V3(0, -0.2, 0.04)), wS);
      const up = (sd > 0 ? V3(1, 0, 0) : V3(0, -1, 0))
        .multiplyScalar(wH)
        .addScaledVector(V3(0, -1, 0), wR)
        .addScaledVector(V3(sd * 0.3, 1, 0), wS);
      if (up.lengthSq() < 1e-6) up.set(0, 1, 0);
      if (sd > 0 && gesture.reach > 0.001) {
        // page 9: her open hand held out towards the light, as far as her arm goes
        const out = lightLocal.clone().sub(A.S);
        out.setLength(Math.min(out.length(), (A.L1 + A.L2) * 0.94));
        H.lerp(out.add(A.S), gesture.reach);
        Pp.lerp(A.S.clone().add(V3(sd * 0.25, -0.2, -0.05)), gesture.reach);
        // the fingers close on nothing
        A.hand.children.forEach((finger, f) => {
          if (f > 0) finger.rotation.x = gesture.fist * 1.35;
        });
      }
      if (gesture.hug > 0.001) {
        // page 10: both hands folded on her chest, the three voices held against her
        H.lerp(V3(sd * 0.05, 0.8, 0.155), gesture.hug);
        Pp.lerp(A.S.clone().add(V3(sd * 0.22, -0.18, 0.02)), gesture.hug);
      }
      solveArm(A, H, Pp, look, up);
    }
  }
  function heldConchWorld(out: V3): V3 {
    mila.held.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(mila.held.matrixWorld);
  }
  function buildThreads(): void {
    const H = (x: number, z: number, d = 0.16): V3 => V3(x, Math.max(groundH(x, z), 0) + d, z);
    const defs: { from: number; pts: () => V3[] }[] = [
      {
        from: 3,
        pts: () => [
          heldConchWorld(V3()),
          V3(2.3, 0.6, 4.6),
          H(4, 3.1),
          H(6.5, 2.6),
          H(9, 2.4),
          H(11.5, 2.9),
          H(13.2, 3.9, 0.2),
        ],
      },
      {
        from: 6,
        pts: () => [
          V3(M6.x, 0.5, M6.z - 0.4),
          V3(M6.x - 0.3, 0.05, M6.z - 1.6),
          V3(M6.x - 0.9, -1.6, M6.z - 5),
          V3(9.6, -3.6, -10),
          V3(MEADOW.x - 1, MEADOW.y + 2.2, MEADOW.z + 2),
        ],
      },
      {
        from: 7,
        pts: () => [
          V3(MEADOW.x + 0.5, MEADOW.y + 2.4, MEADOW.z - 0.5),
          V3(MEADOW.x + 2.5, MEADOW.y + 1.6, MEADOW.z - 6),
          V3(SCHOOL.x, SCHOOL.y + 3, SCHOOL.z),
          V3(12.5, DEEP.y + 4, DEEP.z + 8),
          V3(DEEP.x - 0.6, DEEP.y + 1.4, DEEP.z + 2),
        ],
      },
      {
        from: 9,
        pts: () => [
          V3(DEEP.x - 0.4, DEEP.y + 1.6, DEEP.z + 1.5),
          V3(12, -6, -24),
          V3(7.4, -2.2, -9),
          V3(5.5, 0.08, -4),
          V3(4.2, 0.1, 1.6),
          heldConchWorld(V3()),
        ],
      },
    ];
    for (const d of defs) {
      const prog = { value: 0 };
      const curve = new THREE.CatmullRomCurve3(d.pts());
      const m = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 260, 0.016, 6, false),
        threadMat(prog),
      );
      m.renderOrder = 5;
      m.frustumCulled = false;
      scene.add(m);
      THREADS.push({ from: d.from, prog });
    }
  }

  function update(): void {
    timer.update();
    const rawDt = timer.getDelta();
    const rdt = Math.min(rawDt, 0.05);
    sinceTurn += rdt;
    const turn = clamp(sinceTurn / WASH_SECONDS, 0, 1);
    // quick to wet, slow to dry, as in Ti Kannot's world
    U_wash.value = turn < 1 ? 0.8 * Math.sin(Math.PI * Math.pow(turn, 0.6)) ** 2 : 0;
    const { w, h: hh } = size();
    // adaptive quality: drop the Kuwahara pass, then resolution and shadows, on slow devices
    if (!perf.done && page > 0) {
      perf.n++;
      perf.sum += rawDt;
      if (perf.n === 90) {
        const avg = perf.sum / 90;
        if (avg > 0.026) {
          paintPass.uniforms.uKuwa.value = 0;
          perf.level = 1;
        }
        if (avg > 0.04) {
          renderer.setPixelRatio(1);
          composer?.setSize(w, hh);
          bloom.setSize(w, hh);
          moonL.castShadow = false;
          perf.level = 0;
        }
        perf.n = 0;
        perf.sum = 0;
        thinSea(perf.level);
        if (avg < 0.026 || perf.level === 0) perf.done = true;
      }
    }
    motion = lerp(motion, motionT, Math.min(1, rdt * 3));
    // land exactly on the target so a pause really stops the world
    if (Math.abs(motion - motionT) < 0.002) motion = motionT;
    const dt = rdt * motion;
    wtime += dt;
    U.time.value = wtime;
    SEA.uFlow.value += dt * FLOW_RATE;
    const T = timer.getElapsed();

    // camera
    if (trans) {
      trans.t += rdt / trans.dur;
      const k = clamp(trans.t, 0, 1);
      const e = easeIO(k);
      // by arc length: an even pace along the path, with no surge between two stops
      if (trans.posC) trans.posC.getPointAt(e, camState.pos);
      else camState.pos.lerpVectors(trans.posPts[0], trans.posPts[1], e);
      if (trans.tgtC) trans.tgtC.getPoint(e, camState.tgt);
      else camState.tgt.lerpVectors(trans.tgtPts[0], trans.tgtPts[1], e);
      // Mila follows her own path
      const onLand =
        trans.milaC.getPoint(0, tmpV2).y > -0.2 && trans.milaC.getPoint(1, tmpV2).y > -0.2;
      // in the water she glides at an even pace, without the surge of a cubic ease
      const me = onLand ? walkEase(k) : easeIO(k);
      trans.milaC.getPoint(me, mila.g.position);
      let dr = trans.mRy1 - trans.mRy0;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      mila.g.rotation.y = trans.mRy0 + dr * smooth(0.84, 1, k);
      const pathLen = trans.milaC.getLength();
      if (pathLen > 0.4) {
        const tg = trans.milaC.getTangent(me, tmpV);
        mila.g.rotation.y = lerpAngle(
          mila.g.rotation.y,
          // she turns to face her way as she sets off, keeps to it, and turns to her place only
          // as she slows: never a step sideways
          lerpAngle(trans.mRy0, Math.atan2(tg.x, tg.z), smooth(0, 0.1, k)),
          smooth(0.0, 0.08, k) * smooth(1, 0.86, k),
        );
      }
      // The stride is at full swing for as long as she moves at pace (the plateau of `walkEase`),
      // not only at mid-way: a small step under a body that travels fast reads as sliding.
      mila.moving =
        pathLen > 0.4
          ? onLand
            ? smooth(0, 0.16, k) * smooth(1, 0.84, k)
            : Math.sin(Math.PI * k)
          : 0;
      // While she travels she is the subject: the camera rides with her, swinging round her from
      // the page's framing to the next one's, and looks at her most of the way. Nothing here
      // depends on a fixed route, so it holds for every move, forwards and back.
      const R = trans.rig;
      if (R) {
        const az = lerp(R.az0, R.az1, e);
        const r = lerp(R.r0, R.r1, e);
        const mp = mila.g.position;
        camState.pos.set(
          mp.x + Math.sin(az) * r,
          mp.y + lerp(R.y0, R.y1, e),
          mp.z + Math.cos(az) * r,
        );
        // never through the sand or the sea floor
        camState.pos.y = Math.max(camState.pos.y, groundH(camState.pos.x, camState.pos.z) + 0.3);
        // nor lingering in the skin of the sea, half in and half out: it crosses at once
        if (Math.abs(camState.pos.y) < WATERLINE_GAP)
          camState.pos.y = camState.pos.y >= 0 ? WATERLINE_GAP : -WATERLINE_GAP;
        // and it stays on her side of the surface: from above, the sea would hide her
        if (mp.y < -0.75) camState.pos.y = Math.min(camState.pos.y, -WATERLINE_GAP);
        camState.tgt.copy(mp).add(tmpV2.lerpVectors(R.look0, R.look1, e));
        const pull = smooth(0, 0.3, k) * smooth(1, 0.7, k) * 0.85;
        camState.tgt.lerp(tmpV2.copy(mp).setY(mp.y + 0.7), pull);
      }
      {
        const tg = trans.milaC.getTangent(me, tmpV2);
        mila.pitch = lerp(mila.pitch, clamp(-tg.y, -1, 1) * 0.7 * mila.moving, 0.2);
      }
      // golden reflections follow the tale
      U.gold.value = lerp(trans.gold0, GOLD[trans.to], e);
      // golden threads drawn during the passage
      for (const th of THREADS)
        if (trans.to === th.from + 1 && trans.from === th.from)
          th.prog.value = smooth(0.05, 0.85, k);
      if (trans.t >= 1) finishTransition();
    } else {
      mila.moving = lerp(mila.moving, 0, rdt * 3);
      mila.pitch = lerp(mila.pitch, 0, rdt * 2);
    }
    for (const th of THREADS) {
      if (!trans || !(trans.from === th.from && trans.to === th.from + 1)) {
        const tgt = page > th.from ? 1 : 0;
        th.prog.value = lerp(th.prog.value, tgt, Math.min(1, rdt * (tgt ? 2 : 1.5)));
      }
    }
    if (!trans && page === 9) {
      // Page 9 turns on a gesture: the camera draws in on her hand and the light, slowly, so the
      // open hand and its closing, empty, can be read; it stays close until the page is left.
      const wide = adaptForAspect(CAMS[9]);
      const hand = (mila.arms.find((a) => a.sd > 0) ?? mila.arms[0]).hand.getWorldPosition(tmpV);
      const near = smooth(0.6, 3.6, T - pageStart) * (reduceMotion ? 0 : 1);
      camState.pos.copy(wide.pos).lerp(hand, 0.5 * near);
      camState.tgt.copy(wide.tgt).lerp(hand, 0.8 * near);
    }
    pointer.sx = lerp(pointer.sx, pointer.x, rdt * 2);
    pointer.sy = lerp(pointer.sy, pointer.y, rdt * 2);
    // The move is composed on a stand-in, and the real camera eases onto it: its position and
    // above all its angle are damped, so a change of direction is a turn of the head, never a cut.
    const lens = aimCam;
    lens.position.copy(camState.pos);
    const right = tmpV
      .subVectors(camState.tgt, camState.pos)
      .normalize()
      .cross(camera.up)
      .normalize();
    // pointer parallax eases out with the motion control (and never runs with reduced motion)
    const par = reduceMotion ? 0 : (page === 2 ? 0.05 : 0.16) * motion;
    lens.position
      .addScaledVector(right, pointer.sx * par)
      .add(tmpV2.set(0, -pointer.sy * par * 0.5, 0));
    if (!reduceMotion) lens.position.y += Math.sin(T * 0.4) * 0.015 * motion;
    lens.lookAt(camState.tgt);
    if (camSnap || reduceMotion) {
      camera.position.copy(lens.position);
      camera.quaternion.copy(lens.quaternion);
      camSnap = false;
    } else {
      // riding with Mila, the move is smooth by construction: a short ease, or she would outrun it
      const ease = trans?.rig ? CAM_RIDE : CAM_EASE;
      camera.position.lerp(lens.position, 1 - Math.exp(-rdt / ease.move));
      camera.quaternion.slerp(lens.quaternion, 1 - Math.exp(-rdt / ease.turn));
    }
    U.camPos.value.copy(camera.position);

    // under water?
    const under = smooth(0.12, -0.25, camera.position.y);
    U.under.value = under;
    fog.color.copy(NIGHT_FOG).lerp(SEA_FOG, under);
    fog.density = lerp(0.0042, 0.06, under);
    hemi.color.copy(HEMI_SKY).lerp(HEMI_SKY_SEA, under);
    hemi.groundColor.copy(HEMI_GROUND).lerp(HEMI_GROUND_SEA, under);
    hemi.intensity = lerp(1.05, 1.5, under);
    fillL.intensity = lerp(0.85, 0.2, under);
    moonL.intensity = lerp(2.3, 1.2, under);
    heldConchWorld(U_conchAt.value);
    dust.visible = under > 0;
    dust.material.uniforms.uPx.value =
      (hh * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    fireflies.material.uniforms.uTime.value = wtime;
    fireflies.material.uniforms.uOpacity.value = (1 - under) * 0.85;
    updateBoat(wtime);
    sky.position.copy(camera.position);

    // the shadow follows the action
    const focus = CAMS[page] ? CAMS[page].subj : HOME;
    // under water the light comes down the way the sea bends it, as the caustics and shafts do
    moonL.position
      .copy(focus)
      .addScaledVector(tmpV.copy(U.moonDir.value).lerp(SEA.uSeaSun.value, under).normalize(), 40);
    moonL.target.position.copy(focus);

    // living world
    updateSeaGrape(wtime);
    const b = mila.body;
    b.scale.y = 1 + Math.sin(wtime * 1.7) * 0.008 * (1 - mila.swimW);
    b.position.y = Math.sin(wtime * 1.7) * 0.004;
    mila.head.rotation.z =
      (-0.1 + Math.sin(wtime * 0.6) * 0.025 - (page === 2 ? 0.04 : 0)) * mila.hold;
    animateMila(rdt);
    mila.puffs.forEach((p, i) => {
      p.rotation.z = Math.sin(wtime * 2.1 + i) * 0.06 * (1 + mila.swim * 2);
      p.rotation.x = Math.sin(wtime * 1.7 + i) * 0.05 * (1 + mila.swim * 2);
    });
    if (!trans)
      mila.g.position.y = MILA_AT[page].p.y + (mila.swimW > 0.1 ? Math.sin(wtime * 1.2) * 0.08 : 0);
    {
      const gp = mila.g.position;
      const gh = groundH(gp.x, gp.z);
      if (gh > WADE.from) {
        // Where the water is shallow her feet find the bottom: she wades in and out, upright,
        // instead of swimming over the sand or walking on the water.
        gp.y = lerp(Math.max(gp.y, gh + 0.35), gh, smooth(WADE.from, WADE.stand, gh));
      } else gp.y = Math.max(gp.y, gh + 0.35);
    }
    updateGround();
    U.wind.value = lerp(U.wind.value, mila.swimW * 1.2 + mila.walk * 0.4, rdt * 2);
    const calmPage = page >= 3 && page <= 10;
    U.calm.value = lerp(U.calm.value, calmPage ? 1 : 0, rdt * (calmPage ? 0.6 : 0.35));
    const smile = page === 12 && !trans && T - pageStart > 1.2;
    mila.open.visible = smile;
    mila.closed.visible = !smile;
    // conch glow
    U.glow.value = lerp(U.glow.value, GLOW[page], rdt * 1.5);
    U_bigGlow.value = 0.06 + U.song.value * 0.25;
    U.song.value = lerp(
      U.song.value,
      page === 12 ? 1 : page === 11 && !trans && T - pageStart > 2.5 ? 0.8 : 0,
      rdt * 0.8,
    );

    // crab
    const ct = wtime;
    crab.legs.forEach(({ pv, s, i }) => {
      pv.rotation.z = Math.sin(ct * (freed ? 9 : 2) + i * 1.3) * (freed ? 0.35 : 0.12) * s;
    });
    crab.claws.forEach(({ pv, pin, s }) => {
      pin.rotation.x = -0.4 + Math.sin(ct * 3 + s) * 0.35;
      pv.rotation.y = Math.sin(ct * 0.8 + s) * 0.15;
    });
    if (freed) {
      const k = clamp((T - crab.freedAt) / 3.5, 0, 1);
      crab.g.position.copy(crab.base).add(V3(-1.15 * easeIO(k), 0, -0.25 * easeIO(k)));
      crab.g.position.y =
        groundH(crab.g.position.x, crab.g.position.z) +
        0.12 +
        Math.abs(Math.sin(ct * 9)) * 0.015 * (1 - k);
    } else {
      crab.g.position.copy(crab.base);
      crab.g.position.x += Math.sin(ct * 0.7) * 0.05;
    }
    for (const d of debris) {
      const m = d.mesh;
      if (d.gone) {
        d.t += rdt;
        const k = clamp(d.t / 1.4, 0, 1);
        m.position.copy(d.home).add(V3(0, easeIO(k) * 1.6, 0));
        m.rotation.x += rdt * 3;
        m.rotation.y += rdt * 2;
        m.scale.setScalar(Math.max(0.001, 1.5 * (1 - k)));
        m.visible = k < 1;
      } else {
        m.visible = true;
        m.scale.setScalar(1.5);
        m.position.copy(d.home);
        m.position.y += Math.sin(wtime * 1.5 + d.home.x) * 0.005;
      }
    }

    // turtle
    const lap = turtleCourse(wtime * 0.16);
    turtle.position.set(
      MEADOW.x + lap.x,
      MEADOW.y + 1.8 + Math.sin(wtime * 0.5) * 0.25,
      MEADOW.z + lap.z,
    );
    turtle.rotation.set(Math.sin(wtime * 0.5) * 0.08, lap.heading, Math.sin(wtime * 0.8) * 0.1);
    flippers.forEach((f) => {
      f.pv.rotation.z =
        Math.sin(wtime * (f.big ? 1.6 : 1.2) + (f.big ? 0 : 1)) * (f.big ? 0.5 : 0.25) * f.s;
      f.pv.rotation.y = Math.sin(wtime * 1.6) * 0.25 * f.s;
    });
    // fish
    const reveal = page >= 7 ? (page === 7 && !trans ? smooth(1.5, 4, T - pageStart) : 1) : 0;
    const o = dummy;
    o.scale.set(1, 1, 1);
    for (let i = 0; i < fishData.length; i++) {
      const f = fishData[i];
      f.a += dt * f.s;
      const ctr = f.grp === 2 ? DEEP : MEADOW;
      const vis = Math.max(f.vis, reveal);
      const x = ctr.x + Math.cos(f.a) * f.r * (f.grp === 1 ? 1.5 : 1);
      const z = ctr.z + Math.sin(f.a) * f.r;
      const y = ctr.y + f.y + Math.sin(wtime * 0.8 + f.ph) * 0.25;
      o.position.set(x, y, z);
      o.rotation.set(0, -f.a + (f.s > 0 ? 0 : Math.PI), Math.sin(wtime * 6 + f.ph) * 0.15);
      o.scale.setScalar(f.sc * Math.max(0.001, vis));
      o.updateMatrix();
      fish.setMatrixAt(i, o.matrix);
    }
    fish.instanceMatrix.needsUpdate = true;
    // the school wraps around Mila on page 8
    {
      const around = page === 8 && !trans;
      schoolCtr.lerp(
        around
          ? tmpV.set(mila.g.position.x, mila.g.position.y + 0.75, mila.g.position.z)
          : tmpV.set(SCHOOL.x, SCHOOL.y + 2.6, SCHOOL.z),
        Math.min(1, dt * 0.6),
      );
      const spread = around ? 1.25 : 0.75;
      for (let i = 0; i < schoolData.length; i++) {
        const f = schoolData[i];
        f.a += dt * f.sp * (around ? 0.9 : 0.6);
        const r = f.r * spread;
        o.position.set(
          schoolCtr.x + Math.cos(f.a) * r,
          schoolCtr.y + f.h * (around ? 1.2 : 0.8) + Math.sin(wtime * 1.1 + f.ph) * 0.18,
          schoolCtr.z + Math.sin(f.a) * r,
        );
        o.rotation.set(0, -f.a, Math.sin(wtime * 7 + f.ph) * 0.18);
        o.scale.setScalar(f.sc);
        o.updateMatrix();
        school.setMatrixAt(i, o.matrix);
      }
      school.instanceMatrix.needsUpdate = true;
    }
    // the sea grass parts (page 7)
    U.part.value = lerp(
      U.part.value,
      page === 7 && !trans && T - pageStart > 0.8 ? 1 : 0,
      rdt * 0.8,
    );

    // pearl
    (pearlHalo.material as THREE.SpriteMaterial).opacity = 0.7 + 0.3 * Math.sin(wtime * 2);
    pearl.position.y += Math.sin(wtime * 1.3) * 0.0006 * motion;
    U_liveGlow.value = 0.1 + (page === 9 ? 0.25 + 0.15 * Math.sin(wtime * 2) : 0);

    updateSigns(rdt, T, wtime);
    for (let i = bursts.length - 1; i >= 0; i--) {
      const B = bursts[i];
      B.t += rdt;
      const a = B.m.geometry.attributes.position;
      for (let j = 0; j < B.vel.length; j++) {
        B.vel[j].y -= rdt * 1.2;
        a.setXYZ(
          j,
          a.getX(j) + B.vel[j].x * rdt,
          a.getY(j) + B.vel[j].y * rdt,
          a.getZ(j) + B.vel[j].z * rdt,
        );
      }
      a.needsUpdate = true;
      (B.m.material as THREE.PointsMaterial).opacity = 1 - B.t / 1.6;
      if (B.t > 1.6) {
        scene.remove(B.m);
        disposeObject(B.m);
        bursts.splice(i, 1);
      }
    }

    audio.update(rdt, under, U.song.value, U.calm.value);
    (paintPass.uniforms.uRes.value as THREE.Vector2).set(
      w * renderer.getPixelRatio(),
      hh * renderer.getPixelRatio(),
    );
    composer?.render();
  }

  /** The three voices: they leave the conch on page 2, join Mila as she finds them, then go home. */
  function updateSigns(dt: number, T: number, W: number): void {
    const since = T - pageStart;
    const conch = heldConchWorld(V3());
    const homes = [
      V3(crab.base.x, crab.base.y + 0.45, crab.base.z),
      V3(MEADOW.x + 0.5, MEADOW.y + 1.6, MEADOW.z - 0.5),
      V3(liveConch.position.x - 0.3, liveConch.position.y + 0.9, liveConch.position.z),
    ];
    const mp = mila.g.position;
    const up = mila.swimW > 0.5 ? 1.15 : 1.25;
    const rad = mila.swimW > 0.5 ? 0.85 : 0.6;
    const held = gesture.hug > 0.5;
    const chest = mila.body.localToWorld(V3(0, 0.84, 0.17));
    const palm = (mila.arms.find((a) => a.sd > 0) ?? mila.arms[0]).hand.getWorldPosition(V3());
    SIGNS.forEach((s, i) => {
      let tgt: V3;
      let sc: number;
      let spd = 1.6;
      // held against her (page 10), the three lights keep close to her chest
      const follow = held
        ? chest
            .clone()
            .add(
              V3(
                Math.cos(W * 0.9 + i * 2.09) * 0.15,
                Math.sin(W * 1.3 + i) * 0.05,
                Math.sin(W * 0.9 + i * 2.09) * 0.15,
              ),
            )
        : page === 9 && !trans
          ? // page 9: the lights she already has wait above and behind her, clear of her face
            V3(
              mp.x + 0.5 + Math.cos(W * 0.6 + i * 3.1) * 0.35,
              mp.y + 1.75 + Math.sin(W * 1.1 + i) * 0.08,
              mp.z + 0.9 + Math.sin(W * 0.6 + i * 3.1) * 0.35,
            )
          : V3(
              mp.x + Math.cos(W * 0.8 + i * 2.09) * rad,
              mp.y + up + Math.sin(W * 1.3 + i) * 0.1,
              mp.z + Math.sin(W * 0.8 + i * 2.09) * rad,
            );
      const got = [
        freed && page >= 5,
        page >= 7 && (page > 7 || since > 3.2),
        page >= 9 && (page > 9 || since > 5.0),
      ][i];
      if (page <= 1) {
        tgt = conch;
        sc = 0;
      } else if (page === 2) {
        if (trans) {
          tgt = conch;
          sc = 0;
        } else if (since < 3.2) {
          // the three voices unwind out of the shell in a widening spiral, growing as they come
          const u = since / 3.2;
          const a = since * 2.7 + i * 2.09;
          const r = 0.04 + 0.26 * u;
          tgt = conch.clone().add(
            V3(
              // up and a little seaward, beside her: clear of the text on the left
              -0.06 - 0.13 * u * (1 + 0.3 * i) + Math.cos(a) * r * 0.5,
              0.08 + 0.3 * u + Math.sin(a) * r,
              0.1 - 0.2 * u - i * 0.06,
            ),
          );
          sc = 0.3 + 0.55 * u;
          spd = 6;
        } else {
          tgt = homes[i];
          // they leave for the sea smaller and fading, without crossing the text at full glow
          sc = since < 5 ? 0.6 : 0;
          spd = 2.5;
        }
      } else if (page >= 11) {
        if (page === 11 && !trans && since < 2.6) {
          const k = 1 - since / 2.6;
          tgt = conch
            .clone()
            .add(
              V3(
                Math.cos(W * 2 + i * 2.1) * 0.4 * k,
                0.2 + 0.3 * k,
                Math.sin(W * 2 + i * 2.1) * 0.4 * k,
              ),
            );
          sc = 1;
          spd = 3;
        } else if (page === 11 && trans) {
          tgt = follow;
          sc = 1;
          spd = 4;
        } else {
          tgt = conch;
          sc = 0;
          spd = 3;
        }
      } else if (i === 0 && got && page === 6 && !trans) {
        tgt = V3(
          mp.x + Math.sin(W * 1.3) * 0.25,
          mp.y + 0.45 + Math.sin(W * 2) * 0.08,
          mp.z - 1.5 - Math.sin(W * 0.9) * 0.3,
        );
        sc = 1.15;
        spd = 1.8;
      } else if (i === 2 && page === 9 && !trans && since > 1.4 && since <= 5.0) {
        // page 9: the pearl's light rises to her open hand and waits above it; when her hand
        // closes, empty, the light is free and goes with her
        tgt = palm.clone().add(V3(0, 0.16, 0));
        sc = 0.42;
        spd = 1.3;
      } else if (got) {
        tgt = follow;
        sc = held ? 0.55 : page === 9 && !trans ? 0.55 : 1;
        spd = held ? 4 : 2.2;
      } else {
        tgt = homes[i];
        sc = 0;
        spd = 3;
      }
      const d = tgt.clone().sub(s.g.position);
      const dist = d.length();
      if (dist > 30) s.g.position.copy(tgt);
      else s.g.position.addScaledVector(d, Math.min(1, dt * spd));
      const was = s.sc > 0.5;
      s.sc = lerp(s.sc, sc, Math.min(1, dt * 2.2));
      if (!was && s.sc > 0.5 && page >= 5) audio.chime(i);
      const pul = 1 + Math.sin(W * 3 + i) * 0.06;
      // A light is a guide, never a glare: it dims as it nears the camera (where its halo would
      // flood the frame) and where it drifts behind the text, which must stay readable.
      const ndc = tmpV.copy(s.g.position).project(camera);
      const near = smooth(1.1, 5, camera.position.distanceTo(s.g.position));
      const onText =
        ndc.z < 1
          ? camera.aspect >= 1
            ? smooth(0.2, -0.3, ndc.x) * smooth(-0.35, 0.1, ndc.y)
            : smooth(0.05, 0.5, ndc.y)
          : 0;
      // the three lights gathered on the conch (page 11) add up: each gives less
      // (and on page 9 they stand back: the hand she holds out must be seen)
      const gathered = page >= 11 ? 0.55 : page === 9 && !trans ? 0.5 : 1;
      const dim = (0.2 + 0.8 * near) * (1 - 0.72 * onText) * gathered;
      s.dim = lerp(s.dim, dim, Math.min(1, dt * 3));
      s.halo.opacity = s.dim;
      s.halo.color.copy(s.tint).multiplyScalar(0.45 + 0.55 * s.dim);
      s.core.color.copy(s.tint).multiplyScalar(0.9);
      s.core.opacity = 0.3 + 0.7 * s.dim;
      // its drawing fades with it: never a dark mark left on a faint glow
      s.icon.opacity = smooth(0.35, 0.8, s.dim) * 0.85;
      // the wake: a new spark every few hundredths of a second, the oldest dropped
      s.wakeT += dt;
      const wp = s.wake.geometry.attributes.position as THREE.BufferAttribute;
      if (dist > 30) for (let k = 0; k < wp.count; k++) wp.setXYZ(k, tgt.x, tgt.y, tgt.z);
      else if (s.wakeT > 0.04) {
        s.wakeT = 0;
        (wp.array as Float32Array).copyWithin(3, 0, (wp.count - 1) * 3);
      }
      wp.setXYZ(0, s.g.position.x, s.g.position.y, s.g.position.z);
      wp.needsUpdate = true;
      (s.wake.material as THREE.PointsMaterial).opacity = 0.55 * s.dim * clamp(s.sc * 1.4, 0, 1);
      (s.ring.material as THREE.MeshBasicMaterial).opacity = 0.22 * s.dim;
      s.g.scale.setScalar(Math.max(0.001, s.sc * 0.95 * pul * (0.72 + 0.28 * s.dim)));
      s.ring.lookAt(camera.position);
      s.ring.rotateZ(W * (1.2 + i * 0.3));
    });
  }

  /* =====================================================================
     START
     ===================================================================== */
  function resize(): void {
    const { w, h: hh } = size();
    const pr = Math.min(devicePixelRatio, isSmall ? 1.4 : 1.6, perf.level === 0 ? 1 : Infinity);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, hh, false);
    camera.aspect = w / hh;
    camera.fov = w / hh < 1 ? 52 : 40;
    camera.updateProjectionMatrix();
    composer?.setSize(w, hh);
    bloom.setSize(w * pr, hh * pr);
    if (!trans) {
      const c = adaptForAspect(CAMS[page]);
      camState.pos.copy(c.pos);
      camState.tgt.copy(c.tgt);
    }
  }

  try {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    buildLights();
    sky = buildSky();
    buildTerrain();
    buildOcean();
    buildDistance();
    buildSeaGrape();
    buildRocks();
    buildBeachLife();
    buildBoat();
    mila = buildMila();
    buildConches();
    buildCrab();
    buildMeadow();
    buildSigns();
    mila.g.position.copy(HOME);
    mila.g.rotation.y = -Math.PI / 2;
    buildThreads();
    buildGroundMarks();
    // every fogged material takes the water's colours while the camera is under the surface
    const fogged = new Set<THREE.Material>();
    scene.traverse((o) => {
      const { material } = o as Partial<THREE.Mesh>;
      if (!material) return;
      for (const m of Array.isArray(material) ? material : [material])
        if ("fog" in m && m.fog === true) fogged.add(m);
    });
    fogged.forEach((m) => addSeaFog(m, SEA));
    thinSea(perf.level);
    composer = buildPost();
    const c0 = adaptForAspect(CAMS[0]);
    camState.pos.copy(c0.pos);
    camState.tgt.copy(c0.tgt);
    resize();
    listen(window, "resize", resize);
    timer.connect(document);
    renderer.compile(scene, camera);
    renderer.setAnimationLoop(update);
  } catch (err) {
    release();
    throw err;
  }

  /* interactions */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  /** Points the raycaster at a pointer event, in canvas coordinates. */
  const aim = (e: PointerEvent): void => {
    const r = canvas.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / (r.width || 1)) * 2 - 1,
      -((e.clientY - r.top) / (r.height || 1)) * 2 + 1,
    );
    ray.setFromCamera(ndc, camera);
  };
  const liveDebris = (): THREE.Mesh[] => debris.filter((d) => !d.gone).map((d) => d.mesh);
  listen(container, "pointermove", (e) => {
    const r = container.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / (r.width || 1)) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / (r.height || 1)) * 2 - 1;
  });
  listen(canvas, "pointerdown", (e) => {
    aim(e);
    if (page === CRAB_PAGE && !trans) {
      const hit = ray.intersectObjects(liveDebris(), false)[0];
      const hitDebris = hit && debris.find((d) => d.mesh === hit.object);
      if (hitDebris) {
        removeDebris(hitDebris);
        return;
      }
      // touch tolerance: the piece closest to the ray
      let best: Debris | null = null;
      let bd = 0.35;
      for (const d of debris) {
        if (d.gone) continue;
        const dd = ray.ray.distanceToPoint(d.mesh.position);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
      if (best) {
        removeDebris(best);
        return;
      }
    }
    if (ray.intersectObjects([mila.held, bigConch], false)[0]) {
      audio.chime((Math.random() * 3) | 0);
      U.glow.value = 1.2;
      U_bigGlow.value = 0.8;
    }
  });
  listen(canvas, "pointermove", (e) => {
    if (page !== CRAB_PAGE || trans) return;
    aim(e);
    canvas.style.cursor = ray.intersectObjects(liveDebris(), false).length ? "pointer" : "default";
  });

  return {
    get page() {
      return page;
    },
    get moving() {
      return trans !== null || freeing;
    },
    go: (to) => go(to),
    show: (to) => go(to, true),
    resetCrab() {
      freed = false;
      crab.freedAt = 0;
      for (const d of debris) d.gone = false;
    },
    setMotion(on) {
      motionT = on ? 1 : 0;
    },
    dispose: release,
  };
}
