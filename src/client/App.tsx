import React, { useState, useEffect } from 'react';
import { StrategyPanel } from './components/strategies/StrategyPanel';
import { SimulationPanel } from './components/simulation/SimulationPanel';
import { HistoricalStatsPanel } from './components/stats/HistoricalStatsPanel';
import { StepThroughPanel } from './components/step-through/StepThroughPanel';
import { InteractivePanel } from './components/interactive/InteractivePanel';
import { useMultiMouse } from './hooks/useMultiMouse';
import { StrategyDTO } from './components/strategies/StrategyCard';

export interface SimulationUIConfig {
  gameCount: number;
  targetScore: number;
  minimumScoreToBoard: number;
  scoringRules: {
    enableStraight: boolean;
    enableThreePairs: boolean;
    enableFourOfKindBonus: boolean;
    enableFiveOfKindBonus: boolean;
    enableSixOfKindBonus: boolean;
    enableSingleOnes: boolean;
    enableSingleFives: boolean;
  };
}

const defaultSimulationConfig: SimulationUIConfig = {
  gameCount: 100,
  targetScore: 10000,
  minimumScoreToBoard: 0,
  scoringRules: {
    enableStraight: true,
    enableThreePairs: true,
    enableFourOfKindBonus: true,
    enableFiveOfKindBonus: true,
    enableSixOfKindBonus: true,
    enableSingleOnes: true,
    enableSingleFives: true,
  }
};

export default function App() {
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [customStrategies, setCustomStrategies] = useState<StrategyDTO[]>([]);
  const [builtInStrategies, setBuiltInStrategies] = useState<StrategyDTO[]>([]);
  const mouseStatus = useMultiMouse();

  useEffect(() => {
    fetch('/api/strategies')
      .then(res => res.json())
      .then((data: StrategyDTO[]) => setBuiltInStrategies(data))
      .catch(err => console.error('Failed to load built-in strategies', err));
  }, []);

  return (
    <div className="container">
      <header>
        <h1>🎲 Hot Dice Simulator</h1>
        <p className="subtitle">Compare strategies and see which wins!</p>
      </header>
      <main>
        <StrategyPanel 
          builtInStrategies={builtInStrategies}
          customStrategies={customStrategies}
          setCustomStrategies={setCustomStrategies}
          selectedStrategyIds={selectedStrategyIds}
          setSelectedStrategyIds={setSelectedStrategyIds}
        />
        <SimulationPanel
          defaultConfig={defaultSimulationConfig}
          selectedStrategyIds={selectedStrategyIds}
          builtInStrategies={builtInStrategies}
          customStrategies={customStrategies}
        />
        <HistoricalStatsPanel />
        <StepThroughPanel 
          defaultConfig={defaultSimulationConfig}
          selectedStrategyIds={selectedStrategyIds}
          customStrategies={customStrategies}
        />
        <InteractivePanel
          defaultConfig={defaultSimulationConfig}
          selectedStrategyIds={selectedStrategyIds}
          customStrategies={customStrategies}
        />
        <div id="multimouse-status" style={{
          position: 'fixed',
          bottom: '12px',
          right: '12px',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          zIndex: 999998,
          transition: 'background 0.3s',
          background: mouseStatus.connected ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)',
          color: 'white'
        }}>
          {mouseStatus.label}
        </div>
      </main>
    </div>
  );
}
