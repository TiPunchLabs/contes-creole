import * as THREE from "three";
import type { Rng } from "@shared/random";
import { softSprite } from "@shared/three/soft-sprite";
import { hash } from "./organic";
import { SKYLINE } from "./palette";

/**
 * Distant landscape behind the clearing: three continuous ridge bands around the whole horizon
 * instead of faceted half-spheres. The nearest ridge is muted green and earth, the middle one muted
 * mauve, the farthest takes the warm sky and carries a stylized La Soufrière (uneven dome with a
 * summit notch, a plateau shoulder, L'Échelle and La Citerne's flat crater on one side, a long ridge
 * falling towards Carmichaël on the other), with a thin cloud bank in its saddle. Each band carries
 * its own haze, thick in the valleys and thin on the crest, so overlapping ridges separate.
 */

/** Bearing of La Soufrière from the tree (radians, x = cos, z = sin): beside the canopy mid-climb. */
export const SOUFRIERE_BEARING = (212 / 180) * Math.PI;

/** Bearing behind the intro column and the sun at the opening view (about 112° to 140°). */
const INTRO_BEARING = (126 / 180) * Math.PI;

interface Peak {
  /** Bearing (radians). */
  a: number;
  /** Height above the band's foot. */
  h: number;
  /** Half-width along the ridge (metres of arc). */
  w: number;
}

interface Band {
  radius: number;
  /** How far in front of the crest the band's foot reaches. */
  depth: number;
  base: number;
  peaks: Peak[];
  /** Extra profile (metres) added at a bearing, e.g. the massif. */
  extra?: (a: number, radius: number) => number;
  colour: { foot: string; crest: string; slope: string };
  haze: { colour: string; foot: number; crest: number };
  /** Amplitude of the folds (spurs and gullies) down the slopes. */
  folds: number;
  seed: number;
}

