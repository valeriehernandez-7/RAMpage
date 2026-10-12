import type { Page } from '../types.ts';
import type { PagingAlgorithm } from './pagingAlgorithm.ts';
import { pickFirst } from './pickFirst.ts';

/** Evicts the page whose last access is the oldest. */
export class LruAlgorithm implements PagingAlgorithm {
  readonly name = 'LRU';

  selectVictim(candidates: readonly Page[]): Page {
    return pickFirst(candidates, (a, b) => a.lastAccessSequence - b.lastAccessSequence);
  }

  markOf(page: Page): string {
    return String(page.lastAccessSequence);
  }
}