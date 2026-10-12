import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OptimalAlgorithm } from '../src/sim/algorithms/optimal.ts';
import type { Operation } from '../src/sim/types.ts';
import { makeContext, makePage } from './fixtures/pages.ts';

// OPT only reads the positions of use operations, so these sequences need no new/kill.
const USES: Operation[] = [
  { kind: 'use', ptr: 1 }, // 0
  { kind: 'use', ptr: 2 }, // 1
  { kind: 'use', ptr: 3 }, // 2
  { kind: 'use', ptr: 1 }, // 3
];

test('evicts the page whose next use is furthest away', () => {
  const candidates = [makePage({ id: 2, ptr: 2 }), makePage({ id: 3, ptr: 3 })];
  const victim = new OptimalAlgorithm(USES).selectVictim(candidates, makeContext(0));
  assert.equal(victim.id, 3);
});

test('prefers a page that is never used again', () => {
  const candidates = [makePage({ id: 1, ptr: 1 }), makePage({ id: 3, ptr: 3 }), makePage({ id: 4, ptr: 4 })];
  const victim = new OptimalAlgorithm(USES).selectVictim(candidates, makeContext(1));
  assert.equal(victim.id, 4);
});

test('ignores uses at or before the current operation', () => {
  const candidates = [makePage({ id: 1, ptr: 1, loadSequence: 1 }), makePage({ id: 2, ptr: 2, loadSequence: 2 })];
  const victim = new OptimalAlgorithm(USES).selectVictim(candidates, makeContext(3));
  assert.equal(victim.id, 1, 'both are never used after operation 3, so the tie goes to the oldest');
});

test('breaks ties by evicting the page loaded first', () => {
  const candidates = [makePage({ id: 8, ptr: 8, loadSequence: 5 }), makePage({ id: 9, ptr: 9, loadSequence: 2 })];
  const victim = new OptimalAlgorithm(USES).selectVictim(candidates, makeContext(0));
  assert.equal(victim.id, 9);
});

test('shows the next use as a 1-based operation number, or ∞', () => {
  const algorithm = new OptimalAlgorithm(USES);
  assert.equal(algorithm.markOf(makePage({ id: 1, ptr: 1 }), 0), '4');
  assert.equal(algorithm.markOf(makePage({ id: 1, ptr: 1 }), 3), '∞');
});