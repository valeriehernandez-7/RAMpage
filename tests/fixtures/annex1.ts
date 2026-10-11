import type { Operation } from '../../src/sim/types.ts';

/** Annex 1 example from the project specification, verbatim. */
export const ANNEX_1_TEXT = `new(1,500)
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

export const ANNEX_1_OPERATIONS: Operation[] = [
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