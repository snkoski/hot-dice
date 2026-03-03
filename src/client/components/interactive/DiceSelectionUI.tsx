import clsx from 'clsx';
import { getDiceFace, formatScoreType } from '../../lib/formatters';
import { computeScoreForSelectedDice } from '../../lib/scoreComputer';
import './interactive.css';

interface DiceSelectionUIProps {
  diceRolled: number[];
  scoringCombinations: any[];
  turnPoints: number;
  selectedIndices: number[];
  mirroredDice: boolean;
  isSubmitting: boolean;
  onToggle: (index: number) => void;
  onSelectAll: (indices: number[]) => void;
  onConfirm: () => void;
}

export function DiceSelectionUI({
  diceRolled,
  scoringCombinations,
  turnPoints,
  selectedIndices,
  mirroredDice,
  isSubmitting,
  onToggle,
  onSelectAll,
  onConfirm,
}: DiceSelectionUIProps) {
  const scoringDiceSet = new Set(scoringCombinations.flatMap((c: any) => c.diceIndices));

  const resultCombos = computeScoreForSelectedDice(selectedIndices, scoringCombinations, diceRolled);
  const totalPoints = resultCombos.reduce((s, c) => s + c.points, 0);
  const diceLeft = diceRolled.length - selectedIndices.length;
  const hasValidSelection = resultCombos.length > 0 && selectedIndices.length > 0;

  const handleSelectAll = () => {
    onSelectAll([...scoringDiceSet]);
  };

  return (
    <div>
      <h4 style={{ marginTop: 0, color: '#667eea' }}>
        🎲 Your Turn — Pick Dice to Keep
        {mirroredDice && (
          <span style={{
            display: 'inline-block', marginLeft: 8, background: '#e8f4fd', color: '#2980b9',
            padding: '2px 9px', borderRadius: 12, fontSize: '0.75em', fontWeight: 600, verticalAlign: 'middle',
          }}>
            🎯 Mirrored Dice
          </span>
        )}
      </h4>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', margin: '20px 0' }}>
        {diceRolled.map((die, i) => {
          const canScore = scoringDiceSet.has(i);
          return (
            <button
              key={i}
              className={clsx('die-btn', {
                selected: selectedIndices.includes(i),
                'non-scoring': !canScore,
              })}
              disabled={!canScore || isSubmitting}
              onClick={() => canScore && onToggle(i)}
              title={canScore ? 'Click to select' : 'This die cannot score'}
            >
              {getDiceFace(die)}
            </button>
          );
        })}
      </div>

      <div style={{
        minHeight: 56, background: 'white', borderRadius: 8, padding: '12px 16px',
        marginBottom: 15, textAlign: 'center', border: '2px solid #e0e0e0',
      }}>
        {selectedIndices.length === 0 ? (
          <span style={{ color: '#999', fontSize: '0.95em' }}>Select scoring dice above</span>
        ) : !hasValidSelection ? (
          <span style={{ color: '#dc3545', fontSize: '0.95em' }}>Selected dice don&apos;t form a scoring combination</span>
        ) : (
          <>
            <div style={{ fontWeight: 600, color: '#333', fontSize: '1.05em' }}>
              {resultCombos.map((c) => formatScoreType(c.type)).join(' + ')}
            </div>
            <div style={{ color: '#28a745', fontSize: '0.9em', marginTop: 3 }}>+{totalPoints} pts</div>
          </>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        textAlign: 'center', background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 15,
      }}>
        <div>
          <div style={{ fontSize: '0.8em', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Turn Total</div>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#667eea' }}>{turnPoints}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.8em', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>This Pick</div>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#28a745' }}>{hasValidSelection ? totalPoints : '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.8em', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dice Left</div>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#333' }}>{diceLeft === 0 ? '6 🔥' : diceLeft}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleSelectAll}
          disabled={isSubmitting}
          style={{
            flex: 1, padding: 12, fontSize: '1em', background: '#f0f4ff', color: '#667eea',
            border: '2px solid #667eea', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          ✦ Select All Scoring
        </button>
        <button
          onClick={onConfirm}
          disabled={!hasValidSelection || isSubmitting}
          style={{
            flex: 2, padding: 12, fontSize: '1.1em', background: '#667eea', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
            opacity: hasValidSelection && !isSubmitting ? 1 : 0.5,
          }}
        >
          {isSubmitting ? 'Submitting...' : '✓ Confirm Selection'}
        </button>
      </div>
    </div>
  );
}
