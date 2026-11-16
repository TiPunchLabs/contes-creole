import * as THREE from "three";
import { clamp, lerp } from "@shared/math";
import { WALK_CYCLE } from "./wander";
import {
  SMOOTH,
  SPHERE,
  bendy,
  blink,
  blobShadow,
  eye,
  fused,
  gazeYaw,
  mat,
  noise,
  painted,
  place,
  ramp,
  springTo,
  tag,
  type CritterView,
  type Piece,
  type Spring,
} from "./parts";

const SKIN = "#b0a2b9";
const LIGHT = "#cdbfd2";
const PINK = "#e9b3ad";
const NAIL = "#f3e6d2";
const STRAW = "#e2c07a";
const SCALE = 0.8;
/** Hip height. */
const HIP = 0.66;
/** Share of a leg's cycle spent on the ground: three feet down at any time. */
const DUTY = 0.75;
/** How far a planted foot travels under the body, in his own units: the ground covered meanwhile. */
const STRIDE = (WALK_CYCLE * DUTY) / SCALE;
const TRUNK_PIECE = 0.2;
/** Lean of each trunk joint from straight down towards the front, hanging and raised. */
const TRUNK_REST = [0.8, 0.42, 0.1, -0.15, -0.3, -0.1];
const TRUNK_UP = [1.15, 1.7, 2.2, 2.6, 2.95, 3.3];
/** A sniff now and then: the tip curls in. */
const TRUNK_SNIFF = [0.6, 0.5, 0.5, 0.75, 1.3, 1.9];

/** Moves a point of the unit ball to its place in the ear (right side; mirrored for the left). */
function earPoint(p: THREE.Vector3): THREE.Vector3 {
  const out = Math.max(0, p.x);
  // Narrower towards the lobe, which hangs lower than the top rises.
  const taper = 1 - 0.3 * ramp(0.1, -1, p.y);
  const x = p.x > 0 ? p.x * 0.82 * taper : p.x * 0.2;
  const y = p.y * (p.y > 0 ? 0.4 : 0.45) - 0.04;
  // Thick where it leaves the head, thin at the rim, which curls back; the lobe tips forward.
  const thick = lerp(0.19, 0.045, ramp(-0.6, 0.7, p.x));
  const z = p.z * thick - 0.13 * out * out + 0.05 * ramp(-0.3, -1, p.y) * out;
  return p.set(x, y, z);
}

/**
 * One ear, for the right side (mirrored for the left): a leaf with a thick root that sinks into
 * the temple, a broad rounded top, a lobe that hangs lower and narrower, and a rim that curls
 * back. Its hollow is painted pink on the front face, inside a wide rim of skin.
 */
function earLeaf(skin: THREE.Color, pink: THREE.Color): THREE.BufferGeometry {
  const geo = painted(SMOOTH, (p, out) => {
    const hollow =
      ramp(0.25, 0.75, p.z) * ramp(0.78, 0.45, Math.hypot(p.x - 0.12, p.y)) * ramp(-0.35, 0.1, p.x);
    out.copy(skin).lerp(pink, hollow * 0.8);
  });
  const position = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    earPoint(p.fromBufferAttribute(position, i));
    position.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  smoothSeams(geo);
  return geo;
}

/** Where the blade of the ear starts, out from its hinge: nearer is the root, sunk in the temple. */
const EAR_BLADE = 0.16;
/**
 * Points of the blade that must stay out of the body, in the ear's own frame (right side): one
 * vertex in five of its two faces.
 */
const EAR_PROBES: readonly THREE.Vector3[] = (() => {
  const position = SMOOTH.attributes.position;
  const probes: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i += 5) {
    const p = earPoint(new THREE.Vector3().fromBufferAttribute(position, i));
    if (p.x >= EAR_BLADE) probes.push(p);
  }
  return probes;
})();
/** Clearance kept between an ear and the body, as a share of the body's own radii. */
const EAR_CLEAR = 0.07;
/** How far an ear may lift off the shoulder, and the furthest forward it may be held (radians). */
const EAR_LIFT = 1.3;
const EAR_FORWARD = -0.3;

/** Gives the vertices a sphere doubles along its seam and at its poles one shared normal. */
function smoothSeams(geo: THREE.BufferGeometry): void {
  const position = geo.attributes.position;
  const normal = geo.attributes.normal;
  const sums = new Map<string, THREE.Vector3>();
  const key = (i: number): string =>
    `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`;
  const n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const sum = sums.get(key(i)) ?? new THREE.Vector3();
    sums.set(key(i), sum.add(n.fromBufferAttribute(normal, i)));
  }
  for (let i = 0; i < position.count; i++) {
    const sum = sums.get(key(i));
    if (!sum) continue;
    n.copy(sum).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
}

