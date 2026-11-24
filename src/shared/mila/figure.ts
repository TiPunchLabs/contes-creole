import * as THREE from "three";
import { clamp, lerp } from "@shared/math";
import { fbm, smooth, vnoise } from "./noise";

type V3 = THREE.Vector3;
const V3 = (x = 0, y = 0, z = 0): V3 => new THREE.Vector3(x, y, z);

/** Mila's skin tone; her head's vertex colours start from it. */
export const MILA_SKIN = "#6b3a26";

/** Mila's paper dress, one flounce per row: yTop, yBot, rTop, rBot, jag, seed (body space). */
export const DRESS: [number, number, number, number, number, number][] = [
  [0.935, 0.77, 0.074, 0.098, 0, 1],
  [0.84, 0.69, 0.092, 0.158, 0.035, 2],
  [0.75, 0.6, 0.13, 0.205, 0.045, 3],
  [0.665, 0.455, 0.17, 0.255, 0.055, 4],
];
/** Clearance between an arm's axis and the dress surface (limb radius plus a small gap). */
export const ARM_CLEARANCE = 0.035;

/**
 * Widest radius of the dress at height `y` (body space): the flounce profile of `flounce()` with
 * its crumpled folds at their largest. 0 above and below the dress.
 */
export function dressRadius(y: number): number {
  let r = 0;
  for (const [yTop, yBot, rTop, rBot] of DRESS) {
    if (y > yTop || y < yBot) continue;
    const t = (yTop - y) / (yTop - yBot);
    r = Math.max(r, lerp(rTop, rBot, Math.pow(t, 0.8)) * (1 + 0.083 * t + 0.035 * t * t));
  }
  return r;
}

/**
 * Moves a hand target (body space) out of the dress: the hand rests against the flounces instead
 * of sinking into them. `lean` widens the clearance on the side the wind blows the hem to.
 */
export function clearOfDress(h: THREE.Vector3, lean = 0): THREE.Vector3 {
  const need = dressRadius(h.y) + ARM_CLEARANCE + lean;
  const r = Math.hypot(h.x, h.z);
  if (need > 0 && r < need) {
    if (r < 1e-6) h.x = need;
    else {
      h.x *= need / r;
      h.z *= need / r;
    }
  }
  return h;
}

/** One crumpled paper flounce of the dress (lathe), `aHem` 0 at its top to 1 at its hem. */
export function flounce(
  yTop: number,
  yBot: number,
  rTop: number,
  rBot: number,
  jag = 0.05,
  seedK = 0,
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const R = 10;
  for (let i = 0; i <= R; i++) {
    const t = i / R;
    pts.push(new THREE.Vector2(lerp(rTop, rBot, Math.pow(t, 0.8)), lerp(yTop, yBot, t)));
  }
  const g = new THREE.LatheGeometry(pts, 96);
  const p = g.attributes.position;
  const hem = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const t = (yTop - y) / (yTop - yBot);
    // crumpled paper folds and flounces
    const cr =
      1 +
      (fbm(Math.cos(a) * 3 + seedK, Math.sin(a) * 3 + t * 2, 3) - 0.5) * 0.2 * t +
      Math.sin(a * 14 + seedK * 3) * 0.035 * t * t +
      Math.sin(a * 31 + seedK) * 0.008 * t;
    let ny = y;
    if (t > 0.9)
      ny -=
        ((fbm(a * 4 + seedK, 1, 2) - 0.3) * jag +
          (0.5 + 0.5 * Math.sin(a * 14 + seedK * 3)) * 0.022) *
        smooth(0.9, 1, t);
    p.setXYZ(i, x * cr, ny, z * cr);
    hem[i] = t;
  }
  g.setAttribute("aHem", new THREE.BufferAttribute(hem, 1));
  g.computeVertexNormals();
  return g;
}

