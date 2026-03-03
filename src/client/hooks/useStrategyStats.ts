import { useCallback } from 'react';
import type { StrategyStats } from '../types/stats';
import { createInitialStats, updateStrategyStats as updateStats, calculateDerivedStats } from '../lib/strategyHash';

const STATS_STORAGE_KEY = 'hot-dice-strategy-stats';

interface VersionedData {
  version: number;
  data: Record<string, StrategyStats>;
}

function loadRaw(): Record<string, StrategyStats> {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.version === 'number') {
      return (parsed as VersionedData).data;
    }
    return parsed as Record<string, StrategyStats>;
  } catch {
    return {};
  }
}

function save(data: Record<string, StrategyStats>) {
  const envelope: VersionedData = { version: 1, data };
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(envelope));
}

export function useStrategyStats() {
  const loadAll = useCallback((): Record<string, StrategyStats> => loadRaw(), []);

  const loadAllDerived = useCallback((): StrategyStats[] => {
    return Object.values(loadRaw()).map(calculateDerivedStats);
  }, []);

  const getOrCreate = useCallback(
    (hash: string, name: string, description: string): StrategyStats => {
      const all = loadRaw();
      if (!all[hash]) {
        all[hash] = createInitialStats(hash, name, description);
        save(all);
      }
      return all[hash];
    },
    [],
  );

  const update = useCallback(
    (
      hash: string,
      results: {
        name?: string;
        gamesPlayed: number;
        wins: number;
        totalTurns: number;
        totalRolls: number;
        totalFarkles: number;
        totalPoints: number;
        totalSuccessfulTurns: number;
        totalFarkleDice?: number;
        totalFarkleEvents?: number;
        totalExpectedFarkles?: number;
        totalActualFarkles?: number;
      },
    ): StrategyStats => {
      const all = loadRaw();
      const existing = all[hash] ?? createInitialStats(hash, results.name ?? 'Unknown', '');
      if (results.name) existing.name = results.name;
      all[hash] = updateStats(existing, results);
      save(all);
      return calculateDerivedStats(all[hash]);
    },
    [],
  );

  const clearAll = useCallback(() => {
    localStorage.removeItem(STATS_STORAGE_KEY);
  }, []);

  return { loadAll, loadAllDerived, getOrCreate, update, clearAll };
}
