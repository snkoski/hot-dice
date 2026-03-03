import { ResultCard } from './ResultCard';
import type { StrategyStatistics } from '../../types/simulator';
import type { StrategyStats } from '../../types/stats';
import './simulation.css';

interface SimulationResultsProps {
  strategyStats: StrategyStatistics[];
  cumulativeStatsMap: Map<string, StrategyStats>;
}

export function SimulationResults({ strategyStats, cumulativeStatsMap }: SimulationResultsProps) {
  const sorted = [...strategyStats].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="card">
      <h2 className="section-title">Results</h2>
      <div className="results-grid">
        {sorted.map((stats, index) => (
          <ResultCard
            key={stats.strategyId}
            stats={stats}
            rank={index + 1}
            cumulativeStats={cumulativeStatsMap.get(stats.strategyId) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
