import React, { useEffect, useState } from 'react';
import { StrategyDTO } from './StrategyCard';
import { StrategyGrid } from './StrategyGrid';
import { CustomStrategyBuilder } from './CustomStrategyBuilder';
import { StrategyDetailsModal } from './StrategyDetailsModal';

interface StrategyPanelProps {
  builtInStrategies: StrategyDTO[];
  customStrategies: StrategyDTO[];
  setCustomStrategies: React.Dispatch<React.SetStateAction<StrategyDTO[]>>;
  selectedStrategyIds: string[];
  setSelectedStrategyIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function StrategyPanel({
  builtInStrategies,
  customStrategies,
  setCustomStrategies,
  selectedStrategyIds,
  setSelectedStrategyIds
}: StrategyPanelProps) {
  const [detailsStrategy, setDetailsStrategy] = useState<StrategyDTO | null>(null);

  const handleToggleStrategy = (id: string) => {
    setSelectedStrategyIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleAddCustomStrategy = (strategy: StrategyDTO) => {
    setCustomStrategies(prev => [...prev, strategy]);
    setSelectedStrategyIds(prev => [...prev, strategy.id]);
  };

  const handleRemoveCustomStrategy = (id: string) => {
    setCustomStrategies(prev => prev.filter(s => s.id !== id));
    setSelectedStrategyIds(prev => prev.filter(sId => sId !== id));
  };

  const handleShowDetails = (e: React.MouseEvent, strategy: StrategyDTO) => {
    e.stopPropagation();
    setDetailsStrategy(strategy);
  };

  const allStrategies = [...builtInStrategies, ...customStrategies];

  return (
    <div className="card">
      <h2 className="section-title">1. Select Strategies</h2>
      
      <CustomStrategyBuilder onAdd={handleAddCustomStrategy} />
      
      {builtInStrategies.length === 0 && <div className="loading"><div className="spinner"></div></div>}
      
      {builtInStrategies.length > 0 && (
        <>
          <StrategyGrid
            strategies={allStrategies}
            selectedStrategyIds={selectedStrategyIds}
            onToggleStrategy={handleToggleStrategy}
            onShowDetails={handleShowDetails}
            onRemoveCustomStrategy={handleRemoveCustomStrategy}
          />
          {selectedStrategyIds.length < 2 && (
            <p id="selection-hint" style={{ color: '#666', fontStyle: 'italic' }}>
              Select at least 2 strategies to compare
            </p>
          )}
        </>
      )}

      <StrategyDetailsModal
        strategy={detailsStrategy}
        onClose={() => setDetailsStrategy(null)}
      />
    </div>
  );
}
