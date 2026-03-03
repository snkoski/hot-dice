import clsx from 'clsx';
import './shared.css';

/** Unicode dice faces: ⚀ (1) through ⚅ (6) */
const DICE_UNICODE: Record<number, string> = {
  1: '\u2680',
  2: '\u2681',
  3: '\u2682',
  4: '\u2683',
  5: '\u2684',
  6: '\u2685',
};

interface DiceFaceProps {
  value: number;
  selected?: boolean;
  farkle?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DiceFace({ value, selected, farkle, onClick, className }: DiceFaceProps) {
  const char = DICE_UNICODE[value] ?? value;
  return (
    <div
      className={clsx('die', { selected, farkle }, className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {char}
    </div>
  );
}
