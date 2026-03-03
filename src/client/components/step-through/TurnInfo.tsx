import React from 'react';
import { TurnState } from '../../types/game';

interface TurnInfoProps {
  turn: TurnState | null;
  playerName: string;
}

export function TurnInfo({ turn, playerName }: TurnInfoProps) {
  if (!turn) return null;

  return (
    <div className="turn-info">
      <h4>Current Turn: {playerName}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div><strong>Turn Points:</strong> {turn.turnPoints}</div>
        <div><strong>Roll Number:</strong> {turn.rollNumber}</div>
        <div><strong>Dice Remaining:</strong> {turn.diceRemaining}</div>
      </div>
    </div>
  );
}
