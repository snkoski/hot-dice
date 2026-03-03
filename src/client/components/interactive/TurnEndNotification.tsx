import { useEffect } from 'react';

interface TurnEndNotificationProps {
  type: 'bank' | 'farkle';
  points: number;
  newTotal: number;
  onDone: () => void;
}

export function TurnEndNotification({ type, points, newTotal, onDone }: TurnEndNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (type === 'bank') {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: '3em', marginBottom: 10 }}>🏦</div>
        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#28a745', marginBottom: 8 }}>Banked!</div>
        <div style={{ fontSize: '1.4em', color: '#333' }}>+{points} points</div>
        <div style={{ fontSize: '1em', color: '#666', marginTop: 8 }}>New total: {newTotal.toLocaleString()}</div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: '3em', marginBottom: 10 }}>💥</div>
      <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#dc3545', marginBottom: 8 }}>Farkle!</div>
      <div style={{ fontSize: '1.4em', color: '#333' }}>Lost {points} points</div>
      <div style={{ fontSize: '1em', color: '#999', marginTop: 8 }}>Turn over</div>
    </div>
  );
}
