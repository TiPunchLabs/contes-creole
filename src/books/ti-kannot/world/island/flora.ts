// Stylised Guadeloupean plants, each merged into one vertex-coloured geometry (one draw call per
// species once instanced). Sizes are at scale 1; `crown` and `height` feed the placement rules.
import * as THREE from "three";
import { createRng, type Rng } from "@shared/random";
import { soften } from "../soft";
import { faceted, Kit } from "./kit";

/** Height layer: trees shade, shrubs fill under them, low plants carpet the ground. */
export type Stratum = "tree" | "shrub" | "low";

export interface Plant {
  geometry: THREE.BufferGeometry;
  /** Footprint radius of the foliage (world units at scale 1). */
  crown: number;
  /** Height of the lowest foliage, for clearing roofs and paths. */
  base: number;
  height: number;
  stratum: Stratum;
}

export type Flora =
  | "flamboyant"
  | "mango"
  | "breadfruit"
  | "coconut"
  | "papaya"
  | "banana"
  | "balisier"
  | "hibiscus"
  | "fern"
  | "malanga"
  | "tuft";

const BARK = "#8a6446";
const GOLDEN = 2.39996;

/** Soft round mass of foliage. */
const blob = (r: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry =>
  soften(new THREE.IcosahedronGeometry(r, 1).scale(sx, sy, sz));

/** Small round thing (flower, fruit, nut): a fifth of a blob's triangles. */
const bead = (r: number, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry =>
  soften(new THREE.IcosahedronGeometry(r, 0).scale(sx, sy, sz));

/** Tapered trunk segment from the origin up `h`. */
const trunk = (h: number, top: number, bottom: number, sides = 6): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(top, bottom, h, sides).translate(0, h / 2, 0);

/**
 * A leaf blade along +z from the origin: `w` wide, `len` long, folded along its midrib and
 * drooping by `droop` at the tip. Rotate it to raise or turn it.
 */
function blade(
  len: number,
  w: number,
  droop: number,
  segments = 4,
  taper = 0.25,
): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, len, 2, segments)
    .rotateX(-Math.PI / 2)
    .translate(0, 0, len / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const t = p.getZ(i) / len;
    const narrow =
      1 -
      ((1 - taper) * Math.max(0, t - 0.55)) / 0.45 -
      ((1 - taper) * Math.max(0, 0.15 - t)) / 0.15;
    const x = p.getX(i) * narrow;
    p.setX(i, x);
    p.setY(i, Math.abs(x) * 0.35 - droop * t * t);
  }
  g.computeVertexNormals();
  return g;
}

/** Fronds or leaves fanned around the top of a stem. */
function rosette(
  kit: Kit,
  rng: Rng,
  count: number,
  y: number,
  make: (i: number) => THREE.BufferGeometry,
  color: (i: number) => string,
  rise: [number, number],
): void {
  for (let i = 0; i < count; i++) {
    const tilt = -(rise[0] + rng() * (rise[1] - rise[0]));
    kit.add(make(i), color(i), [0, y, 0], [0, i * GOLDEN + rng() * 0.3, 0]);
    const last = kit.parts[kit.parts.length - 1];
    last.translate(0, -y, 0);
    last.applyMatrix4(new THREE.Matrix4().makeRotationAxis(axisAt(i * GOLDEN), tilt));
    last.translate(0, y, 0);
  }
}

/** Horizontal axis perpendicular to azimuth `a` (to lift a leaf pointing along `a`). */
const axisAt = (a: number): THREE.Vector3 => new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));

/**
 * A foliage mass with an uneven outline: a welded blob scaled by (sx, sy, sz) whose vertices are
 * pushed in or out by up to `rough` / 2, so crowns never read as smooth discs or domes.
 */
function lump(
  rng: Rng,
  r: number,
  sx: number,
  sy: number,
  sz: number,
  rough = 0.28,
): THREE.BufferGeometry {
  const g = soften(new THREE.IcosahedronGeometry(r, 1));
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (rng() - 0.5) * rough;
    p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz);
  }
  g.computeVertexNormals();
  return g;
}

