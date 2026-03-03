import type { GameState, ScoringCombination } from './game';

/** Step-through game step (SimultaneousStepGame) */
export interface StepGameStep {
  type: 'game_start' | 'round_start' | 'roll' | 'decisions' | 'round_complete' | 'game_end';
  gameState: GameState;
  message?: string;
  roundNumber?: number;
  rollNumber?: number;
  diceRolled?: number[];
  scoringCombinations?: ScoringCombination[];
  playerDecisions?: PlayerDecision[];
  roundResults?: RoundResult[];
}

export interface PlayerDecision {
  playerId: string;
  playerName: string;
  strategyName: string;
  selectedCombinations: ScoringCombination[];
  selectedDice: number[];
  decision: { continue: boolean; reason: string };
  turnPoints: number;
  diceRemaining: number;
  isActive: boolean;
  wasFarkle: boolean;
}

export interface RoundResult {
  playerId: string;
  playerName: string;
  pointsBanked: number;
  wasFarkle: boolean;
  newScore: number;
}

/** Interactive game step (InteractiveStepGame) */
export interface InteractiveGameStep {
  type: 'game_start' | 'turn_start' | 'roll' | 'awaiting_human_decision' | 'turn_complete' | 'game_end';
  gameState: GameState;
  message?: string;
  humanDecisions?: PendingHumanDecision[];
  currentPlayerId?: string;
  currentPlayerName?: string;
  diceRolled?: number[];
  scoringCombinations?: ScoringCombination[];
  turnPoints?: number;
  diceRemaining?: number;
  keptCombinations?: ScoringCombination[];
  keptPoints?: number;
}

export interface PendingHumanDecision {
  decisionId: string;
  playerId: string;
  playerName: string;
  strategyName: string;
  type: 'dice' | 'continue';
  context: HumanDecisionContext;
  timestamp?: string;
}

export interface HumanDecisionContext {
  diceRolled: number[];
  scoringCombinations: ScoringCombination[];
  turnPoints: number;
  diceRemaining: number;
  playerScore: number;
  opponentScores: number[];
  farkleRisk: number;
  expectedValue?: number;
}
