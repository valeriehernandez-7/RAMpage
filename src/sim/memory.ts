import { PAGE_SIZE_BYTES } from './constants.ts';

/** Pages needed to hold an allocation; a partially used page still takes a whole frame. */
export function pageCountFor(sizeBytes: number): number {
  return Math.ceil(sizeBytes / PAGE_SIZE_BYTES);
}