/** Signed shortest angle from `b` to `a`. */
function delta(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Smooth maximum: joins peaks with saddles instead of creases. */
function smoothMax(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return a * (1 - h) + b * h + k * h * (1 - h);
}

/** Crest height of `band` at bearing `a`. */
function crest(band: Band, a: number): number {
  const r = band.radius;
  let h =
    band.base +
    1.6 * Math.sin(a * 3 + band.seed) +
    1.1 * Math.sin(a * 7 + band.seed * 1.7) +
    0.5 * Math.sin(a * 17 + band.seed * 0.3);
  for (const p of band.peaks) {
    const s = (delta(a, p.a) * r) / p.w;
    const shoulder = p.h * Math.exp(-s * s) * (1 + 0.12 * Math.sin(s * 2.3 + band.seed));
    h = smoothMax(h, shoulder, 3);
  }
  return h + (band.extra?.(a, r) ?? 0);
}

/**
 * Stylized La Soufrière in metres of arc from its bearing (`s` > 0 towards the Échelle side): a
 * truncated, uneven dome with a fissure notch near the top, on a forested plateau; L'Échelle and
 * La Citerne (flat crater rim) on one side, a long descending ridge on the other.
 */
function soufriere(s: number): number {
  const bump = (c: number, w: number, h: number, p = 2): number =>
    h * Math.exp(-(Math.abs((s - c) / w) ** p));
  const plateau = bump(0, 80, 19, 2.2);
  // Steep but concave sides (the distant view from the south), not a level cap: a sharper knob on
  // the Carmichaël side, a notch, then a rough, slightly lower crest towards L'Échelle.
  const across = Math.abs(s - 2) / (s > 2 ? 30 : 36);
  const dome =
    17 * Math.max(0, 1 - across ** 1.7) ** 0.75 +
    bump(-7, 3.2, 4.2, 2) +
    bump(9, 2.4, 1.6, 2) +
    bump(14, 2.2, 1.2, 2);
  const notch = -2.4 * Math.exp(-(((s - 3) / 2.2) ** 2)) * (dome > 12 ? 1 : 0);
  const echelle = bump(58, 15, 21, 2);
  const citerne = bump(84, 13, 18, 4);
  const carmichael = bump(-50, 16, 19, 2) + bump(-92, 30, 12, 2);
  return Math.max(plateau + dome + notch, echelle, citerne, carmichael, plateau);
}

/** One ridge band as a mesh: rings from the foot (near, low) up to the crest, folded slopes. */
function bandMesh(band: Band, sides: number): THREE.Mesh {
  const rows = 9;
  const pos: number[] = [];
  const col: number[] = [];
  const rise: number[] = [];
  const index: number[] = [];
  const foot = new THREE.Color(band.colour.foot);
  const top = new THREE.Color(band.colour.crest);
  const slope = new THREE.Color(band.colour.slope);
  const c = new THREE.Color();
  // Closed ring: the last column joins the first (no duplicate seam column), and every frequency
  // below is a whole number of waves per turn, so folds and normals are continuous all round.
  const wave = (k: number): number => Math.max(1, Math.round(band.radius * k));
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const h = crest(band, a);
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const massif = band.extra
        ? Math.exp(-(((delta(a, SOUFRIERE_BEARING) * band.radius) / 90) ** 2))
        : 0;
      const gully = massif * Math.max(0, Math.sin(a * wave(0.75) + Math.sin(a * wave(0.2)) * 2));
      const fold =
        band.folds *
        (1 + 1.4 * massif) *
        (1 - v) ** 0.7 *
        (Math.sin(a * wave(0.11) + band.seed) * 0.6 +
          Math.sin(a * wave(0.27) + band.seed * 2.1) * 0.4);
      const r =
        band.radius - band.depth * (1 - v) ** 1.6 + fold - 1.2 * gully ** 3 * v * (1 - v) * 4;
      const y = -3 + (h + 3) * v ** 1.25 + fold * 0.35;
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      const patch =
        hash(Math.floor((i / sides) * 251), band.seed) * 0.5 + 0.5 * Math.sin(a * 23 + v * 3);
      c.copy(foot)
        .lerp(top, v ** 0.8)
        .lerp(slope, Math.max(0, patch) * 0.35 * v * (1 - v) * 3);
      c.multiplyScalar(1 - 0.22 * gully ** 3 * Math.sin(Math.PI * Math.min(1, v * 1.1)));
      col.push(c.r, c.g, c.b);
      rise.push(v);
    }
  }
  for (let i = 0; i < sides; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j;
      const b = ((i + 1) % sides) * (rows + 1) + j;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("aRise", new THREE.Float32BufferAttribute(rise, 1));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    fog: false,
    side: THREE.DoubleSide,
  });
  const { colour, foot: hazeFoot, crest: hazeCrest } = band.haze;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHaze = { value: new THREE.Color(colour) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aRise;\nvarying float vRise;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRise = aRise;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uHaze;\nvarying float vRise;")
      .replace(
        "#include <opaque_fragment>",
        `outgoingLight = mix(outgoingLight, uHaze, mix(${hazeFoot.toFixed(3)}, ${hazeCrest.toFixed(3)}, smoothstep(0.0, 1.0, vRise)));
#include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `skyline-${hazeFoot}-${hazeCrest}`;
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = -2;
  return mesh;
}

/**
 * Builds the skyline. Consumes the same draws as the v14 mornes (bearing, width, height, depth per
 * hill, nine near and seven far), now used as the near and middle ridges' summits, so the scene's
 * createRng(11) order is unchanged.
 */
export function createSkyline(rng: Rng, lite: boolean): THREE.Group {
  const rings: [number, number, number][] = [
    [62, 14, 9],
    [88, 24, 7],
  ];
  const [near, middle] = rings.map(([radius, height, n]) =>
    Array.from({ length: n }, (_, i): Peak => {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      const w = 18 + rng() * 20;
      const h = height * (0.6 + rng() * 0.7);
      rng();
      return { a, h: h * (radius < 70 ? 0.75 : 1), w: w * 1.5 };
    }),
  );
  // Lower summits in front of the massif (it must show over them) and behind the opening view's
  // intro column and the sun, so no ridge edge crosses the title text.
  const keepClear = (peaks: Peak[], width: number): Peak[] =>
    peaks.map((p) =>
      Math.abs(delta(p.a, SOUFRIERE_BEARING)) < width || Math.abs(delta(p.a, INTRO_BEARING)) < 0.3
        ? { ...p, h: p.h * 0.4 }
        : p,
    );
  const sides = lite ? 240 : 480;
  const group = new THREE.Group();
  group.name = "skyline";
  const bands: Band[] = [
    {
      radius: 150,
      depth: 26,
      base: 9,
      peaks: [],
      extra: (a, r) => soufriere(delta(a, SOUFRIERE_BEARING) * r),
      colour: SKYLINE.far,
      haze: { colour: SKYLINE.far.haze, foot: 0.78, crest: 0.16 },
      folds: 3.5,
      seed: 5,
    },
    {
      radius: 96,
      depth: 20,
      base: 6,
      peaks: keepClear(middle, 0.32),
      colour: SKYLINE.middle,
      haze: { colour: SKYLINE.middle.haze, foot: 0.72, crest: 0.22 },
      folds: 3,
      seed: 2,
    },
    {
      radius: 66,
      depth: 14,
      base: 3.5,
      peaks: keepClear(near, 0.26),
      colour: SKYLINE.near,
      haze: { colour: SKYLINE.near.haze, foot: 0.55, crest: 0.12 },
      folds: 2.4,
      seed: 7,
    },
  ];
  for (const band of bands) group.add(bandMesh(band, sides));

  // A thin cloud bank lying in the massif's saddle and against the Échelle side of the dome.
  for (const [s, y, w, h, o] of [
    [-30, 27, 70, 6, 0.75],
    [40, 25, 55, 5, 0.6],
    [-80, 21, 70, 5, 0.45],
  ] as const) {
    const a = SOUFRIERE_BEARING + s / 146;
    const cloud = softSprite(SKYLINE.cloud, 1, o, false);
    cloud.material.fog = false;
    cloud.position.set(Math.cos(a) * 146, y, Math.sin(a) * 146);
    cloud.scale.set(w, h, 1);
    cloud.renderOrder = -1;
    group.add(cloud);
  }
  return group;
}
