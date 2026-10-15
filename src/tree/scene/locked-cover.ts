import { createRng } from "@shared/random";

/** Paints a locked book's card: warm paper gradient, grain and a padlock (v14). */
export function paintLockedCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  const rnd = createRng(7);
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#f6e8cf");
  bg.addColorStop(1, "#ead6b2");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = `rgba(120,80,50,${rnd() * 0.04})`;
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  c.strokeStyle = "#a0805e";
  c.lineWidth = 5;
  c.beginPath();
  c.arc(W / 2, H * 0.38, 34, Math.PI, 0);
  c.moveTo(W / 2 - 34, H * 0.38);
  c.lineTo(W / 2 - 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.46);
  c.lineTo(W / 2 + 34, H * 0.38);
  c.stroke();
  c.fillStyle = "#a0805e";
  c.beginPath();
  c.arc(W / 2, H * 0.5, 7, 0, Math.PI * 2);
  c.fill();
}
