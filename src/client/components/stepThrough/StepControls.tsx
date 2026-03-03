const TYPE_DESCRIPTIONS: Record<string, string> = {
  game_start: 'Game Start',
  round_start: 'Round Start',
  roll: 'Roll',
  decisions: 'Strategy Decisions',
  round_complete: 'Round Complete',
  game_end: 'Game Over',
};

interface StepControlsProps {
  stepIndex: number;
  totalSteps: number;
  stepType: string;
  onPrevious: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
  isNextLoading: boolean;
}

export function StepControls({
  stepIndex,
  totalSteps,
  stepType,
  onPrevious,
  onNext,
  isNextDisabled,
  isNextLoading,
}: StepControlsProps) {
  const isGameOver = stepType === 'game_end';
  const nextLabel = isGameOver ? '🏆 Game Complete' : 'Next ▶️';

  return (
    <div className="step-controls" style={{ marginBottom: 20 }}>
      <button
        className="step-controls-prev"
        onClick={onPrevious}
        disabled={stepIndex === 0}
        type="button"
      >
        ◀️ Previous
      </button>
      <div className="step-controls-center">
        <div className="step-counter">
          Step {stepIndex + 1} of {totalSteps}
        </div>
        <div className="step-description">
          {TYPE_DESCRIPTIONS[stepType] ?? stepType}
        </div>
      </div>
      <button
        className="step-controls-next"
        onClick={onNext}
        disabled={isNextDisabled || isGameOver}
        type="button"
      >
        {isNextLoading ? '...' : nextLabel}
      </button>
    </div>
  );
}
