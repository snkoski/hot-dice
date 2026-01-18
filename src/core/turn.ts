import type { TurnState, GameState, ScoringCombination } from './types';
import type { DiceRoller } from './dice';
import type { ScoringEngine } from './scoring';

/**
 * Manages state and logic for a single player's turn
 */
export class TurnManager {
  private turnState: TurnState;

  constructor(
    private playerId: string,
    private gameState: GameState,
    private roller: DiceRoller,
    private scorer: ScoringEngine
  ) {
    this.turnState = this.createInitialState();
  }

  /**
   * Start a new turn
   */
  startTurn(): TurnState {
    this.turnState = this.createInitialState();
    return { ...this.turnState };
  }

  /**
   * Roll the remaining dice
   */
  rollDice(): TurnState {
    if (!this.turnState.canContinue) {
      return { ...this.turnState };
    }

    // Roll the dice
    const roll = this.roller.roll(this.turnState.diceRemaining);
    this.turnState.lastRoll = roll;
    this.turnState.rollNumber++;

    // Analyze the roll
    const scoringResult = this.scorer.analyzeRoll(roll);
    this.turnState.lastScoringResult = scoringResult;

    // Check for farkle
    if (scoringResult.isFarkle) {
      this.turnState.isFarkle = true;
      this.turnState.canContinue = false;
      this.turnState.turnPoints = 0; // Lose all points on farkle
      this.turnState.bankedCombinations = [];
    }

    return { ...this.turnState };
  }

  /**
   * Select which scoring combinations to keep
   */
  selectDice(combinations: ScoringCombination[]): TurnState {
    if (!this.turnState.lastScoringResult) {
      return { ...this.turnState };
    }

    // Calculate points from selected combinations
    const points = combinations.reduce((sum, combo) => sum + combo.points, 0);
    this.turnState.turnPoints += points;

    // Track banked combinations
    this.turnState.bankedCombinations.push(...combinations);

    // Calculate dice used
    const diceUsed = combinations.reduce((sum, combo) => sum + combo.diceIndices.length, 0);
    this.turnState.diceRemaining -= diceUsed;

    // Check for hot dice (all dice scored)
    if (this.turnState.lastScoringResult.isHotDice || this.turnState.diceRemaining === 0) {
      // Reset to 6 dice for hot dice
      this.turnState.diceRemaining = 6;
    }

    // Can continue if we have dice to roll
    this.turnState.canContinue = true;

    return { ...this.turnState };
  }

  /**
   * Bank the accumulated points and end the turn
   */
  bankPoints(): { pointsAdded: number; newScore: number } {
    let pointsAdded = 0;

    if (!this.turnState.isFarkle) {
      pointsAdded = this.turnState.turnPoints;

      // Find the player and update their score
      const player = this.gameState.players.find(p => p.id === this.playerId);
      if (player) {
        player.totalScore += pointsAdded;

        // Check if player is now on the board
        if (!player.isOnBoard && player.totalScore >= this.gameState.minimumScoreToBoard) {
          player.isOnBoard = true;
        }

        return {
          pointsAdded,
          newScore: player.totalScore
        };
      }
    }

    return {
      pointsAdded: 0,
      newScore: this.gameState.players.find(p => p.id === this.playerId)?.totalScore || 0
    };
  }

  /**
   * Get the current turn state
   */
  getState(): TurnState {
    return { ...this.turnState };
  }

  /**
   * Create initial turn state
   */
  private createInitialState(): TurnState {
    return {
      playerId: this.playerId,
      turnPoints: 0,
      rollNumber: 0,
      diceRemaining: 6,
      lastRoll: null,
      lastScoringResult: null,
      bankedCombinations: [],
      canContinue: true,
      isFarkle: false
    };
  }
}
