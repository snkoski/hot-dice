import React from 'react';
import { Modal } from '../shared/Modal';
import { calculateDerivedStats } from '../../lib/strategyHash';

interface AllStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Record<string, any>;
}

export function AllStatsModal({ isOpen, onClose, stats }: AllStatsModalProps) {
  const statsArray = Object.values(stats).map(calculateDerivedStats);
  statsArray.sort((a, b) => b.totalGames - a.totalGames);

  const totalGames = statsArray.reduce((sum, s) => sum + s.totalGames, 0);
  const totalTurns = statsArray.reduce((sum, s) => sum + s.totalTurns, 0);
  const totalSims = statsArray.reduce((sum, s) => sum + s.gamesCount, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📊 All Time Statistics" maxWidth="900px">
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Cumulative performance across all simulations. Total strategies tracked: {statsArray.length}
      </p>

      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Games Simulated</div>
            <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>
              {totalGames.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Turns Played</div>
            <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>
              {totalTurns.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Simulations Run</div>
            <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>
              {totalSims.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {statsArray.map((s, idx) => (
          <div key={s.hash} style={{ background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', padding: '20px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '1.2em', fontWeight: 600, color: '#333' }}>{s.name}</div>
                {s.description && <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>{s.description}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85em', color: '#666' }}>Rank</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#667eea' }}>#{idx + 1}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>Win Rate</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600, color: (s.winRate || 0) >= 0.5 ? '#28a745' : '#333' }}>
                  {((s.winRate || 0) * 100).toFixed(1)}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>Total Games</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{s.totalGames.toLocaleString()}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>Total Wins</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#28a745' }}>{s.totalWins.toLocaleString()}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>Avg Turns/Game</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{(s.avgTurnsPerGame || 0).toFixed(1)}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>Avg Farkles/Game</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{(s.avgFarklesPerGame || 0).toFixed(1)}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>Farkle Rate</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{((s.farkleRate || 0) * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0', fontSize: '0.85em', color: '#666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>First seen: {new Date(s.firstSeen).toLocaleDateString()}</span>
                <span>Last seen: {new Date(s.lastSeen).toLocaleDateString()}</span>
                <span>Simulations: {s.gamesCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