/** A limb from (0, y0, 0) out to (x, y, z), as a tapered branch. */
function limb(kit: Kit, y0: number, [x, y, z]: number[], base: number, color = BARK): void {
  const from = new THREE.Vector3(0, y0, 0);
  const to = new THREE.Vector3(x, y, z);
  const dir = to.clone().sub(from);
  const g = trunk(dir.length(), base * 0.45, base, 5);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  kit.add(g, color, from.toArray());
}

/** Crown masses: [x, y, z, radius, flatten, colour]. */
type Mass = [number, number, number, number, number, string];

/** Adds crown masses, each turned at random so no two share an outline. */
function crown(kit: Kit, rng: Rng, masses: Mass[], spread = 1.15): void {
  for (const [x, y, z, r, flat, color] of masses) {
    kit.add(lump(rng, r, spread, flat, spread), color, [x, y, z], [0, rng() * 6.28, 0]);
  }
}

/** Points on a ring of radius `r` at height `y`, starting at angle `a0`, with jitter. */
const ring = (rng: Rng, n: number, r: number, y: number, a0: number, dy = 0.3): number[][] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const rr = r * (0.85 + rng() * 0.3);
    return [Math.cos(a) * rr, y + (rng() - 0.5) * dy, Math.sin(a) * rr];
  });

/** Ti Kannot's perch on the flamboyant's crown, in the tree's own frame (x, top, z). */
const FLAMBOYANT_PERCH = [0.215, 3.19, 0.535] as const;

/**
 * Ti Kannot's tree: a short trunk splitting into wide, nearly level limbs under an umbrella of
 * uneven green masses, the edges drooping, flame-red blossom in clusters over them.
 */
function flamboyant(): Plant {
  const kit = new Kit();
  const rng = createRng(31);
  kit.add(trunk(1.45, 0.19, 0.3), BARK);
  const outer = ring(rng, 7, 1.65, 2.2, 0.3, 0.35);
  for (const [x, y, z] of ring(rng, 5, 1.35, 2.05, 0.9, 0.2)) limb(kit, 1.3, [x, y, z], 0.13);
  const masses: Mass[] = [];
  outer.forEach(([x, y, z], i) => {
    masses.push([x, y, z, 0.62 + rng() * 0.18, 0.42, i % 3 ? "#5c9b53" : "#4f8f4b"]);
  });
  for (const [x, y, z] of ring(rng, 3, 0.8, 2.55, 1.4, 0.2)) {
    masses.push([x, y, z, 0.7, 0.42, "#64a45a"]);
  }
  const [px, top, pz] = FLAMBOYANT_PERCH;
  masses.push([px, top - 0.4, pz, 0.72, 0.4, "#64a45a"]);
  crown(kit, rng, masses, 1.25);
  // Blossom: clusters riding on most masses and a wide one under the perch, never a lid.
  const bloom: Mass[] = masses
    .filter(() => rng() < 0.7)
    .map(([x, y, z, r]) => [
      x * 1.02,
      y + r * 0.3,
      z * 1.02,
      r * (0.58 + rng() * 0.2),
      0.45,
      rng() < 0.3 ? "#ee7a42" : "#e5543a",
    ]);
  bloom.push([px, top - 0.28, pz, 0.6, 0.42, "#e5543a"]);
  // Small clusters on the outer side of the edge masses, set into the foliage so none floats.
  for (const [x, y, z, r] of masses.slice(0, 7)) {
    bloom.push([x * 1.18, y + r * 0.12, z * 1.18, 0.3, 0.55, "#e85a38"]);
  }
  crown(kit, rng, bloom, 1.2);
  return { geometry: kit.build(), crown: 2.3, base: 1.75, height: 3.2, stratum: "tree" };
}

