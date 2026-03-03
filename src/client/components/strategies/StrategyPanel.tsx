import { useState, useCallback } from 'react';
import { StrategyGrid } from './StrategyGrid';
import { CustomStrategyBuilder } from './CustomStrategyBuilder';
import { StrategyDetailsModal } from './StrategyDetailsModal';
import type { StrategyInfo, CustomStrategy } from '../../App';

interface StrategyPanelProps {
  availableStrategies: StrategyInfo[];
  customStrategies: CustomStrategy[];
  selectedStrategyIds: string[];
  onToggleStrategy: (id: string) => void;
  onAddCustom: (strategy: CustomStrategy) => void;
  onRemoveCustom: (id: string) => void;
}

export function StrategyPanel({
  availableStrategies,
  customStrategies,
  selectedStrategyIds,
  onToggleStrategy,
  onAddCustom,
  onRemoveCustom,
}: StrategyPanelProps) {
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const detailsStrategy = detailsId
    ? availableStrategies.find((s) => s.id === detailsId) ?? null
    : null;

  const closeDetails = useCallback(() => setDetailsId(null), []);

  return (
    <div className="card">
      <h2 className="section-title">1. Select Strategies</h2>

      <div className="custom-builder-container" style={{
        background: '#f0f4ff', padding: 20, borderRadius: 8,
        marginBottom: 20, border: '2px solid #667eea',
      }}>
        <CustomStrategyBuilder onAdd={onAddCustom} />
      </div>

      <StrategyGrid
        availableStrategies={availableStrategies}
        customStrategies={customStrategies}
        selectedStrategyIds={selectedStrategyIds}
        onToggleStrategy={onToggleStrategy}
        onShowDetails={setDetailsId}
        onRemoveCustom={onRemoveCustom}
      />

      <StrategyDetailsModal
        strategy={detailsStrategy}
        open={!!detailsStrategy}
        onClose={closeDetails}
      />
    </div>
  );
}
