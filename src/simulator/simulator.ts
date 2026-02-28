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

    const wasTie = result.winnerIds.length > 1;

    const playerStats: PlayerGameStats[] = result.players.map((player, index) => {
      // Get all turns for this player
      const playerTurns = result.turnHistory.filter(t => t.playerId === player.id);
      const scoringTurns = playerTurns.filter(t => !t.wasFarkle && t.pointsScored > 0);

      return {
        playerId: player.id,
        strategyId: this.config.strategies[index].id,
        strategyName: this.config.strategies[index].name,
        finalScore: player.totalScore,
        turnsPlayed: player.stats.totalTurns,
        rollsPlayed: player.stats.totalRolls,
        farkles: player.stats.farkles,
        farkleDiceDistribution: player.stats.farkleDiceDistribution,
        rollsByDiceCount: player.stats.rollsByDiceCount,
        maxTurnScore: player.stats.maxTurnScore,
        won: result.winnerIds.includes(player.id),
        wasTie: wasTie && result.winnerIds.includes(player.id),
        // New stats
        totalPointsScored: playerTurns.reduce((sum, t) => sum + t.pointsScored, 0),
        successfulTurns: scoringTurns.length
      };
    });

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
      const ties = stats.filter(s => s.wasTie).length;
      const losses = stats.filter(s => !s.won).length;
      const scores = stats.map(s => s.finalScore).sort((a, b) => a - b);
      const totalFarkles = stats.reduce((sum, s) => sum + s.farkles, 0);
      const totalRolls = stats.reduce((sum, s) => sum + s.rollsPlayed, 0);
      const totalTurns = stats.reduce((sum, s) => sum + s.turnsPlayed, 0);
      const totalPointsScored = stats.reduce((sum, s) => sum + s.totalPointsScored, 0);
      const totalSuccessfulTurns = stats.reduce((sum, s) => sum + s.successfulTurns, 0);

      // Aggregate farkle dice distribution
      const aggregatedFarkleDist: Record<number, number> = {};
      let totalFarkleDice = 0;
      let totalFarkleEvents = 0;

      stats.forEach(s => {
        if (s.farkleDiceDistribution) {
          Object.entries(s.farkleDiceDistribution).forEach(([dice, count]) => {
            const diceCount = parseInt(dice);
            aggregatedFarkleDist[diceCount] = (aggregatedFarkleDist[diceCount] || 0) + count;
            totalFarkleDice += diceCount * count;
            totalFarkleEvents += count;
          });
        }
      });

      const avgFarkleDiceCount = totalFarkleEvents > 0 ? totalFarkleDice / totalFarkleEvents : undefined;

      // Calculate luck score
      const FARKLE_PROBABILITIES: Record<number, number> = {
        1: 0.667,
        2: 0.444,
        3: 0.278,
        4: 0.154,
        5: 0.077,
        6: 0.023
      };

      const aggregatedRollsDist: Record<number, number> = {};
      stats.forEach(s => {
        if (s.rollsByDiceCount) {
          Object.entries(s.rollsByDiceCount).forEach(([dice, count]) => {
            const diceCount = parseInt(dice);
            aggregatedRollsDist[diceCount] = (aggregatedRollsDist[diceCount] || 0) + count;
          });
        }
      });

      let totalExpectedFarkles = 0;
      let totalActualFarkles = 0;

      for (let diceCount = 1; diceCount <= 6; diceCount++) {
        const rollsWithN = aggregatedRollsDist[diceCount] || 0;
        const farklesWithN = aggregatedFarkleDist[diceCount] || 0;
        const expectedFarkles = rollsWithN * FARKLE_PROBABILITIES[diceCount];

        totalExpectedFarkles += expectedFarkles;
        totalActualFarkles += farklesWithN;
      }

      const luckScore = totalExpectedFarkles > 0
        ? ((totalExpectedFarkles - totalActualFarkles) / totalExpectedFarkles) * 100
        : undefined;

      // Helper function to calculate stats for a subset of games
      const calculateSubsetStats = (subsetStats: PlayerGameStats[]) => {
        if (subsetStats.length === 0) return undefined;

        const subsetScores = subsetStats.map(s => s.finalScore);
        const subsetTurns = subsetStats.reduce((sum, s) => sum + s.turnsPlayed, 0);
        const subsetRolls = subsetStats.reduce((sum, s) => sum + s.rollsPlayed, 0);
        const subsetFarkles = subsetStats.reduce((sum, s) => sum + s.farkles, 0);
        const subsetPointsScored = subsetStats.reduce((sum, s) => sum + s.totalPointsScored, 0);
        const subsetSuccessfulTurns = subsetStats.reduce((sum, s) => sum + s.successfulTurns, 0);

        // Calculate farkle dice for subset
        let subsetFarkleDice = 0;
        let subsetFarkleEvents = 0;
        subsetStats.forEach(s => {
          if (s.farkleDiceDistribution) {
            Object.entries(s.farkleDiceDistribution).forEach(([dice, count]) => {
              const diceCount = parseInt(dice);
              subsetFarkleDice += diceCount * count;
              subsetFarkleEvents += count;
            });
          }
        });

        // Calculate luck score for subset
        const subsetRollsDist: Record<number, number> = {};
        const subsetFarkleDist: Record<number, number> = {};
        subsetStats.forEach(s => {
          if (s.rollsByDiceCount) {
            Object.entries(s.rollsByDiceCount).forEach(([dice, count]) => {
              const diceCount = parseInt(dice);
              subsetRollsDist[diceCount] = (subsetRollsDist[diceCount] || 0) + count;
            });
          }
          if (s.farkleDiceDistribution) {
            Object.entries(s.farkleDiceDistribution).forEach(([dice, count]) => {
              const diceCount = parseInt(dice);
              subsetFarkleDist[diceCount] = (subsetFarkleDist[diceCount] || 0) + count;
            });
          }
        });

        let subsetExpectedFarkles = 0;
        let subsetActualFarkles = 0;
        for (let diceCount = 1; diceCount <= 6; diceCount++) {
          const rollsWithN = subsetRollsDist[diceCount] || 0;
          const farklesWithN = subsetFarkleDist[diceCount] || 0;
          const expectedFarkles = rollsWithN * FARKLE_PROBABILITIES[diceCount];
          subsetExpectedFarkles += expectedFarkles;
          subsetActualFarkles += farklesWithN;
        }

        const subsetLuckScore = subsetExpectedFarkles > 0
          ? ((subsetExpectedFarkles - subsetActualFarkles) / subsetExpectedFarkles) * 100
          : undefined;

        return {
          averageScore: subsetScores.reduce((a, b) => a + b, 0) / subsetStats.length,
          averageTurns: subsetTurns / subsetStats.length,
          averageRolls: subsetRolls / subsetStats.length,
          averageFarkles: subsetFarkles / subsetStats.length,
          farkleRate: subsetRolls > 0 ? subsetFarkles / subsetRolls : 0,
          averageFarkleDiceCount: subsetFarkleEvents > 0 ? subsetFarkleDice / subsetFarkleEvents : undefined,
          luckScore: subsetLuckScore,
          averagePointsWhenScoring: subsetSuccessfulTurns > 0 ? subsetPointsScored / subsetSuccessfulTurns : 0,
          averagePointsPerTurn: subsetTurns > 0 ? subsetPointsScored / subsetTurns : 0
        };
      };

      // Calculate win, loss, and tie specific stats
      const winningGames = stats.filter(s => s.won && !s.wasTie); // Wins excluding ties
      const tiedGames = stats.filter(s => s.wasTie); // Only tied games
      const losingGames = stats.filter(s => !s.won);
      const winStats = calculateSubsetStats(winningGames);
      const tieStats = calculateSubsetStats(tiedGames);
      const lossStats = calculateSubsetStats(losingGames);

      return {
        strategyId,
        strategyName: stats[0].strategyName,
        gamesPlayed: stats.length,
        wins,
        losses,
        ties,
        winRate: wins / stats.length,
        tieRate: ties / stats.length,
        averageFinalScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        medianFinalScore: scores[Math.floor(scores.length / 2)],
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        averageTurnsPerGame: totalTurns / stats.length,
        averageRollsPerGame: totalRolls / stats.length,
        averagePointsPerTurn: totalTurns > 0 ? scores.reduce((a, b) => a + b, 0) / totalTurns : 0,
        averagePointsWhenScoring: totalSuccessfulTurns > 0 ? totalPointsScored / totalSuccessfulTurns : 0,
        averagePointsPerTurnIncludingFarkles: totalTurns > 0 ? totalPointsScored / totalTurns : 0,
        farkleRate: totalRolls > 0 ? totalFarkles / totalRolls : 0,
        averageFarklesPerGame: totalFarkles / stats.length,
        averageFarkleDiceCount: avgFarkleDiceCount,
        farkleDiceDistribution: Object.keys(aggregatedFarkleDist).length > 0 ? aggregatedFarkleDist : undefined,
        luckScore: luckScore,
        totalExpectedFarkles: totalExpectedFarkles > 0 ? totalExpectedFarkles : undefined,
        totalActualFarkles: totalActualFarkles > 0 ? totalActualFarkles : undefined,
        scoreDistribution: {
          under5000: scores.filter(s => s < 5000).length,
          from5000to7500: scores.filter(s => s >= 5000 && s < 7500).length,
          from7500to10000: scores.filter(s => s >= 7500 && s < 10000).length,
          from10000to12500: scores.filter(s => s >= 10000 && s < 12500).length,
          over12500: scores.filter(s => s >= 12500).length
        },
        winStats,
        tieStats,
        lossStats
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
