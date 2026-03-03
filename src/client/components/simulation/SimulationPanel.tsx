import React, { useState, useEffect } from 'react';
import { ScoringRulesConfig } from './ScoringRulesConfig';
import { SimulationProgress } from './SimulationProgress';
import { SimulationResults } from './SimulationResults';
import { useSimulationWebSocket } from '../../hooks/useSimulationWebSocket';
import { useStrategyStats } from '../../hooks/useStrategyStats';
import { SimulationUIConfig } from '../../App';
import { StrategyDTO } from '../strategies/StrategyCard';
import { generateStrategyHash, createInitialStats, updateStrategyStats } from '../../lib/strategyHash';

interface SimulationPanelProps {
  defaultConfig: SimulationUIConfig;
  selectedStrategyIds: string[];
  builtInStrategies: StrategyDTO[];
  customStrategies: StrategyDTO[];
}

export function SimulationPanel({ defaultConfig, selectedStrategyIds, builtInStrategies, customStrategies }: SimulationPanelProps) {
  const [config, setConfig] = useState<SimulationUIConfig>(defaultConfig);
  const { isRunning, progress, progressText, results, error, startSimulation } = useSimulationWebSocket();
  const { stats, updateStats } = useStrategyStats();

  const handleRuleChange = (key: keyof SimulationUIConfig['scoringRules'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      scoringRules: { ...prev.scoringRules, [key]: value }
    }));
  };

  const handleRun = () => {
    const payload = {
      gameCount: config.gameCount,
      targetScore: config.targetScore,
      minimumScoreToBoard: config.minimumScoreToBoard,
      scoringRules: config.scoringRules,
      strategyIds: selectedStrategyIds.filter(id => !customStrategies.find(c => c.id === id)),
      strategies: customStrategies.filter(c => selectedStrategyIds.includes(c.id)).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        ...c.details
      }))
    };
    startSimulation(payload);
  };

  useEffect(() => {
    if (results && results.strategyResults) {
      let newStats = { ...stats };
      
      for (const res of results.strategyResults) {
        const strategy = builtInStrategies.find(s => s.id === res.strategyId) ||
                         customStrategies.find(s => s.id === res.strategyId);
        
        if (!strategy) continue;

        // Generate hash
        const hash = generateStrategyHash(strategy as any, strategy.details);
        if (!newStats[hash]) {
          newStats[hash] = createInitialStats(hash, res.strategyName, strategy.description || '');
        }

        const totalTurns = Math.round(res.averageTurnsPerGame * res.gamesPlayed);
        const totalPoints = Math.round(res.averagePointsPerTurnIncludingFarkles * totalTurns);
        const totalSuccessfulTurns = res.averagePointsWhenScoring > 0
          ? Math.round(totalPoints / res.averagePointsWhenScoring)
          : 0;
        
        const totalFarkles = Math.round(res.averageFarklesPerGame * res.gamesPlayed);
        const totalFarkleDice = res.averageFarkleDiceCount
          ? Math.round(res.averageFarkleDiceCount * totalFarkles)
          : undefined;
        const totalFarkleEvents = res.averageFarkleDiceCount ? totalFarkles : undefined;

        const simulationResults = {
          name: res.strategyName,
          gamesPlayed: res.gamesPlayed,
          wins: res.wins,
          ties: res.ties,
          totalTurns,
          totalSuccessfulTurns,
          totalPoints,
          farkles: totalFarkles,
          farkleDiceCount: totalFarkleDice,
          farkleEvents: totalFarkleEvents
        };

        newStats[hash] = updateStrategyStats(newStats[hash], simulationResults as any);
      }
      
      updateStats(newStats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]); // deliberately excluding other deps to only run once per result

  return (
    <>
      <div className="card">
        <h2 className="section-title">2. Configure Simulation</h2>
        <div className="controls">
          <div className="control-group">
            <label>Number of Games</label>
            <input type="number" value={config.gameCount} onChange={e => setConfig({...config, gameCount: Number(e.target.value)})} min={1} max={10000} />
          </div>
          <div className="control-group">
            <label>Target Score</label>
            <input type="number" value={config.targetScore} onChange={e => setConfig({...config, targetScore: Number(e.target.value)})} min={1000} step={1000} />
          </div>
          <div className="control-group">
            <label>Minimum to Board</label>
            <input type="number" value={config.minimumScoreToBoard} onChange={e => setConfig({...config, minimumScoreToBoard: Number(e.target.value)})} min={0} step={100} />
          </div>
        </div>

        <ScoringRulesConfig rules={config.scoringRules} onChange={handleRuleChange} />

        <button 
          onClick={handleRun} 
          disabled={isRunning || selectedStrategyIds.length < 1}
        >
          {isRunning ? 'Running...' : 'Run Simulation'}
        </button>
        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      </div>

      {isRunning && <SimulationProgress progress={progress} text={progressText} />}
      
      {!isRunning && results && <SimulationResults results={results} />}
    </>
  );
}
