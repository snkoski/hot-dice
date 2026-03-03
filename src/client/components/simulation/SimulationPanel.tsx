import { useState, useCallback, useEffect } from 'react';
import { ScoringRulesConfig } from './ScoringRulesConfig';
import { SimulationProgressDisplay } from './SimulationProgress';
import { SimulationResults } from './SimulationResults';
import { useSimulationWebSocket } from '../../hooks/useSimulationWebSocket';
import { useStrategyStats } from '../../hooks/useStrategyStats';
import { generateStrategyHash, calculateDerivedStats } from '../../lib/strategyHash';
import type { ScoringRules } from '../../types/game';
import type { CustomStrategyData } from '../strategies/StrategyPanel';
import type { StrategyInfo } from '../strategies/StrategyCard';
import './simulation.css';

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

interface SimulationPanelProps {
  selectedStrategyIds: string[];
  customStrategies: CustomStrategyData[];
  availableStrategies: StrategyInfo[];
  canRun: boolean;
  targetScore: number;
  setTargetScore: (v: number) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  scoringRules: ScoringRules;
  setScoringRules: (v: ScoringRules) => void;
}

export function SimulationPanel({
  selectedStrategyIds,
  customStrategies,
  availableStrategies,
  canRun,
  targetScore,
  setTargetScore,
  minScore,
  setMinScore,
  scoringRules,
  setScoringRules,
}: SimulationPanelProps) {
  const [gameCount, setGameCount] = useState(100);

  const { run, progress, results, error, isRunning } = useSimulationWebSocket();
  const { mergeResults, getStatsForHash } = useStrategyStats();

  useEffect(() => {
    if (!results) return;
    const allStrategies = [...availableStrategies, ...customStrategies];
    for (const s of results.strategyStats) {
      const strategy = allStrategies.find((x) => x.id === s.strategyId);
      if (!strategy) continue;
      const strategyForHash = { ...strategy, details: 'details' in strategy ? strategy.details : undefined };
      const totalTurns = Math.round(s.averageTurnsPerGame * s.gamesPlayed);
      const totalPoints = Math.round(s.averagePointsPerTurnIncludingFarkles * totalTurns);
      const totalSuccessfulTurns =
        s.averagePointsWhenScoring > 0 ? Math.round(totalPoints / s.averagePointsWhenScoring) : 0;
      const totalFarkles = Math.round(s.averageFarklesPerGame * s.gamesPlayed);
      mergeResults(strategyForHash as any, {
        gamesPlayed: s.gamesPlayed,
        wins: s.wins,
        totalTurns,
        totalRolls: Math.round(s.averageRollsPerGame * s.gamesPlayed),
        totalFarkles,
        totalPoints,
        totalSuccessfulTurns,
        totalFarkleDice: s.averageFarkleDiceCount
          ? Math.round(s.averageFarkleDiceCount * totalFarkles)
          : undefined,
        totalFarkleEvents: s.averageFarkleDiceCount ? totalFarkles : undefined,
        totalExpectedFarkles: s.totalExpectedFarkles,
        totalActualFarkles: s.totalActualFarkles,
      });
    }
  }, [results, availableStrategies, customStrategies, mergeResults]);

  const handleRun = useCallback(() => {
    const builtInIds = selectedStrategyIds.filter((id) => !id.startsWith('custom-'));
    const customData = selectedStrategyIds
      .filter((id) => id.startsWith('custom-'))
      .map((id) => customStrategies.find((s) => s.id === id))
      .filter((s): s is CustomStrategyData => s !== undefined);

    run({
      gameCount,
      strategyIds: builtInIds,
      customStrategies: customData,
      targetScore,
      minimumScoreToBoard: minScore,
      scoringRules: { ...scoringRules, minimumScoreToBoard: minScore },
    });
  }, [
    selectedStrategyIds,
    customStrategies,
    gameCount,
    targetScore,
    minScore,
    scoringRules,
    run,
  ]);

  const enrichedResults = results?.strategyStats.map((s) => {
    const strategy =
      availableStrategies.find((x) => x.id === s.strategyId) ??
      customStrategies.find((x) => x.id === s.strategyId);
    if (!strategy) return { ...s, hash: null, cumulativeStats: null };
    const strategyForHash = { ...strategy, details: 'details' in strategy ? strategy.details : undefined };
    const hash = generateStrategyHash(strategyForHash as any, { components: strategyForHash.details });
    const cumulativeStats = getStatsForHash(hash);
    return {
      ...s,
      hash,
      cumulativeStats: cumulativeStats ? calculateDerivedStats(cumulativeStats) : null,
    };
  });

  return (
    <div className="card">
      <h2 className="section-title">2. Configure Simulation</h2>
      <div className="controls">
        <div className="control-group">
          <label htmlFor="gameCount">Number of Games</label>
          <input
            type="number"
            id="gameCount"
            value={gameCount}
            onChange={(e) => setGameCount(parseInt(e.target.value, 10) || 100)}
            min={1}
            max={10000}
          />
        </div>
        <div className="control-group">
          <label htmlFor="targetScore">Target Score</label>
          <input
            type="number"
            id="targetScore"
            value={targetScore}
            onChange={(e) => setTargetScore(parseInt(e.target.value, 10) || 10000)}
            min={1000}
            step={1000}
          />
        </div>
        <div className="control-group">
          <label htmlFor="minScore">Minimum to Board</label>
          <input
            type="number"
            id="minScore"
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value, 10) || 0)}
            min={0}
            step={100}
          />
        </div>
      </div>

      <ScoringRulesConfig rules={scoringRules} onChange={setScoringRules} />

      <button onClick={handleRun} disabled={!canRun || isRunning}>
        Run Simulation
      </button>

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 8, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {progress && <SimulationProgressDisplay progress={progress} />}

      {results && enrichedResults && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">Results</h2>
          <SimulationResults strategyStats={enrichedResults} />
        </div>
      )}
    </div>
  );
}
