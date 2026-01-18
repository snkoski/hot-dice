import { Game } from '../core/game';
import type { GameConfig } from '../core/types';
import type {
  SimulationConfig,
  SimulationResults,
  GameStatistics,
  PlayerGameStats,
  StrategyStatistics,
  SimulationProgress
} from './types';

/**
 * Simulator for running multiple games
 */
export class Simulator {
  constructor(private config: SimulationConfig) {}

  /**
   * Run all simulations
   */
  async run(): Promise<SimulationResults> {
    const startTime = Date.now();
    const gameStats: GameStatistics[] = [];

    for (let i = 0; i < this.config.gameCount; i++) {
      // Create game config with incremented seed
      const gameConfig: GameConfig = {
        ...this.config.gameConfig,
        seed: this.config.seed !== undefined ? this.config.seed + i : undefined
      };

      // Run single game
      const stats = this.runSingleGame(gameConfig, i);
      gameStats.push(stats);

      // Report progress
      if (this.config.onProgress) {
        const elapsed = Date.now() - startTime;
        const percentComplete = ((i + 1) / this.config.gameCount) * 100;
        const estimatedTotal = (elapsed / (i + 1)) * this.config.gameCount;
        const estimatedRemaining = estimatedTotal - elapsed;

        const progress: SimulationProgress = {
          gamesCompleted: i + 1,
          totalGames: this.config.gameCount,
          percentComplete,
          elapsedTime: elapsed,
          estimatedTimeRemaining: estimatedRemaining
        };

        this.config.onProgress(progress);
      }
    }

    const totalDuration = Date.now() - startTime;

    // Calculate aggregate statistics
    const strategyStats = this.calculateStrategyStats(gameStats);
    const overallStats = this.calculateOverallStats(gameStats);

    return {
      config: this.config,
      gamesPlayed: this.config.gameCount,
      totalDuration,
      strategyStats,
      overallStats
    };
  }

  /**
   * Run a single game
   */
  private runSingleGame(gameConfig: GameConfig, gameIndex: number): GameStatistics {
    const game = new Game(gameConfig, this.config.strategies);
    const result = game.play();

    const playerStats: PlayerGameStats[] = result.players.map((player, index) => ({
      playerId: player.id,
      strategyId: this.config.strategies[index].id,
      strategyName: this.config.strategies[index].name,
      finalScore: player.totalScore,
      turnsPlayed: player.stats.totalTurns,
      rollsPlayed: player.stats.totalRolls,
      farkles: player.stats.farkles,
      maxTurnScore: player.stats.maxTurnScore,
      won: player.id === result.winnerId
    }));

    return {
      gameId: result.gameId,
      winnerId: result.winnerId!,
      totalTurns: result.turnHistory.length,
      totalRolls: result.players.reduce((sum, p) => sum + p.stats.totalRolls, 0),
      gameDuration: 0, // Could track actual time if needed
      playerStats
    };
  }

  /**
   * Calculate per-strategy statistics
   */
  private calculateStrategyStats(gameStats: GameStatistics[]): StrategyStatistics[] {
    const statsByStrategy = new Map<string, PlayerGameStats[]>();

    // Group stats by strategy
    gameStats.forEach(game => {
      game.playerStats.forEach(playerStat => {
        if (!statsByStrategy.has(playerStat.strategyId)) {
          statsByStrategy.set(playerStat.strategyId, []);
        }
        statsByStrategy.get(playerStat.strategyId)!.push(playerStat);
      });
    });

    // Calculate aggregate stats for each strategy
    return Array.from(statsByStrategy.entries()).map(([strategyId, stats]) => {
      const wins = stats.filter(s => s.won).length;
      const scores = stats.map(s => s.finalScore).sort((a, b) => a - b);
      const totalFarkles = stats.reduce((sum, s) => s.farkles, 0);
      const totalRolls = stats.reduce((sum, s) => s.rollsPlayed, 0);
      const totalTurns = stats.reduce((sum, s) => s.turnsPlayed, 0);

      return {
        strategyId,
        strategyName: stats[0].strategyName,
        gamesPlayed: stats.length,
        wins,
        winRate: wins / stats.length,
        averageFinalScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        medianFinalScore: scores[Math.floor(scores.length / 2)],
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        averageTurnsPerGame: totalTurns / stats.length,
        averageRollsPerGame: totalRolls / stats.length,
        averagePointsPerTurn: totalTurns > 0 ? scores.reduce((a, b) => a + b, 0) / totalTurns : 0,
        farkleRate: totalRolls > 0 ? totalFarkles / totalRolls : 0,
        averageFarklesPerGame: totalFarkles / stats.length,
        scoreDistribution: {
          under5000: scores.filter(s => s < 5000).length,
          from5000to7500: scores.filter(s => s >= 5000 && s < 7500).length,
          from7500to10000: scores.filter(s => s >= 7500 && s < 10000).length,
          from10000to12500: scores.filter(s => s >= 10000 && s < 12500).length,
          over12500: scores.filter(s => s >= 12500).length
        }
      };
    });
  }

  /**
   * Calculate overall statistics
   */
  private calculateOverallStats(gameStats: GameStatistics[]) {
    const totalTurns = gameStats.reduce((sum, g) => sum + g.totalTurns, 0);
    const totalRolls = gameStats.reduce((sum, g) => sum + g.totalRolls, 0);
    const totalFarkles = gameStats.reduce((sum, g) =>
      sum + g.playerStats.reduce((s, p) => s + p.farkles, 0), 0
    );

    return {
      averageGameLength: totalTurns / gameStats.length,
      averageRollsPerGame: totalRolls / gameStats.length,
      averageFarklesPerGame: totalFarkles / gameStats.length
    };
  }
}
