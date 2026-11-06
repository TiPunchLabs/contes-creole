import { describe, expect, it } from "vitest";
import { conchGroove } from "./scene";

/** The prototype's expression, copied as written (mila-monde-v3.html, `conchGeometry` → `surf`). */
// prettier-ignore
const prototypeFactor = (th: number, y: number, sp: number): number =>
  1-.14*sp*(((th/(Math.PI*2))+(1-y)*4.4)%1+1)%1;

describe("conchGroove", () => {
  it("keeps the prototype's operator grouping over the whole shell", () => {
    for (let i = 0; i <= 72; i++) {
      const th = -Math.PI + (i / 72) * Math.PI * 2;
      for (const y of [-0.82, -0.3, 0, 0.44, 0.58, 0.64, 0.7, 1]) {
        for (const sp of [0, 0.5, 1]) {
          expect(1 - conchGroove(th, y, sp)).toBeCloseTo(prototypeFactor(th, y, sp), 12);
        }
      }
    }
  });
});
