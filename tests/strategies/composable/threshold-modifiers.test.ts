import { describe, it, expect } from 'vitest';
import { diceCountAdjustment, riskAdjustment, rollCountAdjustment } from '../../../src/strategies/composable/threshold-modifiers';
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

describe('ThresholdModifiers', () => {
  describe('diceCountAdjustment()', () => {
    it('should return 1.0 (no adjustment) when many dice remain', () => {
      const modifier = diceCountAdjustment();

      const context6Dice = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 6
        }
      });

      expect(modifier(context6Dice)).toBe(1.0);
    });

    it('should return 1.0 when 4 or more dice remain', () => {
      const modifier = diceCountAdjustment();

      const context4Dice = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 4
        }
      });

      expect(modifier(context4Dice)).toBe(1.0);
    });

    it('should reduce threshold when 3 dice remain', () => {
      const modifier = diceCountAdjustment();

      const context3Dice = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 3
        }
      });

      expect(modifier(context3Dice)).toBeLessThan(1.0);
      expect(modifier(context3Dice)).toBeGreaterThan(0.5);
    });

    it('should significantly reduce threshold when 2 dice remain', () => {
      const modifier = diceCountAdjustment();

      const context2Dice = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 2
        }
      });

      expect(modifier(context2Dice)).toBeLessThan(0.8);
    });

    it('should maximally reduce threshold when 1 die remains', () => {
      const modifier = diceCountAdjustment();

      const context1Die = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          diceRemaining: 1
        }
      });

      expect(modifier(context1Die)).toBeLessThan(0.6);
    });

    it('should have decreasing multipliers as dice count decreases', () => {
      const modifier = diceCountAdjustment();

      const multipliers = [6, 5, 4, 3, 2, 1].map(diceCount => {
        const context = createTestContext({
          turnState: {
            ...createTestContext().turnState,
            diceRemaining: diceCount
          }
        });
        return modifier(context);
      });

      // Should be monotonically decreasing or equal
      for (let i = 1; i < multipliers.length; i++) {
        expect(multipliers[i]).toBeLessThanOrEqual(multipliers[i - 1]);
      }
    });

    it('should have proper metadata', () => {
      const modifier = diceCountAdjustment();

      expect(modifier.name).toBe('dice-count-adjustment');
      expect(modifier.description).toContain('dice');
    });
  });

  describe('riskAdjustment()', () => {
    it('should return 1.0 when farkle risk is very low', () => {
      const modifier = riskAdjustment();

      const lowRisk = createTestContext({
        farkleRisk: 0.1
      });

      expect(modifier(lowRisk)).toBe(1.0);
    });

    it('should reduce threshold as risk increases', () => {
      const modifier = riskAdjustment();

      const mediumRisk = createTestContext({ farkleRisk: 0.35 });
      const highRisk = createTestContext({ farkleRisk: 0.5 });

      const mediumMultiplier = modifier(mediumRisk);
      const highMultiplier = modifier(highRisk);

      expect(mediumMultiplier).toBeLessThan(1.0);
      expect(highMultiplier).toBeLessThan(mediumMultiplier);
    });

    it('should significantly reduce threshold at very high risk', () => {
      const modifier = riskAdjustment();

      const veryHighRisk = createTestContext({
        farkleRisk: 0.7
      });

      expect(modifier(veryHighRisk)).toBeLessThan(0.7);
    });

    it('should return multiplier between 0.5 and 1.0', () => {
      const modifier = riskAdjustment();

      // Test various risk levels
      const risks = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

      risks.forEach(risk => {
        const context = createTestContext({ farkleRisk: risk });
        const multiplier = modifier(context);

        expect(multiplier).toBeGreaterThanOrEqual(0.4); // Should never go below ~0.4
        expect(multiplier).toBeLessThanOrEqual(1.0);
      });
    });

    it('should have proper metadata', () => {
      const modifier = riskAdjustment();

      expect(modifier.name).toBe('risk-adjustment');
      expect(modifier.description).toContain('risk');
    });
  });

  describe('rollCountAdjustment()', () => {
    it('should return 1.0 on first roll', () => {
      const modifier = rollCountAdjustment();

      const firstRoll = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          rollNumber: 1
        }
      });

      expect(modifier(firstRoll)).toBe(1.0);
    });

    it('should slightly increase threshold on second roll', () => {
      const modifier = rollCountAdjustment();

      const secondRoll = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          rollNumber: 2
        }
      });

      const multiplier = modifier(secondRoll);
      expect(multiplier).toBeGreaterThan(1.0);
      expect(multiplier).toBeLessThan(1.2);
    });

    it('should increase threshold more after many rolls', () => {
      const modifier = rollCountAdjustment();

      const manyRolls = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          rollNumber: 5
        }
      });

      expect(modifier(manyRolls)).toBeGreaterThan(1.3);
    });

    it('should have increasing multipliers as roll count increases', () => {
      const modifier = rollCountAdjustment();

      const multipliers = [1, 2, 3, 4, 5, 6].map(rollNumber => {
        const context = createTestContext({
          turnState: {
            ...createTestContext().turnState,
            rollNumber
          }
        });
        return modifier(context);
      });

      // Should be monotonically increasing
      for (let i = 1; i < multipliers.length; i++) {
        expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
      }
    });

    it('should cap increase at reasonable level', () => {
      const modifier = rollCountAdjustment();

      const manyRolls = createTestContext({
        turnState: {
          ...createTestContext().turnState,
          rollNumber: 10
        }
      });

      // Should increase but not go crazy (< 2x)
      expect(modifier(manyRolls)).toBeLessThan(2.0);
    });

    it('should have proper metadata', () => {
      const modifier = rollCountAdjustment();

      expect(modifier.name).toBe('roll-count-adjustment');
      expect(modifier.description).toContain('roll');
    });
  });
});