/** Replaces degenerate normals (zero-area faces) by a unit vector. */
export function fixNormals(geo: THREE.BufferGeometry): void {
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i);
    const y = n.getY(i);
    const z = n.getZ(i);
    const l = Math.hypot(x, y, z);
    if (!(l > 1e-6)) n.setXYZ(i, 0, 1, 0);
    else n.setXYZ(i, x / l, y / l, z / l);
  }
  n.needsUpdate = true;
}

/** One skinned mesh bending at its joints; axis +1 for arms (up), -1 for legs (down). */
export function skinnedLimb(
  mat: THREE.Material,
  o: { lens: number[]; radii: number[]; axis?: number; offsets?: (t: number) => number },
): { mesh: THREE.SkinnedMesh; bones: THREE.Bone[] } {
  const { lens, radii, axis = 1, offsets } = o;
  const radial = 16;
  const rings = 40;
  const blend = 0.035;
  const total = lens.reduce((a, b) => a + b, 0);
  const pos: number[] = [];
  const si: number[] = [];
  const sw: number[] = [];
  const idx: number[] = [];
  const rAt = (t: number): number => {
    const f = t * (radii.length - 1);
    const i = Math.min(radii.length - 2, Math.floor(f));
    const u = f - i;
    const k = u * u * (3 - 2 * u);
    return lerp(radii[i], radii[i + 1], k);
  };
  const cuts: number[] = [];
  let acc = 0;
  for (let b = 0; b < lens.length - 1; b++) {
    acc += lens[b];
    cuts.push(acc);
  }
  const off = offsets ?? ((): number => 0);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const d = -0.012 + t * (total + 0.016);
    const r = rAt(clamp(d / total, 0, 1));
    let bone = 0;
    for (const c of cuts) if (d > c) bone++;
    let w = [0, 0, 0, 0];
    w[bone] = 1;
    for (let b = 0; b < cuts.length; b++) {
      const k = smooth(cuts[b] - blend, cuts[b] + blend, d);
      if (Math.abs(d - cuts[b]) < blend) {
        w = [0, 0, 0, 0];
        w[b] = 1 - k;
        w[b + 1] = k;
      }
    }
    const zoff = off(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(Math.cos(a) * r, axis * d, Math.sin(a) * r + zoff);
      const ids = [0, 1, 2, 3].sort((p, q) => w[q] - w[p]);
      si.push(...ids);
      sw.push(...ids.map((q) => w[q]));
    }
  }
  const W = radial + 1;
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * W + j;
      const b = a + W;
      if (axis > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(g, mat);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  const bones: THREE.Bone[] = [];
  let parent: THREE.Object3D = mesh;
  for (let b = 0; b < lens.length + 1; b++) {
    const bn = new THREE.Bone();
    bn.position.y = b === 0 ? 0 : axis * lens[b - 1];
    parent.add(bn);
    bones.push(bn);
    parent = bn;
  }
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  return { mesh, bones };
}
/** Tapered tube (arms, fingers, neck). */
export function taper(
  pts: V3[],
  radii: number[],
  mat: THREE.Material,
  seg = 22,
  rad = 14,
  caps = true,
): THREE.Group {
  const c = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const fr = c.computeFrenetFrames(seg, false);
  const pos: number[] = [];
  const idx: number[] = [];
  const rAt = (t: number): number => {
    const f = t * (radii.length - 1);
    const i = Math.min(radii.length - 2, Math.floor(f));
    const u = f - i;
    const k = u * u * (3 - 2 * u);
    return lerp(radii[i], radii[i + 1], k);
  };
  const P = V3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    c.getPointAt(t, P);
    const r = rAt(t);
    const N = fr.normals[i];
    const B = fr.binormals[i];
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      pos.push(
        P.x + (N.x * ca + B.x * sa) * r,
        P.y + (N.y * ca + B.y * sa) * r,
        P.z + (N.z * ca + B.z * sa) * r,
      );
    }
  }
  const W = rad + 1;
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < rad; j++) {
      const a = i * W + j;
      const b = a + W;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  fixNormals(g);
  const grp = new THREE.Group();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  grp.add(m);
  if (caps) {
    for (const [t, r] of [
      [0, radii[0]],
      [1, radii[radii.length - 1]],
    ]) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 14, 10), mat);
      c.getPointAt(t, sp.position);
      grp.add(sp);
    }
  }
  return grp;
}

