import React from 'react';
import { clsx } from 'clsx';
import './strategies.css';

export interface StrategyDTO {
  id: string;
  name: string;
  description: string;
  version: string;
  details?: any;
  isCustom?: boolean;
}

interface StrategyCardProps {
  strategy: StrategyDTO;
  selected: boolean;
  onToggle: (id: string) => void;
  onShowDetails: (e: React.MouseEvent, strategy: StrategyDTO) => void;
  onRemove?: (id: string) => void;
}

export function StrategyCard({ strategy, selected, onToggle, onShowDetails, onRemove }: StrategyCardProps) {
  return (
    <div
      className={clsx('strategy-card', {
        selected,
        custom: strategy.isCustom
      })}
      onClick={() => onToggle(strategy.id)}
    >
      <div className="strategy-header">
        <h3>{strategy.name}</h3>
        <div>
          {strategy.details && (
            <button
              className="info-btn"
              title="View Strategy Details"
              onClick={(e) => onShowDetails(e, strategy)}
            >
              i
            </button>
          )}
          {strategy.isCustom && onRemove && (
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(strategy.id);
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <p>{strategy.description}</p>
      {strategy.version && (
        <small style={{ color: '#999' }}>v{strategy.version}</small>
      )}
    </div>
  );
}
