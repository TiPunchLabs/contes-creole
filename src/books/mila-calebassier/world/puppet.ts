import * as THREE from "three";
import { solveArm, type Arm, type Leg } from "@shared/mila/figure";

/** What the puppet code needs of a figure: Mila's shared build, and Man Ninon's on the same plan. */
export interface Figure {
  g: THREE.Group;
  pose: THREE.Group;
  inner: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: Leg[];
  arms: Arm[];
}

/** A figure's measures (body space, metres). */
export interface Dims {
  thigh: number;
  shin: number;
  /** Height of the hips' pivot (`pose`). */
  pivot: number;
  /** Ground covered by one step. */
  stride: number;
  /** Resting hand of the right side (mirrored for the left). */
  restHand: readonly [number, number, number];
  /** How far the arms swing when walking. */
  swing: number;
  /**
   * Walks on planted feet (`plantedWalk`) with this step: each foot stays where it lands while the
   * body passes over it. Without it the legs swing as in the underwater tale.
   */
  step?: Step;
  /**
   * Widest radius of the clothes at a height (body space, 0 where there is none): arms are kept
   * outside it along their whole length, not only at the hand.
   */
  radius(y: number): number;
}

/** A hand's task: where it goes (world), what its palm faces (world) and where its fingers point. */
export interface Grip {
  at: THREE.Vector3;
  face: THREE.Vector3;
  /** Direction of the fingers, body space. */
  up?: readonly [number, number, number];
  /** The hand is still on its way to its task: it may be moved out of the clothes like a free hand. */
  free?: boolean;
  /** Where the elbow leans, body space offset from the shoulder. */
  pole?: readonly [number, number, number];
}

/** Everything a figure does at one instant; a page's timeline fills it, nothing is kept between frames. */
export interface Pose {
  x: number;
  y: number;
  z: number;
  /** Heading: 0 faces +z (south), π/2 faces +x (east). */
  yaw: number;
  /** Distance walked so far along the current move (drives the step phase). */
  walked: number;
  /** Where the current move began along its route, and its whole length (0 when standing). */
  start: number;
  path: number;
  /** 0 standing, 1 walking. */
  gait: number;
  /** Knees bent (0..1): stooping, catching herself. */
  crouch: number;
  /** Whole body tipped forward (radians). */
  lean: number;
  headYaw: number;
  headPitch: number;
  left: Grip | null;
  right: Grip | null;
  visible: boolean;
}

/** A neutral pose at the origin. */
export function restPose(): Pose {
  return {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    walked: 0,
    start: 0,
    path: 0,
    gait: 0,
    crouch: 0,
    lean: 0,
    headYaw: 0,
    headPitch: 0,
    left: null,
    right: null,
    visible: true,
  };
}

/** How a figure steps, as shares of one cycle (two steps), metres and radians. */
export interface Step {
  /** Share of the cycle a foot spends on the ground (over 0.5: both feet are down for a while). */
  stance: number;
  /** Height the swinging foot is lifted to. */
  lift: number;
  /** Foot pitch when the heel lands (toes up, negative) and when the toes leave (positive). */
  strike: number;
  off: number;
  /** Ankle to the front of the sole, and to the back of the heel. */
  ball: number;
  heel: number;
  /** How far the hips sink while walking, and their extra drop at each landing. */
  sink: number;
  bob: number;
  /** Lean of the trunk over the standing leg, twist of the shoulders against the hips. */
  lean: number;
  twist: number;
}

/**
 * An older woman's step: both feet are long on the ground, the swinging foot stays low, the heel
 * lands first and the toes leave last, the trunk leans over the standing leg.
 */
export const ELDER_STEP: Step = {
  stance: 0.6,
  lift: 0.042,
  strike: -0.2,
  off: 0.42,
  ball: 0.13,
  heel: 0.055,
  sink: 0.022,
  bob: 0.011,
  lean: 0.038,
  twist: 0.07,
};

/** A child's step: quicker and lighter, the feet lifted higher. */
export const CHILD_STEP: Step = {
  stance: 0.56,
  lift: 0.05,
  strike: -0.16,
  off: 0.4,
  ball: 0.105,
  heel: 0.042,
  sink: 0.012,
  bob: 0.008,
  // Hardly any lean or twist: she carries the calabash in both hands on most pages.
  lean: 0.012,
  twist: 0.025,
};

