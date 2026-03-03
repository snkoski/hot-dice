import { formatScoreType } from '../../lib/formatters';
import type { InteractiveGameStep } from '../../types/stepGame';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface AiSummaryOverlayProps {
  skippedSteps: InteractiveGameStep[];
  onDone: () => void;
}

export function AiSummaryOverlay({ skippedSteps, onDone }: AiSummaryOverlayProps) {
  const aiSteps = skippedSteps.filter(
    (s) => !s.currentPlayerId?.startsWith('human')
  );
  if (aiSteps.length === 0) return null;

  const blocks: React.ReactNode[] = [];
  let currentBlock: React.ReactNode[] = [];

  for (const step of aiSteps) {
    if (step.type === 'turn_start') {
      if (currentBlock.length > 0) {
        blocks.push(<div key={blocks.length} className="ai-turn-block">{currentBlock}</div>);
        currentBlock = [];
      }
      currentBlock.push(
        <div key="player" className="ai-turn-player">
          {step.currentPlayerName ?? 'AI'}
        </div>
      );
    } else if (step.type === 'roll' && step.diceRolled) {
      const faces = step.diceRolled.map((d) => DICE_FACES[d - 1]).join('');
      currentBlock.push(
        <div key={`roll-${blocks.length}-${currentBlock.length}`} className="ai-roll-faces">
          {faces}
        </div>
      );
    } else if (step.type === 'roll' && step.keptCombinations) {
      const comboText = step.keptCombinations
        .map((c) => `${formatScoreType(c.type)} (${c.points})`)
        .join(', ');
      currentBlock.push(
        <div key={`kept-${blocks.length}-${currentBlock.length}`} className="ai-kept">
          → Kept: {comboText} = <strong>+{step.keptPoints ?? 0} pts</strong>{' '}
          <span className="ai-kept-dice">({step.diceRemaining ?? 0} dice left)</span>
        </div>
      );
    } else if (step.type === 'turn_complete') {
      const isFarkle = step.message?.toLowerCase().includes('farkle');
      const color = isFarkle ? '#dc3545' : '#28a745';
      const icon = isFarkle ? '💥' : '🏦';
      currentBlock.push(
        <div
          key={`result-${blocks.length}-${currentBlock.length}`}
          className="ai-turn-result"
          style={{ color }}
        >
          {icon} {step.message}
        </div>
      );
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(<div key={blocks.length} className="ai-turn-block">{currentBlock}</div>);
  }

  return (
    <div className="ai-summary-overlay">
      <h4 style={{ marginTop: 0, color: '#667eea', fontSize: '1em' }}>
        While You Were Away...
      </h4>
      <div className="ai-summary-content">{blocks}</div>
      <button type="button" className="ai-summary-done-btn" onClick={onDone}>
        Your Turn →
      </button>
    </div>
  );
}
