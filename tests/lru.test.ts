import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LruAlgorithm } from '../src/sim/algorithms/lru.ts';
import { makePage } from './fixtures/pages.ts';

test('evicts the least recently used page', () => {
  const candidates = [
    makePage({ id: 1, lastAccessSequence: 8 }),
    makePage({ id: 2, lastAccessSequence: 3 }),
    makePage({ id: 3, lastAccessSequence: 5 }),
  ];
  assert.equal(new LruAlgorithm().selectVictim(candidates).id, 2);
});

test('keeps a page loaded first if it was used recently, unlike FIFO', () => {
  const candidates = [
    makePage({ id: 1, loadSequence: 1, lastAccessSequence: 10 }),
    makePage({ id: 2, loadSequence: 2, lastAccessSequence: 2 }),
  ];
  assert.equal(new LruAlgorithm().selectVictim(candidates).id, 2);
});

test('ignores how often a page was used', () => {
  const candidates = [
    makePage({ id: 1, lastAccessSequence: 1, accessCount: 40 }),
    makePage({ id: 2, lastAccessSequence: 2, accessCount: 1 }),
  ];
  assert.equal(new LruAlgorithm().selectVictim(candidates).id, 1);
});

test('shows the last access sequence as its mark', () => {
  assert.equal(new LruAlgorithm().markOf(makePage({ id: 1, lastAccessSequence: 42 })), '42');
});