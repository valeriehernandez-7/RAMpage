import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RAM_SIZE_BYTES } from '../src/sim/constants.ts';
import type { Operation } from '../src/sim/types.ts';
import { OperationsValidationError, validateOperations } from '../src/sim/validator.ts';
import { ANNEX_1_OPERATIONS } from './fixtures/annex1.ts';

function assertValidationErrorAt(operations: readonly Operation[], operationNumber: number): void {
  assert.throws(
    () => validateOperations(operations),
    (error: unknown) => error instanceof OperationsValidationError && error.operationNumber === operationNumber,
  );
}

test('accepts the Annex 1 example', () => {
  assert.doesNotThrow(() => validateOperations(ANNEX_1_OPERATIONS));
});

test('rejects use of a pointer that never existed', () => {
  assertValidationErrorAt([{ kind: 'new', pid: 1, sizeBytes: 10 }, { kind: 'use', ptr: 2 }], 2);
});

test('rejects use of a deleted pointer', () => {
  assertValidationErrorAt(
    [{ kind: 'new', pid: 1, sizeBytes: 10 }, { kind: 'delete', ptr: 1 }, { kind: 'use', ptr: 1 }],
    3,
  );
});

test('rejects use of a pointer whose process was killed', () => {
  assertValidationErrorAt(
    [{ kind: 'new', pid: 1, sizeBytes: 10 }, { kind: 'kill', pid: 1 }, { kind: 'use', ptr: 1 }],
    3,
  );
});

test('rejects new after the process was killed', () => {
  assertValidationErrorAt([{ kind: 'kill', pid: 1 }, { kind: 'new', pid: 1, sizeBytes: 10 }], 2);
});

test('rejects a second kill of the same process', () => {
  assertValidationErrorAt([{ kind: 'new', pid: 1, sizeBytes: 10 }, { kind: 'kill', pid: 1 }, { kind: 'kill', pid: 1 }], 3);
});

test('accepts an allocation of exactly the RAM size and rejects anything larger', () => {
  assert.doesNotThrow(() => validateOperations([{ kind: 'new', pid: 1, sizeBytes: RAM_SIZE_BYTES }]));
  assertValidationErrorAt([{ kind: 'new', pid: 1, sizeBytes: RAM_SIZE_BYTES + 1 }], 1);
});