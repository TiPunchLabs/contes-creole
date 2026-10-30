import { describe, expect, it } from "vitest";
import { placeFiche } from "./overlay";

const FICHE = { width: 380, height: 180 };
const WIDE = { width: 1440, shelfTop: 808 };
const NARROW = { width: 390, shelfTop: 752 };
const TABLET = { width: 768, shelfTop: 930 };

describe("placeFiche, wide", () => {
  it("puts the fiche right of a card on the left half, with a leader from the card's edge", () => {
    // card centre y 420, point below it at 520: half-width 60
    const box = placeFiche({ x: 500, y: 520, cy: 420 }, FICHE, WIDE);
    expect(box).toEqual({ left: 608, top: 330, line: [560, 420, 608, 420] });
  });

  it("puts the fiche left of a card on the right half", () => {
    const box = placeFiche({ x: 900, y: 520, cy: 420 }, FICHE, WIDE);
    expect(box.left).toBe(900 - 60 - 48 - 380);
    expect(box.line).toEqual([840, 420, 792, 420]);
  });

  it("keeps clear of the climb bar and of the top of the screen", () => {
    const box = placeFiche({ x: 719, y: 140, cy: 40 }, FICHE, WIDE);
    expect(box.top).toBe(104);
    expect(box.left + FICHE.width).toBeLessThanOrEqual(WIDE.width - 48);
    // leader ends inside the fiche's height even when the card is above it
    expect(box.line?.[3]).toBe(104 + 20);
  });

  it("never lets the fiche slide under the shelf", () => {
    const box = placeFiche({ x: 500, y: 860, cy: 760 }, FICHE, WIDE);
    expect(box.top + FICHE.height).toBeLessThanOrEqual(WIDE.shelfTop - 14);
  });

  it("drops the leader when clamping pushes the fiche over the card", () => {
    const box = placeFiche({ x: 800, y: 1000, cy: 300 }, FICHE, WIDE);
    expect(box.line).toBeNull();
  });
});

describe("placeFiche, narrow", () => {
  const docked = { width: 358, height: 170 };

  it("docks the fiche centred above the shelf, whatever the card's position", () => {
    const a = placeFiche({ x: 120, y: 300, cy: 220 }, docked, NARROW);
    const b = placeFiche({ x: 260, y: 360, cy: 280 }, docked, NARROW);
    expect(a.left).toBe(16);
    expect(placeFiche({ x: 300, y: 300, cy: 220 }, { width: 480, height: 170 }, TABLET).left).toBe(
      144,
    );
    expect(a.top).toBe(752 - 170 - 14);
    expect(b.top).toBe(a.top);
  });

  it("drops a vertical leader from below the card to the fiche", () => {
    const box = placeFiche({ x: 200, y: 330, cy: 250 }, docked, NARROW);
    expect(box.line).toEqual([200, 330, 200, 568]);
  });

  it("keeps the leader over the fiche", () => {
    expect(placeFiche({ x: 4, y: 330, cy: 250 }, docked, NARROW).line?.[0]).toBe(40);
  });

  it("decides on the card's centre, so a card bottom sliding past the fiche top never toggles it", () => {
    const above = placeFiche({ x: 200, y: 560, cy: 480 }, docked, NARROW);
    const below = placeFiche({ x: 200, y: 580, cy: 500 }, docked, NARROW);
    expect(above.line).toEqual([200, 560, 200, 568]);
    expect(below.line).toEqual([200, 568, 200, 568]);
    expect(placeFiche({ x: 200, y: 700, cy: 620 }, docked, NARROW).line).toBeNull();
  });
});
