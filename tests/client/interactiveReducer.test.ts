import { describe, it, expect } from 'vitest';
import { interactiveReducer, InteractivePhase } from '../../src/client/components/interactive/interactiveReducer';

describe('interactiveReducer', () => {
  it('handles API_SUCCESS to awaiting_dice_selection', () => {
    const state: InteractivePhase = { phase: 'idle' };
    const step = { type: 'awaiting_human_decision', decision: { type: 'dice' } };
    
    const nextState = interactiveReducer(state, { type: 'API_SUCCESS', step });
    expect(nextState.phase).toBe('awaiting_dice_selection');
    if (nextState.phase === 'awaiting_dice_selection') {
      expect(nextState.selectedIndices).toEqual([]);
    }
  });

  it('handles TOGGLE_DIE in awaiting_dice_selection', () => {
    const state: InteractivePhase = { phase: 'awaiting_dice_selection', step: {}, selectedIndices: [1] };
    
    // add die
    const next1 = interactiveReducer(state, { type: 'TOGGLE_DIE', index: 2 });
    expect(next1.phase === 'awaiting_dice_selection' && next1.selectedIndices).toEqual([1, 2]);

    // remove die
    const next2 = interactiveReducer(next1, { type: 'TOGGLE_DIE', index: 1 });
    expect(next2.phase === 'awaiting_dice_selection' && next2.selectedIndices).toEqual([2]);
  });

  it('ignores TOGGLE_DIE in idle', () => {
    const state: InteractivePhase = { phase: 'idle' };
    const nextState = interactiveReducer(state, { type: 'TOGGLE_DIE', index: 1 });
    expect(nextState).toBe(state);
  });

  it('handles API_SUCCESS to ai_summary if skippedSteps are present', () => {
    const state: InteractivePhase = { phase: 'awaiting_continue', step: {} };
    const step = { type: 'awaiting_human_decision', decision: { type: 'dice' } };
    const skippedSteps = [{ type: 'roll' }];

    const nextState = interactiveReducer(state, { type: 'API_SUCCESS', step, skippedSteps });
    expect(nextState.phase).toBe('ai_summary');
  });

  it('handles SHOW_NOTIFICATION and DISMISS_NOTIFICATION', () => {
    const state: InteractivePhase = { phase: 'awaiting_continue', step: {} };
    const step = { type: 'awaiting_human_decision', decision: { type: 'dice' } };
    
    const nextState = interactiveReducer(state, { 
      type: 'SHOW_NOTIFICATION', 
      notifType: 'bank', 
      points: 500, 
      newTotal: 1500, 
      pendingStep: step 
    });
    
    expect(nextState.phase).toBe('turn_end_notification');
    
    const finalState = interactiveReducer(nextState, { type: 'DISMISS_NOTIFICATION' });
    expect(finalState.phase).toBe('awaiting_dice_selection');
  });
});
