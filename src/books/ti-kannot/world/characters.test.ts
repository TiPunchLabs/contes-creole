import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { STAGING } from "../staging";
import { createCharacters } from "./characters";
import { mixEnv } from "./env";
import { SPOTS, spotPoint, type Spot } from "./island/spots";

const ENVS = Object.values(STAGING);
const ROCK_PAGE = Object.keys(STAGING).indexOf("sa-ti-kannot-jwenn");

describe("Ti Kannot", () => {
  it("stands with his feet on his resting point", () => {
    const rest = Object.fromEntries(
      (Object.keys(SPOTS) as Spot[]).map((s) => [s, spotPoint(s)]),
    ) as Record<Spot, THREE.Vector3>;
    rest.rock = new THREE.Vector3(1, 5, 2);
    const cast = createCharacters(rest);
    cast.snap(mixEnv(ENVS, ROCK_PAGE, ROCK_PAGE, 0));
    const feet = new THREE.Box3().setFromObject(cast.group.children[0]).min.y;
    expect(feet).toBeGreaterThanOrEqual(4.95);
    expect(feet).toBeLessThan(5.1);
  });
});
