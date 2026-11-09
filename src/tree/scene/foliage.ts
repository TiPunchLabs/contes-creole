import * as THREE from "three";
import { createRng, type Rng } from "@shared/random";
import { hash } from "./organic";

/**
 * Painted foliage for the tree scene: a canvas atlas of leaf sprays, flower clusters and ground
 * tufts, cards baked from that atlas into single meshes, and the shader touches every leaf material
 * shares (tip sway, paler undersides, light through the leaves, extra haze on distant plants). The
 * atlas uses its own seeded generator, so the scene's createRng(11) layout is untouched.
 */

/** Atlas tiles, 4 columns × 2 rows. */
export const TILE = {
  /** Crisp feathery flamboyant leaves, for the crown's edges and sunlit top. */
  leaf: 0,
  /** Denser, softer and darker leaves, for the inside and underside of a crown. */
  shade: 1,
  vermilion: 2,
  coral: 3,
  orange: 4,
  /** A few flowers and buds on feathery leaves: the ragged edge of a flower cluster. */
  sprig: 5,
  /** Breadfruit: big, deeply lobed glossy leaves. */
  breadfruit: 6,
  /** Ground tuft: grass blades, small fern leaves and tiny pale flowers. */
  tuft: 7,
} as const;
export type Tile = (typeof TILE)[keyof typeof TILE];

const COLS = 4;
const ROWS = 2;

/** Direction towards the low sun (the sky's sun disc and the rim light). */
export const SUN_DIR = new THREE.Vector3(-0.4, 0.35, 0.85).normalize();

/** Shared clock of every swaying leaf material; the landscape writes it each frame. */
export const SWAY_TIME = { value: 0 };

const atlases = new Map<number, THREE.Texture>();

