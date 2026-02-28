import { describe, it, expect } from 'vitest';
import {
  greedy,
  minimumValue,
  preferLargeCombos,
  keepMinimum,
  conditionalByDiceCount
} from '../../../src/strategies/composable/dice-selectors';
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

describe('DiceSelectors', () => {
  describe('greedy()', () => {
    it('should select all available combinations', () => {
      const selector = greedy();

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1),
        createCombination(ScoreType.THREE_OF_KIND, 300, 3)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(3);
      expect(selected).toEqual(combos);
    });

    it('should return empty array when no combinations available', () => {
      const selector = greedy();

      const context = createTestContext();
      const selected = selector(context, []);

      expect(selected).toHaveLength(0);
    });

    it('should have proper metadata', () => {
      const selector = greedy();

      expect(selector.name).toBe('greedy');
      expect(selector.description).toContain('all');
    });
  });

  describe('minimumValue()', () => {
    it('should only select combinations above minimum value', () => {
      const selector = minimumValue(100);

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1),
        createCombination(ScoreType.THREE_OF_KIND, 300, 3)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      // Only 300 is above 100 (100 and 50 are not strictly greater)
      expect(selected).toHaveLength(1);
      expect(selected[0].points).toBe(300);
    });

    it('should exclude combinations exactly at minimum value', () => {
      const selector = minimumValue(100);

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(0);
    });

    it('should return empty if all combinations below minimum', () => {
      const selector = minimumValue(200);

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(0);
    });

    it('should work with different minimum values', () => {
      const selector50 = minimumValue(50);
      const selector300 = minimumValue(300);

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1),
        createCombination(ScoreType.THREE_OF_KIND, 500, 3)
      ];

      const context = createTestContext();

      expect(selector50(context, combos)).toHaveLength(2); // 100 and 500
      expect(selector300(context, combos)).toHaveLength(1); // only 500
    });

    it('should have proper metadata', () => {
      const selector = minimumValue(150);

      expect(selector.name).toBe('minimum-value');
      expect(selector.description).toContain('150');
    });
  });

  describe('preferLargeCombos()', () => {
    it('should prefer three-of-a-kind over single dice', () => {
      const selector = preferLargeCombos();

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.THREE_OF_KIND, 300, 3),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      // Should only select the three-of-a-kind
      expect(selected).toHaveLength(1);
      expect(selected[0].type).toBe(ScoreType.THREE_OF_KIND);
    });

    it('should select all large combos if multiple exist', () => {
      const selector = preferLargeCombos();

      const combos = [
        createCombination(ScoreType.THREE_OF_KIND, 300, 3),
        createCombination(ScoreType.FOUR_OF_KIND, 600, 4),
        createCombination(ScoreType.SINGLE_ONE, 100, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(2);
      expect(selected[0].type).toBe(ScoreType.THREE_OF_KIND);
      expect(selected[1].type).toBe(ScoreType.FOUR_OF_KIND);
    });

    it('should select single dice if no large combos available', () => {
      const selector = preferLargeCombos();

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(2);
    });

    it('should handle straights and three pairs as large combos', () => {
      const selector = preferLargeCombos();

      const combos = [
        createCombination(ScoreType.STRAIGHT, 1500, 6),
        createCombination(ScoreType.SINGLE_ONE, 100, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(1);
      expect(selected[0].type).toBe(ScoreType.STRAIGHT);
    });

    it('should have proper metadata', () => {
      const selector = preferLargeCombos();

      expect(selector.name).toBe('prefer-large-combos');
      expect(selector.description).toContain('large');
    });
  });

  describe('keepMinimum()', () => {
    it('should select only the highest value combination', () => {
      const selector = keepMinimum();

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.THREE_OF_KIND, 300, 3),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(1);
      expect(selected[0].points).toBe(300);
    });

    it('should select first combo if multiple have same highest value', () => {
      const selector = keepMinimum();

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_ONE, 100, 1)
      ];

      const context = createTestContext();
      const selected = selector(context, combos);

      expect(selected).toHaveLength(1);
      expect(selected[0].points).toBe(100);
    });

    it('should return empty array if no combinations', () => {
      const selector = keepMinimum();

      const context = createTestContext();
      const selected = selector(context, []);

      expect(selected).toHaveLength(0);
    });

    it('should have proper metadata', () => {
      const selector = keepMinimum();

      expect(selector.name).toBe('keep-minimum');
      expect(selector.description).toContain('fewest');
    });
  });

  describe('conditionalByDiceCount()', () => {
    it('should use high dice selector when above threshold', () => {
      const highSelector = greedy();
      const lowSelector = keepMinimum();
      const selector = conditionalByDiceCount(highSelector, lowSelector, 3);

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1)
      ];

      const contextManyDice = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 5
        }
      });

      const selected = selector(contextManyDice, combos);

      // Should use greedy - select all
      expect(selected).toHaveLength(2);
    });

    it('should use low dice selector when at or below threshold', () => {
      const highSelector = greedy();
      const lowSelector = keepMinimum();
      const selector = conditionalByDiceCount(highSelector, lowSelector, 3);

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1)
      ];

      const contextFewDice = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 3
        }
      });

      const selected = selector(contextFewDice, combos);

      // Should use keepMinimum - select only highest
      expect(selected).toHaveLength(1);
      expect(selected[0].points).toBe(100);
    });

    it('should switch behavior at exact threshold', () => {
      const selector = conditionalByDiceCount(greedy(), keepMinimum(), 4);

      const combos = [
        createCombination(ScoreType.SINGLE_ONE, 100, 1),
        createCombination(ScoreType.SINGLE_FIVE, 50, 1)
      ];

      const context4Dice = createTestContext({
        turnState: { ...createTestContext().turnState, diceRemaining: 4 }
      });
      const context5Dice = createTestContext({
        turnState: { ...createTestContext().turnState, diceRemaining: 5 }
      });

      // At threshold - use low selector
      expect(selector(context4Dice, combos)).toHaveLength(1);

      // Above threshold - use high selector
      expect(selector(context5Dice, combos)).toHaveLength(2);
    });

    it('should have proper metadata', () => {
      const selector = conditionalByDiceCount(greedy(), keepMinimum(), 3);

      expect(selector.name).toBe('conditional-by-dice-count');
      expect(selector.description).toContain('dice');
      expect(selector.description).toContain('3');
    });
  });
});
