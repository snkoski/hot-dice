import React from 'react';
import { clsx } from 'clsx';
import './shared.css';

interface DiceFaceProps {
  value: number;
  selected?: boolean;
  farkle?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'normal' | 'large';
}

const diceChars = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceFace({ value, selected, farkle, onClick, disabled, size = 'normal' }: DiceFaceProps) {
  const isLarge = size === 'large';
  return (
    <button
      type="button"
      className={clsx(
        isLarge ? 'die-btn' : 'die',
        { selected, farkle, 'non-scoring': disabled }
      )}
      onClick={onClick}
      disabled={disabled}
      data-index={value}
    >
      {diceChars[value - 1] || '?'}
    </button>
  );
}
