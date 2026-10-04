import { createRng, type Rng } from "@shared/random";

/** Soft watercolour stain: jittered translucent ellipses around (x, y). */
function wash(
  c: CanvasRenderingContext2D,
  rnd: Rng,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  alpha: number,
  blots = 14,
): void {
  c.fillStyle = color;
  for (let i = 0; i < blots; i++) {
    c.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    c.beginPath();
    c.ellipse(
      x + (rnd() - 0.5) * rx * 0.5,
      y + (rnd() - 0.5) * ry * 0.5,
      rx * (0.6 + rnd() * 0.5),
      ry * (0.6 + rnd() * 0.5),
      (rnd() - 0.5) * 0.4,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.globalAlpha = 1;
}

/** Ti Kannot as a small sucrier: dark back, yellow belly, white brow. */
function bird(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.fillStyle = "#3b3940";
  c.beginPath();
  c.ellipse(x, y, 16, 11, -0.2, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x + 15, y - 8, 8, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f4c21b";
  c.beginPath();
  c.ellipse(x + 3, y + 4, 11, 6, -0.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f7f3e8";
  c.fillRect(x + 11, y - 12, 10, 2);
}

/** Gwo Rako as a red crab with one big claw. */
function crab(c: CanvasRenderingContext2D, rnd: Rng, x: number, y: number): void {
  wash(c, rnd, x, y, 30, 16, "#d8452f", 0.8, 8);
  c.strokeStyle = "#d8452f";
  c.lineWidth = 5;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.arc(x + side * 34, y - 16, side > 0 ? 13 : 10, 0, Math.PI * 1.6);
    c.stroke();
  }
}

/** Paints Ti Kannot's card: a watercolour island, its river, the bird on a flamboyant, the crab. */
export function paintCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(23);
  c.fillStyle = "#f3ead6";
  c.fillRect(0, 0, W, H);
  const sky = c.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "#a9dde3");
  sky.addColorStop(1, "#f8dcc0");
  c.globalAlpha = 0.85;
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H * 0.55);
  c.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    wash(
      c,
      rnd,
      rnd() * W,
      H * (0.08 + rnd() * 0.25),
      60 + rnd() * 50,
      16 + rnd() * 10,
      "#ffffff",
      0.25,
    );
  }
  wash(c, rnd, W * 0.12, H * 0.5, 70, 22, "#8fb9a8", 0.25);
  wash(c, rnd, W * 0.9, H * 0.49, 80, 26, "#9cc0ae", 0.25);

  const sea = c.createLinearGradient(0, H * 0.48, 0, H);
  sea.addColorStop(0, "#9fe0d4");
  sea.addColorStop(1, "#3fb3a8");
  c.fillStyle = sea;
  c.fillRect(0, H * 0.48, W, H * 0.52);
  wash(c, rnd, W * 0.5, H * 0.63, W * 0.42, H * 0.08, "#efdcaa", 0.5);
  wash(c, rnd, W * 0.5, H * 0.59, W * 0.36, H * 0.08, "#8cc56a", 0.45);

  c.globalAlpha = 0.85;
  c.fillStyle = "#5f9a63";
  c.beginPath();
  c.moveTo(W * 0.28, H * 0.6);
  c.quadraticCurveTo(W * 0.45, H * 0.3, W * 0.5, H * 0.3);
  c.quadraticCurveTo(W * 0.56, H * 0.3, W * 0.74, H * 0.6);
  c.fill();
  c.globalAlpha = 1;
  wash(c, rnd, W * 0.5, H * 0.31, 46, 12, "#ffffff", 0.35);

  c.strokeStyle = "#7fd8e0";
  c.lineWidth = 9;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(W * 0.49, H * 0.36);
  c.bezierCurveTo(W * 0.42, H * 0.48, W * 0.56, H * 0.55, W * 0.52, H * 0.68);
  c.stroke();

  for (const [x, y] of [
    [0.32, 0.52],
    [0.66, 0.5],
    [0.4, 0.45],
  ] as const) {
    c.fillStyle = "#7a4e30";
    c.fillRect(W * x - 3, H * y, 6, 26);
    wash(c, rnd, W * x, H * y, 30, 14, "#e0523a", 0.55, 10);
  }

  const hx = W * 0.68;
  const hy = H * 0.55;
  c.fillStyle = "#e8b864";
  c.fillRect(hx, hy, 34, 22);
  c.fillStyle = "#c0432f";
  c.beginPath();
  c.moveTo(hx - 5, hy);
  c.lineTo(hx + 17, hy - 16);
  c.lineTo(hx + 39, hy);
  c.fill();

  c.strokeStyle = "rgba(255,255,255,.6)";
  c.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W;
    const y = H * (0.72 + rnd() * 0.26);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 12, y - 4, x + 26, y);
    c.stroke();
  }

  bird(c, W * 0.32, H * 0.48);
  crab(c, rnd, W * 0.58, H * 0.76);
  c.fillStyle = "#7a4a2c";
  c.beginPath();
  c.ellipse(W * 0.25, H * 0.86, 40, 9, 0.15, 0, Math.PI);
  c.fill();

  for (let i = 0; i < 6000; i++) {
    c.fillStyle = `rgba(120,90,60,${rnd() * 0.05})`;
    c.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }
  const edge = c.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.35,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.62,
  );
  edge.addColorStop(0, "rgba(243,234,214,0)");
  edge.addColorStop(1, "rgba(243,234,214,.9)");
  c.fillStyle = edge;
  c.fillRect(0, 0, W, H);
  const foot = c.createLinearGradient(0, H * 0.62, 0, H);
  foot.addColorStop(0, "rgba(20,70,80,0)");
  foot.addColorStop(1, "rgba(20,70,80,.7)");
  c.fillStyle = foot;
  c.fillRect(0, H * 0.62, W, H * 0.38);
}
