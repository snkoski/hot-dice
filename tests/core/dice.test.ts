import { describe, it, expect } from 'vitest';
import { DiceRoller } from '../../src/core/dice';
import type { DieValue } from '../../src/core/types';

describe('DiceRoller', () => {
  describe('constructor', () => {
    it('should create a dice roller without seed', () => {
      const roller = new DiceRoller();
      expect(roller).toBeDefined();
    });

    it('should create a dice roller with seed', () => {
      const roller = new DiceRoller(12345);
      expect(roller).toBeDefined();
    });
  });

  describe('rollSingle', () => {
    it('should return a value between 1 and 6', () => {
      const roller = new DiceRoller();
      const roll = roller.rollSingle();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    });

    it('should return an integer', () => {
      const roller = new DiceRoller();
      const roll = roller.rollSingle();
      expect(Number.isInteger(roll)).toBe(true);
    });

    it('should generate reproducible results with same seed', () => {
      const roller1 = new DiceRoller(42);
      const roller2 = new DiceRoller(42);

      const roll1 = roller1.rollSingle();
      const roll2 = roller2.rollSingle();

      expect(roll1).toBe(roll2);
    });

    it('should generate different results with different seeds', () => {
      const roller1 = new DiceRoller(42);
      const roller2 = new DiceRoller(43);

      const rolls1: DieValue[] = [];
      const rolls2: DieValue[] = [];

      for (let i = 0; i < 10; i++) {
        rolls1.push(roller1.rollSingle());
        rolls2.push(roller2.rollSingle());
      }

      // At least one roll should be different
      expect(rolls1).not.toEqual(rolls2);
    });
  });

  describe('roll', () => {
    it('should roll the specified number of dice', () => {
      const roller = new DiceRoller();
      const roll = roller.roll(6);
      expect(roll).toHaveLength(6);
    });

    it('should roll 1 die', () => {
      const roller = new DiceRoller();
      const roll = roller.roll(1);
      expect(roll).toHaveLength(1);
    });

    it('should roll 0 dice and return empty array', () => {
      const roller = new DiceRoller();
      const roll = roller.roll(0);
      expect(roll).toHaveLength(0);
    });

    it('should return all values between 1 and 6', () => {
      const roller = new DiceRoller();
      const roll = roller.roll(6);

      for (const die of roll) {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
        expect(Number.isInteger(die)).toBe(true);
      }
    });

    it('should generate reproducible results with same seed', () => {
      const roller1 = new DiceRoller(123);
      const roller2 = new DiceRoller(123);

      const roll1 = roller1.roll(6);
      const roll2 = roller2.roll(6);

      expect(roll1).toEqual(roll2);
    });

    it('should generate multiple reproducible rolls in sequence', () => {
      const roller1 = new DiceRoller(999);
      const roller2 = new DiceRoller(999);

      for (let i = 0; i < 5; i++) {
        const roll1 = roller1.roll(6);
        const roll2 = roller2.roll(6);
        expect(roll1).toEqual(roll2);
      }
    });
  });

  describe('reset', () => {
    it('should reset RNG to same seed', () => {
      const roller = new DiceRoller(456);
      const firstRoll = roller.roll(6);

      roller.reset(456);
      const secondRoll = roller.roll(6);

      expect(firstRoll).toEqual(secondRoll);
    });

    it('should reset RNG to new seed', () => {
      const roller = new DiceRoller(100);
      roller.roll(6);

      roller.reset(200);
      const roll1 = roller.roll(6);

      const roller2 = new DiceRoller(200);
      const roll2 = roller2.roll(6);

      expect(roll1).toEqual(roll2);
    });

    it('should reset RNG without seed (random)', () => {
      const roller = new DiceRoller(555);
      const firstRoll = roller.roll(6);

      roller.reset();
      const secondRoll = roller.roll(6);

      // Should work but results will likely be different (not guaranteed)
      expect(secondRoll).toHaveLength(6);
    });
  });

  describe('distribution', () => {
    it('should eventually roll all values 1-6', () => {
      const roller = new DiceRoller();
      const seen = new Set<DieValue>();

      // Roll 100 times, should see all values
      for (let i = 0; i < 100; i++) {
        seen.add(roller.rollSingle());
        if (seen.size === 6) break;
      }

      expect(seen.size).toBe(6);
      expect(seen.has(1 as DieValue)).toBe(true);
      expect(seen.has(2 as DieValue)).toBe(true);
      expect(seen.has(3 as DieValue)).toBe(true);
      expect(seen.has(4 as DieValue)).toBe(true);
      expect(seen.has(5 as DieValue)).toBe(true);
      expect(seen.has(6 as DieValue)).toBe(true);
    });

    it('should have roughly uniform distribution over many rolls', () => {
      const roller = new DiceRoller(777);
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const totalRolls = 6000;

      for (let i = 0; i < totalRolls; i++) {
        const roll = roller.rollSingle();
        counts[roll]++;
      }

      // Each value should appear roughly 1000 times (1/6 of 6000)
      // Allow 15% margin of error
      const expected = totalRolls / 6;
      const margin = expected * 0.15;

      for (let i = 1; i <= 6; i++) {
        expect(counts[i as DieValue]).toBeGreaterThan(expected - margin);
        expect(counts[i as DieValue]).toBeLessThan(expected + margin);
      }
    });
  });
});
