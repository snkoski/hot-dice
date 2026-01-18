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
  maxTurnScore: number;
  won: boolean;
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
  winRate: number;

  // Score statistics
  averageFinalScore: number;
  medianFinalScore: number;
  minScore: number;
  maxScore: number;

  // Performance statistics
  averageTurnsPerGame: number;
  averageRollsPerGame: number;
  averagePointsPerTurn: number;

  // Risk metrics
  farkleRate: number;
  averageFarklesPerGame: number;

  // Score distribution
  scoreDistribution: {
    under5000: number;
    from5000to7500: number;
    from7500to10000: number;
    from10000to12500: number;
    over12500: number;
  };
}
