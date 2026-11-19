import type { PortraitPainter } from "../pages";
import { ease, glow, grass, ink, wash } from "./brush";

const FUR = "#a98f78";
const FUR_LIGHT = "#d2bca3";
const FUR_DARK = "#7a634f";
const CREAM = "#f1e3cc";
const INK = "#4a3426";
const PINK = "#e7a3a0";
/** Length of one gesture loop, in seconds. */
const LOOP = 5.2;

/**
 * Konpè Lapen's gesture: his right ear pivots towards a sound, then his eyes follow it; both come
 * back. Returns the ear turn (0 → 1) and the gaze (-1 left … 1 right). Calm: ear turned, eyes aside.
 */
export function lapenPose(t: number, calm: boolean): { ear: number; gaze: number } {
  if (calm) return { ear: 1, gaze: 1 };
  const x = t % LOOP;
  const ear = ease(x, 0.2, 0.75) - ease(x, 3.3, 3.9);
  const gaze = ease(x, 0.75, 1.25) - ease(x, 3.9, 4.4);
  return { ear, gaze };
}

/** An ear from its base, leaning by `angle` radians, `len` long. */
function ear(c: CanvasRenderingContext2D, len: number, width: number): void {
  c.moveTo(-width * 0.5, 0);
  c.bezierCurveTo(-width * 0.9, -len * 0.45, -width * 0.5, -len * 0.95, 0, -len);
  c.bezierCurveTo(width * 0.55, -len * 0.95, width * 0.85, -len * 0.45, width * 0.5, 0);
  c.closePath();
}

/** Konpè Lapen, a small sitting rabbit seen three-quarters, painted on a page canvas. */
export const paintLapen: PortraitPainter = (c, w, h, t, calm) => {
  const { ear: turn, gaze } = lapenPose(t, calm);
  const s = w / 820;
  c.save();
  c.translate(w * 0.5, h * 0.72);
  c.scale(s, s);

  glow(c, 0, 20, 330, 60, "#6b5a3e", 0.35);
  grass(c, -380, 380, 30, 70, 5);

  // Back ear (left), steady; the front ear (right) pivots on its base towards the sound.
  const ears: [number, number, number][] = [
    [-60, -400, -0.18],
    [40, -405, 0.12 + turn * 0.55],
  ];
  ears.forEach(([x, y, angle], i) => {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    const shape = (k: CanvasRenderingContext2D): void => ear(k, 300, 92);
    wash(c, shape, FUR, FUR_LIGHT, FUR_DARK, 11 + i, 90);
    c.save();
    c.scale(0.55, 0.85);
    wash(c, shape, PINK, "#f3c4bd", "#c98584", 21 + i, 60);
    c.restore();
    ink(c, shape, INK, 6);
    c.restore();
  });

  // Body: a round sitting back, haunch and cream chest.
  const body = (k: CanvasRenderingContext2D): void => {
    k.ellipse(-20, -130, 230, 200, -0.1, 0, Math.PI * 2);
  };
  wash(c, body, FUR, FUR_LIGHT, FUR_DARK, 3, 220);
  ink(c, body, INK, 7);
  const haunch = (k: CanvasRenderingContext2D): void => {
    k.ellipse(-120, -60, 140, 110, 0.3, 0, Math.PI * 2);
  };
  wash(c, haunch, FUR_LIGHT, CREAM, FUR, 4, 140);
  ink(c, haunch, INK, 5);
  const chest = (k: CanvasRenderingContext2D): void => {
    k.ellipse(80, -150, 110, 150, 0.15, 0, Math.PI * 2);
  };
  wash(c, chest, CREAM, "#fff6e6", "#d9c4a4", 6, 120);
  // Feet and tail.
  for (const [x, y, rx] of [
    [40, 10, 70],
    [150, 15, 60],
    [-230, -40, 0],
  ] as const) {
    if (!rx) continue;
    const foot = (k: CanvasRenderingContext2D): void => {
      k.ellipse(x, y, rx, 30, 0, 0, Math.PI * 2);
    };
    wash(c, foot, CREAM, "#fff6e6", FUR_LIGHT, 7 + x, 60);
    ink(c, foot, INK, 5);
  }
  const tail = (k: CanvasRenderingContext2D): void => {
    k.arc(-250, -60, 48, 0, Math.PI * 2);
  };
  wash(c, tail, "#fbf3e6", "#ffffff", CREAM, 8, 50);

  // Head.
  const head = (k: CanvasRenderingContext2D): void => {
    k.ellipse(40, -330, 135, 118, 0.05, 0, Math.PI * 2);
  };
  wash(c, head, FUR, FUR_LIGHT, FUR_DARK, 9, 130);
  ink(c, head, INK, 7);
  const muzzle = (k: CanvasRenderingContext2D): void => {
    k.ellipse(100, -295, 62, 48, 0, 0, Math.PI * 2);
  };
  wash(c, muzzle, CREAM, "#fff6e6", FUR_LIGHT, 10, 60);
  glow(c, 120, -330, 30, 22, "#e88c86", 0.35);

  // Eyes: a sly half-closed lid, the pupil sliding with the gaze.
  for (const [x, r] of [
    [10, 30],
    [118, 24],
  ] as const) {
    c.fillStyle = "#fffaf0";
    c.beginPath();
    c.ellipse(x, -350, r, r * 1.05, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#2b1d14";
    c.beginPath();
    c.arc(x + gaze * r * 0.42, -348, r * 0.55, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(x + gaze * r * 0.42 + r * 0.2, -356, r * 0.16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = FUR;
    c.beginPath();
    c.ellipse(x, -350 - r * 0.62, r * 1.15, r * 0.6, 0, Math.PI, Math.PI * 2);
    c.fill();
    ink(c, (k) => k.ellipse(x, -350, r, r * 1.05, 0, Math.PI * 1.05, Math.PI * 1.95), INK, 5);
  }

  // Nose, smile and whiskers.
  c.fillStyle = PINK;
  c.beginPath();
  c.ellipse(140, -308, 16, 11, 0, 0, Math.PI * 2);
  c.fill();
  ink(
    c,
    (k) => {
      k.moveTo(140, -297);
      k.quadraticCurveTo(138, -278, 112, -276);
      k.moveTo(140, -297);
      k.quadraticCurveTo(150, -272, 170, -282);
    },
    INK,
    4,
  );
  ink(
    c,
    (k) => {
      for (const [dy, dx] of [
        [-10, 120],
        [6, 130],
        [20, 110],
      ]) {
        k.moveTo(150, -300 + dy * 0.4);
        k.lineTo(150 + dx, -310 + dy * 1.6);
      }
    },
    "#5b4636",
    2.5,
  );
  c.restore();
};
