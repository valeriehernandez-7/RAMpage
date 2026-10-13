import { SPEED_OPTIONS, useSimulation, type Speed } from '../hooks/useSimulation.ts';
import { formatOperation } from '../sim/serializer.ts';
import type { AlgorithmView, SessionSnapshot } from '../sim/session.ts';
import { MmuTable } from './MmuTable.tsx';
import { PidLegend } from './PidLegend.tsx';
import { RamBar } from './RamBar.tsx';
import type { SimulationSetup } from './SetupScreen.tsx';
import { StatsPanel } from './StatsPanel.tsx';

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
        <div className="status">
          <p className="setup-summary">
            {setup.algorithm} vs. OPT · {setup.sourceLabel}
          </p>
          <p className="progress">
            Operation {snapshot.completedCount} of {snapshot.totalCount}
            {snapshot.lastOperation !== null && `: ${formatOperation(snapshot.lastOperation)}`}
            {snapshot.lastAllocatedPtr !== null && ` → ptr ${snapshot.lastAllocatedPtr}`}
          </p>
        </div>
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

      {snapshot.isFinished && <ResultsSummary optimal={snapshot.optimal} selected={snapshot.selected} />}

      <section className="ram-section" aria-label="RAM">
        <RamBar title={`RAM - ${snapshot.optimal.name}`} view={snapshot.optimal} />
        <RamBar title={`RAM - ${snapshot.selected.name}`} view={snapshot.selected} />
        <PidLegend pids={livePids(snapshot)} />
        <p className="hint">
          <span aria-hidden="true">▶</span> used by the last operation (outlined in RAM) ·{' '}
          <span aria-hidden="true">↓</span> moved to disk by the last operation
        </p>
      </section>

      <div className="columns">
        {[snapshot.optimal, snapshot.selected].map((view) => (
          <section key={view.name} aria-label={`${view.name} simulation`}>
            <MmuTable view={view} followActivity={!isRunning} />
            <StatsPanel stats={view.stats} />
          </section>
        ))}
      </div>
    </main>
  );
}

interface ResultsSummaryProps {
  optimal: AlgorithmView;
  selected: AlgorithmView;
}

function ResultsSummary({ optimal, selected }: ResultsSummaryProps) {
  const extraFaults = selected.stats.faultCount - optimal.stats.faultCount;
  const extraSeconds = selected.stats.clockS - optimal.stats.clockS;

  return (
    <p className="results" role="status">
      Simulation finished. {selected.name} had {extraFaults} more page faults than OPT ({selected.stats.faultCount}{' '}
      vs. {optimal.stats.faultCount}), which cost {extraSeconds} s of extra simulated time.
    </p>
  );
}

/** PIDs that currently own at least one page in either simulation. */
function livePids(snapshot: SessionSnapshot): number[] {
  const pids = new Set([...snapshot.optimal.pages, ...snapshot.selected.pages].map((page) => page.pid));
  return [...pids].sort((a, b) => a - b);
}
