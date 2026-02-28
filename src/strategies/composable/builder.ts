/**
 * Strategy Builder
 *
 * Provides tools for composing strategies from smaller functions.
 * The StrategyBuilder class offers a fluent API for creating strategies,
 * while helper functions provide shortcuts for common patterns.
 */

import type {
  ContinueEvaluator,
  DiceSelector,
  ThresholdCalculator,
  ThresholdModifier,
  EvaluatorCombinationMode
} from './types';
import type {
  Strategy,
  StrategyContext,
  DiceSelectionDecision,
  ContinueDecision
} from '../../core/types';
import { thresholdBased } from './continue-evaluators';

/**
 * Builder class for creating composable strategies with fluent API
 *
 * @example
 * const strategy = new StrategyBuilder()
 *   .withMetadata('my-strategy', 'My Strategy', 'Description', '1.0.0')
 *   .withDiceSelector(greedy())
 *   .withContinueEvaluators(
 *     thresholdBased(fixed(1000), [diceCountAdjustment()]),
 *     highRiskExit(0.45)
 *   )
 *   .withCombinationMode({ type: 'all' })
 *   .build();
 */
export class StrategyBuilder {
  private id: string = 'custom-strategy';
  private name: string = 'Custom Strategy';
  private description: string = 'A custom composable strategy';
  private version: string = '1.0.0';
  private diceSelector: DiceSelector | null = null;
  private continueEvaluators: ContinueEvaluator[] = [];
  private combinationMode: EvaluatorCombinationMode = { type: 'all' };

  /**
   * Set strategy metadata
   */
  withMetadata(id: string, name: string, description: string, version: string = '1.0.0'): this {
    this.id = id;
    this.name = name;
    this.description = description;
    this.version = version;
    return this;
  }

  /**
   * Set the dice selector function
   */
  withDiceSelector(selector: DiceSelector): this {
    this.diceSelector = selector;
    return this;
  }

  /**
   * Add one or more continue evaluators
   */
  withContinueEvaluators(...evaluators: ContinueEvaluator[]): this {
    this.continueEvaluators = evaluators;
    return this;
  }

  /**
   * Set how multiple evaluators are combined
   */
  withCombinationMode(mode: EvaluatorCombinationMode): this {
    this.combinationMode = mode;
    return this;
  }

  /**
   * Build and return the final Strategy object
   */
  build(): Strategy {
    if (!this.diceSelector) {
      throw new Error('Strategy must have a dice selector');
    }

    if (this.continueEvaluators.length === 0) {
      throw new Error('Strategy must have at least one continue evaluator');
    }

    const diceSelector = this.diceSelector;
    const evaluators = this.continueEvaluators;
    const mode = this.combinationMode;

    const strategy: Strategy = {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,

      selectDice(context: StrategyContext): DiceSelectionDecision {
        const selected = diceSelector(context, context.availableScoring.combinations);

        // Calculate total points and dice count from selected combinations
        const points = selected.reduce((sum, combo) => sum + combo.points, 0);
        const diceKept = selected.reduce((sum, combo) => sum + combo.dice.length, 0);

        return {
          selectedCombinations: selected,
          points,
          diceKept
        };
      },

      decideContinue(context: StrategyContext): ContinueDecision {
        // Get evaluations from all evaluators
        const evaluations = evaluators.map(evaluator => evaluator(context));

        let shouldContinue: boolean;
        let reasons: string[] = [];

        switch (mode.type) {
          case 'all':
            // All evaluators must agree to continue
            shouldContinue = evaluations.every(e => e.shouldContinue);
            reasons = evaluations.map(e => e.reason);
            break;

          case 'any':
            // Any evaluator can vote to continue
            shouldContinue = evaluations.some(e => e.shouldContinue);
            reasons = evaluations.filter(e => e.shouldContinue).map(e => e.reason);
            if (reasons.length === 0) {
              reasons = evaluations.map(e => e.reason);
            }
            break;

          case 'weighted':
            // Weighted average - continue if > 0.5
            const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0);
            const continueWeight = evaluations
              .filter(e => e.shouldContinue)
              .reduce((sum, e) => sum + e.weight, 0);
            shouldContinue = (continueWeight / totalWeight) > 0.5;
            reasons = evaluations.map(e => e.reason);
            break;

          case 'priority':
            // Use first non-neutral evaluation (or first if all neutral)
            const firstEval = evaluations[0];
            shouldContinue = firstEval.shouldContinue;
            reasons = [firstEval.reason];
            break;

          default:
            shouldContinue = false;
            reasons = ['Unknown combination mode'];
        }

        return {
          continue: shouldContinue,
          reason: reasons.join('; ')
        };
      }
    };

    return strategy;
  }
}

/**
 * Helper function to create a simple threshold-based strategy
 *
 * This is a shortcut for the common pattern of using a threshold calculator
 * with modifiers and a dice selector.
 *
 * @param calculator - Threshold calculator function
 * @param modifiers - Array of threshold modifiers
 * @param diceSelector - Dice selector function
 * @returns Complete Strategy object
 *
 * @example
 * const strategy = createThresholdStrategy(
 *   fixed(1000),
 *   [diceCountAdjustment(), riskAdjustment()],
 *   greedy()
 * );
 */
export function createThresholdStrategy(
  calculator: ThresholdCalculator,
  modifiers: ThresholdModifier[],
  diceSelector: DiceSelector
): Strategy {
  return new StrategyBuilder()
    .withMetadata(
      'threshold-strategy',
      'Threshold Strategy',
      'Strategy based on threshold with modifiers',
      '1.0.0'
    )
    .withDiceSelector(diceSelector)
    .withContinueEvaluators(thresholdBased(calculator, modifiers))
    .withCombinationMode({ type: 'all' })
    .build();
}

/**
 * Helper function to combine multiple evaluators into a strategy
 *
 * This is useful when you want to use multiple different evaluation
 * criteria together with a specific combination mode.
 *
 * @param evaluators - Array of continue evaluators
 * @param mode - How to combine the evaluators
 * @param diceSelector - Dice selector function
 * @returns Complete Strategy object
 *
 * @example
 * const strategy = combineEvaluators(
 *   [
 *     thresholdBased(fixed(1000), []),
 *     highRiskExit(0.45),
 *     minDiceRemaining(2)
 *   ],
 *   { type: 'all' },
 *   greedy()
 * );
 */
export function combineEvaluators(
  evaluators: ContinueEvaluator[],
  mode: EvaluatorCombinationMode,
  diceSelector: DiceSelector
): Strategy {
  return new StrategyBuilder()
    .withMetadata(
      'combined-strategy',
      'Combined Strategy',
      'Strategy combining multiple evaluators',
      '1.0.0'
    )
    .withDiceSelector(diceSelector)
    .withContinueEvaluators(...evaluators)
    .withCombinationMode(mode)
    .build();
}
