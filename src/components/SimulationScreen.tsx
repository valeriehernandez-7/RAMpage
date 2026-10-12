import { SPEED_OPTIONS, useSimulation, type Speed } from '../hooks/useSimulation.ts';
import { formatOperation } from '../sim/serializer.ts';
import type { SimulationSetup } from './SetupScreen.tsx';
import type { SessionSnapshot } from '../sim/session.ts';
import { PidLegend } from './PidLegend.tsx';
import { RamBar } from './RamBar.tsx';
import { MmuTable } from './MmuTable.tsx';

interface SimulationScreenProps {
  setup: SimulationSetup;
  onExit(): void;
}

export function SimulationScreen({ setup, onExit }: SimulationScreenProps) {
  const { snapshot, isRunning, speed, play, pause, stepOnce, setSpeed } = useSimulation(
    setup.operations,
    setup.algorithm,
  );

  function handleExit(): void {
    if (snapshot.isFinished || window.confirm('Leave this simulation? Its progress will be lost.')) {
      onExit();
    }
  }

  function handleSpeedChange(value: string): void {
    const selected = SPEED_OPTIONS.find((option) => option === Number(value));
    if (selected !== undefined) setSpeed(selected satisfies Speed);
  }

  return (
    <main className="simulation">
      <header className="controls">
        <p className="progress">
          Operation {snapshot.completedCount} of {snapshot.totalCount}
          {snapshot.lastOperation !== null && `: ${formatOperation(snapshot.lastOperation)}`}
          {snapshot.lastAllocatedPtr !== null && ` → ptr ${snapshot.lastAllocatedPtr}`}
        </p>
        <button type="button" className="primary" onClick={isRunning ? pause : play} disabled={snapshot.isFinished}>
          {isRunning ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={stepOnce} disabled={isRunning || snapshot.isFinished}>
          Step
        </button>
        <label className="speed">
          Speed{' '}
          <select value={speed} onChange={(event) => handleSpeedChange(event.target.value)}>
            {SPEED_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} op/s
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleExit}>
          New simulation
        </button>
      </header>

      <section className="ram-section" aria-label="RAM">
        <RamBar title={`RAM - ${snapshot.optimal.name}`} view={snapshot.optimal} />
        <RamBar title={`RAM - ${snapshot.selected.name}`} view={snapshot.selected} />
        <PidLegend pids={livePids(snapshot)} />
      </section>

      <div className="columns">
        {[snapshot.optimal, snapshot.selected].map((view) => (
          <section key={view.name} aria-label={`${view.name} simulation`}>
            <MmuTable view={view} />
          </section>
        ))}
      </div>
    </main>
  );
}

/** PIDs that currently own at least one page in either simulation. */
function livePids(snapshot: SessionSnapshot): number[] {
  const pids = new Set([...snapshot.optimal.pages, ...snapshot.selected.pages].map((page) => page.pid));
  return [...pids].sort((a, b) => a - b);
}