/** Sculpted head: jaw, chin, full cheeks, eye sockets, back of the skull. */
export function sculpt(v: V3): V3 {
  let x = v.x;
  let y = v.y;
  let z = v.z;
  const out = V3();
  const jaw = smooth(-0.05, -1, y);
  x *= 1 - jaw * 0.27;
  z *= 1 - jaw * 0.1;
  if (y < -0.3 && z > 0) z += 0.05 * Math.exp(-((x / 0.32) ** 2 + ((y + 0.82) / 0.22) ** 2));
  let bump = 0;
  for (const sx of [-1, 1]) {
    bump +=
      0.032 *
      Math.exp(-(((x - sx * 0.5) / 0.25) ** 2 + ((y + 0.3) / 0.22) ** 2 + ((z - 0.7) / 0.32) ** 2));
    bump -=
      0.045 *
      Math.exp(
        -(((x - sx * 0.35) / 0.15) ** 2 + ((y - 0.06) / 0.12) ** 2 + ((z - 0.9) / 0.2) ** 2),
      );
  }
  bump += 0.025 * Math.exp(-((x / 0.5) ** 2 + ((y - 0.42) / 0.2) ** 2 + ((z - 0.85) / 0.3) ** 2));
  if (z < 0) {
    z *= 1.1;
    y += z * z * 0.04;
  }
  bump += 0.075 * Math.exp(-((x / 0.3) ** 2 + ((y + 0.24) / 0.3) ** 2 + ((z - 0.92) / 0.3) ** 2));
  out.set(x * 0.87, y * 1.04, z * 0.97).addScaledVector(v, bump);
  return out;
}
export const HEAD_R = 0.126;
function headPoint(dir: V3): { p: V3; n: V3 } {
  const d = dir.clone().normalize();
  const p = sculpt(d).multiplyScalar(HEAD_R);
  const e1 = V3(0, 1, 0).cross(d).normalize();
  if (e1.lengthSq() < 0.1) e1.set(1, 0, 0);
  const e2 = d.clone().cross(e1).normalize();
  const p1 = sculpt(d.clone().addScaledVector(e1, 0.01).normalize()).multiplyScalar(HEAD_R).sub(p);
  const p2 = sculpt(d.clone().addScaledVector(e2, 0.01).normalize()).multiplyScalar(HEAD_R).sub(p);
  const n = p2.clone().cross(p1).normalize();
  if (n.dot(d) < 0) n.negate();
  return { p, n };
}
export function onHead(dir: V3, lift = 0): THREE.Group {
  const { p, n } = headPoint(dir);
  const g = new THREE.Group();
  g.position.copy(p).addScaledVector(n, lift);
  // local frame: z = normal, x = horizontal
  const xAxis = V3(0, 1, 0).cross(n).normalize();
  if (xAxis.x < 0 && dir.x >= -0.2) xAxis.negate();
  if (dir.x < -0.2 && xAxis.z < 0) xAxis.negate();
  const yAxis = n.clone().cross(xAxis).normalize();
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, n));
  return g;
}
const arc = (a: V3, b: V3, c: V3, r: number, mat: THREE.Material): THREE.Mesh =>
  new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, b, c), 16, r, 6, false),
    mat,
  );
