import { describe, it, expect } from 'vitest';
import {
  thresholdBased,
  highRiskExit,
  expectedValueBased,
  minDiceRemaining
} from '../../../src/strategies/composable/continue-evaluators';
import { fixed, adaptiveToOpponent } from '../../../src/strategies/composable/threshold-calculators';
import { diceCountAdjustment, riskAdjustment } from '../../../src/strategies/composable/threshold-modifiers';
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

describe('ContinueEvaluators', () => {
  describe('thresholdBased()', () => {
    it('should continue when below threshold', () => {
      const evaluator = thresholdBased(fixed(1000), []);

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 500
        }
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(true);
      expect(result.weight).toBe(1.0);
      expect(result.reason).toContain('500');
      expect(result.reason).toContain('1000');
    });

    it('should stop when at or above threshold', () => {
      const evaluator = thresholdBased(fixed(1000), []);

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 1000
        }
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
      expect(result.weight).toBe(1.0);
    });

    it('should apply modifiers to adjust threshold', () => {
      const evaluator = thresholdBased(fixed(1000), [diceCountAdjustment()]);

      // With 2 dice, modifier should reduce threshold to ~650
      const contextFewDice = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 700,
          diceRemaining: 2
        }
      });

      const result = evaluator(contextFewDice);

      // Should stop because 700 > 650 (1000 * 0.65)
      expect(result.shouldContinue).toBe(false);
    });

    it('should apply multiple modifiers', () => {
      const evaluator = thresholdBased(
        fixed(1000),
        [diceCountAdjustment(), riskAdjustment()]
      );

      // 2 dice (0.65x) + high risk 0.5 (0.7x) = ~455 threshold
      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 500,
          diceRemaining: 2
        },
        farkleRisk: 0.5
      });

      const result = evaluator(context);

      // Should stop because 500 > 455
      expect(result.shouldContinue).toBe(false);
    });

    it('should work with adaptive threshold calculator', () => {
      const evaluator = thresholdBased(adaptiveToOpponent(), []);

      // Behind by 3500 - should use high threshold (2500)
      const context = createTestContext({
        playerState: {
          ...createTestContext().playerState,
          totalScore: 2000
        },
        leadingOpponentScore: 5500,
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 2000
        }
      });

      const result = evaluator(context);

      // Should continue because 2000 < 2500
      expect(result.shouldContinue).toBe(true);
    });

    it('should have proper metadata', () => {
      const evaluator = thresholdBased(fixed(1500), []);

      expect(evaluator.name).toBe('threshold-based');
      expect(evaluator.description).toContain('threshold');
    });
  });

  describe('highRiskExit()', () => {
    it('should continue when risk is below threshold', () => {
      const evaluator = highRiskExit(0.5);

      const context = createTestContext({
        farkleRisk: 0.3
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(true);
      expect(result.weight).toBe(1.0);
    });

    it('should stop when risk exceeds threshold', () => {
      const evaluator = highRiskExit(0.4);

      const context = createTestContext({
        farkleRisk: 0.6,
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 800
        }
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
      expect(result.weight).toBe(1.0);
      expect(result.reason).toContain('risk');
      expect(result.reason).toContain('60');
    });

    it('should stop at exactly the threshold', () => {
      const evaluator = highRiskExit(0.45);

      const context = createTestContext({
        farkleRisk: 0.45
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
    });

    it('should have proper metadata', () => {
      const evaluator = highRiskExit(0.5);

      expect(evaluator.name).toBe('high-risk-exit');
      expect(evaluator.description).toContain('risk');
    });
  });

  describe('expectedValueBased()', () => {
    it('should continue when EV is above minimum', () => {
      const evaluator = expectedValueBased(200);

      const context = createTestContext({
        expectedValue: 300
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(true);
      expect(result.weight).toBe(1.0);
      expect(result.reason).toContain('300');
    });

    it('should stop when EV is below minimum', () => {
      const evaluator = expectedValueBased(400);

      const context = createTestContext({
        expectedValue: 250
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
      expect(result.weight).toBe(1.0);
      expect(result.reason).toContain('250');
      expect(result.reason).toContain('400');
    });

    it('should stop at exactly the minimum EV', () => {
      const evaluator = expectedValueBased(300);

      const context = createTestContext({
        expectedValue: 300
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
    });

    it('should stop when EV is negative', () => {
      const evaluator = expectedValueBased(100);

      const context = createTestContext({
        expectedValue: -50
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
    });

    it('should have proper metadata', () => {
      const evaluator = expectedValueBased(250);

      expect(evaluator.name).toBe('expected-value-based');
      expect(evaluator.description).toContain('expected value');
    });
  });

  describe('minDiceRemaining()', () => {
    it('should continue when above minimum dice', () => {
      const evaluator = minDiceRemaining(2);

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 4
        }
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(true);
      expect(result.weight).toBe(1.0);
    });

    it('should stop when at minimum dice', () => {
      const evaluator = minDiceRemaining(3);

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 3
        }
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
      expect(result.weight).toBe(1.0);
      expect(result.reason).toContain('3 dice');
    });

    it('should stop when below minimum dice', () => {
      const evaluator = minDiceRemaining(3);

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 2
        }
      });

      const result = evaluator(context);

      expect(result.shouldContinue).toBe(false);
    });

    it('should work with different minimum values', () => {
      const evaluator1 = minDiceRemaining(1);
      const evaluator4 = minDiceRemaining(4);

      const context1Die = createTestContext({
        turnState: { ...createTestContext().turnState, diceRemaining: 1 }
      });
      const context4Dice = createTestContext({
        turnState: { ...createTestContext().turnState, diceRemaining: 4 }
      });

      expect(evaluator1(context1Die).shouldContinue).toBe(false);
      expect(evaluator1(context4Dice).shouldContinue).toBe(true);
      expect(evaluator4(context4Dice).shouldContinue).toBe(false);
    });

    it('should have proper metadata', () => {
      const evaluator = minDiceRemaining(2);

      expect(evaluator.name).toBe('min-dice-remaining');
      expect(evaluator.description).toContain('dice');
    });
  });
});
