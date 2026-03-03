import { useState, useCallback } from 'react';
import { computeScoreForSelectedDice } from '../../lib/scoreComputer';
import { formatScoreType } from '../../lib/formatters';
import type { PendingHumanDecision } from '../../types/stepGame';
import type { ScoringCombination } from '../../types/game';

interface DiceSelectionUIProps {
  humanDecision: PendingHumanDecision;
  mirroredDice: boolean;
  onSubmit: (decisionId: string, decision: { selectedCombinations: ScoringCombination[]; points: number }) => Promise<void>;
  isSubmitting: boolean;
}

export function DiceSelectionUI({
  humanDecision,
  mirroredDice,
  onSubmit,
  isSubmitting,
}: DiceSelectionUIProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const { context, decisionId } = humanDecision;
  const { diceRolled, scoringCombinations } = context;
  const scoringDiceSet = new Set(
    scoringCombinations.flatMap((c) => c.diceIndices)
  );

  const toggleDie = useCallback((index: number) => {
    if (!scoringDiceSet.has(index)) return;
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, [scoringDiceSet]);

  const selectAllScoring = useCallback(() => {
    setSelectedIndices([...scoringDiceSet]);
  }, [scoringDiceSet]);

  const resultCombos = computeScoreForSelectedDice(
    selectedIndices,
    scoringCombinations,
    diceRolled
  );
  const totalPoints = resultCombos.reduce((sum, c) => sum + c.points, 0);
  const diceLeft = diceRolled.length - selectedIndices.length;
  const canConfirm = resultCombos.length > 0;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || isSubmitting) return;
    await onSubmit(decisionId, {
      selectedCombinations: resultCombos,
      points: totalPoints,
    });
  }, [canConfirm, isSubmitting, decisionId, resultCombos, totalPoints, onSubmit]);

  return (
    <>
      <h4 style={{ marginTop: 0, color: '#667eea' }}>
        🎲 Your Turn — Pick Dice to Keep
        {mirroredDice && (
          <span className="mirrored-badge">🎯 Mirrored Dice</span>
        )}
      </h4>

      <div className="dice-container-interactive">
        {diceRolled.map((value, i) => {
          const canScore = scoringDiceSet.has(i);
          return (
            <button
              key={i}
              type="button"
              className={`die-btn ${selectedIndices.includes(i) ? 'selected' : ''} ${!canScore ? 'non-scoring' : ''}`}
              onClick={() => canScore && toggleDie(i)}
              disabled={!canScore}
            >
              {String.fromCodePoint(0x2680 + value - 1)}
            </button>
          );
        })}
      </div>

      <div className="scoring-display">
        {resultCombos.length === 0 ? (
          <span className="scoring-placeholder">
            {selectedIndices.length === 0
              ? 'Select scoring dice above'
              : "Selected dice don't form a scoring combination"}
          </span>
        ) : (
          <>
            <div className="scoring-label">
              {resultCombos.map((c) => formatScoreType(c.type)).join(' + ')}
            </div>
            <div className="scoring-points">+{totalPoints} pts</div>
          </>
        )}
      </div>

      <div className="dice-stats-grid">
        <div>
          <div className="dice-stat-label">Turn Total</div>
          <div className="dice-stat-value">{context.turnPoints}</div>
        </div>
        <div>
          <div className="dice-stat-label">This Pick</div>
          <div className="dice-stat-value" id="selectedPoints">
            {resultCombos.length ? totalPoints : '—'}
          </div>
        </div>
        <div>
          <div className="dice-stat-label">Dice Left</div>
          <div className="dice-stat-value" id="diceLeftDisplay">
            {diceLeft === 0 ? '6 🔥' : diceLeft}
          </div>
        </div>
      </div>

      <div className="dice-action-buttons">
        <button
          type="button"
          className="dice-select-all-btn"
          onClick={selectAllScoring}
          disabled={isSubmitting}
        >
          ✦ Select All Scoring
        </button>
        <button
          type="button"
          className="dice-confirm-btn"
          onClick={handleConfirm}
          disabled={!canConfirm || isSubmitting}
        >
          ✓ Confirm Selection
        </button>
      </div>
    </>
  );
}
