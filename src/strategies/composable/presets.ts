/**
 * Preset Composable Strategies
 *
 * Pre-built strategies that demonstrate the composable system.
 * These include recreations of existing strategies and new sophisticated combinations.
 */

import { StrategyBuilder, combineEvaluators } from './builder';
import { fixed, adaptiveToOpponent, endgameAdjusted } from './threshold-calculators';
import { diceCountAdjustment, riskAdjustment, rollCountAdjustment } from './threshold-modifiers';
import {
  thresholdBased,
  highRiskExit,
  expectedValueBased,
  minDiceRemaining
} from './continue-evaluators';
import {
  greedy,
  keepMinimum,
  conditionalByDiceCount
} from './dice-selectors';
import type { Strategy } from '../../core/types';

/**
 * Extended strategy metadata with composable details
 */
export interface ComposableStrategyDetails {
  id: string;
  name: string;
  description: string;
  version: string;
  components: {
    diceSelector: { name: string; description: string };
    thresholdCalculator?: { name: string; description: string };
    modifiers?: Array<{ name: string; description: string }>;
    evaluators: Array<{ name: string; description: string }>;
    combinationMode: string;
  };
}

/**
 * Recreates the built-in adaptive strategy using composable functions
 *
 * This demonstrates how the original adaptive strategy can be expressed
 * using the composable system, with equivalent behavior.
 */
export const adaptiveComposed: Strategy = new StrategyBuilder()
  .withMetadata(
    'adaptive-composed',
    'Adaptive (Composed)',
    'Composable recreation of adaptive strategy - adjusts based on opponent scores',
    '1.0.0'
  )
  .withDiceSelector(greedy())
  .withContinueEvaluators(
    thresholdBased(adaptiveToOpponent(), [])
  )
  .withCombinationMode({ type: 'all' })
  .build();

/**
 * Recreates the built-in risk-aware strategy using composable functions
 *
 * Uses a base threshold with risk-based modifiers and a high-risk exit condition.
 */
export const riskAwareComposed: Strategy = new StrategyBuilder()
  .withMetadata(
    'risk-aware-composed',
    'Risk Aware (Composed)',
    'Composable recreation of risk-aware strategy - considers farkle probability',
    '1.0.0'
  )
  .withDiceSelector(greedy())
  .withContinueEvaluators(
    thresholdBased(fixed(1500), [riskAdjustment()]),
    highRiskExit(0.4)
  )
  .withCombinationMode({ type: 'all' })
  .build();

/**
 * NEW: Selective strategy that adapts dice selection based on situation
 *
 * Uses keepMinimum when many dice remain (preserving reroll options),
 * but switches to greedy when few dice remain (maximize points before potential farkle).
 */
export const selectiveMinimum: Strategy = new StrategyBuilder()
  .withMetadata(
    'selective-minimum',
    'Selective Minimum',
    'Keeps minimum dice when safe, goes greedy when few dice remain',
    '1.0.0'
  )
  .withDiceSelector(
    conditionalByDiceCount(
      keepMinimum(), // Use when > 3 dice (preserve options)
      greedy(),      // Use when <= 3 dice (maximize points)
      3
    )
  )
  .withContinueEvaluators(
    thresholdBased(fixed(1500), [diceCountAdjustment()]),
    highRiskExit(0.45)
  )
  .withCombinationMode({ type: 'all' })
  .build();

/**
 * NEW: Sophisticated multi-factor strategy
 *
 * Combines multiple decision criteria:
 * - Adaptive threshold based on opponent scores
 * - Risk-based threshold adjustment
 * - Dice count adjustment
 * - Roll count "hot streak" bonus
 * - High risk exit condition
 * - Minimum dice safety net
 *
 * Uses "all" mode so all conditions must be met to continue.
 */
export const dynamicMultiFactor: Strategy = new StrategyBuilder()
  .withMetadata(
    'dynamic-multi-factor',
    'Dynamic Multi-Factor',
    'Sophisticated strategy combining opponent tracking, risk, dice count, and roll momentum',
    '1.0.0'
  )
  .withDiceSelector(greedy())
  .withContinueEvaluators(
    thresholdBased(
      adaptiveToOpponent(),
      [diceCountAdjustment(), riskAdjustment(), rollCountAdjustment()]
    ),
    highRiskExit(0.45),
    minDiceRemaining(2)
  )
  .withCombinationMode({ type: 'all' })
  .build();

/**
 * NEW: Aggressive endgame strategy
 *
 * Pushes hard when close to winning, using endgame-adjusted thresholds
 * and accepting higher risk. Uses "any" mode so any evaluator can
 * vote to continue, making it more aggressive.
 */
