// Rounded rocks resting in the shallows all around the coast, as on the poster.
import { createRng } from "@shared/random";
import { sightlines, stages, stoneBlocks, type HousePlan, type StonePlacement } from "./landscape";
import { islandHeight, riverDistance } from "./terrain";

/** Ground height where the shore rocks sit: just under the waterline, in the foam. */
const WATERLINE = -0.2;
const COUNT = 26;
const ATTEMPTS = 140;
/** River mouth kept clear, so the river still meets the sea in open water. */
const MOUTH_CLEAR = 3;
/** No rock within this distance of a story camera, so none fills the foreground of a page. */
const CAMERA_CLEAR = 8;
const SPACING = 1.1;
/** The boulder shape of `STONES`. */
const BOULDER = 1;

/** Point on the ray from the island centre at angle `a` where the ground drops under the waterline. */
function shoreAt(a: number): [number, number] | null {
  for (let r = 12; r < 26; r += 0.1) {
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (islandHeight(x, z) < WATERLINE) return [x, z];
  }
  return null;
}

/**
 * Shore rocks in small groups around the coast, from their own RNG (the island's layout does not
 * move). They stay off the river mouth, away from the story cameras and out of every sightline.
 */
export function shorePlan(houses: HousePlan[]): StonePlacement[] {
  const rng = createRng(41);
  const lines = sightlines(houses);
  const cameras = stages().map((s) => s.camera);
  const rocks: StonePlacement[] = [];
  for (let i = 0; i < ATTEMPTS && rocks.length < COUNT; i++) {
    const at = shoreAt(rng() * Math.PI * 2);
    const out = rng();
    const scale = 0.55 + rng() * 0.6;
    const yaw = rng() * Math.PI * 2;
    const twin = rng() < 0.45;
    if (!at) continue;
    const [sx, sz] = at;
    const k = 1 + out * 0.06;
    const rock: StonePlacement = { kind: BOULDER, x: sx * k, z: sz * k, scale, yaw, sink: 0.3 };
    const group = twin
      ? [
          rock,
          {
            ...rock,
            x: rock.x + Math.cos(yaw) * 0.8,
            z: rock.z + Math.sin(yaw) * 0.8,
            scale: scale * 0.55,
          },
        ]
      : [rock];
    const fits = group.every(
      (r) =>
        riverDistance(r.x, r.z) > MOUTH_CLEAR &&
        cameras.every((c) => Math.hypot(c.x - r.x, c.z - r.z) > CAMERA_CLEAR) &&
        rocks.every((o) => Math.hypot(o.x - r.x, o.z - r.z) > SPACING) &&
        stoneBlocks(r, lines).length === 0,
    );
    if (fits) rocks.push(...group);
  }
  return rocks;
}
