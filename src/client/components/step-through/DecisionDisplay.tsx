import { formatScoreType } from '../../lib/formatters';
import './stepThrough.css';

interface DecisionDisplayProps {
  step: any;
}

export function DecisionDisplay({ step }: DecisionDisplayProps) {
  if (step.type === 'roll' && step.scoringCombinations?.length > 0) {
    return (
      <div className="decision-box">
        <h5>Scoring Combinations Available</h5>
        {step.scoringCombinations.map((combo: any, i: number) => (
          <div key={i} style={{ background: 'white', padding: 8, margin: '5px 0', borderRadius: 4 }}>
            <strong>{formatScoreType(combo.type)}:</strong> {combo.points} points
          </div>
        ))}
      </div>
    );
  }

  if (step.type === 'decisions' && step.playerDecisions) {
    return (
      <div className="decision-box">
        <h5>All Strategies Respond</h5>
        {step.playerDecisions.map((pd: any, i: number) => {
          const statusColor = pd.wasFarkle ? '#ff6b6b' : pd.isActive ? '#28a745' : '#ffa500';
          const statusIcon = pd.wasFarkle ? '💥' : pd.isActive ? '▶️' : '⏸';
          const statusText = pd.wasFarkle ? 'FARKLE' : pd.decision.continue ? 'CONTINUING' : 'STOPPED';

          return (
            <div key={i} style={{ background: 'white', padding: 12, margin: '10px 0', borderRadius: 6, borderLeft: `4px solid ${statusColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ color: '#333' }}>{pd.strategyName}</strong>
                <span style={{ color: statusColor, fontWeight: 600 }}>{statusIcon} {statusText}</span>
              </div>
              {!pd.wasFarkle ? (
                <>
                  <div style={{ fontSize: '0.9em', color: '#666', margin: '4px 0' }}>
                    Selected {pd.selectedCombinations.length} combination(s) for{' '}
                    {pd.selectedCombinations.reduce((s: number, c: any) => s + c.points, 0)} points
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#666', margin: '4px 0' }}>
                    Turn total: <strong>{pd.turnPoints}</strong> points | Dice remaining: <strong>{pd.diceRemaining}</strong>
                  </div>
                  <div style={{ fontSize: '0.85em', color: '#888', marginTop: 6, fontStyle: 'italic' }}>
                    {pd.decision.reason}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.9em', color: '#ff6b6b' }}>
                  No scoring combinations - loses all turn points!
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (step.type === 'round_complete' || step.type === 'game_end') {
    if (!step.roundResults) return null;
    const sorted = [...step.roundResults].sort((a: any, b: any) => b.pointsBanked - a.pointsBanked);

    return (
      <div className="decision-box">
        <h5>📊 Round Results</h5>
        {sorted.map((result: any, i: number) => {
          const rankIcon = i === 0 && result.pointsBanked > 0 ? '🏆' : '';
          const color = result.wasFarkle ? '#ff6b6b' : result.pointsBanked > 0 ? '#28a745' : '#ffa500';
          let statusText = '';
          if (result.wasFarkle) {
            statusText = '💥 Farkled - gained 0 points';
          } else if (result.pointsBanked > 0) {
            statusText = `Banked <strong style="color: ${color};">${result.pointsBanked}</strong> points`;
          } else {
            statusText = '⚠️ Not on board yet';
          }

          return (
            <div key={i} style={{ background: 'white', padding: 12, margin: '10px 0', borderRadius: 6, borderLeft: `4px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#333' }}>{rankIcon} {result.playerName}</strong>
                  <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }} dangerouslySetInnerHTML={{ __html: statusText }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85em', color: '#666' }}>New Score</div>
                  <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#667eea' }}>{result.newScore.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
