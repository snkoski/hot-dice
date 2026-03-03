import { type ReactNode } from 'react';
import clsx from 'clsx';
import './shared.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  maxWidth?: number;
}

export function Modal({ isOpen, onClose, title, children, className, maxWidth = 700 }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={clsx('modal', className)}
        onClick={(e) => e.stopPropagation()}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <button className="modal-close" onClick={onClose} type="button" aria-label="Close">
          &times;
        </button>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
