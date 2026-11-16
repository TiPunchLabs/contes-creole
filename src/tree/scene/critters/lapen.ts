import * as THREE from "three";
import { clamp, lerp } from "@shared/math";
import {
  SMOOTH,
  SPHERE,
  bendy,
  blink,
  blobShadow,
  eye,
  gazeYaw,
  liftShadow,
  madrasTexture,
  mat,
  noise,
  painted,
  part,
  place,
  ramp,
  springTo,
  tag,
  type CritterView,
  type Spring,
} from "./parts";
import { HOP_GROUND } from "./wander";

const FUR = "#c99868";
const CREAM = "#f5e6cc";
const PINK = "#eaa79a";
/** Height of a full hop and of the jump for joy, in his own units (he is scaled by `SCALE`). */
const HOP = 0.34;
const JUMP = 0.8;
const SCALE = 0.68;
const EAR_LENGTH = [0.27, 0.32] as const;

/** Unit direction of an ear piece leaning back by `back` and out by `out` (radians). */
function earWay(back: number, out: number, target: THREE.Vector3): THREE.Vector3 {
  return target.set(Math.sin(out), Math.cos(back) * Math.cos(out), -Math.sin(back) * Math.cos(out));
}

/**
 * Konpè Lapen: small, slim and quick, madras scarf, long ears. One skin: the cream of his belly
 * and the pink of his ears are painted on it, his haunches and feet belong to his body. He gathers
 * before each hop, stretches in the air, lands with a soft squash; ears and tail follow late. He
 * breathes, blinks, looks at the Konteur, at Zanba or at you, and jumps for joy when touched.
 */