/** The painted atlas at `tile` pixels per tile (built once per size). */
export function foliageAtlas(tile: number): THREE.Texture {
  const cached = atlases.get(tile);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = tile * COLS;
  canvas.height = tile * ROWS;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const painters: ((c: CanvasRenderingContext2D, s: number, rnd: Rng) => void)[] = [
      (c, s, r) => paintFeather(c, s, r, false),
      (c, s, r) => paintFeather(c, s, r, true),
      (c, s, r) => paintFlowers(c, s, r, VERMILION, 21, false),
      (c, s, r) => paintFlowers(c, s, r, CORAL, 19, false),
      (c, s, r) => paintFlowers(c, s, r, ORANGE, 20, false),
      (c, s, r) => paintFlowers(c, s, r, VERMILION, 7, true),
      paintBreadfruit,
      paintTuft,
    ];
    painters.forEach((paint, i) => {
      ctx.save();
      ctx.translate((i % COLS) * tile, Math.floor(i / COLS) * tile);
      ctx.beginPath();
      ctx.rect(0, 0, tile, tile);
      ctx.clip();
      paint(ctx, tile, createRng(101 + i * 7919));
      ctx.restore();
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  atlases.set(tile, texture);
  return texture;
}

/** One painted card: a slightly cupped quad growing from `at` along `dir`, facing about `normal`. */
export interface Card {
  at: THREE.Vector3;
  /** Unit growth direction: the tile's bottom-to-top axis. */
  dir: THREE.Vector3;
  /** Approximate unit normal (re-orthogonalised against `dir`). */
  normal: THREE.Vector3;
  /** Length along `dir`; the width is `size × aspect`. */
  size: number;
  aspect?: number;
  tile: Tile;
  /** Vertex colour multiplier (light, depth, warmth). */
  shade: THREE.Color;
  /** Downward curl of the far end, as a share of the size. */
  droop?: number;
}

/** Shading field of a crown: normals lean from the crown's centre, vertically squashed. */
export interface CrownField {
  centre: THREE.Vector3;
  amount: number;
  squash: number;
}

/**
 * Bakes cards into one geometry (3 × 4 vertices each, atlas UVs, colours, `aSway` 0 at the base to 1
 * at the tip). With `field`, normals lean towards the crown's radial direction so the cards light
 * as one foliage mass; `frame` maps the result into a mesh's local space.
 */
export function cardsGeometry(
  cards: readonly Card[],
  field?: CrownField,
  frame?: THREE.Matrix4,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const sway: number[] = [];
  const index: number[] = [];
  const side = new THREE.Vector3();
  const grow = new THREE.Vector3();
  const n = new THREE.Vector3();
  const v = new THREE.Vector3();
  const vn = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const normalFrame = frame ? new THREE.Matrix3().getNormalMatrix(frame) : null;
  for (const card of cards) {
    const first = pos.length / 3;
    // The normal decides which way a card faces; the growth direction is projected onto the card's
    // plane, and falls back to the horizontal tangent when it nearly matches the normal (projecting
    // the other way could stand a card on its side).
    n.copy(card.normal).normalize();
    grow.copy(card.dir).addScaledVector(n, -n.dot(card.dir));
    if (grow.lengthSq() < 0.05) {
      grow.set(0, 1, 0).cross(n);
      if (grow.lengthSq() < 1e-4) grow.set(1, 0, 0);
    }
    grow.normalize();
    side.crossVectors(n, grow).normalize();
    const width = card.size * (card.aspect ?? 1);
    const droop = card.droop ?? 0.18;
    const tile = card.tile;
    const u0 = (tile % COLS) / COLS;
    const v0 = 1 - (Math.floor(tile / COLS) + 1) / ROWS;
    for (let j = 0; j < 4; j++) {
      const t = j / 3;
      for (let i = 0; i < 3; i++) {
        const s = i / 2 - 0.5;
        v.copy(card.at)
          .addScaledVector(grow, t * card.size)
          .addScaledVector(side, s * width)
          .addScaledVector(n, -(droop * t * t + 0.12 * s * s) * card.size);
        vn.copy(n)
          .addScaledVector(side, s * 0.5)
          .addScaledVector(grow, droop * t);
        if (field) {
          radial.copy(v).sub(field.centre);
          radial.y *= field.squash;
          vn.normalize().lerp(radial.normalize(), field.amount);
        }
        vn.normalize();
        if (frame && normalFrame) {
          v.applyMatrix4(frame);
          vn.applyMatrix3(normalFrame).normalize();
        }
        pos.push(v.x, v.y, v.z);
        nor.push(vn.x, vn.y, vn.z);
        const edge = 1 - 0.12 * (1 - t);
        col.push(card.shade.r * edge, card.shade.g * edge, card.shade.b * edge);
        uv.push(u0 + ((s + 0.5) * 0.98 + 0.01) / COLS, v0 + (t * 0.98 + 0.01) / ROWS);
        sway.push(t);
      }
    }
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 2; i++) {
        const a = first + j * 3 + i;
        index.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("aSway", new THREE.Float32BufferAttribute(sway, 1));
  geo.setIndex(index);
  return geo;
}

/**
 * Material of painted cards: cut out by the atlas's alpha (alpha to coverage softens the cut edge
 * under MSAA), double-sided, coloured per vertex, with light through the leaves and distance haze.
 */
export function cardMaterial(
  atlas: THREE.Texture,
  opts: { glow?: number; sway?: number; emissive?: THREE.ColorRepresentation } = {},
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: atlas,
    vertexColors: true,
    alphaTest: 0.42,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
    roughness: 1,
    emissive: opts.emissive ?? "#2a1a0e",
    emissiveIntensity: 0.22,
  });
  if (opts.sway) withSway(material, opts.sway);
  // Both faces keep the baked crown normal: a flipped back face would face the ground and take the
  // hemisphere's olive bounce, turning cards seen from below into khaki slabs.
  patchShader(material, "one-sided-normal", (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      "#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\nnormal *= faceDirection;\n#endif",
    );
  });
  withGlow(material, opts.glow ?? 0.12);
  withSaturation(material, 1.25);
  withHaze(material);
  return material;
}

/**
 * Chains a shader patch onto a material's `onBeforeCompile`, so several patches (bark, sway, glow,
 * haze) can share one material. `key` joins the program cache key.
 */
export function patchShader(
  material: THREE.Material,
  key: string,
  patch: (shader: THREE.WebGLProgramParametersWithUniforms) => void,
): void {
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    patch(shader);
  };
  material.customProgramCacheKey = () => `${previousKey()}|${key}`;
}

/**
 * Leaves sway from the stem: the displacement grows with the square of `aSway` (0 at the stem, 1 at
 * the tip), so tips move more freely than stems; each plant (or instance) has its own phase.
 */
export function withSway<T extends THREE.Material>(material: T, amplitude: number): T {
  patchShader(material, `sway-${amplitude}`, (shader) => {
    shader.uniforms.uSwayTime = SWAY_TIME;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aSway;\nuniform float uSwayTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
{
#ifdef USE_INSTANCING
  vec2 swayAt = (modelMatrix * instanceMatrix[3]).xz;
#else
  vec2 swayAt = modelMatrix[3].xz;
#endif
  float swayPhase = dot(swayAt, vec2(0.37, 0.71)) + position.x * 0.9 + position.z * 0.6;
  float swayK = ${amplitude.toFixed(3)} * aSway * aSway;
  transformed.x += swayK * sin(uSwayTime * 1.7 + swayPhase);
  transformed.y += swayK * 0.5 * sin(uSwayTime * 2.9 + swayPhase * 1.3);
  transformed.z += swayK * 0.7 * sin(uSwayTime * 2.3 + swayPhase * 1.7);
}`,
      );
  });
  return material;
}

/**
 * Light through the leaves: looking towards the low sun, leaves glow warm, strongest where the view
 * ray lines up with the sun. Only fills light, never darkens.
 */
export function withGlow<T extends THREE.Material>(material: T, strength: number): T {
  patchShader(material, `glow-${strength}`, (shader) => {
    shader.uniforms.uSunDir = { value: SUN_DIR };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uSunDir;")
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
{
  vec3 sunView = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
  float through = pow(max(dot(normalize(-vViewPosition), sunView), 0.0), 9.0);
  // Leaves scatter green light: the lilac sky fill alone would grey a crown's unlit flank.
  reflectedLight.indirectDiffuse *= vec3(0.86, 1.0, 0.8);
  reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.9, 1.0, 0.75) * 0.22;
  reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(1.0, 0.78, 0.45) * through * ${strength.toFixed(3)};
}`,
      );
  });
  return material;
}

