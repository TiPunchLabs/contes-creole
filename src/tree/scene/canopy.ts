import * as THREE from "three";
import { SWAY_TIME, TILE, patchShader, type Anchor, type Card } from "./foliage";
import { bezier, hash, type Tube } from "./organic";

/** A straight piece of the bark's axis that cards can grow from. */
export interface Support {
  a: THREE.Vector3;
  b: THREE.Vector3;
  ra: number;
  rb: number;
  /** Twig or limb the piece belongs to: cards on the same owner sway together. */
  owner: number;
}

/** The crown's cards rooted on the bark, the twigs added to reach them, and one phase per card. */
export interface AnchoredCrown {
  cards: Card[];
  twigs: Tube[];
  phases: number[];
}

/** Within this distance of the bark axis a card grows straight from it; farther, a twig reaches it. */
const DIRECT = 0.35;
/**
 * The flower tiles paint their cluster from about a fifth of the card's length (the leaf tiles from
 * the foot): flower cards slide back by this share, so the petals start at the twig, not above it.
 */
const BLOOM_FOOT = 0.2;
/** Owner ids of added twigs start here, above any limb index. */
const FIRST_TWIG = 100000;
/** Share of the gap a twig covers; the card, drawn in by the rest, grows longer to keep its reach. */
const REACH = 0.55;

/** Samples a tube's axis into supports, keeping only pieces above `minY` (the crown). */
export function tubeSupports(tube: Tube, owner: number, minY: number): Support[] {
  const stations =
    tube.stations ?? Array.from({ length: tube.rings + 1 }, (_, i) => i / tube.rings);
  const out: Support[] = [];
  let prev = tube.at(stations[0], new THREE.Vector3());
  for (let i = 1; i < stations.length; i++) {
    const next = tube.at(stations[i], new THREE.Vector3());
    if (Math.max(prev.y, next.y) > minY)
      out.push({
        a: prev,
        b: next,
        ra: tube.radius(stations[i - 1]),
        rb: tube.radius(stations[i]),
        owner,
      });
    prev = next;
  }
  return out;
}

/**
 * Roots every card of a crown on the branches. A card already near a branch moves its base onto
 * it; a farther one gets a tapered twig from the nearest branch over part of the gap and grows from
 * its end, longer by what it was drawn in, so the crown keeps its outline and few bare twigs show
 * against the sky. Twigs leave their branch outwards and curve up to the card, and join the
 * supports, so later cards can share them. Flower cards slide back onto their twig (`BLOOM_FOOT`).
 * With `cross`, half of them get a second card turned around the same stem, so the clusters keep
 * some body when seen edge-on.
 */
