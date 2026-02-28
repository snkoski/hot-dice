/**
 * Composable Strategy System - Main Export
 *
 * This module provides a complete composable strategy system for Farkle/Hot Dice.
 * Import from this file to access all composable functions and types.
 *
 * @example
 * import {
 *   StrategyBuilder,
 *   threshold,
 *   modifiers,
 *   evaluators,
 *   selectors
 * } from './strategies/composable';
 *
 * const myStrategy = new StrategyBuilder()
 *   .withMetadata('my-strategy', 'My Strategy', 'Custom strategy')
 *   .withDiceSelector(selectors.greedy())
 *   .withContinueEvaluators(
 *     evaluators.thresholdBased(
 *       threshold.fixed(1500),
 *       [modifiers.diceCountAdjustment(), modifiers.riskAdjustment()]
 *     )
 *   )
 *   .build();
 */

// Export all types
export * from './types';

// Export builder and helper functions
export { StrategyBuilder, createThresholdStrategy, combineEvaluators } from './builder';

// Export threshold calculators as a namespace
export * as threshold from './threshold-calculators';

// Export threshold modifiers as a namespace
export * as modifiers from './threshold-modifiers';

// Export continue evaluators as a namespace
export * as evaluators from './continue-evaluators';

// Export dice selectors as a namespace
export * as selectors from './dice-selectors';

// Export preset strategies
export * as presets from './presets';

// Also export preset strategies directly for convenience
export {
  adaptiveComposed,
  riskAwareComposed,
  selectiveMinimum,
  dynamicMultiFactor,
  endgameAggressive,
  conservativeComposed,
  safe500,
  listPresetStrategies,
  getPresetStrategy
} from './presets';
