import { calculateFarkleRisk } from '../../lib/farkleRisk';

interface ContinueDecisionUIProps {
  turnPoints: number;
  diceRemaining: number;
  isSubmitting: boolean;
  onDecision: (continueRolling: boolean) => void;
}

export function ContinueDecisionUI({ turnPoints, diceRemaining, isSubmitting, onDecision }: ContinueDecisionUIProps) {
  const farkleRisk = calculateFarkleRisk(diceRemaining);

  return (
    <div>
      <h4 style={{ marginTop: 0, color: '#667eea' }}>🤔 Decision Time</h4>

      <div style={{ background: 'white', padding: 20, borderRadius: 8, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: '1.1em', color: '#666', marginBottom: 10 }}>Turn Total So Far</div>
        <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#667eea', marginBottom: 15 }}>{turnPoints}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 15, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>Dice Remaining</div>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#333' }}>{diceRemaining}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>Farkle Risk</div>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: farkleRisk > 0.3 ? '#dc3545' : '#28a745' }}>
              {(farkleRisk * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
        <button
          onClick={() => onDecision(false)}
          disabled={isSubmitting}
          style={{
            padding: 20, fontSize: '1.1em', background: '#28a745', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          <div style={{ fontSize: '1.5em', marginBottom: 5 }}>⏸</div>
          <div>Stop &amp; Bank</div>
          <div style={{ fontSize: '1.3em', marginTop: 5 }}>{turnPoints} pts</div>
        </button>

        <button
          onClick={() => onDecision(true)}
          disabled={isSubmitting}
          style={{
            padding: 20, fontSize: '1.1em',
            background: diceRemaining <= 2 ? '#dc3545' : '#667eea',
            color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          <div style={{ fontSize: '1.5em', marginBottom: 5 }}>🎲</div>
          <div>Roll Again</div>
          <div style={{ fontSize: '1.3em', marginTop: 5 }}>{diceRemaining} dice</div>
        </button>
      </div>
    </div>
  );
}
