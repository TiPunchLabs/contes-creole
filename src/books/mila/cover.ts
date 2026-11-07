import coverUrl from "./assets/cover.webp";

/** Night behind the picture while it loads (prototype `--nuit`). */
const NIGHT = "#06161b";

/**
 * Part of the picture shown on the card, as fractions of the source: Mila, the moon and the big
 * conch, with the picture's own proportions (no stretching).
 */
const CROP = { x0: 507 / 1536, y0: 124 / 1024, x1: 1, y1: 1 };

/**
 * The tree's cover window on its 512×720 card (`src/tree/scene/cards.ts`: 28 px margin, 76 px
 * header, window bottom at 66 %), with a small bleed under the frame.
 */
const WINDOW = { x: 22, y: 70, w: 468, h: 411 };

let image: HTMLImageElement | null = null;

/** The card picture, requested on first use and shared by every repaint. */
function picture(): HTMLImageElement {
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = coverUrl;
  }
  return image;
}

/** Paints Mila's card: the supplied painting, cropped to the window; night while it loads. */
export function paintCover(
  c: CanvasRenderingContext2D,
  W: number,
  H: number,
): void | Promise<void> {
  c.globalAlpha = 1;
  c.fillStyle = NIGHT;
  c.fillRect(0, 0, W, H);
  const img = picture();
  if (!img.complete || !img.naturalWidth) return img.decode();
  const sx = W / 512;
  const sy = H / 720;
  const dw = WINDOW.w * sx;
  const dh = WINDOW.h * sy;
  const cw = (CROP.x1 - CROP.x0) * img.naturalWidth;
  const ch = (CROP.y1 - CROP.y0) * img.naturalHeight;
  // Fit the crop to the window's proportions, trimming the left (open sky) first.
  const scale = Math.max(dw / cw, dh / ch);
  const w = dw / scale;
  const h = dh / scale;
  const x = CROP.x1 * img.naturalWidth - w;
  const y = CROP.y1 * img.naturalHeight - h;
  c.drawImage(img, x, y, w, h, WINDOW.x * sx, WINDOW.y * sy, dw, dh);
}
