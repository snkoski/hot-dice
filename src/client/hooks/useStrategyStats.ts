import { useState, useEffect } from 'react';
import { StrategyStats } from '../types/stats';

const STORAGE_KEY = 'hot-dice-strategy-stats';

interface StorageEnvelope {
  version: number;
  data: Record<string, StrategyStats>;
}

export function useStrategyStats() {
  const [stats, setStats] = useState<Record<string, StrategyStats>>({});

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.version === undefined) {
          // migrate version 0 to 1
          const migrated: StorageEnvelope = { version: 1, data: parsed };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          setStats(migrated.data);
        } else {
          setStats(parsed.data);
        }
      } catch (e) {
        console.error('Failed to parse strategy stats', e);
      }
    }
  }, []);

  const updateStats = (newStats: Record<string, StrategyStats>) => {
    setStats(newStats);
    const envelope: StorageEnvelope = { version: 1, data: newStats };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  };

  const clearStats = () => {
    setStats({});
    localStorage.removeItem(STORAGE_KEY);
  };

  return { stats, updateStats, clearStats };
}
