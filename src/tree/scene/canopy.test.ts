import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { anchorCrown, innerAnchors, phaseAttribute, type Support } from "./canopy";
import { TILE, flamboyantCrown, type Card } from "./foliage";

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** A card at `at` growing outwards along +x, facing up. */
const card = (at: THREE.Vector3, tile: Card["tile"] = TILE.leaf): Card => ({
  at,
  dir: V(1, 0.2, 0).normalize(),
  normal: V(0, 1, 0),
  size: 1,
  tile,
  shade: new THREE.Color(1, 1, 1),
});

/** Distance from `p` to segment ab. */
const toSegment = (a: THREE.Vector3, b: THREE.Vector3, p: THREE.Vector3): number =>
  new THREE.Line3(a, b).closestPointToPoint(p, true, new THREE.Vector3()).distanceTo(p);

describe("anchorCrown", () => {
  const branch: Support = { a: V(0, 6, 0), b: V(3, 8, 0), ra: 0.1, rb: 0.05, owner: 1 };

  it("roots every card on the branch or on a twig grown from it", () => {
    const cards = [card(V(3.1, 8, 0.1)), card(V(4.5, 8.6, 1.2)), card(V(1, 9.4, -1.5))];
    const crown = anchorCrown(cards, [branch], { cross: false, seed: 3 });
    expect(crown.cards).toHaveLength(3);
    expect(crown.twigs).toHaveLength(2);
    const ends = crown.twigs.map((t) => t.at(1, new THREE.Vector3()));
    crown.cards.forEach((c) => {
      const onBranch = toSegment(branch.a, branch.b, c.at) <= branch.ra;
      const onTwig = ends.some((e) => e.distanceTo(c.at) < 1e-6);
      expect(onBranch || onTwig).toBe(true);
    });
    crown.twigs.forEach((t) => {
      const root = t.at(0, new THREE.Vector3());
      expect(toSegment(branch.a, branch.b, root)).toBeLessThan(1e-6);
      expect(t.radius(1)).toBeLessThan(t.radius(0));
    });
  });

  it("gives the cards of one twig the same phase", () => {
    const far = V(4.5, 8.6, 1.2);
    const cards = [card(far), card(far.clone().add(V(0.05, 0, 0.05)))];
    const crown = anchorCrown(cards, [branch], { cross: false, seed: 3 });
    expect(crown.twigs.length).toBeGreaterThan(0);
    expect(crown.phases[0]).toBe(crown.phases[1]);
  });

  it("slides a flower card back so its painted cluster starts at the twig", () => {
    const at = V(3, 8, 0);
    const crown = anchorCrown([card(at, TILE.vermilion)], [branch], { cross: false, seed: 3 });
    const moved = crown.cards[0].at;
    expect(moved.distanceTo(at)).toBeGreaterThan(0.1);
    expect(moved.x).toBeLessThan(at.x);
  });

  it("keeps a flower's twig end inside the cluster when the card slides back", () => {
    const at = V(4, 10, 0);
    const crown = anchorCrown([card(at, TILE.vermilion)], [branch], { cross: false, seed: 3 });
    expect(crown.twigs).toHaveLength(1);
    const end = crown.twigs[0].at(1, new THREE.Vector3());
    const root = crown.twigs[0].at(0, new THREE.Vector3());
    const gap = toSegment(branch.a, branch.b, at);
    expect(end.distanceTo(root)).toBeCloseTo(gap * 0.55, 5);
    const c = crown.cards[0];
    const grow = c.dir.clone().addScaledVector(c.normal, -c.normal.dot(c.dir)).normalize();
    expect(
      c.at
        .clone()
        .addScaledVector(grow, 0.2 * c.size)
        .distanceTo(end),
    ).toBeLessThan(1e-6);
  });

  it("roots a twig grown from a twig on that twig's rendered axis", () => {
    const cards = [card(V(4.5, 8.6, 1.2)), card(V(5.6, 9.4, 1.9))];
    const crown = anchorCrown(cards, [branch], { cross: false, seed: 3 });
    expect(crown.twigs.length).toBe(2);
    const [first, second] = crown.twigs;
    const root = second.at(0, new THREE.Vector3());
    const axis = [0, 0.5, 1].map((s) => first.at(s, new THREE.Vector3()));
    const onAxis = Math.min(toSegment(axis[0], axis[1], root), toSegment(axis[1], axis[2], root));
    const onBranch = toSegment(branch.a, branch.b, root);
    expect(Math.min(onAxis, onBranch)).toBeLessThan(1e-6);
  });

  it("crosses some flower cards only when asked", () => {
    const cards = Array.from({ length: 20 }, (_, i) => card(V(3, 8, i * 0.01), TILE.coral));
    expect(anchorCrown(cards, [branch], { cross: false, seed: 3 }).cards).toHaveLength(20);
    expect(anchorCrown(cards, [branch], { cross: true, seed: 3 }).cards.length).toBeGreaterThan(20);
  });
});

describe("phaseAttribute", () => {
  it("repeats each card's phase over its 12 vertices", () => {
    const a = phaseAttribute([0.5, 2]);
    expect(a.count).toBe(24);
    expect(a.getX(11)).toBe(0.5);
    expect(a.getX(12)).toBe(2);
  });
});

describe("innerAnchors", () => {
  /** Limbs radiating from a fork at y = 5, every 30°, up to y = 9. */
  const limbs: Support[] = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return {
      a: V(0, 5, 0),
      b: V(Math.cos(a) * 3, 9, Math.sin(a) * 3),
      ra: 0.15,
      rb: 0.08,
      owner: i,
    };
  });
  const spec = {
    facing: 0,
    spread: 1.2,
    low: 6,
    high: 9,
    reach: 3,
    count: 6,
    gap: 0.6,
    r: 0.75,
    seed: 5,
  };

  it("places spaced anchors only on the dressed side, in the height band, near a limb", () => {
    const anchors = innerAnchors(limbs, spec);
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.length).toBeLessThanOrEqual(spec.count);
    anchors.forEach((a, i) => {
      expect(a.at.x).toBeGreaterThan(0);
      expect(a.at.y).toBeGreaterThan(spec.low);
      expect(a.at.y).toBeLessThan(spec.high + 0.2);
      expect(Math.min(...limbs.map((l) => toSegment(l.a, l.b, a.at)))).toBeLessThan(0.4);
      anchors
        .slice(i + 1)
        .forEach((b) => expect(b.at.distanceTo(a.at)).toBeGreaterThan(spec.gap - 0.35));
    });
  });

  it("is deterministic", () => {
    expect(innerAnchors(limbs, spec)).toEqual(innerAnchors(limbs, spec));
  });

  it("grows only green crown sprays without flower clusters", () => {
    const more = flamboyantCrown({
      centre: V(0, 9, 0),
      radius: 5,
      low: 9.5,
      high: 9.8,
      per: 6,
      size: 1,
      lobes: 5,
      clusters: 0,
      seed: 3,
      anchors: innerAnchors(limbs, spec),
    });
    expect(more.length).toBeGreaterThan(0);
    more.forEach((c) => expect([TILE.leaf, TILE.shade]).toContain(c.tile));
  });
});
