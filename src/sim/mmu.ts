import type { EvictionContext, PagingAlgorithm } from './algorithms/pagingAlgorithm.ts';
import {
  DELETE_TIME_S,
  FAULT_TIME_S,
  HIT_TIME_S,
  KILL_TIME_S,
  PAGE_SIZE_BYTES,
  RAM_FRAME_COUNT,
} from './constants.ts';
import { pageCountFor } from './memory.ts';
import type { Operation, Page, PointerAllocation, SimulationStats } from './types.ts';

export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationError';
  }
}

/**
 * Memory Management Unit: executes operations against 100 RAM frames and an unbounded
 * disk, updating each page's bookkeeping identically for every algorithm and
 * delegating only the choice of victim page to the paging algorithm.
 */
export class Mmu {
  readonly algorithm: PagingAlgorithm;

  private readonly frames: (number | null)[] = new Array(RAM_FRAME_COUNT).fill(null);
  private readonly pages = new Map<number, Page>();
  private readonly pointers = new Map<number, PointerAllocation>();
  private readonly symbolTables = new Map<number, Set<number>>();
  private readonly killedPids = new Set<number>();
  private readonly stats: SimulationStats = {
    clockS: 0,
    thrashingS: 0,
    hitCount: 0,
    faultCount: 0,
    runningProcessCount: 0,
    ramPageCount: 0,
    diskPageCount: 0,
    internalFragmentationBytes: 0,
  };
  private nextPageId = 1;
  private nextPtr = 1;
  private nextSequence = 1;
  private nextDiskSlot = 1;

  constructor(algorithm: PagingAlgorithm) {
    this.algorithm = algorithm;
  }

  /**
   * operationIndex is the position in the full sequence; OPT uses it to look ahead.
   * Returns the ptr assigned by new (the spec's new returns it), or null otherwise.
   */
  execute(operation: Operation, operationIndex: number): number | null {
    let allocatedPtr: number | null = null;
    switch (operation.kind) {
      case 'new':
        allocatedPtr = this.allocate(operation.pid, operation.sizeBytes, operationIndex);
        break;
      case 'use':
        this.use(operation.ptr, operationIndex);
        break;
      case 'delete':
        this.deletePointer(operation.ptr);
        this.stats.clockS += DELETE_TIME_S;
        break;
      case 'kill':
        this.kill(operation.pid);
        this.stats.clockS += KILL_TIME_S;
        break;
    }
    this.stats.runningProcessCount = this.symbolTables.size;
    return allocatedPtr;
  }

  getStats(): SimulationStats {
    return { ...this.stats };
  }

  /** Copies of all live pages, ordered by page id. */
  snapshotPages(): Page[] {
    return Array.from(this.pages.values(), (page) => ({ ...page }));
  }

  /** Page id held by each RAM frame, or null when the frame is free. */
  snapshotFrames(): (number | null)[] {
    return [...this.frames];
  }

    private allocate(pid: number, sizeBytes: number, operationIndex: number): number {
    if (this.killedPids.has(pid)) {
      throw new SimulationError(`process ${pid} already ended with kill`);
    }
    const ptr = this.nextPtr++;
    const pageIds: number[] = [];

    for (let i = 0; i < pageCountFor(sizeBytes); i++) {
      const page = this.createPage(pid, ptr);
      this.pages.set(page.id, page);
      pageIds.push(page.id);
    }
    this.pointers.set(ptr, { ptr, pid, sizeBytes, pageIds });
    this.symbolTableOf(pid).add(ptr);
    this.stats.internalFragmentationBytes += wastedBytes(pageIds.length, sizeBytes);

    // New pages always count as faults (spec), so each one goes through a load.
    for (const pageId of pageIds) {
      this.load(this.pageById(pageId), ptr, operationIndex);
    }
    
    return ptr;
}

  private use(ptr: number, operationIndex: number): void {
    for (const pageId of this.pointerById(ptr).pageIds) {
      const page = this.pageById(pageId);
      if (page.inRam) {
        this.recordHit(page);
      } else {
        this.load(page, ptr, operationIndex);
      }
    }
  }

  private deletePointer(ptr: number): void {
    const pointer = this.pointerById(ptr);
    for (const pageId of pointer.pageIds) {
      this.discard(this.pageById(pageId));
    }
    this.pointers.delete(ptr);
    this.symbolTables.get(pointer.pid)?.delete(ptr);
    this.stats.internalFragmentationBytes -= wastedBytes(pointer.pageIds.length, pointer.sizeBytes);
  }