/**
 * Paler, cooler undersides on double-sided leaves (the back face), and optional painted veins: a
 * light midrib and fine lateral veins from the `aLeaf` attribute (x: signed share of the half-width,
 * y: share of the length).
 */
export function withLeafSurface<T extends THREE.Material>(material: T, veins: boolean): T {
  patchShader(material, `surface-${veins}`, (shader) => {
    if (veins) {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute vec2 aLeaf;\nvarying vec2 vLeaf;",
        )
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLeaf = aLeaf;");
    }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${veins ? "varying vec2 vLeaf;" : ""}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
${
  veins
    ? `{
  float across = abs(vLeaf.x);
  float lateral = abs(fract(vLeaf.y * 26.0 - across * 2.2) - 0.5);
  diffuseColor.rgb *= 1.0 - 0.09 * smoothstep(0.36, 0.5, lateral) * smoothstep(0.04, 0.2, across);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.52) * 0.82, 0.55 * (1.0 - smoothstep(0.015, 0.05, across)));
}`
    : ""
}
if (!gl_FrontFacing) {
  float luma = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  diffuseColor.rgb = mix(diffuseColor.rgb, luma * vec3(1.02, 1.12, 0.86), 0.4) * 1.1;
}`,
      );
  });
  return material;
}

/**
 * Lifts the saturation of the lit colour: the lilac sky fill otherwise greys the shaded side of
 * foliage into a dull sage.
 */
export function withSaturation<T extends THREE.Material>(material: T, amount: number): T {
  patchShader(material, `saturate-${amount}`, (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `outgoingLight = max(mix(vec3(dot(outgoingLight, vec3(0.3, 0.59, 0.11))), outgoingLight, ${amount.toFixed(3)}), 0.0);
#include <opaque_fragment>`,
    );
  });
  return material;
}

/**
 * Atmospheric depth for vegetation: beyond the clearing, plants melt further into the horizon haze
 * than the scene fog alone takes them, so the foreground keeps its contrast.
 */
export function withHaze<T extends THREE.Material>(
  material: T,
  near = 16,
  far = 55,
  amount = 0.38,
): T {
  patchShader(material, `haze-${near}-${far}-${amount}`, (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <fog_fragment>",
      `#ifdef USE_FOG
gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(${near.toFixed(1)}, ${far.toFixed(1)}, vFogDepth) * ${amount.toFixed(3)});
#endif
#include <fog_fragment>`,
    );
  });
  return material;
}

let shadowTexture: THREE.Texture | null = null;

/**
 * Contact shadow for a multiplied ground disc: a cool green-grey centre fading to white (no change)
 * at the rim. Built once.
 */
