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
  /** Keeps a hand target out of the clothes. */
  clear?: (hand: THREE.Vector3, lean: number) => THREE.Vector3;
}

/** A hand's task: where it goes (world), what its palm faces (world) and where its fingers point. */
export interface Grip {
  at: THREE.Vector3;
  face: THREE.Vector3;
  /** Direction of the fingers, body space. */
  up?: readonly [number, number, number];
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

const hand = new THREE.Vector3();
const pole = new THREE.Vector3();
const look = new THREE.Vector3();
const up = new THREE.Vector3();

/**
 * Puts a figure in a pose: place, step cycle (Mila's walk from the underwater tale: thigh swing,
 * knee bending on the pass, flat foot, body dropping onto the standing leg), stoop, head and two-bone
 * arm IK towards the hands' tasks. `time` only feeds the idle breath.
 */
export function applyPose(figure: Figure, dims: Dims, p: Pose, time: number): void {
  const { g, pose, inner, body, head, legs, arms } = figure;
  g.visible = p.visible;
  if (!p.visible) return;
  g.position.set(p.x, p.y, p.z);
  g.rotation.y = p.yaw;
  const phase = (p.walked / dims.stride) * Math.PI;
  const walk = p.gait;
  const sway = Math.sin(phase);
  pose.rotation.x = p.lean + 0.06 * walk;
  pose.rotation.z = sway * 0.045 * walk;
  body.rotation.y = sway * 0.07 * walk;
  head.rotation.set(
    p.headPitch - pose.rotation.x * 0.5 + Math.sin(time * 0.45) * 0.015,
    p.headYaw - sway * 0.05 * walk,
    -sway * 0.03 * walk,
  );
  let reach = 0;
  for (const leg of legs) {
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
  inner.position.y = -dims.pivot - (dims.thigh + dims.shin - reach) - 0.006;
  g.updateMatrixWorld(true);
  for (const arm of arms) {
    const sd = arm.sd;
    const grip = sd > 0 ? p.right : p.left;
    if (grip) {
      body.worldToLocal(hand.copy(grip.at));
      body.worldToLocal(look.copy(grip.face));
      const pl = grip.pole ?? [0.22, -0.2, -0.12];
      pole.set(arm.S.x + sd * pl[0], arm.S.y + pl[1], arm.S.z + pl[2]);
      const u = grip.up ?? [0, 0.4, 1];
      up.set(u[0] * sd, u[1], u[2]);
      dims.clear?.(hand, 0);
    } else {
      const [rx, ry, rz] = dims.restHand;
      hand.set(sd * rx, ry, rz - Math.sin(phase + (sd > 0 ? 0 : Math.PI)) * dims.swing * walk);
      pole.set(arm.S.x + sd * 0.12, arm.S.y, arm.S.z - 0.3);
      look.set(hand.x - sd * 0.2, hand.y, hand.z);
      up.set(0, -1, 0);
      dims.clear?.(hand, 0);
    }
    solveArm(arm, hand, pole, look, up);
  }
}
