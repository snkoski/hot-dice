import { useState, useCallback, useRef, useEffect } from 'react';
import type { SimulationProgress } from '../types/simulator';

export interface SimulationRunConfig {
  gameCount: number;
  strategyIds: string[];
  customStrategies: Array<{ id: string; name: string; description: string; type: string; threshold?: number; minDice?: number }>;
  targetScore: number;
  minimumScoreToBoard: number;
  scoringRules: {
    enableStraight: boolean;
    enableThreePairs: boolean;
    enableFourOfKindBonus: boolean;
    enableFiveOfKindBonus: boolean;
    enableSixOfKindBonus: boolean;
    enableSingleOnes: boolean;
    enableSingleFives: boolean;
    minimumScoreToBoard: number;
  };
}

export interface SimulationCompleteData {
  strategyStats: Array<{
    strategyId: string;
    strategyName: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    winRate: number;
    tieRate: number;
    averageTurnsPerGame: number;
    averageRollsPerGame: number;
    averagePointsPerTurn: number;
    averagePointsWhenScoring: number;
    averagePointsPerTurnIncludingFarkles: number;
    farkleRate: number;
    averageFarklesPerGame: number;
    averageFarkleDiceCount?: number;
    luckScore?: number;
    totalExpectedFarkles?: number;
    totalActualFarkles?: number;
    winStats?: Record<string, number>;
    tieStats?: Record<string, number>;
    lossStats?: Record<string, number>;
  }>;
}

export function useSimulationWebSocket() {
  const [progress, setProgress] = useState<SimulationProgress | null>(null);
  const [results, setResults] = useState<SimulationCompleteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const runIdRef = useRef(0);

  const run = useCallback((config: SimulationRunConfig) => {
    runIdRef.current += 1;
    const currentRunId = runIdRef.current;

    setProgress(null);
    setResults(null);
    setError(null);
    setIsRunning(true);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/simulate/stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (runIdRef.current !== currentRunId) return;
      ws.send(
        JSON.stringify({
          gameCount: config.gameCount,
          strategyIds: config.strategyIds,
          strategies: config.customStrategies,
          targetScore: config.targetScore,
          minimumScoreToBoard: config.minimumScoreToBoard,
          scoringRules: config.scoringRules,
        })
      );
    };

    ws.onmessage = (event) => {
      if (runIdRef.current !== currentRunId) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'progress') {
          setProgress(message.data);
        } else if (message.type === 'complete') {
          setResults(message.data);
          setProgress(null);
          setIsRunning(false);
          ws.close();
        } else if (message.type === 'error') {
          setError(message.error ?? 'Unknown error');
          setProgress(null);
          setIsRunning(false);
          ws.close();
        }
      } catch (e) {
        setError('Failed to parse response');
        setIsRunning(false);
      }
    };

    ws.onerror = () => {
      if (runIdRef.current !== currentRunId) return;
      setError('Connection error');
      setIsRunning(false);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { run, progress, results, error, isRunning };
}