/** Hand holding the conch: palm towards the target, fingers curled. */
export function makeHand(mat: THREE.Material, matL: THREE.Material): THREE.Group {
  const h = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), mat);
  palm.scale.set(1.05, 1.15, 0.55);
  h.add(palm);
  for (let k = 0; k < 4; k++) {
    const x = -0.0135 + k * 0.009;
    const L = [0.85, 1, 0.95, 0.75][k];
    h.add(
      taper(
        [V3(x, 0.02, 0.002), V3(x, 0.02 + 0.014 * L, 0.008), V3(x, 0.02 + 0.017 * L, 0.02)],
        [0.0066, 0.006, 0.0054],
        matL,
        8,
        8,
      ),
    );
  }
  h.add(
    taper(
      [V3(0.02, -0.006, 0.004), V3(0.026, 0.004, 0.014), V3(0.022, 0.012, 0.022)],
      [0.0074, 0.0064, 0.0056],
      matL,
      8,
      8,
    ),
  );
  return h;
}

/** One of Mila's legs: its three joints, its side (-1 left, +1 right) and the gait's last phase sign. */
export interface Leg {
  hip: THREE.Bone;
  knee: THREE.Bone;
  ankle: THREE.Bone;
  sx: number;
  prevC: number;
}

/** One of Mila's arms: bone lengths, joints, hand and shoulder point (body space). */
export interface Arm {
  sd: number;
  L1: number;
  L2: number;
  sh: THREE.Bone;
  el: THREE.Bone;
  hand: THREE.Group;
  S: V3;
}

/** The materials Mila is painted with (each tale brings its own) and the seeded draws of her hairline. */
export interface MilaKit {
  skin: THREE.Material;
  /** Lighter skin of the fingers, toes and inner ears. */
  skinLight: THREE.Material;
  dark: THREE.Material;
  lipUpper: THREE.Material;
  lipLower: THREE.Material;
  white: THREE.Material;
  /** Textured with `paintHair`. */
  hair: THREE.Material;
  /** Textured with `paintDress`; may move the flounces with their `aHem` attribute. */
  dress: THREE.Material;
  strap: THREE.Material;
  /** White, with vertex colours: the head carries its blush and eye sockets. */
  head: THREE.Material;
  nostril: THREE.Material;
  lidLine: THREE.Material;
  iris: THREE.Material;
  pupil: THREE.Material;
  shine: THREE.Material;
  brow: THREE.Material;
  hoop: THREE.Material;
  /** Textured with `paintMadras`. */
  madras: THREE.Material;
  /** Uniform draw in [a, b) from the tale's seeded generator (180 draws, the hairline). */
  rand(a: number, b: number): number;
}

/**
 * Mila as built: `g` is placed in the world (feet at its origin, facing +z), `pose` tilts her whole
 * body about her hips, `inner` drops her onto her standing foot, `body` carries dress, arms and head.
 */
export interface MilaFigure {
  g: THREE.Group;
  pose: THREE.Group;
  inner: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: Leg[];
  puffs: THREE.Group[];
  /** Closed eyes and mouth; shown when `open` is hidden. */
  closed: THREE.Group;
  /** Open eyes and smile. */
  open: THREE.Group;
  arms: Arm[];
}

