import { useState } from 'react';
import './strategies.css';

export interface CustomStrategyInput {
  id: string;
  name: string;
  description: string;
  type: 'simple' | 'safe';
  threshold: number;
  minDice?: number;
}

interface CustomStrategyBuilderProps {
  onAddSimple: (threshold: number) => void;
  onAddSafe: (threshold: number, minDice: number) => void;
}

export function CustomStrategyBuilder({ onAddSimple, onAddSafe }: CustomStrategyBuilderProps) {
  const [simpleThreshold, setSimpleThreshold] = useState(750);
  const [safeThreshold, setSafeThreshold] = useState(500);
  const [minDice, setMinDice] = useState(2);
  const [feedback, setFeedback] = useState<'simple' | 'safe' | null>(null);

  const handleAddSimple = () => {
    if (simpleThreshold < 100 || simpleThreshold > 5000) {
      alert('Please enter a threshold between 100 and 5000');
      return;
    }
    onAddSimple(simpleThreshold);
    setFeedback('simple');
    setTimeout(() => setFeedback(null), 500);
  };

  const handleAddSafe = () => {
    if (safeThreshold < 100 || safeThreshold > 5000) {
      alert('Please enter a threshold between 100 and 5000');
      return;
    }
    if (minDice < 1 || minDice > 5) {
      alert('Please enter a minimum dice count between 1 and 5');
      return;
    }
    onAddSafe(safeThreshold, minDice);
    setFeedback('safe');
    setTimeout(() => setFeedback(null), 500);
  };

  return (
    <div
      style={{
        background: '#f0f4ff',
        padding: 20,
        borderRadius: 8,
        marginBottom: 20,
        border: '2px solid #667eea',
      }}
    >
      <h3 style={{ color: '#667eea', marginBottom: 15 }}>🎨 Create Custom Strategies</h3>

      <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #ddd' }}>
        <h4 style={{ color: '#555', marginBottom: 10 }}>Simple Fixed Threshold</h4>
        <div style={{ display: 'flex', gap: 15, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="customThreshold" style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#555' }}>
              Stop at (points):
            </label>
            <input
              type="number"
              id="customThreshold"
              value={simpleThreshold}
              onChange={(e) => setSimpleThreshold(parseInt(e.target.value, 10) || 750)}
              min={100}
              max={5000}
              step={50}
              style={{
                width: '100%',
                padding: 10,
                border: '2px solid #667eea',
                borderRadius: 6,
                fontSize: '1em',
                background: feedback === 'simple' ? '#d4edda' : undefined,
              }}
            />
          </div>
          <div>
            <button type="button" onClick={handleAddSimple} style={{ padding: '10px 30px', fontSize: '1em', width: 'auto' }}>
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
            <label htmlFor="safeThreshold" style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#555' }}>
              Target (points):
            </label>
            <input
              type="number"
              id="safeThreshold"
              value={safeThreshold}
              onChange={(e) => setSafeThreshold(parseInt(e.target.value, 10) || 500)}
              min={100}
              max={5000}
              step={50}
              style={{
                width: '100%',
                padding: 10,
                border: '2px solid #667eea',
                borderRadius: 6,
                fontSize: '1em',
                background: feedback === 'safe' ? '#d4edda' : undefined,
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="minDice" style={{ display: 'block', marginBottom: 5, fontWeight: 600, color: '#555' }}>
              Stop at ≤ dice:
            </label>
            <input
              type="number"
              id="minDice"
              value={minDice}
              onChange={(e) => setMinDice(parseInt(e.target.value, 10) || 2)}
              min={1}
              max={5}
              step={1}
              style={{
                width: '100%',
                padding: 10,
                border: '2px solid #667eea',
                borderRadius: 6,
                fontSize: '1em',
              }}
            />
          </div>
          <div>
            <button type="button" onClick={handleAddSafe} style={{ padding: '10px 30px', fontSize: '1em', width: 'auto' }}>
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
