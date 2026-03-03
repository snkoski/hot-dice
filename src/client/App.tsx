import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { StrategyPanel } from './components/strategies/StrategyPanel';
import { SimulationPanel } from './components/simulation/SimulationPanel';
import { HistoricalStatsPanel } from './components/stats/HistoricalStatsPanel';
import { StepThroughPanel } from './components/step-through/StepThroughPanel';
import { InteractivePanel } from './components/interactive/InteractivePanel';
import { useMultiMouse } from './hooks/useMultiMouse';
import type { ScoringRules } from './types/game';

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  details: any | null;
}

export interface CustomStrategy {
  id: string;
  name: string;
  description: string;
  version: string;
  isCustom: true;
  type: 'simple' | 'safe';
  threshold: number;
  minDice?: number;
}

const DEFAULT_SCORING_RULES: ScoringRules = {
  enableStraight: true,
  enableThreePairs: true,
  enableFourOfKindBonus: true,
  enableFiveOfKindBonus: true,
  enableSixOfKindBonus: true,
  enableSingleOnes: true,
  enableSingleFives: true,
  minimumScoreToBoard: 0,
};

export function App() {
  useMultiMouse();

  const [availableStrategies, setAvailableStrategies] = useState<StrategyInfo[]>([]);
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>([]);
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/strategies')
      .then((r) => r.json())
      .then(setAvailableStrategies)
      .catch((e) => console.error('Failed to load strategies:', e));
  }, []);

  const toggleStrategy = useCallback((id: string) => {
    setSelectedStrategyIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }, []);

  const addCustomStrategy = useCallback((strategy: CustomStrategy) => {
    setCustomStrategies((prev) => [...prev, strategy]);
  }, []);

  const removeCustomStrategy = useCallback((id: string) => {
    setCustomStrategies((prev) => prev.filter((s) => s.id !== id));
    setSelectedStrategyIds((prev) => prev.filter((sid) => sid !== id));
  }, []);

  const allStrategies = [...availableStrategies, ...customStrategies];

  return (
    <ErrorBoundary>
      <div className="container">
        <header>
          <h1>🎲 Hot Dice Simulator</h1>
          <p className="subtitle">Compare strategies and see which wins!</p>
        </header>

        <StrategyPanel
          availableStrategies={availableStrategies}
          customStrategies={customStrategies}
          selectedStrategyIds={selectedStrategyIds}
          onToggleStrategy={toggleStrategy}
          onAddCustom={addCustomStrategy}
          onRemoveCustom={removeCustomStrategy}
        />

        <SimulationPanel
          selectedStrategyIds={selectedStrategyIds}
          allStrategies={allStrategies}
          customStrategies={customStrategies}
          defaultScoringRules={DEFAULT_SCORING_RULES}
        />

        <HistoricalStatsPanel />

        <InteractivePanel
          selectedStrategyIds={selectedStrategyIds}
          defaultScoringRules={DEFAULT_SCORING_RULES}
        />

        <StepThroughPanel
          selectedStrategyIds={selectedStrategyIds}
          customStrategies={customStrategies}
          defaultScoringRules={DEFAULT_SCORING_RULES}
        />
      </div>
    </ErrorBoundary>
  );
}
