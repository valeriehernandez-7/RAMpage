import type { Page } from '../types.ts';
import type { PagingAlgorithm } from './pagingAlgorithm.ts';
import { pickFirst } from './pickFirst.ts';

/**
 * Evicts the page with the fewest accesses since it was loaded. Ties go to the page
 * loaded first, which keeps the choice deterministic.
 */
export class LfuAlgorithm implements PagingAlgorithm {
  readonly name = 'LFU';

  selectVictim(candidates: readonly Page[]): Page {
    return pickFirst(candidates, (a, b) => a.accessCount - b.accessCount || a.loadSequence - b.loadSequence);
  }

  markOf(page: Page): string {
    return String(page.accessCount);
  }
}