import "@fontsource/newsreader/500-italic.css";
import "@fontsource/newsreader/600-italic.css";
import "@fontsource/newsreader/800.css";
import "@fontsource/andika/400.css";
import "@fontsource/andika/400-italic.css";
import "@fontsource/andika/700.css";
import "@shared/theme/tokens.css";
import "./style.css";
import { startApp } from "@app/app";
import { registry } from "@app/registry";
import { mountVeillee } from "@veillee/index";

const root = document.querySelector<HTMLElement>("#app");
if (root)
  startApp(root, {
    mountTree: mountVeillee,
    books: registry.books,
    loadStories: registry.loadStories,
    loadNotes: registry.loadNotes,
  });
