import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SecondChanceAlgorithm } from '../src/sim/algorithms/secondChance.ts';
import { makeContext, makePage } from './fixtures/pages.ts';

test('behaves like FIFO when no page is referenced', () => {
  const candidates = [
    makePage({ id: 1, loadSequence: 3 }),
    makePage({ id: 2, loadSequence: 1 }),
    makePage({ id: 3, loadSequence: 2 }),
  ];
  assert.equal(new SecondChanceAlgorithm().selectVictim(candidates, makeContext()).id, 2);
});

test('spares a referenced oldest page and moves it to the back of the queue', () => {
  const oldest = makePage({ id: 1, loadSequence: 1, referenceBit: true });
  const candidates = [oldest, makePage({ id: 2, loadSequence: 2 }), makePage({ id: 3, loadSequence: 3 })];

  const victim = new SecondChanceAlgorithm().selectVictim(candidates, makeContext());

  assert.equal(victim.id, 2);
  assert.equal(oldest.referenceBit, false);
  assert.ok(oldest.loadSequence > 3, 'spared page must now be the newest in the queue');
});

test('falls back to the original oldest page when every page is referenced', () => {
  const candidates = [
    makePage({ id: 1, loadSequence: 1, referenceBit: true }),
    makePage({ id: 2, loadSequence: 2, referenceBit: true }),
    makePage({ id: 3, loadSequence: 3, referenceBit: true }),
  ];

  const victim = new SecondChanceAlgorithm().selectVictim(candidates, makeContext());

  assert.equal(victim.id, 1);
  assert.ok(candidates.every((page) => !page.referenceBit));
});

test('shows the reference bit as its mark', () => {
  const algorithm = new SecondChanceAlgorithm();
  assert.equal(algorithm.markOf(makePage({ id: 1, referenceBit: true })), '1');
  assert.equal(algorithm.markOf(makePage({ id: 1, referenceBit: false })), '0');
});