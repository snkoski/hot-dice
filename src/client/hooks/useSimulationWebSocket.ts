import { useRef, useCallback } from 'react';
import type { SimulationProgress, SimulationResults } from '../types/simulator';

interface SimulationRequest {
  gameCount: number;
  strategyIds: string[];
  strategies: any[];
  targetScore: number;
  minimumScoreToBoard: number;
  scoringRules: any;
}

interface UseSimulationWebSocketReturn {
  start: (req: SimulationRequest) => void;
  cancel: () => void;
}

export function useSimulationWebSocket(
  onProgress: (p: SimulationProgress) => void,
  onComplete: (r: SimulationResults) => void,
  onError: (msg: string) => void,
): UseSimulationWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const runIdRef = useRef(0);

  const cancel = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const start = useCallback(
    (req: SimulationRequest) => {
      cancel();
      const currentRunId = ++runIdRef.current;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/simulate/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify(req));
      };

      ws.onmessage = (event) => {
        if (runIdRef.current !== currentRunId) return;
        const message = JSON.parse(event.data);
        if (message.type === 'progress') {
          onProgress(message.data);
        } else if (message.type === 'complete') {
          onComplete(message.data);
          ws.close();
        } else if (message.type === 'error') {
          onError(message.error);
          ws.close();
        }
      };

      ws.onerror = () => {
        if (runIdRef.current !== currentRunId) return;
        onError('Connection error. Please try again.');
      };
    },
    [cancel, onProgress, onComplete, onError],
  );

  return { start, cancel };
}
