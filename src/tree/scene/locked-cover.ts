import { createRng } from "@shared/random";

/** Paints a locked book's card: dark gradient, grain and a padlock. */
export function paintLockedCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(7);
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#141a22");
  bg.addColorStop(1, "#0c1014");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = `rgba(255,240,200,${rnd() * 0.05})`;
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  c.strokeStyle = "rgba(180,200,210,.35)";
  c.lineWidth = 3;
  c.beginPath();
  c.arc(W / 2, H * 0.38, 34, Math.PI, 0);
  c.moveTo(W / 2 - 34, H * 0.38);
  c.lineTo(W / 2 - 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.38);
  c.stroke();
  c.fillStyle = "rgba(180,200,210,.35)";
  c.beginPath();
  c.arc(W / 2, H * 0.5, 6, 0, Math.PI * 2);
  c.fill();
}
