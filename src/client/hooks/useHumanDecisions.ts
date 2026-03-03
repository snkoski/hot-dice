import { useCallback } from 'react';

const HUMAN_DECISIONS_KEY = 'hot-dice-human-decisions';

export interface HumanDecisionLocalRecord {
  id: string;
  timestamp: string;
  gameId: string;
  diceRolled: number[];
  diceRemaining: number;
  turnPoints: number;
  playerScore: number;
  opponentScores: number[];
  farkleRisk: number;
  availableCombinations: any[];
  continue: boolean;
  reason: string;
}

interface VersionedData {
  version: number;
  data: HumanDecisionLocalRecord[];
}

function loadRaw(): HumanDecisionLocalRecord[] {
  try {
    const raw = localStorage.getItem(HUMAN_DECISIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.version === 'number') {
      return (parsed as VersionedData).data;
    }
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function save(data: HumanDecisionLocalRecord[]) {
  const envelope: VersionedData = { version: 1, data };
  localStorage.setItem(HUMAN_DECISIONS_KEY, JSON.stringify(envelope));
}

export function useHumanDecisions() {
  const loadAll = useCallback((): HumanDecisionLocalRecord[] => loadRaw(), []);

  const saveDecision = useCallback(
    (record: Omit<HumanDecisionLocalRecord, 'id'>) => {
      const all = loadRaw();
      const entry: HumanDecisionLocalRecord = {
        ...record,
        id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      all.push(entry);
      save(all);
      return entry.id;
    },
    [],
  );

  const analyze = useCallback(() => {
    const decisions = loadRaw();
    if (decisions.length === 0) return null;

    const cont = decisions.filter((d) => d.continue);
    const stop = decisions.filter((d) => !d.continue);

    return {
      totalDecisions: decisions.length,
      continueCount: cont.length,
      stopCount: stop.length,
      continueRate: cont.length / decisions.length,
      avgRiskWhenContinuing:
        cont.length > 0
          ? cont.reduce((s, d) => s + d.farkleRisk, 0) / cont.length
          : 0,
      avgRiskWhenStopping:
        stop.length > 0
          ? stop.reduce((s, d) => s + d.farkleRisk, 0) / stop.length
          : 0,
      avgPointsWhenStopping:
        stop.length > 0
          ? stop.reduce((s, d) => s + d.turnPoints, 0) / stop.length
          : 0,
      avgDiceWhenContinuing:
        cont.length > 0
          ? cont.reduce((s, d) => s + d.diceRemaining, 0) / cont.length
          : 0,
    };
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(HUMAN_DECISIONS_KEY);
  }, []);

  const exportJSON = useCallback(() => {
    const decisions = loadRaw();
    const dataStr = JSON.stringify(decisions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hot-dice-decisions-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return { loadAll, saveDecision, analyze, clearAll, exportJSON };
}
