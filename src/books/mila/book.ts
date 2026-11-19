import { defineBook } from "@app/contract";
import { art, paintCover } from "./cover";

export default defineBook({
  id: "mila",
  order: 4,
  ready: true,
  card: {
    short: "Mila",
    title: "Mila et le lambi qui avait perdu son chant",
    sub: "Un soir, au bord de la mer",
    theme: "La mer",
    lang: "fr",
  },
  cover: paintCover,
  art,
  immersive: () => import("./world/index"),
});
