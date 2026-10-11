import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATION_COUNT_OPTIONS, PROCESS_COUNT_OPTIONS, RAM_FRAME_COUNT } from '../src/sim/constants.ts';
import { generateOperations } from '../src/sim/generator.ts';
import { pageCountFor } from '../src/sim/memory.ts';
import type { Operation } from '../src/sim/types.ts';
import { validateOperations } from '../src/sim/validator.ts';

function assertEveryProcessEndsWithKill(operations: readonly Operation[], processCount: number): void {
  const killedPids = operations.filter((operation) => operation.kind === 'kill').map((operation) => operation.pid);
  assert.deepEqual(
    [...killedPids].sort((a, b) => a - b),
    Array.from({ length: processCount }, (_, index) => index + 1),
  );
}

function peakLivePages(operations: readonly Operation[]): number {
  const pointers: { pid: number; pages: number }[] = [];
  const freed = new Set<number>();
  let live = 0;
  let peak = 0;

  for (const operation of operations) {
    if (operation.kind === 'new') {
      pointers.push({ pid: operation.pid, pages: pageCountFor(operation.sizeBytes) });
      live += pointers[pointers.length - 1].pages;
      peak = Math.max(peak, live);
    } else if (operation.kind === 'delete') {
      freed.add(operation.ptr);
      live -= pointers[operation.ptr - 1].pages;
    } else if (operation.kind === 'kill') {
      pointers.forEach((pointer, index) => {
        const ptr = index + 1;
        if (pointer.pid === operation.pid && !freed.has(ptr)) {
          freed.add(ptr);
          live -= pointer.pages;
        }
      });
    }
  }
  return peak;
}

test('follows the spec rules for every setup option', () => {
  for (const processCount of PROCESS_COUNT_OPTIONS) {
    for (const operationCount of OPERATION_COUNT_OPTIONS) {
      const operations = generateOperations({ seed: 1, processCount, operationCount });
      assert.equal(operations.length, operationCount);
      assert.doesNotThrow(() => validateOperations(operations));
      assertEveryProcessEndsWithKill(operations, processCount);
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
  const peak = peakLivePages(generateOperations({ seed: 1, processCount: 10, operationCount: 500 }));
  assert.ok(peak > RAM_FRAME_COUNT, `peak of ${peak} pages never exceeds RAM`);
});

test('rejects too few operations for the process count', () => {
  assert.throws(() => generateOperations({ seed: 1, processCount: 10, operationCount: 19 }), RangeError);
});