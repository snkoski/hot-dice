import { useState } from 'react';
import { StepGameDisplay } from './StepGameDisplay';
import type { ScoringRules } from '../../types/game';
import type { CustomStrategy } from '../../App';

interface StepThroughPanelProps {
  selectedStrategyIds: string[];
  customStrategies: CustomStrategy[];
  defaultScoringRules: ScoringRules;
}

export function StepThroughPanel({
  selectedStrategyIds,
  customStrategies,
  defaultScoringRules,
}: StepThroughPanelProps) {
  const [gameOpen, setGameOpen] = useState(false);

  if (gameOpen) {
    return (
      <StepGameDisplay
        selectedStrategyIds={selectedStrategyIds}
        customStrategies={customStrategies}
        scoringRules={defaultScoringRules}
        targetScore={10000}
        minScore={0}
        onClose={() => setGameOpen(false)}
      />
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">🔍 Step-Through Mode</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Watch a single game unfold step by step. See each dice roll and how strategies make decisions in real-time.
      </p>
      <button
        onClick={() => setGameOpen(true)}
        disabled={selectedStrategyIds.length < 1}
        style={{ background: '#28a745' }}
      >
        🎮 Start Step-Through Game
      </button>
    </div>
  );
}
