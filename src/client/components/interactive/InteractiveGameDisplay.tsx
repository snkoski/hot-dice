import { useReducer, useCallback } from 'react';
import { interactiveReducer, INITIAL_STATE } from './interactiveReducer';
import { HumanDecisionUI } from './HumanDecisionUI';
import { TurnEndNotification } from './TurnEndNotification';
import { AiTurnSummary } from './AiTurnSummary';
import { computeScoreForSelectedDice } from '../../lib/scoreComputer';
import { useHumanDecisions } from '../../hooks/useHumanDecisions';
import type { GameState } from '../../types/game';
import './interactive.css';

interface InteractiveGameDisplayProps {
  gameId: string;
  mirroredDice: boolean;
  initialStep: any;
  onClose: () => void;
}

function PlayerScoresDisplay({ gameState }: { gameState: GameState }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
      {gameState.players.map((player) => {
        const isCurrent = player.id === gameState.players[gameState.currentPlayerIndex]?.id;
        return (
          <div
            key={player.id}
            style={{
              background: isCurrent ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa',
              color: isCurrent ? 'white' : '#333',
              padding: 15, borderRadius: 8, textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{player.name}</div>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{player.totalScore}</div>
            <div style={{ fontSize: '0.85em', opacity: 0.8, marginTop: 5 }}>
              {player.isOnBoard ? '✓ On Board' : 'Not on board'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InteractiveGameDisplay({ gameId, mirroredDice, initialStep, onClose }: InteractiveGameDisplayProps) {
  const [state, dispatch] = useReducer(interactiveReducer, {
    ...INITIAL_STATE,
    gameId,
    mirroredDice,
    history: [initialStep],
    historyIndex: 0,
    current: initialStep.type === 'game_end'
      ? { phase: 'game_over', finalStep: initialStep }
      : initialStep.type === 'awaiting_human_decision' && initialStep.humanDecisions?.[0]?.type === 'dice'
        ? { phase: 'awaiting_dice_selection', step: initialStep, selectedIndices: [] }
        : initialStep.type === 'awaiting_human_decision'
          ? { phase: 'awaiting_continue', step: initialStep }
          : { phase: 'idle' },
  });

  const { saveDecision } = useHumanDecisions();

  const currentStep = state.history[state.historyIndex];
  const gameState: GameState | null = currentStep?.gameState ?? null;

  const submitDecision = useCallback(
    async (decisionId: string, decision: any) => {
      dispatch({ type: 'SUBMIT_START' });
      try {
        const res = await fetch('/api/game/interactive/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: state.gameId, decisionId, decision }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        return await res.json();
      } catch (e: any) {
        dispatch({ type: 'ERROR', message: e.message });
        dispatch({ type: 'SUBMIT_END' });
        return null;
      }
    },
    [state.gameId],
  );

  const handleConfirmDice = useCallback(async () => {
    if (state.current.phase !== 'awaiting_dice_selection') return;
    const step = state.current.step;
    const hd = step.humanDecisions[0];
    const selectedCombos = computeScoreForSelectedDice(
      state.current.selectedIndices,
      hd.context.scoringCombinations,
      hd.context.diceRolled,
    );
    const totalPoints = selectedCombos.reduce((s, c) => s + c.points, 0);
    const decision = {
      selectedCombinations: selectedCombos,
      points: totalPoints,
      diceKept: state.current.selectedIndices.length,
      reason: 'Human dice selection',
    };

    const data = await submitDecision(hd.decisionId, decision);
    if (data) {
      dispatch({ type: 'DICE_RESPONSE', step: data.step, skippedSteps: data.skippedSteps ?? [] });
    }
  }, [state.current, submitDecision]);

  const handleContinueDecision = useCallback(
    async (continueRolling: boolean) => {
      if (state.current.phase !== 'awaiting_continue') return;
      const step = state.current.step;
      const hd = step.humanDecisions[0];
      const prevTurnPoints = hd.context.turnPoints;

      const decision = {
        continue: continueRolling,
        reason: continueRolling ? 'Human chose to continue' : 'Human chose to stop',
      };

      saveDecision({
        timestamp: new Date().toISOString(),
        gameId: state.gameId!,
        diceRolled: hd.context.diceRolled,
        diceRemaining: hd.context.diceRemaining,
        turnPoints: hd.context.turnPoints,
        playerScore: hd.context.playerScore,
        opponentScores: hd.context.opponentScores,
        farkleRisk: hd.context.farkleRisk,
        availableCombinations: hd.context.scoringCombinations,
        continue: continueRolling,
        reason: decision.reason,
      });

      const data = await submitDecision(hd.decisionId, decision);
      if (data) {
        dispatch({
          type: 'CONTINUE_RESPONSE',
          step: data.step,
          skippedSteps: data.skippedSteps ?? [],
          prevTurnPoints,
          didContinue: continueRolling,
        });
      }
    },
    [state.current, state.gameId, submitDecision, saveDecision],
  );

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE' });
    onClose();
  }, [onClose]);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="section-title" style={{ margin: 0 }}>🎮 Interactive Game</h2>
        <button onClick={handleClose} style={{ padding: '8px 20px', background: '#6c757d', width: 'auto' }}>
          ✕ Close
        </button>
      </div>

      {gameState && <PlayerScoresDisplay gameState={gameState} />}

      <div style={{ textAlign: 'center', padding: 15, background: '#f8f9fa', borderRadius: 8, margin: '20px 0' }}>
        {currentStep?.message || ''}
      </div>

      <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20, margin: '20px 0' }}>
        {state.current.phase === 'awaiting_dice_selection' && (
          <HumanDecisionUI
            step={state.current.step}
            selectedIndices={state.current.selectedIndices}
            mirroredDice={state.mirroredDice}
            isSubmitting={state.isSubmitting}
            onToggleDie={(idx) => dispatch({ type: 'DICE_TOGGLED', index: idx })}
            onSelectAllDice={(indices) => dispatch({ type: 'DICE_ALL_SELECTED', indices })}
            onConfirmDice={handleConfirmDice}
            onContinueDecision={handleContinueDecision}
          />
        )}

        {state.current.phase === 'awaiting_continue' && (
          <HumanDecisionUI
            step={state.current.step}
            selectedIndices={[]}
            mirroredDice={state.mirroredDice}
            isSubmitting={state.isSubmitting}
            onToggleDie={() => {}}
            onSelectAllDice={() => {}}
            onConfirmDice={() => {}}
            onContinueDecision={handleContinueDecision}
          />
        )}

        {state.current.phase === 'turn_end_notification' && (
          <TurnEndNotification
            type={state.current.notificationType}
            points={state.current.points}
            newTotal={state.current.newTotal}
            onDone={() => dispatch({ type: 'NOTIFICATION_DONE' })}
          />
        )}

        {state.current.phase === 'ai_summary' && (
          <AiTurnSummary
            skippedSteps={state.current.skippedSteps}
            onDone={() => dispatch({ type: 'AI_SUMMARY_DONE' })}
          />
        )}

        {state.current.phase === 'game_over' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <h4 style={{ color: '#667eea', marginTop: 0 }}>🏆 Game Over!</h4>
            <p style={{ fontSize: '1.1em', color: '#333' }}>{state.current.finalStep.message}</p>
          </div>
        )}

        {state.current.phase === 'error' && (
          <div style={{ textAlign: 'center', padding: 24, color: '#dc3545' }}>
            <p>Error: {state.current.message}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
        <button
          onClick={() => dispatch({ type: 'NAVIGATE_BACK' })}
          disabled={state.historyIndex === 0}
          style={{ background: '#6c757d', width: 'auto', padding: '10px 20px' }}
        >
          ← Previous
        </button>
        <span style={{ padding: '10px 20px', background: '#f8f9fa', borderRadius: 6, fontWeight: 'bold' }}>
          Step {state.historyIndex + 1} / {state.history.length}
        </span>
        <button disabled style={{ background: '#28a745', width: 'auto', padding: '10px 20px' }}>
          Next →
        </button>
      </div>
    </div>
  );
}
