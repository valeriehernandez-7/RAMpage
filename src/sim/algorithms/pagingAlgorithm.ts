import type { Page, PagingAlgorithmName } from '../types.ts';

export interface EvictionContext {
  /** Index of the operation being executed; OPT looks ahead from here. */
  readonly operationIndex: number;
  /** Issues a fresh load sequence number; Second Chance uses it to requeue a page. */
  issueSequence(): number;
}

/**
 * A page replacement policy. The MMU keeps each page's bookkeeping up to date, so a
 * policy only decides which page leaves RAM when a frame is needed.
 */
export interface PagingAlgorithm {
  readonly name: PagingAlgorithmName;
  /** Candidates are the RAM pages not pinned by the current operation; never empty. */
  selectVictim(candidates: readonly Page[], context: EvictionContext): Page;
  /** Value shown in the MMU table's MARK column. */
  markOf(page: Page): string;
}