import { useState, useEffect } from 'react';

const STORAGE_KEY = 'hot-dice-human-decisions';

interface StorageEnvelope {
  version: number;
  data: any[];
}

export function useHumanDecisions() {
  const [decisions, setDecisions] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.version === undefined) {
          const migrated: StorageEnvelope = { version: 1, data: parsed };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          setDecisions(migrated.data);
        } else {
          setDecisions(parsed.data);
        }
      } catch (e) {
        console.error('Failed to parse human decisions', e);
      }
    }
  }, []);

  const addDecisions = (newDecisions: any[]) => {
    setDecisions(prev => {
      // Avoid adding duplicates (assuming decisions have a unique decisionId)
      const existingIds = new Set(prev.map(d => d.decisionId));
      const toAdd = newDecisions.filter(d => !existingIds.has(d.decisionId));
      
      if (toAdd.length === 0) return prev;
      
      const updated = [...prev, ...toAdd];
      const envelope: StorageEnvelope = { version: 1, data: updated };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      return updated;
    });
  };

  const clearDecisions = () => {
    setDecisions([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { decisions, addDecisions, clearDecisions };
}
