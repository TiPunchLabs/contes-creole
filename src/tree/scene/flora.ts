import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { Obstacle } from "./critters/wander";
import { groundHeight } from "./ground";
import { FLAMBOYANT } from "./palette";
import {
  bendNormals,
  bezier,
  hash,
  leafSpray,
  lumpyBall,
  tubesGeometry,
  withBark,
  type Tube,
} from "./organic";

const PALMS: readonly (readonly [number, number, number])[] = [
  [-9.5, -10, 6.5],
  [12.2, -5.8, 5.5],
  [-28, 22, 8],
];
const BREADFRUITS: readonly (readonly [number, number, number])[] = [
  [30, 8, 1.15],
  [-28, -5, 1.3],
  [8, 36, 1.2],
  [-14, -34, 1.1],
  [27, -17, 1.25],
];
const FLAMBOYANTS: readonly (readonly [number, number, number])[] = [
  [-25, 7, 1.15],
  [23, -17, 1.05],
  [-6, 31, 1.2],
];
const BANANAS: readonly (readonly [number, number, number])[] = [
  [-12, 4, 2.4],
  [10, 2.5, 2.1],
  [-11.5, 6.5, 1.8],
];
const BALISIERS: readonly (readonly [number, number])[] = [
  [-4, -12.8],
  [-7.2, -9.4],
  [7.6, -10.6],
  [3, 11.5],
  [-9.8, -2],
];
const TREE_FERNS: readonly (readonly [number, number, number])[] = [
  [-4, 13.6, 4.2],
  [3.9, 14.4, 3.6],
  [13.8, -3.5, 4.6],
];

/** Plants the critters walk around (the far palm and the far trees are outside their ring). */
export const FLORA_OBSTACLES: Obstacle[] = [
  [-9.5, -10, 1],
  [12.2, -5.8, 1],
  [-12, 4, 1.4],
  [10, 2.5, 1.4],
  [-11.5, 6.5, 1.3],
  ...BALISIERS.map(([x, z]): Obstacle => [x, z, 0.9]),
  ...TREE_FERNS.map(([x, z]): Obstacle => [x, z, 1]),
];

/**
 * Pinnate frond shared by palms, tree ferns and fern blades: a narrow stalk, a blade widest in its
 * lower half with a pointed tip, a sawtooth edge that reads as leaflets, a folded midrib, and an
 * arch that droops towards the tip with a slight sideways sweep.
 */
