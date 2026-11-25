import { imageCover } from "@shared/cover";
import coverUrl from "./assets/cover.webp";

/**
 * The tale's card: Mila under the bowed branch with the calabash in her hands, a frame of page 3
 * taken from the tale's own engine (`VPS=cover node qa/calebassier-view.mjs`); the night's indigo
 * while it loads.
 */
export const paintCover = imageCover({
  url: coverUrl,
  background: "#1b2750",
  crop: { x0: 0, y0: 0, x1: 1, y1: 1 },
  align: { x: 0.5, y: 0.5 },
});
