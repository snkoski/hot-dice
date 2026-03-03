import { useState, useEffect, useCallback } from 'react';
import { StrategyGrid } from './StrategyGrid';
import { CustomStrategyBuilder } from './CustomStrategyBuilder';
import { StrategyDetailsModal } from './StrategyDetailsModal';
import type { StrategyInfo } from './StrategyCard';
import './strategies.css';

export interface CustomStrategyData {
  id: string;
  name: string;
  description: string;
  type: 'simple' | 'safe';
  threshold: number;
  minDice?: number;
}

interface StrategyPanelProps {
  selectedStrategyIds: string[];
  customStrategies: CustomStrategyData[];
  onSelectionChange: (ids: string[]) => void;
  onCustomStrategiesChange: (strategies: CustomStrategyData[]) => void;
  onCanRunChange?: (canRun: boolean) => void;
  onStrategiesLoaded?: (strategies: StrategyInfo[]) => void;
}

export function StrategyPanel({
  selectedStrategyIds,
  customStrategies,
  onSelectionChange,
  onCustomStrategiesChange,
  onCanRunChange,
  onStrategiesLoaded,
}: StrategyPanelProps) {
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsStrategy, setDetailsStrategy] = useState<StrategyInfo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedSet = new Set(selectedStrategyIds);
  const customAsStrategyInfo: StrategyInfo[] = customStrategies.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  useEffect(() => {
    fetch('/api/strategies')
      .then((res) => res.json())
      .then((data: StrategyInfo[]) => {
        setStrategies(data);
        onStrategiesLoaded?.(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load strategies:', err);
        setLoading(false);
      });
  }, [onStrategiesLoaded]);

  useEffect(() => {
    onCanRunChange?.(selectedStrategyIds.length >= 1);
  }, [selectedStrategyIds.length, onCanRunChange]);

  const handleToggle = useCallback(
    (id: string) => {
      const idx = selectedStrategyIds.indexOf(id);
      if (idx >= 0) {
        onSelectionChange(selectedStrategyIds.filter((x) => x !== id));
      } else {
        onSelectionChange([...selectedStrategyIds, id]);
      }
    },
    [selectedStrategyIds, onSelectionChange]
  );

  const handleAddSimple = useCallback(
    (threshold: number) => {
      const id = `custom-simple-${threshold}-${Date.now()}`;
      const newStrategy: CustomStrategyData = {
        id,
        name: `Custom: ${threshold}`,
        description: `Stops at ${threshold} points`,
        type: 'simple',
        threshold,
      };
      onCustomStrategiesChange([...customStrategies, newStrategy]);
    },
    [customStrategies, onCustomStrategiesChange]
  );

  const handleAddSafe = useCallback(
    (threshold: number, minDice: number) => {
      const id = `custom-safe-${threshold}-${minDice}-${Date.now()}`;
      const newStrategy: CustomStrategyData = {
        id,
        name: `Safe ${threshold} (≤${minDice} dice)`,
        description: `Targets ${threshold} points but stops when ${minDice} or fewer dice remain`,
        type: 'safe',
        threshold,
        minDice,
      };
      onCustomStrategiesChange([...customStrategies, newStrategy]);
    },
    [customStrategies, onCustomStrategiesChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onCustomStrategiesChange(customStrategies.filter((s) => s.id !== id));
      onSelectionChange(selectedStrategyIds.filter((x) => x !== id));
    },
    [customStrategies, selectedStrategyIds, onCustomStrategiesChange, onSelectionChange]
  );

  const handleShowDetails = useCallback((id: string) => {
    const s = strategies.find((x) => x.id === id);
    if (s?.details) {
      setDetailsStrategy(s);
      setDetailsOpen(true);
    }
  }, [strategies]);

  const selectionHint =
    selectedStrategyIds.length >= 1
      ? `${selectedStrategyIds.length} ${selectedStrategyIds.length === 1 ? 'strategy' : 'strategies'} selected`
      : 'Select at least 1 strategy';

  return (
    <div className="card">
      <h2 className="section-title">1. Select Strategies</h2>

      <CustomStrategyBuilder onAddSimple={handleAddSimple} onAddSafe={handleAddSafe} />

      {loading ? (
        <p style={{ color: '#666' }}>Loading strategies...</p>
      ) : (
        <>
          <StrategyGrid
            strategies={strategies}
            customStrategies={customAsStrategyInfo}
            selectedIds={selectedSet}
            onToggle={handleToggle}
            onInfo={handleShowDetails}
            onRemove={handleRemove}
          />
          <p id="selection-hint" style={{ color: '#666', fontStyle: 'italic' }}>
            {selectionHint}
          </p>
        </>
      )}

      <StrategyDetailsModal strategy={detailsStrategy} isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </div>
  );
}
