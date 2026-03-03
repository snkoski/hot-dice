import { calculateFarkleRisk } from '../../lib/farkleRisk';

interface HumanDecisionContext {
  turnPoints: number;
  diceRemaining: number;
}

interface ContinueDecisionUIProps {
  context: HumanDecisionContext;
  decisionId: string;
  onSubmit: (decisionId: string, continueRolling: boolean) => Promise<void>;
  isSubmitting: boolean;
}

export function ContinueDecisionUI({
  context,
  decisionId,
  onSubmit,
  isSubmitting,
}: ContinueDecisionUIProps) {
  const farkleRisk = calculateFarkleRisk(context.diceRemaining);

  return (
    <>
      <h4 style={{ marginTop: 0, color: '#667eea' }}>🤔 Decision Time</h4>

      <div className="continue-context-box">
        <div className="continue-turn-label">Turn Total So Far</div>
        <div className="continue-turn-value">{context.turnPoints}</div>
        <div className="continue-stats-grid">
          <div>
            <div className="continue-stat-label">Dice Remaining</div>
            <div className="continue-stat-value">{context.diceRemaining}</div>
          </div>
          <div>
            <div className="continue-stat-label">Farkle Risk</div>
            <div
              className="continue-stat-value"
              style={{ color: farkleRisk > 0.3 ? '#dc3545' : '#28a745' }}
            >
              {(farkleRisk * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="continue-buttons">
        <button
          type="button"
          className="continue-stop-btn"
          onClick={() => onSubmit(decisionId, false)}
          disabled={isSubmitting}
        >
          <div className="continue-btn-icon">⏸</div>
          <div>Stop & Bank</div>
          <div className="continue-btn-points">{context.turnPoints} pts</div>
        </button>
        <button
          type="button"
          className="continue-roll-btn"
          style={{
            background: context.diceRemaining <= 2 ? '#dc3545' : '#667eea',
          }}
          onClick={() => onSubmit(decisionId, true)}
          disabled={isSubmitting}
        >
          <div className="continue-btn-icon">🎲</div>
          <div>Roll Again</div>
          <div className="continue-btn-points">{context.diceRemaining} dice</div>
        </button>
      </div>
    </>
  );
}
