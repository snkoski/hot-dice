export type Phase =
  | { phase: 'idle' }
  | { phase: 'awaiting_dice_selection'; step: any; selectedIndices: number[] }
  | { phase: 'awaiting_continue'; step: any }
  | { phase: 'ai_summary'; skippedSteps: any[]; pendingStep: any }
  | { phase: 'turn_end_notification'; notificationType: 'bank' | 'farkle'; points: number; newTotal: number; pendingStep: any; pendingSkippedSteps: any[] }
  | { phase: 'game_over'; finalStep: any }
  | { phase: 'error'; message: string };

export interface InteractiveState {
  current: Phase;
  gameId: string | null;
  mirroredDice: boolean;
  history: any[];
  historyIndex: number;
  isSubmitting: boolean;
}

export type InteractiveAction =
  | { type: 'GAME_STARTED'; gameId: string; mirroredDice: boolean; step: any }
  | { type: 'DICE_TOGGLED'; index: number }
  | { type: 'DICE_ALL_SELECTED'; indices: number[] }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }
  | { type: 'DICE_RESPONSE'; step: any; skippedSteps: any[] }
  | { type: 'CONTINUE_RESPONSE'; step: any; skippedSteps: any[]; prevTurnPoints: number; didContinue: boolean }
  | { type: 'NOTIFICATION_DONE' }
  | { type: 'AI_SUMMARY_DONE' }
  | { type: 'CLOSE' }
  | { type: 'ERROR'; message: string }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'NAVIGATE_FORWARD' };

export const INITIAL_STATE: InteractiveState = {
  current: { phase: 'idle' },
  gameId: null,
  mirroredDice: false,
  history: [],
  historyIndex: 0,
  isSubmitting: false,
};

function resolvePhaseFromStep(step: any): Phase {
  if (step.type === 'game_end') {
    return { phase: 'game_over', finalStep: step };
  }
  if (step.type === 'awaiting_human_decision' && step.humanDecisions?.[0]) {
    const hd = step.humanDecisions[0];
    if (hd.type === 'dice') {
      return { phase: 'awaiting_dice_selection', step, selectedIndices: [] };
    }
    return { phase: 'awaiting_continue', step };
  }
  return { phase: 'idle' };
}

export function interactiveReducer(state: InteractiveState, action: InteractiveAction): InteractiveState {
  switch (action.type) {
    case 'GAME_STARTED': {
      const history = [action.step];
      return {
        ...state,
        gameId: action.gameId,
        mirroredDice: action.mirroredDice,
        history,
        historyIndex: 0,
        isSubmitting: false,
        current: resolvePhaseFromStep(action.step),
      };
    }

    case 'DICE_TOGGLED': {
      if (state.current.phase !== 'awaiting_dice_selection') return state;
      const prev = state.current.selectedIndices;
      const idx = action.index;
      const next = prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
      return {
        ...state,
        current: { ...state.current, selectedIndices: next },
      };
    }

    case 'DICE_ALL_SELECTED': {
      if (state.current.phase !== 'awaiting_dice_selection') return state;
      return {
        ...state,
        current: { ...state.current, selectedIndices: action.indices },
      };
    }

    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };

    case 'SUBMIT_END':
      return { ...state, isSubmitting: false };

    case 'DICE_RESPONSE': {
      const newHistory = [...state.history, action.step];
      const newIndex = newHistory.length - 1;

      if (action.skippedSteps.length > 0) {
        return {
          ...state,
          isSubmitting: false,
          history: newHistory,
          historyIndex: newIndex,
          current: { phase: 'ai_summary', skippedSteps: action.skippedSteps, pendingStep: action.step },
        };
      }
      return {
        ...state,
        isSubmitting: false,
        history: newHistory,
        historyIndex: newIndex,
        current: resolvePhaseFromStep(action.step),
      };
    }

    case 'CONTINUE_RESPONSE': {
      const newHistory = [...state.history, action.step];
      const newIndex = newHistory.length - 1;

      let notificationType: 'bank' | 'farkle' | null = null;
      let newTotal = 0;

      if (!action.didContinue) {
        notificationType = 'bank';
        const humanPlayer = action.step.gameState?.players?.find((p: any) => p.id?.startsWith('human'));
        newTotal = humanPlayer?.totalScore ?? 0;
      } else {
        const nextCtx = action.step.humanDecisions?.[0]?.context;
        if (nextCtx && nextCtx.turnPoints === 0 && action.prevTurnPoints > 0) {
          notificationType = 'farkle';
        }
      }

      if (notificationType) {
        return {
          ...state,
          isSubmitting: false,
          history: newHistory,
          historyIndex: newIndex,
          current: {
            phase: 'turn_end_notification',
            notificationType,
            points: action.prevTurnPoints,
            newTotal,
            pendingStep: action.step,
            pendingSkippedSteps: action.skippedSteps,
          },
        };
      }

      if (action.skippedSteps.length > 0) {
        return {
          ...state,
          isSubmitting: false,
          history: newHistory,
          historyIndex: newIndex,
          current: { phase: 'ai_summary', skippedSteps: action.skippedSteps, pendingStep: action.step },
        };
      }

      return {
        ...state,
        isSubmitting: false,
        history: newHistory,
        historyIndex: newIndex,
        current: resolvePhaseFromStep(action.step),
      };
    }

    case 'NOTIFICATION_DONE': {
      if (state.current.phase !== 'turn_end_notification') return state;
      const { pendingStep, pendingSkippedSteps } = state.current;
      if (pendingSkippedSteps.length > 0) {
        return {
          ...state,
          current: { phase: 'ai_summary', skippedSteps: pendingSkippedSteps, pendingStep },
        };
      }
      return { ...state, current: resolvePhaseFromStep(pendingStep) };
    }

    case 'AI_SUMMARY_DONE': {
      if (state.current.phase !== 'ai_summary') return state;
      return { ...state, current: resolvePhaseFromStep(state.current.pendingStep) };
    }

    case 'NAVIGATE_BACK': {
      if (state.historyIndex > 0) {
        return { ...state, historyIndex: state.historyIndex - 1 };
      }
      return state;
    }

    case 'NAVIGATE_FORWARD': {
      if (state.historyIndex < state.history.length - 1) {
        return { ...state, historyIndex: state.historyIndex + 1 };
      }
      return state;
    }

    case 'CLOSE':
      return INITIAL_STATE;

    case 'ERROR':
      return { ...state, isSubmitting: false, current: { phase: 'error', message: action.message } };

    default: {
      const _: never = action;
      return state;
    }
  }
}
