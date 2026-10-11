import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeededRandom, randomInt } from '../src/sim/random.ts';

const SAMPLE_SIZE = 1000;

function sample(seed: number): number[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: SAMPLE_SIZE }, () => random());
}

test('same seed produces the same sequence', () => {
  assert.deepEqual(sample(42), sample(42));
});

test('different seeds produce different sequences', () => {
  assert.notDeepEqual(sample(42), sample(43));
});

test('values fall within [0, 1)', () => {
  for (const value of sample(7)) {
    assert.ok(value >= 0 && value < 1);
  }
});

test('randomInt stays within inclusive bounds and reaches both ends', () => {
  const random = createSeededRandom(1);
  const seen = new Set<number>();
  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const value = randomInt(random, 1, 3);
    assert.ok(value >= 1 && value <= 3);
    seen.add(value);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
});