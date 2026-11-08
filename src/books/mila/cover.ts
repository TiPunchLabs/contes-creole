import { imageCover } from "@shared/cover";
import coverUrl from "./assets/cover.webp";

/**
 * Mila's card: Mila, the moon and the big conch, cut from the supplied painting with its own
 * proportions; trimmed from the left (open sky) first; the prototype's night while it loads.
 */
export const paintCover = imageCover({
  url: coverUrl,
  background: "#06161b",
  crop: { x0: 507 / 1536, y0: 124 / 1024, x1: 1, y1: 1 },
  align: { x: 1, y: 1 },
});
