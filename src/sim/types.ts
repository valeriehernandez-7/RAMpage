export type PagingAlgorithmName = 'FIFO' | 'SC' | 'LRU' | 'LFU' | 'OPT';

/** Algorithms the user can pick; OPT always runs alongside as the baseline. */
export type SelectableAlgorithmName = Exclude<PagingAlgorithmName, 'OPT'>;

export type Operation =
  | { readonly kind: 'new'; readonly pid: number; readonly sizeBytes: number }
  | { readonly kind: 'use'; readonly ptr: number }
  | { readonly kind: 'delete'; readonly ptr: number }
  | { readonly kind: 'kill'; readonly pid: number };

/**
 * A virtual page. Algorithm bookkeeping lives here because the spec requires
 * each page to carry whatever data its paging algorithm needs.
 */
export interface Page {
  readonly id: number;
  readonly pid: number;
  readonly ptr: number;
  inRam: boolean;
  /** RAM frame number while in RAM (M-ADDR). */
  frame: number | null;
  /** Disk slot while swapped out (D-ADDR). */
  diskSlot: number | null;
  /** Clock time when the page was last brought into RAM (LOADED-T). */
  loadedAtS: number | null;
  /** Monotonic counters give deterministic ordering for FIFO, SC and LRU ties. */
  loadSequence: number;
  lastAccessSequence: number;
  accessCount: number;
  referenceBit: boolean;
}

export interface PointerAllocation {
  readonly ptr: number;
  readonly pid: number;
  readonly sizeBytes: number;
  readonly pageIds: readonly number[];
}

export interface SimulationStats {
  clockS: number;
  thrashingS: number;
  hitCount: number;
  faultCount: number;
  runningProcessCount: number;
  ramPageCount: number;
  diskPageCount: number;
  internalFragmentationBytes: number;
}

export interface PageActivity {
  /** Pages hit or loaded by the most recent operation. */
  readonly touchedPageIds: readonly number[];
  /** Pages moved to disk to make room during the most recent operation. */
  readonly evictedPageIds: readonly number[];
}
