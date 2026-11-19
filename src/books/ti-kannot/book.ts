import { defineBook } from "@app/contract";
import { art, paintCover } from "./cover";

export default defineBook({
  id: "ti-kannot",
  order: 1,
  ready: true,
  card: {
    short: "Ti Kannot",
    title: "Ti Kannot é Gwo Rako",
    sub: "Larivyè-la té swèf",
    theme: "Dlo · L’eau",
  },
  cover: paintCover,
  art,
  world: () => import("./world/index"),
});
