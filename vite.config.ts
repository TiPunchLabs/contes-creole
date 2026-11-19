import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Absolute path of a folder relative to this config file. */
const dir = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    rolldownOptions: {
      // Three pages: the app (home + tales), and the static pages "Les contes des classes" and "Le projet" (no Three.js).
      input: {
        main: dir("./index.html"),
        classes: dir("./contes-des-classes/index.html"),
        project: dir("./le-projet/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@app": dir("./src/app"),
      "@shared": dir("./src/shared"),
      "@tree": dir("./src/tree"),
      "@veillee": dir("./src/veillee"),
      "@books": dir("./src/books"),
    },
  },
});
