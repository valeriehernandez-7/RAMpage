import { RAM_FRAME_COUNT } from './constants.ts';
import { pageCountFor } from './memory.ts';
import type { Operation } from './types.ts';

export class OperationsValidationError extends Error {
  readonly operationNumber: number;

  constructor(message: string, operationNumber: number) {
    super(`Operation ${operationNumber}: ${message}`);
    this.name = 'OperationsValidationError';
    this.operationNumber = operationNumber;
  }
}

/**
 * Checks the semantic rules of a sequence before it is simulated. Pointers are numbered
 * by order of appearance of new, as in Annex 1. Every allocation must fit in RAM so the
 * MMU can always hold all pages of a pointer at once.
 */
export function validateOperations(operations: readonly Operation[]): void {
  const pointerOwner = new Map<number, number>();
  const killed = new Set<number>();
  let nextPtr = 1;

  for (const [index, operation] of operations.entries()) {
    const fail = (message: string): never => {
      throw new OperationsValidationError(message, index + 1);
    };

    switch (operation.kind) {
      case 'new':
        if (killed.has(operation.pid)) fail(`process ${operation.pid} already ended with kill`);
        if (pageCountFor(operation.sizeBytes) > RAM_FRAME_COUNT) {
          fail(`size ${operation.sizeBytes} B needs more than the ${RAM_FRAME_COUNT} RAM pages`);
        }
        pointerOwner.set(nextPtr, operation.pid);
        nextPtr++;
        break;
      case 'use':
        if (!pointerOwner.has(operation.ptr)) fail(`ptr ${operation.ptr} does not exist or was freed`);
        break;
      case 'delete':
        if (!pointerOwner.delete(operation.ptr)) fail(`ptr ${operation.ptr} does not exist or was freed`);
        break;
      case 'kill':
        if (killed.has(operation.pid)) fail(`process ${operation.pid} already ended with kill`);
        killed.add(operation.pid);
        for (const [ptr, pid] of pointerOwner) {
          if (pid === operation.pid) pointerOwner.delete(ptr);
        }
        break;
    }
  }
}