import { defineBook } from "@app/contract";
import { paintCover } from "./cover";

export default defineBook({
  id: "ti-kannot",
  order: 1,
  ready: false,
  card: { title: "Ti Kannot é Gwo Rako", sub: "Larivyè-la té swèf", theme: "Dlo · L’eau" },
  cover: paintCover,
});