export function anchorCrown(
  cards: readonly Card[],
  supports: readonly Support[],
  opts: { cross: boolean; seed: number },
): AnchoredCrown {
  const pool = [...supports];
  const twigs: Tube[] = [];
  const near = new THREE.Vector3();
  const best = new THREE.Vector3();
  /** Closest support to `p`: point written into `best`, returns its radius there and its owner. */
  const closest = (p: THREE.Vector3): { d: number; r: number; owner: number } => {
    let d = Infinity;
    let r = 0;
    let owner = -1;
    for (const s of pool) {
      const u = closestOnSegment(s.a, s.b, p, near);
      const k = near.distanceToSquared(p);
      if (k < d) {
        d = k;
        r = s.ra + (s.rb - s.ra) * u;
        owner = s.owner;
        best.copy(near);
      }
    }
    return { d: Math.sqrt(d), r, owner };
  };

  const order = cards
    .map((card, i) => ({ card, i, d: closest(card.at).d }))
    .sort((p, q) => p.d - q.d);
  const out: { i: number; card: Card; phase: number }[] = [];
  let owners = FIRST_TWIG;
  for (const { card, i } of order) {
    const { d, r, owner } = closest(card.at);
    const root = best.clone();
    let at: THREE.Vector3;
    let own = owner;
    let size = card.size;
    if (d <= DIRECT) {
      at = root.addScaledVector(card.at.clone().sub(root).normalize(), Math.min(d, r * 0.5));
    } else {
      const way = card.at.clone().sub(root).normalize();
      at = root.clone().addScaledVector(way, d * REACH);
      size = Math.min(card.size * 1.5, card.size + d * (1 - REACH) * 0.7);
      // A twig grown from another twig belongs to the same spray and sways with it.
      own = owner >= FIRST_TWIG ? owner : owners++;
      const r0 = Math.min(0.04, Math.max(0.018, r * 0.6));
      const rise = (at.y - root.y) * 0.45;
      const twig: Tube = {
        at: bezier(
          root,
          root
            .clone()
            .lerp(at, 0.4)
            .setY(root.y + rise * 0.2),
          root
            .clone()
            .lerp(at, 0.75)
            .setY(at.y - rise * 0.15),
          at,
        ),
        radius: (s) => r0 + (0.011 - r0) * s,
        rings: 2,
        sides: 4,
        cap: true,
        shade: () => 0.95,
        seed: own,
      };
      twigs.push(twig);
      // The twig's rendered axis (its ring stations), not its chord, so twigs grown from it root in
      // its bark.
      pool.push(...tubeSupports(twig, own, -Infinity));
    }
    const bloom = card.tile !== TILE.leaf && card.tile !== TILE.shade && card.tile !== TILE.sprig;
    if (bloom) {
      const n = card.normal.clone().normalize();
      const grow = card.dir.clone().addScaledVector(n, -n.dot(card.dir));
      // A copy: the twig's end stays where it is, inside the painted cluster.
      if (grow.lengthSq() > 0.05)
        at = at.clone().addScaledVector(grow.normalize(), -BLOOM_FOOT * size);
    }
    const moved: Card = { ...card, at, size };
    const phase = hash(own, opts.seed) * Math.PI * 2;
    out.push({ i, card: moved, phase });
    if (opts.cross && bloom && hash(i, opts.seed, 3) < 0.5) {
      const turn = (hash(i, opts.seed, 4) < 0.5 ? 1 : -1) * Math.PI * 0.3;
      out.push({
        i: i + 0.5,
        card: {
          ...moved,
          normal: card.normal.clone().applyAxisAngle(card.dir.clone().normalize(), turn),
          size: size * 0.85,
        },
        phase,
      });
    }
  }
  out.sort((p, q) => p.i - q.i);
  return { cards: out.map((o) => o.card), twigs, phases: out.map((o) => o.phase) };
}

/** Closest point to `p` on segment ab, written into `out`; returns its parameter in [0, 1]. */
function closestOnSegment(
  a: THREE.Vector3,
  b: THREE.Vector3,
  p: THREE.Vector3,
  out: THREE.Vector3,
): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const len = abx * abx + aby * aby + abz * abz;
  const u =
    len > 0
      ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / len))
      : 0;
  out.set(a.x + abx * u, a.y + aby * u, a.z + abz * u);
  return u;
}

/** Where a crown's inner anchors go (`innerAnchors`). */
export interface InnerSpec {
  /** Azimuth (radians, about +y from +x) of the side to dress, in the tree's own frame. */
  facing: number;
  /** Half-width of that side, in radians. */
  spread: number;
  /** Height band: above the main fork, up to the crown's lowest tips. */
  low: number;
  high: number;
  /** Largest horizontal distance from the trunk's axis, so the anchors stay on the inner limbs. */
  reach: number;
  /** Most anchors, and the least distance between two, so sky shows between their sprays. */
  count: number;
  gap: number;
  /** Anchor radius (the crown's own anchors use 0.8 to 1.6). */
  r: number;
  seed: number;
}

/**
 * Extra crown anchors on the inner limbs above the main fork, on one side of the tree, a little out
 * from each limb. Fed to `flamboyantCrown` like the tip anchors, they grow the crown's own sprays
 * (same tiles, orientation, underside shading, openings and ragged edges), so the inner foliage
 * reads as the crown reaching down its limbs, not as separate leaves; `anchorCrown` then roots them
 * like the rest. Deterministic: hashes only, no draw from the scene's RNG.
 */
