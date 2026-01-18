import seedrandom from 'seedrandom';
import type { DieValue, DiceRoll } from './types';

/**
 * Dice roller with seedable random number generation
 */
export class DiceRoller {
  private rng: seedrandom.PRNG;

  /**
   * Create a new dice roller
   * @param seed Optional seed for reproducible results
   */
  constructor(seed?: number) {
    this.rng = seed !== undefined ? seedrandom(seed.toString()) : seedrandom();
  }

  /**
   * Roll a single die
   * @returns A random value between 1 and 6
   */
  rollSingle(): DieValue {
    return Math.floor(this.rng() * 6) + 1 as DieValue;
  }

  /**
   * Roll multiple dice
   * @param count Number of dice to roll
   * @returns Array of die values
   */
  roll(count: number): DiceRoll {
    const result: DiceRoll = [];
    for (let i = 0; i < count; i++) {
      result.push(this.rollSingle());
    }
    return result;
  }

  /**
   * Reset the RNG with a new seed
   * @param seed Optional seed for reproducible results
   */
  reset(seed?: number): void {
    this.rng = seed !== undefined ? seedrandom(seed.toString()) : seedrandom();
  }
}
