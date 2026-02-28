import type { DiceRoll, DieValue, ScoringResult, ScoringCombination, ScoringRules } from './types';
import { ScoreType } from './types';

/**
 * Default scoring rules (standard Farkle)
 */
const DEFAULT_SCORING_RULES: ScoringRules = {
  enableStraight: true,
  enableThreePairs: true,
  enableFourOfKindBonus: true,
  enableFiveOfKindBonus: true,
  enableSixOfKindBonus: true,
  enableSingleOnes: true,
  enableSingleFives: true,
  minimumScoreToBoard: 500
};

/**
 * Scoring engine for analyzing dice rolls
 */
export class ScoringEngine {
  private rules: ScoringRules;

  constructor(rules?: ScoringRules) {
    this.rules = rules || DEFAULT_SCORING_RULES;
  }

  /**
   * Analyze a dice roll and return all scoring information
   * @param dice The dice to analyze
   * @returns Complete scoring result
   */
  analyzeRoll(dice: DiceRoll): ScoringResult {
    if (dice.length === 0) {
      return {
        combinations: [],
        totalPoints: 0,
        scoringDiceCount: 0,
        nonScoringDice: [],
        isFarkle: true,
        isHotDice: false
      };
    }

    // Check for special patterns first (straight, three pairs)
    if (this.rules.enableStraight) {
      const straight = this.checkStraight(dice);
      if (straight) {
        return {
          combinations: [straight],
          totalPoints: straight.points,
          scoringDiceCount: 6,
          nonScoringDice: [],
          isFarkle: false,
          isHotDice: true
        };
      }
    }

    if (this.rules.enableThreePairs) {
      const threePairs = this.checkThreePairs(dice);
      if (threePairs) {
        return {
          combinations: [threePairs],
          totalPoints: threePairs.points,
          scoringDiceCount: 6,
          nonScoringDice: [],
          isFarkle: false,
          isHotDice: true
        };
      }
    }

    // Check for n-of-a-kind and singles
    const combinations = this.findCombinations(dice);
    const totalPoints = combinations.reduce((sum, combo) => sum + combo.points, 0);
    const scoringIndices = new Set(combinations.flatMap(c => c.diceIndices));
    const scoringDiceCount = scoringIndices.size;
    const nonScoringDice = dice.filter((_, i) => !scoringIndices.has(i));

    return {
      combinations,
      totalPoints,
      scoringDiceCount,
      nonScoringDice,
      isFarkle: combinations.length === 0,
      isHotDice: dice.length === 6 && scoringDiceCount === 6
    };
  }

  /**
   * Check if dice form a straight (1-2-3-4-5-6)
   */
  private checkStraight(dice: DiceRoll): ScoringCombination | null {
    if (dice.length !== 6) return null;

    const sorted = [...dice].sort();
    const isStaight = sorted.every((die, i) => die === i + 1);

    if (isStaight) {
      return {
        type: ScoreType.STRAIGHT,
        dice: sorted,
        points: 1500,
        diceIndices: [0, 1, 2, 3, 4, 5]
      };
    }

    return null;
  }

  /**
   * Check if dice form three pairs
   */
  private checkThreePairs(dice: DiceRoll): ScoringCombination | null {
    if (dice.length !== 6) return null;

    const frequency = this.getFrequency(dice);
    const pairs = Object.values(frequency).filter(count => count === 2);

    if (pairs.length === 3) {
      return {
        type: ScoreType.THREE_PAIRS,
        dice: [...dice],
        points: 1500,
        diceIndices: [0, 1, 2, 3, 4, 5]
      };
    }

    return null;
  }

  /**
   * Find all scoring combinations (n-of-a-kind and singles)
   */
  private findCombinations(dice: DiceRoll): ScoringCombination[] {
    const combinations: ScoringCombination[] = [];
    const frequency = this.getFrequency(dice);
    const used = new Set<number>();

    // Check each die value for n-of-a-kind
    for (const [valueStr, count] of Object.entries(frequency)) {
      const value = parseInt(valueStr) as DieValue;

      if (count >= 3) {
        // N-of-a-kind (3, 4, 5, or 6)
        const combo = this.createNOfAKind(dice, value, count, used);
        if (combo) {
          combinations.push(combo);
        }
      } else {
        // Single 1s or 5s (only if not part of n-of-a-kind)
        if ((value === 1 && this.rules.enableSingleOnes) || (value === 5 && this.rules.enableSingleFives)) {
          for (let i = 0; i < dice.length; i++) {
            if (dice[i] === value && !used.has(i)) {
              combinations.push({
                type: value === 1 ? ScoreType.SINGLE_ONE : ScoreType.SINGLE_FIVE,
                dice: [value],
                points: value === 1 ? 100 : 50,
                diceIndices: [i]
              });
              used.add(i);
            }
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Create n-of-a-kind combination
   */
  private createNOfAKind(
    dice: DiceRoll,
    value: DieValue,
    count: number,
    used: Set<number>
  ): ScoringCombination | null {
    // Find indices of this value
    const indices: number[] = [];
    for (let i = 0; i < dice.length; i++) {
      if (dice[i] === value && !used.has(i)) {
        indices.push(i);
        if (indices.length === count) break;
      }
    }

    // Mark as used
    indices.forEach(i => used.add(i));

    // Calculate base score (three of a kind)
    const baseScore = value === 1 ? 1000 : value * 100;

    let scoreType: ScoreType;
    let points: number;

    if (count === 3) {
      scoreType = ScoreType.THREE_OF_KIND;
      points = baseScore;
    } else if (count === 4) {
      scoreType = ScoreType.FOUR_OF_KIND;
      points = this.rules.enableFourOfKindBonus ? baseScore * 2 : baseScore;
    } else if (count === 5) {
      scoreType = ScoreType.FIVE_OF_KIND;
      points = this.rules.enableFiveOfKindBonus ? baseScore * 3 : baseScore;
    } else if (count === 6) {
      scoreType = ScoreType.SIX_OF_KIND;
      points = this.rules.enableSixOfKindBonus ? baseScore * 4 : baseScore;
    } else {
      return null;
    }

    return {
      type: scoreType,
      dice: Array(count).fill(value),
      points,
      diceIndices: indices
    };
  }

  /**
   * Get frequency count of each die value
   */
  private getFrequency(dice: DiceRoll): Record<number, number> {
    const frequency: Record<number, number> = {};
    for (const die of dice) {
      frequency[die] = (frequency[die] || 0) + 1;
    }
    return frequency;
  }
}
