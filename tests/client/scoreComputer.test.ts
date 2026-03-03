import { describe, it, expect } from 'vitest';
import { computeScoreForSelectedDice } from '../../src/client/lib/scoreComputer';
import type { ScoringCombination } from '../../src/client/types/game';

describe('computeScoreForSelectedDice', () => {
  it('identifies singles', () => {
    const combos: ScoringCombination[] = [
      { type: 'SINGLE_ONE', dice: [1], points: 100, diceIndices: [0] },
      { type: 'SINGLE_FIVE', dice: [5], points: 50, diceIndices: [2] }
    ] as any;
    const rolled = [1, 2, 5, 3, 4, 6];
    
    const res = computeScoreForSelectedDice([0], combos, rolled);
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('SINGLE_ONE');
  });

  it('identifies whole hands like STRAIGHT', () => {
    const combos: ScoringCombination[] = [
      { type: 'STRAIGHT', dice: [1,2,3,4,5,6], points: 1500, diceIndices: [0,1,2,3,4,5] }
    ] as any;
    const rolled = [1, 2, 3, 4, 5, 6];

    const res = computeScoreForSelectedDice([0, 1, 2, 3, 4, 5], combos, rolled);
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('STRAIGHT');
  });

  it('falls back to manual three of a kind if needed', () => {
    const combos: ScoringCombination[] = [
      { type: 'FOUR_OF_KIND', dice: [1,1,1,1], points: 2000, diceIndices: [0,1,2,3] }
    ] as any;
    const rolled = [1, 1, 1, 1, 2, 3];

    // Selecting 3 out of 4 ones
    const res = computeScoreForSelectedDice([0, 1, 2], combos, rolled);
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('THREE_OF_KIND');
    expect(res[0].points).toBe(1000);
  });
});
