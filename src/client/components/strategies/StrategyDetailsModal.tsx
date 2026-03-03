import React from 'react';
import { Modal } from '../shared/Modal';
import { StrategyDTO } from './StrategyCard';

interface StrategyDetailsModalProps {
  strategy: StrategyDTO | null;
  onClose: () => void;
}

export function StrategyDetailsModal({ strategy, onClose }: StrategyDetailsModalProps) {
  if (!strategy) return null;

  return (
    <Modal isOpen={!!strategy} onClose={onClose} title={strategy.name}>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '1.1em', color: '#555' }}>{strategy.description}</p>
        <span className="badge" style={{ marginTop: '10px' }}>Version {strategy.version}</span>
      </div>

      {Array.isArray(strategy.details) && strategy.details.length > 0 && (
        <div className="modal-section">
          <h3>🧩 Strategy Components</h3>
          {strategy.details.map((comp: any, i: number) => (
            <div key={i} className="component-item">
              <div className="component-name">
                {comp.name}
                <span className="badge" style={{ float: 'right' }}>{comp.type}</span>
              </div>
              <div className="component-desc">{comp.description}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
