import { useState, useRef, useCallback, useEffect } from 'react';

export function useSimulationWebSocket() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const currentRunIdRef = useRef<string | null>(null);

  const startSimulation = useCallback((payload: any) => {
    // Close existing WS if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const runId = Date.now().toString();
    currentRunIdRef.current = runId;

    setIsRunning(true);
    setProgress(0);
    setProgressText('Starting simulation...');
    setResults(null);
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/simulate/stream`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (currentRunIdRef.current !== runId) return;
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      if (currentRunIdRef.current !== runId) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'progress') {
          setProgress(msg.data.progress);
          setProgressText(`Completed ${msg.data.completedGames} / ${msg.data.totalGames} games`);
        } else if (msg.type === 'complete') {
          setResults(msg.data);
          setIsRunning(false);
          setProgress(100);
          setProgressText('Simulation complete');
          ws.close();
        } else if (msg.type === 'error') {
          setError(msg.error || 'Simulation failed');
          setIsRunning(false);
          ws.close();
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onerror = (e) => {
      if (currentRunIdRef.current !== runId) return;
      console.error('WebSocket error:', e);
      setError('Connection lost');
      setIsRunning(false);
    };

    ws.onclose = () => {
      if (currentRunIdRef.current === runId) {
        setIsRunning(false);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { isRunning, progress, progressText, results, error, startSimulation };
}
