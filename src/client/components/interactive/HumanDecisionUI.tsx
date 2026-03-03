import { DiceSelectionUI } from './DiceSelectionUI';
import { ContinueDecisionUI } from './ContinueDecisionUI';

interface HumanDecisionUIProps {
  step: any;
  selectedIndices: number[];
  mirroredDice: boolean;
  isSubmitting: boolean;
  onToggleDie: (index: number) => void;
  onSelectAllDice: (indices: number[]) => void;
  onConfirmDice: () => void;
  onContinueDecision: (continueRolling: boolean) => void;
}

export function HumanDecisionUI({
  step,
  selectedIndices,
  mirroredDice,
  isSubmitting,
  onToggleDie,
  onSelectAllDice,
  onConfirmDice,
  onContinueDecision,
}: HumanDecisionUIProps) {
  if (!step.humanDecisions?.length) return null;
  const hd = step.humanDecisions[0];

  if (hd.type === 'dice') {
    return (
      <DiceSelectionUI
        diceRolled={hd.context.diceRolled}
        scoringCombinations={hd.context.scoringCombinations}
        turnPoints={hd.context.turnPoints}
        selectedIndices={selectedIndices}
        mirroredDice={mirroredDice}
        isSubmitting={isSubmitting}
        onToggle={onToggleDie}
        onSelectAll={onSelectAllDice}
        onConfirm={onConfirmDice}
      />
    );
  }

  return (
    <ContinueDecisionUI
      turnPoints={hd.context.turnPoints}
      diceRemaining={hd.context.diceRemaining}
      isSubmitting={isSubmitting}
      onDecision={onContinueDecision}
    />
  );
}
