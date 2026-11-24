/**
 * What stands on the ground of the garden, as a height field built from the triangles of the set's
 * solids (roots, steps, wall feet): how high the highest of them is over any place. Pure geometry,
 * no rendering: the walk asks it where a whole shoe can land, the QA probe asks it whether any
 * point of a shoe is inside a solid.
 */
export interface Terrain {
  /**
   * Height above `floor` of the highest solid surface over the place (x, z), among those between
   * `floor` and `floor + reach` (default 0.6 m); 0 on open ground.
   */
  heightAt(x: number, z: number, floor: number, reach?: number): number;
}

/** Side of the squares the triangles are sorted into (metres). */
const CELL = 0.25;
/** A surface this close to the floor is the floor. */
const SKIN = 0.02;

/**
 * Builds the height field from world-space triangles, nine numbers each (x, y, z of three
 * corners). Triangles are sorted once into squares of the ground plan; a query reads one square.
 */
export function createTerrain(triangles: ArrayLike<number>): Terrain {
  const cells = new Map<number, number[]>();
  const key = (i: number, j: number): number => (i + 4096) * 8192 + (j + 4096);
  for (let t = 0; t < triangles.length; t += 9) {
    const xs = [triangles[t], triangles[t + 3], triangles[t + 6]];
    const zs = [triangles[t + 2], triangles[t + 5], triangles[t + 8]];
    const i0 = Math.floor(Math.min(...xs) / CELL);
    const i1 = Math.floor(Math.max(...xs) / CELL);
    const j0 = Math.floor(Math.min(...zs) / CELL);
    const j1 = Math.floor(Math.max(...zs) / CELL);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = key(i, j);
        const list = cells.get(k);
        if (list) list.push(t);
        else cells.set(k, [t]);
      }
    }
  }
  return {
    heightAt(x, z, floor, reach = 0.6) {
      const list = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
      if (!list) return 0;
      let top = 0;
      for (const t of list) {
        const ax = triangles[t];
        const az = triangles[t + 2];
        const bx = triangles[t + 3];
        const bz = triangles[t + 5];
        const cx = triangles[t + 6];
        const cz = triangles[t + 8];
        // Where the vertical through (x, z) meets the triangle, in its own coordinates.
        const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        if (Math.abs(det) < 1e-12) continue;
        const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
        const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
        const w = 1 - u - v;
        if (u < 0 || v < 0 || w < 0) continue;
        const y = u * triangles[t + 1] + v * triangles[t + 4] + w * triangles[t + 7] - floor;
        if (y > SKIN && y <= reach && y > top) top = y;
      }
      return top;
    },
  };
}

/** The sole of a shoe on the ground plan, from its ankle: metres to the toe, the heel, each side. */
export interface Sole {
  front: number;
  back: number;
  half: number;
}

/**
 * Margin added round a sole when the ground is asked what stands under it (metres): wide for a
 * foot in the air, which must clear what it passes; narrow for a foot set down, which would
 * otherwise be held up over bare ground by a stone it only comes near.
 */
export const SOLE_MARGIN = { swing: 0.02, planted: 0.008 } as const;

/**
 * The highest solid under a whole sole: fifteen places over the footprint (heel to toe, side to
 * side, `margin` beyond), not the one under the ankle. `x`, `z` is the ankle on the ground plan,
 * `sin` and `cos` those of the heading the toes point to.
 */
export function highestUnderSole(
  terrain: Terrain,
  sole: Sole,
  x: number,
  z: number,
  sin: number,
  cos: number,
  floor: number,
  margin: number = SOLE_MARGIN.swing,
  reach?: number,
): number {
  let top = 0;
  const from = -sole.back - margin;
  const length = sole.front + sole.back + 2 * margin;
  for (let a = 0; a < 5; a++) {
    const along = from + (length * a) / 4;
    for (let b = -1; b <= 1; b++) {
      const across = b * (sole.half + margin);
      const h = terrain.heightAt(
        x + across * cos + along * sin,
        z - across * sin + along * cos,
        floor,
        reach,
      );
      if (h > top) top = h;
    }
  }
  return top;
}
