import * as THREE from "three";
import {
  arc,
  HEAD_R,
  makeHand,
  onHead,
  sculpt,
  skinnedLimb,
  taper,
  type Arm,
  type Leg,
} from "@shared/mila/figure";
import { washed, type Wash } from "./paint";
import { ELDER_STEP, type Dims, type Figure } from "./puppet";

const V3 = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Her dress in profile: radius and height, hem last (body space). */
const DRESS_PROFILE: [number, number][] = [
  [0.07, 1.31],
  [0.152, 1.275],
  [0.192, 1.21],
  [0.208, 1.12],
  [0.196, 1.0],
  [0.226, 0.88],
  [0.248, 0.74],
  [0.254, 0.58],
  [0.264, 0.44],
  [0.284, 0.33],
  [0.292, 0.3],
];

/**
 * Widest radius of her dress at a height, folds included; 0 below the hem and above the bust,
 * where the sleeves and shoulders are the dress.
 */
export function ninonDressRadius(y: number): number {
  if (y > 1.12 || y < DRESS_PROFILE[DRESS_PROFILE.length - 1][1]) return 0;
  for (let i = 1; i < DRESS_PROFILE.length; i++) {
    const [r0, y0] = DRESS_PROFILE[i - 1];
    const [r1, y1] = DRESS_PROFILE[i];
    if (y <= y0 && y >= y1) return (r0 + ((r1 - r0) * (y0 - y)) / (y0 - y1)) * 1.045;
  }
  return 0;
}

/** Man Ninon's measures (body space): an elderly woman, a head and a half taller than Mila. */
export const NINON_DIMS: Dims = {
  thigh: 0.36,
  shin: 0.335,
  pivot: 0.88,
  // An older woman's step: short, both feet long on the ground (see `plantedWalk`).
  stride: 0.42,
  restHand: [0.33, 0.8, 0.04],
  swing: 0.1,
  step: ELDER_STEP,
  radius: ninonDressRadius,
};

const SHOULDER_Y = 1.235;
const HEAD_Y = 1.44;
/** Her head against Mila's child-sized one. */
const HEAD_SCALE = 0.9;

/**
 * Her everyday dress: a plain cotton shift to mid-calf, full at the bust and the hips, a little
 * taken in between, flaring at the hem in soft folds.
 */
