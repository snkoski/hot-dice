import { formatScoreType } from '../../lib/formatters';
import type { ScoringCombination } from '../../types/game';
import type { PlayerDecision, RoundResult } from '../../types/stepGame';

interface DecisionDisplayProps {
  stepType: string;
  scoringCombinations?: ScoringCombination[];
  playerDecisions?: PlayerDecision[];
  roundResults?: RoundResult[];
  message?: string;
}

export function DecisionDisplay({
  stepType,
  scoringCombinations,
  playerDecisions,
  roundResults,
  message,
}: DecisionDisplayProps) {
  if (stepType === 'roll' && scoringCombinations && scoringCombinations.length > 0) {
    return (
      <div id="stepDecisionBox" className="decision-box">
        <h5>Scoring Combinations Available</h5>
        {scoringCombinations.map((combo, i) => (
          <div key={i} className="decision-combo-item">
            <strong>{formatScoreType(combo.type)}:</strong> {combo.points} points
          </div>
        ))}
      </div>
    );
  }

  if (stepType === 'decisions' && playerDecisions && playerDecisions.length > 0) {
    return (
      <div id="stepDecisionBox" className="decision-box">
        <h5>All Strategies Respond</h5>
        {playerDecisions.map((pd, i) => {
          const statusColor = pd.wasFarkle ? '#ff6b6b' : pd.isActive ? '#28a745' : '#ffa500';
          const statusIcon = pd.wasFarkle ? '💥' : pd.isActive ? '▶️' : '⏸';
          const statusText = pd.wasFarkle ? 'FARKLE' : pd.decision.continue ? 'CONTINUING' : 'STOPPED';

          return (
            <div
              key={i}
              className="decision-player-block"
              style={{ borderLeftColor: statusColor }}
            >
              <div className="decision-player-header">
                <strong>{pd.strategyName}</strong>
                <span style={{ color: statusColor, fontWeight: 600 }}>
                  {statusIcon} {statusText}
                </span>
              </div>
              {!pd.wasFarkle ? (
                <>
                  <div className="decision-player-detail">
                    Selected {pd.selectedCombinations.length} combination(s) for{' '}
                    {pd.selectedCombinations.reduce((sum, c) => sum + c.points, 0)} points
                  </div>
                  <div className="decision-player-detail">
                    Turn total: <strong>{pd.turnPoints}</strong> points | Dice remaining:{' '}
                    <strong>{pd.diceRemaining}</strong>
                  </div>
                  <div className="decision-player-reason">{pd.decision.reason}</div>
                </>
              ) : (
                <div className="decision-player-farkle">
                  No scoring combinations - loses all turn points!
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if ((stepType === 'round_complete' || stepType === 'game_end') && roundResults && roundResults.length > 0) {
    const sorted = [...roundResults].sort((a, b) => b.pointsBanked - a.pointsBanked);

    return (
      <div id="stepDecisionBox" className="decision-box">
        <h5>📊 Round Results</h5>
        {sorted.map((result, i) => {
          const rankIcon = i === 0 && result.pointsBanked > 0 ? '🏆' : '';
          const color = result.wasFarkle ? '#ff6b6b' : result.pointsBanked > 0 ? '#28a745' : '#ffa500';

          let statusText = '';
          if (result.wasFarkle) {
            statusText = '💥 Farkled - gained 0 points';
          } else if (result.pointsBanked > 0) {
            statusText = `Banked ${result.pointsBanked} points`;
          } else {
            statusText = '⚠️ Not on board yet - needs minimum score to start scoring (gained 0 this round)';
          }

          return (
            <div key={i} className="decision-round-result" style={{ borderLeftColor: color }}>
              <div>
                <strong>
                  {rankIcon} {result.playerName}
                </strong>
                <div className="decision-round-status">{statusText}</div>
              </div>
              <div className="decision-round-score">
                <div className="decision-round-label">New Score</div>
                <div className="decision-round-value">{result.newScore.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (stepType === 'game_end' && message) {
    return (
      <div id="stepDecisionBox" className="decision-box">
        <h5>🏆 Game Over!</h5>
        <p style={{ fontSize: '1.1em', color: '#333' }}>{message}</p>
      </div>
    );
  }

  return null;
}