/** Builds Mila: paper dress, skinned limbs, sculpted head, puffs and madras ties. */
export function buildMilaFigure(kit: MilaKit): MilaFigure {
  const g = new THREE.Group();
  const pose = new THREE.Group();
  pose.position.y = 0.62;
  g.add(pose);
  const inner = new THREE.Group();
  inner.position.y = -0.62;
  pose.add(inner);
  const body = new THREE.Group();
  inner.add(body);
  const { skin, skinLight: skinL, dark, lipUpper: lipU, lipLower: lipD, white } = kit;
  const { hair: hairM, dress: dressMat, madras: madM } = kit;
  for (const L of DRESS) {
    const m = new THREE.Mesh(flounce(...L), dressMat);
    m.castShadow = true;
    body.add(m);
  }
  const strapM = kit.strap;
  for (const sx of [-1, 1])
    body.add(
      taper(
        [V3(sx * 0.044, 0.912, 0.066), V3(sx * 0.076, 0.945, 0.005), V3(sx * 0.05, 0.91, -0.066)],
        [0.009, 0.01, 0.009],
        strapM,
        14,
        8,
        false,
      ),
    );
  // shaped legs (knee, calf, ankle) and feet with toes
  const legs: Leg[] = [];
  for (const sx of [-1, 1]) {
    const L = skinnedLimb(skin, {
      lens: [0.245, 0.222],
      axis: -1,
      radii: [0.041, 0.037, 0.032, 0.028, 0.03, 0.031, 0.026, 0.02, 0.018],
      offsets: (t) =>
        0.012 * Math.sin(Math.PI * clamp(t * 2, 0, 1)) -
        0.012 * Math.sin(Math.PI * clamp(t * 2 - 1, 0, 1)),
    });
    L.mesh.position.set(sx * 0.05, 0.52, 0);
    inner.add(L.mesh);
    const [hip, knee, ankle] = L.bones;
    const ft = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 10), skin);
    ft.scale.set(0.6, 0.36, 1.42);
    ft.position.set(0, -0.024, 0.03);
    ankle.add(ft);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 8), skin);
    heel.position.set(0, -0.016, -0.012);
    ankle.add(heel);
    for (let k = 0; k < 5; k++) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.0078 - k * 0.0008, 8, 6), skinL);
      t.position.set((k - 2) * 0.0078 * -sx + 0.002 * sx, -0.03, 0.093 - Math.abs(k - 1) * 0.004);
      ankle.add(t);
    }
    legs.push({ hip, knee, ankle, sx, prevC: 0 });
  }
  // neck, shoulders, tapered arms
  body.add(
    taper(
      [V3(0, 0.87, -0.004), V3(0, 0.95, -0.01), V3(0, 1.02, -0.016)],
      [0.038, 0.03, 0.032],
      skin,
      10,
      14,
    ),
  );
  for (const sx of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.0285, 14, 10), skin);
    sh.position.set(sx * 0.098, 0.896, 0);
    body.add(sh);
  }
  const arms: Arm[] = [-1, 1].map((sd) => {
    const L1 = 0.145;
    const L2 = 0.135;
    const lim = skinnedLimb(skin, {
      lens: [L1, L2],
      axis: 1,
      radii: [0.029, 0.027, 0.024, 0.021, 0.0195, 0.019, 0.017, 0.015],
    });
    lim.mesh.position.set(sd * 0.098, 0.896, 0);
    body.add(lim.mesh);
    const hand = makeHand(skin, skinL);
    hand.scale.setScalar(0.88);
    body.add(hand);
    return { sd, L1, L2, sh: lim.bones[0], el: lim.bones[1], hand, S: V3(sd * 0.098, 0.896, 0) };
  });
  // sculpted head
  const head = new THREE.Group();
  head.position.set(0, 1.115, 0);
  body.add(head);
  const hg = new THREE.SphereGeometry(1, 64, 48);
  const hp = hg.attributes.position;
  const hc = new Float32Array(hp.count * 3);
  const cS = new THREE.Color(MILA_SKIN);
  const cB = new THREE.Color("#8d4636");
  const cD = new THREE.Color("#4f2919");
  const tc = new THREE.Color();
  const vv = V3();
  for (let i = 0; i < hp.count; i++) {
    vv.set(hp.getX(i), hp.getY(i), hp.getZ(i));
    const q = sculpt(vv).multiplyScalar(HEAD_R);
    hp.setXYZ(i, q.x, q.y, q.z);
    let blush = 0;
    for (const sx of [-1, 1])
      blush +=
        Math.exp(-(((vv.x - sx * 0.5) / 0.2) ** 2 + ((vv.y + 0.3) / 0.17) ** 2)) *
        (vv.z > 0 ? 1 : 0);
    const sock =
      Math.exp(-(((Math.abs(vv.x) - 0.35) / 0.16) ** 2 + ((vv.y - 0.1) / 0.1) ** 2)) *
      (vv.z > 0.5 ? 1 : 0);
    tc.copy(cS)
      .lerp(cB, Math.min(1, blush) * 0.28)
      .lerp(cD, sock * 0.18);
    hc[i * 3] = tc.r;
    hc[i * 3 + 1] = tc.g;
    hc[i * 3 + 2] = tc.b;
  }
  hg.setAttribute("color", new THREE.BufferAttribute(hc, 3));
  hg.computeVertexNormals();
  const headM = kit.head;
  const sk = new THREE.Mesh(hg, headM);
  sk.castShadow = true;
  head.add(sk);
  // broad soft nose
  const nose = onHead(V3(0, -0.14, 1), -0.004);
  nose.add(
    taper(
      [V3(0, 0.026, -0.01), V3(0, 0.014, 0.002), V3(0, 0.003, 0.01)],
      [0.0055, 0.0072, 0.0092],
      skin,
      8,
      10,
      false,
    ),
  );
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 14, 10), skin);
  tip.scale.set(1.5, 0.95, 0.85);
  tip.position.set(0, -0.004, 0.012);
  nose.add(tip);
  const nostril = kit.nostril;
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 8), skin);
    w.position.set(sx * 0.0125, -0.008, 0.003);
    nose.add(w);
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 8, 6), nostril);
    n.scale.set(1.5, 0.55, 1);
    n.position.set(sx * 0.0078, -0.0152, 0.007);
    nose.add(n);
  }
  head.add(nose);
  // full lips
  const mouth = onHead(V3(0, -0.47, 0.88), -0.002);
  const ul = new THREE.Mesh(new THREE.SphereGeometry(0.02, 18, 10), lipU);
  ul.scale.set(1.35, 0.38, 0.5);
  ul.position.set(0, 0.0045, 0.002);
  mouth.add(ul);
  const ll = new THREE.Mesh(new THREE.SphereGeometry(0.019, 18, 10), lipD);
  ll.scale.set(1.2, 0.48, 0.52);
  ll.position.set(0, -0.0075, 0.0015);
  mouth.add(ll);
  head.add(mouth);
  // closed eyes (lids, lashes) / open eyes (brown iris, highlight)
  const closed = new THREE.Group();
  const open = new THREE.Group();
  head.add(closed, open);
  const mc = onHead(V3(0, -0.47, 0.88), 0);
  mc.add(
    arc(V3(-0.02, 0.0012, 0.006), V3(0, -0.0006, 0.0085), V3(0.02, 0.0012, 0.006), 0.0013, dark),
  );
  closed.add(mc);
  const mo = onHead(V3(0, -0.47, 0.88), 0);
  mo.add(
    arc(V3(-0.029, 0.007, 0.008), V3(0, -0.012, 0.013), V3(0.029, 0.007, 0.008), 0.0026, dark),
  );
  open.add(mo);
  const { lidLine, iris, pupil, shine, brow, hoop: hoopM } = kit;
  for (const sx of [-1, 1]) {
    const e = onHead(V3(sx * 0.41, 0.04, 0.91), 0.001);
    e.scale.setScalar(1.18);
    e.add(arc(V3(-0.022, 0.004, 0), V3(0, -0.009, 0.003), V3(0.022, 0.003, 0), 0.0033, dark));
    for (let k = 0; k < 5; k++) {
      const t = 0.2 + k * 0.17;
      const px = lerp(-0.022, 0.022, t);
      const py = lerp(0.004, 0.003, t) - 0.0125 * 4 * t * (1 - t) * 0.75;
      const l = new THREE.Mesh(new THREE.ConeGeometry(0.0016, 0.009, 4), dark);
      l.position.set(px, py - 0.004, 0.003);
      l.rotation.z = (px * sx > 0 ? -0.5 : -0.15) * sx + Math.PI;
      l.rotation.x = -0.4;
      e.add(l);
    }
    e.add(
      arc(V3(-0.02, 0.014, -0.001), V3(0, 0.02, 0.001), V3(0.02, 0.013, -0.001), 0.0018, lidLine),
    );
    closed.add(e);
    const eo = onHead(V3(sx * 0.41, 0.05, 0.91), -0.004);
    eo.scale.setScalar(1.18);
    const sc = new THREE.Mesh(new THREE.SphereGeometry(0.0165, 16, 12), white);
    sc.scale.set(1.25, 0.95, 0.5);
    eo.add(sc);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.0108, 16, 12), iris);
    ir.scale.set(1, 1, 0.45);
    ir.position.z = 0.0055;
    eo.add(ir);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.0056, 10, 8), pupil);
    pu.scale.set(1, 1, 0.4);
    pu.position.z = 0.0085;
    eo.add(pu);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0029, 8, 6), shine);
    hl.position.set(0.004, 0.005, 0.0105);
    eo.add(hl);
    eo.add(
      arc(V3(-0.024, 0.002, 0.004), V3(0, 0.02, 0.008), V3(0.024, 0.004, 0.004), 0.0034, dark),
    );
    open.add(eo);
    // eyebrows
    const b = onHead(V3(sx * 0.42, 0.25, 0.88), 0.001);
    b.scale.setScalar(1.1);
    b.add(arc(V3(-0.021, -0.002, 0), V3(0, 0.005, 0.0015), V3(0.02, -0.001, 0), 0.0024, brow));
    head.add(b);
    // ears and gold hoops
    const ea = onHead(V3(sx, -0.03, -0.05), -0.006);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0021, 6, 24), hoopM);
    hoop.position.set(0, -0.036, 0.004);
    hoop.rotation.y = Math.PI / 2;
    ea.add(hoop);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0072, 8, 18, Math.PI * 1.55), skin);
    rim.rotation.z = sx > 0 ? -2.2 : -0.95;
    rim.scale.set(0.85, 1.2, 1);
    ea.add(rim);
    const inn = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 8), skinL);
    inn.scale.set(0.7, 1.05, 0.35);
    ea.add(inn);
    head.add(ea);
  }
  open.visible = false;
  // hair: curly cap, two textured puffs, saffron madras ties
  const cg = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, 1.58);
  const cp = cg.attributes.position;
  const xAxis = V3(1, 0, 0);
  for (let i = 0; i < cp.count; i++) {
    vv.set(cp.getX(i), cp.getY(i), cp.getZ(i)).applyAxisAngle(xAxis, -0.9);
    const curl =
      (vnoise(vv.x * 16 + 3, vv.y * 16 + vv.z * 11) - 0.5) * 0.07 +
      (fbm(vv.x * 5, vv.z * 5 + vv.y * 3, 2) - 0.5) * 0.05;
    const q = sculpt(vv).multiplyScalar(HEAD_R * (1.055 + curl));
    cp.setXYZ(i, q.x, q.y, q.z);
  }
  cg.computeVertexNormals();
  const cap = new THREE.Mesh(cg, hairM);
  cap.castShadow = true;
  head.add(cap);
  {
    const NE = 90;
    const edge = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 8, 6), hairM, NE);
    const oo = new THREE.Object3D();
    for (let i = 0; i < NE; i++) {
      const ph = (i / NE) * Math.PI * 2;
      const th = 1.55 + kit.rand(-0.04, 0.03);
      vv.set(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).applyAxisAngle(
        xAxis,
        -0.9,
      );
      oo.position.copy(sculpt(vv).multiplyScalar(HEAD_R * 1.04));
      oo.scale.setScalar(kit.rand(0.7, 1.25));
      oo.updateMatrix();
      edge.setMatrixAt(i, oo.matrix);
    }
    head.add(edge);
  }
  const puffs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const pg = new THREE.Group();
    const pos = V3(sx * 0.088, 0.108, -0.045);
    pg.position.copy(pos);
    const ig = new THREE.IcosahedronGeometry(1, 5);
    const ip = ig.attributes.position;
    for (let i = 0; i < ip.count; i++) {
      vv.set(ip.getX(i), ip.getY(i), ip.getZ(i));
      const r =
        1 +
        (fbm(vv.x * 2.5 + sx * 7, vv.y * 2.5 + vv.z * 1.7, 3) - 0.5) * 0.35 +
        (vnoise(vv.x * 11 + vv.z * 7, vv.y * 11) - 0.5) * 0.16;
      vv.multiplyScalar(r);
      ip.setXYZ(i, vv.x, vv.y * 0.92, vv.z);
    }
    ig.computeVertexNormals();
    const pm = new THREE.Mesh(ig, hairM);
    pm.scale.setScalar(0.066);
    pm.castShadow = true;
    pg.add(pm);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0095, 8, 20), madM);
    const dir = pos.clone().normalize();
    tie.position.copy(dir.clone().multiplyScalar(-0.042));
    tie.quaternion.setFromUnitVectors(V3(0, 0, 1), dir);
    pg.add(tie);
    // small madras bow
    const bow = new THREE.Group();
    bow.position.copy(tie.position).add(V3(0, -0.012, -0.026));
    pg.add(bow);
    for (const bx of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), madM);
      l.scale.set(1.25, 0.75, 0.35);
      l.position.set(bx * 0.016, 0, 0);
      l.rotation.z = bx * 0.35;
      bow.add(l);
      const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.035), madM);
      tl.position.set(bx * 0.008, -0.02, 0);
      tl.rotation.z = bx * 0.3;
      bow.add(tl);
    }
    bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), madM));
    head.add(pg);
    puffs.push(pg);
  }
  return { g, pose, inner, body, head, legs, puffs, closed, open, arms };
}