/**
 * Mango tree: short trunk and stout limbs under a broad, uneven dome; dark masses below, lighter
 * ones on top and an off-centre crest so the crown never reads as a ball.
 */
function mango(): Plant {
  const kit = new Kit();
  const rng = createRng(37);
  kit.add(trunk(1.5, 0.18, 0.32), BARK);
  const low = ring(rng, 5, 1.25, 2.45, 0.2, 0.4);
  for (const [x, y, z] of low) limb(kit, 1.2, [x * 0.8, y - 0.2, z * 0.8], 0.12);
  const masses: Mass[] = low.map(([x, y, z], i) => [
    x,
    y,
    z,
    0.78 + rng() * 0.2,
    0.72,
    i % 2 ? "#3f854b" : "#468c50",
  ]);
  for (const [x, y, z] of ring(rng, 3, 0.75, 3.25, 1.1, 0.3))
    masses.push([x, y, z, 0.82, 0.78, "#4f9a57"]);
  masses.push([0.35, 3.95, -0.2, 0.7, 0.8, "#62ab62"]);
  masses.push([-0.45, 3.75, 0.3, 0.55, 0.85, "#5aa45d"]);
  crown(kit, rng, masses);
  return { geometry: kit.build(), crown: 2.2, base: 1.8, height: 4.5, stratum: "tree" };
}

/**
 * Breadfruit tree: straight pale trunk with short limbs in tiers, an open, tall crown of separate
 * yellow-green masses with sky between them, round green fruit.
 */
function breadfruit(): Plant {
  const kit = new Kit();
  const rng = createRng(41);
  kit.add(trunk(3.6, 0.1, 0.22), "#9b8a74");
  const masses: Mass[] = [];
  [
    [2.6, 1.15, 4, 0.0],
    [3.35, 0.95, 3, 0.7],
    [4.05, 0.6, 2, 1.6],
  ].forEach(([y, r, n, a0], tier) => {
    for (const [x, my, z] of ring(rng, n, r, y, a0, 0.25)) {
      limb(kit, y - 0.45, [x * 0.85, my - 0.1, z * 0.85], 0.07, "#9b8a74");
      masses.push([x, my, z, 0.55 - tier * 0.05 + rng() * 0.12, 0.8, tier ? "#80ba5f" : "#6aa952"]);
    }
  });
  masses.push([0.1, 4.6, 0, 0.45, 0.9, "#8cc366"]);
  crown(kit, rng, masses, 1.1);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.7 + 0.3;
    kit.add(bead(0.17, 1, 1.1, 1), "#c3d466", [
      Math.cos(a) * 1.2,
      2.5 + rng() * 1.2,
      Math.sin(a) * 1.2,
    ]);
  }
  return { geometry: kit.build(), crown: 1.75, base: 2.2, height: 5, stratum: "tree" };
}

/** Coconut palm: slender leaning ringed trunk, arching fronds, a few nuts. */
function coconut(): Plant {
  const kit = new Kit();
  const rng = createRng(43);
  const top = new THREE.Vector3();
  let lean = 0;
  for (let i = 0; i < 5; i++) {
    const seg = trunk(1.05, 0.11 - i * 0.008, 0.14 - i * 0.008, 6);
    kit.add(seg, i % 2 ? "#a08668" : "#8f7759", [top.x, top.y, top.z], [0, 0, -lean]);
    top.add(new THREE.Vector3(Math.sin(lean) * 1.0, Math.cos(lean) * 1.0, 0));
    lean += 0.07;
  }
  const crown = kit.parts.length;
  rosette(
    kit,
    rng,
    10,
    0,
    () => blade(2, 0.5, 1.1, 5, 0.15),
    (i) => (i % 3 ? "#6fb35b" : "#5c9e4c"),
    [-0.45, 0.1],
  );
  for (const part of kit.parts.slice(crown)) part.translate(top.x, top.y, top.z);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    kit.add(bead(0.16), "#7b8f3c", [
      top.x + Math.cos(a) * 0.17,
      top.y - 0.15,
      top.z + Math.sin(a) * 0.17,
    ]);
  }
  return { geometry: kit.build(), crown: 1.9, base: 4.4, height: 5.2, stratum: "tree" };
}

