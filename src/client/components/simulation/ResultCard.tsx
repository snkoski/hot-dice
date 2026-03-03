import { memo } from 'react';
import { StatRow } from '../shared/StatRow';
import './simulation.css';

interface ResultStats {
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

interface ResultCardProps {
  stats: ResultStats;
  rank: number;
  cumulativeStats?: CumulativeStats | null;
}

function ResultCardInner({ stats, rank, cumulativeStats }: ResultCardProps) {
  const luckColor =
    (stats.luckScore ?? 0) > 0 ? '#10b981' : (stats.luckScore ?? 0) < 0 ? '#ef4444' : '#6b7280';

  return (
    <div className={`result-card ${rank === 1 ? 'winner' : ''}`}>
      <div className="rank">
        #{rank} {rank === 1 ? '👑' : ''}
      </div>
      <h3>{stats.strategyName}</h3>

      <div style={{ background: '#f8f9fa', padding: 10, borderRadius: 6, margin: '10px 0' }}>
        <div style={{ fontWeight: 600, color: '#667eea', marginBottom: 8 }}>📊 This Simulation</div>
        <StatRow label="Win Rate:" value={`${(stats.winRate * 100).toFixed(1)}%`} />
        <StatRow label="Wins:" value={`${stats.wins} / ${stats.gamesPlayed}`} />
        {stats.ties > 0 && (
          <StatRow
            label="Ties:"
            value={
              <span style={{ color: '#9ca3af' }}>
                {stats.ties} ({(stats.tieRate ?? 0) * 100}%)
              </span>
            }
          />
        )}
        {stats.losses > 0 && <StatRow label="Losses:" value={stats.losses} />}
        <StatRow label="Avg Turns:" value={stats.averageTurnsPerGame.toFixed(1)} />
        <StatRow label="Avg Farkles:" value={stats.averageFarklesPerGame.toFixed(1)} />
        <StatRow label="Farkle Rate:" value={`${(stats.farkleRate * 100).toFixed(1)}%`} />
        {stats.averageFarkleDiceCount != null && (
          <StatRow label="Avg Farkle Dice:" value={`${stats.averageFarkleDiceCount.toFixed(1)} dice`} />
        )}
        {stats.luckScore != null && (
          <StatRow
            label="Luck Score:"
            value={<span style={{ color: luckColor }}>{(stats.luckScore > 0 ? '+' : '') + stats.luckScore.toFixed(1)}%</span>}
          />
        )}
        <StatRow label="Avg When Scoring:" value={stats.averagePointsWhenScoring.toFixed(0)} />
        <StatRow label="Avg Per Turn (w/ Farkles):" value={stats.averagePointsPerTurnIncludingFarkles.toFixed(0)} />
      </div>

      {cumulativeStats && (
        <div style={{ background: '#e8f0fe', padding: 10, borderRadius: 6, margin: '10px 0' }}>
          <div style={{ fontWeight: 600, color: '#1a73e8', marginBottom: 8 }}>
            📈 All Time ({cumulativeStats.totalGames} games)
          </div>
          {cumulativeStats.winRate != null && (
            <StatRow label="Win Rate:" value={`${(cumulativeStats.winRate * 100).toFixed(1)}%`} />
          )}
          <StatRow label="Total Wins:" value={cumulativeStats.totalWins.toLocaleString()} />
          {cumulativeStats.avgTurnsPerGame != null && (
            <StatRow label="Avg Turns:" value={cumulativeStats.avgTurnsPerGame.toFixed(1)} />
          )}
          {cumulativeStats.avgFarklesPerGame != null && (
            <StatRow label="Avg Farkles:" value={cumulativeStats.avgFarklesPerGame.toFixed(1)} />
          )}
          {cumulativeStats.farkleRate != null && (
            <StatRow label="Farkle Rate:" value={`${(cumulativeStats.farkleRate * 100).toFixed(1)}%`} />
          )}
          {cumulativeStats.avgPointsWhenScoring != null && (
            <StatRow label="Avg When Scoring:" value={cumulativeStats.avgPointsWhenScoring.toFixed(0)} />
          )}
          {cumulativeStats.avgPointsPerTurnIncludingFarkles != null && (
            <StatRow label="Avg Per Turn (w/ Farkles):" value={cumulativeStats.avgPointsPerTurnIncludingFarkles.toFixed(0)} />
          )}
          {cumulativeStats.firstSeen && (
            <div style={{ fontSize: '0.85em', color: '#666', marginTop: 8, fontStyle: 'italic' }}>
              Tracked since {new Date(cumulativeStats.firstSeen).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ResultCard = memo(ResultCardInner);
