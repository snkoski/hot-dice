import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/game';
import type { GameConfig, Strategy, StrategyContext, DiceSelectionDecision, ContinueDecision } from '../../src/core/types';

// Simple test strategy that stops at a threshold
function createThresholdStrategy(threshold: number): Strategy {
  return {
    id: `stop-at-${threshold}`,
    name: `Stop at ${threshold}`,
    description: `Stop rolling when turn points reach ${threshold}`,
    version: '1.0.0',

    selectDice(context: StrategyContext): DiceSelectionDecision {
      // Take all scoring combinations
      return {
        selectedCombinations: context.availableScoring.combinations,
        points: context.availableScoring.totalPoints,
        diceKept: context.availableScoring.scoringDiceCount
      };
    },

    decideContinue(context: StrategyContext): ContinueDecision {
      return {
        continue: context.turnState.turnPoints < threshold,
        reason: `Current: ${context.turnState.turnPoints}, Target: ${threshold}`
      };
    }
  };
}

describe('Game', () => {
  describe('initialization', () => {
    it('should create a game with default config', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 42
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);
      const state = game.getState();

      expect(state.players).toHaveLength(2);
      expect(state.targetScore).toBe(10000);
      expect(state.minimumScoreToBoard).toBe(500);
      expect(state.isGameOver).toBe(false);
      expect(state.winnerId).toBeNull();
    });

    it('should create players with custom names', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        playerNames: ['Alice', 'Bob']
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);
      const state = game.getState();

      expect(state.players[0].name).toBe('Alice');
      expect(state.players[1].name).toBe('Bob');
    });

    it('should initialize players with zero scores', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 100
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);
      const state = game.getState();

      for (const player of state.players) {
        expect(player.totalScore).toBe(0);
        expect(player.isOnBoard).toBe(false);
      }
    });
  });

  describe('playTurn', () => {
    it('should execute a single turn', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 200
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);
      const turnRecord = game.playTurn();

      expect(turnRecord).toBeDefined();
      expect(turnRecord.playerId).toBeDefined();
      expect(turnRecord.rollCount).toBeGreaterThan(0);
    });

    it('should rotate players', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 3,
        seed: 300
      };

      const strategies = [
        createThresholdStrategy(500),
        createThresholdStrategy(500),
        createThresholdStrategy(500)
      ];

      const game = new Game(config, strategies);

      const turn1 = game.playTurn();
      const turn2 = game.playTurn();
      const turn3 = game.playTurn();
      const turn4 = game.playTurn();

      expect(turn1.playerId).not.toBe(turn2.playerId);
      expect(turn2.playerId).not.toBe(turn3.playerId);
      expect(turn3.playerId).not.toBe(turn4.playerId);
      expect(turn1.playerId).toBe(turn4.playerId); // Back to first player
    });

    it('should record turn in history', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 400
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);
      game.playTurn();

      const state = game.getState();
      expect(state.turnHistory).toHaveLength(1);
    });

    it('should update player score after turn', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 500
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);
      const stateBefore = game.getState();
      const player1ScoreBefore = stateBefore.players[0].totalScore;

      game.playTurn();

      const stateAfter = game.getState();
      const player1ScoreAfter = stateAfter.players[0].totalScore;

      // Score should be same or higher (could be 0 if farkle)
      expect(player1ScoreAfter).toBeGreaterThanOrEqual(player1ScoreBefore);
    });
  });

  describe('play (full game)', () => {
    it('should play a complete game to completion', () => {
      const config: GameConfig = {
        targetScore: 2000, // Lower target for faster test
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 600
      };

      const strategies = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game = new Game(config, strategies);
      const finalState = game.play();

      expect(finalState.isGameOver).toBe(true);
      expect(finalState.winnerId).not.toBeNull();
    });

    it('should have a winner with score >= target', () => {
      const config: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 700
      };

      const strategies = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game = new Game(config, strategies);
      const finalState = game.play();

      const winner = finalState.players.find(p => p.id === finalState.winnerId);
      expect(winner).toBeDefined();
      expect(winner!.totalScore).toBeGreaterThanOrEqual(config.targetScore);
    });

    it('should give all players final turn after first reaches target', () => {
      const config: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 3,
        seed: 800
      };

      const strategies = [
        createThresholdStrategy(800),
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game = new Game(config, strategies);
      const finalState = game.play();

      // All players should have played similar number of turns
      const turnCounts = finalState.players.map(p => p.stats.totalTurns);
      const maxDifference = Math.max(...turnCounts) - Math.min(...turnCounts);

      expect(maxDifference).toBeLessThanOrEqual(1);
    });

    it('should be reproducible with same seed', () => {
      const config1: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 999
      };

      const config2: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 999
      };

      const strategies1 = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const strategies2 = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game1 = new Game(config1, strategies1);
      const game2 = new Game(config2, strategies2);

      const result1 = game1.play();
      const result2 = game2.play();

      expect(result1.winnerId).toBe(result2.winnerId);
      expect(result1.players[0].totalScore).toBe(result2.players[0].totalScore);
      expect(result1.players[1].totalScore).toBe(result2.players[1].totalScore);
    });
  });

  describe('isGameOver', () => {
    it('should return false at start', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 1000
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);

      expect(game.isGameOver()).toBe(false);
    });

    it('should return true after game completion', () => {
      const config: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 1100
      };

      const strategies = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game = new Game(config, strategies);
      game.play();

      expect(game.isGameOver()).toBe(true);
    });
  });

  describe('getWinner', () => {
    it('should return null before game ends', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 1200
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);

      expect(game.getWinner()).toBeNull();
    });

    it('should return winner after game ends', () => {
      const config: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 1300
      };

      const strategies = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game = new Game(config, strategies);
      game.play();

      const winner = game.getWinner();
      expect(winner).not.toBeNull();
      expect(winner!.totalScore).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('getState', () => {
    it('should return readonly state', () => {
      const config: GameConfig = {
        targetScore: 10000,
        minimumScoreToBoard: 500,
        playerCount: 2,
        seed: 1400
      };

      const strategies = [
        createThresholdStrategy(1000),
        createThresholdStrategy(1000)
      ];

      const game = new Game(config, strategies);
      const state = game.getState();

      expect(state.gameId).toBeDefined();
      expect(state.players).toHaveLength(2);
      expect(state.targetScore).toBe(10000);
    });
  });

  describe('player stats tracking', () => {
    it('should track total turns', () => {
      const config: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 1500
      };

      const strategies = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game = new Game(config, strategies);
      game.play();

      const state = game.getState();
      for (const player of state.players) {
        expect(player.stats.totalTurns).toBeGreaterThan(0);
      }
    });

    it('should track total rolls', () => {
      const config: GameConfig = {
        targetScore: 2000,
        minimumScoreToBoard: 300,
        playerCount: 2,
        seed: 1600
      };

      const strategies = [
        createThresholdStrategy(800),
        createThresholdStrategy(800)
      ];

      const game = new Game(config, strategies);
      game.play();

      const state = game.getState();
      for (const player of state.players) {
        expect(player.stats.totalRolls).toBeGreaterThan(0);
      }
    });
  });
});
