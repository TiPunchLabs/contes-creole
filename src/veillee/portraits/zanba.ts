import type { PortraitPainter } from "../pages";
import { ease, glow, grass, ink, wash } from "./brush";

const SKIN = "#9d93ad";
const SKIN_LIGHT = "#c3b9cf";
const SKIN_DARK = "#6f6680";
const INK = "#3a3046";
const LOOP = 6.6;

/**
 * Konpè Zanba's gesture: always hungry, his trunk rises and curls towards a ripe mango, sniffs
 * twice, his ear flaps, then the trunk comes down. Returns trunk lift (0 → 1), a sniff offset and
 * the ear flap (0 → 1). Calm: the trunk raised towards the mango.
 */
export function zanbaPose(t: number, calm: boolean): { lift: number; sniff: number; flap: number } {
  if (calm) return { lift: 1, sniff: 0, flap: 0 };
  const x = t % LOOP;
  const lift = ease(x, 0.3, 1.6) - ease(x, 4.2, 5.6);
  const sniffing = x > 1.6 && x < 2.6 ? Math.sin(((x - 1.6) / 1) * Math.PI * 4) : 0;
  const flap = Math.max(0, Math.sin(Math.max(0, Math.min(1, (x - 2.6) / 0.9)) * Math.PI));
  return { lift, sniff: sniffing * 0.5, flap };
}

/** Points of the trunk's centre line from the face, curling up and forward with `lift`. */
function trunkPath(lift: number, sniff: number): [number, number][] {
  const points: [number, number][] = [];
  let x = 260;
  let y = -330;
  let angle = Math.PI / 2 + 0.25;
  const bend = -0.06 - lift * 0.17;
  for (let i = 0; i < 12; i++) {
    points.push([x, y]);
    const step = 30 - i * 1.2;
    angle += bend + (i > 8 ? sniff * 0.12 : 0);
    x += Math.cos(angle) * step * (1 + lift * 0.15);
    y += Math.sin(angle) * step;
  }
  points.push([x, y]);
  return points;
}

/** Konpè Zanba, a big elephant standing under a mango branch, painted on a page canvas. */
export const paintZanba: PortraitPainter = (c, w, h, t, calm) => {
  const { lift, sniff, flap } = zanbaPose(t, calm);
  const s = w / 860;
  c.save();
  c.translate(w * 0.5, h * 0.76);
  c.scale(s, s);

  // The mango branch, top right, with its fruit.
  ink(
    c,
    (k) => {
      k.moveTo(560, -820);
      k.quadraticCurveTo(420, -720, 330, -700);
    },
    "#5a4030",
    16,
  );
  for (const [x, y, a] of [
    [470, -780, -0.6],
    [520, -740, 0.4],
    [390, -720, 0.9],
  ] as const) {
    const leaf = (k: CanvasRenderingContext2D): void => {
      k.ellipse(x, y, 90, 26, a, 0, Math.PI * 2);
    };
    wash(c, leaf, "#4f7f43", "#7aa65a", "#355a30", 40 + x, 70);
  }
  const mango = (k: CanvasRenderingContext2D): void => {
    k.ellipse(345, -640, 46, 60, 0.3, 0, Math.PI * 2);
  };
  wash(c, mango, "#f2a33a", "#ffd166", "#d9602b", 44, 50);
  glow(c, 330, -660, 22, 18, "#fff3c4", 0.6);
  ink(c, mango, "#8a4b20", 4);

  glow(c, 0, 20, 470, 70, "#4d4258", 0.35);
  grass(c, -480, 480, 30, 80, 9);

  // Legs, then the body.
  for (const [x, wd] of [
    [-260, 95],
    [-130, 100],
    [80, 100],
    [190, 95],
  ] as const) {
    const leg = (k: CanvasRenderingContext2D): void => {
      k.roundRect(x - wd / 2, -170, wd, 190, [30, 30, 24, 24]);
    };
    wash(c, leg, x < 0 && x > -200 ? SKIN_DARK : SKIN, SKIN_LIGHT, SKIN_DARK, 50 + x, 90);
    ink(c, leg, INK, 6);
    c.fillStyle = "#e9e1d6";
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.arc(x + i * wd * 0.26, 14, 11, Math.PI, 0);
      c.fill();
    }
  }
  const body = (k: CanvasRenderingContext2D): void => {
    k.ellipse(-60, -250, 340, 210, 0, 0, Math.PI * 2);
  };
  wash(c, body, SKIN, SKIN_LIGHT, SKIN_DARK, 52, 300);
  ink(c, body, INK, 7);
  ink(
    c,
    (k) => {
      k.moveTo(-395, -270);
      k.quadraticCurveTo(-440, -200, -420, -150);
    },
    INK,
    6,
  );

  // Head.
  const head = (k: CanvasRenderingContext2D): void => {
    k.ellipse(200, -400, 140, 150, 0.15, 0, Math.PI * 2);
  };
  wash(c, head, SKIN, SKIN_LIGHT, SKIN_DARK, 53, 150);

  // Trunk: a tapered painted stroke along its centre line.
  const path = trunkPath(lift, sniff);
  c.save();
  c.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, y0] = path[i] ?? [0, 0];
      const [x1, y1] = path[i + 1] ?? [0, 0];
      const width = 78 - i * 4.6;
      c.strokeStyle = pass === 0 ? INK : i % 2 ? SKIN : SKIN_LIGHT;
      c.lineWidth = pass === 0 ? width + 10 : width;
      c.globalAlpha = pass === 0 ? 0.7 : 1;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
  }
  c.restore();
  // Trunk wrinkles.
  path.slice(1, -2).forEach(([x, y], i) => {
    if (i % 2) return;
    ink(c, (k) => k.arc(x, y, 22 - i, 0.3, 1.4), SKIN_DARK, 3);
  });

  // Ear: a big fan behind the eye, flapping forward.
  c.save();
  c.translate(110, -420);
  c.scale(1 - flap * 0.35, 1);
  const earShape = (k: CanvasRenderingContext2D): void => {
    k.moveTo(0, -110);
    k.bezierCurveTo(-210, -170, -250, 60, -120, 130);
    k.bezierCurveTo(-60, 160, 10, 90, 10, 20);
    k.closePath();
  };
  wash(c, earShape, SKIN_LIGHT, "#d9cfe2", SKIN, 54, 160);
  glow(c, -110, 0, 80, 90, "#e4b4be", 0.35);
  ink(c, earShape, INK, 6);
  c.restore();

  // Tusk, eye and a happy cheek.
  ink(
    c,
    (k) => {
      k.moveTo(250, -330);
      k.quadraticCurveTo(300, -290, 320, -320);
    },
    "#f3ead8",
    16,
  );
  c.fillStyle = "#2a2033";
  c.beginPath();
  c.ellipse(230, -440, 13, 16, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(234, -446, 4.5, 0, Math.PI * 2);
  c.fill();
  ink(c, (k) => k.arc(230, -440, 26, Math.PI * 1.15, Math.PI * 1.8), INK, 4);
  glow(c, 255, -390, 34, 22, "#e8a0b0", 0.4);
  c.restore();
};