const Y_AXIS = V3(0, 1, 0);
const _m4 = new THREE.Matrix4();
const _e = V3();
const _d = V3();
const _pd = V3();
const _hc = V3();
/** Two-bone arm IK: shoulder S to hand target H, elbow towards `pole`. */
export function solveArm(A: Arm, H: V3, pole: V3, look: V3, up: V3): void {
  _d.subVectors(H, A.S);
  let dist = _d.length();
  const mx = A.L1 + A.L2 - 0.003;
  if (dist > mx) {
    _d.multiplyScalar(mx / dist);
    dist = mx;
  }
  _hc.copy(A.S).add(_d);
  _d.normalize();
  const a = (A.L1 * A.L1 - A.L2 * A.L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, A.L1 * A.L1 - a * a));
  _pd.subVectors(pole, A.S);
  _pd.addScaledVector(_d, -_pd.dot(_d));
  if (_pd.lengthSq() < 1e-8) _pd.set(0, 0, -1);
  _pd.normalize();
  _e.copy(A.S).addScaledVector(_d, a).addScaledVector(_pd, h);
  const qs = A.sh.quaternion.setFromUnitVectors(Y_AXIS, _pd.subVectors(_e, A.S).normalize());
  _pd.subVectors(_hc, _e).normalize();
  const fwd = _pd.clone();
  A.el.quaternion.setFromUnitVectors(Y_AXIS, _pd.applyQuaternion(qs.clone().invert()).normalize());
  A.hand.position.copy(_hc).addScaledVector(fwd, 0.012);
  let target = look;
  if (target.distanceToSquared(A.hand.position) < 1e-8)
    target = A.hand.position.clone().add(V3(0, -1, 0));
  _m4.lookAt(target, A.hand.position, up.clone().normalize());
  A.hand.quaternion.setFromRotationMatrix(_m4);
}