/**
 * How high a solid of the set (a root, a step) stands under a place, above the ground at height
 * `floor` there; 0 on open ground.
 */
export type Solid = (x: number, z: number, floor: number) => number;
/** The highest thing a foot steps onto or over; anything taller is not a step. */
export const MAX_STEP = 0.3;

const frac = (v: number): number => v - Math.floor(v);
const ease = (v: number): number => v * v * (3 - 2 * v);

/**
 * Walks a figure on planted feet. The step phase comes from the distance walked, so a foot on the
 * ground moves back under the body exactly as fast as the body moves forward: it does not slide.
 * Each leg is then solved (hip and knee) to reach its foot, the hips are kept low enough for the
 * standing leg to reach the ground, and the foot rolls from heel to toe. Returns, per leg, how far
 * forward its foot is (−1 back … 1 front), for the arms to swing against.
 */
function plantedWalk(
  figure: Figure,
  dims: Dims,
  STEP: Step,
  p: Pose,
  solid: Solid | undefined,
): number[] {
  const { pose, inner, body, legs } = figure;
  const sinYaw = Math.sin(p.yaw);
  const cosYaw = Math.cos(p.yaw);
  // The move is cut into a whole number of steps, and starts and ends with one leg passing the
  // other (feet side by side): she leaves from standing and comes back to it without a shuffle.
  const steps = Math.max(1, Math.round(p.path / dims.stride));
  const stride = p.path > 0 ? p.path / steps : dims.stride;
  const gone = Math.abs(p.walked - p.start);
  const cycle = STEP.stance / 2 + gone / (2 * stride);
  // How much she is walking: nothing when standing, wholly within an eighth of a step of either end,
  // so the first and the last steps are real steps (lifted, rolled), not a shuffle.
  const walk = clampUnit(Math.max(0, Math.min(gone, p.path - gone)) / (0.12 * stride));
  const travel = 2 * stride * STEP.stance;
  const front = travel * 0.5;
  const full = dims.thigh + dims.shin;
  const longest = full - 0.004;
  const feet = legs.map((leg) => {
    const ph = frac(cycle + (leg.sx > 0 ? 0.5 : 0));
    let z: number;
    let lift = 0;
    let pitch: number;
    if (ph < STEP.stance) {
      const u = ph / STEP.stance;
      z = front - travel * u;
      pitch =
        u < 0.15 ? STEP.strike * (1 - u / 0.15) : STEP.off * ease(Math.max(0, u - 0.62) / 0.38);
    } else {
      const u = (ph - STEP.stance) / (1 - STEP.stance);
      z = front - travel + travel * ease(u);
      lift = STEP.lift * Math.sin(Math.PI * u);
      pitch = STEP.off + (STEP.strike - STEP.off) * ease(u);
    }
    // The feet's places on the ground are never scaled (that would slide them): only the lift and
    // the roll fade in and out with the walk.
    pitch *= walk;
    // The foot turns about its heel when it lands and about its ball when it leaves.
    const rise =
      lift * Math.sqrt(walk) +
      (pitch > 0 ? STEP.ball * Math.sin(pitch) : STEP.heel * Math.sin(-pitch));
    if (pitch > 0) z += STEP.ball * (1 - Math.cos(pitch));
    // A root or a step under the foot: it stands on it, or is lifted clear of it as it swings.
    const side = leg.hip.parent?.position.x ?? 0;
    const over = solid
      ? solid(p.x + side * cosYaw + z * sinYaw, p.z - side * sinYaw + z * cosYaw, p.y)
      : 0;
    const step = over > 0 && over <= MAX_STEP ? over : 0;
    const onGround = ph < STEP.stance || walk === 0;
    return {
      z,
      // In the air the toes or the heel hang below the ankle: they clear the solid too.
      rise: onGround
        ? rise + step
        : Math.max(rise, step + (0.02 + STEP.ball * Math.abs(Math.sin(pitch))) * walk) +
          step * (1 - walk),
      pitch,
      standing: ph < STEP.stance,
    };
  });
  const lean = p.lean + 0.05 * walk;
  pose.rotation.x = lean;
  // No roll of the hips about their pivot: it would drag the planted foot sideways.
  pose.rotation.z = 0;
  const side = Math.sin(2 * Math.PI * (cycle - 0.06));
  body.rotation.z = STEP.lean * side * walk;
  body.rotation.y = STEP.twist * Math.cos(2 * Math.PI * cycle) * walk;
  // Everything below is measured from the hips' pivot. The legs lean with the body, so each foot's
  // place on the ground is first turned into the leaning frame the legs are solved in.
  const gap = dims.pivot - (legs[0].hip.parent?.position.y ?? dims.pivot);
  const ground = -gap - 0.006 - full;
  const cos = Math.cos(lean);
  const sin = Math.sin(lean);
  const ankles = feet.map((foot) => {
    const y = ground + foot.rise;
    return { y: y * cos + foot.z * sin, z: -y * sin + foot.z * cos };
  });
  // Hips: lowest when a heel lands, highest over the standing leg, never out of a leg's reach.
  let hips =
    ground +
    longest -
    walk * (STEP.sink + STEP.bob * Math.cos(4 * Math.PI * cycle)) -
    p.crouch * 0.22 * full;
  feet.forEach((foot, i) => {
    const { y, z } = ankles[i];
    if (foot.standing) hips = Math.min(hips, y + Math.sqrt(longest * longest - z * z));
  });
  inner.position.y = hips + gap - dims.pivot;
  const a = dims.thigh;
  const b = dims.shin;
  legs.forEach((leg, i) => {
    const foot = feet[i];
    const down = hips - ankles[i].y;
    const d = Math.min(Math.hypot(ankles[i].z, down), longest);
    const toFoot = Math.atan2(-ankles[i].z, down);
    const hip = toFoot - Math.acos(clampUnit((a * a + d * d - b * b) / (2 * a * d)));
    const bent = Math.PI - Math.acos(clampUnit((a * a + b * b - d * d) / (2 * a * b)));
    leg.hip.rotation.x = hip;
    leg.knee.rotation.x = bent;
    leg.ankle.rotation.x = -(hip + bent) + foot.pitch - lean;
  });
  return feet.map((foot) => (foot.z / (travel / 2)) * walk);
}

