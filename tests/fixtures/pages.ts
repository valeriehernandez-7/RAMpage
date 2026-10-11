import type { EvictionContext } from '../../src/sim/algorithms/pagingAlgorithm.ts';
import type { Page } from '../../src/sim/types.ts';

/** Builds a RAM page with neutral bookkeeping; tests override only what matters. */
export function makePage(overrides: Partial<Page> & Pick<Page, 'id'>): Page {
  return {
    pid: 1,
    ptr: 1,
    inRam: true,
    frame: 0,
    diskSlot: null,
    loadedAtS: 0,
    loadSequence: 0,
    lastAccessSequence: 0,
    accessCount: 1,
    referenceBit: false,
    ...overrides,
  };
}

/** Context for algorithms that ignore it; each call issues a larger sequence number. */
export function makeContext(operationIndex = 0, firstSequence = 1000): EvictionContext {
  let sequence = firstSequence;
  return { operationIndex, issueSequence: () => sequence++ };
}