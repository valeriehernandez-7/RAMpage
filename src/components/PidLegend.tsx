import { pidColor } from '../ui/pidColor.ts';

interface PidLegendProps {
  pids: readonly number[];
}

export function PidLegend({ pids }: PidLegendProps) {
  if (pids.length === 0) return null;

  return (
    <ul className="legend" aria-label="Process colors">
      {pids.map((pid) => (
        <li key={pid}>
          <span className="swatch" style={{ backgroundColor: pidColor(pid) }} aria-hidden="true" />
          P{pid}
        </li>
      ))}
    </ul>
  );
}