/** Papaya: thin bare stem, umbrella of long-stalked lobed leaves, fruit under the crown. */
function papaya(): Plant {
  const kit = new Kit();
  const rng = createRng(47);
  kit.add(trunk(2.5, 0.07, 0.11, 6), "#a7a083");
  const y = 2.5;
  for (let i = 0; i < 8; i++) {
    const a = i * GOLDEN;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    kit.add(
      trunk(0.75, 0.015, 0.02, 3),
      "#b8c46a",
      [0, y - 0.05, 0],
      [out.z * 0.95, 0, -out.x * 0.95],
    );
    const leaf = soften(new THREE.DodecahedronGeometry(0.55, 0)).scale(1, 0.1, 1);
    kit.add(
      leaf,
      i % 2 ? "#6fb058" : "#5e9f4c",
      [out.x * 0.7, y + 0.35 - rng() * 0.15, out.z * 0.7],
      [0.3 * out.z, a, -0.3 * out.x],
    );
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    kit.add(bead(0.11, 1, 1.5, 1), i < 2 ? "#e0a93c" : "#9fb84a", [
      Math.cos(a) * 0.13,
      y - 0.25 - (i % 3) * 0.12,
      Math.sin(a) * 0.13,
    ]);
  }
  return { geometry: kit.build(), crown: 1, base: 2.2, height: 3, stratum: "shrub" };
}

/** Banana plant: green pseudo-stems, long paddle leaves arching out, one hanging bunch. */
function banana(): Plant {
  const kit = new Kit();
  const rng = createRng(53);
  kit.add(trunk(1.6, 0.1, 0.16, 6), "#8faa5c");
  kit.add(trunk(1, 0.07, 0.11, 5), "#9bb565", [0.4, 0, 0.15], [0, 0, -0.08]);
  rosette(
    kit,
    rng,
    7,
    1.5,
    () => blade(1.45, 0.45, 0.55, 5, 0.55),
    (i) => (i % 3 ? "#8fcf6c" : "#a6d77a"),
    [0.75, 1.2],
  );
  kit.add(bead(0.13, 1, 1.6, 1), "#7a3a4a", [0.2, 1.05, 0.05]);
  kit.add(blob(0.2, 1, 1.3, 1), "#86a447", [0.17, 1.3, 0.05]);
  return { geometry: kit.build(), crown: 1.1, base: 1.2, height: 2.7, stratum: "shrub" };
}

/** Balisier (heliconia): upright paddle leaves and zigzag spikes of red and yellow bracts. */
function balisier(): Plant {
  const kit = new Kit();
  const rng = createRng(59);
  for (let i = 0; i < 6; i++) {
    const a = i * GOLDEN;
    const h = 0.7 + rng() * 0.4;
    kit.add(trunk(h, 0.015, 0.02, 3), "#5f8f45", [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12]);
    kit.add(
      blade(0.95, 0.3, 0.15, 3, 0.3),
      i % 2 ? "#4f9a4a" : "#62a852",
      [Math.cos(a) * 0.14, h - 0.05, Math.sin(a) * 0.14],
      [-1.15, Math.PI / 2 - a, 0],
    );
  }
  for (const [x, z, h] of [
    [0.05, 0.1, 1.05],
    [-0.15, -0.05, 0.85],
  ]) {
    for (let k = 0; k < 4; k++) {
      const side = k % 2 ? 1 : -1;
      const bract = new THREE.ConeGeometry(0.07, 0.3, 4).rotateZ(side * 1.1);
      kit.add(bract, k === 3 ? "#f2c14a" : "#e2483a", [x + side * 0.09, h + k * 0.11, z]);
    }
  }
  return { geometry: kit.build(), crown: 0.55, base: 0.3, height: 1.4, stratum: "low" };
}

