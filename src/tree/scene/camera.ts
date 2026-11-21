import type * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";
import { fitFov } from "@shared/three/stage";
import { groundHeight } from "./ground";

/** Climb progress (t ∈ [0, 1]) at which the card of book `index` hangs, spread over [0.2, 0.88]. */
export const cardT = (index: number, count: number): number =>
  count <= 1 ? 0.5 : 0.2 + index * (0.68 / (count - 1));

/** The climb's landmarks, in order: the opening view, then each card. */
export const climbStops = (count: number): number[] => [
  0,
  ...Array.from({ length: count }, (_, i) => cardT(i, count)),
];

/** A point that can be written to: a three.js vector, or the solver's own. */
export interface Spot {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): unknown;
}

/** A bare writable point. */
function spot(): Spot {
  return {
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
  };
}

/** Distance from the trunk axis at which the cards hang, and their height above the camera's. */
export const CARD_RADIUS = 12.2;
export const CARD_RISE = 0.3;

/** Spiral camera path around the tree (v14); writes position and look-at target, returns the angle. */
export function hubCam(t: number, out: Spot, look: Spot): number {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 20 - t * 4;
  const y = 1.3 + t * 6.4;
  out.set(Math.cos(a) * r, y, Math.sin(a) * r);
  look.set(0, y + 2.2 - t * 1.2, 0);
  return a;
}

/** How the opening view departs from the spiral's first shot, in metres. */
export interface OpeningShot {
  /** Camera pulled back from the trunk. */
  back: number;
  /** Camera raised. */
  lift: number;
  /** Camera moved sideways, towards the Konteur's side of the clearing. */
  truck: number;
  /** Look-at point raised on the trunk axis: the tree comes down in the frame. */
  lookLift: number;
  /**
   * The picture slid sideways by the lens, in half-widths of the screen; negative puts the tree
   * left of the centre. The camera itself keeps looking at the trunk axis.
   */
  shift: number;
}

/** Same limit as the intro band's media query in overlay.css. */
export const BAND_ASPECT = 1.2;
/** Climb value from which the camera is back on the spiral (the first card hangs at 0.2). */
export const OPENING_END = 0.14;

const KONTEUR_Z = -12.5;
/** Where the Konteur sits on the ground (x, z) for a screen aspect: further in on narrow screens. */
export function konteurSpot(aspect: number): [number, number] {
  return [lerp(1.9, 4.4, clamp((aspect - 0.5) / 1.1, 0, 1)), KONTEUR_Z];
}

/** A value keyed on the screen aspect, blended between its keys. */
function keyed(aspect: number, keys: readonly (readonly [number, number])[]): number {
  if (aspect <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [to, value] = keys[i];
    if (aspect <= to) {
      const [from, before] = keys[i - 1];
      return lerp(before, value, (aspect - from) / (to - from));
    }
  }
  return keys[keys.length - 1][1];
}

/** How much a screen is a phone on its side: 0 on tall or portrait screens, 1 at 420 px high. */
export function shortness(aspect: number, height: number): number {
  return clamp((560 - height) / 140, 0, 1) * clamp((aspect - 1.3) / 0.3, 0, 1);
}

/**
 * Share of the screen's height kept clear above the crown and below the Konteur's feet. Above:
 * the intro band (about 270 px) up to `BAND_ASPECT`, then less and less as the column layout
 * widens, so the two layouts agree where they meet. Below: the shelf, its margin and a gap.
 */
export function clearances(aspect: number, height: number): { top: number; bottom: number } {
  const band = Math.min(0.42, 270 / height);
  const top = lerp(band, 0.05, clamp((aspect - BAND_ASPECT) / 0.25, 0, 1));
  const bottom = Math.min(0.4, (66 + clamp(height * 0.03, 12, 26) + 18) / height);
  return { top, bottom };
}

/** Crown points that must stay in view: its top, and its near rim, lower but closer. */
const CROWN: readonly (readonly [number, number, number])[] = [
  [0, 13.6, 0],
  [0, 11.6, -6.5],
  [-5.5, 11.4, -3],
  [5.5, 11.4, -3],
];

