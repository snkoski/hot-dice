import { Modal } from '../shared/Modal';
import type { StrategyStats } from '../../types/stats';
import './stats.css';

interface AllStatsModalProps {
  open: boolean;
  onClose: () => void;
  stats: StrategyStats[];
}

export function AllStatsModal({ open, onClose, stats }: AllStatsModalProps) {
  if (stats.length === 0 && open) return null;

  const sorted = [...stats].sort((a, b) => b.totalGames - a.totalGames);
  const totalGames = sorted.reduce((s, st) => s + st.totalGames, 0);
  const totalTurns = sorted.reduce((s, st) => s + st.totalTurns, 0);
  const totalSims = sorted.reduce((s, st) => s + st.gamesCount, 0);

  return (
    <Modal open={open} onClose={onClose} maxWidth="900px">
      <h2 style={{ color: '#667eea', marginBottom: 10 }}>📊 All Time Statistics</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Cumulative performance across all simulations. Total strategies tracked: {sorted.length}
      </p>

      <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Games Simulated</div>
            <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>{totalGames.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Turns Played</div>
            <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>{totalTurns.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Total Simulations Run</div>
            <div style={{ fontSize: '1.5em', fontWeight: 600, color: '#667eea' }}>{totalSims.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {sorted.map((st, index) => (
          <div key={st.hash} className="stats-strategy-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: '1.2em', fontWeight: 600, color: '#333' }}>{st.name}</div>
                {st.description && <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>{st.description}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85em', color: '#666' }}>Rank</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#667eea' }}>#{index + 1}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginTop: 15 }}>
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Win Rate</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600, color: (st.winRate ?? 0) >= 0.5 ? '#28a745' : '#333' }}>
                  {((st.winRate ?? 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Total Games</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{st.totalGames.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Total Wins</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#28a745' }}>{st.totalWins.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Avg Turns/Game</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{(st.avgTurnsPerGame ?? 0).toFixed(1)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Avg Farkles/Game</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{(st.avgFarklesPerGame ?? 0).toFixed(1)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 4 }}>Farkle Rate</div>
                <div style={{ fontSize: '1.3em', fontWeight: 600 }}>{((st.farkleRate ?? 0) * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e0e0e0', fontSize: '0.85em', color: '#666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>First seen: {new Date(st.firstSeen).toLocaleDateString()}</span>
                <span>Last seen: {new Date(st.lastSeen).toLocaleDateString()}</span>
                <span>Simulations: {st.gamesCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
