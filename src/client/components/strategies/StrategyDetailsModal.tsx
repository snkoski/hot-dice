import { Modal } from '../shared/Modal';
import type { StrategyInfo } from './StrategyCard';
import './strategies.css';

const STRATEGY_EXPLANATIONS: Record<string, string> = {
  'adaptive-composed':
    'This strategy adjusts its risk tolerance based on your position in the game. When behind, it becomes more aggressive (higher thresholds). When ahead, it plays more conservatively.',
  'risk-aware-composed':
    'Starts with a moderate 1500-point threshold but reduces it when farkle risk is high. Automatically stops when risk reaches 40%, preventing risky situations.',
  'selective-minimum':
    'Smart dice management: keeps only the best scoring combo when you have many dice (preserving reroll options), but switches to keeping all scoring dice when few remain.',
  'dynamic-multi-factor':
    'The most sophisticated strategy. Combines opponent tracking, dice count, farkle risk, and hot streak detection. All safety checks must pass before continuing.',
  'endgame-aggressive':
    'Becomes increasingly aggressive as you approach the target score (1000 → 3000 point threshold). Uses "any" mode so it will continue if either the threshold OR expected value check passes.',
  'conservative-composed':
    'Very safe approach with a low 800-point threshold that gets reduced even further by dice count and risk adjustments. Has three safety checks that all must pass.',
  'safe-500':
    "Aims for 500 points per turn but includes a critical safety feature: automatically stops rolling if you're down to 2 or fewer dice, even if you haven't reached 500 yet. This prevents high-risk situations where a farkle would lose all your points.",
};

interface StrategyDetailsModalProps {
  strategy: StrategyInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StrategyDetailsModal({ strategy, isOpen, onClose }: StrategyDetailsModalProps) {
  if (!strategy?.details) return null;

  const details = strategy.details;
  const combinationMode = details.combinationMode ?? 'all';
  const explanation = STRATEGY_EXPLANATIONS[strategy.id] ?? 'This strategy uses a combination of composable functions to make decisions.';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={strategy.name} maxWidth={700}>
      <p style={{ color: '#666', marginBottom: 20 }}>{strategy.description}</p>

      {details.diceSelector && (
        <div className="modal-section">
          <h3>🎲 Dice Selection</h3>
          <div className="component-item">
            <div className="component-name">{details.diceSelector.name}</div>
            <div className="component-desc">{details.diceSelector.description}</div>
          </div>
        </div>
      )}

      <div className="modal-section">
        <h3>🤔 Continue Decision Logic</h3>
        <div style={{ marginBottom: 10 }}>
          <span className="badge">Mode: {combinationMode.toUpperCase()}</span>
          {combinationMode === 'all' && (
            <span style={{ color: '#666', fontSize: '0.9em', marginLeft: 8 }}>All conditions must be met</span>
          )}
          {combinationMode === 'any' && (
            <span style={{ color: '#666', fontSize: '0.9em', marginLeft: 8 }}>Any condition can trigger continue</span>
          )}
        </div>

        {details.thresholdCalculator && (
          <div className="component-item">
            <div className="component-name">📊 {details.thresholdCalculator.name}</div>
            <div className="component-desc">{details.thresholdCalculator.description}</div>
          </div>
        )}

        {details.modifiers?.map((modifier) => (
          <div key={modifier.name} className="component-item">
            <div className="component-name">⚙️ {modifier.name}</div>
            <div className="component-desc">{modifier.description}</div>
          </div>
        ))}

        {details.evaluators?.map((evaluator) => (
          <div key={evaluator.name} className="component-item">
            <div className="component-name">✓ {evaluator.name}</div>
            <div className="component-desc">{evaluator.description}</div>
          </div>
        ))}
      </div>

      <div className="modal-section" style={{ background: '#e8f0fe' }}>
        <h3>💡 How It Works</h3>
        <p style={{ color: '#666', lineHeight: 1.6 }}>{explanation}</p>
      </div>
    </Modal>
  );
}
