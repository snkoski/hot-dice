import { useState, useCallback } from 'react';
import { StepControls } from './StepControls';
import { PlayerScores } from './PlayerScores';
import { DiceDisplay } from './DiceDisplay';
import { TurnInfo } from './TurnInfo';
import { DecisionDisplay } from './DecisionDisplay';
import type { ScoringRules } from '../../types/game';
import type { CustomStrategy } from '../../App';
import './stepThrough.css';

interface StepGameDisplayProps {
  selectedStrategyIds: string[];
  customStrategies: CustomStrategy[];
  scoringRules: ScoringRules;
  targetScore: number;
  minScore: number;
  onClose: () => void;
}

function getStepDescription(step: any): string {
  const map: Record<string, string> = {
    game_start: 'Game Start',
    round_start: `Round ${step.roundNumber} Start`,
    roll: `Roll ${step.rollNumber}`,
    decisions: 'Strategy Decisions',
    round_complete: 'Round Complete',
    game_end: 'Game Over',
  };
  return map[step.type] ?? step.type;
}

export function StepGameDisplay({
  selectedStrategyIds,
  customStrategies,
  scoringRules,
  targetScore,
  minScore,
  onClose,
}: StepGameDisplayProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentStep = history[currentIndex] ?? null;
  const isGameOver = currentStep?.type === 'game_end';

  const startGame = useCallback(async () => {
    const builtInIds = selectedStrategyIds.filter((id) => !id.startsWith('custom-'));
    const customData = selectedStrategyIds
      .filter((id) => id.startsWith('custom-'))
      .map((id) => customStrategies.find((s) => s.id === id))
      .filter(Boolean);

    try {
      setLoading(true);
      const res = await fetch('/api/game/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyIds: builtInIds,
          strategies: customData,
          targetScore,
          minimumScoreToBoard: minScore,
          scoringRules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game');

      setGameId(data.gameId);
      setHistory([data.currentStep]);
      setCurrentIndex(0);
    } catch (e: any) {
      alert('Failed to start game: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStrategyIds, customStrategies, targetScore, minScore, scoringRules]);

  const nextStep = useCallback(async () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    if (!gameId) return;

    try {
      setLoading(true);
      const res = await fetch('/api/game/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance step');

      setHistory((prev) => [...prev, data.step]);
      setCurrentIndex((prev) => prev + 1);
    } catch (e: any) {
      alert('Failed to advance step: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [currentIndex, history.length, gameId]);

  const prevStep = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  if (!gameId) {
    return (
      <button onClick={startGame} disabled={selectedStrategyIds.length < 1 || loading} style={{ background: '#28a745' }}>
        {loading ? 'Starting...' : '🎮 Start Step-Through Game'}
      </button>
    );
  }

  const showTurnInfo = currentStep && ['round_start', 'roll', 'decisions'].includes(currentStep.type);
  const showDice = currentStep && ['roll', 'decisions'].includes(currentStep.type) && currentStep.diceRolled;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="section-title" style={{ margin: 0 }}>🎮 Game in Progress</h2>
        <button onClick={onClose} style={{ padding: '8px 20px', fontSize: '0.9em', width: 'auto', background: '#6c757d' }}>
          ✕ Close
        </button>
      </div>

      <StepControls
        currentIndex={currentIndex}
        totalSteps={history.length}
        stepDescription={currentStep ? getStepDescription(currentStep) : ''}
        isGameOver={isGameOver}
        onPrevious={prevStep}
        onNext={nextStep}
      />

      {currentStep?.gameState && <PlayerScores gameState={currentStep.gameState} />}

      {showTurnInfo && (
        <TurnInfo roundNumber={currentStep.roundNumber ?? 0} rollNumber={currentStep.rollNumber ?? 0} />
      )}

      <div className="message-box">{currentStep?.message || 'Click "Next" to begin the game'}</div>

      {showDice && <DiceDisplay diceValues={currentStep.diceRolled} />}

      {currentStep && <DecisionDisplay step={currentStep} />}
    </div>
  );
}
