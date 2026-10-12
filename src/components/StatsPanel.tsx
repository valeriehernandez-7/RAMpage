import { toDisplayMetrics } from '../sim/metrics.ts';
import type { SimulationStats } from '../sim/types.ts';

interface StatsPanelProps {
  stats: SimulationStats;
}

const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** The metrics the spec requires, as in the summary boxes of Annex 2. */
export function StatsPanel({ stats }: StatsPanelProps) {
  const metrics = toDisplayMetrics(stats);
  const format = (value: number): string => oneDecimal.format(value);

  return (
    <dl className="stats">
      <Stat label="Processes" value={String(stats.runningProcessCount)} />
      <Stat label="Sim-Time" value={`${stats.clockS} s`} />
      <Stat label="RAM" value={`${format(metrics.ramKb)} KB · ${format(metrics.ramPercent)} %`} />
      <Stat label="V-RAM" value={`${format(metrics.vRamKb)} KB · ${format(metrics.vRamPercentOfRam)} %`} />
      <Stat label="Pages loaded / unloaded" value={`${stats.ramPageCount} / ${stats.diskPageCount}`} />
      <Stat
        label="Thrashing"
        value={`${stats.thrashingS} s · ${format(metrics.thrashingPercent)} %`}
        isAlert={metrics.isThrashingCritical}
      />
      <Stat label="Fragmentation" value={`${format(metrics.internalFragmentationKb)} KB`} />
      <Stat label="Hits / faults" value={`${stats.hitCount} / ${stats.faultCount}`} />
    </dl>
  );
}

interface StatProps {
  label: string;
  value: string;
  isAlert?: boolean;
}

function Stat({ label, value, isAlert = false }: StatProps) {
  return (
    <div className={isAlert ? 'stat stat-alert' : 'stat'}>
      <dt>{label}</dt>
      <dd>
        {isAlert && <span aria-hidden="true">⚠ </span>}
        {value}
        {isAlert && <span className="visually-hidden"> (above 50 % of total time)</span>}
      </dd>
    </div>
  );
}