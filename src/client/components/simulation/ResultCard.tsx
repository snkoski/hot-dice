import { memo } from 'react';
import { StatRow } from '../shared/StatRow';
import type { StrategyStatistics } from '../../types/simulator';
import type { StrategyStats } from '../../types/stats';
import './simulation.css';

interface ResultCardProps {
  stats: StrategyStatistics;
  rank: number;
  cumulativeStats: StrategyStats | null;
}

function luckColor(score: number) {
  if (score > 0) return '#10b981';
  if (score < 0) return '#ef4444';
  return '#6b7280';
}

function OutcomeBreakdown({ label, emoji, count, outcomeStats, bgColor, textColor }: {
  label: string; emoji: string; count: number;
  outcomeStats: any; bgColor: string; textColor: string;
}) {
  if (!outcomeStats) return null;
  return (
    <div style={{ background: bgColor, padding: 10, borderRadius: 6 }}>
      <div style={{ fontWeight: 600, color: textColor, marginBottom: 8 }}>{emoji} {label} ({count})</div>
      <StatRow label="Avg Score:" value={outcomeStats.averageScore.toFixed(0)} />
      <StatRow label="Avg Turns:" value={outcomeStats.averageTurns.toFixed(1)} />
      <StatRow label="Avg Farkles:" value={outcomeStats.averageFarkles.toFixed(1)} />
      <StatRow label="Farkle Rate:" value={`${(outcomeStats.farkleRate * 100).toFixed(1)}%`} />
      {outcomeStats.averageFarkleDiceCount != null && (
        <StatRow label="Avg Farkle Dice:" value={outcomeStats.averageFarkleDiceCount.toFixed(1)} />
      )}
      {outcomeStats.luckScore !== undefined && (
        <StatRow
          label="Luck Score:"
          value={`${outcomeStats.luckScore > 0 ? '+' : ''}${outcomeStats.luckScore.toFixed(1)}%`}
          valueStyle={{ color: luckColor(outcomeStats.luckScore) }}
        />
      )}
      <StatRow label="Avg When Scoring:" value={outcomeStats.averagePointsWhenScoring.toFixed(0)} />
    </div>
  );
}

export const ResultCard = memo(function ResultCard({ stats, rank, cumulativeStats }: ResultCardProps) {
  const s = stats;
  const hasBreakdowns = s.winStats || s.tieStats || s.lossStats;

  return (
    <div className={`result-card ${rank === 1 ? 'winner' : ''}`}>
      <div className="rank">#{rank} {rank === 1 ? '👑' : ''}</div>
      <h3>{s.strategyName}</h3>

      <div style={{ background: '#f8f9fa', padding: 10, borderRadius: 6, margin: '10px 0' }}>
        <div style={{ fontWeight: 600, color: '#667eea', marginBottom: 8 }}>📊 This Simulation</div>
        <StatRow label="Win Rate:" value={`${(s.winRate * 100).toFixed(1)}%`} />
        <StatRow label="Wins:" value={`${s.wins} / ${s.gamesPlayed}`} />
        {s.ties > 0 && (
          <StatRow label="Ties:" value={`${s.ties} (${(s.tieRate * 100).toFixed(1)}%)`} valueStyle={{ color: '#9ca3af' }} />
        )}
        {s.losses > 0 && <StatRow label="Losses:" value={s.losses} />}
        <StatRow label="Avg Turns:" value={s.averageTurnsPerGame.toFixed(1)} />
        <StatRow label="Avg Farkles:" value={s.averageFarklesPerGame.toFixed(1)} />
        <StatRow label="Farkle Rate:" value={`${(s.farkleRate * 100).toFixed(1)}%`} />
        {s.averageFarkleDiceCount != null && (
          <StatRow label="Avg Farkle Dice:" value={`${s.averageFarkleDiceCount.toFixed(1)} dice`} />
        )}
        {s.luckScore !== undefined && (
          <StatRow
            label="Luck Score:"
            value={`${s.luckScore > 0 ? '+' : ''}${s.luckScore.toFixed(1)}%`}
            valueStyle={{ color: luckColor(s.luckScore) }}
          />
        )}
        <StatRow label="Avg When Scoring:" value={s.averagePointsWhenScoring.toFixed(0)} />
        <StatRow label="Avg Per Turn (w/ Farkles):" value={s.averagePointsPerTurnIncludingFarkles.toFixed(0)} />
      </div>

      {hasBreakdowns && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: s.tieStats ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: 10, margin: '10px 0',
        }}>
          <OutcomeBreakdown label="Wins" emoji="✅" count={s.wins - (s.ties || 0)} outcomeStats={s.winStats} bgColor="#d1fae5" textColor="#065f46" />
          <OutcomeBreakdown label="Ties" emoji="🤝" count={s.ties} outcomeStats={s.tieStats} bgColor="#f3f4f6" textColor="#6b7280" />
          <OutcomeBreakdown label="Losses" emoji="❌" count={s.losses} outcomeStats={s.lossStats} bgColor="#fee2e2" textColor="#991b1b" />
        </div>
      )}

      {cumulativeStats && cumulativeStats.totalGames > 0 && (
        <div style={{ background: '#e8f0fe', padding: 10, borderRadius: 6, margin: '10px 0' }}>
          <div style={{ fontWeight: 600, color: '#1a73e8', marginBottom: 8 }}>📈 All Time ({cumulativeStats.totalGames} games)</div>
          <StatRow label="Win Rate:" value={`${((cumulativeStats.winRate ?? 0) * 100).toFixed(1)}%`} />
          <StatRow label="Total Wins:" value={cumulativeStats.totalWins.toLocaleString()} />
          <StatRow label="Avg Turns:" value={(cumulativeStats.avgTurnsPerGame ?? 0).toFixed(1)} />
          <StatRow label="Avg Farkles:" value={(cumulativeStats.avgFarklesPerGame ?? 0).toFixed(1)} />
          <StatRow label="Farkle Rate:" value={`${((cumulativeStats.farkleRate ?? 0) * 100).toFixed(1)}%`} />
          {cumulativeStats.avgFarkleDiceCount != null && (
            <StatRow label="Avg Farkle Dice:" value={`${cumulativeStats.avgFarkleDiceCount.toFixed(1)} dice`} />
          )}
          {cumulativeStats.luckScore !== undefined && (
            <StatRow
              label="Luck Score:"
              value={`${cumulativeStats.luckScore > 0 ? '+' : ''}${cumulativeStats.luckScore.toFixed(1)}%`}
              valueStyle={{ color: luckColor(cumulativeStats.luckScore) }}
            />
          )}
          <StatRow label="Avg When Scoring:" value={cumulativeStats.avgPointsWhenScoring ? cumulativeStats.avgPointsWhenScoring.toFixed(0) : 'N/A'} />
          <StatRow label="Avg Per Turn (w/ Farkles):" value={cumulativeStats.avgPointsPerTurnIncludingFarkles ? cumulativeStats.avgPointsPerTurnIncludingFarkles.toFixed(0) : 'N/A'} />
          <div style={{ fontSize: '0.85em', color: '#666', marginTop: 8, fontStyle: 'italic' }}>
            Tracked since {new Date(cumulativeStats.firstSeen).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
});
