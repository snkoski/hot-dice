import { useState, useCallback } from 'react';
import { AllStatsModal } from './AllStatsModal';
import { PlayStyleModal } from './PlayStyleModal';
import { useStrategyStats } from '../../hooks/useStrategyStats';
import { useHumanDecisions } from '../../hooks/useHumanDecisions';
import type { StrategyStats } from '../../types/stats';
import type { HumanDecisionLocalRecord } from '../../hooks/useHumanDecisions';
import './stats.css';

export function HistoricalStatsPanel() {
  const { loadAllDerived, clearAll: clearStats } = useStrategyStats();
  const { loadAll: loadDecisions, analyze, clearAll: clearDecisions, exportJSON } = useHumanDecisions();

  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<StrategyStats[]>([]);
  const [playStyleOpen, setPlayStyleOpen] = useState(false);
  const [decisions, setDecisions] = useState<HumanDecisionLocalRecord[]>([]);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyze>>(null);

  const viewAllStats = useCallback(() => {
    const data = loadAllDerived();
    if (data.length === 0) {
      alert('No statistics recorded yet. Run some simulations first!');
      return;
    }
    setStatsData(data);
    setStatsOpen(true);
  }, [loadAllDerived]);

  const handleClearStats = useCallback(() => {
    const data = loadAllDerived();
    if (data.length === 0) {
      alert('No statistics to clear.');
      return;
    }
    if (confirm(`Are you sure you want to clear all accumulated statistics?\n\nThis will delete data for ${data.length} strategies and cannot be undone.`)) {
      clearStats();
      alert('All statistics have been cleared!');
      setStatsOpen(false);
    }
  }, [loadAllDerived, clearStats]);

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

  return (
    <>
      <div className="card">
        <h2 className="section-title">📊 Historical Data</h2>
        <p style={{ color: '#666', marginBottom: 20 }}>
          View cumulative statistics for all strategies you've tested across all sessions.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={viewAllStats} style={{ padding: '10px 24px', background: '#1a73e8' }}>
            📊 View All Stats
          </button>
          <button onClick={handleClearStats} style={{ padding: '10px 24px', background: '#dc3545' }}>
            🗑️ Clear History
          </button>
        </div>
      </div>

      <AllStatsModal open={statsOpen} onClose={() => setStatsOpen(false)} stats={statsData} />
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
