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
import type { Dims, Figure } from "./puppet";

const V3 = (x = 0, y = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Man Ninon's measures (body space): an elderly woman, a head and a half taller than Mila. */
export const NINON_DIMS: Dims = {
  thigh: 0.36,
  shin: 0.335,
  pivot: 0.88,
  stride: 0.4,
  restHand: [0.24, 0.78, 0.05],
  swing: 0.09,
};

const SHOULDER_Y = 1.235;
const HEAD_Y = 1.44;
/** Her head against Mila's child-sized one. */
const HEAD_SCALE = 0.9;

/** Her everyday dress: a plain knee-length cotton shift, fuller at the hips, soft folds at the hem. */
function dressGeometry(): THREE.LatheGeometry {
  const profile: [number, number][] = [
    [0.07, 1.31],
    [0.15, 1.27],
    [0.185, 1.2],
    [0.195, 1.1],
    [0.185, 0.99],
    [0.205, 0.9],
    [0.235, 0.78],
    [0.25, 0.62],
    [0.265, 0.46],
    [0.275, 0.4],
  ];
  const geometry = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    64,
  );
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const low = THREE.MathUtils.clamp((1.0 - y) / 0.6, 0, 1);
    // Flatter back and chest than a turned shape; folds that open towards the hem.
    const depth = z > 0 ? 0.92 : 0.84;
    const fold = 1 + (Math.sin(a * 9) * 0.028 + Math.sin(a * 17 + 1.3) * 0.012) * low * low;
    p.setXYZ(i, x * fold, y, z * depth * fold);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Man Ninon: built on the plan of the shared Mila figure (skinned limbs, sculpted head, the same
 * hands and arm IK) so the two stand in one drawing, with her own proportions: grey hair in a bun,
 * a coral cotton dress with short sleeves, sandals. No folklore costume (brief, spec 02).
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
  const sole = flat("#5a4334", 0.1);

  const dress = new THREE.Mesh(dressGeometry(), dressM);
  body.add(dress);
  const legs: Leg[] = [];
  for (const sx of [-1, 1]) {
    const limb = skinnedLimb(skin, {
      lens: [NINON_DIMS.thigh, NINON_DIMS.shin],
      axis: -1,
      radii: [0.062, 0.056, 0.048, 0.04, 0.042, 0.04, 0.033, 0.027, 0.025],
    });
    limb.mesh.position.set(sx * 0.085, 0.75, 0);
    inner.add(limb.mesh);
    const [hip, knee, ankle] = limb.bones;
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), skin);
    foot.scale.set(0.62, 0.36, 1.5);
    foot.position.set(0, -0.03, 0.04);
    ankle.add(foot);
    const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.2), sole);
    sandal.position.set(0, -0.052, 0.04);
    ankle.add(sandal);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 5, 14, Math.PI), sole);
    strap.position.set(0, -0.045, 0.08);
    strap.rotation.y = Math.PI / 2;
    ankle.add(strap);
    legs.push({ hip, knee, ankle, sx, prevC: 0 });
  }
  body.add(
    taper(
      [V3(0, 1.27, -0.005), V3(0, 1.33, 0.004), V3(0, 1.38, 0.012)],
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
      radii: [0.047, 0.045, 0.04, 0.035, 0.032, 0.03, 0.027, 0.024],
    });
    limb.mesh.position.set(sd * 0.185, SHOULDER_Y, 0);
    body.add(limb.mesh);
    // Short sleeve: a cap of the dress's cotton over the shoulder, riding the upper arm.
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.066, 14, 10), dressM);
    sleeve.scale.set(1, 1.35, 1);
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
  head.position.set(0, HEAD_Y, 0.02);
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
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), hairM);
  bun.scale.set(1.1, 0.95, 0.9);
  bun.position.set(0, 0.03, -0.135);
  face.add(bun);
  return { g, pose, inner, body, head, legs, arms };
}
