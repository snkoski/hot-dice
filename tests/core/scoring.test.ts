import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '../../src/core/scoring';
import { ScoreType } from '../../src/core/types';
import type { DiceRoll } from '../../src/core/types';

describe('ScoringEngine', () => {
  const engine = new ScoringEngine();

  describe('single 1s and 5s', () => {
    it('should score a single 1 as 100 points', () => {
      const dice: DiceRoll = [1, 2, 3, 4, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(100);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.SINGLE_ONE);
      expect(result.combinations[0].points).toBe(100);
      expect(result.combinations[0].dice).toEqual([1]);
      expect(result.isFarkle).toBe(false);
    });

    it('should score a single 5 as 50 points', () => {
      const dice: DiceRoll = [5, 2, 3, 4, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(50);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.SINGLE_FIVE);
      expect(result.combinations[0].points).toBe(50);
      expect(result.combinations[0].dice).toEqual([5]);
    });

    it('should score multiple 1s', () => {
      const dice: DiceRoll = [1, 1, 2, 3, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(200);
      expect(result.combinations).toHaveLength(2);
    });

    it('should score multiple 5s', () => {
      const dice: DiceRoll = [5, 5, 2, 3, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(100);
      expect(result.combinations).toHaveLength(2);
    });

    it('should score both 1s and 5s', () => {
      const dice: DiceRoll = [1, 5, 2, 3, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(150);
      expect(result.combinations).toHaveLength(2);
    });
  });

  describe('three of a kind', () => {
    it('should score three 1s as 1000 points', () => {
      const dice: DiceRoll = [1, 1, 1, 2, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1000);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.THREE_OF_KIND);
      expect(result.combinations[0].points).toBe(1000);
      expect(result.combinations[0].dice).toEqual([1, 1, 1]);
    });

    it('should score three 2s as 200 points', () => {
      const dice: DiceRoll = [2, 2, 2, 3, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(200);
      expect(result.combinations[0].points).toBe(200);
    });

    it('should score three 3s as 300 points', () => {
      const dice: DiceRoll = [3, 3, 3, 2, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(300);
    });

    it('should score three 4s as 400 points', () => {
      const dice: DiceRoll = [4, 4, 4, 2, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(400);
    });

    it('should score three 5s as 500 points', () => {
      const dice: DiceRoll = [5, 5, 5, 2, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(500);
    });

    it('should score three 6s as 600 points', () => {
      const dice: DiceRoll = [6, 6, 6, 2, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(600);
    });

    it('should score three of a kind plus single 1', () => {
      const dice: DiceRoll = [2, 2, 2, 1, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(300); // 200 + 100
      expect(result.combinations).toHaveLength(2);
    });

    it('should score three of a kind plus single 5', () => {
      const dice: DiceRoll = [3, 3, 3, 5, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(350); // 300 + 50
      expect(result.combinations).toHaveLength(2);
    });
  });

  describe('four of a kind', () => {
    it('should score four 1s as 2000 points', () => {
      const dice: DiceRoll = [1, 1, 1, 1, 2];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(2000);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.FOUR_OF_KIND);
      expect(result.combinations[0].points).toBe(2000);
    });

    it('should score four 2s as 400 points', () => {
      const dice: DiceRoll = [2, 2, 2, 2, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(400);
    });

    it('should score four 5s as 1000 points', () => {
      const dice: DiceRoll = [5, 5, 5, 5, 2];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1000);
    });

    it('should score four 6s as 1200 points', () => {
      const dice: DiceRoll = [6, 6, 6, 6, 2];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1200);
    });
  });

  describe('five of a kind', () => {
    it('should score five 1s as 3000 points', () => {
      const dice: DiceRoll = [1, 1, 1, 1, 1];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(3000);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.FIVE_OF_KIND);
      expect(result.combinations[0].points).toBe(3000);
    });

    it('should score five 2s as 600 points', () => {
      const dice: DiceRoll = [2, 2, 2, 2, 2];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(600);
    });

    it('should score five 5s as 1500 points', () => {
      const dice: DiceRoll = [5, 5, 5, 5, 5];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1500);
    });
  });

  describe('six of a kind', () => {
    it('should score six 1s as 4000 points', () => {
      const dice: DiceRoll = [1, 1, 1, 1, 1, 1];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(4000);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.SIX_OF_KIND);
      expect(result.combinations[0].points).toBe(4000);
    });

    it('should score six 2s as 800 points', () => {
      const dice: DiceRoll = [2, 2, 2, 2, 2, 2];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(800);
    });

    it('should score six 6s as 2400 points', () => {
      const dice: DiceRoll = [6, 6, 6, 6, 6, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(2400);
    });
  });

  describe('straight (1-2-3-4-5-6)', () => {
    it('should score a straight as 1500 points', () => {
      const dice: DiceRoll = [1, 2, 3, 4, 5, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1500);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.STRAIGHT);
      expect(result.combinations[0].points).toBe(1500);
    });

    it('should score a straight regardless of order', () => {
      const dice: DiceRoll = [3, 1, 5, 2, 6, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1500);
      expect(result.combinations[0].type).toBe(ScoreType.STRAIGHT);
    });
  });

  describe('three pairs', () => {
    it('should score three pairs as 1500 points', () => {
      const dice: DiceRoll = [1, 1, 2, 2, 3, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1500);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.THREE_PAIRS);
      expect(result.combinations[0].points).toBe(1500);
    });

    it('should score three pairs regardless of order', () => {
      const dice: DiceRoll = [5, 2, 5, 6, 2, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1500);
    });

    it('should score three pairs with different values', () => {
      const dice: DiceRoll = [4, 4, 6, 6, 1, 1];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1500);
    });
  });

  describe('farkle', () => {
    it('should detect farkle with no scoring dice', () => {
      const dice: DiceRoll = [2, 3, 4, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.isFarkle).toBe(true);
      expect(result.totalPoints).toBe(0);
      expect(result.combinations).toHaveLength(0);
    });

    it('should detect farkle with all non-scoring values', () => {
      const dice: DiceRoll = [2, 2, 3, 4, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.isFarkle).toBe(true);
      expect(result.totalPoints).toBe(0);
    });

    it('should not be farkle if any dice score', () => {
      const dice: DiceRoll = [1, 2, 3, 4, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.isFarkle).toBe(false);
    });
  });

  describe('hot dice', () => {
    it('should detect hot dice when all 6 dice score', () => {
      const dice: DiceRoll = [1, 1, 1, 5, 5, 5];
      const result = engine.analyzeRoll(dice);

      expect(result.isHotDice).toBe(true);
      expect(result.scoringDiceCount).toBe(6);
      expect(result.totalPoints).toBe(1500); // 1000 + 500
    });

    it('should detect hot dice with straight', () => {
      const dice: DiceRoll = [1, 2, 3, 4, 5, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.isHotDice).toBe(true);
      expect(result.scoringDiceCount).toBe(6);
    });

    it('should detect hot dice with three pairs', () => {
      const dice: DiceRoll = [1, 1, 2, 2, 3, 3];
      const result = engine.analyzeRoll(dice);

      expect(result.isHotDice).toBe(true);
    });

    it('should detect hot dice with six of a kind', () => {
      const dice: DiceRoll = [4, 4, 4, 4, 4, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.isHotDice).toBe(true);
    });

    it('should not be hot dice if only 5 dice score', () => {
      const dice: DiceRoll = [1, 1, 1, 5, 5, 2];
      const result = engine.analyzeRoll(dice);

      expect(result.isHotDice).toBe(false);
      expect(result.scoringDiceCount).toBe(5);
    });

    it('should not be hot dice with fewer than 6 dice', () => {
      const dice: DiceRoll = [1, 1, 1, 5];
      const result = engine.analyzeRoll(dice);

      expect(result.isHotDice).toBe(false);
    });
  });

  describe('non-scoring dice', () => {
    it('should identify non-scoring dice', () => {
      const dice: DiceRoll = [1, 2, 3, 5, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.nonScoringDice).toHaveLength(3);
      expect(result.nonScoringDice).toContain(2);
      expect(result.nonScoringDice).toContain(3);
      expect(result.nonScoringDice).toContain(6);
    });

    it('should have no non-scoring dice when all score', () => {
      const dice: DiceRoll = [1, 1, 1, 5, 5, 5];
      const result = engine.analyzeRoll(dice);

      expect(result.nonScoringDice).toHaveLength(0);
    });
  });

  describe('scoring dice count', () => {
    it('should count single scoring dice', () => {
      const dice: DiceRoll = [1, 2, 3, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.scoringDiceCount).toBe(1);
    });

    it('should count three of a kind as 3 dice', () => {
      const dice: DiceRoll = [2, 2, 2, 3, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.scoringDiceCount).toBe(3);
    });

    it('should count all scoring dice', () => {
      const dice: DiceRoll = [1, 1, 1, 5, 2];
      const result = engine.analyzeRoll(dice);

      expect(result.scoringDiceCount).toBe(4);
    });
  });

  describe('dice indices tracking', () => {
    it('should track which dice indices are used', () => {
      const dice: DiceRoll = [1, 2, 3, 5, 6];
      const result = engine.analyzeRoll(dice);

      const oneCombo = result.combinations.find(c => c.type === ScoreType.SINGLE_ONE);
      const fiveCombo = result.combinations.find(c => c.type === ScoreType.SINGLE_FIVE);

      expect(oneCombo?.diceIndices).toEqual([0]);
      expect(fiveCombo?.diceIndices).toEqual([3]);
    });

    it('should track indices for three of a kind', () => {
      const dice: DiceRoll = [2, 3, 2, 2, 4];
      const result = engine.analyzeRoll(dice);

      expect(result.combinations[0].diceIndices).toHaveLength(3);
      expect(result.combinations[0].diceIndices).toContain(0);
      expect(result.combinations[0].diceIndices).toContain(2);
      expect(result.combinations[0].diceIndices).toContain(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty dice array', () => {
      const dice: DiceRoll = [];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(0);
      expect(result.combinations).toHaveLength(0);
      expect(result.isFarkle).toBe(true);
      expect(result.isHotDice).toBe(false);
    });

    it('should handle single die', () => {
      const dice: DiceRoll = [1];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(100);
      expect(result.isFarkle).toBe(false);
    });

    it('should prioritize special patterns over individual scoring', () => {
      // Straight should be worth more than individual 1s and 5s
      const dice: DiceRoll = [1, 2, 3, 4, 5, 6];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(1500);
      expect(result.combinations).toHaveLength(1);
      expect(result.combinations[0].type).toBe(ScoreType.STRAIGHT);
    });

    it('should handle maximum scoring roll', () => {
      const dice: DiceRoll = [1, 1, 1, 1, 1, 1];
      const result = engine.analyzeRoll(dice);

      expect(result.totalPoints).toBe(4000);
      expect(result.isHotDice).toBe(true);
    });
  });
});
