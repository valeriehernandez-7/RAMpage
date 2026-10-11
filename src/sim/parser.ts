import type { Operation } from './types.ts';

// Instructions may be separated by newlines, commas or semicolons: the spec calls the
// file comma-separated, while its Annex 1 example uses one instruction per line.
const INSTRUCTION_PATTERN = /\b(new|use|delete|kill)\s*\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/gi;
const SEPARATOR_CHARACTER = /[\s,;]/;
const EXCERPT_MAX_LENGTH = 30;

export class OperationsParseError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`);
    this.name = 'OperationsParseError';
    this.line = line;
  }
}

/** Parses an operations file in the Annex 1 format. Checks syntax only. */
export function parseOperations(text: string): Operation[] {
  const operations: Operation[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INSTRUCTION_PATTERN)) {
    assertOnlySeparators(text, cursor, match.index);
    operations.push(toOperation(text, match));
    cursor = match.index + match[0].length;
  }
  assertOnlySeparators(text, cursor, text.length);

  if (operations.length === 0) {
    throw new OperationsParseError('no instructions found', 1);
  }
  return operations;
}

function toOperation(text: string, match: RegExpExecArray): Operation {
  const [, rawName, first, second] = match;
  const name = rawName.toLowerCase();
  const at = match.index;

  if (name === 'new') {
    if (second === undefined) {
      throw errorAt(text, at, 'new requires a pid and a size');
    }
    return {
      kind: 'new',
      pid: toPositiveInteger(first, 'pid', text, at),
      sizeBytes: toPositiveInteger(second, 'size', text, at),
    };
  }
  if (second !== undefined) {
    throw errorAt(text, at, `${name} takes a single argument`);
  }
  switch (name) {
    case 'use':
      return { kind: 'use', ptr: toPositiveInteger(first, 'ptr', text, at) };
    case 'delete':
      return { kind: 'delete', ptr: toPositiveInteger(first, 'ptr', text, at) };
    case 'kill':
      return { kind: 'kill', pid: toPositiveInteger(first, 'pid', text, at) };
    default:
      throw errorAt(text, at, `unknown instruction "${name}"`);
  }
}

function toPositiveInteger(raw: string, field: string, text: string, at: number): number {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw errorAt(text, at, `${field} must be a positive integer, got ${raw}`);
  }
  return value;
}

function assertOnlySeparators(text: string, start: number, end: number): void {
  for (let i = start; i < end; i++) {
    if (!SEPARATOR_CHARACTER.test(text[i])) {
      throw errorAt(text, i, `unexpected text "${excerptAt(text, i)}"`);
    }
  }
}

function errorAt(text: string, index: number, message: string): OperationsParseError {
  return new OperationsParseError(message, lineAt(text, index));
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

function excerptAt(text: string, index: number): string {
  return text.slice(index).split(/\r?\n/, 1)[0].trim().slice(0, EXCERPT_MAX_LENGTH);
}