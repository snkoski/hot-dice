import type { Strategy, StrategyContext, DiceSelectionDecision, ContinueDecision } from '../core/types';
import { listPresetStrategies } from './composable/presets';

/**
 * Create a simple threshold-based strategy
 * Stops rolling when turn points reach the threshold
 */
export function createThresholdStrategy(threshold: number): Strategy {
  return {
    id: `threshold-${threshold}`,
    name: `Stop at ${threshold}`,
    description: `Always stop rolling when turn points reach ${threshold}`,
    version: '1.0.0',

    selectDice(context: StrategyContext): DiceSelectionDecision {
      // Always take all available scoring combinations (greedy)
      return {
        selectedCombinations: context.availableScoring.combinations,
        points: context.availableScoring.totalPoints,
        diceKept: context.availableScoring.scoringDiceCount
      };
    },

    decideContinue(context: StrategyContext): ContinueDecision {
      const shouldContinue = context.turnState.turnPoints < threshold;

      return {
        continue: shouldContinue,
        reason: `Turn points: ${context.turnState.turnPoints}, Threshold: ${threshold}`
      };
    }
  };
}

/**
 * Very conservative strategy - stops at 500 points
 */
export const conservative: Strategy = createThresholdStrategy(500);

/**
 * Moderately conservative - stops at 1000 points
 */
export const moderate: Strategy = createThresholdStrategy(1000);

/**
 * Balanced strategy - stops at 1500 points
 */
export const balanced: Strategy = createThresholdStrategy(1500);

/**
 * Aggressive strategy - stops at 2000 points
 */
export const aggressive: Strategy = createThresholdStrategy(2000);

/**
 * Very aggressive strategy - stops at 2500 points
 */
export const veryAggressive: Strategy = createThresholdStrategy(2500);

/**
 * Adaptive strategy that adjusts based on game state
 */
export const adaptive: Strategy = {
  id: 'adaptive',
  name: 'Adaptive',
  description: 'Adjusts aggressiveness based on position in game',
  version: '1.0.0',

  selectDice(context: StrategyContext): DiceSelectionDecision {
    // Always take all scoring
    return {
      selectedCombinations: context.availableScoring.combinations,
      points: context.availableScoring.totalPoints,
      diceKept: context.availableScoring.scoringDiceCount
    };
  },

  decideContinue(context: StrategyContext): ContinueDecision {
    const { playerState, leadingOpponentScore, turnState } = context;

    // Calculate how far behind we are
    const scoreDifference = leadingOpponentScore - playerState.totalScore;

    // Adjust threshold based on position
    let threshold: number;

    if (scoreDifference > 3000) {
      // Far behind - very aggressive
      threshold = 2500;
    } else if (scoreDifference > 1500) {
      // Behind - aggressive
      threshold = 2000;
    } else if (scoreDifference > 0) {
      // Slightly behind - balanced
      threshold = 1500;
    } else if (scoreDifference > -1500) {
      // Slightly ahead - moderate
      threshold = 1200;
    } else {
      // Comfortably ahead - conservative
      threshold = 800;
    }

    // Also consider if we're not on the board yet
    if (!playerState.isOnBoard) {
      threshold = Math.max(threshold, context.gameState.minimumScoreToBoard);
    }

    const shouldContinue = turnState.turnPoints < threshold;

    return {
      continue: shouldContinue,
      reason: `Behind by ${scoreDifference}, using threshold ${threshold}`
    };
  }
};

/**
 * Risk-aware strategy that considers farkle probability
 */
export const riskAware: Strategy = {
  id: 'risk-aware',
  name: 'Risk Aware',
  description: 'Considers farkle risk when deciding to continue',
  version: '1.0.0',

  selectDice(context: StrategyContext): DiceSelectionDecision {
    return {
      selectedCombinations: context.availableScoring.combinations,
      points: context.availableScoring.totalPoints,
      diceKept: context.availableScoring.scoringDiceCount
    };
  },

  decideContinue(context: StrategyContext): ContinueDecision {
    const { turnState, farkleRisk, expectedValue } = context;

    // Base threshold
    const baseThreshold = 1500;

    // Adjust for risk
    const riskAdjustedThreshold = baseThreshold * (1 - farkleRisk * 0.5);

    // Don't risk it if we have good points and high farkle risk
    if (turnState.turnPoints >= riskAdjustedThreshold && farkleRisk > 0.4) {
      return {
        continue: false,
        reason: `Too risky: ${turnState.turnPoints} points, ${Math.round(farkleRisk * 100)}% farkle risk`
      };
    }

    // Continue if expected value is good
    const shouldContinue = turnState.turnPoints < baseThreshold;

    return {
      continue: shouldContinue,
      reason: `Points: ${turnState.turnPoints}, EV: ${expectedValue}, Risk: ${Math.round(farkleRisk * 100)}%`
    };
  }
};

/**
 * All built-in strategies
 */
export const builtInStrategies = {
  conservative,
  moderate,
  balanced,
  aggressive,
  veryAggressive,
  adaptive,
  riskAware
};

/**
 * Get strategy by ID
 */
export function getStrategy(id: string): Strategy | undefined {
  // Check built-in strategies first
  const builtIn = Object.values(builtInStrategies).find(s => s.id === id);
  if (builtIn) return builtIn;

  // Then check composable presets
  return listPresetStrategies().find(s => s.id === id);
}

/**
 * List all available strategies (built-in + composable presets)
 */
export function listStrategies(): Strategy[] {
  return [
    ...Object.values(builtInStrategies),
    ...listPresetStrategies()
  ];
}
