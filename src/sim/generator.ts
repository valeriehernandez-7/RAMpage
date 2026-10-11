import { PAGE_SIZE_BYTES } from './constants.ts';
import { createSeededRandom, randomInt, type RandomSource } from './random.ts';
import type { Operation } from './types.ts';

// Workload tuning, not defined by the spec: accesses dominate, and allocations are
// large enough to overflow RAM so the paging algorithms are actually exercised.
const NEW_PROBABILITY = 0.3;
const DELETE_PROBABILITY = 0.1;
const MAX_NEW_SIZE_BYTES = 4 * PAGE_SIZE_BYTES;

// Every process needs an initial new (so it has something to use) and a final kill.
const OPERATIONS_RESERVED_PER_PROCESS = 2;

export interface GeneratorConfig {
  readonly seed: number;
  readonly processCount: number;
  readonly operationCount: number;
}

interface ProcessPlan {
  readonly pid: number;
  remainingBodyOperations: number;
  readonly livePointers: number[];
}

/** Generates exactly operationCount operations that follow the spec's sequence rules. */
export function generateOperations({ seed, processCount, operationCount }: GeneratorConfig): Operation[] {
  assertValidConfig(processCount, operationCount);
  const random = createSeededRandom(seed);
  const active = createProcessPlans(random, processCount, operationCount);
  const operations: Operation[] = [];
  let nextPtr = 1;

  while (active.length > 0) {
    const index = randomInt(random, 0, active.length - 1);
    const process = active[index];

    if (process.remainingBodyOperations === 0) {
      operations.push({ kind: 'kill', pid: process.pid });
      active.splice(index, 1);
      continue;
    }

    process.remainingBodyOperations--;
    const operation = takeBodyOperation(random, process, nextPtr);
    if (operation.kind === 'new') nextPtr++;
    operations.push(operation);
  }
  return operations;
}

function assertValidConfig(processCount: number, operationCount: number): void {
  if (!Number.isInteger(processCount) || processCount < 1) {
    throw new RangeError('processCount must be a positive integer');
  }
  const minimum = processCount * OPERATIONS_RESERVED_PER_PROCESS;
  if (!Number.isInteger(operationCount) || operationCount < minimum) {
    throw new RangeError(`operationCount must be an integer of at least ${minimum} for ${processCount} processes`);
  }
}

function createProcessPlans(random: RandomSource, processCount: number, operationCount: number): ProcessPlan[] {
  const plans = Array.from({ length: processCount }, (_, index): ProcessPlan => ({
    pid: index + 1,
    remainingBodyOperations: 1,
    livePointers: [],
  }));
  const freeOperations = operationCount - processCount * OPERATIONS_RESERVED_PER_PROCESS;
  for (let i = 0; i < freeOperations; i++) {
    plans[randomInt(random, 0, processCount - 1)].remainingBodyOperations++;
  }
  return plans;
}

/** Picks the next non-kill operation for a process and updates its live pointers. */
function takeBodyOperation(random: RandomSource, process: ProcessPlan, nextPtr: number): Operation {
  const roll = random();

  if (process.livePointers.length === 0 || roll < NEW_PROBABILITY) {
    process.livePointers.push(nextPtr);
    return { kind: 'new', pid: process.pid, sizeBytes: randomInt(random, 1, MAX_NEW_SIZE_BYTES) };
  }

  const pointerIndex = randomInt(random, 0, process.livePointers.length - 1);
  const ptr = process.livePointers[pointerIndex];

  if (roll < NEW_PROBABILITY + DELETE_PROBABILITY) {
    process.livePointers.splice(pointerIndex, 1);
    return { kind: 'delete', ptr };
  }
  return { kind: 'use', ptr };
}