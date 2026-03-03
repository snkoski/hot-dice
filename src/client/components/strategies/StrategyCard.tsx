import clsx from 'clsx';
import './strategies.css';

interface StrategyCardProps {
  id: string;
  name: string;
  description: string;
  selected: boolean;
  isCustom?: boolean;
  hasDetails?: boolean;
  onToggle: (id: string) => void;
  onShowDetails?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function StrategyCard({
  id,
  name,
  description,
  selected,
  isCustom,
  hasDetails,
  onToggle,
  onShowDetails,
  onRemove,
}: StrategyCardProps) {
  return (
    <div
      className={clsx('strategy-card', { selected, custom: isCustom })}
      onClick={() => onToggle(id)}
    >
      <div className="strategy-header">
        <h3>{name}</h3>
        {isCustom && onRemove && (
          <button
            className="remove-btn"
            onClick={(e) => { e.stopPropagation(); onRemove(id); }}
            title="Remove this custom strategy"
          >
            ✕
          </button>
        )}
        {hasDetails && onShowDetails && (
          <button
            className="info-btn"
            onClick={(e) => { e.stopPropagation(); onShowDetails(id); }}
            title="Show strategy details"
          >
            ℹ️
          </button>
        )}
      </div>
      <p>{description}</p>
    </div>
  );
}
