import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FifoAlgorithm } from '../src/sim/algorithms/fifo.ts';
import { makeContext, makePage } from './fixtures/pages.ts';

test('evicts the page loaded first, regardless of candidate order', () => {
  const candidates = [
    makePage({ id: 1, loadSequence: 5 }),
    makePage({ id: 2, loadSequence: 2 }),
    makePage({ id: 3, loadSequence: 9 }),
  ];
  assert.equal(new FifoAlgorithm().selectVictim(candidates).id, 2);
});

test('ignores how recently or often a page was used', () => {
  const candidates = [
    makePage({ id: 1, loadSequence: 1, lastAccessSequence: 99, accessCount: 50 }),
    makePage({ id: 2, loadSequence: 2, lastAccessSequence: 3, accessCount: 1 }),
  ];
  assert.equal(new FifoAlgorithm().selectVictim(candidates).id, 1);
});

test('shows no mark', () => {
  assert.equal(new FifoAlgorithm().markOf(), '');
});

test('the context fixture issues increasing sequence numbers', () => {
  const context = makeContext();
  assert.ok(context.issueSequence() < context.issueSequence());
});