/**
 * Where a world point shows for a camera at `cam` looking at `look`: `x` in half-widths of the
 * screen from its centre (right positive, before any lens shift), `y` from 0 (top) to 1 (bottom),
 * and its depth in front of the camera.
 */
function screenPoint(
  p: readonly [number, number, number],
  cam: readonly [number, number, number],
  look: readonly [number, number, number],
  tanHalf: number,
  aspect: number,
): { x: number; y: number; depth: number } {
  let fx = look[0] - cam[0];
  let fy = look[1] - cam[1];
  let fz = look[2] - cam[2];
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = forward × up, up' = right × forward.
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const vx = p[0] - cam[0];
  const vy = p[1] - cam[1];
  const vz = p[2] - cam[2];
  const depth = vx * fx + vy * fy + vz * fz;
  return {
    x: (vx * rx + vz * rz) / depth / (tanHalf * aspect),
    y: (1 - (vx * ux + vy * uy + vz * uz) / depth / tanHalf) / 2,
    depth,
  };
}

/** Height on screen (0 top, 1 bottom) of a world point for a camera at `cam` looking at `look`. */
function screenY(
  p: readonly [number, number, number],
  cam: readonly [number, number, number],
  look: readonly [number, number, number],
  tanHalf: number,
): number {
  return screenPoint(p, cam, look, tanHalf, 1).y;
}

let solved: { aspect: number; height: number; shot: OpeningShot } | null = null;

/**
 * The opening composition for a screen (aspect, height in CSS px). The sideways placement is keyed
 * on the aspect: centred under the band, left of the column; it is a shift of the lens, so the
 * camera looks at the trunk axis from the first frame on. Distance and tilt are solved: the
 * camera backs off until the whole crown fits under what the intro needs, with the Konteur's feet
 * resting just above the shelf. Everything is continuous in width and height, so resizing a
 * window never makes the camera jump, across the change of layout included.
 */
