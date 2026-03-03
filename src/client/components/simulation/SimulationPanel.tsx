import { useState, useCallback, useRef } from 'react';
import { ScoringRulesConfig } from './ScoringRulesConfig';
import { SimulationProgress as SimProgress } from './SimulationProgress';
import { SimulationResults } from './SimulationResults';
import { useSimulationWebSocket } from '../../hooks/useSimulationWebSocket';
import { useStrategyStats } from '../../hooks/useStrategyStats';
import { generateStrategyHash } from '../../lib/strategyHash';
import type { ScoringRules } from '../../types/game';
import type { SimulationProgress as ProgressType, SimulationResults as ResultsType, StrategyStatistics } from '../../types/simulator';
import type { StrategyStats } from '../../types/stats';
import type { StrategyInfo, CustomStrategy } from '../../App';

interface SimulationPanelProps {
  selectedStrategyIds: string[];
  allStrategies: (StrategyInfo | CustomStrategy)[];
  customStrategies: CustomStrategy[];
  defaultScoringRules: ScoringRules;
}

export function SimulationPanel({
  selectedStrategyIds,
  allStrategies,
  customStrategies,
  defaultScoringRules,
}: SimulationPanelProps) {
  const [gameCount, setGameCount] = useState(100);
  const [targetScore, setTargetScore] = useState(10000);
  const [minScore, setMinScore] = useState(0);
  const [scoringRules, setScoringRules] = useState<ScoringRules>(defaultScoringRules);
  const [progress, setProgress] = useState<ProgressType | null>(null);
  const [results, setResults] = useState<StrategyStatistics[] | null>(null);
  const [cumulativeMap, setCumulativeMap] = useState<Map<string, StrategyStats>>(new Map());
  const [running, setRunning] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { update: updateStats } = useStrategyStats();

  const handleProgress = useCallback((p: ProgressType) => setProgress(p), []);

  const handleComplete = useCallback(
    (data: ResultsType) => {
      setRunning(false);
      setProgress(null);

      const newMap = new Map<string, StrategyStats>();

      data.strategyStats.forEach((stats) => {
        const strategy = allStrategies.find((s) => s.id === stats.strategyId);
        if (!strategy) return;

        const hash = generateStrategyHash(strategy as any);
        const totalTurns = Math.round(stats.averageTurnsPerGame * stats.gamesPlayed);
        const totalPoints = Math.round(stats.averagePointsPerTurnIncludingFarkles * totalTurns);
        const totalSuccessfulTurns =
          stats.averagePointsWhenScoring > 0
            ? Math.round(totalPoints / stats.averagePointsWhenScoring)
            : 0;
        const totalFarkles = Math.round(stats.averageFarklesPerGame * stats.gamesPlayed);

        const cumulative = updateStats(hash, {
          name: stats.strategyName,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          totalTurns,
          totalRolls: Math.round(stats.averageRollsPerGame * stats.gamesPlayed),
          totalFarkles,
          totalPoints,
          totalSuccessfulTurns,
          totalFarkleDice: stats.averageFarkleDiceCount
            ? Math.round(stats.averageFarkleDiceCount * totalFarkles)
            : undefined,
          totalFarkleEvents: stats.averageFarkleDiceCount ? totalFarkles : undefined,
          totalExpectedFarkles: stats.totalExpectedFarkles,
          totalActualFarkles: stats.totalActualFarkles,
        });
        newMap.set(stats.strategyId, cumulative);
      });

      setCumulativeMap(newMap);
      setResults(data.strategyStats);

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
    [allStrategies, updateStats],
  );

  const handleError = useCallback((msg: string) => {
    setRunning(false);
    setProgress(null);
    alert('Simulation failed: ' + msg);
  }, []);

  const { start } = useSimulationWebSocket(handleProgress, handleComplete, handleError);

  const runSimulation = () => {
    const builtInIds = selectedStrategyIds.filter((id) => !id.startsWith('custom-'));
    const customData = selectedStrategyIds
      .filter((id) => id.startsWith('custom-'))
      .map((id) => customStrategies.find((s) => s.id === id))
      .filter(Boolean);

    setRunning(true);
    setResults(null);
    start({
      gameCount,
      strategyIds: builtInIds,
      strategies: customData,
      targetScore,
      minimumScoreToBoard: minScore,
      scoringRules,
    });
  };

  return (
    <>
      <div className="card">
        <h2 className="section-title">2. Configure Simulation</h2>
        <div className="controls">
          <div className="control-group">
            <label>Number of Games</label>
            <input
              type="number"
              value={gameCount}
              onChange={(e) => setGameCount(parseInt(e.target.value) || 0)}
              min={1}
              max={10000}
            />
          </div>
          <div className="control-group">
            <label>Target Score</label>
            <input
              type="number"
              value={targetScore}
              onChange={(e) => setTargetScore(parseInt(e.target.value) || 0)}
              min={1000}
              step={1000}
            />
          </div>
          <div className="control-group">
            <label>Minimum to Board</label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
              min={0}
              step={100}
            />
          </div>
        </div>

        <ScoringRulesConfig rules={scoringRules} onChange={setScoringRules} />

        <button
          onClick={runSimulation}
          disabled={selectedStrategyIds.length < 1 || running}
        >
          {running ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      {running && <SimProgress progress={progress} />}

      <div ref={resultsRef}>
        {results && (
          <SimulationResults strategyStats={results} cumulativeStatsMap={cumulativeMap} />
        )}
      </div>
    </>
  );
}