  private kill(pid: number): void {
    if (this.killedPids.has(pid)) {
      throw new SimulationError(`process ${pid} already ended with kill`);
    }
    // Copy first: deletePointer removes entries from the set being iterated.
    for (const ptr of [...(this.symbolTables.get(pid) ?? [])]) {
      this.deletePointer(ptr);
    }
    this.symbolTables.delete(pid);
    this.killedPids.add(pid);
  }

  private recordHit(page: Page): void {
    page.lastAccessSequence = this.issueSequence();
    page.accessCount++;
    page.referenceBit = true;
    this.stats.clockS += HIT_TIME_S;
    this.stats.hitCount++;
  }

  /** Brings a page into RAM as a page fault, evicting a victim if every frame is taken. */
  private load(page: Page, pinnedPtr: number, operationIndex: number): void {
    const frame = this.findFreeFrame() ?? this.evict(pinnedPtr, operationIndex);

    if (page.diskSlot !== null) {
      page.diskSlot = null;
      this.stats.diskPageCount--;
    }
    page.inRam = true;
    page.frame = frame;
    page.loadedAtS = this.stats.clockS;
    page.loadSequence = this.issueSequence();
    page.lastAccessSequence = page.loadSequence;
    page.accessCount = 1;
    page.referenceBit = true;
    this.frames[frame] = page.id;
    this.stats.ramPageCount++;

    this.stats.clockS += FAULT_TIME_S;
    this.stats.thrashingS += FAULT_TIME_S;
    this.stats.faultCount++;
  }

  /**
   * Frees a frame by moving a victim to disk. Pages of the pointer being processed are
   * pinned so that an operation never evicts its own pages to make room for each other.
   */
  private evict(pinnedPtr: number, operationIndex: number): number {
    const candidates: Page[] = [];
    for (const pageId of this.frames) {
      if (pageId === null) continue;
      const page = this.pageById(pageId);
      if (page.ptr !== pinnedPtr) candidates.push(page);
    }

    const victim = this.algorithm.selectVictim(candidates, this.evictionContext(operationIndex));
    const frame = victim.frame;
    if (frame === null) {
      throw new SimulationError(`${this.algorithm.name} chose page ${victim.id}, which is not in RAM`);
    }

    this.frames[frame] = null;
    victim.inRam = false;
    victim.frame = null;
    victim.diskSlot = this.nextDiskSlot++;
    victim.referenceBit = false;
    this.stats.ramPageCount--;
    this.stats.diskPageCount++;
    return frame;
  }

  private discard(page: Page): void {
    if (page.frame !== null) {
      this.frames[page.frame] = null;
      this.stats.ramPageCount--;
    } else if (page.diskSlot !== null) {
      this.stats.diskPageCount--;
    }
    this.pages.delete(page.id);
  }

  private createPage(pid: number, ptr: number): Page {
    return {
      id: this.nextPageId++,
      pid,
      ptr,
      inRam: false,
      frame: null,
      diskSlot: null,
      loadedAtS: null,
      loadSequence: 0,
      lastAccessSequence: 0,
      accessCount: 0,
      referenceBit: false,
    };
  }

  /** Lowest free frame, so placement is deterministic. */
  private findFreeFrame(): number | null {
    const index = this.frames.indexOf(null);
    return index === -1 ? null : index;
  }

  private evictionContext(operationIndex: number): EvictionContext {
    return { operationIndex, issueSequence: () => this.issueSequence() };
  }

  private issueSequence(): number {
    return this.nextSequence++;
  }

  private symbolTableOf(pid: number): Set<number> {
    let table = this.symbolTables.get(pid);
    if (table === undefined) {
      table = new Set();
      this.symbolTables.set(pid, table);
    }
    return table;
  }

  private pointerById(ptr: number): PointerAllocation {
    const pointer = this.pointers.get(ptr);
    if (pointer === undefined) {
      throw new SimulationError(`ptr ${ptr} does not exist or was freed`);
    }
    return pointer;
  }

  private pageById(pageId: number): Page {
    const page = this.pages.get(pageId);
    if (page === undefined) {
      throw new SimulationError(`page ${pageId} does not exist`);
    }
    return page;
  }
}

function wastedBytes(pageCount: number, sizeBytes: number): number {
  return pageCount * PAGE_SIZE_BYTES - sizeBytes;
}