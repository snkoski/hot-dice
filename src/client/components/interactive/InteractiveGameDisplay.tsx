import React, { useReducer, useEffect, useState } from 'react';
import { interactiveReducer } from './interactiveReducer';
import { PlayerScores } from '../step-through/PlayerScores';
import { TurnEndNotification } from './TurnEndNotification';
import { AiTurnSummary } from './AiTurnSummary';
import { HumanDecisionUI } from './HumanDecisionUI';
import { DiceDisplay } from '../step-through/DiceDisplay';
import { useHumanDecisions } from '../../hooks/useHumanDecisions';

interface InteractiveGameDisplayProps {
  gameId: string;
  initialStep: any;
  onClose: () => void;
}

export function InteractiveGameDisplay({ gameId, initialStep, onClose }: InteractiveGameDisplayProps) {
  const [state, dispatch] = useReducer(interactiveReducer, { phase: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addDecisions } = useHumanDecisions();

  useEffect(() => {
    dispatch({ type: 'API_SUCCESS', step: initialStep });
  }, [initialStep]);

  const handleConfirmDecision = async (decisionPayload: any) => {
    setIsSubmitting(true);
    try {
      const currentStep = state.phase === 'awaiting_dice_selection' || state.phase === 'awaiting_continue' 
        ? state.step 
        : null;
      
      const decisionId = currentStep?.decision?.decisionId;

      const res = await fetch('/api/game/interactive/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          decisionId,
          decision: decisionPayload
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Record to history
      if (currentStep) {
        addDecisions([{
          decisionId,
          timestamp: new Date().toISOString(),
          context: currentStep.decision.context,
          decision: decisionPayload,
          gameStateBefore: currentStep.gameState
        }]);
      }

      // Check if we need to show a TurnEndNotification
      // If we just submitted 'continue: false' (bank), then we know it's a bank.
      // Or if the next step skipped some things, maybe we don't care.
      // Let's rely on API_SUCCESS to transition. If it was a bank, let's inject a notification if we want.
      // Wait, in app.js:
      // const prevTurnPoints = currentStep.decision.context.turnPoints ...
      // If we banked, newTotal = ...
      // For simplicity, we can just dispatch API_SUCCESS. The game advances.
      
      if (decisionPayload.continue === false) {
        dispatch({
          type: 'SHOW_NOTIFICATION',
          notifType: 'bank',
          points: currentStep.decision.context.turnPoints,
          newTotal: currentStep.gameState.players[currentStep.gameState.currentPlayerIndex].totalScore + currentStep.decision.context.turnPoints,
          pendingStep: data.step,
          skippedSteps: data.skippedSteps
        });
      } else if (data.step.type === 'farkle' || (data.skippedSteps && data.skippedSteps[0]?.type === 'farkle')) {
        // If the immediate result is a farkle, show it
        dispatch({
          type: 'SHOW_NOTIFICATION',
          notifType: 'farkle',
          points: 0,
          newTotal: currentStep.gameState.players[currentStep.gameState.currentPlayerIndex].totalScore,
          pendingStep: data.step,
          skippedSteps: data.skippedSteps
        });
      } else {
        dispatch({ type: 'API_SUCCESS', step: data.step, skippedSteps: data.skippedSteps });
      }

    } catch (err: any) {
      alert('Failed to submit decision: ' + err.message);
      dispatch({ type: 'API_ERROR', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActiveGameState = () => {
    if (state.phase === 'awaiting_dice_selection' || state.phase === 'awaiting_continue') return state.step.gameState;
    if (state.phase === 'ai_summary') return state.pendingStep.gameState;
    if (state.phase === 'turn_end_notification') return state.pendingStep.step.gameState;
    if (state.phase === 'game_over') return state.finalStep.gameState;
    return null;
  };

  const gameState = getActiveGameState();
  
  return (
    <div className="card" id="interactiveGameSection">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>🎮 Interactive Game</h2>
        <button onClick={onClose} style={{ padding: '8px 20px', background: '#6c757d', width: 'auto' }}>
          ✕ Close
        </button>
      </div>

      {gameState && (
        <PlayerScores 
          players={gameState.players} 
          currentPlayerIndex={gameState.currentPlayerIndex} 
        />
      )}

      {state.phase === 'turn_end_notification' && (
        <TurnEndNotification 
          type={state.type} 
          points={state.points} 
          newTotal={state.newTotal} 
          onDismiss={() => dispatch({ type: 'DISMISS_NOTIFICATION' })} 
        />
      )}

      {state.phase === 'ai_summary' && (
        <AiTurnSummary 
          skippedSteps={state.skippedSteps} 
          onDismiss={() => dispatch({ type: 'DISMISS_SUMMARY' })} 
        />
      )}

      {(state.phase === 'awaiting_dice_selection' || state.phase === 'awaiting_continue') && (
        <>
          {state.phase === 'awaiting_continue' && gameState?.currentTurn?.lastRoll && (
             <div style={{ textAlign: 'center', marginBottom: '20px' }}>
               <DiceDisplay diceRolled={gameState.currentTurn.lastRoll} />
             </div>
          )}
          <HumanDecisionUI 
            phase={state.phase} 
            step={state.step} 
            selectedIndices={state.phase === 'awaiting_dice_selection' ? state.selectedIndices : []} 
            onToggleDie={(i) => dispatch({ type: 'TOGGLE_DIE', index: i })} 
            onSelectAll={() => dispatch({ 
              type: 'SELECT_ALL_SCORING', 
              indices: state.step.decision.context.scoringCombinations.flatMap((c: any) => c.diceIndices) 
            })} 
            onConfirm={handleConfirmDecision} 
            isSubmitting={isSubmitting} 
          />
        </>
      )}

      {state.phase === 'game_over' && (
        <div style={{ textAlign: 'center', padding: '20px', background: '#f0f4ff', borderRadius: '8px', marginTop: '20px' }}>
          <h3 style={{ color: '#667eea', fontSize: '2em' }}>🏆 Game Over!</h3>
          <p style={{ fontSize: '1.2em' }}>{state.finalStep.description}</p>
        </div>
      )}
    </div>
  );
}
