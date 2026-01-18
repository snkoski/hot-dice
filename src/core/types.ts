/**
 * Core type definitions for the Farkle/Hot Dice game simulator
 */

/**
 * Represents a single die value (1-6)
 */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Collection of dice
 */
export type DiceRoll = DieValue[];

/**
 * Scoring combination types
 */
export enum ScoreType {
  SINGLE_ONE = 'SINGLE_ONE',           // 1 = 100
  SINGLE_FIVE = 'SINGLE_FIVE',         // 5 = 50
  THREE_OF_KIND = 'THREE_OF_KIND',     // 3x same = value * 100 (1s = 1000)
  FOUR_OF_KIND = 'FOUR_OF_KIND',       // 4x same = 3x value * 2
  FIVE_OF_KIND = 'FIVE_OF_KIND',       // 5x same = 3x value * 3
  SIX_OF_KIND = 'SIX_OF_KIND',         // 6x same = 3x value * 4
  STRAIGHT = 'STRAIGHT',               // 1-2-3-4-5-6 = 1500
  THREE_PAIRS = 'THREE_PAIRS',         // 3 pairs = 1500
}

/**
 * A scoring combination found in a roll
 */
export interface ScoringCombination {
  type: ScoreType;
  dice: DieValue[];
  points: number;
  diceIndices: number[];  // Which dice indices were used
}

/**
 * Result of analyzing a dice roll for scoring
 */
export interface ScoringResult {
  combinations: ScoringCombination[];
  totalPoints: number;
  scoringDiceCount: number;
  nonScoringDice: DieValue[];
  isFarkle: boolean;
  isHotDice: boolean;  // All 6 dice scored
}

/**
 * Player state
 */
export interface PlayerState {
  id: string;
  name: string;
  totalScore: number;
  isOnBoard: boolean;  // Has scored 500+ in a turn
  gamesWon: number;
  stats: PlayerStats;
}

/**
 * Statistics tracked per player
 */
export interface PlayerStats {
  totalTurns: number;
  totalRolls: number;
  farkles: number;
  hotDiceCount: number;
  averagePointsPerTurn: number;
  maxTurnScore: number;
}

/**
 * State during a player's turn
 */
export interface TurnState {
  playerId: string;
  turnPoints: number;
  rollNumber: number;
  diceRemaining: number;
  lastRoll: DiceRoll | null;
  lastScoringResult: ScoringResult | null;
  bankedCombinations: ScoringCombination[];
  canContinue: boolean;
  isFarkle: boolean;
}

/**
 * Complete game state
 */
export interface GameState {
  gameId: string;
  players: PlayerState[];
  currentPlayerIndex: number;
  currentTurn: TurnState | null;
  targetScore: number;
  minimumScoreToBoard: number;
  isGameOver: boolean;
  winnerId: string | null;
  turnHistory: TurnRecord[];
}

/**
 * Record of a completed turn
 */
export interface TurnRecord {
  playerId: string;
  rollCount: number;
  pointsScored: number;
  finalScore: number;
  wasFarkle: boolean;
  timestamp: Date;
}

/**
 * Configuration for a game
 */
export interface GameConfig {
  targetScore: number;
  minimumScoreToBoard: number;
  playerCount: number;
  playerNames?: string[];
  seed?: number;  // For reproducible games
}

/**
 * Decision context provided to strategy
 */
export interface StrategyContext {
  // Current game state
  gameState: Readonly<GameState>;

  // Current player's state
  playerState: Readonly<PlayerState>;

  // Current turn state
  turnState: Readonly<TurnState>;

  // Available scoring options from last roll
  availableScoring: ScoringResult;

  // Opponent information
  opponents: ReadonlyArray<PlayerState>;
  leadingOpponentScore: number;

  // Calculated risk metrics
  farkleRisk: number;  // Probability of farkle on next roll (0-1)
  expectedValue: number;  // Expected points for continuing
}

/**
 * Strategy decision for which dice to keep
 */
export interface DiceSelectionDecision {
  // Which combinations to keep from availableScoring
  selectedCombinations: ScoringCombination[];

  // Calculated points from selection
  points: number;

  // Number of dice being kept
  diceKept: number;
}

/**
 * Strategy decision for continuing turn
 */
export interface ContinueDecision {
  continue: boolean;
  reason?: string;  // Optional explanation for debugging
}

/**
 * Main strategy interface
 */
export interface Strategy {
  /**
   * Unique identifier for this strategy
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Description of strategy behavior
   */
  readonly description: string;

  /**
   * Strategy version (for tracking iterations)
   */
  readonly version: string;

  /**
   * Decide which dice to keep from a roll
   */
  selectDice(context: StrategyContext): DiceSelectionDecision;

  /**
   * Decide whether to continue rolling or bank points
   */
  decideContinue(context: StrategyContext): ContinueDecision;

  /**
   * Optional: Initialize strategy state at game start
   */
  onGameStart?(gameState: GameState): void;

  /**
   * Optional: Cleanup at game end
   */
  onGameEnd?(gameState: GameState): void;

  /**
   * Optional: React to turn results (learning strategies)
   */
  onTurnComplete?(turnRecord: TurnRecord): void;
}
