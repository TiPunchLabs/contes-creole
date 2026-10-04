import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Absolute path of a folder relative to this config file. */
const dir = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@app": dir("./src/app"),
      "@shared": dir("./src/shared"),
      "@tree": dir("./src/tree"),
      "@books": dir("./src/books"),
    },
  },
});
