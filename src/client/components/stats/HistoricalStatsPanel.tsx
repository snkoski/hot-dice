import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { useStrategyStats } from '../../hooks/useStrategyStats';
import { useHumanDecisions } from '../../hooks/useHumanDecisions';
import { calculateDerivedStats } from '../../lib/strategyHash';
import type { StrategyStats } from '../../types/stats';

export function HistoricalStatsPanel() {
  const [allStatsModalOpen, setAllStatsModalOpen] = useState(false);
  const [playStyleModalOpen, setPlayStyleModalOpen] = useState(false);

  const { stats, clearAll: clearStrategyStats } = useStrategyStats();
  const { decisions, analyzePlayStyle, clearAll: clearHumanDecisions, exportData } = useHumanDecisions();

  const statsArray = Object.values(stats)
    .map((s) => calculateDerivedStats(s))
    .sort((a, b) => b.totalGames - a.totalGames);

  const playStyleAnalysis = analyzePlayStyle();

  const handleViewAllStats = () => {
    if (statsArray.length === 0) {
      alert('No statistics recorded yet. Run some simulations first!');
      return;
    }
    setAllStatsModalOpen(true);
  };

  const handleClearAllStats = () => {
    if (statsArray.length === 0) {
      alert('No statistics to clear.');
      return;
    }
    if (confirm('Clear all strategy statistics? This cannot be undone.')) {
      clearStrategyStats();
      setAllStatsModalOpen(false);
    }
  };

  const handleViewPlayStyle = () => {
    if (decisions.length === 0) {
      alert('No decision history yet. Play some interactive games first!');
      return;
    }
    setPlayStyleModalOpen(true);
  };

  const handleClearHumanDecisions = () => {
    if (confirm('Clear all human decision history? This cannot be undone.')) {
      clearHumanDecisions();
      setPlayStyleModalOpen(false);
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">📊 Historical Data</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>
        View cumulative statistics for all strategies you've tested across all sessions.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleViewAllStats} style={{ padding: '10px 24px', background: '#1a73e8', width: 'auto' }}>
          📊 View All Stats
        </button>
        <button onClick={handleClearAllStats} style={{ padding: '10px 24px', background: '#dc3545', width: 'auto' }}>
          🗑️ Clear History
        </button>
        <button onClick={handleViewPlayStyle} style={{ padding: '10px 24px', background: '#667eea', width: 'auto' }}>
          📊 View Your Play Style
        </button>
      </div>

      <Modal isOpen={allStatsModalOpen} onClose={() => setAllStatsModalOpen(false)} maxWidth={900}>
        <h2 style={{ color: '#667eea', marginBottom: 10 }}>📊 All Time Statistics</h2>
        <p style={{ color: '#666', marginBottom: 20 }}>
          Cumulative performance across all simulations. Total strategies tracked: {statsArray.length}
        </p>
        <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>Total Games Simulated</div>
              <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>
                {statsArray.reduce((sum, s) => sum + s.totalGames, 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>Total Turns Played</div>
              <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>
                {statsArray.reduce((sum, s) => sum + s.totalTurns, 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>Total Simulations Run</div>
              <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>
                {statsArray.reduce((sum, s) => sum + s.gamesCount, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {statsArray.map((s, index) => (
            <StrategyStatsCard key={s.hash} stats={s} rank={index + 1} />
          ))}
        </div>
      </Modal>

      <Modal isOpen={playStyleModalOpen} onClose={() => setPlayStyleModalOpen(false)} maxWidth={900}>
        <h2 style={{ marginBottom: 20, color: '#667eea' }}>📊 Your Play Style Analysis</h2>
        {playStyleAnalysis && (
          <>
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: 20,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <h3 style={{ marginTop: 0, color: 'white' }}>Overall Statistics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15 }}>
                <div>
                  <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Total Decisions</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 600 }}>{playStyleAnalysis.totalDecisions}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Continue Rate</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 600 }}>
                    {(playStyleAnalysis.continueRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Avg Risk When Continuing</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 600 }}>
                    {(playStyleAnalysis.avgRiskWhenContinuing * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Avg Points When Stopping</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 600 }}>
                    {playStyleAnalysis.avgPointsWhenStopping.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Recent Decisions</h4>
              {decisions.slice(-10).reverse().map((d) => (
                <div
                  key={d.id}
                  style={{
                    background: '#f8f9fa',
                    padding: 12,
                    borderRadius: 6,
                    marginBottom: 8,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                  }}
                >
                  <div><strong>Points:</strong> {d.turnPoints}</div>
                  <div><strong>Dice:</strong> {d.diceRemaining}</div>
                  <div><strong>Risk:</strong> {(d.farkleRisk * 100).toFixed(0)}%</div>
                  <div><strong>Decision:</strong> {d.continue ? 'Continue' : 'Bank'}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={exportData} style={{ flex: 1, padding: 12, background: '#667eea' }}>
                📥 Export Data (JSON)
              </button>
              <button onClick={handleClearHumanDecisions} style={{ flex: 1, padding: 12, background: '#dc3545' }}>
                🗑️ Clear History
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function StrategyStatsCard({ stats, rank }: { stats: StrategyStats; rank: number }) {
  return (
    <div style={{ background: 'white', border: '2px solid #e0e0e0', borderRadius: 8, padding: 20, marginBottom: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '1.2em', fontWeight: 600, color: '#333' }}>{stats.name}</div>
          {stats.description && (
            <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>{stats.description}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85em', color: '#666' }}>Rank</div>
          <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#667eea' }}>#{rank}</div>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 15,
          marginTop: 15,
        }}
      >
        <div>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Win Rate</div>
          <div
            style={{
              fontSize: '1.3em',
              fontWeight: 600,
              color: (stats.winRate ?? 0) >= 0.5 ? '#28a745' : '#333',
            }}
          >
            {((stats.winRate ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Total Games</div>
          <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{stats.totalGames.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Total Wins</div>
          <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#28a745' }}>
            {stats.totalWins.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Avg Turns/Game</div>
          <div style={{ fontSize: '1.3em', fontWeight: 600 }}>
            {(stats.avgTurnsPerGame ?? 0).toFixed(1)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Avg Farkles/Game</div>
          <div style={{ fontSize: '1.3em', fontWeight: 600 }}>
            {(stats.avgFarklesPerGame ?? 0).toFixed(1)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Farkle Rate</div>
          <div style={{ fontSize: '1.3em', fontWeight: 600 }}>
            {((stats.farkleRate ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #e0e0e0',
          fontSize: '0.85em',
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>First seen: {new Date(stats.firstSeen).toLocaleDateString()}</span>
        <span>Last seen: {new Date(stats.lastSeen).toLocaleDateString()}</span>
        <span>Simulations: {stats.gamesCount}</span>
      </div>
    </div>
  );
}
