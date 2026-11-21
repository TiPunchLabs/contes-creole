import { describe, expect, it } from "vitest";
import { readTreeChoice } from "./choice";

describe("readTreeChoice", () => {
  it("reads the three trees when the preview is enabled", () => {
    expect(readTreeChoice("?tree=current", true)).toBe("current");
    expect(readTreeChoice("?tree=a", true)).toBe("a");
    expect(readTreeChoice("?lite=1&tree=b", true)).toBe("b");
  });

  it("keeps the public journey without the parameter or with an unknown value", () => {
    expect(readTreeChoice("", true)).toBeNull();
    expect(readTreeChoice("?tree=c", true)).toBeNull();
    expect(readTreeChoice("?tree=", true)).toBeNull();
  });

  it("ignores the parameter in a build without the preview", () => {
    expect(readTreeChoice("?tree=a", false)).toBeNull();
    expect(readTreeChoice("?tree=b", false)).toBeNull();
  });
});
