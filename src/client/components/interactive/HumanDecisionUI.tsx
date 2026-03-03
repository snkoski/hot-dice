import React from 'react';
import { DiceSelectionUI } from './DiceSelectionUI';
import { ContinueDecisionUI } from './ContinueDecisionUI';

interface HumanDecisionUIProps {
  phase: 'awaiting_dice_selection' | 'awaiting_continue';
  step: any;
  selectedIndices: number[];
  onToggleDie: (index: number) => void;
  onSelectAll: () => void;
  onConfirm: (decisionPayload: any) => void;
  isSubmitting: boolean;
}

export function HumanDecisionUI({ phase, step, selectedIndices, onToggleDie, onSelectAll, onConfirm, isSubmitting }: HumanDecisionUIProps) {
  if (phase === 'awaiting_dice_selection') {
    return (
      <DiceSelectionUI
        context={step.decision.context}
        selectedIndices={selectedIndices}
        onToggleDie={onToggleDie}
        onSelectAll={onSelectAll}
        onConfirm={onConfirm}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (phase === 'awaiting_continue') {
    return (
      <ContinueDecisionUI
        context={step.decision.context}
        onConfirm={onConfirm}
        isSubmitting={isSubmitting}
      />
    );
  }

  return null;
}
