import { useState, useCallback } from 'react';
import { StepGameDisplay } from './StepGameDisplay';
import type { CustomStrategyData } from '../strategies/StrategyPanel';
import type { ScoringRules } from '../../types/game';
import type { StepGameStep } from '../../types/stepGame';
import './stepThrough.css';

interface StepThroughPanelProps {
  selectedStrategyIds: string[];
  customStrategies: CustomStrategyData[];
  targetScore: number;
  minScore: number;
  scoringRules: ScoringRules;
  canStart: boolean;
}

export function StepThroughPanel({
  selectedStrategyIds,
  customStrategies,
  targetScore,
  minScore,
  scoringRules,
  canStart,
}: StepThroughPanelProps) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [stepHistory, setStepHistory] = useState<StepGameStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    const builtInIds = selectedStrategyIds.filter((id) => !id.startsWith('custom-'));
    const customData = selectedStrategyIds
      .filter((id) => id.startsWith('custom-'))
      .map((id) => customStrategies.find((s) => s.id === id))
      .filter((s): s is CustomStrategyData => s !== undefined);

    try {
      const res = await fetch('/api/game/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyIds: builtInIds,
          strategies: customData,
          targetScore,
          minimumScoreToBoard: minScore,
          scoringRules: { ...scoringRules, minimumScoreToBoard: minScore },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game');

      setGameId(data.gameId);
      setStepHistory([data.currentStep]);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedStrategyIds,
    customStrategies,
    targetScore,
    minScore,
    scoringRules,
  ]);

  const handleClose = useCallback(() => {
    setGameId(null);
    setStepHistory([]);
    setCurrentIndex(0);
    setError(null);
  }, []);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleNext = useCallback(async () => {
    if (!gameId) return;

    if (currentIndex < stepHistory.length - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }

    const currentStep = stepHistory[currentIndex];
    if (currentStep.type === 'game_end') return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/game/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance step');

      setStepHistory((prev) => [...prev, data.step]);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance step');
    } finally {
      setIsLoading(false);
    }
  }, [gameId, currentIndex, stepHistory]);

  const isActive = gameId !== null;
  const currentStep = stepHistory[currentIndex] ?? null;
  const isGameOver = currentStep?.type === 'game_end';
  const canGoNext = !isGameOver && (currentIndex < stepHistory.length - 1 || !isLoading);

  return (
    <div className="card">
      <h2 className="section-title">🔍 Step-Through Mode</h2>
      <p className="step-through-description">
        Watch a single game unfold step by step. See each dice roll and how strategies make
        decisions in real-time.
      </p>

      {!isActive ? (
        <button
          className="step-through-start-btn"
          onClick={handleStart}
          disabled={!canStart || isLoading}
        >
          {isLoading ? 'Starting...' : '🎮 Start Step-Through Game'}
        </button>
      ) : (
        <StepGameDisplay
          step={currentStep}
          stepIndex={currentIndex}
          totalSteps={stepHistory.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onClose={handleClose}
          isNextDisabled={!canGoNext}
          isNextLoading={isLoading}
        />
      )}

      {error && (
        <div className="step-through-error">
          {error}
        </div>
      )}
    </div>
  );
}
