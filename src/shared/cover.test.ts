import { describe, expect, it } from "vitest";
import { COVER_WINDOW, fitCrop } from "./cover";

const WINDOW = { w: COVER_WINDOW.w, h: COVER_WINDOW.h };
const ratio = (r: { w: number; h: number }): number => r.w / r.h;

describe("fitCrop", () => {
  it("keeps the window's proportions, so a picture is never stretched", () => {
    const r = fitCrop(
      { crop: { x0: 0, y0: 0, x1: 1, y1: 1 }, align: { x: 0.5, y: 0.5 } },
      { width: 640, height: 960 },
      WINDOW,
    );
    expect(ratio(r)).toBeCloseTo(ratio(WINDOW), 6);
  });

  it("stays inside the crop and trims from the side opposite the alignment", () => {
    const spec = { crop: { x0: 0.33, y0: 0.12, x1: 1, y1: 1 }, align: { x: 1, y: 1 } };
    const r = fitCrop(spec, { width: 1536, height: 1024 }, WINDOW);
    expect(r.x).toBeGreaterThanOrEqual(0.33 * 1536 - 1e-6);
    expect(r.y).toBeGreaterThanOrEqual(0.12 * 1024 - 1e-6);
    expect(r.x + r.w).toBeCloseTo(1536, 6);
    expect(r.y + r.h).toBeCloseTo(1024, 6);
  });

  it("centres a crop already in the window's shape", () => {
    const r = fitCrop(
      { crop: { x0: 0, y0: 270 / 960, x1: 1, y1: 832 / 960 }, align: { x: 0.5, y: 0.5 } },
      { width: 640, height: 960 },
      WINDOW,
    );
    expect(r.x).toBeCloseTo(0, 0);
    expect(r.w).toBeCloseTo(640, 0);
    expect(r.y).toBeGreaterThanOrEqual(270 - 1);
    expect(r.y + r.h).toBeLessThanOrEqual(832 + 1);
  });
});
