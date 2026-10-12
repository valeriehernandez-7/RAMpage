import { useCallback, useEffect, useState } from 'react';
import { SimulationSession, type SessionSnapshot } from '../sim/session.ts';
import type { Operation, SelectableAlgorithmName } from '../sim/types.ts';

/** Playback speeds in operations per second. */
export const SPEED_OPTIONS = [1, 5, 20, 100, 500] as const;
export type Speed = (typeof SPEED_OPTIONS)[number];

const DEFAULT_SPEED: Speed = 5;
const MS_PER_SECOND = 1000;
// Caps UI updates at ~20 per second; faster speeds run several operations per tick.
const MIN_TICK_MS = 50;

export interface SimulationControls {
  readonly snapshot: SessionSnapshot;
  readonly isRunning: boolean;
  readonly speed: Speed;
  play(): void;
  pause(): void;
  stepOnce(): void;
  setSpeed(speed: Speed): void;
}

/**
 * Drives a SimulationSession in time. The session is created once from the initial
 * arguments; remount the component (e.g. with a new key) to start another simulation.
 */
export function useSimulation(
  operations: readonly Operation[],
  algorithm: SelectableAlgorithmName,
): SimulationControls {
  const [session] = useState(() => new SimulationSession(operations, algorithm));
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);

  const advance = useCallback(
    (count: number) => {
      for (let i = 0; i < count && !session.isFinished; i++) {
        session.step();
      }
      setSnapshot(session.snapshot());
      if (session.isFinished) setIsRunning(false);
    },
    [session],
  );

  useEffect(() => {
    if (!isRunning) return;
    const tickMs = Math.max(MS_PER_SECOND / speed, MIN_TICK_MS);
    const stepsPerTick = Math.max(1, Math.round((speed * tickMs) / MS_PER_SECOND));
    const timer = setInterval(() => advance(stepsPerTick), tickMs);
    return () => clearInterval(timer);
  }, [isRunning, speed, advance]);

  return {
    snapshot,
    isRunning,
    speed,
    setSpeed,
    play: () => {
      if (!session.isFinished) setIsRunning(true);
    },
    pause: () => setIsRunning(false),
    stepOnce: () => {
      if (!isRunning) advance(1);
    },
  };
}