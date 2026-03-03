import React, { useEffect } from 'react';

interface TurnEndNotificationProps {
  type: 'bank' | 'farkle';
  points: number;
  newTotal: number;
  onDismiss: () => void;
}

export function TurnEndNotification({ type, points, newTotal, onDismiss }: TurnEndNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isBank = type === 'bank';

  return (
    <div style={{
      textAlign: 'center',
      padding: '20px',
      background: isBank ? '#f0fff4' : '#fff5f5',
      border: `3px solid ${isBank ? '#28a745' : '#ff6b6b'}`,
      borderRadius: '12px',
      margin: '20px 0',
      animation: 'fadeIn 0.3s ease'
    }}>
      <h3 style={{ color: isBank ? '#28a745' : '#ff6b6b', margin: '0 0 10px 0', fontSize: '1.8em' }}>
        {isBank ? '💰 Banked Points!' : '🔥 FARKLE!'}
      </h3>
      <div style={{ fontSize: '1.2em', color: '#555' }}>
        {isBank ? `Banked ${points} points for this turn.` : 'Lost all points for this turn!'}
      </div>
      <div style={{ fontSize: '1.1em', marginTop: '10px', fontWeight: 'bold' }}>
        New Total: {newTotal} pts
      </div>
    </div>
  );
}