export const endgameAggressive: Strategy = new StrategyBuilder()
  .withMetadata(
    'endgame-aggressive',
    'Endgame Aggressive',
    'Pushes hard when close to target score, accepting higher risk to win',
    '1.0.0'
  )
  .withDiceSelector(greedy())
  .withContinueEvaluators(
    thresholdBased(endgameAdjusted(1000), [rollCountAdjustment()]),
    expectedValueBased(150) // Continue if EV > 150
  )
  .withCombinationMode({ type: 'any' }) // More aggressive - any evaluator can continue
  .build();

/**
 * NEW: Conservative strategy focused on consistent scoring
 *
 * Uses low threshold with multiple safety mechanisms.
 * All conditions must be met, making it very conservative.
 */
export const conservativeComposed: Strategy = new StrategyBuilder()
  .withMetadata(
    'conservative-composed',
    'Conservative (Composed)',
    'Very conservative strategy focusing on banking points safely',
    '1.0.0'
  )
  .withDiceSelector(greedy())
  .withContinueEvaluators(
    thresholdBased(fixed(800), [diceCountAdjustment(), riskAdjustment()]),
    highRiskExit(0.35),
    minDiceRemaining(3)
  )
  .withCombinationMode({ type: 'all' })
  .build();

/**
 * NEW: Safe 500 strategy
 *
 * Aims for 500 points but stops early if only 2 or fewer dice remain.
 * Perfect for avoiding high-risk situations while still getting a decent score.
 */
export const safe500: Strategy = new StrategyBuilder()
  .withMetadata(
    'safe-500',
    'Safe 500',
    'Targets 500 points but stops when 2 or fewer dice remain',
    '1.0.0'
  )
  .withDiceSelector(greedy())
  .withContinueEvaluators(
    thresholdBased(fixed(500), []),
    minDiceRemaining(2)
  )
  .withCombinationMode({ type: 'all' })
  .build();

/**
 * All preset strategies exported as an object
 */
export const presetStrategies = {
  adaptiveComposed,
  riskAwareComposed,
  selectiveMinimum,
  dynamicMultiFactor,
  endgameAggressive,
  conservativeComposed,
  safe500
};

/**
 * Get all preset strategies as an array
 */
export function listPresetStrategies(): Strategy[] {
  return Object.values(presetStrategies);
}

/**
 * Get a preset strategy by ID
 */
export function getPresetStrategy(id: string): Strategy | undefined {
  return Object.values(presetStrategies).find(s => s.id === id);
}

/**
 * Get detailed breakdown of composable strategy components
 */
