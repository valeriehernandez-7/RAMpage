import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAlgorithm } from '../src/sim/algorithms/createAlgorithm.ts';
import { OPERATION_COUNT_OPTIONS, PROCESS_COUNT_OPTIONS } from '../src/sim/constants.ts';
import { generateOperations } from '../src/sim/generator.ts';
import { Mmu } from '../src/sim/mmu.ts';
import type { Operation, PagingAlgorithmName, SelectableAlgorithmName, SimulationStats } from '../src/sim/types.ts';
import { ANNEX_1_OPERATIONS } from './fixtures/annex1.ts';

const SELECTABLE: SelectableAlgorithmName[] = ['FIFO', 'SC', 'LRU', 'LFU'];
const ALL: PagingAlgorithmName[] = ['OPT', ...SELECTABLE];
const SEEDS = [1, 2, 3];

function simulate(name: PagingAlgorithmName, operations: readonly Operation[]): SimulationStats {
  const mmu = new Mmu(createAlgorithm(name, operations));
  operations.forEach((operation, index) => mmu.execute(operation, index));
  return mmu.getStats();
}

test('OPT never has more faults than any selectable algorithm', () => {
  for (const processCount of PROCESS_COUNT_OPTIONS) {
    for (const operationCount of OPERATION_COUNT_OPTIONS) {
      for (const seed of SEEDS) {
        const operations = generateOperations({ seed, processCount, operationCount });
        const optimalFaults = simulate('OPT', operations).faultCount;
        for (const name of SELECTABLE) {
          const faults = simulate(name, operations).faultCount;
          assert.ok(
            optimalFaults <= faults,
            `${name} had ${faults} faults vs OPT ${optimalFaults} (P=${processCount}, N=${operationCount}, seed=${seed})`,
          );
        }
      }
    }
  }
});

test('all algorithms agree on Annex 1, which never fills RAM', () => {
  const expected = simulate('FIFO', ANNEX_1_OPERATIONS);
  for (const name of ALL) {
    assert.deepEqual(simulate(name, ANNEX_1_OPERATIONS), expected, `${name} differs on Annex 1`);
  }
});

test('the algorithms produce different results on a generated workload', () => {
  const operations = generateOperations({ seed: 1, processCount: 10, operationCount: 1000 });
  const faultCounts = new Set(ALL.map((name) => simulate(name, operations).faultCount));
  assert.ok(faultCounts.size > 1, 'every algorithm had the same number of faults');
});

test('the same seed reproduces identical statistics', () => {
  const config = { seed: 2026, processCount: 50, operationCount: 1000 };
  for (const name of ALL) {
    assert.deepEqual(simulate(name, generateOperations(config)), simulate(name, generateOperations(config)));
  }
});