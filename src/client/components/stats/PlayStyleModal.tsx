import { Modal } from '../shared/Modal';
import type { HumanDecisionLocalRecord } from '../../hooks/useHumanDecisions';

interface PlayStyleModalProps {
  open: boolean;
  onClose: () => void;
  decisions: HumanDecisionLocalRecord[];
  analysis: {
    totalDecisions: number;
    continueCount: number;
    stopCount: number;
    continueRate: number;
    avgRiskWhenContinuing: number;
    avgRiskWhenStopping: number;
    avgPointsWhenStopping: number;
    avgDiceWhenContinuing: number;
  } | null;
  onExport: () => void;
  onClear: () => void;
}

export function PlayStyleModal({ open, onClose, decisions, analysis, onExport, onClear }: PlayStyleModalProps) {
  if (!analysis) return null;

  const recent = decisions.slice(-20).reverse();

  return (
    <Modal open={open} onClose={onClose} maxWidth="900px">
      <h2 style={{ marginBottom: 20, color: '#667eea' }}>📊 Your Play Style Analysis</h2>

      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', padding: 20, borderRadius: 8, marginBottom: 20,
      }}>
        <h3 style={{ marginTop: 0, color: 'white' }}>Overall Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15 }}>
          <div>
            <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Total Decisions</div>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{analysis.totalDecisions}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Continue Rate</div>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{(analysis.continueRate * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Risk Tolerance</div>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{(analysis.avgRiskWhenContinuing * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Avg Bank Amount</div>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{Math.round(analysis.avgPointsWhenStopping)}</div>
          </div>
        </div>
      </div>

      <h3 style={{ color: '#667eea' }}>Recent Decisions (Last 20)</h3>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {recent.map((d) => (
          <div
            key={d.id}
            style={{
              background: 'white', padding: 15, borderRadius: 6, marginBottom: 10,
              borderLeft: `4px solid ${d.continue ? '#667eea' : '#28a745'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ color: d.continue ? '#667eea' : '#28a745' }}>
                {d.continue ? '🎲 Continued Rolling' : '⏸ Stopped & Banked'}
              </strong>
              <span style={{ color: '#999', fontSize: '0.85em' }}>{new Date(d.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: '0.9em', color: '#666', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div><strong>Turn:</strong> {d.turnPoints} pts</div>
              <div><strong>Dice:</strong> {d.diceRemaining}</div>
              <div><strong>Risk:</strong> {(d.farkleRisk * 100).toFixed(0)}%</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          onClick={onExport}
          style={{
            flex: 1, padding: 12, background: '#667eea', color: 'white',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          📥 Export Data (JSON)
        </button>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to clear all decision history? This cannot be undone.')) {
              onClear();
              onClose();
            }
          }}
          style={{
            flex: 1, padding: 12, background: '#dc3545', color: 'white',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
          }}
        >
          🗑️ Clear History
        </button>
      </div>
    </Modal>
  );
}
