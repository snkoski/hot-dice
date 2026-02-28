/**
 * Threshold Modifier Functions
 *
 * These functions return multipliers that adjust thresholds based on context.
 * - 1.0 = no change
 * - < 1.0 = reduce threshold (more conservative)
 * - > 1.0 = increase threshold (more aggressive)
 */

import type { ThresholdModifier } from './types';
import type { StrategyContext } from '../../core/types';

/**
 * Creates a modifier that adjusts threshold based on remaining dice count
 *
 * When fewer dice remain, the probability of farkle increases, so this
 * modifier reduces the threshold to encourage banking points earlier.
 *
 * @returns A threshold modifier function
 *
 * @example
 * const modifier = diceCountAdjustment();
 * // Returns 1.0 with 4+ dice, 0.8 with 3 dice, 0.6 with 2 dice, 0.5 with 1 die
 */
export function diceCountAdjustment(): ThresholdModifier {
  const modifier = (context: StrategyContext): number => {
    const { diceRemaining } = context.turnState;

    // No adjustment needed with 4+ dice
    if (diceRemaining >= 4) {
      return 1.0;
    }

    // Progressive reduction as dice count decreases
    if (diceRemaining === 3) {
      return 0.85;
    }

    if (diceRemaining === 2) {
      return 0.65;
    }

    // Only 1 die left - very conservative
    return 0.5;
  };

  return Object.defineProperties(modifier, {
    name: {
      value: 'dice-count-adjustment',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Reduces threshold when fewer dice remain',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ThresholdModifier;
}

/**
 * Creates a modifier that adjusts threshold based on farkle risk
 *
 * Higher farkle risk means higher chance of losing accumulated points,
 * so this modifier reduces the threshold to encourage banking earlier.
 *
 * @returns A threshold modifier function
 *
 * @example
 * const modifier = riskAdjustment();
 * // Returns 1.0 at 10% risk, 0.8 at 40% risk, 0.5 at 70% risk
 */
export function riskAdjustment(): ThresholdModifier {
  const modifier = (context: StrategyContext): number => {
    const { farkleRisk } = context;

    // No adjustment needed at very low risk
    if (farkleRisk <= 0.2) {
      return 1.0;
    }

    // Linear reduction from 1.0 to 0.4 as risk goes from 0.2 to 0.8
    // Formula: 1.0 - (risk - 0.2) * 1.0
    // At risk=0.2: 1.0
    // At risk=0.5: 0.7
    // At risk=0.8: 0.4
    const multiplier = 1.0 - (farkleRisk - 0.2) * 1.0;

    // Clamp between 0.4 and 1.0
    return Math.max(0.4, Math.min(1.0, multiplier));
  };

  return Object.defineProperties(modifier, {
    name: {
      value: 'risk-adjustment',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Reduces threshold when farkle risk is high',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ThresholdModifier;
}

/**
 * Creates a modifier that adjusts threshold based on roll count in current turn
 *
 * The more rolls taken in a turn, the more points accumulated, so this
 * modifier increases the threshold to encourage "pushing your luck" when
 * on a hot streak.
 *
 * @returns A threshold modifier function
 *
 * @example
 * const modifier = rollCountAdjustment();
 * // Returns 1.0 on roll 1, 1.1 on roll 2, 1.4 on roll 5
 */
export function rollCountAdjustment(): ThresholdModifier {
  const modifier = (context: StrategyContext): number => {
    const { rollNumber } = context.turnState;

    // First roll - no adjustment
    if (rollNumber === 1) {
      return 1.0;
    }

    // Gradually increase threshold as we roll more
    // Roll 2: 1.1x, Roll 3: 1.2x, Roll 4: 1.3x, etc.
    // Cap at 1.8x to avoid going too crazy
    const multiplier = 1.0 + (rollNumber - 1) * 0.1;

    return Math.min(1.8, multiplier);
  };

  return Object.defineProperties(modifier, {
    name: {
      value: 'roll-count-adjustment',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Increases threshold on hot streaks (multiple successful rolls)',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ThresholdModifier;
}