/**
 * Konpè Zanba: big, heavy and slow, bakoua hat. One skin with a paler underside, short legs
 * under a low belly, a trunk and a tail of one piece. He leans into his starts and nods into his
 * stops, his steps carry him (four beats), his belly, ears, trunk and tail follow late. He
 * breathes, blinks, fans his ears, sniffs, looks around, and raises his trunk when touched.
 */
export function createZanba(): CritterView {
  const group = new THREE.Group();
  const hide = mat("#ffffff", { vertexColors: true });
  const skinColour = new THREE.Color(SKIN);
  const lightColour = new THREE.Color(LIGHT);
  const pinkColour = new THREE.Color(PINK);

  const body = new THREE.Group();
  group.add(body);
  // Paler chest and belly painted on the barrel, shaded underneath.
  const barrel = new THREE.Mesh(
    painted(SMOOTH, (p, out) => {
      const under = ramp(-0.25, -0.8, p.y);
      const chest = ramp(0.55, 0.85, p.z) * ramp(0.35, -0.2, p.y);
      out
        .copy(skinColour)
        .lerp(lightColour, Math.min(1, under * 0.85 + chest))
        .multiplyScalar(lerp(0.82, 1.03, ramp(-1, 0.4, p.y)));
    }),
    hide,
  );
  barrel.position.set(0, 1.04, -0.08);
  body.add(barrel);

  // Short columns that widen into the body and flare at the foot; hips stay at ground distance.
  const legGeo = new THREE.LatheGeometry(
    [
      [0, 0.08],
      [0.18, 0.07],
      [0.27, 0],
      [0.255, -0.3],
      [0.25, -0.52],
      [0.285, -0.62],
      [0.27, -0.66],
      [0, -0.66],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    26,
  );
  const legWithNails = fused([
    [legGeo, SKIN, 0, 0, 0, 1],
    ...[-1, 0, 1].map((k): Piece => [
      SPHERE,
      NAIL,
      k * 0.11,
      -0.6,
      0.25 - Math.abs(k) * 0.035,
      0.055,
      0.05,
      0.04,
    ]),
  ]);
  const legs = // Four beats: left hind, left fore, right hind, right fore.
    (
      [
        [0.41, 0.5, Math.PI * 0.5],
        [-0.41, 0.5, Math.PI * 1.5],
        [-0.41, -0.6, Math.PI],
        [0.41, -0.6, 0],
      ] as const
    ).map(([x, z, phase]) => {
      const g = new THREE.Group();
      g.position.set(x, HIP, z);
      g.add(new THREE.Mesh(legWithNails, hide));
      group.add(g);
      const u = (phase / (Math.PI * 2)) % 1;
      const reach = u < DUTY ? (0.5 - u / DUTY) * STRIDE : 0;
      return { g, phase, x, z, reach, from: reach, side: 0, sideFrom: 0, swinging: u >= DUTY };
    });

  const head = new THREE.Group();
  head.position.set(0, 1.46, 0.86);
  body.add(head);
  const eyes = [eye(0.22, 0.1, 0.42, 0.07), eye(-0.22, 0.1, 0.42, 0.07)];
  head.add(
    new THREE.Mesh(
      fused([
        [SMOOTH, SKIN, 0, 0, 0, 0.58, 0.55, 0.52],
        [SPHERE, PINK, 0.32, -0.12, 0.35, 0.09, 0.06, 0.04],
        [SPHERE, PINK, -0.32, -0.12, 0.35, 0.09, 0.06, 0.04],
      ]),
      hide,
    ),
    ...eyes,
  );
  const earGeo = earLeaf(skinColour, pinkColour);
  const ears = [-1, 1].map((side) => {
    // Hinged inside the temple, so the root of the ear is always sunk in the head.
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.43, 0.28, 0);
    const leaf = new THREE.Mesh(earGeo, hide);
    leaf.scale.x = side;
    pivot.add(leaf);
    head.add(pivot);
    return { side, pivot, fan: { x: 0.42, v: 0 } as Spring, lift: { x: 0, v: 0 } as Spring };
  });
  const probe = new THREE.Vector3();
  const tilt = new THREE.Euler(0, 0, 0, "YXZ");
  /** Whether an ear fanned back by `fan` and lifted by `lift` keeps its blade out of the body. */
  const earClear = (side: number, fan: number, lift: number): boolean => {
    tilt.set(0, side * fan, side * lift);
    const pivot = ears[side < 0 ? 0 : 1].pivot.position;
    const reach = (1 + EAR_CLEAR) * (1 + EAR_CLEAR);
    for (const q of EAR_PROBES) {
      // Ear frame (mirrored on the left) → hinge → head → body, then into the barrel's own ball.
      probe
        .set(q.x * side, q.y, q.z)
        .applyEuler(tilt)
        .add(pivot);
      // Inside the head it is hidden, and no concern of the body's.
      if ((probe.x / 0.58) ** 2 + (probe.y / 0.55) ** 2 + (probe.z / 0.52) ** 2 < 1) continue;
      probe
        .applyQuaternion(head.quaternion)
        .add(head.position)
        .sub(barrel.position)
        .divide(barrel.scale);
      if (probe.lengthSq() < reach) return false;
    }
    return true;
  };
  /** The least lift that keeps an ear fanned by `fan` out of the body, or -1 if none does. */
  const earLift = (side: number, fan: number): number => {
    if (earClear(side, fan, 0)) return 0;
    let touching = 0;
    let clear = -1;
    for (let lift = 0.2; lift <= EAR_LIFT + 1e-6; lift += 0.2) {
      if (earClear(side, fan, lift)) {
        clear = lift;
        break;
      }
      touching = lift;
    }
    if (clear < 0) return -1;
    // Refined, so the lift follows the head's turn smoothly.
    for (let k = 0; k < 6; k++) {
      const mid = (clear + touching) / 2;
      if (earClear(side, fan, mid)) clear = mid;
      else touching = mid;
    }
    return clear;
  };
  /**
   * Where an ear that wants to fan back by `wanted` may be: as far back as that, lifted off the
   * shoulder by what it takes; held further forward when no lift is enough.
   */
  const earPose = (side: number, wanted: number, out: { fan: number; lift: number }): void => {
    for (let fan = wanted; ; fan -= 0.15) {
      const lift = earLift(side, Math.max(fan, EAR_FORWARD));
      if (lift >= 0 || fan <= EAR_FORWARD) {
        out.fan = Math.max(fan, EAR_FORWARD);
        out.lift = lift >= 0 ? lift : EAR_LIFT;
        return;
      }
    }
  };
  const earAt = { fan: 0, lift: 0 };
  const trunk = bendy(
    hide,
    TRUNK_REST.length + 1,
    18,
    12,
    (u) => {
      const r = lerp(0.21, 0.095, Math.pow(u, 0.8));
      return [r, r];
    },
    (u, facing, out) => {
      out
        .copy(skinColour)
        .lerp(lightColour, ramp(0.9, 1, u) * 0.9 + ramp(-0.2, 0.8, facing) * 0.25)
        .multiplyScalar(lerp(0.9, 1, ramp(1, -0.3, facing)));
    },
  );
  head.add(trunk.mesh);
  const trunkPoints = Array.from({ length: TRUNK_REST.length + 1 }, () => new THREE.Vector3());
  trunkPoints[0].set(0, -0.08, 0.4);
  const trunkJoints = TRUNK_REST.map((x): Spring => ({ x, v: 0 }));
  const hat = new THREE.Group();
  hat.position.set(0.06, 0.52, -0.05);
  hat.rotation.set(-0.12, 0, -0.12);
  head.add(hat);
  hat.add(
    new THREE.Mesh(
      fused([
        [new THREE.ConeGeometry(0.34, 0.34, 36), STRAW, 0, 0.17, 0, 1],
        [new THREE.CylinderGeometry(0.58, 0.6, 0.035, 48), STRAW, 0, 0.01, 0, 1],
        [new THREE.CylinderGeometry(0.3, 0.32, 0.06, 36), "#c4572e", 0, 0.06, 0, 1],
      ]),
      hide,
    ),
  );
  const tail = bendy(
    hide,
    3,
    8,
    8,
    (u) => {
      const r = lerp(0.075, 0.04, u) + ramp(0.75, 0.95, u) * 0.04;
      return [r, r];
    },
    (u, _facing, out) => {
      out.copy(skinColour).multiplyScalar(lerp(1, 0.72, ramp(0.78, 0.95, u)));
    },
  );
  body.add(tail.mesh);
  const tailPoints = [new THREE.Vector3(0, 1.3, -1.1), new THREE.Vector3(), new THREE.Vector3()];

  const shadow = blobShadow(1.3);
  group.add(shadow);
  group.scale.setScalar(SCALE);
  tag(group, "zanba");

  const pitch: Spring = { x: 0, v: 0 };
  const jiggle: Spring = { x: 0, v: 0 };
  const turn: Spring = { x: 0, v: 0 };
  const sway: Spring = { x: 0, v: 0 };
  const wag: Spring = { x: 0, v: 0 };
  let last = 0;
  let lastSpeed = 0;
  let lastYaw = 0;
  let lastPhase = 0;
  let lastBeat = 0;
  let started = false;

  return {
    group,
    top: 2.3,
    pose(c, time, around) {
      place(group, c);
      const dt = clamp(time - last, 0, 0.05);
      last = time;
      const lively = around.calm ? 0 : 1;
      const push = dt > 0 ? clamp((c.v - lastSpeed) / dt, -3, 3) : 0;
      if (!started) {
        // First frame: nothing has moved yet, whatever heading he starts with.
        started = true;
        lastYaw = c.yaw;
        lastPhase = c.phase;
        lastSpeed = c.v;
      }
      // Ground covered since the last frame, and the turn taken meanwhile.
      const travel = (c.phase - lastPhase) / c.step;
      const turned = Math.atan2(Math.sin(c.yaw - lastYaw), Math.cos(c.yaw - lastYaw));
      const veer = dt > 0 ? clamp((c.yaw - lastYaw) / dt, -2, 2) : 0;
      const pace = dt > 0 ? clamp(Math.abs(c.phase - lastPhase) / dt / 3, 0, 1) : 0;
      lastSpeed = c.v;
      lastYaw = c.yaw;
      lastPhase = c.phase;
      const up = c.react > 0 ? Math.sin((1 - c.react) * Math.PI) * (lively ? 1 : 0.3) : 0;

      // Legs: the stance foot stays where it is on the ground while the body passes over it.
      for (const leg of legs) {
        const u = ((c.phase + leg.phase) / (Math.PI * 2)) % 1;
        if (u < DUTY) {
          // On the ground the foot goes back under the body by exactly the ground its own hip
          // covers (less on the inside of a turn, more on the outside): it holds its place.
          if (leg.swinging) leg.reach = 0.5 * STRIDE;
          leg.swinging = false;
          leg.reach = clamp(leg.reach - travel / SCALE + turned * leg.x, -0.45, 0.45);
          // A turn also carries the hip sideways over the foot: the hip slides inside the belly.
          leg.side = clamp(leg.side - turned * (leg.z + leg.reach), -0.16, 0.16);
          leg.from = leg.reach;
          leg.sideFrom = leg.side;
        } else {
          // Then it swings forward in the air, from wherever it left the ground.
          const swing = (u - DUTY) / (1 - DUTY);
          leg.swinging = true;
          const ease = swing * swing * (3 - 2 * swing);
          leg.reach = lerp(leg.from, 0.5 * STRIDE, ease);
          leg.side = lerp(leg.sideFrom, 0, ease);
        }
        const swing = u < DUTY ? 0 : (u - DUTY) / (1 - DUTY);
        const angle = Math.asin(clamp(leg.reach / HIP, -0.75, 0.75));
        leg.g.rotation.x = -angle;
        leg.g.position.x = leg.x + leg.side;
        // The hip gives what the leaning leg loses in height, so the sole stays on the ground;
        // a leg in the air is lifted at any pace, slow arcs included: a swinging foot never drags.
        leg.g.position.y =
          HIP * Math.cos(angle) + Math.sin(swing * Math.PI) * 0.085 * Math.min(1, pace * 8);
      }
      // Each footfall shakes the belly a little.
      const beat = Math.floor(c.phase / (Math.PI / 2));
      if (beat !== lastBeat) jiggle.v -= 0.35 * pace;
      lastBeat = beat;
      const settle = springTo(jiggle, 0, 110, 9, dt);
      const breath = Math.sin(time * 1.25) * 0.012;
      barrel.scale.set(
        0.9 * (1 + breath - settle * 0.5),
        0.74 * (1 + settle),
        1.1 * (1 + breath * 0.5),
      );
      body.rotation.z = Math.sin(c.phase) * 0.035 * pace + lively * Math.sin(time * 0.31) * 0.012;
      body.rotation.x = springTo(pitch, -push * 0.045 - up * 0.05, 34, 5.5, dt);
      body.position.y = -Math.abs(Math.sin(c.phase * 2)) * 0.022 * pace + breath * 0.4;

      // Ears: slow fanning, a flap now and then, late on every turn, spread wide when touched.
      const slot = Math.floor(time / 5.1);
      const since = time - slot * 5.1 - noise(slot, 5) * 3.6;
      const flap =
        lively && since > 0 && since < 0.7 ? Math.sin((since / 0.7) * Math.PI * 2) * 0.22 : 0;

      // Trunk: hangs, swings with the walk, sniffs, rises when touched; each joint follows late.
      const sniffSlot = Math.floor(time / 8.7);
      const sniffAt = time - sniffSlot * 8.7 - noise(sniffSlot, 9) * 5;
      const sniff =
        lively && sniffAt > 0 && sniffAt < 1.8 ? Math.sin((sniffAt / 1.8) * Math.PI) : 0;
      const side = springTo(sway, -veer * 0.25 + Math.sin(c.phase) * 0.12 * pace, 30, 4.5, dt);
      trunkJoints.forEach((joint, k) => {
        const wave = lively * Math.sin(time * 1.1 - k * 0.7) * 0.05 * (0.4 + k * 0.15);
        const rest =
          lerp(TRUNK_REST[k], TRUNK_SNIFF[k], sniff) +
          wave +
          Math.sin(c.phase * 2 - k * 0.5) * 0.05 * pace;
        const lean = springTo(joint, lerp(rest, TRUNK_UP[k], up), 60 - k * 5, 9, dt);
        const out = side * (k + 1) * 0.32;
        trunkPoints[k + 1]
          .set(Math.sin(out), -Math.cos(lean) * Math.cos(out), Math.sin(lean) * Math.cos(out))
          .multiplyScalar(TRUNK_PIECE)
          .add(trunkPoints[k]);
      });
      trunk.update(trunkPoints);

      const swing = springTo(
        wag,
        Math.sin(c.phase) * 0.35 * pace - veer * 0.3 + flap * 0.8,
        40,
        4,
        dt,
      );
      tailPoints[1].set(Math.sin(swing) * 0.2, 1.3 - 0.22, -1.1 - 0.12);
      tailPoints[2].set(Math.sin(swing * 1.8) * 0.36, 1.3 - 0.5, -1.1 - 0.1);
      tail.update(tailPoints);

      // Head: ahead and nodding on the move, else towards whoever holds his attention.
      const look = Math.floor(time / 6.1 + 0.5);
      const pick = noise(look, 23);
      const target =
        c.react > 0 || pick > 0.75 ? around.camera : pick > 0.35 ? around.teller : around.other;
      const gaze =
        c.moving > 0.2
          ? 0
          : gazeYaw(group.position, c.yaw, around.calm ? around.teller : target, 0.5);
      head.rotation.y = springTo(turn, gaze, 22, 7, dt);
      head.rotation.x =
        -up * 0.2 +
        Math.sin(c.phase * 2 + 0.6) * 0.03 * pace +
        lively * Math.sin(time * 0.7) * 0.02;
      head.rotation.z = -body.rotation.z * 0.6;
      // After the head, whose turn decides how far back each ear may lie without entering the body.
      for (const ear of ears) {
        const idle =
          lively * (Math.sin(time * 0.83 + ear.side) * 0.07 + Math.sin(time * 0.29) * 0.05);
        const target = 0.42 + idle + flap + up * 0.38 + pace * 0.08 - ear.side * veer * 0.16;
        earPose(ear.side, target, earAt);
        let fan = springTo(ear.fan, earAt.fan, 42, 5, dt);
        if (fan > earAt.fan) {
          // Past what the pose allows (the spring's own overshoot): held at the limit.
          fan = ear.fan.x = earAt.fan;
          ear.fan.v = Math.min(0, ear.fan.v);
        }
        // The lift for where the ear really is, eased, and never under what clearance asks.
        const found = earLift(ear.side, fan);
        const need = found < 0 ? EAR_LIFT : found;
        const lift = Math.max(need, springTo(ear.lift, need, 60, 12, dt));
        ear.lift.x = lift;
        ear.pivot.rotation.set(0, ear.side * fan, ear.side * lift, "YXZ");
      }
      const lid = blink(time, 2);
      for (const e of eyes) e.scale.y = lid;
    },
  };
}
