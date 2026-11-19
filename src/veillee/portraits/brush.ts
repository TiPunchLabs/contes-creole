import { createRng } from "@shared/random";

/** Smooth 0 → 1 between `a` and `b`. */
export function ease(x: number, a: number, b: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Fills `shape` like a gouache wash: a base coat, then a few offset translucent coats of a lighter
 * and a darker tone, so flat areas carry brush unevenness. Deterministic for a given `seed`.
 */
export function wash(
  c: CanvasRenderingContext2D,
  shape: (c: CanvasRenderingContext2D) => void,
  base: string,
  light: string,
  dark: string,
  seed: number,
  scale: number,
): void {
  // Park–Miller needs a positive seed (a negative one yields negative draws).
  const rng = createRng(Math.abs(Math.round(seed)) + 1);
  c.save();
  c.beginPath();
  shape(c);
  c.fillStyle = base;
  c.fill();
  c.clip();
  for (let i = 0; i < 14; i++) {
    c.globalAlpha = 0.07 + rng() * 0.08;
    c.fillStyle = i % 3 === 0 ? dark : light;
    c.beginPath();
    c.ellipse(
      (rng() - 0.5) * 2 * scale,
      (rng() - 0.5) * 2 * scale,
      scale * (0.3 + rng() * 0.6),
      scale * (0.15 + rng() * 0.35),
      rng() * Math.PI,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.restore();
}

/** Draws a soft outline along `shape` in a painted dark tone. */
export function ink(
  c: CanvasRenderingContext2D,
  shape: (c: CanvasRenderingContext2D) => void,
  color: string,
  width: number,
): void {
  c.save();
  c.beginPath();
  shape(c);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineJoin = c.lineCap = "round";
  c.globalAlpha = 0.75;
  c.stroke();
  c.restore();
}

/** A soft round glow (ground shadow, cheek blush), drawn as a radial gradient. */
export function glow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  alpha: number,
): void {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, rx, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** A few short grass strokes along a ground line, painted green to straw. */
export function grass(
  c: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  height: number,
  seed: number,
): void {
  const rng = createRng(Math.abs(Math.round(seed)) + 1);
  c.save();
  c.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = x0 + rng() * (x1 - x0);
    const h = height * (0.4 + rng() * 0.6);
    c.strokeStyle = rng() < 0.7 ? "#6f9a4a" : "#b9b25e";
    c.globalAlpha = 0.55 + rng() * 0.35;
    c.lineWidth = 2 + rng() * 3;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + (rng() - 0.5) * h * 0.6, y - h * 0.6, x + (rng() - 0.5) * h, y - h);
    c.stroke();
  }
  c.restore();
}
