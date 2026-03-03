import { useState } from 'react';
import { InteractiveGameDisplay } from './InteractiveGameDisplay';
import type { CustomStrategyData } from '../strategies/StrategyPanel';
import type { ScoringRules } from '../../types/game';
import { useHumanDecisions } from '../../hooks/useHumanDecisions';
import './interactive.css';

interface InteractivePanelProps {
  selectedStrategyIds: string[];
  customStrategies: CustomStrategyData[];
  targetScore: number;
  minScore: number;
  scoringRules: ScoringRules;
}

export function InteractivePanel({
  selectedStrategyIds,
  customStrategies,
  targetScore,
  minScore,
  scoringRules,
}: InteractivePanelProps) {
  const [mirroredDice, setMirroredDice] = useState(false);
  const [gameState, setGameState] = useState<{
    gameId: string;
    initialStep: unknown;
    mirroredDice: boolean;
  } | null>(null);
  const { addDecision } = useHumanDecisions();

  const [startError, setStartError] = useState<string | null>(null);

  const handleStart = async () => {
    setStartError(null);
    try {
      const builtInIds = selectedStrategyIds.filter((id) => !id.startsWith('custom-'));
      const res = await fetch('/api/game/interactive/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyIds: builtInIds,
          humanPlayerIndices: [0],
          targetScore,
          minimumScoreToBoard: minScore,
          mirroredDice,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start game');
      }

      const data = await res.json();
      setGameState({
        gameId: data.gameId,
        initialStep: data.currentStep,
        mirroredDice: data.mirroredDice ?? false,
      });
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start game');
    }
  };

  const handleClose = () => {
    setGameState(null);
  };

  const effectiveMirroredDice = gameState?.mirroredDice ?? mirroredDice;

  return (
    <div className="card">
      <h2 className="section-title">🎮 Play Interactive Game</h2>
      <p className="interactive-description">
        Play against AI strategies! Make real decisions, see immediate results, and build your
        play history for analysis.
      </p>

      <label className="interactive-mirrored-toggle">
        <input
          type="checkbox"
          checked={gameState ? effectiveMirroredDice : mirroredDice}
          onChange={(e) => setMirroredDice(e.target.checked)}
          disabled={gameState !== null}
        />
        <span>
          <strong>Mirrored dice</strong> — all players roll the same dice each round
        </span>
      </label>

      {!gameState ? (
        <>
          <div className="interactive-actions">
            <button
              className="interactive-start-btn"
              onClick={handleStart}
              type="button"
            >
              🎮 Start Interactive Game
            </button>
          </div>
          {startError && (
            <div className="interactive-error">{startError}</div>
          )}
        </>
      ) : (
        <InteractiveGameDisplay
          gameId={gameState.gameId}
          initialStep={gameState.initialStep}
          mirroredDice={effectiveMirroredDice}
          onClose={handleClose}
          addDecision={addDecision}
        />
      )}
    </div>
  );
}
