import * as THREE from "three";
import { clamp, lerp, smoothstep } from "@shared/math";

/** Seconds of the entry dive (the tree's DIVE_SECONDS), its end fov, and the tree card's height. */
export const DIVE_SECONDS = 1.7;
export const DIVE_FOV = 95;
const TREE_CARD_HEIGHT = 2.1;
/** How far beyond its card the tree's dive ends (it flies through the card). */
const TREE_OVERSHOOT = 0.6;

interface Pose {
  position: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

/** Landscape framing (desktop, the three-moment board) and portrait framing (the mobile view). */
const WIDE: Pose = {
  position: new THREE.Vector3(0.35, 1.5, 2.3),
  look: new THREE.Vector3(0.55, 0.4, -1.7),
  fov: 52,
};
const TALL: Pose = {
  position: new THREE.Vector3(0.55, 1.85, 2.9),
  look: new THREE.Vector3(0.55, 0.35, -1.2),
  fov: 84,
};

/** 0 for a wide screen (aspect ≥ 1.25), 1 for a phone held upright (≤ 0.6), eased in between. */
export function tallness(aspect: number): number {
  return smoothstep(clamp((1.25 - aspect) / (1.25 - 0.6), 0, 1));
}

/**
 * The fixed camera for an aspect ratio: the wide pose from 1.25 up, the tall pose under 0.6,
 * blended in between, so phones keep the child, the book and the controls in frame.
 */
export function restPose(aspect: number, out: Pose): Pose {
  const t = tallness(aspect);
  out.position.lerpVectors(WIDE.position, TALL.position, t);
  out.look.lerpVectors(WIDE.look, TALL.look, t);
  out.fov = lerp(WIDE.fov, TALL.fov, t);
  // Very wide screens (a phone held sideways, low height): step back a little so the book fits.
  if (aspect > 1.9) out.position.z += (aspect - 1.9) * 0.35;
  return out;
}

/** A pose to fill. */
export function emptyPose(): Pose {
  return { position: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 };
}

/**
 * The tree's dive, adapted to the book: same length, ease, fov opening and fly-through, from the
 * rest pose to the art's centre; the overshoot keeps its proportion to what is entered (0.6 for a
 * 2.1-high card, here scaled on the page height). Writes the camera pose for `progress` (0 → 1).
 */
export function divePose(
  rest: Pose,
  target: THREE.Vector3,
  pageHeight: number,
  progress: number,
  out: Pose,
): Pose {
  const d = smoothstep(clamp(progress, 0, 1));
  const overshoot = (TREE_OVERSHOOT * pageHeight) / TREE_CARD_HEIGHT;
  const dest = new THREE.Vector3()
    .copy(rest.position)
    .sub(target)
    .normalize()
    .multiplyScalar(-overshoot)
    .add(target);
  out.position.lerpVectors(rest.position, dest, d);
  out.look.lerpVectors(rest.look, target, d);
  out.fov = lerp(rest.fov, DIVE_FOV, d);
  return out;
}
