/** Simulated machine parameters defined by the project specification. */
export const PAGE_SIZE_BYTES = 4 * 1024;
export const RAM_SIZE_BYTES = 400 * 1024;
export const RAM_FRAME_COUNT = RAM_SIZE_BYTES / PAGE_SIZE_BYTES;

/** Clock cost per page access. */
export const HIT_TIME_S = 1;
export const FAULT_TIME_S = 5;

// delete and kill access no pages; the spec's clock only charges page hits and faults.
export const DELETE_TIME_S = 0;
export const KILL_TIME_S = 0;

/** Thrashing above this share of total time is highlighted in the UI. */
export const THRASHING_ALERT_RATIO = 0.5;

/** Setup options offered when the operations are generated instead of loaded from a file. */
export const PROCESS_COUNT_OPTIONS = [10, 50, 100] as const;
export const OPERATION_COUNT_OPTIONS = [500, 1000, 5000] as const;