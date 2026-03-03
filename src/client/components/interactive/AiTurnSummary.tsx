import React, { useState, useEffect } from 'react';

interface AiTurnSummaryProps {
  skippedSteps: any[];
  onDismiss: () => void;
}

export function AiTurnSummary({ skippedSteps, onDismiss }: AiTurnSummaryProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (index < skippedSteps.length - 1) {
        setIndex(prev => prev + 1);
      } else {
        clearInterval(timer);
      }
    }, 800); // Wait 800ms between showing steps
    return () => clearInterval(timer);
  }, [index, skippedSteps.length]);

  return (
    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
      <h3 style={{ color: '#667eea', marginBottom: '15px' }}>🤖 Opponents' Turns</h3>
      
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {skippedSteps.slice(0, index + 1).map((step, i) => (
          <div key={i} style={{ 
            padding: '10px', 
            borderLeft: '3px solid #667eea', 
            marginBottom: '10px',
            background: 'white',
            borderRadius: '0 8px 8px 0',
            animation: 'fadeIn 0.3s ease'
          }}>
            {step.description}
            {step.gameState?.currentTurn && (
              <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                Points: {step.gameState.currentTurn.turnPoints} | Dice: {step.gameState.currentTurn.diceRemaining}
              </div>
            )}
          </div>
        ))}
      </div>

      {index === skippedSteps.length - 1 && (
        <button 
          onClick={onDismiss}
          style={{ width: '100%', marginTop: '20px', background: '#28a745' }}
        >
          Your Turn ▶️
        </button>
      )}
    </div>
  );
}
