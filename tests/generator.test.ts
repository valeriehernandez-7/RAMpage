import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATION_COUNT_OPTIONS, PAGE_SIZE_BYTES, PROCESS_COUNT_OPTIONS, RAM_FRAME_COUNT } from '../src/sim/constants.ts';
import { generateOperations } from '../src/sim/generator.ts';
import type { Operation } from '../src/sim/types.ts';

/** Replays a sequence against the spec's rules and returns its peak live page count. */
function assertFollowsSpecRules(operations: readonly Operation[], processCount: number): number {
  const pointerOwner = new Map<number, number>();
  const pointerPages = new Map<number, number>();
  const killed = new Set<number>();
  let nextPtr = 1;
  let livePages = 0;
  let peakLivePages = 0;

  const release = (ptr: number): void => {
    livePages -= pointerPages.get(ptr) ?? 0;
    pointerOwner.delete(ptr);
    pointerPages.delete(ptr);
  };

  for (const operation of operations) {
    switch (operation.kind) {
      case 'new': {
        assert.ok(operation.pid >= 1 && operation.pid <= processCount, `unexpected pid ${operation.pid}`);
        assert.ok(!killed.has(operation.pid), `new after kill for pid ${operation.pid}`);
        const pages = Math.ceil(operation.sizeBytes / PAGE_SIZE_BYTES);
        assert.ok(pages <= RAM_FRAME_COUNT, `ptr ${nextPtr} does not fit in RAM`);
        pointerOwner.set(nextPtr, operation.pid);
        pointerPages.set(nextPtr, pages);
        nextPtr++;
        livePages += pages;
        peakLivePages = Math.max(peakLivePages, livePages);
        break;
      }
      case 'use':
        assert.ok(pointerOwner.has(operation.ptr), `use of missing ptr ${operation.ptr}`);
        break;
      case 'delete':
        assert.ok(pointerOwner.has(operation.ptr), `delete of missing ptr ${operation.ptr}`);
        release(operation.ptr);
        break;
      case 'kill':
        assert.ok(!killed.has(operation.pid), `pid ${operation.pid} killed twice`);
        killed.add(operation.pid);
        for (const [ptr, pid] of pointerOwner) {
          if (pid === operation.pid) release(ptr);
        }
        break;
    }
  }
  assert.equal(killed.size, processCount, 'every process must end with kill');
  return peakLivePages;
}

test('follows the spec rules for every setup option', () => {
  for (const processCount of PROCESS_COUNT_OPTIONS) {
    for (const operationCount of OPERATION_COUNT_OPTIONS) {
      const operations = generateOperations({ seed: 1, processCount, operationCount });
      assert.equal(operations.length, operationCount);
      assertFollowsSpecRules(operations, processCount);
    }
  }
});

test('same seed produces the same sequence', () => {
  const config = { seed: 2026, processCount: 50, operationCount: 1000 };
  assert.deepEqual(generateOperations(config), generateOperations(config));
});

test('different seeds produce different sequences', () => {
  const base = { processCount: 50, operationCount: 1000 };
  assert.notDeepEqual(generateOperations({ ...base, seed: 1 }), generateOperations({ ...base, seed: 2 }));
});

test('generated workloads overflow RAM so the algorithms are exercised', () => {
  const operations = generateOperations({ seed: 1, processCount: 10, operationCount: 500 });
  const peakLivePages = assertFollowsSpecRules(operations, 10);
  assert.ok(peakLivePages > RAM_FRAME_COUNT, `peak of ${peakLivePages} pages never exceeds RAM`);
});

test('rejects too few operations for the process count', () => {
  assert.throws(() => generateOperations({ seed: 1, processCount: 10, operationCount: 19 }), RangeError);
});