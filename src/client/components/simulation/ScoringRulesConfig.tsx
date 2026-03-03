import type { ScoringRules } from '../../types/game';

interface ScoringRulesConfigProps {
  rules: ScoringRules;
  onChange: (rules: ScoringRules) => void;
}

const RULE_LABELS: { key: keyof Omit<ScoringRules, 'minimumScoreToBoard'>; label: string }[] = [
  { key: 'enableStraight', label: 'Straight (1500 pts)' },
  { key: 'enableThreePairs', label: 'Three Pairs (1500 pts)' },
  { key: 'enableFourOfKindBonus', label: '4-of-kind Bonus (×2)' },
  { key: 'enableFiveOfKindBonus', label: '5-of-kind Bonus (×3)' },
  { key: 'enableSixOfKindBonus', label: '6-of-kind Bonus (×4)' },
  { key: 'enableSingleOnes', label: 'Single 1s (100 pts)' },
  { key: 'enableSingleFives', label: 'Single 5s (50 pts)' },
];

export function ScoringRulesConfig({ rules, onChange }: ScoringRulesConfigProps) {
  const toggle = (key: keyof ScoringRules) => {
    onChange({ ...rules, [key]: !rules[key as keyof ScoringRules] });
  };

  return (
    <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, margin: '20px 0' }}>
      <h3 style={{ color: '#667eea', marginBottom: 15, fontSize: '1.1em' }}>⚙️ Scoring Rules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {RULE_LABELS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rules[key] as boolean}
              onChange={() => toggle(key)}
              style={{ width: 'auto' }}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
        Uncheck any rule to disable it. 3-of-kind always scores base points.
      </p>
    </div>
  );
}
