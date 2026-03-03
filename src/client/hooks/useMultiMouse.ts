import { useEffect, useState, useRef } from 'react';
import { initCursors } from '@multi-mouse/client';

export function useMultiMouse() {
  const [status, setStatus] = useState<{ connected: boolean; label: string }>({
    connected: false,
    label: 'Cursors connecting…'
  });
  
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const serverUrl =
      urlParams.get('multimouse') ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'ws://localhost:3001'
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/cursors`);

    let connectTimeout = setTimeout(() => {
      setStatus(prev => prev.label === 'Cursors connecting…' ? { connected: false, label: 'Cursors timeout — check server' } : prev);
    }, 15000);

    const destroyCursors = initCursors({
      serverUrl,
      room: 'dice-room',

      onConnect: () => {
        clearTimeout(connectTimeout);
        setStatus({ connected: true, label: 'Cursors connected' });
      },
      onDisconnect: (code: any, reason: any) => {
        setStatus({ connected: false, label: `Cursors disconnected (${code || '?'})` });
      },
      onError: () => {
        clearTimeout(connectTimeout);
        setStatus({ connected: false, label: 'Cursors connection failed' });
      }
    });

    const handleBeforeUnload = () => {
      destroyCursors();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(connectTimeout);
      destroyCursors();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      initializedRef.current = false;
    };
  }, []);

  return status;
}
