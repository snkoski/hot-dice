import React from 'react';
import { ProgressBar } from '../shared/ProgressBar';

interface SimulationProgressProps {
  progress: number;
  text: string;
}

export function SimulationProgress({ progress, text }: SimulationProgressProps) {
  return (
    <div className="card">
      <h2 className="section-title">Running Simulation...</h2>
      <ProgressBar percent={progress} />
      <p style={{ textAlign: 'center', color: '#666' }}>{text}</p>
    </div>
  );
}
