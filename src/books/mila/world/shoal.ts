/**
 * How the swimming animals of Mila's sea keep out of solid things. Every fish has a route (its
 * place at this instant if the sea were empty) and an offset from it: near a solid, a limb of Mila
 * or another fish the offset grows away from it, and it fades once the way is free, so the fish
 * goes around and comes back to its route. Nothing here draws random numbers or keeps a clock: the
 * same routes and time steps give the same sea.
 */

/** A solid to go around: a ball of radius `r`, flattened to the half-height `ry`. */
export interface Solid {
  x: number;
  y: number;
  z: number;
  r: number;
  ry: number;
  /** It stands on the sea floor: a swimmer passes over it rather than under. */
  grounded: boolean;
}

/** A limb to go around: a capsule from `a` to `b`. `wide` is how early swimmers give way (metres). */
export interface Limb {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  r: number;
  wide: number;
  /** How fast it travels (metres a second): swimmers in its way move aside, not along with it. */
  vx: number;
  vy: number;
  vz: number;
}

/** A swimming animal: where its route puts it (`h`), where it is (`x y z`), its offset (`o`). */
export interface Swimmer {
  hx: number;
  hy: number;
  hz: number;
  x: number;
  y: number;
  z: number;
  ox: number;
  oy: number;
  oz: number;
  /** Radius of the ball that stands in for its body; 0 while it is not in the sea yet. */
  r: number;
  /** Which way it leans when something is dead ahead: +1 or -1, fixed for each animal. */
  side: number;
  /** Where its route put it on the last step, once it has made one (`known`). */
  px: number;
  py: number;
  pz: number;
  known: boolean;
}

/** How far from a solid a slow swimmer starts to turn away (metres). */
export const BERTH = 0.45;
/** Seconds of its own travel a swimmer adds to that berth: a fast one turns away from further. */
const FORESIGHT = 0.3;
/** How far apart two swimmers start to make room for each other, beyond touching (metres). */
export const ROOM = 0.1;
/** Speed at which a swimmer turns away at the edge of a solid (metres a second). */
const PUSH = 1.6;
/** Fastest a swimmer leaves its route (metres a second): no darting. */
const MAX_PUSH = 6;
/** Seconds for a swimmer to drift back onto its route once the way is free. */
const RETURN = 1.4;

/** A swimmer on its route, with nothing pushing it yet. */
export function swimmer(side: number): Swimmer {
  return {
    hx: 0,
    hy: 0,
    hz: 0,
    x: 0,
    y: 0,
    z: 0,
    ox: 0,
    oy: 0,
    oz: 0,
    r: 0,
    side,
    px: 0,
    py: 0,
    pz: 0,
    known: false,
  };
}

/** Per-swimmer push of the current step (metres a second), reused between calls. */
let push = new Float32Array(0);

/**
 * Moves every swimmer one step of `dt` seconds: towards its route, away from the solids, the limbs
 * and its neighbours, then out of whatever it still overlaps (see `settle`). `floor(x, z)` is the
 * height of the sea floor,
 * `ceiling` the height the swimmers stay under. The routes (`hx hy hz`) and the radii are the
 * caller's; `x y z` and the offsets are updated.
 */
