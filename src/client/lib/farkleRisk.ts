/**
 * Calculate farkle risk based on dice remaining
 */
export function calculateFarkleRisk(diceRemaining: number): number {
  const risks: Record<number, number> = { 1: 0.667, 2: 0.444, 3: 0.278, 4: 0.154, 5: 0.077, 6: 0.023 };
  return risks[diceRemaining] || 0.5;
}
