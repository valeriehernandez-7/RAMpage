import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDisplayMetrics } from '../src/sim/metrics.ts';
import type { SimulationStats } from '../src/sim/types.ts';

function makeStats(overrides: Partial<SimulationStats>): SimulationStats {
  return {
    clockS: 0,
    thrashingS: 0,
    hitCount: 0,
    faultCount: 0,
    runningProcessCount: 0,
    ramPageCount: 0,
    diskPageCount: 0,
    internalFragmentationBytes: 0,
    ...overrides,
  };
}

test('expresses V-RAM as a percentage of RAM, matching the spec example', () => {
  const metrics = toDisplayMetrics(makeStats({ diskPageCount: 125 }));
  assert.equal(metrics.vRamKb, 500);
  assert.equal(metrics.vRamPercentOfRam, 125);
});

test('a full RAM is 400 KB and 100 %', () => {
  const metrics = toDisplayMetrics(makeStats({ ramPageCount: 100 }));
  assert.equal(metrics.ramKb, 400);
  assert.equal(metrics.ramPercent, 100);
});

test('thrashing is critical only when it exceeds 50 %', () => {
  assert.equal(toDisplayMetrics(makeStats({ clockS: 10, thrashingS: 5 })).isThrashingCritical, false);
  assert.equal(toDisplayMetrics(makeStats({ clockS: 10, thrashingS: 6 })).isThrashingCritical, true);
});

test('Annex 1 thrashing is 20 of 28 seconds, above the threshold', () => {
  const metrics = toDisplayMetrics(makeStats({ clockS: 28, thrashingS: 20 }));
  assert.ok(Math.abs(metrics.thrashingPercent - 71.43) < 0.01);
  assert.equal(metrics.isThrashingCritical, true);
});

test('reports no thrashing before the clock starts', () => {
  const metrics = toDisplayMetrics(makeStats({}));
  assert.equal(metrics.thrashingPercent, 0);
  assert.equal(metrics.isThrashingCritical, false);
});

test('converts internal fragmentation to KB', () => {
  assert.equal(toDisplayMetrics(makeStats({ internalFragmentationBytes: 2048 })).internalFragmentationKb, 2);
});