import { describe, it, expect } from 'vitest';
import { fixed, adaptiveToOpponent, endgameAdjusted, ensureBoarding } from '../../../src/strategies/composable/threshold-calculators';
import type { StrategyContext } from '../../../src/core/types';

/**
 * Helper to create a minimal StrategyContext for testing
 */
function createTestContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  const defaultContext: StrategyContext = {
    gameState: {
      gameId: 'test-game',
      players: [],
      currentPlayerIndex: 0,
      currentTurn: null,
      targetScore: 10000,
      minimumScoreToBoard: 500,
      isGameOver: false,
      winnerId: null,
      turnHistory: []
    },
    playerState: {
      id: 'player-1',
      name: 'Player 1',
      totalScore: 5000,
      isOnBoard: true,
      gamesWon: 0,
      stats: {
        totalTurns: 10,
        totalRolls: 40,
        farkles: 2,
        hotDiceCount: 1,
        averagePointsPerTurn: 500,
        maxTurnScore: 1500
      }
    },
    turnState: {
      playerId: 'player-1',
      turnPoints: 0,
      rollNumber: 1,
      diceRemaining: 6,
      lastRoll: null,
      lastScoringResult: null,
      bankedCombinations: [],
      canContinue: true,
      isFarkle: false
    },
    availableScoring: {
      combinations: [],
      totalPoints: 0,
      scoringDiceCount: 0,
      nonScoringDice: [],
      isFarkle: false,
      isHotDice: false
    },
    opponents: [],
    leadingOpponentScore: 4000,
    farkleRisk: 0.3,
    expectedValue: 300
  };

  return { ...defaultContext, ...overrides };
}

describe('ThresholdCalculators', () => {
  describe('fixed()', () => {
    it('should return the specified fixed threshold', () => {
      const threshold = fixed(1000);
      const context = createTestContext();

      expect(threshold(context)).toBe(1000);
    });

    it('should always return the same value regardless of context', () => {
      const threshold = fixed(1500);

      const contexts = [
        createTestContext({ leadingOpponentScore: 0 }),
        createTestContext({ leadingOpponentScore: 9000 }),
        createTestContext({
          playerState: {
            ...createTestContext().playerState,
            totalScore: 0
          }
        }),
        createTestContext({
          playerState: {
            ...createTestContext().playerState,
            totalScore: 9500
          }
        })
      ];

      contexts.forEach(ctx => {
        expect(threshold(ctx)).toBe(1500);
      });
    });

    it('should have proper metadata', () => {
      const threshold = fixed(2000);

      expect(threshold.name).toBe('fixed');
      expect(threshold.description).toContain('fixed');
      expect(threshold.description).toContain('2000');
    });

    it('should work with different threshold values', () => {
      expect(fixed(500)(createTestContext())).toBe(500);
      expect(fixed(2500)(createTestContext())).toBe(2500);
      expect(fixed(10000)(createTestContext())).toBe(10000);
    });
  });

  describe('adaptiveToOpponent()', () => {
    it('should return higher threshold when far behind', () => {
      const threshold = adaptiveToOpponent();

      const farBehind = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 1000
        },
        leadingOpponentScore: 7000 // 6000 behind
      });

      expect(threshold(farBehind)).toBeGreaterThan(2000);
    });

    it('should return moderate threshold when slightly behind', () => {
      const threshold = adaptiveToOpponent();

      const slightlyBehind = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 4000
        },
        leadingOpponentScore: 5000 // 1000 behind
      });

      const result = threshold(slightlyBehind);
      expect(result).toBeGreaterThanOrEqual(1200);
      expect(result).toBeLessThanOrEqual(2000);
    });

    it('should return lower threshold when ahead', () => {
      const threshold = adaptiveToOpponent();

      const ahead = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 7000
        },
        leadingOpponentScore: 5000 // 2000 ahead
      });

      expect(threshold(ahead)).toBeLessThan(1500);
    });

    it('should return balanced threshold when tied', () => {
      const threshold = adaptiveToOpponent();

      const tied = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 5000
        },
        leadingOpponentScore: 5000
      });

      const result = threshold(tied);
      expect(result).toBeGreaterThanOrEqual(1200);
      expect(result).toBeLessThanOrEqual(1500);
    });

    it('should have proper metadata', () => {
      const threshold = adaptiveToOpponent();

      expect(threshold.name).toBe('adaptive-to-opponent');
      expect(threshold.description).toContain('opponent');
    });
  });

  describe('endgameAdjusted()', () => {
    it('should return base threshold when far from target', () => {
      const threshold = endgameAdjusted(1500);

      const farFromTarget = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 3000
        },
        gameState: {
          ...createTestContext().gameState,
          targetScore: 10000
        }
      });

      expect(threshold(farFromTarget)).toBe(1500);
    });

    it('should increase threshold when close to winning', () => {
      const threshold = endgameAdjusted(1500);

      const closeToWinning = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 9000
        },
        gameState: {
          ...createTestContext().gameState,
          targetScore: 10000
        }
      });

      expect(threshold(closeToWinning)).toBeGreaterThan(1500);
    });

    it('should significantly increase threshold when very close to winning', () => {
      const threshold = endgameAdjusted(1000);

      const veryClose = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 9500
        },
        gameState: {
          ...createTestContext().gameState,
          targetScore: 10000
        }
      });

      // Within 500 points, should be very aggressive
      expect(threshold(veryClose)).toBeGreaterThan(2000);
    });

    it('should scale threshold based on distance to target', () => {
      const threshold = endgameAdjusted(1000);

      const at7000 = createTestContext({
        playerState: { ...createTestContext().playerState, totalScore: 7000 }
      });
      const at8000 = createTestContext({
        playerState: { ...createTestContext().playerState, totalScore: 8000 }
      });
      const at9000 = createTestContext({
        playerState: { ...createTestContext().playerState, totalScore: 9000 }
      });

      const threshold7000 = threshold(at7000);
      const threshold8000 = threshold(at8000);
      const threshold9000 = threshold(at9000);

      // Should increase as we get closer
      expect(threshold8000).toBeGreaterThanOrEqual(threshold7000);
      expect(threshold9000).toBeGreaterThan(threshold8000);
    });

    it('should have proper metadata', () => {
      const threshold = endgameAdjusted(1200);

      expect(threshold.name).toBe('endgame-adjusted');
      expect(threshold.description).toContain('endgame');
      expect(threshold.description).toContain('1200');
    });
  });

  describe('ensureBoarding()', () => {
    it('should return minimum score to board when not on board', () => {
      const threshold = ensureBoarding();

      const notOnBoard = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          isOnBoard: false
        },
        gameState: {
          ...createTestContext().gameState,
          minimumScoreToBoard: 500
        }
      });

      expect(threshold(notOnBoard)).toBe(500);
    });

    it('should return 0 when already on board', () => {
      const threshold = ensureBoarding();

      const onBoard = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          isOnBoard: true
        }
      });

      expect(threshold(onBoard)).toBe(0);
    });

    it('should work with different minimum boarding scores', () => {
      const threshold = ensureBoarding();

      const context1000 = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          isOnBoard: false
        },
        gameState: {
          ...createTestContext().gameState,
          minimumScoreToBoard: 1000
        }
      });

      expect(threshold(context1000)).toBe(1000);
    });

    it('should have proper metadata', () => {
      const threshold = ensureBoarding();

      expect(threshold.name).toBe('ensure-boarding');
      expect(threshold.description).toContain('board');
    });
  });
});