export function steer(
  shoal: readonly Swimmer[],
  dt: number,
  solids: readonly Solid[],
  limbs: readonly Limb[],
  floor: (x: number, z: number) => number,
  ceiling: number,
): void {
  const n = shoal.length;
  if (push.length < n * 3) push = new Float32Array(n * 3);
  push.fill(0, 0, n * 3);
  for (let i = 0; i < n; i++) {
    const f = shoal[i];
    f.x = f.hx + f.ox;
    f.y = f.hy + f.oy;
    f.z = f.hz + f.oz;
  }
  // neighbours make room for each other
  let count = closePairs(shoal);
  for (let c = 0; c < count; c++) {
    const i = close[c * 2];
    const j = close[c * 2 + 1];
    const f = shoal[i];
    const g = shoal[j];
    const reach = f.r + g.r + ROOM;
    const dx = f.x - g.x;
    const dy = f.y - g.y;
    const dz = f.z - g.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= reach * reach) continue;
    const d = Math.sqrt(d2);
    const w = ((reach - d) / ROOM) * PUSH * 0.5;
    // dead on each other: one goes up, the other down
    const k = d > 1e-5 ? w / d : 0;
    const ux = k ? dx * k : 0;
    const uy = k ? dy * k : w;
    const uz = k ? dz * k : 0;
    push[i * 3] += ux;
    push[i * 3 + 1] += uy;
    push[i * 3 + 2] += uz;
    push[j * 3] -= ux;
    push[j * 3 + 1] -= uy;
    push[j * 3 + 2] -= uz;
  }
  const back = Math.exp(-dt / RETURN);
  for (let i = 0; i < n; i++) {
    const f = shoal[i];
    let vx = push[i * 3];
    let vy = push[i * 3 + 1];
    let vz = push[i * 3 + 2];
    // the way its route carries it (metres a second): what it must turn before it reaches a solid
    const rx = f.known && dt > 0 ? (f.hx - f.px) / dt : 0;
    const ry = f.known && dt > 0 ? (f.hy - f.py) / dt : 0;
    const rz = f.known && dt > 0 ? (f.hz - f.pz) / dt : 0;
    f.px = f.hx;
    f.py = f.hy;
    f.pz = f.hz;
    f.known = true;
    const berth = BERTH + FORESIGHT * Math.hypot(rx, ry, rz);
    for (const s of solids) {
      const reach = s.r + f.r + berth;
      const dx = f.x - s.x;
      if (dx > reach || dx < -reach) continue;
      const dz = f.z - s.z;
      if (dz > reach || dz < -reach) continue;
      // heights stretched around the solid's centre, so it is a ball
      const k = s.r / s.ry;
      const dy = (f.y - s.y) * k;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= reach) continue;
      // as it nears, it turns away as fast as its route brings it in: it arrives alongside
      const closing = Math.max(0, -(rx * dx + ry * dy + rz * dz) / (d + 1e-5));
      const w = ((reach - d) / berth) * (PUSH + closing);
      // away from it, a little to the animal's own side so that dead ahead is not a dead end,
      // and upwards over what stands on the bottom
      let nx = dx / (d + 1e-5) - (dz / (d + 1e-5)) * 0.3 * f.side;
      let ny = (dy / (d + 1e-5)) * k + (s.grounded ? 0.6 : 0.15 * f.side);
      let nz = dz / (d + 1e-5) + (dx / (d + 1e-5)) * 0.3 * f.side;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      vx += nx * w;
      vy += ny * w;
      vz += nz * w;
    }
    for (const c of limbs) {
      const reach = c.r + f.r + c.wide;
      const [qx, qy, qz] = nearestOn(c, f.x, f.y, f.z);
      const dx = f.x - qx;
      const dy = f.y - qy;
      const dz = f.z - qz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= reach) continue;
      const u = 1 / (d + 1e-5);
      let nx = dx * u - dz * u * 0.3 * f.side;
      let ny = dy * u + 0.15 * f.side;
      let nz = dz * u + dx * u * 0.3 * f.side;
      // how fast the two close in on each other
      const closing = Math.max(0, ((c.vx - rx) * dx + (c.vy - ry) * dy + (c.vz - rz) * dz) * u);
      const pace = Math.hypot(c.vx, c.vy, c.vz);
      if (pace > 0.3) {
        // out of its way sideways: what is left of the push once its own direction is taken out
        const along = (nx * c.vx + ny * c.vy + nz * c.vz) / pace;
        const keep = 0.3;
        nx -= (along * (1 - keep) * c.vx) / pace;
        ny -= (along * (1 - keep) * c.vy) / pace;
        nz -= (along * (1 - keep) * c.vz) / pace;
      }
      const nl = Math.hypot(nx, ny, nz) || 1;
      const w = ((reach - d) / c.wide) * (PUSH + closing);
      vx += (nx / nl) * w;
      vy += (ny / nl) * w;
      vz += (nz / nl) * w;
    }
    const v = Math.hypot(vx, vy, vz);
    const cap = v > MAX_PUSH ? MAX_PUSH / v : 1;
    f.ox = (f.ox + vx * cap * dt) * back;
    f.oy = (f.oy + vy * cap * dt) * back;
    f.oz = (f.oz + vz * cap * dt) * back;
    f.x = f.hx + f.ox;
    f.y = f.hy + f.oy;
    f.z = f.hz + f.oz;
  }
  // the list of close pairs still holds unless turning away carried a swimmer far
  let travel = 0;
  for (let i = 0; i < n; i++) {
    const f = shoal[i];
    travel = Math.max(
      travel,
      (f.x - from[i * 3]) ** 2 + (f.y - from[i * 3 + 1]) ** 2 + (f.z - from[i * 3 + 2]) ** 2,
    );
  }
  if (travel > SLACK * SLACK) count = closePairs(shoal);
  settle(shoal, count, solids, limbs, floor, ceiling);
}

