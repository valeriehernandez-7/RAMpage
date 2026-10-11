import type { Page } from '../types.ts';
import type { PagingAlgorithm } from './pagingAlgorithm.ts';
import { pickFirst } from './pickFirst.ts';

/** Evicts the page that has been in RAM the longest. */
export class FifoAlgorithm implements PagingAlgorithm {
  readonly name = 'FIFO';

  selectVictim(candidates: readonly Page[]): Page {
    return pickFirst(candidates, (a, b) => a.loadSequence - b.loadSequence);
  }

  markOf(): string {
    return '';
  }
}