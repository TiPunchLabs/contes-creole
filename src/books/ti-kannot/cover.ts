import { createRng } from "@shared/random";

/** Paints Ti Kannot's card: night river, moon, the golden bird on a branch, the red crab. */
export function paintCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(23);
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b1f33");
  bg.addColorStop(0.55, "#155a63");
  bg.addColorStop(1, "#0a2a30");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = `rgba(255,240,200,${rnd() * 0.05})`;
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  const mx = W * 0.68,
    my = H * 0.24,
    mr = 46;
  const glow = c.createRadialGradient(mx, my, mr, mx, my, mr * 4);
  glow.addColorStop(0, "rgba(246,211,138,.35)");
  glow.addColorStop(1, "rgba(246,211,138,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#f6e3b0";
  c.beginPath();
  c.arc(mx, my, mr, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 90; i++) {
    c.fillStyle = `rgba(255,245,220,${0.3 + rnd() * 0.6})`;
    c.beginPath();
    c.arc(rnd() * W, rnd() * H * 0.45, 0.8 + rnd() * 1.6, 0, Math.PI * 2);
    c.fill();
  }
  // River flowing towards the viewer, moon reflection.
  c.fillStyle = "#2f9a98";
  c.beginPath();
  c.moveTo(W * 0.47, H * 0.5);
  c.quadraticCurveTo(W * 0.3, H * 0.7, W * 0.12, H);
  c.lineTo(W * 0.92, H);
  c.quadraticCurveTo(W * 0.6, H * 0.7, W * 0.53, H * 0.5);
  c.fill();
  for (let i = 0; i < 40; i++) {
    const yy = H * (0.52 + rnd() * 0.46),
      t = (yy - H * 0.5) / (H * 0.5);
    c.strokeStyle = `rgba(255,240,200,${0.15 + rnd() * 0.5})`;
    c.lineWidth = 1 + rnd() * 1.5;
    const cx = W * (0.5 + t * 0.18) + (rnd() - 0.5) * W * 0.25 * t;
    c.beginPath();
    c.moveTo(cx, yy);
    c.lineTo(cx + 8 + rnd() * 24, yy);
    c.stroke();
  }
  c.fillStyle = "#071c22";
  c.beginPath();
  c.moveTo(0, H * 0.5);
  c.quadraticCurveTo(W * 0.25, H * 0.42, W * 0.47, H * 0.5);
  c.quadraticCurveTo(W * 0.3, H * 0.7, W * 0.12, H);
  c.lineTo(0, H);
  c.fill();
  c.beginPath();
  c.moveTo(W, H * 0.5);
  c.quadraticCurveTo(W * 0.75, H * 0.44, W * 0.53, H * 0.5);
  c.quadraticCurveTo(W * 0.6, H * 0.7, W * 0.92, H);
  c.lineTo(W, H);
  c.fill();
  // Ti Kannot (golden bird) on a branch at the left, Gwo Rako (crab) at the right.
  c.strokeStyle = "#c98a4a";
  c.lineWidth = 4;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(0, H * 0.6);
  c.quadraticCurveTo(W * 0.12, H * 0.56, W * 0.24, H * 0.58);
  c.stroke();
  c.fillStyle = "#f2c46d";
  c.beginPath();
  c.ellipse(W * 0.2, H * 0.555, 14, 9, -0.3, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(W * 0.225, H * 0.535, 6.5, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(W * 0.187, H * 0.552);
  c.lineTo(W * 0.155, H * 0.53);
  c.lineTo(W * 0.16, H * 0.56);
  c.fill();
  c.fillStyle = "#e07a3a";
  c.beginPath();
  c.moveTo(W * 0.237, H * 0.535);
  c.lineTo(W * 0.26, H * 0.54);
  c.lineTo(W * 0.237, H * 0.545);
  c.fill();
  const rx = W * 0.78,
    ry = H * 0.66;
  c.fillStyle = "#d9603a";
  c.beginPath();
  c.ellipse(rx, ry, 30, 19, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#d9603a";
  c.lineWidth = 4;
  for (const d of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(rx + d * 22, ry + i * 5);
      c.lineTo(rx + d * (36 + i * 6), ry + 8 + i * 7);
      c.lineTo(rx + d * (42 + i * 6), ry + 20 + i * 5);
      c.stroke();
    }
  }
  for (const d of [-1, 1]) {
    c.beginPath();
    c.arc(rx + d * 40, ry - 16, 11, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f6e3b0";
    c.beginPath();
    c.arc(rx + d * 8, ry - 22, 4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d9603a";
  }
  for (let i = 0; i < 26; i++) {
    c.fillStyle = `rgba(90,230,210,${0.4 + rnd() * 0.6})`;
    c.beginPath();
    c.arc(rnd() * W, H * (0.55 + rnd() * 0.45), 1 + rnd() * 2.2, 0, Math.PI * 2);
    c.fill();
  }
}
