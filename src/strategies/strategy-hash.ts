/**
 * Strategy Hash Generator
 *
 * Creates a unique hash for any strategy based on its configuration.
 * Identical strategy configurations produce identical hashes, allowing
 * for persistent tracking of strategy performance across sessions.
 */

import type { Strategy } from '../core/types';

/**
 * Simple hash function (djb2 algorithm)
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36); // Convert to base36 for shorter strings
}

/**
 * Generate a unique hash for a strategy based on its configuration
 *
 * For composable strategies, this includes:
 * - Dice selector type
 * - Threshold calculator type and parameters
 * - All modifiers and their order
 * - All evaluators and their order
 * - Combination mode
 *
 * For simple strategies, this is based on the threshold value.
 */
export function generateStrategyHash(strategy: Strategy, details?: any): string {
  // For built-in simple threshold strategies
  if (strategy.id.startsWith('threshold-')) {
    const threshold = strategy.id.split('-')[1];
    return hashString(`threshold:${threshold}`);
  }

  // For composable strategies with details
  if (details?.components) {
    const components = details.components;

    const parts = [
      `dice:${components.diceSelector?.name || 'unknown'}`,
      `calc:${components.thresholdCalculator?.name || 'none'}:${components.thresholdCalculator?.description || ''}`,
      `mods:${(components.modifiers || []).map((m: any) => m.name).sort().join(',')}`,
      `eval:${(components.evaluators || []).map((e: any) => e.name).sort().join(',')}`,
      `mode:${components.combinationMode}`
    ];

    return hashString(parts.join('|'));
  }

  // For custom strategies
  if ((strategy as any).threshold !== undefined) {
    const customStrategy = strategy as any;
    if (customStrategy.type === 'safe' && customStrategy.minDice !== undefined) {
      return hashString(`safe:${customStrategy.threshold}:${customStrategy.minDice}`);
    }
    return hashString(`custom:${customStrategy.threshold}`);
  }

  // Fallback: use strategy ID
  return hashString(`id:${strategy.id}`);
}

/**
 * Strategy statistics structure for persistent storage
 */
export interface StrategyStats {
  hash: string;
  name: string;
  description: string;

  // Cumulative statistics
  totalGames: number;
  totalWins: number;
  totalTurns: number;
  totalRolls: number;
  totalFarkles: number;
  totalPoints: number;
  totalSuccessfulTurns: number; // Turns where points were scored (not farkle)
  totalFarkleDice?: number; // Sum of all dice counts when farkles occurred
  totalFarkleEvents?: number; // Count of farkle events (for calculating average)
  totalExpectedFarkles?: number; // Expected number of farkles based on probabilities
  totalActualFarkles?: number; // Actual farkles that occurred (for luck calculation)

  // Derived statistics (calculated on read)
  winRate?: number;
  avgTurnsPerGame?: number;
  avgRollsPerGame?: number;
  avgFarklesPerGame?: number;
  avgPointsPerGame?: number;
  farkleRate?: number;
  avgPointsWhenScoring?: number; // Average points per successful turn
  avgPointsPerTurnIncludingFarkles?: number; // Average points per turn including farkles
  avgFarkleDiceCount?: number; // Average number of dice when farkle occurred
  luckScore?: number; // Luck metric: positive = lucky, negative = unlucky

  // Metadata
  firstSeen: string; // ISO timestamp
  lastSeen: string;  // ISO timestamp
  gamesCount: number; // Number of simulation runs
}

/**
 * Create initial stats for a new strategy
 */
export function createInitialStats(hash: string, name: string, description: string): StrategyStats {
  const now = new Date().toISOString();
  return {
    hash,
    name,
    description,
    totalGames: 0,
    totalWins: 0,
    totalTurns: 0,
    totalRolls: 0,
    totalFarkles: 0,
    totalPoints: 0,
    totalSuccessfulTurns: 0,
    totalFarkleDice: 0,
    totalFarkleEvents: 0,
    totalExpectedFarkles: 0,
    totalActualFarkles: 0,
    firstSeen: now,
    lastSeen: now,
    gamesCount: 0
  };
}

/**
 * Update strategy stats with new simulation results
 */
export function updateStrategyStats(
  existing: StrategyStats,
  newResults: {
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
): StrategyStats {
  return {
    ...existing,
    totalGames: existing.totalGames + newResults.gamesPlayed,
    totalWins: existing.totalWins + newResults.wins,
    totalTurns: existing.totalTurns + newResults.totalTurns,
    totalRolls: existing.totalRolls + newResults.totalRolls,
    totalFarkles: existing.totalFarkles + newResults.totalFarkles,
    totalPoints: existing.totalPoints + newResults.totalPoints,
    totalSuccessfulTurns: existing.totalSuccessfulTurns + newResults.totalSuccessfulTurns,
    totalFarkleDice: (existing.totalFarkleDice || 0) + (newResults.totalFarkleDice || 0),
    totalFarkleEvents: (existing.totalFarkleEvents || 0) + (newResults.totalFarkleEvents || 0),
    totalExpectedFarkles: (existing.totalExpectedFarkles || 0) + (newResults.totalExpectedFarkles || 0),
    totalActualFarkles: (existing.totalActualFarkles || 0) + (newResults.totalActualFarkles || 0),
    lastSeen: new Date().toISOString(),
    gamesCount: existing.gamesCount + 1
  };
}

/**
 * Calculate derived statistics
 */
export function calculateDerivedStats(stats: StrategyStats): StrategyStats {
  const result = { ...stats };

  if (stats.totalGames > 0) {
    result.winRate = stats.totalWins / stats.totalGames;
    result.avgTurnsPerGame = stats.totalTurns / stats.totalGames;
    result.avgRollsPerGame = stats.totalRolls / stats.totalGames;
    result.avgFarklesPerGame = stats.totalFarkles / stats.totalGames;
    result.avgPointsPerGame = stats.totalPoints / stats.totalGames;
  }

  if (stats.totalRolls > 0) {
    result.farkleRate = stats.totalFarkles / stats.totalRolls;
  }

  if (stats.totalSuccessfulTurns > 0) {
    result.avgPointsWhenScoring = stats.totalPoints / stats.totalSuccessfulTurns;
  }

  if (stats.totalTurns > 0) {
    result.avgPointsPerTurnIncludingFarkles = stats.totalPoints / stats.totalTurns;
  }

  if (stats.totalFarkleEvents && stats.totalFarkleEvents > 0 && stats.totalFarkleDice !== undefined) {
    result.avgFarkleDiceCount = stats.totalFarkleDice / stats.totalFarkleEvents;
  }

  if (stats.totalExpectedFarkles && stats.totalExpectedFarkles > 0 && stats.totalActualFarkles !== undefined) {
    result.luckScore = ((stats.totalExpectedFarkles - stats.totalActualFarkles) / stats.totalExpectedFarkles) * 100;
  }

  return result;
}
