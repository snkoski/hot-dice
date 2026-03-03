/**
 * Approximate farkle probability by dice count (1-6).
 * Based on combinatorial analysis of scoring dice.
 */
const FARKLE_RISKS: Record<number, number> = {
  1: 0.667,
  2: 0.444,
  3: 0.278,
  4: 0.154,
  5: 0.077,
  6: 0.023,
};

export function calculateFarkleRisk(diceRemaining: number): number {
  return FARKLE_RISKS[diceRemaining] ?? 0.5;
}
