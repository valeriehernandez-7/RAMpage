import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateOperations } from '../src/sim/generator.ts';
import { SimulationSession } from '../src/sim/session.ts';
import { OperationsValidationError } from '../src/sim/validator.ts';
import { ANNEX_1_OPERATIONS } from './fixtures/annex1.ts';

function runToEnd(session: SimulationSession): void {
  while (!session.isFinished) session.step();
}

test('both algorithms advance one operation per step and finish together', () => {
  const operations = generateOperations({ seed: 3, processCount: 10, operationCount: 500 });
  const session = new SimulationSession(operations, 'LRU');

  for (let expected = 1; expected <= operations.length; expected++) {
    session.step();
    assert.equal(session.snapshot().completedCount, expected);
  }
  assert.equal(session.isFinished, true);
});

test('starts with nothing executed and empty memory', () => {
  const snapshot = new SimulationSession(ANNEX_1_OPERATIONS, 'FIFO').snapshot();
  assert.equal(snapshot.completedCount, 0);
  assert.equal(snapshot.totalCount, 16);
  assert.equal(snapshot.lastOperation, null);
  assert.equal(snapshot.optimal.pages.length, 0);
  assert.ok(snapshot.selected.frames.every((pageId) => pageId === null));
});

test('reports the last operation and the pointer returned by new', () => {
  const session = new SimulationSession(ANNEX_1_OPERATIONS, 'FIFO');

  session.step();
  assert.deepEqual(session.snapshot().lastOperation, { kind: 'new', pid: 1, sizeBytes: 500 });
  assert.equal(session.snapshot().lastAllocatedPtr, 1);

  session.step();
  assert.deepEqual(session.snapshot().lastOperation, { kind: 'use', ptr: 1 });
  assert.equal(session.snapshot().lastAllocatedPtr, null);
});

test('stepping after the end changes nothing', () => {
  const session = new SimulationSession(ANNEX_1_OPERATIONS, 'SC');
  runToEnd(session);
  const finished = session.snapshot();
  session.step();
  assert.deepEqual(session.snapshot(), finished);
});

test('exposes each algorithm name and its MARK values', () => {
  const session = new SimulationSession(ANNEX_1_OPERATIONS, 'FIFO');
  session.step();
  const snapshot = session.snapshot();
  const pageId = snapshot.optimal.pages[0].id;

  assert.equal(snapshot.optimal.name, 'OPT');
  assert.equal(snapshot.selected.name, 'FIFO');
  assert.equal(snapshot.optimal.marks.get(pageId), '2', 'ptr 1 is used next by operation 2');
  assert.equal(snapshot.selected.marks.get(pageId), '');
});

test('OPT never ends with more faults than the selected algorithm', () => {
  const operations = generateOperations({ seed: 5, processCount: 50, operationCount: 1000 });
  const session = new SimulationSession(operations, 'FIFO');
  runToEnd(session);
  const { optimal, selected } = session.snapshot();
  assert.ok(optimal.stats.faultCount <= selected.stats.faultCount);
});

test('rejects an invalid sequence before simulating', () => {
  assert.throws(() => new SimulationSession([{ kind: 'use', ptr: 1 }], 'LRU'), OperationsValidationError);
});