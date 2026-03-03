import { useState, useCallback } from 'react';
import { InteractiveGameDisplay } from './InteractiveGameDisplay';
import { PlayStyleModal } from '../stats/PlayStyleModal';
import { useHumanDecisions } from '../../hooks/useHumanDecisions';
import type { ScoringRules } from '../../types/game';
import type { HumanDecisionLocalRecord } from '../../hooks/useHumanDecisions';

interface InteractivePanelProps {
  selectedStrategyIds: string[];
  defaultScoringRules: ScoringRules;
}

export function InteractivePanel({ selectedStrategyIds, defaultScoringRules }: InteractivePanelProps) {
  const [gameState, setGameState] = useState<{ gameId: string; mirroredDice: boolean; step: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mirroredDice, setMirroredDice] = useState(false);
  const [playStyleOpen, setPlayStyleOpen] = useState(false);
  const [decisions, setDecisions] = useState<HumanDecisionLocalRecord[]>([]);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyze>>(null);

  const { loadAll: loadDecisions, analyze, clearAll: clearDecisions, exportJSON } = useHumanDecisions();

  const startGame = useCallback(async () => {
    const strategyIds = selectedStrategyIds.filter((id) => !id.startsWith('custom-'));
    try {
      setLoading(true);
      const res = await fetch('/api/game/interactive/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyIds,
          humanPlayerIndices: [0],
          targetScore: 10000,
          minimumScoreToBoard: defaultScoringRules.minimumScoreToBoard,
          mirroredDice,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Failed to start game: ' + err.error);
        return;
      }
      const data = await res.json();
      setGameState({
        gameId: data.gameId,
        mirroredDice: data.mirroredDice ?? false,
        step: data.currentStep,
      });
    } catch (e: any) {
      alert('Failed to start game: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStrategyIds, defaultScoringRules.minimumScoreToBoard, mirroredDice]);

  const viewPlayStyle = useCallback(() => {
    const d = loadDecisions();
    if (d.length === 0) {
      alert('No decision history yet. Play some interactive games first!');
      return;
    }
    setDecisions(d);
    setAnalysis(analyze());
    setPlayStyleOpen(true);
  }, [loadDecisions, analyze]);

  if (gameState) {
    return (
      <InteractiveGameDisplay
        gameId={gameState.gameId}
        mirroredDice={gameState.mirroredDice}
        initialStep={gameState.step}
        onClose={() => setGameState(null)}
      />
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="section-title">🎮 Play Interactive Game</h2>
        <p style={{ color: '#666', marginBottom: 20 }}>
          Play against AI strategies! Make real decisions, see immediate results, and build your play history for analysis.
        </p>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15,
          cursor: 'pointer', userSelect: 'none', width: 'fit-content',
        }}>
          <input
            type="checkbox"
            checked={mirroredDice}
            onChange={(e) => setMirroredDice(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#667eea' }}
          />
          <span style={{ fontSize: '0.95em', color: '#444' }}>
            <strong>Mirrored dice</strong> — all players roll the same dice each round
          </span>
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={startGame}
            disabled={loading}
            style={{ padding: '12px 24px', background: '#28a745', flex: 1, minWidth: 200, fontWeight: 'bold' }}
          >
            {loading ? 'Starting...' : '🎮 Start Interactive Game'}
          </button>
          <button
            onClick={viewPlayStyle}
            style={{ padding: '12px 24px', background: '#667eea', flex: 1, minWidth: 200, fontWeight: 'bold' }}
          >
            📊 View Your Play Style
          </button>
        </div>
      </div>

      <PlayStyleModal
        open={playStyleOpen}
        onClose={() => setPlayStyleOpen(false)}
        decisions={decisions}
        analysis={analysis}
        onExport={exportJSON}
        onClear={clearDecisions}
      />
    </>
  );
}