/** Most rounds of settling in one step: what is left after them waits for the next step. */
const ROUNDS = 12;
/** Overlap between two swimmers under which they count as apart (metres). */
const SETTLED = 2e-4;
/** How far a swimmer may be moved by settling before the list of close pairs is made again (metres). */
const SLACK = 0.12;
/** Pairs of swimmers close enough to meet while settling (two indices each), reused between calls. */
let close = new Int32Array(0);
/** Where each swimmer was when `close` was made, reused between calls. */
let from = new Float32Array(0);

/**
 * Lists in `close` the pairs of swimmers near enough to make room for each other or to meet before
 * either has moved by `SLACK`: those nearer than touching plus twice `SLACK`. Returns how many.
 */
function closePairs(shoal: readonly Swimmer[]): number {
  const n = shoal.length;
  if (from.length < n * 3) from = new Float32Array(n * 3);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const f = shoal[i];
    from[i * 3] = f.x;
    from[i * 3 + 1] = f.y;
    from[i * 3 + 2] = f.z;
    if (f.r <= 0) continue;
    for (let j = i + 1; j < n; j++) {
      const g = shoal[j];
      if (g.r <= 0) continue;
      const reach = f.r + g.r + 2 * SLACK;
      const dx = f.x - g.x;
      if (dx > reach || dx < -reach) continue;
      const dz = f.z - g.z;
      if (dz > reach || dz < -reach) continue;
      const dy = f.y - g.y;
      if (dx * dx + dy * dy + dz * dz >= reach * reach) continue;
      if (close.length < (count + 1) * 2) {
        const more = new Int32Array(Math.max(256, close.length * 2));
        more.set(close);
        close = more;
      }
      close[count * 2] = i;
      close[count * 2 + 1] = j;
      count++;
    }
  }
  return count;
}

/**
 * What turning away did not settle, for the `count` pairs listed in `close`: moves the swimmers
 * that overlap apart, then every swimmer out
 * of the solids and the limbs and between the floor and the ceiling, and again while two swimmers
 * still overlap, for at most `ROUNDS` rounds. The solids, the limbs and the bounds come last in
 * every round, so they always hold; two swimmers end apart (within `SETTLED`) unless the walls
 * leave them no room or the crowd is too dense to untangle in `ROUNDS` rounds, in which case the
 * next step goes on from there.
 */
