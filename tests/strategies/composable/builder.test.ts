import { describe, it, expect } from 'vitest';
import {
  StrategyBuilder,
  createThresholdStrategy,
  combineEvaluators
} from '../../../src/strategies/composable/builder';
import { fixed } from '../../../src/strategies/composable/threshold-calculators';
import { diceCountAdjustment } from '../../../src/strategies/composable/threshold-modifiers';
import { thresholdBased, highRiskExit } from '../../../src/strategies/composable/continue-evaluators';
import { greedy, keepMinimum } from '../../../src/strategies/composable/dice-selectors';
import type { StrategyContext, ScoringCombination } from '../../../src/core/types';
import { ScoreType } from '../../../src/core/types';

/**
 * Helper to create test scoring combinations
 */
function createCombination(type: ScoreType, points: number, diceCount: number): ScoringCombination {
  const dice = Array(diceCount).fill(1) as any;
  return {
    type,
    dice,
    points,
    diceIndices: Array.from({ length: diceCount }, (_, i) => i)
  };
}

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
      combinations: [
        createCombination(ScoreType.SINGLE_ONE, 100, 1)
      ],
      totalPoints: 100,
      scoringDiceCount: 1,
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

describe('StrategyBuilder', () => {
  describe('basic building', () => {
    it('should build a complete strategy with all required fields', () => {
      const strategy = new StrategyBuilder()
        .withMetadata('test-strategy', 'Test Strategy', 'A test strategy', '1.0.0')
        .withDiceSelector(greedy())
        .withContinueEvaluators(thresholdBased(fixed(1000), []))
        .withCombinationMode({ type: 'all' })
        .build();

      expect(strategy.id).toBe('test-strategy');
      expect(strategy.name).toBe('Test Strategy');
      expect(strategy.description).toBe('A test strategy');
      expect(strategy.version).toBe('1.0.0');
      expect(typeof strategy.selectDice).toBe('function');
      expect(typeof strategy.decideContinue).toBe('function');
    });

    it('should use dice selector for selectDice method', () => {
      const strategy = new StrategyBuilder()
        .withMetadata('test', 'Test', 'Test', '1.0.0')
        .withDiceSelector(greedy())
        .withContinueEvaluators(thresholdBased(fixed(1000), []))
        .build();

      const context = createTestContext({
        availableScoring: {
          combinations: [
            createCombination(ScoreType.SINGLE_ONE, 100, 1),
            createCombination(ScoreType.SINGLE_FIVE, 50, 1)
          ],
          totalPoints: 150,
          scoringDiceCount: 2,
          nonScoringDice: [],
          isFarkle: false,
          isHotDice: false
        }
      });

      const decision = strategy.selectDice(context);

      expect(decision.selectedCombinations).toHaveLength(2);
      expect(decision.points).toBe(150);
      expect(decision.diceKept).toBe(2);
    });

    it('should use continue evaluator for decideContinue method', () => {
      const strategy = new StrategyBuilder()
        .withMetadata('test', 'Test', 'Test', '1.0.0')
        .withDiceSelector(greedy())
        .withContinueEvaluators(thresholdBased(fixed(1000), []))
        .build();

      const contextLow = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 500
        }
      });

      const contextHigh = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 1500
        }
      });

      expect(strategy.decideContinue(contextLow).continue).toBe(true);
      expect(strategy.decideContinue(contextHigh).continue).toBe(false);
    });
  });

  describe('combination modes', () => {
    it('should use "all" mode correctly - all evaluators must agree', () => {
      const strategy = new StrategyBuilder()
        .withMetadata('test', 'Test', 'Test', '1.0.0')
        .withDiceSelector(greedy())
        .withContinueEvaluators(
          thresholdBased(fixed(1000), []), // Says continue (500 < 1000)
          highRiskExit(0.2)                 // Says stop (0.3 >= 0.2)
        )
        .withCombinationMode({ type: 'all' })
        .build();

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 500
        },
        farkleRisk: 0.3
      });

      const decision = strategy.decideContinue(context);

      // Should stop because not ALL evaluators agree
      expect(decision.continue).toBe(false);
    });

    it('should use "any" mode correctly - any evaluator can continue', () => {
      const strategy = new StrategyBuilder()
        .withMetadata('test', 'Test', 'Test', '1.0.0')
        .withDiceSelector(greedy())
        .withContinueEvaluators(
          thresholdBased(fixed(500), []),   // Says stop (600 > 500)
          highRiskExit(0.5)                 // Says continue (0.3 < 0.5)
        )
        .withCombinationMode({ type: 'any' })
        .build();

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 600
        },
        farkleRisk: 0.3
      });

      const decision = strategy.decideContinue(context);

      // Should continue because at least one evaluator says continue
      expect(decision.continue).toBe(true);
    });

    it('should use "weighted" mode correctly - average of weights', () => {
      const strategy = new StrategyBuilder()
        .withMetadata('test', 'Test', 'Test', '1.0.0')
        .withDiceSelector(greedy())
        .withContinueEvaluators(
          thresholdBased(fixed(1000), []), // Says continue
          highRiskExit(0.5)                // Says continue
        )
        .withCombinationMode({ type: 'weighted' })
        .build();

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 500
        },
        farkleRisk: 0.3
      });

      const decision = strategy.decideContinue(context);

      // Both say continue, so weighted average should be > 0.5
      expect(decision.continue).toBe(true);
    });

    it('should use "priority" mode correctly - first non-neutral wins', () => {
      const strategy = new StrategyBuilder()
        .withMetadata('test', 'Test', 'Test', '1.0.0')
        .withDiceSelector(greedy())
        .withContinueEvaluators(
          thresholdBased(fixed(500), []),   // Says stop (600 > 500)
          highRiskExit(0.5)                 // Says continue
        )
        .withCombinationMode({ type: 'priority' })
        .build();

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 600
        },
        farkleRisk: 0.3
      });

      const decision = strategy.decideContinue(context);

      // Should stop because first evaluator says stop
      expect(decision.continue).toBe(false);
    });
  });

  describe('createThresholdStrategy helper', () => {
    it('should create a working strategy from threshold components', () => {
      const strategy = createThresholdStrategy(
        fixed(1000),
        [diceCountAdjustment()],
        greedy()
      );

      expect(strategy.id).toContain('threshold');
      expect(typeof strategy.selectDice).toBe('function');
      expect(typeof strategy.decideContinue).toBe('function');
    });

    it('should apply modifiers correctly', () => {
      const strategy = createThresholdStrategy(
        fixed(1000),
        [diceCountAdjustment()], // 0.65x at 2 dice = 650 threshold
        greedy()
      );

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 700,
          diceRemaining: 2
        }
      });

      const decision = strategy.decideContinue(context);

      // Should stop because 700 > 650 (1000 * 0.65)
      expect(decision.continue).toBe(false);
    });
  });

  describe('combineEvaluators helper', () => {
    it('should create a strategy from multiple evaluators', () => {
      const strategy = combineEvaluators(
        [
          thresholdBased(fixed(1000), []),
          highRiskExit(0.5)
        ],
        { type: 'all' },
        greedy()
      );

      expect(strategy.id).toContain('combined');
      expect(typeof strategy.selectDice).toBe('function');
      expect(typeof strategy.decideContinue).toBe('function');
    });

    it('should properly combine evaluators with specified mode', () => {
      const strategy = combineEvaluators(
        [
          thresholdBased(fixed(500), []),   // Says stop at 600
          highRiskExit(0.5)                 // Says continue at 0.3 risk
        ],
        { type: 'any' },
        greedy()
      );

      const context = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          turnPoints: 600
        },
        farkleRisk: 0.3
      });

      // With "any" mode, should continue because one evaluator says continue
      expect(strategy.decideContinue(context).continue).toBe(true);
    });
  });
});