function dressGeometry(): THREE.LatheGeometry {
  const geometry = new THREE.LatheGeometry(
    DRESS_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
    64,
  );
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const low = THREE.MathUtils.clamp((1.0 - y) / 0.7, 0, 1);
    // Flatter back and chest than a turned shape; folds that open towards the hem.
    // A rounder belly in front, and the upper back rounded by the years behind.
    const belly = z > 0 ? 0.1 * Math.exp(-(((y - 0.86) / 0.16) ** 2)) : 0;
    const back = z < 0 ? 0.16 * Math.exp(-(((y - 1.17) / 0.11) ** 2)) : 0;
    const depth = (z > 0 ? 0.92 : 0.84) + belly + back;
    const fold = 1 + (Math.sin(a * 9) * 0.028 + Math.sin(a * 17 + 1.3) * 0.012) * low * low;
    p.setXYZ(i, x * fold, y, z * depth * fold);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Man Ninon: built on the plan of the shared Mila figure (skinned limbs, sculpted head, the same
 * hands and arm IK) so the two stand in one drawing, with her own proportions: grey hair in a bun,
 * a coral cotton dress to mid-calf with short sleeves, light closed shoes. No folklore costume (brief, spec 02).
 */
export function createNinon(wash: Wash, ramp: THREE.Texture, cloth: THREE.Texture): Figure {
  const g = new THREE.Group();
  const pose = new THREE.Group();
  pose.position.y = NINON_DIMS.pivot;
  g.add(pose);
  const inner = new THREE.Group();
  inner.position.y = -NINON_DIMS.pivot;
  pose.add(inner);
  const body = new THREE.Group();
  inner.add(body);
  const flat = (color: string, gran = 0.25, brush = 0.7): THREE.MeshToonMaterial =>
    washed(wash, ramp, {
      color,
      gran,
      pool: 0.25,
      scale: 8,
      brush,
      vary: 0.15,
      ragged: brush < 0.5 ? 0.12 : 0.5,
    });
  /** Her face: drawn fine, almost untouched by the sheet's brush. */
  const fine = (color: string): THREE.MeshToonMaterial => flat(color, 0, 0.12);
  const faceSkin = flat("#74432e", 0.18, 0.2);
  const skin = flat("#74432e");
  const skinL = flat("#85523a");
  const dark = fine("#22130d");
  const dressM = washed(wash, ramp, {
    color: "#d9837a",
    map: cloth,
    side: THREE.DoubleSide,
    gran: 0.4,
    pool: 0.22,
    scale: 6,
  });
  const hairM = flat("#b9b4ae", 0.35);
  // Light closed walking shoes of soft sand-coloured leather, pale against her skin and the path so
  // they read at dusk and at night; a darker collar and sole draw the shoe.
  const leather = flat("#cfbf9f", 0.3, 0.55);
  const trim = flat("#8a6f55", 0.15, 0.5);
  const sole = flat("#6d5644", 0.1);

  const dress = new THREE.Mesh(dressGeometry(), dressM);
  body.add(dress);
  const legs: Leg[] = [];
  for (const sx of [-1, 1]) {
    const limb = skinnedLimb(skin, {
      lens: [NINON_DIMS.thigh, NINON_DIMS.shin],
      axis: -1,
      radii: [0.068, 0.062, 0.054, 0.046, 0.05, 0.05, 0.042, 0.034, 0.03],
    });
    limb.mesh.position.set(sx * 0.085, 0.75, 0);
    inner.add(limb.mesh);
    const [hip, knee, ankle] = limb.bones;
    // A low closed shoe: a rounded upper over the whole foot, a firmer heel, a collar round the
    // ankle and a flat sole with a low heel.
    const upper = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), leather);
    upper.scale.set(0.74, 0.44, 1.6);
    upper.position.set(0, -0.022, 0.042);
    ankle.add(upper);
    const counter = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), leather);
    counter.scale.set(1, 0.9, 0.95);
    counter.position.set(0, -0.012, -0.012);
    ankle.add(counter);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 6, 18), trim);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.012, 0.004);
    ankle.add(collar);
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.012, 0.185), sole);
    tread.position.set(0, -0.042, 0.042);
    ankle.add(tread);
    legs.push({ hip, knee, ankle, sx, prevC: 0 });
  }
  body.add(
    taper(
      [V3(0, 1.27, 0), V3(0, 1.325, 0.018), V3(0, 1.372, 0.036)],
      [0.058, 0.048, 0.05],
      skin,
      8,
      12,
    ),
  );
  const arms: Arm[] = [-1, 1].map((sd) => {
    const L1 = 0.245;
    const L2 = 0.225;
    const limb = skinnedLimb(skin, {
      lens: [L1, L2],
      axis: 1,
      radii: [0.05, 0.05, 0.045, 0.039, 0.036, 0.034, 0.03, 0.026],
    });
    limb.mesh.position.set(sd * 0.185, SHOULDER_Y, 0);
    body.add(limb.mesh);
    // Short sleeve: a cap of the dress's cotton over the shoulder, riding the upper arm.
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.074, 14, 10), dressM);
    sleeve.scale.set(1.02, 1.4, 1.05);
    sleeve.position.y = 0.05;
    limb.bones[0].add(sleeve);
    const hand = makeHand(skin, skinL);
    hand.scale.setScalar(1.22);
    body.add(hand);
    return {
      sd,
      L1,
      L2,
      sh: limb.bones[0],
      el: limb.bones[1],
      hand,
      S: V3(sd * 0.185, SHOULDER_Y, 0),
    };
  });

  const head = new THREE.Group();
  // Carried a little forward of the shoulders: an older woman's neck.
  head.position.set(0, HEAD_Y - 0.012, 0.045);
  body.add(head);
  const face = new THREE.Group();
  face.scale.setScalar(HEAD_SCALE);
  head.add(face);
  const skull = new THREE.SphereGeometry(1, 48, 36);
  const sp = skull.attributes.position;
  const v = V3();
  for (let i = 0; i < sp.count; i++) {
    v.set(sp.getX(i), sp.getY(i), sp.getZ(i));
    const q = sculpt(v).multiplyScalar(HEAD_R);
    // A longer, less round face than the child's.
    sp.setXYZ(i, q.x * 0.95, q.y * 1.07, q.z);
  }
  skull.computeVertexNormals();
  face.add(new THREE.Mesh(skull, faceSkin));
  const nose = onHead(V3(0, -0.14, 1), -0.003);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), faceSkin);
  tip.scale.set(1.5, 1, 0.9);
  tip.position.set(0, -0.004, 0.012);
  nose.add(tip);
  face.add(nose);
  const mouth = onHead(V3(0, -0.47, 0.88), 0);
  const lips = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 8), fine("#7a3b30"));
  lips.scale.set(1.3, 0.42, 0.45);
  mouth.add(lips);
  // A quiet smile line under the lips.
  mouth.add(
    arc(V3(-0.024, 0.004, 0.009), V3(0, -0.006, 0.012), V3(0.024, 0.004, 0.009), 0.0016, dark),
  );
  face.add(mouth);
  const white = fine("#f2ebe0");
  const iris = fine("#3b1d10");
  const brow = fine("#9a958f");
  for (const sx of [-1, 1]) {
    const eye = onHead(V3(sx * 0.4, 0.05, 0.91), -0.004);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), white);
    ball.scale.set(1.25, 0.8, 0.5);
    eye.add(ball);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 12, 10), iris);
    ir.scale.set(1, 1, 0.45);
    ir.position.z = 0.005;
    eye.add(ir);
    // Heavier lids and crow's feet: her age shows in the eyes, not in a costume.
    eye.add(
      arc(V3(-0.021, 0.004, 0.004), V3(0, 0.014, 0.008), V3(0.021, 0.003, 0.004), 0.0032, dark),
    );
    eye.add(
      arc(
        V3(sx * 0.022, 0.002, 0.002),
        V3(sx * 0.03, 0.001, 0),
        V3(sx * 0.036, -0.004, -0.003),
        0.0012,
        dark,
      ),
    );
    face.add(eye);
    const b = onHead(V3(sx * 0.42, 0.26, 0.88), 0.001);
    b.add(arc(V3(-0.02, -0.002, 0), V3(0, 0.005, 0.0015), V3(0.02, -0.002, 0), 0.0026, brow));
    face.add(b);
    const ear = onHead(V3(sx, -0.03, -0.05), -0.006);
    const rim = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), skinL);
    rim.scale.set(0.5, 1.1, 0.8);
    ear.add(rim);
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), flat("#e9b949", 0));
    stud.position.set(0, -0.022, 0.006);
    ear.add(stud);
    face.add(ear);
  }
  // Grey hair drawn back into a low bun.
  const cap = new THREE.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, 1.52);
  const cp = cap.attributes.position;
  const xAxis = V3(1, 0, 0);
  for (let i = 0; i < cp.count; i++) {
    v.set(cp.getX(i), cp.getY(i), cp.getZ(i)).applyAxisAngle(xAxis, -0.82);
    const q = sculpt(v).multiplyScalar(HEAD_R * 1.045);
    cp.setXYZ(i, q.x * 0.95, q.y * 1.07, q.z);
  }
  cap.computeVertexNormals();
  face.add(new THREE.Mesh(cap, hairM));
  // A full chignon, low on the nape: it draws her profile.
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.064, 16, 12), hairM);
  bun.scale.set(1.12, 0.92, 0.95);
  bun.position.set(0, 0.012, -0.15);
  face.add(bun);
  return { g, pose, inner, body, head, legs, arms };
}