function frondGeometry(segments: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.5, 3.2, 2, segments);
  geo.translate(0, 1.6, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 3.2;
    const row = Math.round(y * segments);
    const blade = Math.sin(Math.PI * Math.min(1, Math.max(0, (y - 0.06) / 0.98)) ** 0.75);
    const tooth = row % 2 && row < segments ? 0.68 : 1;
    const x = p.getX(i) * (0.12 + 0.95 * blade) * tooth;
    p.setX(i, x + 0.09 * y * y);
    p.setZ(i, 0.25 * y - 1.65 * y * y - Math.abs(x) * 0.55);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Broad banana / balisier leaf: narrow stalk, oblong blade with a blunt tip, folded down from a raised
 * midrib and arching backwards.
 */
function bananaLeafGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.9, 2.6, 4, 14);
  geo.translate(0, 1.3, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 2.6;
    const blade = Math.sqrt(Math.max(0, 1 - ((y - 0.58) / 0.45) ** 2));
    const x = p.getX(i) * (0.08 + 0.92 * blade ** 0.85);
    const edge = (Math.abs(x) / 0.45) ** 2;
    p.setX(i, x + 0.06 * y * y);
    p.setZ(i, 0.15 * y - y * y * 1.65 - Math.abs(x) * 0.5 + 0.05 * Math.sin(y * 31 + x * 4) * edge);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sober Guadeloupe flora (v14.1): three coconut palms, breadfruits and flamboyants far away, bananas,
 * balisiers and tree ferns near the clearing, fern blades. Adds everything to `group`; every crown sways.
 */
export function createFlora(rng: Rng, group: THREE.Group): { update(time: number): void } {
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const flat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });
  const trunkMat = flat("#9a7458");
  const barkMat = withBark(flat("#9a7458"), 0.13);
  const frondMat = flat("#5f9c46", { side: THREE.DoubleSide });
  const frondGeo = frondGeometry(12);
  const crowns: THREE.Object3D[] = [];

  /** Places a finished plant on the ground with a random heading. */
  const put = (g: THREE.Group, crown: THREE.Object3D, x: number, z: number): void => {
    g.position.set(x, groundHeight(x, z), z);
    g.rotation.y = rng() * 6.28;
    group.add(g);
    crowns.push(crown);
  };

  const palm = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    g.position.set(x, groundHeight(x, z), z);
    const lean = (rng() - 0.5) * 0.3;
    const trunk = new THREE.Mesh(palmTrunkGeometry(h, lean), trunkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = lean;
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.set(Math.sin(-lean) * h * 0.5, Math.cos(lean) * h, 0);
    for (let i = 0; i < 8; i++) {
      const f = new THREE.Mesh(frondGeo, frondMat);
      f.rotation.order = "YXZ";
      f.rotation.y = (i / 8) * Math.PI * 2 + rng() * 0.3;
      f.rotation.x = -(i % 2 ? 1.2 : 0.85) - rng() * 0.3;
      f.scale.setScalar(0.8 + rng() * 0.4);
      crown.add(f);
    }
    g.add(crown);
    g.rotation.y = rng() * 6.28;
    group.add(g);
    crowns.push(crown);
  };

  const breadMat = new THREE.MeshStandardMaterial({ color: "#4c8a3a", roughness: 0.75 });
  const fruitMat = new THREE.MeshStandardMaterial({ color: "#b9d05c", roughness: 0.7 });
  const breadfruit = (x: number, z: number, k: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(breadfruitTrunkGeometry(k, hash(x, z)), barkMat);
    t.position.y = 1.3 * k;
    g.add(t);
    const crown = new THREE.Group();
    crown.position.y = 3.3 * k;
    const centre = new THREE.Vector3(0, 0.1 * k, 0);
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(lumpyBall((1 + rng() * 0.4) * k, 2, x + i), breadMat);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.9 * k, (rng() - 0.3) * 0.6 * k, Math.sin(a) * 0.9 * k);
      p.scale.y = 0.8;
      bendNormals(p, centre, 0.55, 1.3);
      crown.add(p);
    }
    const top = new THREE.Mesh(lumpyBall(1.3 * k, 2, z), breadMat);
    top.position.y = 0.7 * k;
    bendNormals(top, centre, 0.55, 1.3);
    crown.add(top);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.16 * k, 8, 6), fruitMat);
      const a = rng() * 6.28;
      f.position.set(Math.cos(a) * 1.6 * k, -0.5 * k, Math.sin(a) * 1.6 * k);
      crown.add(f);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  const flamMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.85,
    vertexColors: true,
    emissive: "#3a2412",
    emissiveIntensity: 0.2,
  });
  const spray = leafSpray(10, 1.3);
  const flamboyant = (x: number, z: number, k: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(
      tubesGeometry([
        {
          at: bezier(
            new THREE.Vector3(0, -1.2 * k - 0.25, 0),
            new THREE.Vector3(0.05 * k, -0.3 * k, 0),
            new THREE.Vector3(-0.05 * k, 0.5 * k, 0.04 * k),
            new THREE.Vector3(0, 1.05 * k, 0),
          ),
          radius: (s) => k * (0.34 - 0.13 * s) * (1 + 0.45 * Math.exp(-s * 12)),
          rings: 8,
          sides: 10,
          cap: true,
          seed: x,
        },
      ]),
      barkMat,
    );
    t.position.y = 1.2 * k;
    g.add(t);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const position = new THREE.Vector3(Math.cos(a) * 0.55 * k, 3 * k, Math.sin(a) * 0.55 * k);
      const rotation = new THREE.Euler(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      const root = new THREE.Vector3(Math.cos(a) * 0.04 * k, 2.1 * k, Math.sin(a) * 0.04 * k);
      const br = new THREE.Mesh(
        limbGeometry(position, rotation, root, 1.15 * k, 0.16 * k),
        barkMat,
      );
      br.position.copy(position);
      br.rotation.copy(rotation);
      g.add(br);
    }
    const crown = new THREE.Group();
    crown.position.y = 3.9 * k;
    const centre = new THREE.Vector3(0, -0.15 * k, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
      const rr = i ? 1.7 * k : 0;
      const red = rng() < 0.62;
      const at = new THREE.Vector3(Math.cos(a) * rr, rng() * 0.25 * k, Math.sin(a) * rr);
      const squash = new THREE.Vector3(1.25, 0.38, 1.25);
      const p = new THREE.Mesh(
        sprayCluster(spray, at, squash, centre, k, red ? 0.15 : -0.15, x + i),
        flamMat,
      );
      p.position.copy(at);
      p.scale.copy(squash);
      crown.add(p);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  const leafGeo = bananaLeafGeometry();
  const bananaMat = new THREE.MeshStandardMaterial({
    color: "#86b84e",
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshStandardMaterial({ color: "#8da45a", roughness: 1 });
  const banana = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(
      tubesGeometry([
        {
          at: bezier(
            new THREE.Vector3(0, -h / 2 - 0.2, 0),
            new THREE.Vector3(0.03 * h, -h / 6, 0),
            new THREE.Vector3(-0.02 * h, h / 6, 0.02 * h),
            new THREE.Vector3(0, h / 2 - 0.05, 0),
          ),
          radius: (s) => (0.2 - 0.08 * s) * (1 + 0.3 * Math.exp(-s * 10)) * (1 - 0.35 * s ** 6),
          rings: 8,
          sides: 10,
          ridges: 0.04,
          cap: true,
          seed: x,
        },
      ]),
      stemMat,
    );
    t.position.y = h / 2;
    g.add(t);
    const crown = new THREE.Group();
    crown.position.y = h;
    for (let i = 0; i < 7; i++) {
      const l = new THREE.Mesh(leafGeo, bananaMat);
      l.rotation.order = "YXZ";
      l.rotation.y = (i / 7) * Math.PI * 2 + rng() * 0.4;
      l.rotation.x = i ? -0.7 - rng() * 0.5 : -0.15 - rng() * 0.1;
      l.scale.setScalar(0.85 + rng() * 0.3);
      crown.add(l);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  const bractMat = new THREE.MeshStandardMaterial({
    color: "#d8432a",
    roughness: 0.6,
    emissive: "#6a1a0a",
    emissiveIntensity: 0.15,
  });
  const tipMat = new THREE.MeshStandardMaterial({ color: "#f2c84a", roughness: 0.6 });
  const tipLeft = flowerGeometry(-1);
  const tipRight = flowerGeometry(1);
  const bractLeft = bractGeometry(-1);
  const bractRight = bractGeometry(1);
  const balisier = (x: number, z: number): void => {
    const g = new THREE.Group();
    const crown = new THREE.Group();
    g.add(crown);
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(leafGeo, bananaMat);
      l.rotation.order = "YXZ";
      l.rotation.y = (i / 6) * Math.PI * 2 + rng() * 0.5;
      l.rotation.x = -0.32 - rng() * 0.2;
      l.scale.set(0.55, 0.62 + rng() * 0.2, 0.55);
      crown.add(l);
    }
    for (let k = 0; k < 2; k++) {
      const stalk = new THREE.Group();
      const hh = 1.2 + rng() * 0.4;
      stalk.position.set((rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.5);
      const st = new THREE.Mesh(rachisGeometry(hh), stemMat);
      st.position.y = hh / 2;
      stalk.add(st);
      for (let j = 0; j < 4; j++) {
        const side = j % 2 ? 1 : -1;
        const c = new THREE.Mesh(side > 0 ? bractRight : bractLeft, bractMat);
        c.position.set(side * 0.11, hh - 0.1 - j * 0.17, 0);
        c.rotation.z = side * -1.15;
        const tp = new THREE.Mesh(side > 0 ? tipRight : tipLeft, tipMat);
        tp.position.set(side * 0.14, 0.1, 0);
        c.add(tp);
        stalk.add(c);
      }
      crown.add(stalk);
    }
    put(g, crown, x, z);
  };

  const tfernTrunk = flat("#5a4232");
  const tfernMat = flat("#6aa848", { side: THREE.DoubleSide });
  const treeFern = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(
      tubesGeometry([
        {
          at: bezier(
            new THREE.Vector3(0, -h / 2 - 0.2, 0),
            new THREE.Vector3(0.04 * h, -h / 6, 0),
            new THREE.Vector3(-0.03 * h, h / 6, 0.02 * h),
            new THREE.Vector3(0, h / 2, 0),
          ),
          radius: (s) =>
            (0.16 - 0.06 * s) * (1 + 0.3 * Math.exp(-s * 10) + 0.5 * Math.exp((s - 1) * 14)),
          rings: 10,
          sides: 8,
          ridges: 0.1,
          cap: true,
          seed: z,
        },
      ]),
      tfernTrunk,
    );
    t.position.y = h / 2;
    t.rotation.z = (rng() - 0.5) * 0.12;
    g.add(t);
    const crown = new THREE.Group();
    crown.position.y = h;
    for (let i = 0; i < 11; i++) {
      const f = new THREE.Mesh(frondGeo, tfernMat);
      f.rotation.order = "YXZ";
      f.rotation.y = (i / 11) * Math.PI * 2;
      f.rotation.x = -0.7 - rng() * 0.3;
      f.scale.set(0.75, 0.62, 0.75);
      crown.add(f);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  for (const [x, z, h] of PALMS) palm(x, z, h);
  for (const [x, z, k] of BREADFRUITS) breadfruit(x, z, k);
  for (const [x, z, k] of FLAMBOYANTS) flamboyant(x, z, k);
  for (const [x, z, h] of BANANAS) banana(x, z, h);
  for (const [x, z] of BALISIERS) balisier(x, z);
  for (const [x, z, h] of TREE_FERNS) treeFern(x, z, h);

  const bladeGeo = frondGeometry(4);
  bladeGeo.scale(0.45, 0.3, 0.45);
  const fern = new THREE.InstancedMesh(bladeGeo, frondMat, 64 * 7);
  {
    let k = 0;
    const e = new THREE.Euler();
    for (let i = 0; i < 64; i++) {
      const a = rng() * Math.PI * 2;
      const r = i < 22 ? 4 + rng() * 8 : 22 + rng() * 28;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        y = groundHeight(x, z) - 0.04,
        sc = 0.7 + rng() * 0.8;
      for (let j = 0; j < 7; j++) {
        e.set(-0.5 - rng() * 0.6, (j / 7) * Math.PI * 2 + rng() * 0.5, 0, "YXZ");
        m4.compose(
          new THREE.Vector3(x, y, z),
          q.setFromEuler(e),
          s3.set(sc, sc * (0.8 + rng() * 0.5), sc),
        );
        fern.setMatrixAt(k++, m4);
      }
    }
  }
  group.add(fern);

  return {
    update(time) {
      crowns.forEach((crown, i) => {
        crown.rotation.z = Math.sin(time * 0.7 + i) * 0.04;
        crown.rotation.x = Math.cos(time * 0.5 + i * 1.3) * 0.03;
      });
    },
  };
}

/**
 * Coconut palm trunk in its mesh's frame (centred, then tilted by `lean`): leaning harder at the
 * foot and curving back up towards the crown, a swollen bole, soft leaf-scar rings and a bulb where
 * the fronds attach. The foot goes below the ground so slopes never show a gap.
 */
function palmTrunkGeometry(h: number, lean: number): THREE.BufferGeometry {
  const foot = new THREE.Vector3(Math.sin(lean * 0.35), Math.cos(lean * 0.35), 0);
  const head = new THREE.Vector3(Math.sin(lean * 0.6), Math.cos(lean * 0.6), 0);
  const base = new THREE.Vector3(0, -h / 2 - 0.25, 0);
  const top = new THREE.Vector3(0, h / 2, 0);
  return tubesGeometry([
    {
      at: bezier(
        base,
        base.clone().addScaledVector(foot, h * 0.38),
        top.clone().addScaledVector(head, -h * 0.38),
        top,
      ),
      radius: (s) =>
        (0.165 - 0.07 * s) *
        (1 + 0.4 * Math.exp(-s * 14) + 0.35 * Math.exp((s - 1) * 30)) *
        (1 + 0.05 * Math.sin(s * h * 11)),
      rings: 22,
      sides: 8,
      cap: true,
      seed: h,
    },
  ]);
}

/**
 * Breadfruit trunk in its mesh's frame (centred, 2.6k tall) with three limbs forking from its upper
 * third and reaching into the crown, so the crown rests on branches instead of a post.
 */
function breadfruitTrunkGeometry(k: number, seed: number): THREE.BufferGeometry {
  const V = (x: number, y: number, z: number): THREE.Vector3 =>
    new THREE.Vector3(x, y, z).multiplyScalar(k);
  const tubes: Tube[] = [
    {
      at: bezier(
        V(0, -1.3, 0).setY(-1.3 * k - 0.25),
        V(0.06, -0.4, 0),
        V(-0.05, 0.3, 0.05),
        V(0, 0.95, 0),
      ),
      radius: (s) => k * (0.36 - 0.16 * s) * (1 + 0.5 * Math.exp(-s * 12)),
      rings: 8,
      sides: 10,
      cap: true,
      ridges: 0.04,
      seed,
    },
  ];
  for (let i = 0; i < 3; i++) {
    const a = seed * 6.28 + (i / 3) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    tubes.push({
      at: bezier(
        V(c * 0.05, 0.25, sn * 0.05),
        V(c * 0.12, 0.85, sn * 0.12),
        V(c * 0.55, 1.35, sn * 0.55),
        V(c * 0.85, 1.95, sn * 0.85),
      ),
      radius: (s) => k * (0.17 - 0.09 * s),
      rings: 6,
      sides: 7,
      cap: true,
      seed: seed + i,
    });
  }
  return tubesGeometry(tubes);
}

/**
 * A limb in the frame of a mesh placed at `position` / `rotation`: it leaves the trunk at `root`
 * (parent space) going straight up, then bends into the mesh's axis and ends `reach` along it.
 */
function limbGeometry(
  position: THREE.Vector3,
  rotation: THREE.Euler,
  root: THREE.Vector3,
  reach: number,
  radius: number,
): THREE.BufferGeometry {
  const toLocal = new THREE.Matrix4()
    .compose(position, new THREE.Quaternion().setFromEuler(rotation), new THREE.Vector3(1, 1, 1))
    .invert();
  const start = root.clone().applyMatrix4(toLocal);
  const rise = new THREE.Vector3(0, 1, 0).transformDirection(toLocal);
  const end = new THREE.Vector3(0, reach, 0);
  const span = start.distanceTo(end);
  return tubesGeometry([
    {
      at: bezier(
        start,
        start.clone().addScaledVector(rise, span * 0.4),
        end.clone().setY(reach - span * 0.35),
        end,
      ),
      radius: (s) => radius * (1 - 0.5 * s),
      rings: 7,
      sides: 7,
      cap: true,
    },
  ]);
}

/** Balisier rachis in its mesh's frame (centred): a thin stalk that zigzags from bract to bract. */
function rachisGeometry(hh: number): THREE.BufferGeometry {
  return tubesGeometry([
    {
      at: (s, out) => {
        const y = (s - 0.5) * hh;
        const fromTop = hh / 2 - 0.1 - y;
        const zig = fromTop > -0.05 ? -0.025 * Math.cos((Math.PI * fromTop) / 0.17) : 0;
        return out.set(
          zig * Math.min(1, Math.max(0, (0.75 - fromTop) / 0.2)),
          y - (s === 0 ? 0.1 : 0),
          0,
        );
      },
      radius: (s) => 0.042 - 0.012 * s,
      rings: 14,
      sides: 6,
      cap: true,
    },
  ]);
}

/**
 * Heliconia bract in the cone's old frame (axis +y, 0.3 long, centred): a boat flattened across the
 * flower spike, curling upwards — local -x on the right-hand side, +x on the left.
 */
function bractGeometry(side: number): THREE.BufferGeometry {
  return tubesGeometry([
    {
      at: bezier(
        new THREE.Vector3(0, -0.16, 0),
        new THREE.Vector3(0, -0.05, 0),
        new THREE.Vector3(-side * 0.02, 0.06, 0),
        new THREE.Vector3(-side * 0.07, 0.15, 0),
      ),
      radius: (s) => 0.045 * Math.sin(Math.PI * Math.min(1, 0.25 + s * 0.85)) ** 0.7 + 0.004,
      rings: 4,
      sides: 6,
      stretch: 1.7,
      normal0: new THREE.Vector3(1, 0, 0),
      cap: true,
    },
  ]);
}

/**
 * A background flamboyant's crown disc as a cluster of leaf sprays (the Pyébwa's foliage), in the
 * frame of a mesh placed at `at` with the non-uniform scale `s`: sprays are laid out undistorted in
 * crown space, then brought into the mesh frame, normals included. Blossom sits highest; `bias`
 * leans the disc towards blossom (positive) or foliage.
 */
function sprayCluster(
  spray: THREE.BufferGeometry,
  at: THREE.Vector3,
  s: THREE.Vector3,
  centre: THREE.Vector3,
  k: number,
  bias: number,
  seed: number,
): THREE.BufferGeometry {
  const src = spray.attributes.position;
  const srcNormal = spray.attributes.normal;
  const srcShade = spray.attributes.color;
  const srcIndex = spray.index?.array ?? [];
  const count = 14;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const index: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const sub = new THREE.Vector3();
  const facing = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let j = 0; j < count; j++) {
    const u = hash(seed, j, 1) * Math.PI * 2;
    const w = Math.acos(2 * hash(seed, j, 2) - 1);
    const reach = Math.cbrt(hash(seed, j, 3));
    sub.set(
      at.x + reach * Math.sin(w) * Math.cos(u) * 1.35 * k,
      at.y + reach * Math.cos(w) * 0.4 * k,
      at.z + reach * Math.sin(w) * Math.sin(u) * 1.35 * k,
    );
    facing.copy(sub).sub(centre);
    facing.y = facing.y * 2 + 0.8 * k;
    q.setFromUnitVectors(up, facing.normalize());
    q.multiply(twist.setFromAxisAngle(up, hash(seed, j, 4) * Math.PI * 2));
    const size = k * (0.6 + 0.25 * hash(seed, j, 5));
    const height = (sub.y - centre.y + 0.3 * k) / (0.9 * k);
    const bloom = hash(seed, j, 7) < 0.3 + 0.6 * height + bias;
    const pick = (hash(seed, j, 6) * 4) | 0;
    tint.set(bloom ? FLAMBOYANT.blossom[pick] : FLAMBOYANT.leaves[pick]);
    const first = pos.length / 3;
    for (let i = 0; i < src.count; i++) {
      v.fromBufferAttribute(src, i).multiplyScalar(size).applyQuaternion(q).add(sub);
      n.fromBufferAttribute(srcNormal, i).applyQuaternion(q);
      radial.copy(v).sub(centre);
      radial.y *= 2.2;
      n.lerp(radial.normalize(), 0.5).normalize();
      v.sub(at).divide(s);
      n.multiply(s).normalize();
      pos.push(v.x, v.y, v.z);
      nor.push(n.x, n.y, n.z);
      const shade = srcShade.getX(i);
      col.push(tint.r * shade, tint.g * shade, tint.b * shade);
    }
    for (let i = 0; i < srcIndex.length; i++) index.push(first + srcIndex[i]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(index);
  return geo;
}

/**
 * Heliconia flower in its mesh's frame: the mesh sits at the old floating dot (`side` × 0.14, 0.1 in
 * the bract's frame), so the geometry is shifted back to the bract's mouth, where a short, slightly
 * curved yellow tube peeks out of the bract's upper side.
 */
function flowerGeometry(side: number): THREE.BufferGeometry {
  const mouth = new THREE.Vector3(-side * 0.075, 0.1, 0).sub(
    new THREE.Vector3(side * 0.14, 0.1, 0),
  );
  return tubesGeometry([
    {
      at: bezier(
        mouth.clone().add(new THREE.Vector3(side * 0.02, -0.03, 0)),
        mouth.clone().add(new THREE.Vector3(0, 0.02, 0)),
        mouth.clone().add(new THREE.Vector3(-side * 0.03, 0.06, 0)),
        mouth.clone().add(new THREE.Vector3(-side * 0.035, 0.1, 0)),
      ),
      radius: (s) => 0.018 * (1 - 0.3 * s),
      rings: 4,
      sides: 6,
      cap: true,
      startCap: true,
    },
  ]);
}
