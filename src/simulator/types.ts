import type { GameConfig, Strategy, PlayerState } from '../core/types';

/**
 * Configuration for running simulations
 */
export interface SimulationConfig {
  gameCount: number;
  gameConfig: GameConfig;
  strategies: Strategy[];
  seed?: number;
  onProgress?: (progress: SimulationProgress) => void;
}

/**
 * Progress update during simulation
 */
export interface SimulationProgress {
  gamesCompleted: number;
  totalGames: number;
  percentComplete: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
}

/**
 * Statistics from a single game
 */
export interface GameStatistics {
  gameId: string;
  winnerId: string;
  totalTurns: number;
  totalRolls: number;
  gameDuration: number;
  playerStats: PlayerGameStats[];
}

/**
 * Per-player statistics for a game
 */
export interface PlayerGameStats {
  playerId: string;
  strategyId: string;
  strategyName: string;
  finalScore: number;
  turnsPlayed: number;
  rollsPlayed: number;
  farkles: number;
  farkleDiceDistribution?: Record<number, number>; // Count of farkles by dice count
  rollsByDiceCount?: Record<number, number>; // Count of all rolls by dice count
  maxTurnScore: number;
  won: boolean;
  wasTie: boolean; // True if this was a tied game
  totalPointsScored: number;
  successfulTurns: number; // Turns where points were actually scored (not farkle, not 0)
}

/**
 * Aggregated results across all simulations
 */
export interface SimulationResults {
  config: SimulationConfig;
  gamesPlayed: number;
  totalDuration: number;
  strategyStats: StrategyStatistics[];
  overallStats: {
    averageGameLength: number;
    averageRollsPerGame: number;
    averageFarklesPerGame: number;
  };
}

/**
 * Aggregate statistics for a strategy
 */
export interface StrategyStatistics {
  strategyId: string;
  strategyName: string;

  // Win statistics
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  tieRate: number;

  // Score statistics
  averageFinalScore: number;
  medianFinalScore: number;
  minScore: number;
  maxScore: number;

  // Performance statistics
  averageTurnsPerGame: number;
  averageRollsPerGame: number;
  averagePointsPerTurn: number;
  averagePointsWhenScoring: number; // Average points per successful turn (excluding farkles)
  averagePointsPerTurnIncludingFarkles: number; // Average points per turn (including 0s from farkles)

  // Risk metrics
  farkleRate: number;
  averageFarklesPerGame: number;
  averageFarkleDiceCount?: number; // Average number of dice when farkle occurs
  farkleDiceDistribution?: Record<number, number>; // Aggregated farkle distribution by dice count
  luckScore?: number; // Luck metric: positive = lucky (fewer farkles than expected), negative = unlucky
  totalExpectedFarkles?: number; // For cumulative luck tracking
  totalActualFarkles?: number; // For cumulative luck tracking

  // Score distribution
  scoreDistribution: {
    under5000: number;
    from5000to7500: number;
    from7500to10000: number;
    from10000to12500: number;
    over12500: number;
  };

  // Win-specific statistics (excluding ties)
  winStats?: {
    averageScore: number;
    averageTurns: number;
    averageRolls: number;
    averageFarkles: number;
    farkleRate: number;
    averageFarkleDiceCount?: number;
    luckScore?: number;
    averagePointsWhenScoring: number;
    averagePointsPerTurn: number;
  };

  // Tie-specific statistics
  tieStats?: {
    averageScore: number;
    averageTurns: number;
    averageRolls: number;
    averageFarkles: number;
    farkleRate: number;
    averageFarkleDiceCount?: number;
    luckScore?: number;
    averagePointsWhenScoring: number;
    averagePointsPerTurn: number;
  };

  // Loss-specific statistics
  lossStats?: {
    averageScore: number;
    averageTurns: number;
    averageRolls: number;
    averageFarkles: number;
    farkleRate: number;
    averageFarkleDiceCount?: number;
    luckScore?: number;
    averagePointsWhenScoring: number;
    averagePointsPerTurn: number;
  };
}
