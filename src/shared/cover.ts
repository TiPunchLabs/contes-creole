/**
 * The tree's cover window on its 512×720 card (`src/tree/scene/cards.ts`: 28 px margin, 76 px
 * header, window bottom at 66 %), with a small bleed under the frame.
 */
export const COVER_WINDOW = { x: 22, y: 70, w: 468, h: 411 } as const;

/** A book's picture shown in the tree's cover window. */
export interface ImageCover {
  url: string;
  /** Painted behind the window while the picture loads. */
  background: string;
  /** Part of the picture that may be shown, as fractions of the source. */
  crop: { x0: number; y0: number; x1: number; y1: number };
  /**
   * Which side of the crop is kept when it is trimmed to the window's proportions: 0 keeps the
   * left (top) edge, 1 the right (bottom) edge, 0.5 the centre.
   */
  align: { x: number; y: number };
}

/** Source rectangle of a crop fitted to a window's proportions, never stretched. */
export function fitCrop(
  spec: Pick<ImageCover, "crop" | "align">,
  image: { width: number; height: number },
  window: { w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const { crop, align } = spec;
  const cw = (crop.x1 - crop.x0) * image.width;
  const ch = (crop.y1 - crop.y0) * image.height;
  const scale = Math.max(window.w / cw, window.h / ch);
  const w = window.w / scale;
  const h = window.h / scale;
  return {
    x: crop.x0 * image.width + (cw - w) * align.x,
    y: crop.y0 * image.height + (ch - h) * align.y,
    w,
    h,
  };
}

/**
 * Builds a book's `cover` painter: the picture, cropped to the tree's cover window; the background
 * colour while it loads (the returned promise asks the tree for one more paint).
 */
export function imageCover(
  spec: ImageCover,
): (c: CanvasRenderingContext2D, W: number, H: number) => void | Promise<void> {
  let image: HTMLImageElement | null = null;
  return (c, W, H) => {
    c.globalAlpha = 1;
    c.fillStyle = spec.background;
    c.fillRect(0, 0, W, H);
    if (!image) {
      image = new Image();
      image.decoding = "async";
      image.src = spec.url;
    }
    if (!image.complete || !image.naturalWidth) return image.decode();
    const sx = W / 512;
    const sy = H / 720;
    const dw = COVER_WINDOW.w * sx;
    const dh = COVER_WINDOW.h * sy;
    const src = fitCrop(
      spec,
      { width: image.naturalWidth, height: image.naturalHeight },
      { w: dw, h: dh },
    );
    c.drawImage(
      image,
      src.x,
      src.y,
      src.w,
      src.h,
      COVER_WINDOW.x * sx,
      COVER_WINDOW.y * sy,
      dw,
      dh,
    );
  };
}
