import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FifoAlgorithm } from '../src/sim/algorithms/fifo.ts';
import { PAGE_SIZE_BYTES, RAM_FRAME_COUNT, RAM_SIZE_BYTES } from '../src/sim/constants.ts';
import { Mmu, SimulationError } from '../src/sim/mmu.ts';
import type { Operation } from '../src/sim/types.ts';
import { ANNEX_1_OPERATIONS } from './fixtures/annex1.ts';
import { generateOperations } from '../src/sim/generator.ts';

function run(mmu: Mmu, operations: readonly Operation[], firstIndex = 0): void {
  operations.forEach((operation, offset) => mmu.execute(operation, firstIndex + offset));
}

/** ptr 1 fills every frame, ptr 2 forces an eviction, then ptr 1 is used again. */
const PINNING_SCENARIO: Operation[] = [
  { kind: 'new', pid: 1, sizeBytes: RAM_SIZE_BYTES },
  { kind: 'new', pid: 1, sizeBytes: 1 },
  { kind: 'use', ptr: 1 },
];

test('Annex 1 matches the hand calculation', () => {
  const mmu = new Mmu(new FifoAlgorithm());
  run(mmu, ANNEX_1_OPERATIONS.slice(0, 10));
  assert.equal(mmu.getStats().internalFragmentationBytes, 14_334);

  run(mmu, ANNEX_1_OPERATIONS.slice(10), 10);
  assert.deepEqual(mmu.getStats(), {
    clockS: 28,
    thrashingS: 20,
    hitCount: 8,
    faultCount: 4,
    runningProcessCount: 0,
    ramPageCount: 0,
    diskPageCount: 0,
    internalFragmentationBytes: 0,
  });
});

test('a multi-page allocation faults once per page and tracks wasted bytes', () => {
  const mmu = new Mmu(new FifoAlgorithm());
  mmu.execute({ kind: 'new', pid: 1, sizeBytes: 3 * PAGE_SIZE_BYTES + 1 }, 0);
  const stats = mmu.getStats();
  assert.equal(stats.faultCount, 4);
  assert.equal(stats.clockS, 20);
  assert.equal(stats.ramPageCount, 4);
  assert.equal(stats.internalFragmentationBytes, PAGE_SIZE_BYTES - 1);
});

test('pages take the lowest free frame and record their load time', () => {
  const mmu = new Mmu(new FifoAlgorithm());
  run(mmu, [
    { kind: 'new', pid: 1, sizeBytes: 10 },
    { kind: 'new', pid: 1, sizeBytes: 10 },
  ]);
  const [first, second] = mmu.snapshotPages();
  assert.equal(first.frame, 0);
  assert.equal(first.loadedAtS, 0);
  assert.equal(second.frame, 1);
  assert.equal(second.loadedAtS, 5);
  assert.equal(mmu.snapshotFrames()[0], first.id);
});

test('an operation never evicts its own pages to make room for each other', () => {
  const mmu = new Mmu(new FifoAlgorithm());
  run(mmu, PINNING_SCENARIO);

  const pages = mmu.snapshotPages();
  assert.ok(pages.filter((page) => page.ptr === 1).every((page) => page.inRam));
  assert.equal(pages.find((page) => page.ptr === 2)?.inRam, false);

  // 100 new pages (500 s) + 1 new page (5 s) + reload of page 1 (5 s) + 99 hits (99 s)
  const stats = mmu.getStats();
  assert.equal(stats.clockS, 609);
  assert.equal(stats.faultCount, 102);
  assert.equal(stats.hitCount, 99);
  assert.equal(stats.thrashingS, 510);
  assert.equal(stats.ramPageCount, RAM_FRAME_COUNT);
  assert.equal(stats.diskPageCount, 1);
});

test('delete and kill release RAM, disk and fragmentation at no clock cost', () => {
  const mmu = new Mmu(new FifoAlgorithm());
  run(mmu, [...PINNING_SCENARIO, { kind: 'delete', ptr: 2 }, { kind: 'kill', pid: 1 }]);
  assert.deepEqual(mmu.getStats(), {
    clockS: 609,
    thrashingS: 510,
    hitCount: 99,
    faultCount: 102,
    runningProcessCount: 0,
    ramPageCount: 0,
    diskPageCount: 0,
    internalFragmentationBytes: 0,
  });
  assert.ok(mmu.snapshotFrames().every((pageId) => pageId === null));
});

test('rejects operations that break the sequence rules', () => {
  const mmu = new Mmu(new FifoAlgorithm());
  assert.throws(() => mmu.execute({ kind: 'use', ptr: 1 }, 0), SimulationError);
  mmu.execute({ kind: 'kill', pid: 1 }, 0);
  assert.throws(() => mmu.execute({ kind: 'new', pid: 1, sizeBytes: 10 }, 1), SimulationError);
});

test('new returns pointers numbered by order of appearance, as the operations file assumes', () => {
  const annexMmu = new Mmu(new FifoAlgorithm());
  const annexPointers = ANNEX_1_OPERATIONS.map((operation, index) => annexMmu.execute(operation, index));
  assert.deepEqual(annexPointers.filter((ptr) => ptr !== null), [1, 2, 3, 4]);

  const generated = generateOperations({ seed: 7, processCount: 50, operationCount: 1000 });
  const generatedMmu = new Mmu(new FifoAlgorithm());
  const allocated = generated
    .map((operation, index) => generatedMmu.execute(operation, index))
    .filter((ptr) => ptr !== null);
  const newCount = generated.filter((operation) => operation.kind === 'new').length;
  assert.deepEqual(allocated, Array.from({ length: newCount }, (_, index) => index + 1));
});
