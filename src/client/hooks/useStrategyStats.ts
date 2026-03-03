import { useState, useCallback } from 'react';
import {
  generateStrategyHash,
  createInitialStats,
  updateStrategyStats,
  calculateDerivedStats,
} from '../lib/strategyHash';
import type { StrategyStats } from '../types/stats';

const STATS_STORAGE_KEY = 'hot-dice-strategy-stats';
const STORAGE_VERSION = 1;

interface StoredStats {
  version: number;
  data: Record<string, StrategyStats>;
}

function loadFromStorage(): Record<string, StrategyStats> {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);

    if (parsed.version === undefined) {
      return migrateV0ToV1(parsed);
    }

    if (parsed.version === STORAGE_VERSION && parsed.data) {
      return parsed.data;
    }

    return {};
  } catch (e) {
    console.error('Failed to load strategy stats:', e);
    return {};
  }
}

function migrateV0ToV1(raw: unknown): Record<string, StrategyStats> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, StrategyStats>;
  }
  return {};
}

function saveToStorage(data: Record<string, StrategyStats>) {
  try {
    const envelope: StoredStats = { version: STORAGE_VERSION, data };
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(envelope));
  } catch (e) {
    console.error('Failed to save strategy stats:', e);
  }
}

export function useStrategyStats() {
  const [stats, setStats] = useState<Record<string, StrategyStats>>(loadFromStorage);

  const mergeResults = useCallback(
    (
      strategy: { id: string; name: string; description: string; details?: unknown; threshold?: number; type?: string; minDice?: number },
      simulationResults: {
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
      }
    ) => {
      const hash = generateStrategyHash(strategy as any, { components: strategy.details });
      setStats((prev) => {
        const all = { ...prev };
        const existing = all[hash] ?? createInitialStats(hash, strategy.name, strategy.description);
        const updated = updateStrategyStats(existing, simulationResults);
        all[hash] = calculateDerivedStats(updated);
        saveToStorage(all);
        return all;
      });
    },
    []
  );

  const getStatsForHash = useCallback(
    (hash: string): StrategyStats | undefined => {
      const s = stats[hash];
      return s ? calculateDerivedStats(s) : undefined;
    },
    [stats]
  );

  const clearAll = useCallback(() => {
    setStats({});
    saveToStorage({});
  }, []);

  return { stats, mergeResults, getStatsForHash, clearAll };
}
