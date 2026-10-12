import { PAGE_SIZE_BYTES, RAM_SIZE_BYTES, THRASHING_ALERT_RATIO } from './constants.ts';
import type { SimulationStats } from './types.ts';

const BYTES_PER_KB = 1024;
const PERCENT = 100;
const PAGE_SIZE_KB = PAGE_SIZE_BYTES / BYTES_PER_KB;
const RAM_SIZE_KB = RAM_SIZE_BYTES / BYTES_PER_KB;

export interface DisplayMetrics {
  ramKb: number;
  ramPercent: number;
  vRamKb: number;
  /** V-RAM relative to the RAM size, as the spec requires (500 KB of V-RAM = 125 %). */
  vRamPercentOfRam: number;
  thrashingPercent: number;
  /** The spec highlights thrashing in red once it exceeds 50 % of the total time. */
  isThrashingCritical: boolean;
  internalFragmentationKb: number;
}

/** Converts raw simulator counters into the units and percentages the UI shows. */
export function toDisplayMetrics(stats: SimulationStats): DisplayMetrics {
  const ramKb = stats.ramPageCount * PAGE_SIZE_KB;
  const vRamKb = stats.diskPageCount * PAGE_SIZE_KB;
  const thrashingRatio = stats.clockS === 0 ? 0 : stats.thrashingS / stats.clockS;

  return {
    ramKb,
    ramPercent: (ramKb / RAM_SIZE_KB) * PERCENT,
    vRamKb,
    vRamPercentOfRam: (vRamKb / RAM_SIZE_KB) * PERCENT,
    thrashingPercent: thrashingRatio * PERCENT,
    isThrashingCritical: thrashingRatio > THRASHING_ALERT_RATIO,
    internalFragmentationKb: stats.internalFragmentationBytes / BYTES_PER_KB,
  };
}