import { ProgressBar } from '../shared/ProgressBar';
import type { SimulationProgress as ProgressType } from '../../types/simulator';

interface SimulationProgressProps {
  progress: ProgressType | null;
}

export function SimulationProgress({ progress }: SimulationProgressProps) {
  if (!progress) return null;

  const remaining = Math.round(progress.estimatedTimeRemaining / 1000);

  return (
    <div className="card">
      <h2 className="section-title">Running Simulation...</h2>
      <ProgressBar percent={progress.percentComplete} />
      <p style={{ textAlign: 'center', color: '#666' }}>
        {progress.gamesCompleted} / {progress.totalGames} games completed (~{remaining}s remaining)
      </p>
    </div>
  );
}
