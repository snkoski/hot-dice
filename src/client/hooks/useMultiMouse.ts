import { useEffect, useRef, useState } from 'react';
import { initCursors } from '@multi-mouse/client';

function getServerUrl(): string {
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const override = urlParams.get('multimouse');
  if (override) return override;
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:3001';
  }
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/cursors`;
}

export function useMultiMouse() {
  const [status, setStatus] = useState<{ connected: boolean; label: string }>({
    connected: false,
    label: 'Cursors connecting…',
  });
  const destroyRef = useRef<(() => void) | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const serverUrl = getServerUrl();
    console.log('[MultiMouse] Connecting to:', serverUrl);

    connectTimeoutRef.current = setTimeout(() => {
      setStatus((s) => (s.label === 'Cursors connecting…' ? { connected: false, label: 'Cursors timeout — check server' } : s));
    }, 15_000);

    destroyRef.current = initCursors({
      serverUrl,
      room: 'dice-room',
      onConnect: () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setStatus({ connected: true, label: 'Cursors connected' });
        console.log('MultiMouse connected to', serverUrl);
      },
      onDisconnect: (code, reason) => {
        setStatus({ connected: false, label: `Cursors disconnected (${code ?? '?'})` });
        console.log('MultiMouse disconnected — reconnecting...', { code, reason });
      },
      onError: () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setStatus({ connected: false, label: 'Cursors connection failed' });
        console.warn('MultiMouse WebSocket error');
      },
      onUserJoin: () => console.log('User joined'),
      onUserLeave: () => console.log('User left'),
    });

    return () => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (destroyRef.current) {
        destroyRef.current();
        destroyRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (destroyRef.current) destroyRef.current();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return status;
}
