import React from 'react';
import { StrategyCard, StrategyDTO } from './StrategyCard';
import './strategies.css';

interface StrategyGridProps {
  strategies: StrategyDTO[];
  selectedStrategyIds: string[];
  onToggleStrategy: (id: string) => void;
  onShowDetails: (e: React.MouseEvent, strategy: StrategyDTO) => void;
  onRemoveCustomStrategy?: (id: string) => void;
}

export function StrategyGrid({
  strategies,
  selectedStrategyIds,
  onToggleStrategy,
  onShowDetails,
  onRemoveCustomStrategy
}: StrategyGridProps) {
  return (
    <div className="strategy-grid">
      {strategies.map((s) => (
        <StrategyCard
          key={s.id}
          strategy={s}
          selected={selectedStrategyIds.includes(s.id)}
          onToggle={onToggleStrategy}
          onShowDetails={onShowDetails}
          onRemove={onRemoveCustomStrategy}
        />
      ))}
    </div>
  );
}
