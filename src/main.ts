import "@fontsource/newsreader/500-italic.css";
import "@fontsource/newsreader/600-italic.css";
import "@fontsource/newsreader/800.css";
import "@fontsource/andika/400.css";
import "@fontsource/andika/400-italic.css";
import "@fontsource/andika/700.css";
import "@shared/theme/tokens.css";
import "./style.css";
import * as THREE from "three";
import { startApp } from "@app/app";
import { dismissLoader } from "@app/loader";
import { registry } from "@app/registry";
import { mountTree } from "@tree/index";

/**
 * Starts watching Three's default loading manager; `settled()` resolves once every texture
 * requested so far has loaded or failed, or at once when none was requested (e.g. no WebGL).
 */
const watchTextures = (): { settled(): Promise<void> } => {
  const manager = THREE.DefaultLoadingManager;
  let started = false;
  const done = new Promise<void>((resolve) => {
    manager.onStart = () => (started = true);
    manager.onLoad = () => resolve();
  });
  return { settled: () => (started ? done : Promise.resolve()) };
};

/** Resolves after `count` animation frames, i.e. once the scene has actually been drawn. */
const frames = (count: number): Promise<void> =>
  new Promise((resolve) => {
    const step = (left: number): void => {
      if (left === 0) resolve();
      else requestAnimationFrame(() => step(left - 1));
    };
    step(count);
  });

const root = document.querySelector<HTMLElement>("#app");
const textures = watchTextures();
if (root)
  startApp(root, {
    mountTree,
    books: registry.books,
    loadStories: registry.loadStories,
    loadNotes: registry.loadNotes,
  });
void dismissLoader(
  document.querySelector<HTMLElement>(".loader"),
  Promise.all([document.fonts.ready, textures.settled()]).then(() => frames(3)),
);
