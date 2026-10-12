import { useState } from 'react';
import { SetupScreen, type SimulationSetup } from './components/SetupScreen.tsx';
import { SimulationScreen } from './components/SimulationScreen.tsx';

export default function App() {
  const [setup, setSetup] = useState<SimulationSetup | null>(null);

  return setup === null ? (
    <SetupScreen onStart={setSetup} />
  ) : (
    <SimulationScreen setup={setup} onExit={() => setSetup(null)} />
  );
}