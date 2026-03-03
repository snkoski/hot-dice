import { ProgressBar } from '../shared/ProgressBar';
import './simulation.css';

interface SimulationProgressProps {
  progress: { gamesCompleted: number; totalGames: number; percentComplete: number; estimatedTimeRemaining: number };
}

export function SimulationProgressDisplay({ progress }: SimulationProgressProps) {
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
