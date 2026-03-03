import { PlayerScores } from './PlayerScores';
import { StepControls } from './StepControls';
import { DiceDisplay } from './DiceDisplay';
import { TurnInfo } from './TurnInfo';
import { DecisionDisplay } from './DecisionDisplay';
import type { StepGameStep } from '../../types/stepGame';
import clsx from 'clsx';

interface StepGameDisplayProps {
  step: StepGameStep | null;
  stepIndex: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  isNextDisabled: boolean;
  isNextLoading: boolean;
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  game_start: 'Game Start',
  round_start: 'Round Start',
  roll: 'Roll',
  decisions: 'Strategy Decisions',
  round_complete: 'Round Complete',
  game_end: 'Game Over',
};

export function StepGameDisplay({
  step,
  stepIndex,
  totalSteps,
  onPrevious,
  onNext,
  onClose,
  isNextDisabled,
  isNextLoading,
}: StepGameDisplayProps) {
  if (!step) return null;

  const showTurnInfo =
    step.type === 'round_start' ||
    step.type === 'roll' ||
    step.type === 'decisions';
  const showDice =
    step.type === 'roll' || step.type === 'decisions';
  const showDecision =
    step.type === 'roll' ||
    step.type === 'decisions' ||
    step.type === 'round_complete' ||
    step.type === 'game_end';

  return (
    <>
      <div className="step-game-header">
        <h2 className="section-title" style={{ margin: 0 }}>
          🎮 Game in Progress
        </h2>
        <button
          className="step-game-close-btn"
          onClick={onClose}
          type="button"
        >
          ✕ Close
        </button>
      </div>

      <StepControls
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        stepType={step.type}
        onPrevious={onPrevious}
        onNext={onNext}
        isNextDisabled={isNextDisabled}
        isNextLoading={isNextLoading}
      />

      <PlayerScores gameState={step.gameState} />

      {showTurnInfo && (
        <TurnInfo
          roundNumber={step.roundNumber ?? 0}
          rollNumber={step.rollNumber ?? 0}
        />
      )}

      <div className="message-box">{step.message ?? 'Click "Next" to begin the game'}</div>

      <div className={clsx('dice-container', !showDice && 'hidden')}>
        {showDice && step.diceRolled && (
          <DiceDisplay diceValues={step.diceRolled} selectedIndices={[]} />
        )}
      </div>

      {showDecision && (
        <DecisionDisplay
          stepType={step.type}
          scoringCombinations={step.scoringCombinations}
          playerDecisions={step.playerDecisions}
          roundResults={step.roundResults}
          message={step.message}
        />
      )}
    </>
  );
}
