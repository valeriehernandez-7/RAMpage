import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOperations } from '../src/sim/parser.ts';
import { formatOperation, serializeOperations } from '../src/sim/serializer.ts';
import { ANNEX_1_OPERATIONS, ANNEX_1_TEXT } from './fixtures/annex1.ts';

test('serializes the Annex 1 operations to the exact Annex 1 text', () => {
  assert.equal(serializeOperations(ANNEX_1_OPERATIONS), `${ANNEX_1_TEXT}\n`);
});

test('parsing serialized operations returns the original operations', () => {
  const roundTrip = parseOperations(serializeOperations(ANNEX_1_OPERATIONS));
  assert.deepEqual(roundTrip, ANNEX_1_OPERATIONS);
});

test('formats each operation kind', () => {
  assert.equal(formatOperation({ kind: 'new', pid: 3, sizeBytes: 345 }), 'new(3,345)');
  assert.equal(formatOperation({ kind: 'use', ptr: 7 }), 'use(7)');
  assert.equal(formatOperation({ kind: 'delete', ptr: 7 }), 'delete(7)');
  assert.equal(formatOperation({ kind: 'kill', pid: 3 }), 'kill(3)');
});