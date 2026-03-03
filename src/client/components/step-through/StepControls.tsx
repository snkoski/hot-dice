import './stepThrough.css';

interface StepControlsProps {
  currentIndex: number;
  totalSteps: number;
  stepDescription: string;
  isGameOver: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function StepControls({
  currentIndex,
  totalSteps,
  stepDescription,
  isGameOver,
  onPrevious,
  onNext,
}: StepControlsProps) {
  return (
    <div className="step-controls" style={{ marginBottom: 20 }}>
      <button
        onClick={onPrevious}
        disabled={currentIndex === 0}
        style={{ background: '#6c757d', padding: '15px 40px', fontSize: '1.1em', width: 'auto', minWidth: 140 }}
      >
        ◀️ Previous
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <div style={{ fontWeight: 600, color: '#667eea', fontSize: '1.1em' }}>
          Step {currentIndex + 1} of {totalSteps}
        </div>
        <div style={{ fontSize: '0.85em', color: '#666' }}>{stepDescription}</div>
      </div>
      <button
        onClick={onNext}
        disabled={isGameOver}
        style={{
          background: isGameOver ? '#6c757d' : '#28a745',
          padding: '15px 40px', fontSize: '1.1em', width: 'auto', minWidth: 140,
        }}
      >
        {isGameOver ? '🏆 Game Complete' : 'Next ▶️'}
      </button>
    </div>
  );
}
