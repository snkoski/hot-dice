import type { ScoringCombination } from '../types/game';

/**
 * Given selected die indices, compute the best scoring combinations.
 * Greedily applies n-of-a-kind first, then singles.
 * Falls back to manual THREE_OF_KIND for 1s/5s when only smaller n-of-a-kind
 * options are present in the server list.
 */
export function computeScoreForSelectedDice(
  selectedIndices: number[],
  scoringCombinations: ScoringCombination[],
  diceRolled: number[]
): ScoringCombination[] {
  if (selectedIndices.length === 0) return [];

  const selectedSet = new Set(selectedIndices);
  const wholeHand = scoringCombinations.find(
    (c) =>
      (c.type === 'STRAIGHT' || c.type === 'THREE_PAIRS') &&
      c.diceIndices.length === selectedIndices.length &&
      c.diceIndices.every((i) => selectedSet.has(i))
  );
  if (wholeHand) return [wholeHand];

  const byValue: Record<number, number[]> = {};
  for (const i of selectedIndices) {
    const v = diceRolled[i];
    if (!byValue[v]) byValue[v] = [];
    byValue[v].push(i);
  }

  const resultCombos: ScoringCombination[] = [];

  for (const [vStr, indices] of Object.entries(byValue)) {
    const v = parseInt(vStr);
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
        resultCombos.push({ ...nc, diceIndices: remaining.slice(0, nc.diceIndices.length) });
        remaining = remaining.slice(nc.diceIndices.length);
        break;
      }
    }

    if (remaining.length >= 3 && (v === 1 || v === 5)) {
      const baseScore = v === 1 ? 1000 : v * 100;
      resultCombos.push({
        type: 'THREE_OF_KIND' as any,
        dice: Array(3).fill(v),
        points: baseScore,
        diceIndices: remaining.slice(0, 3),
      });
      remaining = remaining.slice(3);
    }

    for (const i of remaining) {
      const single = scoringCombinations.find(
        (c) => (c.type === 'SINGLE_ONE' || c.type === 'SINGLE_FIVE') && c.diceIndices.includes(i)
      );
      if (single) resultCombos.push(single);
    }
  }

  return resultCombos;
}
