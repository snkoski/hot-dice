/**
 * Continue Evaluator Functions
 *
 * These functions evaluate whether to continue rolling based on specific criteria.
 * Each returns a ContinueEvaluation with decision, weight, and reasoning.
 */

import type { ContinueEvaluator, ThresholdCalculator, ThresholdModifier, ContinueEvaluation } from './types';
import type { StrategyContext } from '../../core/types';

/**
 * Creates an evaluator that combines a threshold calculator with modifiers
 *
 * This is the primary way to create threshold-based continue decisions.
 * The calculator determines the base threshold, and modifiers adjust it
 * based on context (dice count, risk, roll count, etc.).
 *
 * @param calculator - Function that calculates base threshold
 * @param modifiers - Array of functions that adjust the threshold
 * @returns A continue evaluator function
 *
 * @example
 * const evaluator = thresholdBased(
 *   fixed(1000),
 *   [diceCountAdjustment(), riskAdjustment()]
 * );
 */
export function thresholdBased(
  calculator: ThresholdCalculator,
  modifiers: ThresholdModifier[]
): ContinueEvaluator {
  const evaluator = (context: StrategyContext): ContinueEvaluation => {
    // Calculate base threshold
    let threshold = calculator(context);

    // Apply all modifiers
    for (const modifier of modifiers) {
      threshold *= modifier(context);
    }

    const { turnPoints } = context.turnState;
    const shouldContinue = turnPoints < threshold;

    return {
      shouldContinue,
      weight: 1.0,
      reason: `Turn points: ${turnPoints}, Adjusted threshold: ${Math.round(threshold)}`
    };
  };

  return Object.defineProperties(evaluator, {
    name: {
      value: 'threshold-based',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Evaluates continue decision based on threshold with modifiers',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ContinueEvaluator;
}

/**
 * Creates an evaluator that stops when farkle risk exceeds a threshold
 *
 * This acts as a safety valve to prevent taking excessive risks
 * even if other evaluators suggest continuing.
 *
 * @param riskThreshold - Maximum acceptable farkle risk (0-1)
 * @returns A continue evaluator function
 *
 * @example
 * const evaluator = highRiskExit(0.45);
 * // Stops when farkle risk >= 45%
 */
export function highRiskExit(riskThreshold: number): ContinueEvaluator {
  const evaluator = (context: StrategyContext): ContinueEvaluation => {
    const { farkleRisk } = context;
    const { turnPoints } = context.turnState;

    const shouldContinue = farkleRisk < riskThreshold;

    return {
      shouldContinue,
      weight: 1.0,
      reason: shouldContinue
        ? `Risk acceptable: ${Math.round(farkleRisk * 100)}%`
        : `Too risky: ${Math.round(farkleRisk * 100)}% risk with ${turnPoints} points`
    };
  };

  return Object.defineProperties(evaluator, {
    name: {
      value: 'high-risk-exit',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: `Stops when farkle risk reaches ${Math.round(riskThreshold * 100)}%`,
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ContinueEvaluator;
}

/**
 * Creates an evaluator based on expected value of continuing
 *
 * Only continues if the expected value of the next roll meets
 * the minimum requirement. This is a more mathematically rigorous
 * approach than simple thresholds.
 *
 * @param minExpectedValue - Minimum expected value to continue
 * @returns A continue evaluator function
 *
 * @example
 * const evaluator = expectedValueBased(250);
 * // Only continues if next roll has EV >= 250 points
 */
export function expectedValueBased(minExpectedValue: number): ContinueEvaluator {
  const evaluator = (context: StrategyContext): ContinueEvaluation => {
    const { expectedValue } = context;

    const shouldContinue = expectedValue > minExpectedValue;

    return {
      shouldContinue,
      weight: 1.0,
      reason: shouldContinue
        ? `Good EV: ${Math.round(expectedValue)} points`
        : `Low EV: ${Math.round(expectedValue)} < ${minExpectedValue}`
    };
  };

  return Object.defineProperties(evaluator, {
    name: {
      value: 'expected-value-based',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: `Continues only if expected value exceeds ${minExpectedValue} points`,
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ContinueEvaluator;
}

/**
 * Creates an evaluator that stops when dice count gets too low
 *
 * Acts as a safety mechanism to prevent continuing with very few dice
 * where farkle probability is extremely high.
 *
 * @param minDice - Stop when dice remaining reaches this value or lower
 * @returns A continue evaluator function
 *
 * @example
 * const evaluator = minDiceRemaining(2);
 * // Stops when 2 or fewer dice remain
 */
export function minDiceRemaining(minDice: number): ContinueEvaluator {
  const evaluator = (context: StrategyContext): ContinueEvaluation => {
    const { diceRemaining } = context.turnState;

    const shouldContinue = diceRemaining > minDice;

    return {
      shouldContinue,
      weight: 1.0,
      reason: shouldContinue
        ? `Safe dice count: ${diceRemaining} dice`
        : `Too few dice: ${diceRemaining} dice remaining`
    };
  };

  return Object.defineProperties(evaluator, {
    name: {
      value: 'min-dice-remaining',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: `Stops when ${minDice} or fewer dice remain`,
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as ContinueEvaluator;
}
