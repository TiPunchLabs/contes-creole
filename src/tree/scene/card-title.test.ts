import { describe, expect, it } from "vitest";
import { fitTitle } from "./card-title";

/** Every character is 0.5 em wide: easy widths to reason about. */
const width = (text: string, size: number): number => text.length * size * 0.5;
const MAX = 392;

describe("fitTitle", () => {
  it("keeps a short title at full size", () => {
    const fit = fitTitle("Ti Kannot é Gwo Rako", MAX, width);
    expect(fit.size).toBe(50);
    expect(fit.lines.join(" ")).toBe("Ti Kannot é Gwo Rako");
    expect(fit.lines).toHaveLength(2);
  });

  it("steps down to 40 px for a three-line title, as on Mila's card", () => {
    const fit = fitTitle("Mila et le lambi qui avait perdu son chant", MAX, width);
    expect(fit.size).toBe(40);
    expect(fit.lines).toHaveLength(3);
    for (const line of fit.lines) expect(width(line, fit.size)).toBeLessThanOrEqual(MAX);
  });

  it("steps down again rather than overflow", () => {
    const fit = fitTitle("abcde ".repeat(10).trim(), MAX, width);
    expect(fit.size).toBe(34);
    expect(fit.lines.length).toBeLessThanOrEqual(3);
    for (const line of fit.lines) expect(width(line, fit.size)).toBeLessThanOrEqual(MAX);
  });

  it("ends a title too long for three lines with an ellipsis, never wider than the card", () => {
    const fit = fitTitle("mot ".repeat(60).trim(), MAX, width);
    expect(fit.size).toBe(34);
    expect(fit.lines).toHaveLength(3);
    expect(fit.lines[2].endsWith("…")).toBe(true);
    for (const line of fit.lines) expect(width(line, fit.size)).toBeLessThanOrEqual(MAX);
  });

  it("shrinks a single word wider than the card instead of letting it overflow", () => {
    const fit = fitTitle("Anticonstitutionnellement", MAX, width);
    expect(fit.size).toBe(34);
    expect(fit.lines.every((line) => width(line, fit.size) <= MAX)).toBe(true);
  });

  it("cuts an overwide word on any line and keeps the lines that fit (TREE-R2)", () => {
    const fit = fitTitle("Anticonstitutionnellement un conte", MAX, width);
    expect(fit.size).toBe(34);
    expect(fit.lines).toHaveLength(2);
    expect(fit.lines[0].endsWith("…")).toBe(true);
    expect(fit.lines[1]).toBe("un conte");
    for (const line of fit.lines) expect(width(line, fit.size)).toBeLessThanOrEqual(MAX);
  });
});
