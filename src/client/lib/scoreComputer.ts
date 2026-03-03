import type { ScoringCombination } from '../types/game';
import type { DieValue } from '../types/game';
import { ScoreType } from './enums';

/**
 * Compute scoring combinations for a set of selected dice indices.
 * Handles STRAIGHT/THREE_PAIRS whole-hand detection, greedy n-of-a-kind,
 * and THREE_OF_KIND fallback for 1s/5s when user selects 3 from a larger set.
 */
export function computeScoreForSelectedDice(
  selectedIndices: number[],
  scoringCombinations: ScoringCombination[],
  diceRolled: DieValue[] | number[]
): ScoringCombination[] {
  if (selectedIndices.length > 0) {
    const selectedSet = new Set(selectedIndices);
    const wholeHand = scoringCombinations.find(
      (c) =>
        (c.type === 'STRAIGHT' || c.type === 'THREE_PAIRS') &&
        c.diceIndices.length === selectedIndices.length &&
        c.diceIndices.every((i: number) => selectedSet.has(i))
    );
    if (wholeHand) return [wholeHand];
  }

  const byValue: Record<number, number[]> = {};
  for (const i of selectedIndices) {
    const v = diceRolled[i] as number;
    if (!byValue[v]) byValue[v] = [];
    byValue[v].push(i);
  }

  const resultCombos: ScoringCombination[] = [];

  for (const [vStr, indices] of Object.entries(byValue)) {
    const v = parseInt(vStr, 10);
    let remaining = [...indices];

    const nCombos = scoringCombinations
      .filter(
        (c) =>
          ['THREE_OF_KIND', 'FOUR_OF_KIND', 'FIVE_OF_KIND', 'SIX_OF_KIND'].includes(c.type) &&
          c.dice[0] === v
      )
      .sort((a, b) => b.diceIndices.length - a.diceIndices.length);

    for (const nc of nCombos) {
      if (remaining.length >= nc.diceIndices.length) {
        resultCombos.push({
          ...nc,
          diceIndices: remaining.slice(0, nc.diceIndices.length),
        });
        remaining = remaining.slice(nc.diceIndices.length);
        break;
      }
    }

    if (remaining.length >= 3 && (v === 1 || v === 5)) {
      const baseScore = v === 1 ? 1000 : v * 100;
      resultCombos.push({
        type: ScoreType.THREE_OF_KIND,
        dice: Array(3).fill(v) as DieValue[],
        points: baseScore,
        diceIndices: remaining.slice(0, 3),
      });
      remaining = remaining.slice(3);
    }

    for (const i of remaining) {
      const single = scoringCombinations.find(
        (c) =>
          (c.type === 'SINGLE_ONE' || c.type === 'SINGLE_FIVE') && c.diceIndices.includes(i)
      );
      if (single) resultCombos.push(single);
    }
  }

  return resultCombos;
}
