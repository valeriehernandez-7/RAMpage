export type RandomSource = () => number;

const UINT32_RANGE = 2 ** 32;

/**
 * Deterministic PRNG (mulberry32). Math.random() cannot be seeded, and the spec
 * requires that the same seed reproduces the same scenario.
 * Returns floats in [0, 1).
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    // Magic constants are part of the published mulberry32 algorithm.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

/** Integer in [min, max], both inclusive. */
export function randomInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}