/** Hibiscus bush: rounded dark green masses dotted with red flowers. */
function hibiscus(): Plant {
  const kit = new Kit();
  const rng = createRng(61);
  const dir = new THREE.Vector3();
  for (let i = 0; i < 4; i++) {
    const a = i * GOLDEN;
    const r = 0.42 + rng() * 0.12;
    const c = new THREE.Vector3(Math.cos(a) * 0.3, 0.45 + rng() * 0.3, Math.sin(a) * 0.3);
    kit.add(blob(r, 1.1, 0.75, 1), i % 2 ? "#4f9a56" : "#5ca562", c.toArray());
    for (let k = 0; k < 3; k++) {
      dir.set(rng() - 0.5, 0.3 + rng() * 0.7, rng() - 0.5).normalize();
      const at = c.clone().add(dir.set(dir.x * r, dir.y * r * 0.85, dir.z * r));
      kit.add(bead(0.07, 1, 0.5, 1), k ? "#e5383b" : "#f07c8a", at.toArray());
    }
  }
  return { geometry: kit.build(), crown: 0.75, base: 0.1, height: 1.2, stratum: "low" };
}

/** Ground fern of the banks: arching fronds from a tight heart. */
function fern(): Plant {
  const kit = new Kit();
  const rng = createRng(67);
  rosette(
    kit,
    rng,
    9,
    0.05,
    () => blade(0.85, 0.2, 0.45, 4, 0.1),
    (i) => (i % 2 ? "#5f9f4f" : "#73b05c"),
    [0.55, 1.05],
  );
  return { geometry: kit.build(), crown: 0.7, base: 0, height: 0.6, stratum: "low" };
}

/** Malanga (taro): big heart-shaped leaves held up on long stalks. */
function malanga(): Plant {
  const kit = new Kit();
  const rng = createRng(71);
  for (let i = 0; i < 5; i++) {
    const a = i * GOLDEN;
    const h = 0.55 + rng() * 0.35;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.22);
    kit.add(trunk(h, 0.015, 0.025, 3), "#7fa860", [0, 0, 0], [out.z, 0, -out.x]);
    const leaf = soften(new THREE.IcosahedronGeometry(0.34, 1))
      .scale(1, 0.08, 1.25)
      .translate(0, 0, 0.2);
    kit.add(
      leaf,
      i % 2 ? "#4d8f45" : "#5a9c4e",
      [out.x * h * 1.5, h, out.z * h * 1.5],
      [0.45, Math.PI / 2 - a, 0],
    );
  }
  return { geometry: kit.build(), crown: 0.65, base: 0.4, height: 1, stratum: "low" };
}

/** Tuft of grass blades. */
function tuft(): Plant {
  const kit = new Kit();
  for (let i = 0; i < 5; i++) {
    const a = i * GOLDEN;
    const blade = new THREE.ConeGeometry(0.035, 0.35 + (i % 3) * 0.08, 3).translate(0, 0.18, 0);
    kit.add(
      blade,
      i % 2 ? "#9ad276" : "#b0dc86",
      [Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06],
      [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35],
    );
  }
  return { geometry: kit.build(), crown: 0.12, base: 0, height: 0.4, stratum: "low" };
}

export const FLORA: Record<Flora, () => Plant> = {
  flamboyant,
  mango,
  breadfruit,
  coconut,
  papaya,
  banana,
  balisier,
  hibiscus,
  fern,
  malanga,
  tuft,
};

/** River and path stones: a flat slab, a rounded boulder and a tall block. */
export const STONES: (() => THREE.BufferGeometry)[] = [
  () => faceted(new THREE.DodecahedronGeometry(0.5, 0).scale(1.4, 0.45, 1)),
  () => soften(new THREE.IcosahedronGeometry(0.5, 0).scale(1.1, 0.75, 0.95)),
  () => faceted(new THREE.DodecahedronGeometry(0.5, 0).scale(0.8, 1.15, 0.9)),
];
