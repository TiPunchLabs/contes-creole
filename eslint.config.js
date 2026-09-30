import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const MAX_DEPTH = 6;
const UNIVERSE_MESSAGE =
  "A universe may only import its own files, @shared/* and @app/contract (see the universes spec §3).";

/** Pattern rejecting any import that climbs `levels` folders or more. */
const climbs = (levels) => ({ regex: `^(\\.\\./){${levels}}`, message: UNIVERSE_MESSAGE });

/** One config per nesting depth, so a relative import can never leave the universe folder. */
function universe(root, forbidden) {
  return Array.from({ length: MAX_DEPTH }, (_, depth) => ({
    files: [`${root}/${"*/".repeat(depth)}*.ts`],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [climbs(depth + 1), { regex: forbidden, message: UNIVERSE_MESSAGE }] },
      ],
    },
  }));
}

/** Shell and toolbox layers: aliases and relative paths into the listed folders are rejected. */
function layer(files, folders, message) {
  const names = folders.join("|");
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { regex: `^@(${names})(/|$)`, message },
            { regex: `^(\\.\\./)+(${names})(/|$)`, message },
          ],
        },
      ],
    },
  };
}

export default tseslint.config(
  { ignores: ["dist", "design"] },
  {
    files: ["**/*.{ts,js}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
  },
  ...universe("src/tree", "^@(books|tree)(/|$)|^@app/(?!contract$)"),
  ...universe("src/books/*", "^@(books|tree)(/|$)|^@app/(?!contract$)"),
  layer(
    ["src/app/**/*.ts"],
    ["tree", "books"],
    "The app reaches books only through the registry glob.",
  ),
  layer(["src/shared/**/*.ts"], ["app", "tree", "books"], "src/shared is a leaf toolbox."),
);
