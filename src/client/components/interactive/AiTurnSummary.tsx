import { formatScoreType, getDiceFace } from '../../lib/formatters';

interface AiTurnSummaryProps {
  skippedSteps: any[];
  onDone: () => void;
}

export function AiTurnSummary({ skippedSteps, onDone }: AiTurnSummaryProps) {
  const aiSteps = skippedSteps.filter(
    (s) => !s.currentPlayerId || !s.currentPlayerId.startsWith('human')
  );
  if (aiSteps.length === 0) {
    onDone();
    return null;
  }

  const elements: React.ReactElement[] = [];
  let inTurn = false;
  let turnKey = 0;

  for (const step of aiSteps) {
    if (step.type === 'turn_start') {
      if (inTurn) elements.push(<div key={`end-${turnKey}`} />);
      turnKey++;
      elements.push(
        <div key={`turn-${turnKey}`} style={{
          marginBottom: 14, background: '#f8f9fa', borderRadius: 8,
          padding: '10px 12px', borderLeft: '3px solid #667eea',
        }}>
          <div style={{
            fontWeight: 'bold', color: '#667eea', marginBottom: 6,
            fontSize: '0.95em', textTransform: 'uppercase', letterSpacing: '0.4px',
          }}>
            {step.currentPlayerName}
          </div>
        </div>
      );
      inTurn = true;
    } else if (step.type === 'roll' && step.diceRolled) {
      const faces = step.diceRolled.map((d: number) => getDiceFace(d)).join('');
      elements.push(
        <div key={`roll-${turnKey}-${elements.length}`} style={{ margin: '5px 0', fontSize: '1.6em', letterSpacing: 2 }}>
          {faces}
        </div>
      );
    } else if (step.type === 'roll' && step.keptCombinations) {
      const comboText = step.keptCombinations
        .map((c: any) => `${formatScoreType(c.type)} (${c.points})`)
        .join(', ');
      elements.push(
        <div key={`kept-${turnKey}-${elements.length}`} style={{ margin: '2px 0 6px', fontSize: '0.88em', color: '#555' }}>
          → Kept: {comboText} = <strong>+{step.keptPoints} pts</strong>
          <span style={{ color: '#999', marginLeft: 6 }}>({step.diceRemaining} dice left)</span>
        </div>
      );
    } else if (step.type === 'turn_complete') {
      const isFarkle = step.message?.toLowerCase().includes('farkle');
      const color = isFarkle ? '#dc3545' : '#28a745';
      const icon = isFarkle ? '💥' : '🏦';
      elements.push(
        <div key={`complete-${turnKey}-${elements.length}`} style={{
          marginTop: 6, fontSize: '0.9em', fontWeight: 'bold', color,
        }}>
          {icon} {step.message}
        </div>
      );
    }
  }

  return (
    <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20, margin: '20px 0' }}>
      <h4 style={{ marginTop: 0, color: '#667eea', fontSize: '1em' }}>While You Were Away...</h4>
      <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 14 }}>
        {elements}
      </div>
      <button
        onClick={onDone}
        style={{
          width: '100%', padding: 13, fontSize: '1.05em', fontWeight: 'bold',
          background: '#667eea', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
        }}
      >
        Your Turn →
      </button>
    </div>
  );
}
