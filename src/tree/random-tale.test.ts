import { describe, expect, it } from "vitest";
import type { BookManifest } from "@app/contract";
import { createRng } from "@shared/random";
import { INVITATION, treeSlots } from "./invitation";
import { eligibleTales, pickRandomTale } from "./random-tale";

/** A minimal book manifest for the tests. */
function book(id: string, extra: Partial<BookManifest> = {}): BookManifest {
  return { id, order: 1, ready: true, card: { title: id, sub: "", theme: "" }, ...extra };
}

const world = () => Promise.resolve({ default: { mount: () => ({}) } }) as never;
const immersive = () => Promise.resolve({ default: { mount: () => ({}) } }) as never;
const ti = book("ti-kannot", { world });
const mila = book("mila", { immersive });
const pending = book("zanba", { ready: false });
const noWorld = book("cover-only");

describe("eligibleTales", () => {
  it("keeps only ready books with a universe, never the invitation or pending books", () => {
    const slots = treeSlots([ti, pending, mila, noWorld]);
    expect(slots).toContain(INVITATION);
    expect(eligibleTales(slots).map((b) => b.id)).toEqual(["ti-kannot", "mila"]);
  });

  it("never takes a ready-flagged invitation for a tale", () => {
    expect(eligibleTales([{ ...INVITATION, ready: true }, INVITATION])).toEqual([]);
  });
});

describe("pickRandomTale", () => {
  it("maps the random draw evenly over the eligible tales", () => {
    const slots = treeSlots([ti, mila]);
    expect(pickRandomTale(slots, () => 0)?.id).toBe("ti-kannot");
    expect(pickRandomTale(slots, () => 0.49)?.id).toBe("ti-kannot");
    expect(pickRandomTale(slots, () => 0.5)?.id).toBe("mila");
    expect(pickRandomTale(slots, () => 0.999999)?.id).toBe("mila");
  });

  it("opens the only tale when there is one", () => {
    expect(pickRandomTale(treeSlots([mila, pending]), () => 0.73)?.id).toBe("mila");
  });

  it("returns null when no tale can be opened", () => {
    expect(pickRandomTale(treeSlots([pending, noWorld]), () => 0.5)).toBeNull();
    expect(pickRandomTale([], () => 0)).toBeNull();
  });

  it("gives every tale about the same share with a seeded generator", () => {
    const rng = createRng(5);
    const slots = treeSlots([ti, mila, book("third", { world })]);
    const counts = new Map<string, number>();
    for (let i = 0; i < 3000; i++) {
      const id = pickRandomTale(slots, rng)?.id ?? "none";
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual(["mila", "third", "ti-kannot"]);
    for (const n of counts.values()) expect(Math.abs(n - 1000)).toBeLessThan(120);
  });
});
