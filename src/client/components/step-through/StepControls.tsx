import React from 'react';

interface StepControlsProps {
  currentIndex: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  isLoading: boolean;
  stepDescription: string;
}

export function StepControls({ currentIndex, totalSteps, onPrev, onNext, isLoading, stepDescription }: StepControlsProps) {
  return (
    <div className="step-controls" style={{ marginBottom: '20px' }}>
      <button onClick={onPrev} disabled={currentIndex === 0} style={{ background: '#6c757d' }}>
        ◀️ Previous
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        <div style={{ fontWeight: 600, color: '#667eea', fontSize: '1.1em' }}>
          Step {currentIndex + 1} {totalSteps > 0 ? `of ${Math.max(currentIndex + 1, totalSteps)}` : ''}
        </div>
        <div style={{ fontSize: '0.85em', color: '#666' }}>{stepDescription}</div>
      </div>
      <button onClick={onNext} disabled={isLoading} style={{ background: '#28a745' }}>
        {isLoading ? 'Loading...' : 'Next ▶️'}
      </button>
    </div>
  );
}
