import { createRng } from "@shared/random";
import { describe, expect, it } from "vitest";
import { restingPoints } from "./perches";
import { createSource } from "./source";
import { SPOTS } from "./spots";
import { islandHeight } from "./terrain";
import { createVegetation } from "./vegetation";
import { createVillage } from "./village";

const rng = createRng(17);
const vegetation = createVegetation(rng);
const village = createVillage(rng);
const source = createSource(rng);
const rest = restingPoints([...vegetation.canopies, village.group, source.group]);

/** Ground height under a spot. */
const ground = (spot: keyof typeof SPOTS): number => islandHeight(...SPOTS[spot]);

describe("restingPoints", () => {
  it("rests on top of the big rock, not inside it", () => {
    expect(rest.rock.y).toBeGreaterThan(ground("rock") + 2);
  });

  it("rests on the roof ridge, the reservoir rim and the flamboyant's crown", () => {
    expect(rest.roof.y).toBeGreaterThan(ground("roof") + 2.5);
    expect(rest.tank.y).toBeCloseTo(ground("tank") + 1.42, 1);
    expect(rest.perch.y).toBeGreaterThan(ground("perch") + 2.5);
  });

  it("rests on the ground where nothing stands", () => {
    expect(rest.bank.y).toBeCloseTo(ground("bank"));
  });
});
