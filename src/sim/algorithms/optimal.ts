import type { Operation, Page } from '../types.ts';
import type { EvictionContext, PagingAlgorithm } from './pagingAlgorithm.ts';
import { pickFirst } from './pickFirst.ts';

const NEVER = Number.POSITIVE_INFINITY;

/**
 * Bélády's optimal algorithm: evicts the page whose next use lies furthest in the
 * future. Feasible only because the whole sequence is known before simulating.
 * Ties (typically pages never used again) go to the page loaded first.
 */
export class OptimalAlgorithm implements PagingAlgorithm {
  readonly name = 'OPT';

  /** For each ptr, the ascending indices of the operations that use it. */
  private readonly usesByPointer = new Map<number, number[]>();

  constructor(operations: readonly Operation[]) {
    operations.forEach((operation, index) => {
      if (operation.kind !== 'use') return;
      const uses = this.usesByPointer.get(operation.ptr);
      if (uses === undefined) {
        this.usesByPointer.set(operation.ptr, [index]);
      } else {
        uses.push(index);
      }
    });
  }

  selectVictim(candidates: readonly Page[], context: EvictionContext): Page {
    const nextUse = (page: Page): number => this.nextUseAfter(page.ptr, context.operationIndex);
    return pickFirst(
      candidates,
      (a, b) => compareDescending(nextUse(a), nextUse(b)) || a.loadSequence - b.loadSequence,
    );
  }

  /** Next operation number (1-based) that uses the page, or ∞ if none. */
  markOf(page: Page, operationIndex: number): string {
    const next = this.nextUseAfter(page.ptr, operationIndex);
    return next === NEVER ? '∞' : String(next + 1);
  }

  private nextUseAfter(ptr: number, operationIndex: number): number {
    return firstGreaterThan(this.usesByPointer.get(ptr) ?? [], operationIndex) ?? NEVER;
  }
}

function compareDescending(a: number, b: number): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

/** Binary search over an ascending array. */
function firstGreaterThan(sorted: readonly number[], value: number): number | undefined {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle] <= value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low < sorted.length ? sorted[low] : undefined;
}