import { CARD } from "./palette";

/** Paints a locked book's card: warm paper, faint diagonal hatching and a solid padlock. */
export function paintLockedCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  c.fillStyle = CARD.paperWarm;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = CARD.locked;
  c.globalAlpha = 0.35;
  c.lineWidth = 12;
  c.beginPath();
  for (let x = -H; x < W; x += 34) {
    c.moveTo(x, H);
    c.lineTo(x + H, 0);
  }
  c.stroke();
  c.globalAlpha = 1;
  const x = W / 2;
  const y = H * 0.38;
  c.strokeStyle = CARD.inkSoft;
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(x - 30, y + 10);
  c.lineTo(x - 30, y - 6);
  c.arc(x, y - 6, 30, Math.PI, 0);
  c.lineTo(x + 30, y + 10);
  c.stroke();
  c.fillStyle = CARD.inkSoft;
  c.beginPath();
  c.roundRect(x - 48, y + 4, 96, 74, 12);
  c.fill();
  c.fillStyle = CARD.paperWarm;
  c.beginPath();
  c.arc(x, y + 34, 9, 0, Math.PI * 2);
  c.fill();
  c.fillRect(x - 3, y + 38, 6, 20);
}
