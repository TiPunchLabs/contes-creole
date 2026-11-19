import * as THREE from "three";
import type { Rng } from "@shared/random";

/** A canvas of `w`×`h` painted by `draw`, as an sRGB texture. */
export function canvasTexture(
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  if (c) draw(c, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Scatters short translucent dabs of `colors` over a rectangle: the brush grain of the references. */
export function dabs(
  c: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: readonly string[],
  count: number,
  size: number,
  alpha = 0.18,
): void {
  for (let i = 0; i < count; i++) {
    c.globalAlpha = alpha * (0.5 + rng());
    c.fillStyle = colors[Math.floor(rng() * colors.length)] ?? "#fff";
    c.beginPath();
    c.ellipse(
      x + rng() * w,
      y + rng() * h,
      size * (0.5 + rng()),
      size * (0.2 + rng() * 0.35),
      rng() * Math.PI,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.globalAlpha = 1;
}

/** A painted rounded crown (tree top) made of overlapping lobes, darker underneath. */
export function crown(
  c: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  y: number,
  r: number,
  dark: string,
  mid: string,
  light: string,
): void {
  const lobes = 14 + Math.floor(rng() * 8);
  for (const [color, lift, scale] of [
    [dark, 0, 1],
    [mid, -0.12, 0.85],
    [light, -0.3, 0.5],
  ] as const) {
    c.fillStyle = color;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + rng() * 0.5;
      const d = r * 0.55 * scale;
      c.beginPath();
      c.arc(
        x + Math.cos(a) * d + (color === light ? -r * 0.2 : 0),
        y + Math.sin(a) * d * 0.7 + r * lift,
        r * (0.22 + rng() * 0.2) * scale,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
  // Leaf dabs breaking the round outline.
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2;
    const d = r * (0.6 + rng() * 0.45);
    c.fillStyle = rng() < 0.5 ? mid : dark;
    c.beginPath();
    c.ellipse(
      x + Math.cos(a) * d,
      y + Math.sin(a) * d * 0.75,
      r * 0.12,
      r * 0.05,
      a,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
}

/** A palm silhouette: a leaning trunk and drooping fronds. */
export function palm(
  c: CanvasRenderingContext2D,
  rng: Rng,
  x: number,
  base: number,
  height: number,
  trunk: string,
  frond: string,
): void {
  const lean = (rng() - 0.5) * height * 0.25;
  const topX = x + lean;
  const topY = base - height;
  c.strokeStyle = trunk;
  c.lineWidth = height * 0.02;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x, base);
  c.quadraticCurveTo(x + lean * 0.2, base - height * 0.5, topX, topY);
  c.stroke();
  c.strokeStyle = frond;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const len = height * (0.28 + rng() * 0.1);
    const dx = Math.cos(a) * len;
    // A frond: its rib, then short leaflets along it.
    c.lineWidth = height * 0.008;
    c.beginPath();
    c.moveTo(topX, topY);
    c.quadraticCurveTo(topX + dx * 0.6, topY - len * 0.35, topX + dx, topY + len * 0.35);
    c.stroke();
    c.lineWidth = height * 0.006;
    for (let k = 1; k < 10; k++) {
      const t = k / 10;
      const px = topX + dx * t;
      const py = topY + (-len * 0.35 * 2 * t * (1 - t) + len * 0.35 * t * t);
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + (rng() - 0.5) * len * 0.15, py + len * 0.12);
      c.stroke();
    }
  }
}
