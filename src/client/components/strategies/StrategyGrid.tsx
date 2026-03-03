import { StrategyCard, type StrategyInfo } from './StrategyCard';
import './strategies.css';

interface StrategyGridProps {
  strategies: StrategyInfo[];
  customStrategies: StrategyInfo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onInfo: (id: string) => void;
  onRemove: (id: string) => void;
}

export function StrategyGrid({
  strategies,
  customStrategies,
  selectedIds,
  onToggle,
  onInfo,
  onRemove,
}: StrategyGridProps) {
  const allStrategies = [...strategies, ...customStrategies];

  return (
    <div className="strategy-grid">
      {allStrategies.map((strategy) => (
        <StrategyCard
          key={strategy.id}
          strategy={strategy}
          selected={selectedIds.has(strategy.id)}
          isCustom={customStrategies.some((c) => c.id === strategy.id)}
          onToggle={() => onToggle(strategy.id)}
          onInfo={strategies.some((s) => s.id === strategy.id) ? () => onInfo(strategy.id) : undefined}
          onRemove={customStrategies.some((c) => c.id === strategy.id) ? () => onRemove(strategy.id) : undefined}
        />
      ))}
    </div>
  );
}
