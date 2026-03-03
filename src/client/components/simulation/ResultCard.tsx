import React, { memo } from 'react';
import { clsx } from 'clsx';
import { StatRow } from '../shared/StatRow';
import { formatNumber, formatPercent } from '../../lib/formatters';

interface ResultCardProps {
  result: any;
  rank: number;
}

export const ResultCard = memo(function ResultCard({ result, rank }: ResultCardProps) {
  const isWinner = rank === 1;

  return (
    <div className={clsx('result-card', { winner: isWinner })}>
      <div className="rank">#{rank}</div>
      <h3 style={{ color: '#667eea', marginBottom: '15px' }}>{result.strategyName}</h3>
      
      <StatRow label="Win Rate" value={formatPercent(result.winRate)} />
      <StatRow label="Games Won" value={formatNumber(result.wins)} />
      <StatRow label="Avg Points/Turn" value={Math.round(result.averagePointsPerTurn)} />
      <StatRow label="Farkle Rate" value={formatPercent(result.farkleRate)} />
      
      {result.ties > 0 && (
        <StatRow label="Ties" value={formatNumber(result.ties)} />
      )}
    </div>
  );
});
