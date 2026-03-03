import { useReducer, useCallback, useState, useEffect } from 'react';
import { PlayerScoresDisplay } from './PlayerScoresDisplay';
import { DiceSelectionUI } from './DiceSelectionUI';
import { ContinueDecisionUI } from './ContinueDecisionUI';
import { AiSummaryOverlay } from './AiSummaryOverlay';
import { TurnEndNotification } from './TurnEndNotification';
import type { InteractiveGameStep, PendingHumanDecision } from '../../types/stepGame';
import type { HumanDecisionRecord } from '../../hooks/useHumanDecisions';
import clsx from 'clsx';
import './interactive.css';

type OverlayPhase = 'ai_summary' | 'turn_end_notification' | 'error' | null;

interface InteractiveState {
  stepHistory: InteractiveGameStep[];
  currentIndex: number;
  overlayPhase: OverlayPhase;
  overlayData: {
    skippedSteps?: InteractiveGameStep[];
    notificationType?: 'bank' | 'farkle';
    points?: number;
    newTotal?: number;
  };
  errorMessage: string | null;
}

type Action =
  | { type: 'INIT'; step: InteractiveGameStep }
  | { type: 'ADD_STEP'; step: InteractiveGameStep }
  | { type: 'SHOW_AI_SUMMARY'; skippedSteps: InteractiveGameStep[] }
  | { type: 'SHOW_TURN_END'; notificationType: 'bank' | 'farkle'; points: number; newTotal?: number; skippedSteps?: InteractiveGameStep[] }
  | { type: 'CLEAR_OVERLAY' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'PREV_STEP' }
  | { type: 'NEXT_STEP' };

function reducer(state: InteractiveState, action: Action): InteractiveState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        stepHistory: [action.step],
        currentIndex: 0,
        overlayPhase: null,
        overlayData: {},
        errorMessage: null,
      };
    case 'ADD_STEP':
      return {
        ...state,
        stepHistory: [...state.stepHistory, action.step],
        currentIndex: state.stepHistory.length,
        overlayPhase: null,
        overlayData: {},
      };
    case 'SHOW_AI_SUMMARY':
      return {
        ...state,
        overlayPhase: 'ai_summary',
        overlayData: { skippedSteps: action.skippedSteps },
      };
    case 'SHOW_TURN_END':
      return {
        ...state,
        overlayPhase: 'turn_end_notification',
        overlayData: {
          notificationType: action.notificationType,
          points: action.points,
          newTotal: action.newTotal,
          skippedSteps: action.skippedSteps,
        },
      };
    case 'CLEAR_OVERLAY':
      return {
        ...state,
        overlayPhase: null,
        overlayData: {},
      };
    case 'SET_ERROR':
      return {
        ...state,
        overlayPhase: 'error',
        errorMessage: action.message,
      };
    case 'PREV_STEP':
      return state.currentIndex > 0
        ? { ...state, currentIndex: state.currentIndex - 1 }
        : state;
    case 'NEXT_STEP':
      return state.currentIndex < state.stepHistory.length - 1
        ? { ...state, currentIndex: state.currentIndex + 1 }
        : state;
    default:
      return state;
  }
}

const initialState: InteractiveState = {
  stepHistory: [],
  currentIndex: 0,
  overlayPhase: null,
  overlayData: {},
  errorMessage: null,
};

interface InteractiveGameDisplayProps {
  gameId: string;
  initialStep: unknown;
  mirroredDice: boolean;
  onClose: () => void;
  addDecision: (record: Omit<HumanDecisionRecord, 'id'>) => string;
}

