import { useState } from 'react';
import { OPERATION_COUNT_OPTIONS, PROCESS_COUNT_OPTIONS } from '../sim/constants.ts';
import { generateOperations } from '../sim/generator.ts';
import { parseOperations } from '../sim/parser.ts';
import { serializeOperations } from '../sim/serializer.ts';
import type { Operation, SelectableAlgorithmName } from '../sim/types.ts';
import { validateOperations } from '../sim/validator.ts';
import { downloadTextFile } from '../ui/download.ts';

export interface SimulationSetup {
  readonly operations: readonly Operation[];
  readonly algorithm: SelectableAlgorithmName;
}

interface SetupScreenProps {
  onStart(setup: SimulationSetup): void;
}

type OperationsSource = 'generate' | 'file';

interface LoadedFile {
  readonly name: string;
  readonly operations: readonly Operation[];
}

const SELECTABLE_ALGORITHMS: readonly SelectableAlgorithmName[] = ['FIFO', 'SC', 'LRU', 'LFU'];

const ALGORITHM_LABELS: Record<SelectableAlgorithmName, string> = {
  FIFO: 'FIFO — First In, First Out',
  SC: 'SC — Second Chance',
  LRU: 'LRU — Least Recently Used',
  LFU: 'LFU — Least Frequently Used',
};

const DEFAULT_SEED = '42';

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [algorithm, setAlgorithm] = useState<SelectableAlgorithmName>('FIFO');
  const [source, setSource] = useState<OperationsSource>('generate');
  const [seedText, setSeedText] = useState(DEFAULT_SEED);
  const [processCount, setProcessCount] = useState<number>(PROCESS_COUNT_OPTIONS[0]);
  const [operationCount, setOperationCount] = useState<number>(OPERATION_COUNT_OPTIONS[0]);
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const seed = parseSeed(seedText);
  const canStart = source === 'file' ? loadedFile !== null : seed !== null;

  function currentOperations(): readonly Operation[] | null {
    if (source === 'file') return loadedFile?.operations ?? null;
    return seed === null ? null : generateOperations({ seed, processCount, operationCount });
  }

  async function handleFileChange(file: File | undefined): Promise<void> {
    setLoadedFile(null);
    setFileError(null);
    if (file === undefined) return;
    try {
      const operations = parseOperations(await file.text());
      validateOperations(operations);
      setLoadedFile({ name: file.name, operations });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleDownload(): void {
    const operations = currentOperations();
    if (operations === null) return;
    downloadTextFile(
      `rampage-seed${seed}-p${processCount}-n${operationCount}.txt`,
      serializeOperations(operations),
    );
  }

  function startSimulation(): void {
    const operations = currentOperations();
    if (operations !== null) onStart({ operations, algorithm });
  }

  return (
    <main className="setup">
      <header>
        <h1>RAMpage</h1>
        <p className="subtitle">Page replacement simulator: OPT versus the algorithm you choose.</p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          startSimulation();
        }}
      >
        <fieldset>
          <legend>Algorithm</legend>
          <label className="field">
            <span>Algorithm to compare against OPT</span>
            <select
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as SelectableAlgorithmName)}
            >
              {SELECTABLE_ALGORITHMS.map((name) => (
                <option key={name} value={name}>
                  {ALGORITHM_LABELS[name]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>Operations</legend>
          <div className="choice">
            <label>
              <input
                type="radio"
                name="source"
                checked={source === 'generate'}
                onChange={() => setSource('generate')}
              />{' '}
              Generate from a seed
            </label>
            <label>
              <input type="radio" name="source" checked={source === 'file'} onChange={() => setSource('file')} />{' '}
              Load a file
            </label>
          </div>

          {source === 'generate' ? (
            <>
              <label className="field">
                <span>Seed</span>
                <input
                  inputMode="numeric"
                  value={seedText}
                  onChange={(event) => setSeedText(event.target.value)}
                  aria-invalid={seed === null}
                  aria-describedby="seed-hint"
                />
                <small id="seed-hint" className="hint">
                  The same seed and settings always produce the same scenario.
                </small>
              </label>
              {seed === null && (
                <p className="error" role="alert">
                  Enter a whole number of 0 or more.
                </p>
              )}

              <div className="row">
                <label className="field">
                  <span>Processes (P)</span>
                  <select value={processCount} onChange={(event) => setProcessCount(Number(event.target.value))}>
                    {PROCESS_COUNT_OPTIONS.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Operations (N)</span>
                  <select value={operationCount} onChange={(event) => setOperationCount(Number(event.target.value))}>
                    {OPERATION_COUNT_OPTIONS.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button type="button" onClick={handleDownload} disabled={seed === null}>
                Download operations file
              </button>
            </>
          ) : (
            <>
              <label className="field">
                <span>Operations file</span>
                <input
                  type="file"
                  accept=".txt,.csv,text/plain"
                  onChange={(event) => void handleFileChange(event.target.files?.[0])}
                />
              </label>
              {fileError !== null && (
                <p className="error" role="alert">
                  {fileError}
                </p>
              )}
              {loadedFile !== null && (
                <p className="hint">
                  {loadedFile.name}: {loadedFile.operations.length} operations,{' '}
                  {countProcesses(loadedFile.operations)} processes
                </p>
              )}
            </>
          )}
        </fieldset>

        <button type="submit" className="primary" disabled={!canStart}>
          Start simulation
        </button>
      </form>
    </main>
  );
}

function parseSeed(text: string): number | null {
  const value = Number(text);
  return text.trim() !== '' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function countProcesses(operations: readonly Operation[]): number {
  const pids = operations.flatMap((operation) =>
    operation.kind === 'new' || operation.kind === 'kill' ? [operation.pid] : [],
  );
  return new Set(pids).size;
}