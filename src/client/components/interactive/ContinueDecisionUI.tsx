import React from 'react';
import { calculateFarkleRisk } from '../../lib/farkleRisk';

interface ContinueDecisionUIProps {
  context: any; // HumanDecisionContext
  onConfirm: (decisionPayload: any) => void;
  isSubmitting: boolean;
}

export function ContinueDecisionUI({ context, onConfirm, isSubmitting }: ContinueDecisionUIProps) {
  const risk = calculateFarkleRisk(context.diceRemaining);

  const handleContinue = () => {
    onConfirm({ continue: true, reason: 'Human decision to continue' });
  };

  const handleStop = () => {
    onConfirm({ continue: false, reason: 'Human decision to stop' });
  };

  return (
    <div id="decisionBox">
      <h3 style={{ color: '#667eea', marginBottom: '15px' }}>🤔 Continue Rolling?</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>Current Turn Points</div>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#28a745' }}>{context.turnPoints}</div>
        </div>
        
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>Dice to Roll</div>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#667eea' }}>{context.diceRemaining}</div>
        </div>

        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>Farkle Risk</div>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: risk > 0.4 ? '#ff6b6b' : '#333' }}>
            {(risk * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px' }}>
        <button 
          onClick={handleStop} 
          disabled={isSubmitting}
          className="decision-btn"
          style={{ flex: 1, background: '#ff6b6b', color: 'white' }}
        >
          ⏸ Stop & Bank Points
        </button>
        <button 
          onClick={handleContinue} 
          disabled={isSubmitting}
          className="decision-btn"
          style={{ flex: 1, background: '#28a745', color: 'white' }}
        >
          🎲 Roll {context.diceRemaining} Dice
        </button>
      </div>
    </div>
  );
}
