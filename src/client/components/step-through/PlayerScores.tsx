import React from 'react';
import { clsx } from 'clsx';
import { PlayerState } from '../../types/game';

interface PlayerScoresProps {
  players: PlayerState[];
  currentPlayerIndex: number;
}

export function PlayerScores({ players, currentPlayerIndex }: PlayerScoresProps) {
  return (
    <div className="player-scores">
      {players.map((p, i) => (
        <div key={p.id} className={clsx('player-score-card', { current: i === currentPlayerIndex })}>
          <h4>{p.name}</h4>
          <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{p.totalScore}</div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>
            {p.isOnBoard ? 'On Board' : 'Not On Board'}
          </div>
        </div>
      ))}
    </div>
  );
}
