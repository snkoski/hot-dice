import { useMultiMouse } from '../hooks/useMultiMouse';

export function MultiMouseStatus() {
  const { connected, label } = useMultiMouse();

  return (
    <div
      id="multimouse-status"
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        zIndex: 999998,
        transition: 'background 0.3s',
        background: connected ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)',
        color: 'white',
      }}
    >
      {label}
    </div>
  );
}