export function createLapen(): CritterView {
  const group = new THREE.Group();
  const fur = mat(FUR);
  const skin = mat("#ffffff", { vertexColors: true });
  const cream = mat(CREAM);
  const pink = mat(PINK);
  const madras = mat("#ffffff", { map: madrasTexture() });
  const furColour = new THREE.Color(FUR);
  const creamColour = new THREE.Color(CREAM);
  const pinkColour = new THREE.Color(PINK);

  const body = new THREE.Group();
  group.add(body);
  // Cream belly painted on the chest and tummy, darker fur underneath.
  const torso = new THREE.Mesh(
    painted(SMOOTH, (p, out) => {
      const belly = ramp(0.3, 0.62, p.z) * ramp(0.72, 0.4, Math.abs(p.x)) * ramp(0.8, 0.5, p.y);
      out
        .copy(furColour)
        .lerp(creamColour, belly)
        .multiplyScalar(lerp(0.8, 1.03, ramp(-0.9, 0.5, p.y)));
    }),
    skin,
  );
  torso.position.set(0, 0.62, 0);
  torso.scale.set(0.35, 0.45, 0.32);
  const tail = part(SPHERE, cream, 0, 0.42, -0.34, 0.13);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.062, 12, 32), madras);
  scarf.position.set(0, 0.95, 0.02);
  scarf.rotation.x = Math.PI / 2 - 0.15;
  body.add(torso, tail, scarf, part(SPHERE, madras, 0.1, 0.88, 0.27, 0.07, 0.1, 0.05));

  // Haunch and long foot on one pivot: the feet leave the ground with him and tuck in the air.
  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.19, 0.3, -0.02);
    leg.add(
      part(SMOOTH, fur, 0, 0.02, -0.02, 0.18, 0.24, 0.26),
      part(SPHERE, cream, side * 0.01, -0.235, 0.17, 0.1, 0.065, 0.23),
    );
    body.add(leg);
    return leg;
  });
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.24, 0.76, 0.1);
    arm.add(part(SPHERE, fur, 0, -0.13, 0.05, 0.075, 0.16, 0.08));
    arm.rotation.z = side * 0.25;
    body.add(arm);
    return arm;
  });

  const head = new THREE.Group();
  head.position.set(0, 1.15, 0.05);
  body.add(head);
  const eyes = [eye(0.125, 0.05, 0.245, 0.055), eye(-0.125, 0.05, 0.245, 0.055)];
  head.add(
    part(SMOOTH, fur, 0, 0, 0, 0.31, 0.29, 0.29),
    part(SPHERE, cream, 0, -0.085, 0.2, 0.165, 0.115, 0.13),
    part(SPHERE, pink, 0, -0.025, 0.32, 0.05, 0.038, 0.035),
    part(SPHERE, pink, 0.2, -0.08, 0.185, 0.06, 0.04, 0.03),
    part(SPHERE, pink, -0.2, -0.08, 0.185, 0.06, 0.04, 0.03),
    ...eyes,
  );
  // Each ear is one bent blade, pink inside; root, middle and tip are laid out every frame.
  const ears = [-1, 1].map((side) => {
    const ear = bendy(
      skin,
      10,
      12,
      (u) => [0.035 + 0.07 * Math.sin(Math.PI * clamp(u * 0.88 + 0.1, 0, 1)), 0.036 - u * 0.016],
      (u, facing, out) => {
        const inside = ramp(0.3, 0.8, facing) * ramp(0.06, 0.22, u) * ramp(0.98, 0.82, u);
        out.copy(furColour).lerp(pinkColour, inside);
      },
    );
    head.add(ear.mesh);
    const root = new THREE.Vector3(side * 0.115, 0.2, -0.03);
    return {
      side,
      ear,
      points: [root, new THREE.Vector3(), new THREE.Vector3()],
      low: { x: 0, v: 0 } as Spring,
      high: { x: 0, v: 0 } as Spring,
    };
  });

  const shadow = blobShadow(0.55);
  group.add(shadow);
  group.scale.setScalar(SCALE);
  tag(group, "lapen");

  const way = new THREE.Vector3();
  const squash: Spring = { x: 0, v: 0 };
  const turn: Spring = { x: 0, v: 0 };
  const nod: Spring = { x: 0, v: 0 };
  let last = 0;
  let lastHeight = 0;
  let wasAirborne = false;

  return {
    group,
    top: 1.6,
    pose(c, time, around) {
      place(group, c);
      const dt = clamp(time - last, 0, 0.05);
      last = time;
      const lively = around.calm ? 0 : 1;

      // The hop: gather on the ground, leave, land.
      const cycle = c.phase / (Math.PI * 2);
      const airborne = cycle >= HOP_GROUND;
      const air = airborne ? (cycle - HOP_GROUND) / (1 - HOP_GROUND) : 0;
      const gather = !airborne && c.phase > 0 ? Math.sin((Math.PI * cycle) / HOP_GROUND) : 0;
      let height = Math.sin(Math.PI * air) * HOP * (0.45 + 0.55 * c.moving);
      const lean = airborne ? Math.sin(Math.PI * air) * (0.5 - air) * 0.5 : gather * 0.08;
      let tuck = airborne ? Math.sin(Math.PI * air) * 0.85 : -gather * 0.2;
      let crouch = gather * 0.11;
      let cheer = 0;

      // Touched: a short crouch, then a jump for joy (a nod of the head under reduced motion).
      if (c.react > 0) {
        const u = 1 - c.react;
        if (lively) {
          const up = u < 0.16 ? 0 : Math.sin((Math.PI * (u - 0.16)) / 0.84);
          crouch += u < 0.16 ? Math.sin((Math.PI * u) / 0.16) * 0.14 : 0;
          height += up * JUMP;
          tuck += up * 0.6;
          cheer = up;
        } else {
          cheer = Math.sin(Math.PI * u) * 0.3;
        }
      }
      if (wasAirborne && height <= 0.001) squash.v -= 1.6 * (0.4 + c.moving);
      wasAirborne = height > 0.001;
      const rise = dt > 0 ? (height - lastHeight) / dt : 0;
      lastHeight = height;

      const breath = Math.sin(time * 2.6) * 0.012;
      const squat = clamp(
        springTo(squash, 0, 190, 15, dt) - crouch + clamp(rise, 0, 3) * 0.022,
        -0.2,
        0.14,
      );
      const wide = 1 / Math.sqrt(1 + squat);
      body.position.y = height;
      body.scale.set(wide, 1 + squat, wide);
      body.rotation.x = lean;
      body.rotation.z = lively * (1 - c.moving) * Math.sin(time * 0.47 + 1.3) * 0.025;
      torso.scale.set(0.35 * (1 + breath), 0.45, 0.32 * (1 + breath * 1.6));
      for (const leg of legs) leg.rotation.x = tuck;
      arms.forEach((arm, i) => {
        arm.rotation.x =
          -0.25 - cheer * 2.1 + tuck * 0.35 + Math.sin(time * 1.1 + i * 2) * 0.05 * lively;
        arm.rotation.z = (i ? 1 : -1) * (0.25 + cheer * 0.55);
      });
      tail.position.y = 0.42 + clamp(-rise, -1, 1) * 0.02;
      liftShadow(shadow, height);

      // Ears: thrown back by the leap, late on the way down, and a twitch now and then.
      ears.forEach((e, i) => {
        const slot = Math.floor(time / 3.7 + i * 0.5);
        const since = time - (slot - i * 0.5) * 3.7 - noise(slot, i + 3) * 3;
        const twitch = lively && since > 0 && since < 0.22 ? Math.sin((since / 0.22) * Math.PI) : 0;
        const rest =
          0.12 + c.moving * 0.3 - cheer * 0.25 + Math.sin(time * 0.8 + i * 1.7) * 0.03 * lively;
        const back = springTo(
          e.low,
          rest + clamp(rise, -2.5, 2.5) * 0.16 - twitch * 0.2,
          150,
          13,
          dt,
        );
        const tip = springTo(e.high, back * 1.5, 80, 8, dt);
        const out = e.side * (0.2 + cheer * 0.3 + twitch * 0.12);
        e.points[1].copy(e.points[0]).addScaledVector(earWay(back, out, way), EAR_LENGTH[0]);
        e.points[2]
          .copy(e.points[1])
          .addScaledVector(earWay(back + tip, out * 1.25, way), EAR_LENGTH[1]);
        e.ear.update(e.points);
      });

      // Head: ahead while on the move, else towards whoever holds his attention for a while.
      const slot = Math.floor(time / 4.3);
      const pick = noise(slot, 11);
      const target =
        c.react > 0 || pick > 0.72 ? around.camera : pick > 0.3 ? around.teller : around.other;
      const gaze =
        c.moving > 0.2
          ? 0
          : gazeYaw(group.position, c.yaw, around.calm ? around.teller : target, 0.75);
      head.rotation.y = springTo(turn, gaze, 60, 11, dt);
      head.rotation.x = springTo(
        nod,
        -lean * 0.8 - cheer * 0.25 + clamp(rise, -2, 2) * 0.03,
        90,
        12,
        dt,
      );
      head.rotation.z = lively * Math.sin(time * 0.61) * 0.045 * (1 - c.moving);
      const lid = blink(time, 1);
      for (const e of eyes) e.scale.y = lid;
    },
  };
}
