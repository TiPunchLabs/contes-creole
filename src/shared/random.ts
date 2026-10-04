/** Seeded pseudo-random generator returning numbers in [0, 1). */
export type Rng = () => number;

/** Park–Miller generator (v13 `rnd`); create one per universe so layouts never depend on each other. */
export function createRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
