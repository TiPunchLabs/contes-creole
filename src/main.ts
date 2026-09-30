import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/500.css";
import "@fontsource/quicksand/600.css";
import "./style.css";
import { startApp } from "@app/app";
import { registry } from "@app/registry";
import { mountTree } from "@tree/index";

const root = document.querySelector<HTMLElement>("#app");
if (root) startApp(root, { mountTree, books: registry.books, loadStories: registry.loadStories });
