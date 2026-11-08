import { imageCover } from "@shared/cover";
import posterUrl from "./assets/cover.webp";

/**
 * Ti Kannot's card, laid out like every tale's: the owner's poster cut to its island, river and
 * village, between the painted title above and the "Un conte créole" line below (the card's frame
 * carries the tale's title); the poster's peach sky while it loads.
 */
export const paintCover = imageCover({
  url: posterUrl,
  background: "#f6c9a0",
  crop: { x0: 0, y0: 270 / 960, x1: 1, y1: 832 / 960 },
  align: { x: 0.5, y: 0.5 },
});
