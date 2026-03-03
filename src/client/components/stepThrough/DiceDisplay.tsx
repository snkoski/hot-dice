import { DiceFace } from '../shared/DiceFace';

interface DiceDisplayProps {
  diceValues: number[];
  selectedIndices?: number[];
  isFarkle?: boolean;
}

export function DiceDisplay({
  diceValues,
  selectedIndices = [],
  isFarkle = false,
}: DiceDisplayProps) {
  if (!diceValues.length) return null;

  return (
    <>
      {diceValues.map((value, index) => (
        <DiceFace
          key={index}
          value={value}
          selected={selectedIndices.includes(index)}
          farkle={isFarkle}
        />
      ))}
    </>
  );
}
