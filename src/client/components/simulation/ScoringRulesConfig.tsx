import React from 'react';
import { SimulationUIConfig } from '../../App';

interface ScoringRulesConfigProps {
  rules: SimulationUIConfig['scoringRules'];
  onChange: (key: keyof SimulationUIConfig['scoringRules'], value: boolean) => void;
}

export function ScoringRulesConfig({ rules, onChange }: ScoringRulesConfigProps) {
  return (
    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
      <h3 style={{ color: '#667eea', marginBottom: '15px', fontSize: '1.1em' }}>⚙️ Scoring Rules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={rules.enableStraight} onChange={e => onChange('enableStraight', e.target.checked)} />
          <span>Straight (1500 pts)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={rules.enableThreePairs} onChange={e => onChange('enableThreePairs', e.target.checked)} />
          <span>Three Pairs (1500 pts)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={rules.enableFourOfKindBonus} onChange={e => onChange('enableFourOfKindBonus', e.target.checked)} />
          <span>4-of-kind Bonus (×2)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={rules.enableFiveOfKindBonus} onChange={e => onChange('enableFiveOfKindBonus', e.target.checked)} />
          <span>5-of-kind Bonus (×3)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={rules.enableSixOfKindBonus} onChange={e => onChange('enableSixOfKindBonus', e.target.checked)} />
          <span>6-of-kind Bonus (×4)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={rules.enableSingleOnes} onChange={e => onChange('enableSingleOnes', e.target.checked)} />
          <span>Single 1s (100 pts)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={rules.enableSingleFives} onChange={e => onChange('enableSingleFives', e.target.checked)} />
          <span>Single 5s (50 pts)</span>
        </label>
      </div>
      <p style={{ marginTop: '10px', fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
        Uncheck any rule to disable it. 3-of-kind always scores base points.
      </p>
    </div>
  );
}
