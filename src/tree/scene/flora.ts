import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { Obstacle } from "./critters/wander";
import { groundHeight, groundMeshHeight } from "./ground";
import { KONTEUR_OBSTACLES } from "./konteur";
import {
  cardMaterial,
  cardsGeometry,
  flamboyantCrown,
  foliageAtlas,
  contactShadowTexture,
  shellCards,
  SWAY_TIME,
  TILE,
  type Card,
  withGlow,
  withHaze,
  withLeafSurface,
  withSway,
  type Anchor,
} from "./foliage";
import { broadLeaf, pinnateFrond } from "./leaves";
import {
  bendNormals,
  bezier,
  hash,
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
 * Double-sided leaf material: per-vertex shade, tips swaying freer than stems, paler undersides
 * (with painted veins for broad leaves), light through the leaves and distance haze.
 */
function leafMaterial(color: string, sway: number, veins: boolean): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  withSway(material, sway);
  withLeafSurface(material, veins);
  withGlow(material, 0.22);
  return withHaze(material);
}

/**
 * Sober Guadeloupe flora (v14.1): three coconut palms, breadfruits and flamboyants far away, bananas,
 * balisiers and tree ferns near the clearing, fern blades. Adds everything to `group`; every crown sways.
 */
export function createFlora(
  rng: Rng,
  group: THREE.Group,
  lite: boolean,
): { update(time: number): void } {
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const flat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });
  const trunkMat = withHaze(flat("#9a7458"));
  const barkMat = withHaze(withBark(flat("#9a7458"), 0.13));
  const frondMat = leafMaterial("#5f9c46", 0.22, false);
  const palmFronds = [0, 1, 2].map((i) =>
    pinnateFrond({
      length: 3.2,
      pairs: 26,
      leaflet: 0.3 - 0.03 * i,
      width: 0.12,
      arch: 1.45 + 0.2 * i,
      sweep: 0.12 * (i - 1),
      fold: 0.35 + 0.1 * i,
      angle: 0.95,
      segments: 3,
      gaps: i === 1 ? 0.1 : 0.03,
      seed: i + 1,
    }),
  );
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
      const f = new THREE.Mesh(palmFronds[Math.floor(hash(x, i) * 3)], frondMat);
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

  const atlas = foliageAtlas(lite ? 256 : 512);
  const breadMat = withHaze(new THREE.MeshStandardMaterial({ color: "#2f5f28", roughness: 0.9 }));
  const breadLeafMat = cardMaterial(atlas, { sway: 0.05 });
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
      const p = new THREE.Mesh(lumpyBall((1 + rng() * 0.4) * k * 0.78, 2, x + i), breadMat);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.9 * k, (rng() - 0.3) * 0.6 * k, Math.sin(a) * 0.9 * k);
      p.scale.y = 0.8;
      bendNormals(p, centre, 0.55, 1.3);
      crown.add(p);
    }
    const top = new THREE.Mesh(lumpyBall(1.3 * k * 0.78, 2, z), breadMat);
    top.position.y = 0.7 * k;
    bendNormals(top, centre, 0.55, 1.3);
    crown.add(top);
    const lumps = crown.children.map((m) => ({
      at: m.position.clone(),
      r: (m === top ? 1.3 : 1.15) * k,
    }));
    crown.add(
      new THREE.Mesh(
        cardsGeometry(shellCards(lumps, centre, TILE.breadfruit, 1.1 * k, lite ? 26 : 44, x + z), {
          centre,
          amount: 0.45,
          squash: 1.3,
        }),
        breadLeafMat,
      ),
    );
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.16 * k, 8, 6), fruitMat);
      const a = rng() * 6.28;
      f.position.set(Math.cos(a) * 1.6 * k, -0.5 * k, Math.sin(a) * 1.6 * k);
      crown.add(f);
    }
    g.add(crown);
    put(g, crown, x, z);
  };

  const flamMat = cardMaterial(atlas, { sway: 0.05 });
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
    const discs: { at: THREE.Vector3; squash: THREE.Vector3 }[] = [];
    const anchors: Anchor[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
      const rr = i ? 1.7 * k : 0;
      rng();
      const at = new THREE.Vector3(Math.cos(a) * rr, rng() * 0.25 * k, Math.sin(a) * rr);
      discs.push({ at, squash: new THREE.Vector3(1.25, 0.38, 1.25) });
      for (let j = 0; j < 3; j++) {
        const u = hash(x, i, j) * Math.PI * 2;
        const spread = j ? 0.8 * k * hash(z, i, j) : 0;
        anchors.push({
          at: at
            .clone()
            .add(new THREE.Vector3(Math.cos(u) * spread, 0.15 * k * j, Math.sin(u) * spread)),
          r: 0.75 * k,
        });
      }
    }
    const cards = flamboyantCrown({
      anchors,
      centre,
      radius: 2.9 * k,
      low: -0.1 * k,
      high: 0.6 * k,
      per: lite ? 6 : 9,
      size: 1.2 * k,
      lobes: 3,
      clusters: 3,
      spread: [1, 0.6],
      openings: [0.15, 0.04],
      seed: x + z,
    });
    const nearest = (p: THREE.Vector3): number => {
      let best = 0;
      discs.forEach((d, i) => {
        if (d.at.distanceToSquared(p) < discs[best].at.distanceToSquared(p)) best = i;
      });
      return best;
    };
    const field = { centre, amount: 0.5, squash: 2.2 };
    discs.forEach((disc, i) => {
      const frame = new THREE.Matrix4()
        .compose(disc.at, new THREE.Quaternion(), disc.squash)
        .invert();
      const own = cards.filter((c) => nearest(c.at) === i);
      const p = new THREE.Mesh(cardsGeometry(own, field, frame), flamMat);
      p.position.copy(disc.at);
      p.scale.copy(disc.squash);
      crown.add(p);
    });
    g.add(crown);
    put(g, crown, x, z);
  };

  const bananaLeaves = [3, 5, 1].map((tears, i) =>
    broadLeaf({ length: 2.6, width: 0.9, arch: 1.5 + 0.15 * i, fold: 0.5, tears, seed: i + 4 }),
  );
  const heliconiaLeaves = [0, 1].map((tears, i) =>
    broadLeaf({ length: 2.6, width: 0.62, arch: 1.0 + 0.2 * i, fold: 0.35, tears, seed: i + 9 }),
  );
  const bananaMat = leafMaterial("#86b84e", 0.18, true);
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
      const l = new THREE.Mesh(bananaLeaves[Math.floor(hash(x, z, i) * 3)], bananaMat);
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
      const l = new THREE.Mesh(heliconiaLeaves[Math.floor(hash(x, z, i) * 2)], bananaMat);
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
  const tfernMat = leafMaterial("#6aa848", 0.16, false);
  const tfernFronds = [0, 1].map((i) =>
    pinnateFrond({
      length: 3.2,
      pairs: 30,
      leaflet: 0.17,
      width: 0.28,
      arch: 1.2 + 0.25 * i,
      sweep: 0.1 * (i ? 1 : -1),
      fold: 0.12,
      angle: 1.25,
      segments: 2,
      gaps: 0.02,
      seed: i + 20,
    }),
  );
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
      const f = new THREE.Mesh(tfernFronds[i % 2], tfernMat);
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

  const bladeGeo = pinnateFrond({
    length: 3.2,
    pairs: 9,
    leaflet: 0.22,
    width: 0.5,
    arch: 1.65,
    sweep: 0.05,
    fold: 0.15,
    angle: 1.1,
    segments: 1,
    gaps: 0,
    seed: 30,
  });
  bladeGeo.scale(0.45, 0.3, 0.45);
  const fern = new THREE.InstancedMesh(bladeGeo, frondMat, 64 * 7);
  const clumps: [number, number, number][] = [];
  {
    let k = 0;
    const e = new THREE.Euler();
    for (let i = 0; i < 64; i++) {
      const a = rng() * Math.PI * 2;
      const r = i < 22 ? 4 + rng() * 8 : 22 + rng() * 28;
      const [x, z] =
        i < 22 ? gather(Math.cos(a) * r, Math.sin(a) * r) : [Math.cos(a) * r, Math.sin(a) * r];
      const y = groundHeight(x, z) - 0.04,
        sc = 0.7 + rng() * 0.8;
      if (i < 22) clumps.push([x, z, sc]);
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
  group.add(groundCover(clumps, lite), contactShadows(clumps));

  return {
    update(time) {
      SWAY_TIME.value = time;
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

/** Where low plants gather: between the Pyébwa's roots and in a ring at the clearing's edge. */
const ROOT_GROUPS = [0.4, 1.7, 2.9, 4.1, 5.3].map((a, i): [number, number] => [
  Math.cos(a) * (2.7 + 0.5 * (i % 2)),
  Math.sin(a) * (2.7 + 0.5 * (i % 2)),
]);
const EDGE_GROUPS = [0.2, 1.05, 1.9, 2.6, 3.5, 4.4, 5.5].map((a, i): [number, number] => [
  Math.cos(a) * (9.5 + 1.5 * (i % 3)),
  Math.sin(a) * (9.5 + 1.5 * (i % 3)),
]);

/**
 * Pulls a near fern clump into the nearest group (roots or the clearing's edge), keeping some of
 * its own offset so groups stay uneven, and pushes it out of the Konteur's open ground.
 */
function gather(x: number, z: number): [number, number] {
  const groups = Math.hypot(x, z) < 7 ? ROOT_GROUPS : EDGE_GROUPS;
  let best = groups[0];
  for (const g of groups) {
    if (Math.hypot(g[0] - x, g[1] - z) < Math.hypot(best[0] - x, best[1] - z)) best = g;
  }
  let gx = best[0] + (x - best[0]) * 0.3;
  let gz = best[1] + (z - best[1]) * 0.3;
  for (const [kx, kz, kr] of KONTEUR_OBSTACLES) {
    const d = Math.hypot(gx - kx, gz - kz);
    const clear = kr + 0.9;
    if (d < clear) {
      const dx = d > 1e-3 ? (gx - kx) / d : 1;
      const dz = d > 1e-3 ? (gz - kz) / d : 0;
      gx = kx + dx * clear;
      gz = kz + dz * clear;
    }
  }
  return [gx, gz];
}

/**
 * Painted ground tufts (grass blades, small leaves, tiny pale flowers) in uneven groups: around the
 * Pyébwa's roots and at the feet of the near fern clumps, as crossed upright cards.
 */
function groundCover(clumps: readonly [number, number, number][], lite: boolean): THREE.Mesh {
  const cards: Card[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const seeds: [number, number, number][] = [
    ...ROOT_GROUPS.map(([x, z]): [number, number, number] => [x, z, 1.3]),
    ...clumps.map(([x, z, sc]): [number, number, number] => [x, z, 0.6 + 0.5 * sc]),
  ];
  seeds.forEach(([cx, cz, spread], i) => {
    const count = lite ? 3 : 5;
    for (let k = 0; k < count; k++) {
      const a = hash(i, k, 41) * Math.PI * 2;
      const r = spread * Math.sqrt(hash(i, k, 42));
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const size = 0.45 + 0.35 * hash(i, k, 43);
      const light = 0.85 + 0.25 * hash(i, k, 44);
      for (let c = 0; c < 2; c++) {
        const turn = hash(i, k, 45) * Math.PI + (c * Math.PI) / 2;
        cards.push({
          at: new THREE.Vector3(x, groundHeight(x, z) - 0.06, z),
          dir: up.clone(),
          normal: new THREE.Vector3(Math.cos(turn), 0, Math.sin(turn)),
          size,
          aspect: 1.2,
          tile: TILE.tuft,
          shade: new THREE.Color(light, light, light * 0.92),
          droop: 0.05,
        });
      }
    }
  });
  const material = cardMaterial(foliageAtlas(lite ? 256 : 512), { sway: 0.06, glow: 0.15 });
  return new THREE.Mesh(
    cardsGeometry(cards, { centre: new THREE.Vector3(0, -60, 0), amount: 0.75, squash: 1 }),
    material,
  );
}

/**
 * Soft contact shadows where plants meet the ground: one multiplied disc per plant and fern clump,
 * so trunks and stems sit in the grass instead of standing on it. Each disc is a polar mesh whose
 * vertices follow the rendered ground (`groundMeshHeight`), so slopes never cut into it.
 */
function contactShadows(clumps: readonly [number, number, number][]): THREE.Mesh {
  const spots: [number, number, number][] = [
    ...PALMS.map(([x, z]): [number, number, number] => [x, z, 1.6]),
    ...BREADFRUITS.map(([x, z, k]): [number, number, number] => [x, z, 3.2 * k]),
    ...FLAMBOYANTS.map(([x, z, k]): [number, number, number] => [x, z, 3.4 * k]),
    ...BANANAS.map(([x, z]): [number, number, number] => [x, z, 1.8]),
    ...BALISIERS.map(([x, z]): [number, number, number] => [x, z, 1.4]),
    ...TREE_FERNS.map(([x, z]): [number, number, number] => [x, z, 1.6]),
    ...clumps.map(([x, z, sc]): [number, number, number] => [x, z, 1.1 * sc]),
    [0, 0, 7.5],
  ];
  const rings = 4;
  const sides = 16;
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (const [cx, cz, size] of spots) {
    const first = pos.length / 3;
    const radius = size / 2;
    pos.push(cx, groundMeshHeight(cx, cz) + 0.02, cz);
    uv.push(0.5, 0.5);
    for (let r = 1; r <= rings; r++) {
      const reach = r / rings;
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const x = cx + Math.cos(a) * radius * reach;
        const z = cz + Math.sin(a) * radius * reach;
        pos.push(x, groundMeshHeight(x, z) + 0.02, z);
        uv.push(0.5 + 0.5 * Math.cos(a) * reach, 0.5 + 0.5 * Math.sin(a) * reach);
      }
    }
    for (let k = 0; k < sides; k++) index.push(first, first + 1 + ((k + 1) % sides), first + 1 + k);
    for (let r = 1; r < rings; r++) {
      const inner = first + 1 + (r - 1) * sides;
      const outer = inner + sides;
      for (let k = 0; k < sides; k++) {
        const k1 = (k + 1) % sides;
        index.push(inner + k, inner + k1, outer + k, inner + k1, outer + k1, outer + k);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  mesh.renderOrder = -1;
  return mesh;
}
