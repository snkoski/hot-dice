import type { ReactNode } from 'react';
import './shared.css';

interface StatRowProps {
  label: string;
  value: string | number | ReactNode;
}

export function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
