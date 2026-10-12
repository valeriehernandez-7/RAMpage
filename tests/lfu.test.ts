import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LfuAlgorithm } from '../src/sim/algorithms/lfu.ts';
import { makePage } from './fixtures/pages.ts';

test('evicts the least frequently used page', () => {
  const candidates = [
    makePage({ id: 1, accessCount: 7 }),
    makePage({ id: 2, accessCount: 2 }),
    makePage({ id: 3, accessCount: 4 }),
  ];
  assert.equal(new LfuAlgorithm().selectVictim(candidates).id, 2);
});

test('breaks ties by evicting the page loaded first', () => {
  const candidates = [
    makePage({ id: 1, accessCount: 3, loadSequence: 9 }),
    makePage({ id: 2, accessCount: 3, loadSequence: 4 }),
    makePage({ id: 3, accessCount: 5, loadSequence: 1 }),
  ];
  assert.equal(new LfuAlgorithm().selectVictim(candidates).id, 2);
});

test('keeps a heavily used page even if it was not used recently, unlike LRU', () => {
  const candidates = [
    makePage({ id: 1, accessCount: 30, lastAccessSequence: 1 }),
    makePage({ id: 2, accessCount: 2, lastAccessSequence: 50 }),
  ];
  assert.equal(new LfuAlgorithm().selectVictim(candidates).id, 2);
});

test('shows the access count as its mark', () => {
  assert.equal(new LfuAlgorithm().markOf(makePage({ id: 1, accessCount: 6 })), '6');
});