import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Absolute path of a folder relative to this config file. */
const dir = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    rolldownOptions: {
      // Two pages: the tree app, and "Les contes des classes" (a static page, no Three.js).
      input: {
        main: dir("./index.html"),
        classes: dir("./contes-des-classes/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@app": dir("./src/app"),
      "@shared": dir("./src/shared"),
      "@tree": dir("./src/tree"),
      "@books": dir("./src/books"),
    },
  },
});
