import React from 'react';
import { clsx } from 'clsx';
import { formatScoreType } from '../../lib/formatters';

interface DecisionDisplayProps {
  step: any; // GameStep
}

export function DecisionDisplay({ step }: DecisionDisplayProps) {
  if (!step) return null;

  if (step.type === 'game_start' || step.type === 'game_over' || step.type === 'roll') {
    return (
      <div className="message-box">
        {step.description}
      </div>
    );
  }

  if (step.type === 'farkle') {
    return (
      <div className="message-box" style={{ background: '#fff5f5', borderColor: '#ff6b6b', color: '#ff6b6b' }}>
        <strong>FARKLE!</strong> {step.description}
      </div>
    );
  }

  if (step.type === 'decision' && step.decision) {
    if (step.decision.type === 'dice') {
      const selected = step.decision.decision.selectedCombinations || [];
      const points = step.decision.decision.points;
      const combos = selected.map((c: any) => formatScoreType(c.type)).join(' + ');
      
      return (
        <div className="decision-box">
          <h5>🎲 Dice Selection Decision</h5>
          {combos && <div>Kept: {combos}</div>}
          <div style={{ fontWeight: 'bold', marginTop: '5px' }}>+{points} points</div>
          {step.decision.decision.reason && (
            <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
              Reason: {step.decision.decision.reason}
            </div>
          )}
        </div>
      );
    }
    
    if (step.decision.type === 'continue') {
      const isContinue = step.decision.decision.continue;
      return (
        <div className={clsx('decision-box', { stop: !isContinue })}>
          <h5>{isContinue ? '🎲 Continue Decision' : '⏸ Stop Decision'}</h5>
          <div>{isContinue ? 'Decided to continue rolling.' : 'Decided to stop and bank points.'}</div>
          {step.decision.decision.reason && (
            <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
              Reason: {step.decision.decision.reason}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="message-box">
      {step.description || 'Step complete'}
    </div>
  );
}
