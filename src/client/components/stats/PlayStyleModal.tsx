import React from 'react';
import { Modal } from '../shared/Modal';

interface PlayStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisions: any[];
  onClear: () => void;
}

export function PlayStyleModal({ isOpen, onClose, decisions, onClear }: PlayStyleModalProps) {
  if (!isOpen) return null;

  const analyzeHumanPlayStyle = () => {
    if (decisions.length === 0) return null;

    const continueDecisions = decisions.filter(d => d.continue);
    const stopDecisions = decisions.filter(d => !d.continue);

    return {
      totalDecisions: decisions.length,
      continueCount: continueDecisions.length,
      stopCount: stopDecisions.length,
      continueRate: continueDecisions.length / decisions.length,

      avgRiskWhenContinuing: continueDecisions.length > 0
        ? continueDecisions.reduce((sum, d) => sum + (d.farkleRisk || 0), 0) / continueDecisions.length
        : 0,
      avgRiskWhenStopping: stopDecisions.length > 0
        ? stopDecisions.reduce((sum, d) => sum + (d.farkleRisk || 0), 0) / stopDecisions.length
        : 0,

      avgPointsWhenStopping: stopDecisions.length > 0
        ? stopDecisions.reduce((sum, d) => sum + (d.turnPoints || 0), 0) / stopDecisions.length
        : 0,

      avgDiceWhenContinuing: continueDecisions.length > 0
        ? continueDecisions.reduce((sum, d) => sum + (d.diceRemaining || 0), 0) / continueDecisions.length
        : 0
    };
  };

  const analysis = analyzeHumanPlayStyle();

  const handleExport = () => {
    const dataStr = JSON.stringify(decisions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hot-dice-decisions-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📊 Your Play Style Analysis" maxWidth="700px">
      {!analysis ? (
        <p>No decision history yet. Play some interactive games first!</p>
      ) : (
        <>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, color: 'white' }}>Overall Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
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
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {decisions.slice(-20).reverse().map((d, i) => (
              <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '6px', marginBottom: '10px', borderLeft: `4px solid ${d.continue ? '#667eea' : '#28a745'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: d.continue ? '#667eea' : '#28a745' }}>
                    {d.continue ? '🎲 Continued Rolling' : '⏸ Stopped & Banked'}
                  </strong>
                  <span style={{ color: '#999', fontSize: '0.85em' }}>{new Date(d.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.9em', color: '#666', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div><strong>Turn:</strong> {d.turnPoints} pts</div>
                  <div><strong>Dice:</strong> {d.diceRemaining}</div>
                  <div><strong>Risk:</strong> {((d.farkleRisk || 0) * 100).toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={handleExport} style={{ flex: 1, padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              📥 Export Data (JSON)
            </button>
            <button onClick={onClear} style={{ flex: 1, padding: '12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              🗑️ Clear History
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