const clampUnit = (v: number): number => Math.min(1, Math.max(-1, v));

const hand = new THREE.Vector3();
const pole = new THREE.Vector3();
const look = new THREE.Vector3();
const up = new THREE.Vector3();

/**
 * Puts a figure in a pose: place, step cycle (Mila's walk from the underwater tale: thigh swing,
 * knee bending on the pass, flat foot, body dropping onto the standing leg), stoop, head and two-bone
 * arm IK towards the hands' tasks. `time` only feeds the idle breath. `solid` tells a planted walk
 * what stands on the ground under each foot.
 */
export function applyPose(figure: Figure, dims: Dims, p: Pose, time: number, solid?: Solid): void {
  const { g, pose, inner, body, head, legs, arms } = figure;
  g.visible = p.visible;
  if (!p.visible) return;
  g.position.set(p.x, p.y, p.z);
  g.rotation.y = p.yaw;
  const phase = (p.walked / dims.stride) * Math.PI;
  const walk = p.gait;
  const sway = Math.sin(phase);
  /** Per leg, how far forward its foot is: the free arm of that side swings the other way. */
  let stepped: number[] | null = null;
  if (dims.step) {
    stepped = plantedWalk(figure, dims, dims.step, p, solid);
    // The head stays level over the leaning trunk and looks where she goes.
    head.rotation.set(
      p.headPitch - pose.rotation.x * 0.5 + Math.sin(time * 0.45) * 0.015,
      p.headYaw - body.rotation.y * 0.8,
      -body.rotation.z * 0.8,
    );
  } else {
    pose.rotation.x = p.lean + 0.06 * walk;
    pose.rotation.z = sway * 0.045 * walk;
    body.rotation.y = sway * 0.07 * walk;
    head.rotation.set(
      p.headPitch - pose.rotation.x * 0.5 + Math.sin(time * 0.45) * 0.015,
      p.headYaw - sway * 0.05 * walk,
      -sway * 0.03 * walk,
    );
  }
  let reach = 0;
  for (const leg of stepped ? [] : legs) {
    const ph = phase + (leg.sx > 0 ? Math.PI : 0);
    const cph = Math.cos(ph);
    const hip = -Math.sin(ph) * 0.4 * walk - p.crouch * 0.75;
    const knee = (0.05 + Math.pow(Math.max(0, cph), 1.4) * 0.95) * walk + 0.04 * (1 - walk);
    const bent = knee + p.crouch * 1.35;
    const push = Math.max(0, -Math.sin(ph + 0.9)) * 0.22 * Math.max(0, -cph) * walk;
    leg.hip.rotation.x = hip;
    leg.knee.rotation.x = bent;
    leg.ankle.rotation.x = -(hip + bent) + push - pose.rotation.x;
    reach = Math.max(reach, dims.thigh * Math.cos(hip) + dims.shin * Math.cos(hip + bent));
  }
  if (!stepped) inner.position.y = -dims.pivot - (dims.thigh + dims.shin - reach) - 0.006;
  g.updateMatrixWorld(true);
  for (const arm of arms) {
    const sd = arm.sd;
    const grip = sd > 0 ? p.right : p.left;
    if (grip) {
      body.worldToLocal(hand.copy(grip.at));
      body.worldToLocal(look.copy(grip.face));
      const pl = grip.pole ?? [0.3, -0.2, -0.12];
      pole.set(arm.S.x + sd * pl[0], arm.S.y + pl[1], arm.S.z + pl[2]);
      const u = grip.up ?? [0, 0.4, 1];
      up.set(u[0] * sd, u[1], u[2]);
    } else {
      const [rx, ry, rz] = dims.restHand;
      const swung = stepped
        ? -stepped[arms.indexOf(arm)] * dims.swing
        : -Math.sin(phase + (sd > 0 ? 0 : Math.PI)) * dims.swing * walk;
      hand.set(sd * rx, ry + (stepped ? Math.abs(swung) * 0.18 : 0), rz + swung);
      pole.set(arm.S.x + sd * 0.3, arm.S.y - 0.1, arm.S.z - 0.3);
      look.set(hand.x - sd * 0.2, hand.y, hand.z);
      up.set(0, -1, 0);
    }
    // Solve, measure how deep the arm sits in the clothes, open it and solve again: a free hand
    // moves out with its elbow, a hand with a task stays on it and only the elbow swings out.
    for (let pass = 0; pass < 8; pass++) {
      solveArm(arm, hand, pole, look, up);
      const fixed = grip !== null && grip.free !== true;
      const depth = armDepth(arm, dims, fixed);
      if (depth <= 0) break;
      pole.x += sd * (0.14 + depth * 2);
      pole.z += 0.04;
      if (!fixed) {
        const r = Math.hypot(hand.x, hand.z) || 1e-6;
        const out = depth * 1.25;
        hand.x += (hand.x / r) * out;
        hand.z += (hand.z / r) * out;
        look.set(hand.x - sd * 0.2, hand.y, hand.z);
      }
    }
  }
}

/** Half thickness of a forearm plus the gap that must show between an arm and the clothes. */
export const ARM_GAP = 0.04;
const elbow = new THREE.Vector3();
const sample = new THREE.Vector3();

/**
 * How deep a solved arm sits inside the clothes (metres, 0 or less when clear): the worst point
 * along the upper arm past the shoulder and along the forearm. A hand with a task is not counted:
 * its place is given.
 */
export function armDepth(arm: Arm, dims: Dims, held: boolean): number {
  elbow.set(0, arm.L1, 0).applyQuaternion(arm.sh.quaternion).add(arm.S);
  let worst = -Infinity;
  const probe = (a: THREE.Vector3, b: THREE.Vector3, t: number): void => {
    sample.lerpVectors(a, b, t);
    const cloth = dims.radius(sample.y);
    if (cloth > 0) worst = Math.max(worst, cloth + ARM_GAP - Math.hypot(sample.x, sample.z));
  };
  for (const t of [0.5, 0.75, 1]) probe(arm.S, elbow, t);
  for (const t of held ? [0.25, 0.5, 0.7] : [0.25, 0.5, 0.75, 1])
    probe(elbow, arm.hand.position, t);
  return worst;
}
