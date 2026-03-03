import { useState, useRef } from 'react';
import type { CustomStrategy } from '../../App';

interface CustomStrategyBuilderProps {
  onAdd: (strategy: CustomStrategy) => void;
}

export function CustomStrategyBuilder({ onAdd }: CustomStrategyBuilderProps) {
  const [simpleThreshold, setSimpleThreshold] = useState(750);
  const [safeThreshold, setSafeThreshold] = useState(500);
  const [minDice, setMinDice] = useState(2);
  const simpleRef = useRef<HTMLInputElement>(null);
  const safeRef = useRef<HTMLInputElement>(null);

  const flashSuccess = (el: HTMLInputElement | null) => {
    if (!el) return;
    const orig = el.style.background;
    el.style.background = '#d4edda';
    setTimeout(() => { el.style.background = orig; }, 500);
  };

  const addSimple = () => {
    if (simpleThreshold < 100 || simpleThreshold > 5000) {
      alert('Please enter a threshold between 100 and 5000');
      return;
    }
    onAdd({
      id: `custom-simple-${simpleThreshold}-${Date.now()}`,
      name: `Custom: ${simpleThreshold}`,
      description: `Stops at ${simpleThreshold} points`,
      version: '1.0.0',
      isCustom: true,
      type: 'simple',
      threshold: simpleThreshold,
    });
    flashSuccess(simpleRef.current);
  };

  const addSafe = () => {
    if (safeThreshold < 100 || safeThreshold > 5000) {
      alert('Please enter a threshold between 100 and 5000');
      return;
    }
    if (minDice < 1 || minDice > 5) {
      alert('Please enter a minimum dice count between 1 and 5');
      return;
    }
    onAdd({
      id: `custom-safe-${safeThreshold}-${minDice}-${Date.now()}`,
      name: `Safe ${safeThreshold} (≤${minDice} dice)`,
      description: `Targets ${safeThreshold} points but stops when ${minDice} or fewer dice remain`,
      version: '1.0.0',
      isCustom: true,
      type: 'safe',
      threshold: safeThreshold,
      minDice,
    });
    flashSuccess(safeRef.current);
  };

  return (
    <div className="custom-builder-container">
      <h3 style={{ color: '#667eea', marginBottom: 15 }}>🎨 Create Custom Strategies</h3>

      <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #ddd' }}>
        <h4 style={{ color: '#555', marginBottom: 10 }}>Simple Fixed Threshold</h4>
        <div style={{ display: 'flex', gap: 15, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#555' }}>
              Stop at (points):
            </label>
            <input
              ref={simpleRef}
              type="number"
              value={simpleThreshold}
              onChange={(e) => setSimpleThreshold(parseInt(e.target.value) || 0)}
              min={100}
              max={5000}
              step={50}
              style={{
                width: '100%', padding: 10, border: '2px solid #667eea',
                borderRadius: 6, fontSize: '1em',
              }}
            />
          </div>
          <div>
            <button onClick={addSimple} style={{ padding: '10px 30px', fontSize: '1em', width: 'auto' }}>
              ➕ Add Simple
            </button>
          </div>
        </div>
        <p style={{ color: '#666', fontSize: '0.85em', marginTop: 8, fontStyle: 'italic' }}>
          Stops when turn points reach your threshold
        </p>
      </div>

      <div>
        <h4 style={{ color: '#555', marginBottom: 10 }}>Threshold + Dice Safety Check</h4>
        <div style={{ display: 'flex', gap: 15, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#555' }}>
              Target (points):
            </label>
            <input
              ref={safeRef}
              type="number"
              value={safeThreshold}
              onChange={(e) => setSafeThreshold(parseInt(e.target.value) || 0)}
              min={100}
              max={5000}
              step={50}
              style={{
                width: '100%', padding: 10, border: '2px solid #667eea',
                borderRadius: 6, fontSize: '1em',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#555' }}>
              Stop at ≤ dice:
            </label>
            <input
              type="number"
              value={minDice}
              onChange={(e) => setMinDice(parseInt(e.target.value) || 0)}
              min={1}
              max={5}
              step={1}
              style={{
                width: '100%', padding: 10, border: '2px solid #667eea',
                borderRadius: 6, fontSize: '1em',
              }}
            />
          </div>
          <div>
            <button onClick={addSafe} style={{ padding: '10px 30px', fontSize: '1em', width: 'auto' }}>
              ➕ Add Safe
            </button>
          </div>
        </div>
        <p style={{ color: '#666', fontSize: '0.85em', marginTop: 8, fontStyle: 'italic' }}>
          Aims for target points but stops early if dice count gets too low
        </p>
      </div>
    </div>
  );
}
