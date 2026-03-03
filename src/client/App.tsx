import { useState } from 'react';
import { StrategyPanel } from './components/strategies/StrategyPanel';
import { SimulationPanel } from './components/simulation/SimulationPanel';
import { StepThroughPanel } from './components/stepThrough';
import { InteractivePanel } from './components/interactive';
import { HistoricalStatsPanel } from './components/stats/HistoricalStatsPanel';
import type { CustomStrategyData } from './components/strategies/StrategyPanel';
import type { StrategyInfo } from './components/strategies/StrategyCard';
import type { ScoringRules } from './types/game';

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
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [customStrategies, setCustomStrategies] = useState<CustomStrategyData[]>([]);
  const [canRunSimulation, setCanRunSimulation] = useState(false);
  const [availableStrategies, setAvailableStrategies] = useState<StrategyInfo[]>([]);
  const [targetScore, setTargetScore] = useState(10000);
  const [minScore, setMinScore] = useState(0);
  const [scoringRules, setScoringRules] = useState<ScoringRules>(DEFAULT_SCORING_RULES);

  return (
    <div className="container">
      <header>
        <h1>🎲 Hot Dice Simulator</h1>
        <p className="subtitle">Compare strategies and see which wins!</p>
      </header>

      <StrategyPanel
        selectedStrategyIds={selectedStrategyIds}
        customStrategies={customStrategies}
        onSelectionChange={setSelectedStrategyIds}
        onCustomStrategiesChange={setCustomStrategies}
        onCanRunChange={setCanRunSimulation}
        onStrategiesLoaded={setAvailableStrategies}
      />

      <SimulationPanel
        selectedStrategyIds={selectedStrategyIds}
        customStrategies={customStrategies}
        availableStrategies={availableStrategies}
        canRun={canRunSimulation}
        targetScore={targetScore}
        setTargetScore={setTargetScore}
        minScore={minScore}
        setMinScore={setMinScore}
        scoringRules={scoringRules}
        setScoringRules={setScoringRules}
      />

      <StepThroughPanel
        selectedStrategyIds={selectedStrategyIds}
        customStrategies={customStrategies}
        targetScore={targetScore}
        minScore={minScore}
        scoringRules={scoringRules}
        canStart={canRunSimulation}
      />

      <InteractivePanel
        selectedStrategyIds={selectedStrategyIds}
        customStrategies={customStrategies}
        targetScore={targetScore}
        minScore={minScore}
        scoringRules={scoringRules}
      />

      <HistoricalStatsPanel />
    </div>
  );
}
