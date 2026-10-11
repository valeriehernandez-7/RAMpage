import type { Page } from '../types.ts';
import type { EvictionContext, PagingAlgorithm } from './pagingAlgorithm.ts';
import { pickFirst } from './pickFirst.ts';

const byLoadOrder = (a: Page, b: Page): number => a.loadSequence - b.loadSequence;

/**
 * FIFO that spares referenced pages: the oldest page is evicted only if its reference
 * bit is clear; otherwise the bit is cleared and the page moves to the back of the queue.
 */
export class SecondChanceAlgorithm implements PagingAlgorithm {
  readonly name = 'SC';

  selectVictim(candidates: readonly Page[], context: EvictionContext): Page {
    // After one full pass every reference bit is clear, so a victim appears within n + 1 rounds.
    for (let round = 0; round <= candidates.length; round++) {
      const oldest = pickFirst(candidates, byLoadOrder);
      if (!oldest.referenceBit) return oldest;
      oldest.referenceBit = false;
      oldest.loadSequence = context.issueSequence();
    }
    throw new Error('Second Chance found no victim');
  }

  markOf(page: Page): string {
    return page.referenceBit ? '1' : '0';
  }
}