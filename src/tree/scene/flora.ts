import * as THREE from "three";
import type { Rng } from "@shared/random";
import type { Obstacle } from "./critters/wander";
import { groundHeight } from "./ground";

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

/** Bent, tapered frond shared by palms, tree ferns and fern blades. */
function frondGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.5, 3.2, 1, 4);
  geo.translate(0, 1.6, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 3.2;
    p.setZ(i, -y * y * 1.4);
    p.setX(i, p.getX(i) * (1 - y * 0.7));
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Broad banana / balisier leaf: narrow stalk, oblong blade with a blunt tip, folded down from a raised
 * midrib and arching backwards.
 */
function bananaLeafGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.9, 2.6, 2, 8);
  geo.translate(0, 1.3, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 2.6;
    const x = p.getX(i) * (0.12 + 0.88 * Math.sqrt(Math.max(0, 1 - ((y - 0.58) / 0.45) ** 2)));
    p.setX(i, x);
    p.setZ(i, -y * y * 1.5 - Math.abs(x) * 0.5);
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
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, ...extra });
  const trunkMat = flat("#9a7458");
  const frondMat = flat("#5f9c46", { side: THREE.DoubleSide });
  const frondGeo = frondGeometry();
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
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 6), trunkMat);
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

  const breadMat = new THREE.MeshStandardMaterial({
    color: "#4c8a3a",
    roughness: 0.75,
    flatShading: true,
  });
  const fruitMat = new THREE.MeshStandardMaterial({ color: "#b9d05c", roughness: 0.7 });
  const breadfruit = (x: number, z: number, k: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.34 * k, 2.6 * k, 6), trunkMat);
    t.position.y = 1.3 * k;
    g.add(t);
    const crown = new THREE.Group();
    crown.position.y = 3.3 * k;
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry((1 + rng() * 0.4) * k, 1), breadMat);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.9 * k, (rng() - 0.3) * 0.6 * k, Math.sin(a) * 0.9 * k);
      p.scale.y = 0.8;
      crown.add(p);
    }
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * k, 1), breadMat);
    top.position.y = 0.7 * k;
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

  const flamGreen = new THREE.MeshStandardMaterial({
    color: "#6a9e46",
    roughness: 0.85,
    flatShading: true,
  });
  const flamRed = new THREE.MeshStandardMaterial({
    color: "#e5582e",
    roughness: 0.8,
    flatShading: true,
    emissive: "#7a2410",
    emissiveIntensity: 0.15,
  });
  const flamboyant = (x: number, z: number, k: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * k, 0.34 * k, 2.4 * k, 6), trunkMat);
    t.position.y = 1.2 * k;
    g.add(t);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const br = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * k, 0.14 * k, 1.9 * k, 5),
        trunkMat,
      );
      br.position.set(Math.cos(a) * 0.55 * k, 3 * k, Math.sin(a) * 0.55 * k);
      br.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      g.add(br);
    }
    const crown = new THREE.Group();
    crown.position.y = 3.9 * k;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
      const rr = i ? 1.7 * k : 0;
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(1.15 * k, 10, 6),
        rng() < 0.62 ? flamRed : flamGreen,
      );
      p.position.set(Math.cos(a) * rr, rng() * 0.25 * k, Math.sin(a) * rr);
      p.scale.set(1.25, 0.38, 1.25);
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
    flatShading: true,
  });
  const stemMat = new THREE.MeshStandardMaterial({ color: "#8da45a", roughness: 1 });
  const banana = (x: number, z: number, h: number): void => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, h, 7), stemMat);
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
  const balisier = (x: number, z: number): void => {
    const g = new THREE.Group();
    const crown = new THREE.Group();
    g.add(crown);
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(leafGeo, bananaMat);
      l.rotation.order = "YXZ";
      l.rotation.y = (i / 6) * Math.PI * 2 + rng() * 0.5;
      l.rotation.x = -0.12 - rng() * 0.2;
      l.scale.set(0.55, 0.62 + rng() * 0.2, 0.55);
      crown.add(l);
    }
    for (let k = 0; k < 2; k++) {
      const stalk = new THREE.Group();
      const hh = 1.2 + rng() * 0.4;
      stalk.position.set((rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.5);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, hh, 4), stemMat);
      st.position.y = hh / 2;
      stalk.add(st);
      for (let j = 0; j < 4; j++) {
        const side = j % 2 ? 1 : -1;
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), bractMat);
        c.position.set(side * 0.11, hh - 0.1 - j * 0.17, 0);
        c.rotation.z = side * -1.15;
        const tp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), tipMat);
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
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, h, 6), tfernTrunk);
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

  const bladeGeo = frondGeo.clone();
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
        y = groundHeight(x, z),
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
