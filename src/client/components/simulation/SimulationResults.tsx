import { ResultCard } from './ResultCard';
import './simulation.css';

interface StrategyStatsItem {
  strategyId: string;
  strategyName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  tieRate?: number;
  averageTurnsPerGame: number;
  averageRollsPerGame: number;
  averagePointsWhenScoring: number;
  averagePointsPerTurnIncludingFarkles: number;
  farkleRate: number;
  averageFarklesPerGame: number;
  averageFarkleDiceCount?: number;
  luckScore?: number;
  winStats?: Record<string, number>;
  tieStats?: Record<string, number>;
  lossStats?: Record<string, number>;
}

interface CumulativeStats {
  totalGames: number;
  totalWins: number;
  winRate?: number;
  avgTurnsPerGame?: number;
  avgFarklesPerGame?: number;
  farkleRate?: number;
  avgFarkleDiceCount?: number;
  luckScore?: number;
  avgPointsWhenScoring?: number;
  avgPointsPerTurnIncludingFarkles?: number;
  firstSeen?: string;
}

interface EnrichedStats extends StrategyStatsItem {
  hash: string | null;
  cumulativeStats: CumulativeStats | null;
}

interface SimulationResultsProps {
  strategyStats: EnrichedStats[];
}

export function SimulationResults({ strategyStats }: SimulationResultsProps) {
  const sorted = [...strategyStats].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="results-grid">
      {sorted.map((stats, index) => (
        <ResultCard
          key={stats.strategyId}
          stats={stats}
          rank={index + 1}
          cumulativeStats={stats.cumulativeStats}
        />
      ))}
    </div>
  );
}
