import { StrategyCard } from './StrategyCard';
import type { StrategyInfo, CustomStrategy } from '../../App';
import './strategies.css';

interface StrategyGridProps {
  availableStrategies: StrategyInfo[];
  customStrategies: CustomStrategy[];
  selectedStrategyIds: string[];
  onToggleStrategy: (id: string) => void;
  onShowDetails: (id: string) => void;
  onRemoveCustom: (id: string) => void;
}

export function StrategyGrid({
  availableStrategies,
  customStrategies,
  selectedStrategyIds,
  onToggleStrategy,
  onShowDetails,
  onRemoveCustom,
}: StrategyGridProps) {
  return (
    <>
      <div className="strategy-grid">
        {availableStrategies.map((s) => (
          <StrategyCard
            key={s.id}
            id={s.id}
            name={s.name}
            description={s.description}
            selected={selectedStrategyIds.includes(s.id)}
            hasDetails={!!s.details}
            onToggle={onToggleStrategy}
            onShowDetails={onShowDetails}
          />
        ))}
        {customStrategies.map((s) => (
          <StrategyCard
            key={s.id}
            id={s.id}
            name={s.name}
            description={s.description}
            selected={selectedStrategyIds.includes(s.id)}
            isCustom
            onToggle={onToggleStrategy}
            onRemove={onRemoveCustom}
          />
        ))}
      </div>
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        {selectedStrategyIds.length > 0
          ? `${selectedStrategyIds.length} ${selectedStrategyIds.length === 1 ? 'strategy' : 'strategies'} selected`
          : 'Select at least 1 strategy'}
      </p>
    </>
  );
}
