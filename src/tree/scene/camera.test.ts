import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { OPENING_T, cardT, hubCam, openingBack, openingWeight, progressOf } from "./camera";

describe("cardT", () => {
  it("puts a single book in the middle of the climb", () => {
    expect(cardT(0, 1)).toBe(0.5);
  });

  it.each([2, 3, 5])("spreads %i books over [0.2, 0.88], strictly increasing", (count) => {
    const ts = Array.from({ length: count }, (_, i) => cardT(i, count));
    expect(ts[0]).toBeCloseTo(0.2);
    expect(ts[count - 1]).toBeCloseTo(0.88);
    ts.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(ts[i]));
  });
});

describe("hubCam", () => {
  it("starts low and far, ends high and closer (v14 path)", () => {
    const out = new THREE.Vector3();
    const look = new THREE.Vector3();
    hubCam(0, out, look);
    expect(out.y).toBeCloseTo(1.3);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(20);
    hubCam(1, out, look);
    expect(out.y).toBeCloseTo(7.7);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(16);
  });
});

describe("opening view", () => {
  /** The cards' hanging points, as `createCards` places them. */
  const cardsAt = (count: number): THREE.Vector3[] =>
    Array.from({ length: count }, (_, i) => {
      const eye = new THREE.Vector3();
      const a = hubCam(cardT(i, count), eye, new THREE.Vector3()) + (i % 2 ? 0.06 : -0.06);
      return new THREE.Vector3(Math.cos(a) * 12.2, eye.y + 0.3, Math.sin(a) * 12.2);
    });
  /** Screen position (px) of `p` from the opening camera on a `w`×`h` screen with `fov`. */
  const onScreen = (p: THREE.Vector3, w: number, h: number, fov: number, back = 0) => {
    const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 600);
    const look = new THREE.Vector3();
    hubCam(OPENING_T, camera.position, look);
    camera.position
      .sub(look)
      .multiplyScalar(1 + back / camera.position.length())
      .add(look);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    const v = p.clone().project(camera);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, ndcX: v.x };
  };

  it("frames Ti Kannot on the left and Mila on the right as in the owner's reference", () => {
    // Reference capture: 1064×928 cropped evenly from a wider window (the shelf is centred, the
    // climb bar cut off), so a 50° field; Ti Kannot ≈ (163, 730), Mila ≈ (975, 640).
    const [tk, mila] = cardsAt(3);
    const fov = 50;
    const a = onScreen(tk, 1064, 928, fov);
    const b = onScreen(mila, 1064, 928, fov);
    expect(Math.abs(a.x - 163)).toBeLessThan(25);
    expect(Math.abs(a.y - 730)).toBeLessThan(25);
    expect(Math.abs(b.x - 975)).toBeLessThan(25);
    expect(Math.abs(b.y - 640)).toBeLessThan(25);
  });

  it("maps the opening to the top of the climb bar", () => {
    expect(progressOf(OPENING_T)).toBe(0);
    expect(progressOf(0)).toBe(1);
  });

  it("backs off only on narrow screens, enough to fit both books", () => {
    const books = cardsAt(3).slice(0, 2);
    expect(openingBack(books, 50, 1920 / 918)).toBe(0);
    const back = openingBack(books, 78, 390 / 844);
    expect(back).toBeGreaterThan(0);
    for (const p of books)
      expect(Math.abs(onScreen(p, 390, 844, 78, back).ndcX)).toBeLessThanOrEqual(0.77);
    expect(Math.abs(onScreen(books[1], 390, 844, 78).ndcX)).toBeGreaterThan(1);
  });

  it("fades the back-off out before the next book down the spiral", () => {
    expect(openingWeight(OPENING_T)).toBe(1);
    expect(openingWeight(0.6)).toBe(0);
    expect(openingWeight(cardT(1, 3))).toBe(0);
  });
});
