import React from 'react';
import './shared.css';

interface ProgressBarProps {
  percent: number;
  text?: string;
}

export function ProgressBar({ percent, text }: ProgressBarProps) {
  return (
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      >
        {text || `${Math.round(percent)}%`}
      </div>
    </div>
  );
}
