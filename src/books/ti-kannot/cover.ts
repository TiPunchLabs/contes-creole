import posterUrl from "./assets/cover.webp";

/** The poster's sky, behind the picture while it loads. */
const PEACH = "#f6c9a0";

/**
 * The tree's poster window on its 512×720 card (`src/tree/scene/cards.ts`: 28 px side margin,
 * 18 px top and bottom), with a small bleed under the frame. Its 2:3 shape is the poster's own.
 */
const WINDOW = { x: 26, y: 15, w: 460, h: 690 };

let image: HTMLImageElement | null = null;

/** The poster, requested on first use and shared by every repaint. */
function poster(): HTMLImageElement {
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = posterUrl;
  }
  return image;
}

/** Paints the card: the owner's poster, whole and unstretched; its sky colour while it loads. */
export function paintCover(
  c: CanvasRenderingContext2D,
  W: number,
  H: number,
): void | Promise<void> {
  c.globalAlpha = 1;
  c.fillStyle = PEACH;
  c.fillRect(0, 0, W, H);
  const img = poster();
  if (!img.complete || !img.naturalWidth) return img.decode();
  const sx = W / 512;
  const sy = H / 720;
  c.drawImage(img, WINDOW.x * sx, WINDOW.y * sy, WINDOW.w * sx, WINDOW.h * sy);
}