export function getStrategyDetails(id: string): ComposableStrategyDetails | null {
  const details: Record<string, ComposableStrategyDetails> = {
    'adaptive-composed': {
      id: 'adaptive-composed',
      name: 'Adaptive (Composed)',
      description: 'Composable recreation of adaptive strategy - adjusts based on opponent scores',
      version: '1.0.0',
      components: {
        diceSelector: {
          name: 'greedy',
          description: 'Selects all available scoring combinations'
        },
        thresholdCalculator: {
          name: 'adaptiveToOpponent',
          description: 'Adjusts threshold based on score difference with leading opponent (800-2500 points)'
        },
        modifiers: [],
        evaluators: [
          {
            name: 'thresholdBased',
            description: 'Continues until turn points reach the adaptive threshold'
          }
        ],
        combinationMode: 'all'
      }
    },
    'risk-aware-composed': {
      id: 'risk-aware-composed',
      name: 'Risk Aware (Composed)',
      description: 'Composable recreation of risk-aware strategy - considers farkle probability',
      version: '1.0.0',
      components: {
        diceSelector: {
          name: 'greedy',
          description: 'Selects all available scoring combinations'
        },
        thresholdCalculator: {
          name: 'fixed',
          description: 'Fixed threshold of 1500 points'
        },
        modifiers: [
          {
            name: 'riskAdjustment',
            description: 'Reduces threshold when farkle risk is high (0.4x to 1.0x multiplier)'
          }
        ],
        evaluators: [
          {
            name: 'thresholdBased',
            description: 'Continues until turn points reach risk-adjusted threshold'
          },
          {
            name: 'highRiskExit',
            description: 'Stops when farkle risk reaches 40%'
          }
        ],
        combinationMode: 'all'
      }
    },
    'selective-minimum': {
      id: 'selective-minimum',
      name: 'Selective Minimum',
      description: 'Keeps minimum dice when safe, goes greedy when few dice remain',
      version: '1.0.0',
      components: {
        diceSelector: {
          name: 'conditionalByDiceCount',
          description: 'Keeps minimum dice when >3 dice remain, goes greedy when ≤3 dice (preserves options when safe)'
        },
        thresholdCalculator: {
          name: 'fixed',
          description: 'Fixed threshold of 1500 points'
        },
        modifiers: [
          {
            name: 'diceCountAdjustment',
            description: 'Reduces threshold when fewer dice remain (0.5x to 1.0x multiplier)'
          }
        ],
        evaluators: [
          {
            name: 'thresholdBased',
            description: 'Continues until turn points reach dice-adjusted threshold'
          },
          {
            name: 'highRiskExit',
            description: 'Stops when farkle risk reaches 45%'
          }
        ],
        combinationMode: 'all'
      }
    },
    'dynamic-multi-factor': {
      id: 'dynamic-multi-factor',
      name: 'Dynamic Multi-Factor',
      description: 'Sophisticated strategy combining opponent tracking, risk, dice count, and roll momentum',
      version: '1.0.0',
      components: {
        diceSelector: {
          name: 'greedy',
          description: 'Selects all available scoring combinations'
        },
        thresholdCalculator: {
          name: 'adaptiveToOpponent',
          description: 'Adjusts threshold based on score difference with leading opponent (800-2500 points)'
        },
        modifiers: [
          {
            name: 'diceCountAdjustment',
            description: 'Reduces threshold when fewer dice remain (0.5x to 1.0x multiplier)'
          },
          {
            name: 'riskAdjustment',
            description: 'Reduces threshold when farkle risk is high (0.4x to 1.0x multiplier)'
          },
          {
            name: 'rollCountAdjustment',
            description: 'Increases threshold on hot streaks (1.0x to 1.8x multiplier)'
          }
        ],
        evaluators: [
          {
            name: 'thresholdBased',
            description: 'Continues until turn points reach fully-adjusted threshold (combines all modifiers)'
          },
          {
            name: 'highRiskExit',
            description: 'Stops when farkle risk reaches 45%'
          },
          {
            name: 'minDiceRemaining',
            description: 'Stops when 2 or fewer dice remain'
          }
        ],
        combinationMode: 'all'
      }
    },
    'endgame-aggressive': {
      id: 'endgame-aggressive',
      name: 'Endgame Aggressive',
      description: 'Pushes hard when close to target score, accepting higher risk to win',
      version: '1.0.0',
      components: {
        diceSelector: {
          name: 'greedy',
          description: 'Selects all available scoring combinations'
        },
        thresholdCalculator: {
          name: 'endgameAdjusted',
          description: 'Base threshold of 1000 points, increases to 3000 near target score'
        },
        modifiers: [
          {
            name: 'rollCountAdjustment',
            description: 'Increases threshold on hot streaks (1.0x to 1.8x multiplier)'
          }
        ],
        evaluators: [
          {
            name: 'thresholdBased',
            description: 'Continues until turn points reach endgame-adjusted threshold'
          },
          {
            name: 'expectedValueBased',
            description: 'Continues if expected value > 150 points'
          }
        ],
        combinationMode: 'any'
      }
    },
    'conservative-composed': {
      id: 'conservative-composed',
      name: 'Conservative (Composed)',
      description: 'Very conservative strategy focusing on banking points safely',
      version: '1.0.0',
      components: {
        diceSelector: {
          name: 'greedy',
          description: 'Selects all available scoring combinations'
        },
        thresholdCalculator: {
          name: 'fixed',
          description: 'Fixed threshold of 800 points'
        },
        modifiers: [
          {
            name: 'diceCountAdjustment',
            description: 'Reduces threshold when fewer dice remain (0.5x to 1.0x multiplier)'
          },
          {
            name: 'riskAdjustment',
            description: 'Reduces threshold when farkle risk is high (0.4x to 1.0x multiplier)'
          }
        ],
        evaluators: [
          {
            name: 'thresholdBased',
            description: 'Continues until turn points reach adjusted threshold'
          },
          {
            name: 'highRiskExit',
            description: 'Stops when farkle risk reaches 35%'
          },
          {
            name: 'minDiceRemaining',
            description: 'Stops when 3 or fewer dice remain'
          }
        ],
        combinationMode: 'all'
      }
    },
    'safe-500': {
      id: 'safe-500',
      name: 'Safe 500',
      description: 'Targets 500 points but stops when 2 or fewer dice remain',
      version: '1.0.0',
      components: {
        diceSelector: {
          name: 'greedy',
          description: 'Selects all available scoring combinations'
        },
        thresholdCalculator: {
          name: 'fixed',
          description: 'Fixed threshold of 500 points'
        },
        modifiers: [],
        evaluators: [
          {
            name: 'thresholdBased',
            description: 'Continues until turn points reach 500'
          },
          {
            name: 'minDiceRemaining',
            description: 'Stops when 2 or fewer dice remain (safety check)'
          }
        ],
        combinationMode: 'all'
      }
    }
  };

  return details[id] || null;
}
