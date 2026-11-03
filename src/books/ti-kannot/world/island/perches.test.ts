import { createRng } from "@shared/random";
import { describe, expect, it } from "vitest";
import { islandPlan, YARD } from "./landscape";
import { restingPoints } from "./perches";
import { createReservoir } from "./reservoir";
import { createScenery } from "./scenery";
import { createSource } from "./source";
import { SPOTS } from "./spots";
import { islandHeight } from "./terrain";

const scenery = createScenery();
const reservoir = createReservoir();
const source = createSource(createRng(17));
const rest = restingPoints([...scenery.perches, reservoir.group, source.group]);

/** Ground height under a spot. */
const ground = (spot: keyof typeof SPOTS): number => islandHeight(...SPOTS[spot]);

describe("restingPoints", () => {
  it("rests on top of the big rock, not inside it", () => {
    expect(rest.rock.y).toBeGreaterThan(ground("rock") + 2);
  });

  it("rests on Gwo Rako's ridge, the reservoir rim and the flamboyant's crown", () => {
    const house = islandPlan().houses.find((h) => h.yard === YARD);
    expect(house).toBeDefined();
    if (house) expect(rest.roof.y).toBeGreaterThan(house.y + house.top - 0.2);
    expect(rest.roof.y).toBeGreaterThan(ground("roof") + 2.5);
    expect(rest.tank.y).toBeCloseTo(ground("tank") + 1.42, 1);
    expect(rest.perch.y).toBeGreaterThan(ground("perch") + 2.5);
    // Ti Kannot keeps the height validated on the pilot (page 2 framing), whatever the crown's shape.
    expect(rest.perch.y).toBeCloseTo(5.24, 1);
  });

  it("rests on the ground where nothing stands", () => {
    expect(rest.bank.y).toBeCloseTo(ground("bank"));
    expect(rest.ford.y).toBeCloseTo(Math.max(0, ground("ford")));
    expect(rest.yard.y).toBeCloseTo(ground("yard"));
  });
});