export function openingShot(aspect: number, height = 900): OpeningShot {
  if (solved && solved.aspect === aspect && solved.height === height) return solved.shot;
  const short = shortness(aspect, height);
  const lift = 0.3;
  const truck = lerp(
    keyed(aspect, [
      [1, 0],
      [BAND_ASPECT, 0.8],
      [1.3, 1.2],
      [1.6, 1.5],
    ]),
    1.5,
    short,
  );
  const pan = lerp(
    keyed(aspect, [
      [1, 0],
      [BAND_ASPECT, -1.8],
      [1.3, -2.4],
      [1.6, -2.8],
    ]),
    -3.2,
    short,
  );
  const { top, bottom } = clearances(aspect, height);
  const tanHalf = Math.tan((fitFov(50, aspect) * Math.PI) / 360);
  const [kx, kz] = konteurSpot(aspect);
  const feet: [number, number, number] = [kx, groundHeight(kx, kz), kz];
  const y = 1.3 + lift;
  /** For a camera `back` metres further, the tilt that puts the Konteur's feet on their line. */
  const tilt = (back: number): number => {
    const cam: [number, number, number] = [truck, y, -(20 + back)];
    let lo = -12;
    let hi = 30;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (screenY(feet, cam, [0, 3.5 + mid, 0], tanHalf) < 1 - bottom) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  /** Whether the whole crown then sits below the top clearance. */
  const fits = (back: number): boolean => {
    const cam: [number, number, number] = [truck, y, -(20 + back)];
    const look: [number, number, number] = [0, 3.5 + tilt(back), 0];
    return CROWN.every((p) => screenY(p, cam, look, tanHalf) >= top);
  };
  let near = -4;
  let far = 60;
  for (let i = 0; i < 26; i++) {
    const mid = (near + far) / 2;
    if (fits(mid)) far = mid;
    else near = mid;
  }
  // `pan` metres beside the trunk, seen from the camera's distance, as a share of the half-width.
  const shift = pan / ((20 + far) * tanHalf * aspect);
  const shot: OpeningShot = { back: far, lift, truck, lookLift: tilt(far), shift };
  solved = { aspect, height, shot };
  return shot;
}

/** The spiral with the opening composition eased in, before the climb's own tilt. */
function stagedCam(t: number, aspect: number, out: Spot, look: Spot, height: number): number {
  const a = hubCam(t, out, look);
  const w = 1 - smoothstep(clamp(t / OPENING_END, 0, 1));
  if (w <= 0) return a;
  const shot = openingShot(aspect, height);
  // Radial (away from the trunk) and tangent axes of the spiral at this angle.
  const rx = Math.cos(a);
  const rz = Math.sin(a);
  out.x += (rx * shot.back - rz * shot.truck) * w;
  out.z += (rz * shot.back + rx * shot.truck) * w;
  out.y += shot.lift * w;
  look.y += shot.lookLift * w;
  return a;
}

/**
 * Sideways shift of the lens at climb value `t`, in half-widths of the screen: the opening's,
 * given back evenly over the whole climb. Spread that thin, the trunk drifts across the screen far
 * slower than the scene turns, and the turn reads as one about the trunk.
 */
export function lensShift(t: number, aspect: number, height = 900): number {
  return openingShot(aspect, height).shift * (1 - clamp(t, 0, 1));
}

const TILT_STEPS = 64;
/** Half-width of the Konteur's photo and lantern, in metres. */
const KONTEUR_HALF = 0.9;
let tilted: { aspect: number; height: number; table: Float64Array } | null = null;

/**
 * The camera's pitch along the climb (radians, up positive), sampled over t. The camera rises and
 * the ground sinks towards the shelf; looking lower keeps the Konteur's feet above it while he is
 * in the frame. The pitch only ever goes down as the climb goes up: whatever stretch of the climb
 * the visitor travels, either way, the view tilts one way and settles, with no coming back. So
 * once lowered for the Konteur it stays lowered, and it is never lowered further than the cards
 * still to come leave room for at the top of the screen. It starts at the opening's own pitch.
 */
function pitchTable(aspect: number, height: number): Float64Array {
  if (tilted && tilted.aspect === aspect && tilted.height === height) return tilted.table;
  const tanHalf = Math.tan((fitFov(50, aspect) * Math.PI) / 360);
  const line = 1 - clearances(aspect, height).bottom;
  const [kx, kz] = konteurSpot(aspect);
  const feet: [number, number, number] = [kx, groundHeight(kx, kz), kz];
  const pos = spot();
  const look = spot();
  /** The pitch wanted at each step, and the lowest the card of that step allows. */
  const wanted = new Float64Array(TILT_STEPS + 1);
  const lowest = new Float64Array(TILT_STEPS + 1);
  /** The pitch of the camera left to itself, never backing up. */
  const plain = new Float64Array(TILT_STEPS + 1);
  for (let i = 0; i <= TILT_STEPS; i++) {
    const t = i / TILT_STEPS;
    stagedCam(t, aspect, pos, look, height);
    const cam: [number, number, number] = [pos.x, pos.y, pos.z];
    const reach = Math.hypot(pos.x, pos.z);
    const pitchOf = (drop: number): number => Math.atan2(look.y - drop - pos.y, reach);
    lowest[i] = pitchOf(cardRoom(t, cam, look.y, tanHalf, aspect));
    wanted[i] = pitchOf(0);
    plain[i] = i ? Math.min(plain[i - 1], wanted[i]) : wanted[i];
    const at = (drop: number): { x: number; y: number; depth: number } =>
      screenPoint(feet, cam, [0, look.y - drop, 0], tanHalf, aspect);
    const now = at(0);
    const half = KONTEUR_HALF / (now.depth * tanHalf * aspect);
    const inFrame = now.depth > 0 && Math.abs(now.x + lensShift(t, aspect, height)) < 1 + half;
    if (!inFrame || now.y <= line) continue;
    let lo = 0;
    let hi = DROP_MAX;
    for (let k = 0; k < 20; k++) {
      const mid = (lo + hi) / 2;
      if (at(mid).y <= line) hi = mid;
      else lo = mid;
    }
    wanted[i] = pitchOf(hi);
  }
  // Never back up: the lowest pitch wanted so far, but no lower than any card ahead allows.
  const floor = new Float64Array(TILT_STEPS + 1);
  for (let i = TILT_STEPS, most = -Infinity; i >= 0; i--)
    floor[i] = most = Math.max(most, lowest[i]);
  const steady = new Float64Array(TILT_STEPS + 1);
  for (let i = 0, least = Infinity; i <= TILT_STEPS; i++) {
    least = Math.min(least, wanted[i]);
    steady[i] = Math.max(least, floor[i]);
  }
  // Smoothed (an average of a falling series still falls), then held between its two bounds,
  // which fall too; the opening keeps its own pitch.
  const table = steady.map((_, i) => {
    let sum = 0;
    for (let k = -2; k <= 2; k++) sum += steady[clamp(i + k, 0, TILT_STEPS)];
    return i === 0 ? steady[0] : clamp(sum / 5, Math.min(floor[i], plain[i]), plain[i]);
  });
  tilted = { aspect, height, table };
  return table;
}

/** Share of the screen's height a card keeps clear above it. */
const CARD_HEADROOM = 0.025;
/** Largest lowering the tilt solver considers, in metres. */
const DROP_MAX = 14;

/**
 * How far the look-at point (at height `lookY` on the trunk axis) may be lowered before the card
 * of this part of the climb touches the top of the screen. Cards hang anywhere from 0.2 to 0.88,
 * each at the camera's height there; before and after, the first and the last are the ones in view.
 */
function cardRoom(
  t: number,
  cam: readonly [number, number, number],
  lookY: number,
  tanHalf: number,
  aspect: number,
): number {
  const at = clamp(t, 0.2, 0.88);
  const hang = spot();
  const a = hubCam(at, hang, spot());
  // Top edge of a card at its largest (cards.ts: 2.1 high, scale 1.18, a tenth more when near),
  // on either side of the camera's line (cards hang 0.06 rad off it, alternately).
  const tops = [-0.06, 0.06].map((off): [number, number, number] => [
    Math.cos(a + off) * CARD_RADIUS,
    hang.y + CARD_RISE + 1.05 * 1.18 * 1.1,
    Math.sin(a + off) * CARD_RADIUS,
  ]);
  const fits = (drop: number): boolean =>
    tops.every((top) => {
      const s = screenPoint(top, cam, [0, lookY - drop, 0], tanHalf, aspect);
      return s.depth <= 0 || Math.abs(s.x) > 1.2 || s.y >= CARD_HEADROOM;
    });
  if (fits(DROP_MAX)) return DROP_MAX;
  if (!fits(0)) return 0;
  let lo = 0;
  let hi = DROP_MAX;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The camera's pitch at climb value `t`, in radians (see `pitchTable`). */
export function climbPitch(t: number, aspect: number, height = 900): number {
  const table = pitchTable(aspect, height);
  const at = clamp(t, 0, 1) * TILT_STEPS;
  const i = Math.min(TILT_STEPS - 1, Math.floor(at));
  return lerp(table[i], table[i + 1], at - i);
}

/**
 * The camera of the tree: the opening composition at the foot of the climb, easing into the
 * spiral, whose path it follows exactly from `OPENING_END` on. It always looks at the trunk axis,
 * so the scene turns about the trunk, at the pitch of `climbPitch`. Same outputs as `hubCam`.
 * `height` is the screen's, in CSS px.
 */
export function treeCam(t: number, aspect: number, out: Spot, look: Spot, height = 900): number {
  const a = stagedCam(t, aspect, out, look, height);
  look.y = out.y + Math.tan(climbPitch(t, aspect, height)) * Math.hypot(out.x, out.z);
  return a;
}

/** What the ring shows at a position: the lens shift, and the climb value the cards and HUD read. */
export interface RingShot {
  shift: number;
  /** Climb value of the view; beyond [0, 1] on the way round the back, far from every card. */
  t: number;
}

/**
 * The camera of the tree on a smartphone: the climb closed into a ring, so the visitor turns about
 * the tree without end, either way. `turn` counts landmarks (`climbStops`): whole numbers rest on
 * the opening view (0) and on each card, and the ring repeats every `stops.length`. Between two
 * landmarks the camera is on the climb's own path (`treeCam`); after the last card it keeps turning
 * the same way round the back of the tree, coming down to the opening view. Same outputs as
 * `treeCam`, plus the lens shift.
 */
export function ringCam(
  turn: number,
  stops: readonly number[],
  aspect: number,
  out: Spot,
  look: Spot,
  height = 900,
): RingShot {
  const n = stops.length;
  const at = ((turn % n) + n) % n;
  const i = Math.floor(at);
  const f = at - i;
  if (i < n - 1) {
    const t = lerp(stops[i], stops[i + 1], f);
    treeCam(t, aspect, out, look, height);
    return { shift: lensShift(t, aspect, height), t };
  }
  const last = stops[n - 1];
  treeCam(0, aspect, out, look, height);
  const to = { a: Math.atan2(out.z, out.x), r: Math.hypot(out.x, out.z), y: out.y, look: look.y };
  treeCam(last, aspect, out, look, height);
  const from = { a: Math.atan2(out.z, out.x), r: Math.hypot(out.x, out.z) };
  while (to.a <= from.a) to.a += Math.PI * 2;
  const a = lerp(from.a, to.a, f);
  const r = lerp(from.r, to.r, f);
  out.set(Math.cos(a) * r, lerp(out.y, to.y, f), Math.sin(a) * r);
  look.set(0, lerp(look.y, to.look, f), 0);
  return {
    shift: lerp(lensShift(last, aspect, height), lensShift(0, aspect, height), f),
    // No card is near on the way: past the last one, then short of the opening view.
    t: f < 0.5 ? last + f * RING_AWAY : (f - 1) * RING_AWAY,
  };
}

/** Climb value given to half the way round the back: over a card's reach (0.22) from each end. */
const RING_AWAY = 0.6;

/**
 * The ring position of landmark `stop` (0 the opening view, then the cards) nearest to `turn`, so
 * going there never unwinds the turns already made.
 */
export function ringStop(stop: number, turn: number, count: number): number {
  return stop + count * Math.round((turn - stop) / count);
}

/**
 * Slides the picture sideways by `shift` half-widths (see `lensShift`) without turning the
 * camera. To call after every `updateProjectionMatrix`, which resets it.
 */
export function shiftLens(camera: THREE.PerspectiveCamera, shift: number): void {
  const m = camera.projectionMatrix.elements;
  if (m[8] === -shift) return;
  m[8] = -shift;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

/** Whether a disc of radius `r` at (x, z) stands on the stage (see `openingStage`). */
export type StageTest = (x: number, z: number, r: number) => boolean;

/**
 * The part of the clearing the opening view shows in front of the trunk, for the current aspect:
 * inside 0.8 of the horizontal field, no nearer the camera than the Konteur (the shelf), not deep
 * under the crown, and not behind one of the `screens` (x, z, radius: plants, the Konteur) as
 * seen from the camera. `height` is the screen's, in CSS px (short landscape screens).
 */
export function openingStage(
  aspect: () => number,
  screens: readonly (readonly [number, number, number])[] = [],
  height: () => number = () => 900,
): StageTest {
  return (x, z, r) => {
    const a = aspect();
    const shot = openingShot(a, height());
    const half = Math.atan(Math.tan((fitFov(50, a) * Math.PI) / 360) * a);
    const cx = shot.truck;
    const cz = -(20 + shot.back);
    // The camera looks at the trunk axis; the lens shift moves the frame's edges, not the view.
    const len = Math.hypot(cx, cz);
    const depth = (-(x - cx) * cx - (z - cz) * cz) / len;
    const right = ((x - cx) * cz - (z - cz) * cx) / len;
    const unit = depth * Math.tan(half);
    // Nearer the camera than the Konteur, a critter would stand lower on screen than he does:
    // behind the shelf.
    if (z > -6.2 || z < KONTEUR_Z + r || depth <= 0) return false;
    if (Math.abs(right / unit + shot.shift) + r / unit > 0.8) return false;
    const reach = Math.hypot(x - cx, z - cz);
    return screens.every(([sx, sz, sr]) => {
      const along = ((sx - cx) * (x - cx) + (sz - cz) * (z - cz)) / reach;
      if (along <= 0 || along >= reach) return true;
      const off = Math.abs(((sx - cx) * (z - cz) - (sz - cz) * (x - cx)) / reach);
      // What matters is the gap on screen: scale the miss to the target's distance.
      return (off * reach) / along > sr + r;
    });
  };
}
