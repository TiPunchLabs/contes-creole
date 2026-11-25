import { defineBook } from "@app/contract";
import { paintCover } from "./cover";

export default defineBook({
  id: "mila-calebassier",
  order: 5,
  ready: true,
  card: {
    title: "Mila et le calebassier magique",
    sub: "Une lumière confiée, une promesse",
    theme: "Le jardin",
    lang: "fr",
  },
  cover: paintCover,
  world: () => import("./world/index"),
});