export function contactShadowTexture(): THREE.Texture {
  if (shadowTexture) return shadowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgb(150,170,140)");
    g.addColorStop(0.45, "rgb(200,214,190)");
    g.addColorStop(1, "rgb(255,255,255)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  shadowTexture = new THREE.CanvasTexture(canvas);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  return shadowTexture;
}

/** A foliage seed of a crown: cards gather around it within `r`. */
export interface Anchor {
  at: THREE.Vector3;
  r: number;
  /** A rare sun-orange accent. */
  blaze?: boolean;
}

/** How a flamboyant crown is composed from its anchors. */
export interface CrownSpec {
  anchors: readonly Anchor[];
  /** Crown centre: outward directions, light and depth are measured from it. */
  centre: THREE.Vector3;
  /** Horizontal reach of the crown from its centre. */
  radius: number;
  /** Lowest and highest anchor heights. */
  low: number;
  high: number;
  /** Cards per anchor. */
  per: number;
  /** Typical card length. */
  size: number;
  /** Foliage masses around the crown: each sits at its own height, with gaps between them. */
  lobes: number;
  /** Flower clusters on the upper, sunlit side. */
  clusters: number;
  /** Ellipsoid spread of a card around its anchor (horizontal, vertical) as shares of `r`. */
  spread?: readonly [number, number];
  /** Width of the openings between lobes and share of hollow cells (defaults 0.45, 0.14). */
  openings?: readonly [number, number];
  seed: number;
}

/** Cluster colours, vermilion first: it carries the flamboyant's scarlet umbrella. */
const BLOOMS: readonly Tile[] = [TILE.vermilion, TILE.coral, TILE.vermilion, TILE.orange];

/**
 * Composes a flamboyant crown as painted cards. The crown splits into `lobes` masses at different
 * heights with narrow openings between them (branches and sky show through); flowers gather in a
 * few distinct coral, vermilion or orange clusters on the upper sunlit side, ragged at their edges;
 * crisp fine leaves sit on the silhouette and the lit top, softer darker ones inside and underneath.
 */
export function flamboyantCrown(spec: CrownSpec): Card[] {
  const { anchors, centre, radius, low, high, per, size, lobes, seed } = spec;
  const [spreadH, spreadV] = spec.spread ?? [1.25, 0.45];
  const [opening, hollow] = spec.openings ?? [0.45, 0.14];
  const span = Math.max(1e-3, high - low);
  const up = new THREE.Vector3(0, 1, 0);
  const azimuth = (p: THREE.Vector3): number => Math.atan2(p.z - centre.z, p.x - centre.x);

  const widths = Array.from({ length: lobes }, (_, j) => 0.6 + 0.8 * hash(seed, j, 11));
  const total = widths.reduce((a, b) => a + b, 0);
  const bounds: number[] = [];
  let acc = hash(seed, 12) * Math.PI * 2;
  for (const w of widths) {
    bounds.push(acc);
    acc += (w / total) * Math.PI * 2;
  }
  const tiers = widths.map((_, j) => (hash(seed, j, 13) - 0.5) * 0.9 * size);
  const wrap = (a: number): number => a - Math.PI * 2 * Math.floor(a / (Math.PI * 2));
  /** Lobe holding azimuth `a` (the last boundary before it) and the angle to the nearest boundary. */
  const lobeOf = (a: number): [number, number] => {
    let inside = 0;
    let gap = Infinity;
    bounds.forEach((b, j) => {
      const d = wrap(a - b);
      if (d < wrap(a - bounds[inside])) inside = j;
      gap = Math.min(gap, d, Math.PI * 2 - d);
    });
    return [inside, gap];
  };

  const score = (a: Anchor): number =>
    (a.at.y - low) / span +
    0.35 * a.at.clone().sub(centre).setY(0).normalize().dot(SUN_DIR) +
    0.4 * hash(seed, a.at.x, a.at.z);
  const ranked = [...anchors].sort((p, q) => score(q) - score(p));
  const clusters: { at: THREE.Vector3; r: number; tile: Tile }[] = [];
  for (const a of ranked) {
    if (clusters.length >= spec.clusters) break;
    if (clusters.some((c) => c.at.distanceTo(a.at) < size * 2.6)) continue;
    const k = clusters.length;
    clusters.push({
      at: a.at,
      r: size * (2 + 1.1 * hash(seed, k, 14)),
      tile: BLOOMS[(k + Math.floor(hash(seed, 15) * 4)) % 4],
    });
  }

  const cards: Card[] = [];
  const sub = new THREE.Vector3();
  const out = new THREE.Vector3();
  anchors.forEach((anchor, i) => {
    for (let k = 0; k < per; k++) {
      // The first cards of an anchor are its core: larger, darker, facing out, near the anchor.
      const core = k < (per > 5 ? 2 : 1);
      const u = hash(i, k, seed + 1) * Math.PI * 2;
      const reach = Math.sqrt(hash(i, k, seed + 2)) * (core ? 0.45 : 1);
      const lift = hash(i, k, seed + 3) - 0.3;
      sub.set(
        anchor.at.x + Math.cos(u) * reach * anchor.r * spreadH,
        anchor.at.y + lift * anchor.r * spreadV,
        anchor.at.z + Math.sin(u) * reach * anchor.r * spreadH,
      );
      const a = azimuth(sub);
      const [lobe, gap] = lobeOf(a);
      const rh = Math.hypot(sub.x - centre.x, sub.z - centre.z) / radius;
      if (
        gap * rh * radius < size * opening &&
        rh > 0.35 &&
        rh < 0.85 &&
        hash(i, k, seed + 4) < 0.85
      )
        continue;
      const cell = hash(
        Math.floor(sub.x / (size * 1.3)),
        Math.floor(sub.y / size),
        Math.floor(sub.z / (size * 1.3)),
      );
      if (cell < hollow && rh > 0.45 && rh < 0.85) continue;
      if (rh > 1) continue;
      sub.y += tiers[lobe] * Math.min(1, rh * 1.4);
      // The umbrella has a flat top: nothing stacks above it (a near-axial tip would make a spire).
      sub.y = Math.min(sub.y, high + 0.15 * size);
      const h = Math.min(1, Math.max(0, (sub.y - low) / span));
      out.copy(sub).sub(centre);
      out.y = out.y * 1.6 + 0.3 * size;
      out.normalize();
      const sun = out.dot(SUN_DIR);
      const edge = rh > 0.78 || h > 0.72;
      let tile: Tile;
      const cluster = clusters.find((c) => c.at.distanceTo(sub) < c.r);
      if (core) tile = TILE.shade;
      else if (cluster && h > 0.15) {
        const d = cluster.at.distanceTo(sub) / cluster.r;
        tile = d < 0.8 || hash(i, k, seed + 5) < 0.35 ? cluster.tile : TILE.sprig;
      } else if (anchor.blaze && k === 0) tile = TILE.orange;
      else if (edge) tile = TILE.leaf;
      else tile = h < 0.4 || hash(i, k, seed + 6) < 0.45 ? TILE.shade : TILE.leaf;
      const bloom = tile !== TILE.leaf && tile !== TILE.shade;
      const dir = out.clone().setY(0);
      // Near the crown's axis the outward direction is straight up: pick a heading instead, or
      // the card would stand vertical.
      if (dir.lengthSq() < 0.04) dir.set(Math.cos(u), 0, Math.sin(u));
      dir.normalize().applyAxisAngle(up, (hash(i, k, seed + 7) - 0.5) * 1.5);
      dir.y = h > 0.45 ? 0.2 + 0.45 * hash(i, k, seed + 8) : -0.15 + 0.35 * hash(i, k, seed + 8);
      dir.normalize();
      if (core) dir.y = -0.05 + 0.3 * hash(i, k, seed + 8);
      // Flowers stand up and lean out, so their clusters also show from under the umbrella.
      if (bloom) dir.y = 0.2 + 0.45 * hash(i, k, seed + 8);
      const normal = up
        .clone()
        .lerp(out, core ? 0.6 : bloom ? 0.62 : edge ? 0.45 : 0.3)
        .applyAxisAngle(dir, (hash(i, k, seed + 9) - 0.5) * 0.9)
        .normalize();
      let light = 0.62 + 0.38 * h + 0.14 * sun + (edge ? 0.06 : 0);
      if (tile === TILE.shade) light *= core ? 0.72 : 0.82;
      const warm = Math.max(0, sun) * 0.08;
      cards.push({
        at: sub.clone(),
        dir,
        normal,
        size:
          size *
          (0.75 + 0.45 * hash(i, k, seed + 10)) *
          (core ? 1.6 : edge ? 0.82 : 1.1) *
          (rh > 0.88 ? 0.8 : 1) *
          (bloom ? 0.9 : 1),
        tile,
        shade: new THREE.Color(
          light * (1 + warm) * (h < 0.4 ? 0.78 : 1),
          light * (h < 0.4 ? 0.92 : 1),
          light * (1 - warm) * (h < 0.4 ? 1.02 : 1),
        ),
        droop: 0.12 + 0.25 * hash(i, k, seed + 11),
      });
    }
  });
  return cards;
}

/**
 * A leafy shell over a crown's lumps (breadfruit): cards on each lump's upper and outer surface,
 * facing out, lighter on top and towards the sun, darker below, so the lumps read as clustered
 * leaves around a shaded core.
 */
export function shellCards(
  lumps: readonly { at: THREE.Vector3; r: number }[],
  centre: THREE.Vector3,
  tile: Tile,
  size: number,
  per: number,
  seed: number,
): Card[] {
  const cards: Card[] = [];
  const out = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const top = Math.max(...lumps.map((l) => l.at.y + l.r));
  const bottom = Math.min(...lumps.map((l) => l.at.y - l.r));
  lumps.forEach((lump, i) => {
    for (let k = 0; k < per; k++) {
      const u = hash(seed, i, k) * Math.PI * 2;
      const y = 1 - 1.5 * hash(seed, k, i + 0.5);
      const ring = Math.sqrt(Math.max(0, 1 - Math.min(1, y * y)));
      out.set(Math.cos(u) * ring, Math.max(-1, y), Math.sin(u) * ring).normalize();
      const at = lump.at
        .clone()
        .addScaledVector(out, lump.r * (0.95 + 0.18 * hash(seed, i, k + 0.3)));
      const radial = at.clone().sub(centre).normalize();
      const h = (at.y - bottom) / Math.max(1e-3, top - bottom);
      const dir = radial
        .clone()
        .setY(0)
        .normalize()
        .applyAxisAngle(up, (hash(seed, k, i + 0.7) - 0.5) * 2)
        .setY(0.35 + 0.4 * hash(seed, i + 0.2, k));
      dir.normalize();
      if (radial.dot(out) < -0.2) continue;
      const light = 0.55 + 0.45 * h + 0.12 * radial.dot(SUN_DIR);
      cards.push({
        at: at.addScaledVector(dir, -size * 0.2),
        dir,
        normal: out.clone().lerp(up, 0.3),
        size: size * (0.8 + 0.4 * hash(seed, i, k + 0.9)),
        tile,
        shade: new THREE.Color(light * 0.95, light, light * 0.92),
        droop: 0.25,
      });
    }
  });
  return cards;
}

// Painting -----------------------------------------------------------------------------------------

type Rgb = readonly [number, number, number];
const VERMILION: readonly Rgb[] = [
  [226, 52, 30],
  [240, 74, 36],
  [204, 38, 26],
  [250, 104, 52],
];
const CORAL: readonly Rgb[] = [
  [242, 104, 80],
  [250, 126, 96],
  [226, 86, 70],
  [255, 150, 112],
];
const ORANGE: readonly Rgb[] = [
  [238, 98, 30],
  [248, 120, 40],
  [222, 78, 28],
  [255, 146, 62],
];

const rgba = ([r, g, b]: Rgb, a: number, k = 1): string =>
  `rgba(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g * k))},${Math.min(255, Math.round(b * k))},${a})`;

/** A soft, mostly opaque core so a card stays solid at a distance, where its lace mips away. */
function paintBody(
  ctx: CanvasRenderingContext2D,
  s: number,
  colour: Rgb,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  ctx.save();
  ctx.translate(cx * s, cy * s);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
  g.addColorStop(0, rgba(colour, 0.95));
  g.addColorStop(0.55, rgba(colour, 0.75));
  g.addColorStop(1, rgba(colour, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Flamboyant foliage: bipinnate leaves fanning from the tile's foot, each a curved rachis carrying
 * pairs of pinnae lined with tiny paired leaflets, lit from above. `soft` paints the shaded variant:
 * denser, darker, slightly blurred.
 */
function paintFeather(ctx: CanvasRenderingContext2D, s: number, rnd: Rng, soft: boolean): void {
  paintBody(ctx, s, soft ? [46, 88, 38] : [64, 112, 48], 0.5, 0.6, 0.2, 0.24);
  if (soft) {
    // One blur of the finished tile: a filter left on while painting would blur every leaflet
    // separately, thousands of passes paid when the canvas is first uploaded to the GPU.
    const layer = document.createElement("canvas");
    layer.width = layer.height = s;
    const lctx = layer.getContext("2d");
    if (!lctx) return;
    paintFeatherLeaves(lctx, s, rnd, true);
    ctx.filter = `blur(${(s / 400).toFixed(2)}px)`;
    ctx.drawImage(layer, 0, 0);
    ctx.filter = "none";
    return;
  }
  paintFeatherLeaves(ctx, s, rnd, false);
}

/** The leaves of a feather tile (see `paintFeather`). */
function paintFeatherLeaves(
  ctx: CanvasRenderingContext2D,
  s: number,
  rnd: Rng,
  soft: boolean,
): void {
  const leaves = soft ? 7 : 6;
  const seed = 1 + Math.floor(rnd() * 1e6);
  for (let pass = 0; pass < 2; pass++) {
    const r2 = createRng(seed);
    for (let l = 0; l < leaves; l++) {
      const a = -0.75 + (1.5 * (l + 0.2 + 0.6 * r2())) / leaves;
      const length = Math.min(0.86, 0.44 / Math.max(0.2, Math.abs(Math.sin(a)))) * s;
      const bend = (r2() - 0.5) * 0.5;
      featherLeaf(
        ctx,
        s,
        r2,
        0.5 * s,
        0.97 * s,
        a,
        length * (0.82 + 0.18 * r2()),
        bend,
        pass,
        soft,
      );
    }
  }
}

/** One bipinnate leaf (`pass` 0 paints its shadow, 1 its lit leaflets). */
function featherLeaf(
  ctx: CanvasRenderingContext2D,
  s: number,
  rnd: Rng,
  x0: number,
  y0: number,
  angle: number,
  length: number,
  bend: number,
  pass: number,
  soft: boolean,
): void {
  const point = (t: number): [number, number, number] => {
    const a = angle + bend * t;
    const x = x0 + Math.sin(angle + bend * t * 0.5) * length * t;
    const y = y0 - Math.cos(angle + bend * t * 0.5) * length * t;
    return [x, y, a];
  };
  const leaflet = s * (soft ? 0.024 : 0.02);
  const pinnae = 8;
  ctx.lineWidth = s * 0.004;
  ctx.strokeStyle = pass ? "rgba(96,120,52,0.9)" : "rgba(20,42,18,0.5)";
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const [x, y] = point(i / 12);
    if (i) ctx.lineTo(x, y + (pass ? 0 : s * 0.004));
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  for (let p = 0; p < pinnae; p++) {
    const t = 0.16 + (0.8 * p) / (pinnae - 1);
    const [px, py, a] = point(t);
    const reach = length * 0.27 * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.85)) ** 0.8;
    for (const sideSign of [-1, 1]) {
      const pa = a + sideSign * (1.05 + 0.15 * rnd());
      const pairs = 7;
      for (let k = 0; k < pairs; k++) {
        const u = (k + 0.6) / pairs;
        const jitter = (rnd() - 0.5) * leaflet * 0.5;
        const bx = px + Math.sin(pa) * reach * u + jitter;
        const by = py - Math.cos(pa) * reach * u - reach * 0.12 * u * u - jitter;
        const light = 0.25 + 0.45 * (1 - by / s) + 0.25 * u + 0.15 * rnd();
        for (const flip of [-1, 1]) {
          const la = pa + flip * (1.05 + 0.35 * rnd());
          const lx = bx + Math.sin(la) * leaflet * 0.8;
          const ly = by - Math.cos(la) * leaflet * 0.8;
          ctx.save();
          ctx.translate(lx, ly + (pass ? 0 : s * 0.006));
          ctx.rotate(la);
          ctx.beginPath();
          ctx.ellipse(0, 0, leaflet * 0.3, leaflet * (1.05 - 0.35 * u), 0, 0, Math.PI * 2);
          if (pass) {
            const k2 = soft ? 0.72 : 1;
            const g = Math.round((118 + 80 * light) * k2);
            const r = Math.round((60 + 70 * light * light) * k2);
            const b = Math.round((36 + 30 * light) * k2);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
          } else ctx.fillStyle = "rgba(18,40,16,0.55)";
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}

/**
 * Flamboyant flowers in `palette`: four spoon-shaped crinkled petals and a larger streaked standard
 * petal, long curved red stamens, a few buds; `sprig` paints a sparse edge with feathery leaves.
 */
function paintFlowers(
  ctx: CanvasRenderingContext2D,
  s: number,
  rnd: Rng,
  palette: readonly Rgb[],
  count: number,
  sprig: boolean,
): void {
  if (sprig) {
    paintBody(ctx, s, [60, 100, 44], 0.5, 0.62, 0.24, 0.28);
    for (let pass = 0; pass < 2; pass++) {
      const r2 = createRng(9);
      for (let l = 0; l < 4; l++) {
        const a = -0.6 + (1.2 * (l + 0.5)) / 4;
        featherLeaf(ctx, s, r2, 0.5 * s, 0.97 * s, a, 0.7 * s, (r2() - 0.5) * 0.4, pass, false);
      }
    }
  } else {
    const [r, g, b] = palette[2];
    paintBody(ctx, s, [r * 0.82, g * 0.7, b * 0.7], 0.5, 0.52, 0.3, 0.32);
  }
  const flowers: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * (sprig ? 0.34 : 0.33);
    flowers.push([0.5 + Math.cos(a) * r, (sprig ? 0.45 : 0.5) + Math.sin(a) * r * 0.9, rnd()]);
  }
  flowers.sort((p, q) => q[1] - p[1]);
  for (const [fx, fy, seed] of flowers) {
    const size = s * (sprig ? 0.07 + 0.025 * seed : 0.085 + 0.035 * seed);
    const turn = seed * Math.PI * 2;
    const base = palette[Math.floor(seed * 4) % 4];
    const light = 0.85 + 0.3 * (1 - fy);
    ctx.save();
    ctx.translate(fx * s, fy * s);
    ctx.rotate(turn);
    const shadow = ctx.createRadialGradient(
      size * 0.1,
      size * 0.15,
      0,
      size * 0.1,
      size * 0.15,
      size,
    );
    shadow.addColorStop(0, rgba(base, 0.55, 0.4));
    shadow.addColorStop(1, rgba(base, 0, 0.4));
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(size * 0.1, size * 0.15, size, 0, Math.PI * 2);
    ctx.fill();
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      const standard = p === 0;
      const len = size * (standard ? 0.8 : 0.95);
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-len * 0.12, -len * 0.4, -len * 0.62, -len * 0.75, 0, -len);
      ctx.bezierCurveTo(len * 0.62, -len * 0.75, len * 0.12, -len * 0.4, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      if (standard) {
        g.addColorStop(0, "rgb(252,238,206)");
        g.addColorStop(0.35, "rgb(255,214,120)");
        g.addColorStop(0.75, rgba(base, 1, light));
        g.addColorStop(1, rgba(base, 1, light));
      } else {
        g.addColorStop(0, rgba(base, 1, 0.8 * light));
        g.addColorStop(0.55, rgba(base, 1, light));
        g.addColorStop(1, rgba(base, 1, 1.18 * light));
      }
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = standard ? rgba(base, 0.9, 0.9) : rgba(base, 0.5, 0.6);
      ctx.lineWidth = s * 0.002;
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(0, -len * 0.1);
        ctx.lineTo(k * len * 0.18, -len * (standard ? 0.6 : 0.8));
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = rgba(base, 0.95, 0.75);
    ctx.lineWidth = s * 0.0025;
    for (let k = 0; k < 4; k++) {
      const a = turn + 2.4 + k * 0.25;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(a) * size * 0.9,
        Math.sin(a) * size * 0.9,
        Math.cos(a + 0.4) * size * 1.4,
        Math.sin(a + 0.4) * size * 1.4,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  for (let i = 0; i < (sprig ? 6 : 8); i++) {
    const x = (0.2 + 0.6 * rnd()) * s;
    const y = (0.12 + 0.55 * rnd()) * s;
    ctx.fillStyle = rgba(palette[2], 1, 0.75);
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.012, s * 0.018, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Breadfruit: five to six big, deeply lobed leaves radiating from the foot, pale veins. */
function paintBreadfruit(ctx: CanvasRenderingContext2D, s: number, rnd: Rng): void {
  paintBody(ctx, s, [40, 82, 34], 0.5, 0.7, 0.22, 0.2);
  const leaves = 6;
  for (let l = 0; l < leaves; l++) {
    const a = -1.05 + (2.1 * (l + 0.5)) / leaves + (rnd() - 0.5) * 0.2;
    const length = s * (0.5 + 0.08 * rnd());
    const tone = 0.75 + 0.5 * rnd();
    ctx.save();
    ctx.translate(s * 0.5, s * 0.95);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -length * 0.12);
    const lobes = 4;
    const outline: [number, number][] = [];
    for (let k = 0; k <= lobes * 2; k++) {
      const t = 0.16 + (0.84 * k) / (lobes * 2);
      const w = length * 0.34 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.6;
      outline.push([k % 2 ? w * 0.38 : w, -length * t]);
    }
    for (const [x, y] of outline) ctx.lineTo(x, y);
    for (let k = outline.length - 1; k >= 0; k--) ctx.lineTo(-outline[k][0], outline[k][1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(14,36,14,0.5)";
    ctx.save();
    ctx.translate(s * 0.006, s * 0.01);
    ctx.fill();
    ctx.restore();
    const g = ctx.createLinearGradient(0, 0, 0, -length);
    g.addColorStop(
      0,
      `rgb(${Math.round(34 * tone)},${Math.round(78 * tone)},${Math.round(32 * tone)})`,
    );
    g.addColorStop(
      1,
      `rgb(${Math.round(78 * tone)},${Math.round(132 * tone)},${Math.round(52 * tone)})`,
    );
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(196,214,120,0.55)";
    ctx.lineWidth = s * 0.004;
    ctx.beginPath();
    ctx.moveTo(0, -length * 0.1);
    ctx.lineTo(0, -length * 0.97);
    for (let k = 0; k <= lobes * 2; k += 2) {
      const [x, y] = outline[k];
      ctx.moveTo(0, y + length * 0.1);
      ctx.lineTo(x * 0.85, y);
      ctx.moveTo(0, y + length * 0.1);
      ctx.lineTo(-x * 0.85, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Ground tuft: grass blades and small fern leaves from the foot, a few tiny pale flowers. */
function paintTuft(ctx: CanvasRenderingContext2D, s: number, rnd: Rng): void {
  for (let i = 0; i < 70; i++) {
    const x = s * (0.5 + (rnd() - 0.5) * 0.5);
    const lean = (rnd() - 0.5) * 1.1;
    const h = s * (0.35 + 0.5 * rnd());
    const tone = 0.6 + 0.6 * rnd();
    ctx.strokeStyle = `rgb(${Math.round(84 * tone)},${Math.round(140 * tone)},${Math.round(56 * tone)})`;
    ctx.lineWidth = s * (0.006 + 0.008 * rnd());
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, s * 0.99);
    ctx.quadraticCurveTo(x + lean * h * 0.2, s - h * 0.6, x + lean * h * 0.55, s - h);
    ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = s * (0.25 + 0.5 * rnd());
    const y = s * (0.35 + 0.35 * rnd());
    const r = s * (0.01 + 0.008 * rnd());
    ctx.fillStyle = rnd() < 0.7 ? "rgb(250,246,232)" : "rgb(214,196,240)";
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgb(246,200,72)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}
