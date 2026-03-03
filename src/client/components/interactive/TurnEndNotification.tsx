import { useEffect } from 'react';
import type { InteractiveGameStep } from '../../types/stepGame';

interface TurnEndNotificationProps {
  type: 'bank' | 'farkle';
  points: number;
  newTotal?: number;
  skippedSteps?: InteractiveGameStep[];
  onDone: (skippedSteps?: InteractiveGameStep[]) => void;
}

export function TurnEndNotification({
  type,
  points,
  newTotal,
  skippedSteps,
  onDone,
}: TurnEndNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone(skippedSteps);
    }, 2200);
    return () => clearTimeout(timer);
  }, [onDone, skippedSteps]);

  return (
    <div className="turn-end-notification">
      {type === 'bank' ? (
        <>
          <div className="turn-end-icon">🏦</div>
          <div className="turn-end-title">Banked!</div>
          <div className="turn-end-points">+{points} points</div>
          {newTotal != null && (
            <div className="turn-end-total">New total: {newTotal.toLocaleString()}</div>
          )}
        </>
      ) : (
        <>
          <div className="turn-end-icon">💥</div>
          <div className="turn-end-title farkle">Farkle!</div>
          <div className="turn-end-points">Lost {points} points</div>
          <div className="turn-end-sub">Turn over</div>
        </>
      )}
    </div>
  );
}
