/**
 * Composable Strategy System Types
 *
 * This module defines the type system for composable strategy functions.
 * Each type represents a specific aspect of strategy decision-making that
 * can be composed together to create sophisticated strategies.
 */

import type { StrategyContext, ScoringCombination } from '../../core/types';

/**
 * Metadata attached to composable functions for documentation and debugging
 */
export interface ComposableMetadata {
  /**
   * Unique identifier for this function
   */
  name: string;

  /**
   * Human-readable description of what this function does
   */
  description: string;
}

/**
 * Base type for all composable functions that includes metadata
 */
export type ComposableFunction<T extends (...args: any[]) => any> = T & ComposableMetadata;

/**
 * Calculates a point threshold based on game context
 *
 * @param context - Current game state and metrics
 * @returns The calculated threshold value
 *
 * @example
 * const fixedThreshold: ThresholdCalculator = (context) => 1000;
 * const adaptiveThreshold: ThresholdCalculator = (context) => {
 *   const scoreDiff = context.leadingOpponentScore - context.playerState.totalScore;
 *   return scoreDiff > 2000 ? 2000 : 1500;
 * };
 */
export type ThresholdCalculator = ComposableFunction<(context: StrategyContext) => number>;

/**
 * Adjusts a threshold by returning a multiplier
 *
 * @param context - Current game state and metrics
 * @returns Multiplier to apply to threshold (1.0 = no change, 0.5 = half, 1.5 = 1.5x)
 *
 * @example
 * const diceCountModifier: ThresholdModifier = (context) => {
 *   return context.turnState.diceRemaining <= 2 ? 0.6 : 1.0;
 * };
 */
export type ThresholdModifier = ComposableFunction<(context: StrategyContext) => number>;

/**
 * Result of evaluating whether to continue rolling
 */
export interface ContinueEvaluation {
  /**
   * Whether this evaluator thinks we should continue
   */
  shouldContinue: boolean;

  /**
   * Weight/confidence of this evaluation (0-1)
   * Used in weighted combination modes
   */
  weight: number;

  /**
   * Explanation for debugging and user feedback
   */
  reason: string;
}

/**
 * Evaluates whether to continue rolling based on specific criteria
 *
 * @param context - Current game state and metrics
 * @returns Evaluation result with decision, weight, and reasoning
 *
 * @example
 * const thresholdEvaluator: ContinueEvaluator = (context) => ({
 *   shouldContinue: context.turnState.turnPoints < 1000,
 *   weight: 1.0,
 *   reason: `Turn points: ${context.turnState.turnPoints}`
 * });
 */
export type ContinueEvaluator = ComposableFunction<(context: StrategyContext) => ContinueEvaluation>;

/**
 * Selects which scoring combinations to keep from available options
 *
 * @param context - Current game state and metrics
 * @param available - All available scoring combinations to choose from
 * @returns Selected combinations to keep
 *
 * @example
 * const greedySelector: DiceSelector = (context, available) => available;
 * const minimumSelector: DiceSelector = (context, available) =>
 *   available.filter(c => c.points >= 100);
 */
export type DiceSelector = ComposableFunction<
  (context: StrategyContext, available: ScoringCombination[]) => ScoringCombination[]
>;

/**
 * Modes for combining multiple ContinueEvaluators
 */
export type EvaluatorCombinationMode =
  | { type: 'all' }      // All evaluators must agree to continue
  | { type: 'any' }      // Any evaluator can vote to continue
  | { type: 'weighted' } // Weighted average (continue if avg > 0.5)
  | { type: 'priority' }; // Use first non-neutral evaluation

/**
 * Configuration for building a composable strategy
 */
export interface ComposableStrategyConfig {
  /**
   * Strategy metadata
   */
  id: string;
  name: string;
  description: string;
  version: string;

  /**
   * Dice selection function
   */
  diceSelector: DiceSelector;

  /**
   * Continue decision evaluators
   */
  continueEvaluators: ContinueEvaluator[];

  /**
   * How to combine multiple evaluators
   */
  combinationMode: EvaluatorCombinationMode;
}
