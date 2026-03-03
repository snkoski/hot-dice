import './shared.css';

interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  const displayLabel = label ?? `${Math.round(percent)}%`;
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}>
        {displayLabel}
      </div>
    </div>
  );
}
