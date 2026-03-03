export type InteractivePhase =
  | { phase: 'idle' }
  | { phase: 'awaiting_dice_selection'; step: any; selectedIndices: number[] }
  | { phase: 'awaiting_continue'; step: any }
  | { phase: 'ai_summary'; skippedSteps: any[]; pendingStep: any }
  | { phase: 'turn_end_notification'; type: 'bank' | 'farkle'; points: number; newTotal: number; pendingStep: any }
  | { phase: 'game_over'; finalStep: any }
  | { phase: 'error'; message: string };

export type InteractiveAction =
  | { type: 'API_SUCCESS'; step: any; skippedSteps?: any[] }
  | { type: 'API_ERROR'; message: string }
  | { type: 'TOGGLE_DIE'; index: number }
  | { type: 'SELECT_ALL_SCORING'; indices: number[] }
  | { type: 'SHOW_NOTIFICATION'; notifType: 'bank' | 'farkle'; points: number; newTotal: number; pendingStep: any; skippedSteps?: any[] }
  | { type: 'DISMISS_SUMMARY' }
  | { type: 'DISMISS_NOTIFICATION' }
  | { type: 'RESET' };

function determinePhaseFromStep(step: any, skippedSteps?: any[]): InteractivePhase {
  if (skippedSteps && skippedSteps.length > 0) {
    return { phase: 'ai_summary', skippedSteps, pendingStep: step };
  }

  if (step.gameState?.isGameOver) {
    return { phase: 'game_over', finalStep: step };
  }

  if (step.type === 'awaiting_human_decision') {
    if (step.decision.type === 'dice') {
      return { phase: 'awaiting_dice_selection', step, selectedIndices: [] };
    } else if (step.decision.type === 'continue') {
      return { phase: 'awaiting_continue', step };
    }
  }

  // Fallback to error if unrecognized state
  return { phase: 'error', message: 'Unrecognized step type from API' };
}

export function interactiveReducer(state: InteractivePhase, action: InteractiveAction): InteractivePhase {
  switch (action.type) {
    case 'API_SUCCESS': {
      const newPhase = determinePhaseFromStep(action.step, action.skippedSteps);

      // Check for turn end notifications if we are receiving an AI summary or a new decision
      // Actually, if we just finished a human turn and banked/farkled, we should show a notification first.
      // Wait, let's keep it simple: the caller (API response handler) might need to figure out notifications,
      // or the reducer can check if the previous state's turn points went to 0 (farkle) or increased (bank).
      // For now, let's trust API_SUCCESS to move us to the next structural phase, and let the components or caller dispatch NOTIFICATION if needed.
      // Wait, `determinePhaseFromStep` doesn't handle `turn_end_notification`. We might need an explicit dispatch for that, 
      // or we can detect it here if we pass the previous step.
      return newPhase;
    }
    
    case 'API_ERROR':
      return { phase: 'error', message: action.message };

    case 'TOGGLE_DIE':
      if (state.phase !== 'awaiting_dice_selection') return state;
      const newIndices = state.selectedIndices.includes(action.index)
        ? state.selectedIndices.filter(i => i !== action.index)
        : [...state.selectedIndices, action.index];
      return { ...state, selectedIndices: newIndices };

    case 'SELECT_ALL_SCORING':
      if (state.phase !== 'awaiting_dice_selection') return state;
      return { ...state, selectedIndices: action.indices };

    case 'SHOW_NOTIFICATION':
      return {
        phase: 'turn_end_notification',
        type: action.notifType,
        points: action.points,
        newTotal: action.newTotal,
        pendingStep: { step: action.pendingStep, skippedSteps: action.skippedSteps } // We store both so we can proceed correctly
      };

    case 'DISMISS_SUMMARY':
      if (state.phase !== 'ai_summary') return state;
      return determinePhaseFromStep(state.pendingStep);

    case 'DISMISS_NOTIFICATION':
      if (state.phase !== 'turn_end_notification') return state;
      const { step, skippedSteps } = state.pendingStep;
      return determinePhaseFromStep(step, skippedSteps);

    case 'RESET':
      return { phase: 'idle' };

    default:
      const _: never = action;
      return state;
  }
}
