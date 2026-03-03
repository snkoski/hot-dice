import React, { useState } from 'react';
import { StrategyDTO } from './StrategyCard';

interface CustomStrategyBuilderProps {
  onAdd: (strategy: StrategyDTO) => void;
}

export function CustomStrategyBuilder({ onAdd }: CustomStrategyBuilderProps) {
  const [simpleThreshold, setSimpleThreshold] = useState(750);
  const [safeThreshold, setSafeThreshold] = useState(500);
  const [minDice, setMinDice] = useState(2);

  const handleAddSimple = () => {
    const id = `custom-threshold-${simpleThreshold}-${Date.now()}`;
    onAdd({
      id,
      name: `Stop at ${simpleThreshold}`,
      description: `Always stops when turn points reach ${simpleThreshold}`,
      version: '1.0.0',
      isCustom: true,
      details: { type: 'simple', threshold: simpleThreshold }
    });
  };

  const handleAddSafe = () => {
    const id = `custom-safe-${safeThreshold}-${minDice}-${Date.now()}`;
    onAdd({
      id,
      name: `Safe ${safeThreshold} (≤${minDice} dice)`,
      description: `Targets ${safeThreshold} points but stops when ${minDice} or fewer dice remain`,
      version: '1.0.0',
      isCustom: true,
      details: { type: 'safe', threshold: safeThreshold, minDice }
    });
  };

  return (
    <div
      style={{
        background: '#f0f4ff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '2px solid #667eea'
      }}
    >
      <h3 style={{ color: '#667eea', marginBottom: '15px' }}>🎨 Create Custom Strategies</h3>

      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <h4 style={{ color: '#555', marginBottom: '10px' }}>Simple Fixed Threshold</h4>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#555' }}>
              Stop at (points):
            </label>
            <input
              type="number"
              value={simpleThreshold}
              onChange={(e) => setSimpleThreshold(Number(e.target.value))}
              min={100} max={5000} step={50}
              style={{ width: '100%', padding: '10px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '1em' }}
            />
          </div>
          <div>
            <button onClick={handleAddSimple} style={{ padding: '10px 30px', fontSize: '1em', width: 'auto' }}>
              ➕ Add Simple
            </button>
          </div>
        </div>
        <p style={{ color: '#666', fontSize: '0.85em', marginTop: '8px', fontStyle: 'italic' }}>
          Stops when turn points reach your threshold
        </p>
      </div>

      <div>
        <h4 style={{ color: '#555', marginBottom: '10px' }}>Threshold + Dice Safety Check</h4>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#555' }}>
              Target (points):
            </label>
            <input
              type="number"
              value={safeThreshold}
              onChange={(e) => setSafeThreshold(Number(e.target.value))}
              min={100} max={5000} step={50}
              style={{ width: '100%', padding: '10px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '1em' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#555' }}>
              Stop at ≤ dice:
            </label>
            <input
              type="number"
              value={minDice}
              onChange={(e) => setMinDice(Number(e.target.value))}
              min={1} max={5} step={1}
              style={{ width: '100%', padding: '10px', border: '2px solid #667eea', borderRadius: '6px', fontSize: '1em' }}
            />
          </div>
          <div>
            <button onClick={handleAddSafe} style={{ padding: '10px 30px', fontSize: '1em', width: 'auto' }}>
              ➕ Add Safe
            </button>
          </div>
        </div>
        <p style={{ color: '#666', fontSize: '0.85em', marginTop: '8px', fontStyle: 'italic' }}>
          Aims for target points but stops early if dice count gets too low
        </p>
      </div>
    </div>
  );
}
