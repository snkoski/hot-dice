import React from 'react';
import { DiceFace } from '../shared/DiceFace';

interface DiceDisplayProps {
  diceRolled: number[];
  selectedIndices?: number[];
  farkle?: boolean;
}

export function DiceDisplay({ diceRolled, selectedIndices = [], farkle = false }: DiceDisplayProps) {
  if (!diceRolled || diceRolled.length === 0) return null;

  return (
    <div className="dice-container">
      {diceRolled.map((val, i) => (
        <DiceFace
          key={i} // array index is correct here as per plan
          value={val}
          selected={selectedIndices.includes(i)}
          farkle={farkle}
        />
      ))}
    </div>
  );
}
