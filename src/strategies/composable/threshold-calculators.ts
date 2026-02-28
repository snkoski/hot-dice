/**
 * Threshold Calculator Functions
 *
 * These functions calculate point thresholds based on game context.
 * They can be used standalone or composed with modifiers for dynamic behavior.
 */

import type { ThresholdCalculator } from './types';
import type { StrategyContext } from '../../core/types';

/**
 * Creates a threshold calculator that always returns a fixed value
 *
 * @param points - The fixed threshold value
 * @returns A threshold calculator function
 *
 * @example
 * const threshold = fixed(1000);
 * console.log(threshold(context)); // Always returns 1000
 */
export function fixed(points: number): ThresholdCalculator {
  const calculator = (context: StrategyContext): number => {
    return points;
  };

  // Add metadata as enumerable properties (can't override readonly 'name')
  return Object.defineProperties(calculator, {
    name: {
      value: 'fixed',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: `Returns a fixed threshold of ${points} points`,
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ThresholdCalculator;
}

/**
 * Creates a threshold calculator that adapts based on score difference with leading opponent
 *
 * Adjusts aggressiveness based on position:
 * - Far behind (3000+): Very aggressive (2500)
 * - Behind (1500+): Aggressive (2000)
 * - Slightly behind (1+): Balanced (1500)
 * - Slightly ahead (0 to -1500): Moderate (1200)
 * - Comfortably ahead (-1500+): Conservative (800)
 *
 * @returns A threshold calculator function
 *
 * @example
 * const threshold = adaptiveToOpponent();
 * console.log(threshold(context)); // Varies based on opponent scores
 */
export function adaptiveToOpponent(): ThresholdCalculator {
  const calculator = (context: StrategyContext): number => {
    const { playerState, leadingOpponentScore } = context;

    // Calculate how far behind we are (positive = behind, negative = ahead)
    const scoreDifference = leadingOpponentScore - playerState.totalScore;

    if (scoreDifference > 3000) {
      // Far behind - very aggressive
      return 2500;
    } else if (scoreDifference > 1500) {
      // Behind - aggressive
      return 2000;
    } else if (scoreDifference > 0) {
      // Slightly behind - balanced
      return 1500;
    } else if (scoreDifference > -1500) {
      // Slightly ahead - moderate
      return 1200;
    } else {
      // Comfortably ahead - conservative
      return 800;
    }
  };

  return Object.defineProperties(calculator, {
    name: {
      value: 'adaptive-to-opponent',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Adjusts threshold based on score difference with leading opponent',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ThresholdCalculator;
}

/**
 * Creates a threshold calculator that becomes more aggressive near the target score
 *
 * Returns base threshold when far from target, but increases as player approaches
 * the winning score to encourage going for the win.
 *
 * @param baseThreshold - The threshold to use when far from target
 * @returns A threshold calculator function
 *
 * @example
 * const threshold = endgameAdjusted(1500);
 * // Returns 1500 when far from target, 3000+ when close to winning
 */
export function endgameAdjusted(baseThreshold: number): ThresholdCalculator {
  const calculator = (context: StrategyContext): number => {
    const { playerState, gameState } = context;
    const { totalScore } = playerState;
    const { targetScore } = gameState;

    // Calculate distance to target
    const pointsToWin = targetScore - totalScore;

    // If more than 3000 points away, use base threshold
    if (pointsToWin > 3000) {
      return baseThreshold;
    }

    // If within 3000 points, start getting more aggressive
    // Scale from baseThreshold to 3x baseThreshold as we get closer
    if (pointsToWin > 1000) {
      // Between 1000-3000 points away: gradually increase
      const ratio = (3000 - pointsToWin) / 2000; // 0 to 1
      return baseThreshold * (1 + ratio);
    }

    // Within 1000 points: very aggressive
    if (pointsToWin > 500) {
      return baseThreshold * 2.5;
    }

    // Within 500 points: maximum aggression
    return baseThreshold * 3;
  };

  return Object.defineProperties(calculator, {
    name: {
      value: 'endgame-adjusted',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: `Aggressive endgame adjustment: increases from base ${baseThreshold} to ${baseThreshold * 3} near target score`,
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ThresholdCalculator;
}

/**
 * Creates a threshold calculator that ensures minimum score to get on board
 *
 * Returns the minimum score needed to board if not yet on board,
 * otherwise returns 0 (indicating this calculator doesn't add constraints).
 *
 * @returns A threshold calculator function
 *
 * @example
 * const threshold = ensureBoarding();
 * // Returns 500 if not on board (assuming 500 min), 0 if already on board
 */
export function ensureBoarding(): ThresholdCalculator {
  const calculator = (context: StrategyContext): number => {
    const { playerState, gameState } = context;

    if (!playerState.isOnBoard) {
      return gameState.minimumScoreToBoard;
    }

    return 0;
  };

  return Object.defineProperties(calculator, {
    name: {
      value: 'ensure-boarding',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Ensures player meets minimum score to get on board',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ThresholdCalculator;
}
