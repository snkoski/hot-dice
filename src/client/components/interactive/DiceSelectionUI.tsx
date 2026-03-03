import React from 'react';
import { DiceFace } from '../shared/DiceFace';
import { computeScoreForSelectedDice } from '../../lib/scoreComputer';
import { formatScoreType } from '../../lib/formatters';

interface DiceSelectionUIProps {
  context: any; // HumanDecisionContext
  selectedIndices: number[];
  onToggleDie: (index: number) => void;
  onSelectAll: () => void;
  onConfirm: (decisionPayload: any) => void;
  isSubmitting: boolean;
}

export function DiceSelectionUI({ context, selectedIndices, onToggleDie, onSelectAll, onConfirm, isSubmitting }: DiceSelectionUIProps) {
  const { diceRolled, scoringCombinations } = context;

  const resultCombos = computeScoreForSelectedDice(selectedIndices, scoringCombinations, diceRolled);
  const totalPoints = resultCombos.reduce((sum, c) => sum + c.points, 0);
  const diceLeft = diceRolled.length - selectedIndices.length;
  const isValidSelection = resultCombos.length > 0;

  const handleConfirm = () => {
    onConfirm({
      selectedCombinations: resultCombos,
      points: totalPoints,
      diceKept: selectedIndices.length,
      reason: 'Human dice selection'
    });
  };

  return (
    <div id="decisionBox">
      <h3 style={{ color: '#667eea', marginBottom: '15px' }}>🎲 Select Dice to Keep</h3>
      
      <div className="dice-container">
        {diceRolled.map((val: number, i: number) => (
          <DiceFace 
            key={i} 
            value={val} 
            selected={selectedIndices.includes(i)} 
            onClick={() => onToggleDie(i)}
            size="large"
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', margin: '20px 0' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>Scoring Combination</div>
          {selectedIndices.length === 0 ? (
            <span style={{ color: '#999', fontSize: '0.95em' }}>Select scoring dice above</span>
          ) : !isValidSelection ? (
            <span style={{ color: '#dc3545', fontSize: '0.95em' }}>Selected dice don't form a scoring combination</span>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: '#333', fontSize: '1.05em' }}>
                {resultCombos.map(c => formatScoreType(c.type)).join(' + ')}
              </div>
              <div style={{ color: '#28a745', fontSize: '0.9em', marginTop: '3px' }}>
                +{totalPoints} pts
              </div>
            </>
          )}
        </div>
        
        <div style={{ textAlign: 'center', padding: '0 20px', borderLeft: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>Points Selected</div>
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#28a745' }}>{totalPoints}</div>
        </div>

        <div style={{ textAlign: 'center', paddingLeft: '20px' }}>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>Dice Left</div>
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#667eea' }}>
            {diceLeft === 0 ? '6 🔥' : diceLeft}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px' }}>
        <button onClick={onSelectAll} disabled={isSubmitting} style={{ flex: 1, padding: '12px', fontSize: '1em', background: '#f0f4ff', color: '#667eea', border: '2px solid #667eea' }}>
          ✦ Select All Scoring
        </button>
        <button 
          onClick={handleConfirm} 
          disabled={!isValidSelection || isSubmitting} 
          style={{ flex: 2, padding: '12px', fontSize: '1.1em', background: '#667eea', color: 'white', border: 'none' }}
        >
          {isSubmitting ? 'Submitting...' : '✓ Confirm Selection'}
        </button>
      </div>
    </div>
  );
}
