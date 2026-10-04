import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

/** Returns the no-restricted-imports messages ESLint reports for `code` placed at `filePath`. */
async function violations(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports").map((m) => m.message);
}

describe("universe isolation", () => {
  it.each([
    ["src/tree/index.ts", 'import "../books/ti-kannot/book";'],
    ["src/tree/scene/cards.ts", 'import "@books/ti-kannot/book";'],
    ["src/tree/scene/cards.ts", 'import "../../app/contract";'],
    ["src/books/ti-kannot/world/index.ts", 'import "../../zanba/book";'],
    ["src/books/ti-kannot/book.ts", 'import "@tree/index";'],
    ["src/books/ti-kannot/book.ts", 'import "@books/zanba/book";'],
    ["src/books/ti-kannot/book.ts", 'import "@app/registry";'],
    ["src/app/app.ts", 'import "@tree/index";'],
    ["src/app/story/parse.ts", 'import "../../books/ti-kannot/book";'],
    ["src/shared/math.ts", 'import "@app/contract";'],
    ["src/shared/three/stage.ts", 'import "../../tree/index";'],
  ])("%s rejects %s", async (file, code) => {
    expect(await violations(file, code)).not.toHaveLength(0);
  });

  it.each([
    ["src/tree/scene/cards.ts", 'import "../overlay/overlay";'],
    ["src/tree/scene/cards.ts", 'import "@app/contract";'],
    ["src/tree/scene/cards.ts", 'import "@shared/math";'],
    ["src/books/ti-kannot/world/index.ts", 'import "../staging";'],
    ["src/books/ti-kannot/world/index.ts", 'import "@shared/three/stage";'],
    ["src/app/app.ts", 'import "./contract";'],
    ["src/main.ts", 'import "@tree/index";'],
  ])("%s allows %s", async (file, code) => {
    expect(await violations(file, code)).toHaveLength(0);
  });
});
