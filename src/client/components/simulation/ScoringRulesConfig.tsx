import type { ScoringRules } from '../../types/game';

interface ScoringRulesConfigProps {
  rules: ScoringRules;
  onChange: (rules: ScoringRules) => void;
}

export function ScoringRulesConfig({ rules, onChange }: ScoringRulesConfigProps) {
  const update = (key: keyof ScoringRules, value: boolean | number) => {
    onChange({ ...rules, [key]: value });
  };

  return (
    <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, margin: '20px 0' }}>
      <h3 style={{ color: '#667eea', marginBottom: 15, fontSize: '1.1em' }}>⚙️ Scoring Rules</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 12,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.enableStraight}
            onChange={(e) => update('enableStraight', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>Straight (1500 pts)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.enableThreePairs}
            onChange={(e) => update('enableThreePairs', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>Three Pairs (1500 pts)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.enableFourOfKindBonus}
            onChange={(e) => update('enableFourOfKindBonus', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>4-of-kind Bonus (×2)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.enableFiveOfKindBonus}
            onChange={(e) => update('enableFiveOfKindBonus', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>5-of-kind Bonus (×3)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.enableSixOfKindBonus}
            onChange={(e) => update('enableSixOfKindBonus', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>6-of-kind Bonus (×4)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.enableSingleOnes}
            onChange={(e) => update('enableSingleOnes', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>Single 1s (100 pts)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.enableSingleFives}
            onChange={(e) => update('enableSingleFives', e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>Single 5s (50 pts)</span>
        </label>
      </div>
      <p style={{ marginTop: 10, fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
        Uncheck any rule to disable it. 3-of-kind always scores base points.
      </p>
    </div>
  );
}
