import { CARD } from "./palette";

/**
 * Paints the invitation card's window: a blank ruled page with its first words just begun and a
 * quill resting on them — a story still to write, never a locked book.
 */
export function paintInvitationCover(c: CanvasRenderingContext2D, W: number, H: number): void {
  c.fillStyle = CARD.paperWarm;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = CARD.locked;
  c.lineWidth = 3;
  c.globalAlpha = 0.6;
  c.beginPath();
  for (let y = 230; y < H * 0.62; y += 46) {
    c.moveTo(70, y);
    c.lineTo(W - 70, y);
  }
  c.stroke();
  c.globalAlpha = 1;

  // The first words: a hand-drawn ink wave on the top line.
  c.strokeStyle = CARD.inkSoft;
  c.lineWidth = 5;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(78, 222);
  for (let x = 78; x <= 230; x += 4) c.lineTo(x, 222 - Math.abs(Math.sin(x / 9)) * 12);
  c.stroke();
  c.lineCap = "butt";

  // Quill: its nib rests where the words stop, the feather rises to the upper right.
  c.save();
  c.translate(236, 226);
  c.rotate(-0.8);
  c.fillStyle = CARD.ink;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(40, -34, 190, -12);
  c.quadraticCurveTo(70, 18, 0, 0);
  c.fill();
  c.strokeStyle = CARD.paper;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(6, -1);
  c.quadraticCurveTo(80, -14, 186, -12);
  c.stroke();
  c.restore();
}