export function InteractiveGameDisplay({
  gameId,
  initialStep,
  mirroredDice,
  onClose,
  addDecision,
}: InteractiveGameDisplayProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialStep) {
      dispatch({ type: 'INIT', step: initialStep as InteractiveGameStep });
    }
  }, [initialStep]);

  const currentStep = state.stepHistory[state.currentIndex] ?? null;
  const humanDecision = currentStep?.humanDecisions?.[0];

  const handleDiceSubmit = useCallback(
    async (decisionId: string, decision: { selectedCombinations: unknown[]; points: number }) => {
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/game/interactive/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, decisionId, decision }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to submit');
        }
        const data = await res.json();
        dispatch({ type: 'ADD_STEP', step: data.step });
        if (data.skippedSteps?.length > 0) {
          dispatch({ type: 'SHOW_AI_SUMMARY', skippedSteps: data.skippedSteps });
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          message: err instanceof Error ? err.message : 'Failed to submit decision',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId]
  );

  const handleContinueSubmit = useCallback(
    async (decisionId: string, continueRolling: boolean) => {
      const prevTurnPoints = humanDecision?.context?.turnPoints ?? 0;

      setIsSubmitting(true);
      try {
        const res = await fetch('/api/game/interactive/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            decisionId,
            decision: {
              continue: continueRolling,
              reason: continueRolling ? 'Human chose to continue' : 'Human chose to stop',
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to submit');
        }
        const data = await res.json();

        if (!continueRolling && humanDecision?.context) {
          addDecision({
            timestamp: new Date().toISOString(),
            gameId,
            diceRolled: humanDecision.context.diceRolled,
            diceRemaining: humanDecision.context.diceRemaining,
            turnPoints: humanDecision.context.turnPoints,
            playerScore: humanDecision.context.playerScore,
            opponentScores: humanDecision.context.opponentScores,
            farkleRisk: humanDecision.context.farkleRisk,
            availableCombinations: humanDecision.context.scoringCombinations,
            continue: false,
            reason: 'Human chose to stop',
          });
        }

        dispatch({ type: 'ADD_STEP', step: data.step });

        const humanPlayer = data.step.gameState.players.find(
          (p: { id: string }) => p.id?.startsWith('human')
        );
        const newTotal = humanPlayer?.totalScore ?? 0;

        if (!continueRolling) {
          dispatch({
            type: 'SHOW_TURN_END',
            notificationType: 'bank',
            points: prevTurnPoints,
            newTotal,
            skippedSteps: data.skippedSteps,
          });
        } else {
          const nextCtx = data.step.humanDecisions?.[0]?.context;
          if (nextCtx?.turnPoints === 0 && prevTurnPoints > 0) {
            dispatch({
              type: 'SHOW_TURN_END',
              notificationType: 'farkle',
              points: prevTurnPoints,
              skippedSteps: data.skippedSteps,
            });
          } else if (data.skippedSteps?.length > 0) {
            dispatch({ type: 'SHOW_AI_SUMMARY', skippedSteps: data.skippedSteps });
          }
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          message: err instanceof Error ? err.message : 'Failed to submit decision',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameId, humanDecision, addDecision]
  );

  const handleAiSummaryDone = useCallback(() => {
    dispatch({ type: 'CLEAR_OVERLAY' });
  }, []);

  const handleTurnEndDone = useCallback((skippedSteps?: InteractiveGameStep[]) => {
    if (skippedSteps?.length) {
      dispatch({ type: 'SHOW_AI_SUMMARY', skippedSteps });
    } else {
      dispatch({ type: 'CLEAR_OVERLAY' });
    }
  }, []);

  const handleErrorDismiss = useCallback(() => {
    dispatch({ type: 'CLEAR_OVERLAY' });
  }, []);

  const handlePrevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  if (!currentStep) return null;

  return (
    <>
      <div className="interactive-game-header">
        <h2 className="section-title" style={{ margin: 0 }}>
          🎮 Interactive Game
        </h2>
        <button className="interactive-close-btn" onClick={onClose} type="button">
          ✕ Close
        </button>
      </div>

      <PlayerScoresDisplay gameState={currentStep.gameState} />

      <div className="interactive-message">{currentStep.message ?? ''}</div>

      {state.overlayPhase === 'ai_summary' && state.overlayData.skippedSteps && (
        <AiSummaryOverlay
          skippedSteps={state.overlayData.skippedSteps}
          onDone={handleAiSummaryDone}
        />
      )}

      {state.overlayPhase === 'turn_end_notification' && state.overlayData.notificationType && (
        <TurnEndNotification
          type={state.overlayData.notificationType}
          points={state.overlayData.points ?? 0}
          newTotal={state.overlayData.newTotal}
          skippedSteps={state.overlayData.skippedSteps}
          onDone={handleTurnEndDone}
        />
      )}

      {state.overlayPhase === 'error' && state.errorMessage && (
        <div className="interactive-error-overlay">
          <p>{state.errorMessage}</p>
          <button onClick={handleErrorDismiss} type="button">
            Dismiss
          </button>
        </div>
      )}

      {currentStep.type === 'awaiting_human_decision' && humanDecision && (
        <div id="decisionBox" className="decision-box">
          {humanDecision.type === 'dice' ? (
            <DiceSelectionUI
              humanDecision={humanDecision}
              mirroredDice={mirroredDice}
              onSubmit={handleDiceSubmit}
              isSubmitting={isSubmitting}
            />
          ) : (
            <ContinueDecisionUI
              context={humanDecision.context}
              onSubmit={handleContinueSubmit}
              decisionId={humanDecision.decisionId}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      )}

      {currentStep.type === 'game_end' && (
        <div id="decisionBox" className="decision-box">
          <h4 style={{ color: '#667eea', marginTop: 0 }}>🏆 Game Over!</h4>
          <p style={{ fontSize: '1.1em', color: '#333' }}>{currentStep.message}</p>
        </div>
      )}

      <div className="interactive-step-nav">
        <button
          onClick={handlePrevStep}
          disabled={state.currentIndex === 0}
          type="button"
          className="interactive-nav-prev"
        >
          ← Previous
        </button>
        <span className="interactive-step-counter">
          Step {state.currentIndex + 1} of {state.stepHistory.length}
        </span>
        <button
          type="button"
          disabled
          className="interactive-nav-next"
        >
          Next →
        </button>
      </div>
    </>
  );
}
