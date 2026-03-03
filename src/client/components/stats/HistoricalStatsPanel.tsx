import React, { useState } from 'react';
import { AllStatsModal } from './AllStatsModal';
import { PlayStyleModal } from './PlayStyleModal';
import { useStrategyStats } from '../../hooks/useStrategyStats';
import { useHumanDecisions } from '../../hooks/useHumanDecisions';

export function HistoricalStatsPanel() {
  const { stats, clearStats } = useStrategyStats();
  const { decisions, clearDecisions } = useHumanDecisions();

  const [allStatsOpen, setAllStatsOpen] = useState(false);
  const [playStyleOpen, setPlayStyleOpen] = useState(false);

  const handleClearStats = () => {
    if (Object.keys(stats).length === 0) {
      alert('No statistics to clear.');
      return;
    }
    if (window.confirm('Are you sure you want to clear all simulation statistics? This cannot be undone.')) {
      clearStats();
    }
  };

  const handleClearDecisions = () => {
    if (decisions.length === 0) {
      alert('No decision history to clear.');
      return;
    }
    if (window.confirm('Are you sure you want to clear all decision history? This cannot be undone.')) {
      clearDecisions();
      setPlayStyleOpen(false);
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">📊 Historical Data</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        View cumulative statistics for all strategies you've tested across all sessions.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setAllStatsOpen(true)} style={{ padding: '10px 24px', background: '#1a73e8', width: 'auto' }}>
          📊 View All Stats
        </button>
        <button onClick={() => setPlayStyleOpen(true)} style={{ padding: '10px 24px', background: '#667eea', width: 'auto' }}>
          👤 View Your Play Style
        </button>
        <button onClick={handleClearStats} style={{ padding: '10px 24px', background: '#dc3545', width: 'auto' }}>
          🗑️ Clear History
        </button>
      </div>

      <AllStatsModal 
        isOpen={allStatsOpen} 
        onClose={() => setAllStatsOpen(false)} 
        stats={stats} 
      />

      <PlayStyleModal 
        isOpen={playStyleOpen} 
        onClose={() => setPlayStyleOpen(false)} 
        decisions={decisions} 
        onClear={handleClearDecisions}
      />
    </div>
  );
}
