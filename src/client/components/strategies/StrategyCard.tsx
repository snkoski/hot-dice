import clsx from 'clsx';
import './strategies.css';

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  details?: {
    diceSelector?: { name: string; description: string };
    thresholdCalculator?: { name: string; description: string };
    modifiers?: Array<{ name: string; description: string }>;
    evaluators?: Array<{ name: string; description: string }>;
    combinationMode?: string;
  };
}

interface StrategyCardProps {
  strategy: StrategyInfo;
  selected: boolean;
  isCustom: boolean;
  onToggle: () => void;
  onInfo?: () => void;
  onRemove?: () => void;
}

export function StrategyCard({
  strategy,
  selected,
  isCustom,
  onToggle,
  onInfo,
  onRemove,
}: StrategyCardProps) {
  return (
    <div
      className={clsx('strategy-card', { selected, custom: isCustom })}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="strategy-header">
        <h3>{strategy.name}</h3>
        {isCustom && onRemove ? (
          <button
            className="remove-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove this custom strategy"
          >
            ✕
          </button>
        ) : (
          strategy.details &&
          onInfo && (
            <button
              className="info-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInfo();
              }}
              title="Show strategy details"
            >
              ℹ️
            </button>
          )
        )}
      </div>
      <p>{strategy.description}</p>
    </div>
  );
}