function settle(
  shoal: readonly Swimmer[],
  count: number,
  solids: readonly Solid[],
  limbs: readonly Limb[],
  floor: (x: number, z: number) => number,
  ceiling: number,
): void {
  const n = shoal.length;
  for (let round = 0; round < ROUNDS; round++) {
    for (let k = 0; k < count; k++) {
      const i = close[k * 2];
      const j = close[k * 2 + 1];
      const f = shoal[i];
      const g = shoal[j];
      const need = f.r + g.r;
      const dx = f.x - g.x;
      const dy = f.y - g.y;
      const dz = f.z - g.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= need * need) continue;
      const d = Math.sqrt(d2);
      const half = (need - d) / 2;
      let ux: number;
      let uy: number;
      let uz: number;
      if (d > 1e-5) {
        ux = (dx / d) * half;
        uy = (dy / d) * half;
        uz = (dz / d) * half;
      } else {
        // dead on each other: apart along a direction of the pair's own, mostly level
        const a = (i * 7 + j * 13) * 2.399963;
        ux = Math.cos(a) * 0.95 * half;
        uy = Math.sin(a * 3) * 0.31 * half;
        uz = Math.sin(a) * 0.95 * half;
      }
      f.x += ux;
      f.y += uy;
      f.z += uz;
      g.x -= ux;
      g.y -= uy;
      g.z -= uz;
    }
    let travel = 0;
    for (let i = 0; i < n; i++) {
      const f = shoal[i];
      // the walls push one after the other: a few turns, until none of them moves it any more
      for (let turn = 0; turn < 4; turn++) {
        let moved = false;
        for (const s of solids) {
          const need = s.r + f.r;
          const dx = f.x - s.x;
          if (dx > need || dx < -need) continue;
          const dz = f.z - s.z;
          if (dz > need || dz < -need) continue;
          const k = s.r / s.ry;
          // under the middle of what stands on the bottom there is no way out downwards: sideways
          const dy = s.grounded && f.y < s.y ? 0 : (f.y - s.y) * k;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d >= need - 1e-9) continue;
          // out by the shortest way; from its very centre, upwards
          const u = d > 1e-5 ? need / d : 0;
          f.x = s.x + dx * u;
          if (!u) f.y = s.y + need / k;
          else if (dy) f.y = s.y + (dy * u) / k;
          f.z = s.z + dz * u;
          moved = true;
        }
        for (const c of limbs) {
          const need = c.r + f.r;
          const [qx, qy, qz] = nearestOn(c, f.x, f.y, f.z);
          const dx = f.x - qx;
          const dy = f.y - qy;
          const dz = f.z - qz;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d >= need - 1e-9) continue;
          const u = d > 1e-5 ? need / d : 0;
          f.x = qx + dx * u;
          f.y = qy + (u ? dy * u : need);
          f.z = qz + dz * u;
          moved = true;
        }
        const y = Math.min(Math.max(f.y, floor(f.x, f.z) + f.r), ceiling - f.r);
        if (y !== f.y) {
          f.y = y;
          moved = true;
        }
        if (!moved) break;
      }
      const mx = f.x - from[i * 3];
      const my = f.y - from[i * 3 + 1];
      const mz = f.z - from[i * 3 + 2];
      travel = Math.max(travel, mx * mx + my * my + mz * mz);
    }
    // a swimmer pushed far may now be near one that was not on the list
    if (travel > SLACK * SLACK) count = closePairs(shoal);
    let worst = 0;
    for (let k = 0; k < count; k++) {
      const f = shoal[close[k * 2]];
      const g = shoal[close[k * 2 + 1]];
      const need = f.r + g.r;
      const d2 = (f.x - g.x) ** 2 + (f.y - g.y) ** 2 + (f.z - g.z) ** 2;
      if (d2 < need * need) worst = Math.max(worst, need - Math.sqrt(d2));
    }
    if (worst <= SETTLED) break;
  }
  for (let i = 0; i < n; i++) {
    const f = shoal[i];
    f.ox = f.x - f.hx;
    f.oy = f.y - f.hy;
    f.oz = f.z - f.hz;
  }
}

const near: [number, number, number] = [0, 0, 0];
/** The point of a limb's axis nearest to a place (the returned triple is reused between calls). */
function nearestOn(c: Limb, x: number, y: number, z: number): [number, number, number] {
  const ex = c.bx - c.ax;
  const ey = c.by - c.ay;
  const ez = c.bz - c.az;
  const l2 = ex * ex + ey * ey + ez * ez;
  const t =
    l2 > 1e-9
      ? Math.min(1, Math.max(0, ((x - c.ax) * ex + (y - c.ay) * ey + (z - c.az) * ez) / l2))
      : 0;
  near[0] = c.ax + ex * t;
  near[1] = c.ay + ey * t;
  near[2] = c.az + ez * t;
  return near;
}

/** Signed gap between a swimmer and a solid (negative inside), in the solid's stretched space. */
export function gapToSolid(f: Swimmer, s: Solid): number {
  const k = s.r / s.ry;
  return Math.hypot(f.x - s.x, (f.y - s.y) * k, f.z - s.z) - s.r - f.r;
}

/** Signed gap between a swimmer and a limb (negative inside). */
export function gapToLimb(f: Swimmer, c: Limb): number {
  const [qx, qy, qz] = nearestOn(c, f.x, f.y, f.z);
  return Math.hypot(f.x - qx, f.y - qy, f.z - qz) - c.r - f.r;
}

/**
 * A route's height kept over the sea floor: `y` where the water is deep enough, `floor` where the
 * route would run into the bottom, and a rounded bend of about `ease` metres between the two, so a
 * swimmer rides over a rise in the sand instead of meeting it.
 */
export function overFloor(y: number, floor: number, ease: number): number {
  return 0.5 * (y + floor + Math.sqrt((y - floor) * (y - floor) + ease * ease));
}
