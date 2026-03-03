import clsx from 'clsx';
import { getDiceFace } from '../../lib/formatters';
import './stepThrough.css';

interface DiceDisplayProps {
  diceValues: number[];
  selectedIndices?: number[];
  isFarkle?: boolean;
}

export function DiceDisplay({ diceValues, selectedIndices = [], isFarkle = false }: DiceDisplayProps) {
  if (!diceValues || diceValues.length === 0) return null;

  return (
    <div className="dice-container">
      {diceValues.map((value, index) => (
        <div
          key={index}
          className={clsx('die', {
            selected: selectedIndices.includes(index),
            farkle: isFarkle,
          })}
        >
          {getDiceFace(value)}
        </div>
      ))}
    </div>
  );
}
