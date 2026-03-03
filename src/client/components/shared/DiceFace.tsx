import { getDiceFace } from '../../lib/formatters';

interface DiceFaceProps {
  value: number;
  className?: string;
}

export function DiceFace({ value, className = '' }: DiceFaceProps) {
  return <span className={className}>{getDiceFace(value)}</span>;
}
