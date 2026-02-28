/**
 * Dice Selector Functions
 *
 * These functions determine which scoring combinations to keep from a roll.
 * Different selectors enable different strategic approaches to dice management.
 */

import type { DiceSelector } from './types';
import type { StrategyContext, ScoringCombination } from '../../core/types';
import { ScoreType } from '../../core/types';

/**
 * Creates a selector that keeps all available scoring combinations
 *
 * This is the most aggressive approach - bank everything and maximize
 * points per roll. However, it may leave fewer dice for the next roll.
 *
 * @returns A dice selector function
 *
 * @example
 * const selector = greedy();
 * // Always selects all available combinations
 */
export function greedy(): DiceSelector {
  const selector = (context: StrategyContext, available: ScoringCombination[]): ScoringCombination[] => {
    return available;
  };

  return Object.defineProperties(selector, {
    name: {
      value: 'greedy',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Selects all available scoring combinations',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as DiceSelector;
}

/**
 * Creates a selector that only keeps combinations above a minimum value
 *
 * Useful for avoiding low-value single dice (like single 5s) when you
 * want to maximize dice available for the next roll.
 *
 * @param minPoints - Minimum points required (combinations <= this are excluded)
 * @returns A dice selector function
 *
 * @example
 * const selector = minimumValue(100);
 * // Only keeps combinations worth more than 100 points
 */
export function minimumValue(minPoints: number): DiceSelector {
  const selector = (context: StrategyContext, available: ScoringCombination[]): ScoringCombination[] => {
    return available.filter(combo => combo.points > minPoints);
  };

  return Object.defineProperties(selector, {
    name: {
      value: 'minimum-value',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: `Only selects combinations worth more than ${minPoints} points`,
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as DiceSelector;
}

/**
 * Creates a selector that prefers large combinations over single dice
 *
 * Prioritizes three-of-a-kind, four-of-a-kind, straights, etc. over
 * single 1s and 5s. Only takes singles if no large combos are available.
 *
 * @returns A dice selector function
 *
 * @example
 * const selector = preferLargeCombos();
 * // Selects three-of-a-kind (300) over single 1 (100) + single 5 (50)
 */
export function preferLargeCombos(): DiceSelector {
  const selector = (context: StrategyContext, available: ScoringCombination[]): ScoringCombination[] => {
    // Define what counts as a "large" combo
    const largeCombos = available.filter(combo =>
      combo.type === ScoreType.THREE_OF_KIND ||
      combo.type === ScoreType.FOUR_OF_KIND ||
      combo.type === ScoreType.FIVE_OF_KIND ||
      combo.type === ScoreType.SIX_OF_KIND ||
      combo.type === ScoreType.STRAIGHT ||
      combo.type === ScoreType.THREE_PAIRS
    );

    // If we have large combos, only select those
    if (largeCombos.length > 0) {
      return largeCombos;
    }

    // Otherwise, select all available (singles)
    return available;
  };

  return Object.defineProperties(selector, {
    name: {
      value: 'prefer-large-combos',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Prefers large combinations (3+ of a kind) over single scoring dice',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as DiceSelector;
}

/**
 * Creates a selector that keeps only the fewest dice necessary
 *
 * Selects only the single highest-value combination, leaving maximum
 * dice for the next roll. This maximizes flexibility but may miss points.
 *
 * @returns A dice selector function
 *
 * @example
 * const selector = keepMinimum();
 * // With [100, 50, 300] available, only keeps the 300-point combo
 */
export function keepMinimum(): DiceSelector {
  const selector = (context: StrategyContext, available: ScoringCombination[]): ScoringCombination[] => {
    if (available.length === 0) {
      return [];
    }

    // Find the highest value combination
    const best = available.reduce((max, combo) =>
      combo.points > max.points ? combo : max
    );

    return [best];
  };

  return Object.defineProperties(selector, {
    name: {
      value: 'keep-minimum',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: 'Keeps only the fewest dice (highest value combo), maximizing reroll options',
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as DiceSelector;
}

/**
 * Creates a selector that switches behavior based on dice count
 *
 * Uses different selection strategies depending on how many dice remain.
 * This allows for adaptive behavior - e.g., greedy when many dice, conservative when few.
 *
 * @param highDiceSelector - Selector to use when dice count is above threshold
 * @param lowDiceSelector - Selector to use when dice count is at or below threshold
 * @param threshold - Dice count threshold for switching behavior
 * @returns A dice selector function
 *
 * @example
 * const selector = conditionalByDiceCount(
 *   greedy(),      // Use when 4+ dice
 *   keepMinimum(), // Use when 3 or fewer dice
 *   3
 * );
 */
export function conditionalByDiceCount(
  highDiceSelector: DiceSelector,
  lowDiceSelector: DiceSelector,
  threshold: number
): DiceSelector {
  const selector = (context: StrategyContext, available: ScoringCombination[]): ScoringCombination[] => {
    const { diceRemaining } = context.turnState;

    if (diceRemaining > threshold) {
      return highDiceSelector(context, available);
    } else {
      return lowDiceSelector(context, available);
    }
  };

  return Object.defineProperties(selector, {
    name: {
      value: 'conditional-by-dice-count',
      writable: false,
      enumerable: true,
      configurable: true
    },
    description: {
      value: `Switches selection strategy at ${threshold} dice threshold`,
      writable: false,
      enumerable: true,
      configurable: true
    }
  }) as DiceSelector;
}
