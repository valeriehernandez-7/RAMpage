import type { Operation, PagingAlgorithmName } from '../types.ts';
import { FifoAlgorithm } from './fifo.ts';
import { LfuAlgorithm } from './lfu.ts';
import { LruAlgorithm } from './lru.ts';
import { OptimalAlgorithm } from './optimal.ts';
import type { PagingAlgorithm } from './pagingAlgorithm.ts';
import { SecondChanceAlgorithm } from './secondChance.ts';

/** operations is the full sequence; only OPT needs it, to look ahead. */
export function createAlgorithm(name: PagingAlgorithmName, operations: readonly Operation[]): PagingAlgorithm {
  switch (name) {
    case 'FIFO':
      return new FifoAlgorithm();
    case 'SC':
      return new SecondChanceAlgorithm();
    case 'LRU':
      return new LruAlgorithm();
    case 'LFU':
      return new LfuAlgorithm();
    case 'OPT':
      return new OptimalAlgorithm(operations);
  }
}