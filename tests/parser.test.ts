import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OperationsParseError, parseOperations } from '../src/sim/parser.ts';
import type { Operation } from '../src/sim/types.ts';

const ANNEX_1_TEXT = `new(1,500)
use(1)
new(1,1000)
use(1)
use(2)
new(2,500)
use(3)
use(1)
new(2,50)
use(4)
delete(1)
use(2)
use(3)
delete(2)
kill(1)
kill(2)`;

const ANNEX_1_OPERATIONS: Operation[] = [
  { kind: 'new', pid: 1, sizeBytes: 500 },
  { kind: 'use', ptr: 1 },
  { kind: 'new', pid: 1, sizeBytes: 1000 },
  { kind: 'use', ptr: 1 },
  { kind: 'use', ptr: 2 },
  { kind: 'new', pid: 2, sizeBytes: 500 },
  { kind: 'use', ptr: 3 },
  { kind: 'use', ptr: 1 },
  { kind: 'new', pid: 2, sizeBytes: 50 },
  { kind: 'use', ptr: 4 },
  { kind: 'delete', ptr: 1 },
  { kind: 'use', ptr: 2 },
  { kind: 'use', ptr: 3 },
  { kind: 'delete', ptr: 2 },
  { kind: 'kill', pid: 1 },
  { kind: 'kill', pid: 2 },
];

function assertParseErrorAtLine(text: string, line: number): void {
  assert.throws(
    () => parseOperations(text),
    (error: unknown) => error instanceof OperationsParseError && error.line === line,
  );
}

test('parses the Annex 1 example', () => {
  assert.deepEqual(parseOperations(ANNEX_1_TEXT), ANNEX_1_OPERATIONS);
});

test('accepts CRLF line endings, blank lines and extra spaces', () => {
  const text = '\r\n  new( 1 , 500 )\r\n\r\nuse(1)  \r\n';
  assert.deepEqual(parseOperations(text), [
    { kind: 'new', pid: 1, sizeBytes: 500 },
    { kind: 'use', ptr: 1 },
  ]);
});

test('accepts comma-separated instructions on a single line', () => {
  assert.deepEqual(parseOperations('new(1,500),use(1),kill(1)'), [
    { kind: 'new', pid: 1, sizeBytes: 500 },
    { kind: 'use', ptr: 1 },
    { kind: 'kill', pid: 1 },
  ]);
});

test('is case-insensitive', () => {
  assert.deepEqual(parseOperations('NEW(1,500)\nUse(1)'), [
    { kind: 'new', pid: 1, sizeBytes: 500 },
    { kind: 'use', ptr: 1 },
  ]);
});

test('reports the line of unexpected text', () => {
  assertParseErrorAtLine('new(1,500)\nuse(1)\nfree(1)', 3);
});

test('rejects new without a size', () => {
  assertParseErrorAtLine('use(1)\nnew(1)', 2);
});

test('rejects extra arguments on single-argument instructions', () => {
  assertParseErrorAtLine('use(1,2)', 1);
});

test('rejects zero values', () => {
  assertParseErrorAtLine('new(1,500)\nnew(1,0)', 2);
});

test('rejects a file with no instructions', () => {
  assertParseErrorAtLine('  \n  ', 1);
});
