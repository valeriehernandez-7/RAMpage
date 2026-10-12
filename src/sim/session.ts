import { createAlgorithm } from './algorithms/createAlgorithm.ts';
import { Mmu, SimulationError } from './mmu.ts';
import type { Operation, Page, PagingAlgorithmName, SelectableAlgorithmName, SimulationStats } from './types.ts';
import { validateOperations } from './validator.ts';

export interface AlgorithmView {
  readonly name: PagingAlgorithmName;
  readonly stats: SimulationStats;
  readonly pages: readonly Page[];
  readonly frames: readonly (number | null)[];
  /** MARK column value per page id. */
  readonly marks: ReadonlyMap<number, string>;
}

export interface SessionSnapshot {
  readonly completedCount: number;
  readonly totalCount: number;
  readonly lastOperation: Operation | null;
  /** ptr returned by the last operation when it was a new; null otherwise. */
  readonly lastAllocatedPtr: number | null;
  readonly isFinished: boolean;
  readonly optimal: AlgorithmView;
  readonly selected: AlgorithmView;
}

/**
 * Runs OPT and the selected algorithm over the same sequence in lockstep: each step
 * executes one operation on both MMUs, so they always show the same point in the
 * sequence and finish together, as the spec requires.
 */
export class SimulationSession {
  private readonly operations: readonly Operation[];
  private readonly optimal: Mmu;
  private readonly selected: Mmu;
  private completedCount = 0;
  private lastAllocatedPtr: number | null = null;

  constructor(operations: readonly Operation[], selectedAlgorithm: SelectableAlgorithmName) {
    validateOperations(operations);
    this.operations = operations;
    this.optimal = new Mmu(createAlgorithm('OPT', operations));
    this.selected = new Mmu(createAlgorithm(selectedAlgorithm, operations));
  }

  get isFinished(): boolean {
    return this.completedCount === this.operations.length;
  }

  /** Executes the next operation on both MMUs; does nothing once finished. */
  step(): void {
    if (this.isFinished) return;
    const index = this.completedCount;
    const operation = this.operations[index];

    const optimalPtr = this.optimal.execute(operation, index);
    const selectedPtr = this.selected.execute(operation, index);
    if (optimalPtr !== selectedPtr) {
      throw new SimulationError(`MMUs assigned different pointers at operation ${index + 1}`);
    }

    this.lastAllocatedPtr = optimalPtr;
    this.completedCount++;
  }

  snapshot(): SessionSnapshot {
    const lastIndex = this.completedCount - 1;
    return {
      completedCount: this.completedCount,
      totalCount: this.operations.length,
      lastOperation: lastIndex >= 0 ? this.operations[lastIndex] : null,
      lastAllocatedPtr: this.lastAllocatedPtr,
      isFinished: this.isFinished,
      optimal: viewOf(this.optimal, lastIndex),
      selected: viewOf(this.selected, lastIndex),
    };
  }
}

function viewOf(mmu: Mmu, lastIndex: number): AlgorithmView {
  const pages = mmu.snapshotPages();
  return {
    name: mmu.algorithm.name,
    stats: mmu.getStats(),
    pages,
    frames: mmu.snapshotFrames(),
    marks: new Map(pages.map((page) => [page.id, mmu.algorithm.markOf(page, lastIndex)])),
  };
}