export function innerAnchors(supports: readonly Support[], spec: InnerSpec): Anchor[] {
  const { facing, spread, low, high, reach, count, gap, r, seed } = spec;
  const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
  const candidates: { at: THREE.Vector3; key: number }[] = [];
  supports.forEach((s, i) => {
    if (Math.max(s.ra, s.rb) > 0.3) return;
    for (const u of [0.25, 0.75]) {
      const at = s.a.clone().lerp(s.b, u);
      const d = Math.hypot(at.x, at.z);
      if (at.y < low || at.y > high || d > reach) continue;
      if (Math.abs(wrap(Math.atan2(at.z, at.x) - facing)) > spread) continue;
      candidates.push({ at, key: hash(i, u * 4, seed) });
    }
  });
  candidates.sort((p, q) => p.key - q.key);
  const picked: THREE.Vector3[] = [];
  for (const c of candidates) {
    if (picked.length >= count) break;
    if (picked.some((o) => o.distanceTo(c.at) < gap)) continue;
    picked.push(c.at);
  }
  return picked.map((at, k) => {
    const away = new THREE.Vector3(at.x, 0, at.z);
    if (away.lengthSq() < 1e-4) away.set(Math.cos(facing), 0, Math.sin(facing));
    away.normalize();
    return {
      at: at
        .clone()
        .addScaledVector(away, 0.3)
        .add(new THREE.Vector3(0, 0.15, 0)),
      r: r * (0.85 + 0.3 * hash(k, seed, 1)),
    };
  });
}

/** Per-card phase as a vertex attribute (12 vertices per card, as `cardsGeometry` builds them). */
export function phaseAttribute(phases: readonly number[]): THREE.Float32BufferAttribute {
  const data = new Float32Array(phases.length * 12);
  phases.forEach((p, i) => data.fill(p, i * 12, i * 12 + 12));
  return new THREE.Float32BufferAttribute(data, 1);
}

/** Strength of the hover rustle (0 to 1), shared by the bark and the crown. */
export const RUSTLE = { value: 0 };

/**
 * One wind for the whole tree, as a smooth displacement of world positions: it grows with the
 * height above the first fork and with the distance from the trunk, so the trunk stays put, the
 * limbs bend a little and the outer twigs most. Bark and cards share it, so a card rooted on a twig
 * moves exactly as the twig does.
 */
const FIELD = /* glsl */ `
vec3 treeWind(vec3 p) {
  float h = max(0.0, p.y - 3.2);
  float r = length(p.xz);
  float bend = 0.0008 * h * h + 0.0015 * r * r;
  float ph = dot(p.xz, vec2(0.23, 0.17));
  float s1 = sin(uSwayTime * 0.9 + ph);
  float s2 = sin(uSwayTime * 1.55 + ph * 1.7 + 1.3);
  vec3 d = vec3(0.8 * s1 + 0.3 * s2, -0.3 * s2, 0.45 * s2 + 0.2 * s1) * bend;
  d.xz += uRustle * bend * 0.5 * vec2(sin(uSwayTime * 7.0 + ph * 3.0), cos(uSwayTime * 6.0 + ph * 2.0));
  return d;
}`;

/** Bends the bark with the tree's wind (`FIELD`). */
export function withTreeWind<T extends THREE.Material>(material: T): T {
  patchShader(material, "tree-wind", (shader) => {
    shader.uniforms.uSwayTime = SWAY_TIME;
    shader.uniforms.uRustle = RUSTLE;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\nuniform float uSwayTime;\nuniform float uRustle;\n${FIELD}`,
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed += treeWind(transformed);",
      );
  });
  return material;
}

/**
 * The crown's cards in the tree's wind: each card first moves with the point it grows from, then
 * flutters more towards its tip (`aSway` 0 at the base, 1 at the tip). Cards on one twig share a
 * phase (`aPhase`), so a spray moves as one, with only a slight lag across each card's tip.
 */
export function withCrownWind<T extends THREE.Material>(material: T, flutter: number): T {
  patchShader(material, `crown-wind-${flutter}`, (shader) => {
    shader.uniforms.uSwayTime = SWAY_TIME;
    shader.uniforms.uRustle = RUSTLE;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\nattribute float aSway;\nattribute float aPhase;\nuniform float uSwayTime;\nuniform float uRustle;\n${FIELD}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
{
  vec3 wind = treeWind(transformed);
  float k = ${flutter.toFixed(3)} * (1.0 + 0.8 * uRustle) * aSway * aSway;
  float lag = aSway * 0.6 + dot(position.xz, vec2(0.5, 0.4)) * 0.15;
  wind += k * vec3(
    sin(uSwayTime * 2.1 + aPhase + lag),
    0.6 * sin(uSwayTime * 2.9 + aPhase * 1.3 + lag),
    0.7 * cos(uSwayTime * 1.8 + aPhase * 0.7 + lag)
  );
  transformed += wind;
}`,
      );
  });
  return material;
}
