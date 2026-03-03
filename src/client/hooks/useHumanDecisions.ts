import { useState, useCallback } from 'react';

const HUMAN_DECISIONS_KEY = 'hot-dice-human-decisions';
const STORAGE_VERSION = 1;

interface StoredDecisions {
  version: number;
  data: HumanDecisionRecord[];
}

export interface HumanDecisionRecord {
  id: string;
  timestamp: string;
  gameId?: string;
  diceRolled: number[];
  diceRemaining: number;
  turnPoints: number;
  playerScore: number;
  opponentScores: number[];
  farkleRisk: number;
  availableCombinations?: unknown[];
  continue: boolean;
  reason?: string;
}

function loadFromStorage(): HumanDecisionRecord[] {
  try {
    const raw = localStorage.getItem(HUMAN_DECISIONS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (parsed.version === undefined) {
      return Array.isArray(parsed) ? parsed : [];
    }

    if (parsed.version === STORAGE_VERSION && Array.isArray(parsed.data)) {
      return parsed.data;
    }

    return [];
  } catch (e) {
    console.error('Failed to load human decisions:', e);
    return [];
  }
}

function saveToStorage(data: HumanDecisionRecord[]) {
  try {
    const envelope: StoredDecisions = { version: STORAGE_VERSION, data };
    localStorage.setItem(HUMAN_DECISIONS_KEY, JSON.stringify(envelope));
  } catch (e) {
    console.error('Failed to save human decisions:', e);
  }
}

export interface PlayStyleAnalysis {
  totalDecisions: number;
  continueCount: number;
  stopCount: number;
  continueRate: number;
  avgRiskWhenContinuing: number;
  avgRiskWhenStopping: number;
  avgPointsWhenStopping: number;
  avgDiceWhenContinuing: number;
}

export function useHumanDecisions() {
  const [decisions, setDecisions] = useState<HumanDecisionRecord[]>(loadFromStorage);

  const addDecision = useCallback((record: Omit<HumanDecisionRecord, 'id'>) => {
    const id = `decision-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const full = { ...record, id };
    setDecisions((prev) => {
      const next = [...prev, full];
      saveToStorage(next);
      return next;
    });
    return id;
  }, []);

  const analyzePlayStyle = useCallback((): PlayStyleAnalysis | null => {
    if (decisions.length === 0) return null;
    const continueDecisions = decisions.filter((d) => d.continue);
    const stopDecisions = decisions.filter((d) => !d.continue);
    return {
      totalDecisions: decisions.length,
      continueCount: continueDecisions.length,
      stopCount: stopDecisions.length,
      continueRate: continueDecisions.length / decisions.length,
      avgRiskWhenContinuing:
        continueDecisions.length > 0
          ? continueDecisions.reduce((sum, d) => sum + d.farkleRisk, 0) / continueDecisions.length
          : 0,
      avgRiskWhenStopping:
        stopDecisions.length > 0
          ? stopDecisions.reduce((sum, d) => sum + d.farkleRisk, 0) / stopDecisions.length
          : 0,
      avgPointsWhenStopping:
        stopDecisions.length > 0
          ? stopDecisions.reduce((sum, d) => sum + d.turnPoints, 0) / stopDecisions.length
          : 0,
      avgDiceWhenContinuing:
        continueDecisions.length > 0
          ? continueDecisions.reduce((sum, d) => sum + d.diceRemaining, 0) / continueDecisions.length
          : 0,
    };
  }, [decisions]);

  const clearAll = useCallback(() => {
    setDecisions([]);
    saveToStorage([]);
  }, []);

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(decisions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hot-dice-decisions-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [decisions]);

  return { decisions, addDecision, analyzePlayStyle, clearAll, exportData };
}
