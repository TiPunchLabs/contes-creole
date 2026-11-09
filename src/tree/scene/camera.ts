import * as THREE from "three";

/** Climb progress (t ∈ [0, 1]) at which the card of book `index` hangs, spread over [0.2, 0.88]. */
export const cardT = (index: number, count: number): number =>
  count <= 1 ? 0.5 : 0.2 + index * (0.68 / (count - 1));

/** Spiral camera path around the tree (v14); writes position and look-at target, returns the angle. */
export function hubCam(t: number, out: THREE.Vector3, look: THREE.Vector3): number {
  const a = -Math.PI / 2 + t * Math.PI * 1.55;
  const r = 20 - t * 4;
  const y = 1.3 + t * 6.4;
  out.set(Math.cos(a) * r, y, Math.sin(a) * r);
  look.set(0, y + 2.2 - t * 1.2, 0);
  return a;
}

/**
 * Where a fresh visit opens: the top of the spiral, under the crown, trunk centred, Ti Kannot's
 * card on the left and Mila's on the right (owner's reference view). Scrolling down leaves it and
 * descends the spiral.
 */
export const OPENING_T = 1;

/** The climb bar's position for climb value `t`: 0 at the opening view, 1 at the foot of the spiral. */
export const progressOf = (t: number): number => OPENING_T - t;

/** Share of the half-width the opening view keeps the books within. */
const OPENING_MARGIN = 0.76;
/** Farthest the camera backs off at the opening on a narrow screen. */
const OPENING_BACK_MAX = 12;

/**
 * How far the camera backs off along its line of sight at the opening view so every point in
 * `points` (the books' cards) stays within the screen's width: 0 on a wide screen, more on a narrow
 * portrait one, whose field of view `fitFov` caps.
 */
export function openingBack(points: readonly THREE.Vector3[], fov: number, aspect: number): number {
  const eye = new THREE.Vector3();
  const look = new THREE.Vector3();
  hubCam(OPENING_T, eye, look);
  const forward = look.sub(eye).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const half = Math.tan((fov * Math.PI) / 360) * aspect * OPENING_MARGIN;
  const rel = new THREE.Vector3();
  let back = 0;
  for (const p of points) {
    rel.copy(p).sub(eye);
    back = Math.max(back, Math.abs(rel.dot(right)) / half - rel.dot(forward));
  }
  return Math.min(OPENING_BACK_MAX, back);
}

/**
 * Weight of the opening back-off along the climb: whole at the opening view, gone well before the
 * next book (t ≤ 0.6), so the spiral's book views stay as they were.
 */
export const openingWeight = (t: number): number => {
  const u = Math.min(1, Math.max(0, (t - 0.6) / (OPENING_T - 0.6)));
  return u * u * (3 - 2 * u);
};
