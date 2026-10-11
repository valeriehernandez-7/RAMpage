import type { Page } from '../types.ts';

/** Returns the candidate that would sort first under compare, in a single pass. */
export function pickFirst(candidates: readonly Page[], compare: (a: Page, b: Page) => number): Page {
  if (candidates.length === 0) {
    throw new Error('No eviction candidates');
  }
  let best = candidates[0];
  for (const candidate of candidates) {
    if (compare(candidate, best) < 0) best = candidate;
  }
  return best;
}