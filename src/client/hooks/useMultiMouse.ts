import { useEffect, useRef } from 'react';

export function useMultiMouse() {
  const destroyRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let statusEl: HTMLDivElement | null = null;

    const init = async () => {
      try {
        const { initCursors } = await import('@multi-mouse/client');

        const urlParams = new URLSearchParams(window.location.search);
        const serverUrl =
          urlParams.get('multimouse') ||
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'ws://localhost:3001'
            : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/cursors`);

        statusEl = document.createElement('div');
        statusEl.id = 'multimouse-status';
        statusEl.style.cssText = `
          position: fixed; bottom: 12px; right: 12px;
          padding: 6px 12px; border-radius: 6px; font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          z-index: 999998; transition: background 0.3s;
        `;

        const setStatus = (connected: boolean, label: string) => {
          if (!statusEl) return;
          statusEl.textContent = label;
          statusEl.style.background = connected ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)';
          statusEl.style.color = 'white';
        };

        document.body.appendChild(statusEl);
        setStatus(false, 'Cursors connecting…');

        const connectTimeout = setTimeout(() => {
          if (statusEl?.textContent === 'Cursors connecting…') {
            setStatus(false, 'Cursors timeout — check server');
          }
        }, 15_000);

        const destroy = initCursors({
          serverUrl,
          room: 'dice-room',
          onConnect: () => {
            clearTimeout(connectTimeout);
            setStatus(true, 'Cursors connected');
          },
          onDisconnect: (code?: number, reason?: string) => {
            setStatus(false, `Cursors disconnected (${code || '?'})`);
          },
          onError: () => {
            clearTimeout(connectTimeout);
            setStatus(false, 'Cursors connection failed');
          },
          onUserJoin: () => {},
          onUserLeave: () => {},
        });

        destroyRef.current = () => {
          clearTimeout(connectTimeout);
          destroy();
          statusEl?.remove();
          statusEl = null;
        };
      } catch (e) {
        console.warn('Multi-mouse init failed (non-critical):', e);
      }
    };

    init();

    const handleBeforeUnload = () => {
      destroyRef.current?.();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      destroyRef.current?.();
      destroyRef.current = null;
      initializedRef.current = false;
    };
  }, []);
}
