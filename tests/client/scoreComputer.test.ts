import { describe, it, expect } from 'vitest';
import { computeScoreForSelectedDice } from '../../src/client/lib/scoreComputer';

describe('computeScoreForSelectedDice', () => {
  it('returns empty array for empty selection', () => {
    const combos = [
      { type: 'SINGLE_ONE', dice: [1], points: 100, diceIndices: [0] },
    ];
    const result = computeScoreForSelectedDice([], combos as any, [1, 2, 3, 4, 5, 6]);
    expect(result).toEqual([]);
  });

  it('handles single 1', () => {
    const combos = [
      { type: 'SINGLE_ONE', dice: [1], points: 100, diceIndices: [0] },
    ];
    const result = computeScoreForSelectedDice([0], combos as any, [1, 2, 3, 4, 5, 6]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('SINGLE_ONE');
    expect(result[0].points).toBe(100);
  });

  it('handles single 5', () => {
    const combos = [
      { type: 'SINGLE_FIVE', dice: [5], points: 50, diceIndices: [2] },
    ];
    const result = computeScoreForSelectedDice([2], combos as any, [1, 2, 3, 5, 4, 6]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('SINGLE_FIVE');
    expect(result[0].points).toBe(50);
  });

  it('handles STRAIGHT whole-hand', () => {
    const combos = [
      { type: 'STRAIGHT', dice: [1, 2, 3, 4, 5, 6], points: 1500, diceIndices: [0, 1, 2, 3, 4, 5] },
    ];
    const dice = [1, 2, 3, 4, 5, 6];
    const result = computeScoreForSelectedDice([0, 1, 2, 3, 4, 5], combos as any, dice);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('STRAIGHT');
    expect(result[0].points).toBe(1500);
  });

  it('handles THREE_PAIRS whole-hand', () => {
    const combos = [
      { type: 'THREE_PAIRS', dice: [1, 1, 2, 2, 3, 3], points: 1500, diceIndices: [0, 1, 2, 3, 4, 5] },
    ];
    const dice = [1, 1, 2, 2, 3, 3];
    const result = computeScoreForSelectedDice([0, 1, 2, 3, 4, 5], combos as any, dice);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('THREE_PAIRS');
    expect(result[0].points).toBe(1500);
  });

  it('handles 3 ones from roll of 4 ones (THREE_OF_KIND fallback)', () => {
    const combos = [
      { type: 'FOUR_OF_KIND', dice: [1, 1, 1, 1], points: 2000, diceIndices: [0, 1, 2, 3] },
      { type: 'THREE_OF_KIND', dice: [1, 1, 1], points: 1000, diceIndices: [0, 1, 2] },
    ];
    const dice = [1, 1, 1, 1, 2, 3];
    const result = computeScoreForSelectedDice([0, 1, 2], combos as any, dice);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('THREE_OF_KIND');
    expect(result[0].points).toBe(1000);
    expect(result[0].diceIndices).toEqual([0, 1, 2]);
  });

  it('handles mixed selection: three 5s + single 1', () => {
    const combos = [
      { type: 'THREE_OF_KIND', dice: [5, 5, 5], points: 500, diceIndices: [0, 1, 2] },
      { type: 'SINGLE_ONE', dice: [1], points: 100, diceIndices: [3] },
    ];
    const dice = [5, 5, 5, 1, 2, 4];
    const result = computeScoreForSelectedDice([0, 1, 2, 3], combos as any, dice);
    expect(result).toHaveLength(2);
    const types = result.map((r) => r.type).sort();
    expect(types).toContain('THREE_OF_KIND');
    expect(types).toContain('SINGLE_ONE');
    expect(result.reduce((s, c) => s + c.points, 0)).toBe(600);
  });
});
