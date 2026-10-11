import type { Operation } from './types.ts';

/** Serializes operations in the Annex 1 format: one instruction per line. */
export function serializeOperations(operations: readonly Operation[]): string {
  return operations.map(formatOperation).join('\n') + '\n';
}

export function formatOperation(operation: Operation): string {
  switch (operation.kind) {
    case 'new':
      return `new(${operation.pid},${operation.sizeBytes})`;
    case 'use':
      return `use(${operation.ptr})`;
    case 'delete':
      return `delete(${operation.ptr})`;
    case 'kill':
      return `kill(${operation.pid})`;
  }
}