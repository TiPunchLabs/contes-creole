import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { STAGING } from "../staging";
import { mixEnv } from "./env";
import { createFauna } from "./fauna";

const ENVS = Object.values(STAGING);
const NIGHT = Object.keys(STAGING).indexOf("on-mache");
const RAIN = Object.keys(STAGING).indexOf("ye-mistrikrik");
const FLOWERS = Array.from({ length: 60 }, (_, i): [number, number, number] => [i, 1, -i]);

/** How much of each kind shows (1 = full size, 0 = gone): [butterflies, frigatebirds]. */
function shown(page: number): number[] {
  const fauna = createFauna(FLOWERS);
  fauna.update(mixEnv(ENVS, page, page, 0), 3);
  return fauna.group.children.map(
    (c) => ((c as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uShow.value as number,
  );
}

describe("createFauna", () => {
  it("flies butterflies and frigatebirds by day", () => {
    expect(shown(1)).toEqual([1, 1]);
  });

  it("sends everyone home at night", () => {
    expect(shown(NIGHT)).toEqual([0, 0]);
  });

  it("keeps the butterflies out of the rain, not the frigatebirds", () => {
    expect(shown(RAIN)).toEqual([0, 1]);
  });

  it("keeps a small number of butterflies, however many flowers there are", () => {
    const [butterflies] = createFauna(FLOWERS).group.children as THREE.Mesh[];
    const wings = (butterflies.geometry.getIndex()?.count ?? 0) / 6;
    expect(wings / 2).toBeLessThanOrEqual(18);
    expect(wings / 2).toBeGreaterThan(8);
  });

  it("copes with an island without flowers", () => {
    const fauna = createFauna([]);
    expect(() => fauna.update(mixEnv(ENVS, 0, 0, 0), 0)).not.toThrow();
  });
});
