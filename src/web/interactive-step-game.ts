/**
 * Interactive Step-through game mode with human player support
 * Extends the step-through pattern to pause for human input
 */

import { DiceRoller } from '../core/dice';
import { ScoringEngine } from '../core/scoring';
import { TurnManager } from '../core/turn';
import { HumanStrategy } from '../strategies/HumanStrategy';
import { ScoreType } from '../core/types';
import type {
  GameConfig,
  GameState,
  PlayerState,
  Strategy,
  StrategyContext,
  DiceSelectionDecision,
  ContinueDecision,
  HumanDecisionRecord,
  PendingHumanDecision,
  HumanDecisionContext,
  ScoringCombination,
  DieValue
} from '../core/types';

export interface InteractiveGameStep {
  type: 'game_start' | 'turn_start' | 'roll' | 'awaiting_human_decision' | 'turn_complete' | 'game_end';
  gameState: GameState;
  message?: string;

  // Human decision support
  humanDecisions?: PendingHumanDecision[];

  // Turn information
  currentPlayerId?: string;
  currentPlayerName?: string;
  diceRolled?: number[];
  scoringCombinations?: ScoringCombination[];
  turnPoints?: number;
  diceRemaining?: number;

  // AI dice selection result (populated on 'roll' steps after selection)
  keptCombinations?: ScoringCombination[];
  keptPoints?: number;
}

export class InteractiveStepGame {
  private state: GameState;
  private roller: DiceRoller;
  private scorer: ScoringEngine;
  private strategies: Map<string, Strategy>;
  private steps: InteractiveGameStep[] = [];

  // Human player tracking
  private humanPlayerIds: Set<string> = new Set();
  private humanStrategies: Map<string, HumanStrategy> = new Map();
  private pendingHumanDecisions: Map<string, PendingHumanDecision> = new Map();
  private humanDecisionHistory: HumanDecisionRecord[] = [];

  // Mirrored dice mode
  private mirroredDice: boolean = false;
  private baseSeed: number = 0;
  private roundNumber: number = 0;

  // Current turn state
  private currentTurnManager: TurnManager | null = null;
  private currentTurnState: any = null;
  private waitingForDiceSelection: boolean = false;
  private waitingForContinueDecision: boolean = false;

  constructor(
    config: GameConfig,
    strategies: Strategy[],
    humanPlayerIndices: number[]
  ) {
    if (strategies.length !== config.playerCount) {
      throw new Error(`Expected ${config.playerCount} strategies, got ${strategies.length}`);
    }

    const seed = config.seed || Math.floor(Math.random() * 1000000);
    this.baseSeed = seed;
    this.mirroredDice = config.mirroredDice ?? false;
    this.roller = new DiceRoller(seed);
    this.scorer = new ScoringEngine(config.scoringRules);
    this.strategies = new Map();

    // Initialize game state
    this.state = {
      gameId: `interactive-game-${Date.now()}`,
      players: this.createPlayers(config, strategies),
      currentPlayerIndex: 0,
      currentTurn: null,
      targetScore: config.targetScore,
      minimumScoreToBoard: config.minimumScoreToBoard,
      isGameOver: false,
      winnerId: null,
      winnerIds: [],
      turnHistory: []
    };

    // Store strategies and mark human players
    this.state.players.forEach((player, index) => {
      this.strategies.set(player.id, strategies[index]);

      if (humanPlayerIndices.includes(index)) {
        this.humanPlayerIds.add(player.id);
        if (strategies[index] instanceof HumanStrategy) {
          this.humanStrategies.set(player.id, strategies[index] as HumanStrategy);
        }
      }
    });

    // Add game start step
    this.steps.push({
      type: 'game_start',
      gameState: this.cloneState(),
      message: 'Interactive game started! Click Next to begin.'
    });
  }

  private createPlayers(config: GameConfig, strategies: Strategy[]): PlayerState[] {
    return strategies.map((strategy, index) => ({
      id: `player-${index}`,
      name: config.playerNames?.[index] || strategy.name,
      totalScore: 0,
      isOnBoard: config.minimumScoreToBoard === 0,
      gamesWon: 0,
      stats: {
        totalTurns: 0,
        totalRolls: 0,
        farkles: 0,
        hotDiceCount: 0,
        averagePointsPerTurn: 0,
        maxTurnScore: 0
      }
    }));
  }

  getSteps(): InteractiveGameStep[] {
    return this.steps;
  }

  getCurrentStep(): InteractiveGameStep {
    return this.steps[this.steps.length - 1];
  }

  /**
   * Advance through steps automatically until the next point requiring human input,
   * or until the game ends. Skips over intermediate AI turns.
   */
  advanceToDecisionPoint(): InteractiveGameStep {
    let step = this.nextStep();
    while (step.type !== 'awaiting_human_decision' && step.type !== 'game_end') {
      step = this.nextStep();
    }
    return step;
  }

  /**
   * Advance to the next step
   */
  nextStep(): InteractiveGameStep {
    if (this.state.isGameOver) {
      return this.getCurrentStep();
    }

    // If waiting for human input, return current step
    if (this.pendingHumanDecisions.size > 0) {
      return this.getCurrentStep();
    }

    // If no current turn, start a new turn
    if (!this.currentTurnManager) {
      return this.startNewTurn();
    }

    // If waiting for dice selection, process it
    if (this.waitingForDiceSelection) {
      return this.processDiceSelection();
    }

    // If waiting for continue decision, process it
    if (this.waitingForContinueDecision) {
      return this.processContinueDecision();
    }

    // Otherwise, roll the dice
    return this.rollDice();
  }

  private startNewTurn(): InteractiveGameStep {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;

    // In mirrored dice mode, all players share the same dice sequence per round
    if (this.mirroredDice) {
      this.roller.reset(this.baseSeed + this.roundNumber);
    }

    // Create turn manager
    this.currentTurnManager = new TurnManager(
      currentPlayer.id,
      this.state,
      this.roller,
      this.scorer
    );

    this.currentTurnState = this.currentTurnManager.startTurn();
    this.state.currentTurn = this.currentTurnState;

    const step: InteractiveGameStep = {
      type: 'turn_start',
      gameState: this.cloneState(),
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name,
      message: `${currentPlayer.name}'s turn begins!`
    };

    this.steps.push(step);

    // Immediately roll first dice
    return this.rollDice();
  }

  private rollDice(): InteractiveGameStep {
    if (!this.currentTurnManager || !this.currentTurnState) {
      throw new Error('No active turn');
    }

    const rollResult = this.currentTurnManager.rollDice();
    this.currentTurnState = rollResult;
    this.state.currentTurn = this.currentTurnState;

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];

    // Check for farkle
    if (rollResult.isFarkle) {
      // On farkle, points are already reset to 0 by TurnManager
      const step: InteractiveGameStep = {
        type: 'turn_complete',
        gameState: this.cloneState(),
        currentPlayerId: currentPlayer.id,
        currentPlayerName: currentPlayer.name,
        diceRolled: rollResult.lastRoll || [],
        message: `${currentPlayer.name} farkled! No points this turn.`
      };

      this.steps.push(step);
      this.advanceToNextPlayer();

      return step;
    }

    // Player needs to select dice
    this.waitingForDiceSelection = true;

    // Check if current player is human
    if (this.humanPlayerIds.has(currentPlayer.id)) {
      return this.createHumanDiceDecision();
    }

    // AI player - process immediately in next step
    const step: InteractiveGameStep = {
      type: 'roll',
      gameState: this.cloneState(),
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name,
      diceRolled: rollResult.lastRoll || [],
      scoringCombinations: rollResult.lastScoringResult?.combinations || [],
      turnPoints: rollResult.turnPoints,
      diceRemaining: rollResult.diceRemaining,
      message: `${currentPlayer.name} rolled ${rollResult.lastRoll?.join(', ')}`
    };

    this.steps.push(step);
    return step;
  }

  private createHumanDiceDecision(): InteractiveGameStep {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const humanStrategy = this.humanStrategies.get(currentPlayer.id);

    if (!humanStrategy) {
      throw new Error('Human strategy not found');
    }

    const decisionId = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const context: HumanDecisionContext = {
      diceRolled: this.currentTurnState.lastRoll || [],
      scoringCombinations: this.expandCombinationsForHuman(
        this.currentTurnState.lastScoringResult?.combinations || []
      ),
      turnPoints: this.currentTurnState.turnPoints,
      diceRemaining: this.currentTurnState.diceRemaining,
      playerScore: currentPlayer.totalScore,
      opponentScores: this.state.players
        .filter(p => p.id !== currentPlayer.id)
        .map(p => p.totalScore),
      farkleRisk: this.calculateFarkleRisk(this.currentTurnState.diceRemaining),
      expectedValue: 0 // Could calculate this if needed
    };

    const pendingDecision: PendingHumanDecision = {
      decisionId,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      strategyName: humanStrategy.name,
      type: 'dice',
      context,
      timestamp: new Date()
    };

    this.pendingHumanDecisions.set(decisionId, pendingDecision);

    // Create promise for human strategy
    humanStrategy.createDiceDecisionPromise();

    const step: InteractiveGameStep = {
      type: 'awaiting_human_decision',
      gameState: this.cloneState(),
      humanDecisions: [pendingDecision],
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name,
      diceRolled: context.diceRolled,
      scoringCombinations: context.scoringCombinations,
      turnPoints: context.turnPoints,
      diceRemaining: context.diceRemaining,
      message: `Waiting for ${currentPlayer.name} to select dice...`
    };

    this.steps.push(step);
    return step;
  }

  private processDiceSelection(): InteractiveGameStep {
    if (!this.currentTurnManager || !this.currentTurnState) {
      throw new Error('No active turn');
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;
    const isHuman = this.humanPlayerIds.has(currentPlayer.id);

    const context = this.createStrategyContext(currentPlayer, this.currentTurnState);
    const diceDecision = strategy.selectDice(context);
    this.currentTurnState = this.currentTurnManager.selectDice(diceDecision.selectedCombinations);
    this.state.currentTurn = this.currentTurnState;

    this.waitingForDiceSelection = false;
    this.waitingForContinueDecision = true;

    // Check if current player is human
    if (isHuman) {
      return this.createHumanContinueDecision();
    }

    // AI player - process immediately in next step
    const step: InteractiveGameStep = {
      type: 'roll',
      gameState: this.cloneState(),
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name,
      turnPoints: this.currentTurnState.turnPoints,
      diceRemaining: this.currentTurnState.diceRemaining,
      keptCombinations: diceDecision.selectedCombinations,
      keptPoints: diceDecision.points,
      message: `${currentPlayer.name} selected dice, earned ${diceDecision.points} points`
    };

    this.steps.push(step);
    return step;
  }

  private createHumanContinueDecision(): InteractiveGameStep {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const humanStrategy = this.humanStrategies.get(currentPlayer.id);

    if (!humanStrategy) {
      throw new Error('Human strategy not found');
    }

    const decisionId = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const context: HumanDecisionContext = {
      diceRolled: this.currentTurnState.lastRoll || [],
      scoringCombinations: this.currentTurnState.lastScoringResult?.combinations || [],
      turnPoints: this.currentTurnState.turnPoints,
      diceRemaining: this.currentTurnState.diceRemaining,
      playerScore: currentPlayer.totalScore,
      opponentScores: this.state.players
        .filter(p => p.id !== currentPlayer.id)
        .map(p => p.totalScore),
      farkleRisk: this.calculateFarkleRisk(this.currentTurnState.diceRemaining),
      expectedValue: 0
    };

    const pendingDecision: PendingHumanDecision = {
      decisionId,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      strategyName: humanStrategy.name,
      type: 'continue',
      context,
      timestamp: new Date()
    };

    this.pendingHumanDecisions.set(decisionId, pendingDecision);

    // Create promise for human strategy
    humanStrategy.createContinueDecisionPromise();

    const step: InteractiveGameStep = {
      type: 'awaiting_human_decision',
      gameState: this.cloneState(),
      humanDecisions: [pendingDecision],
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name,
      turnPoints: context.turnPoints,
      diceRemaining: context.diceRemaining,
      message: `Waiting for ${currentPlayer.name} to decide: continue or stop?`
    };

    this.steps.push(step);
    return step;
  }

  private processContinueDecision(): InteractiveGameStep {
    if (!this.currentTurnManager || !this.currentTurnState) {
      throw new Error('No active turn');
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;

    const context = this.createStrategyContext(currentPlayer, this.currentTurnState);
    const continueDecision = strategy.decideContinue(context);
    this.waitingForContinueDecision = false;

    if (!continueDecision.continue) {
      // Player chooses to stop - bank points
      const pointsBefore = this.state.players[this.state.currentPlayerIndex].totalScore;
      const result = this.currentTurnManager.bankPoints();

      const step: InteractiveGameStep = {
        type: 'turn_complete',
        gameState: this.cloneState(),
        currentPlayerId: currentPlayer.id,
        currentPlayerName: currentPlayer.name,
        message: `${currentPlayer.name} stops and banks ${result.pointsAdded} points! New score: ${result.newScore}`
      };

      this.steps.push(step);

      // Check for game over
      if (this.checkGameOver()) {
        return this.endGame();
      }

      this.advanceToNextPlayer();
      return step;
    }

    // Player continues - will roll again in next step
    return this.nextStep();
  }

  /**
   * Submit a human decision and advance the game.
   * Returns the next step requiring human input (or game_end), plus any steps
   * that were silently processed (AI turns) between the decision and that step.
   */
  async submitHumanDecision(
    decisionId: string,
    decision: DiceSelectionDecision | ContinueDecision
  ): Promise<{ step: InteractiveGameStep; skippedSteps: InteractiveGameStep[] }> {
    const pending = this.pendingHumanDecisions.get(decisionId);
    if (!pending) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    const humanStrategy = this.humanStrategies.get(pending.playerId);
    if (!humanStrategy) {
      throw new Error(`Human strategy for player ${pending.playerId} not found`);
    }

    // Submit decision to strategy
    if (pending.type === 'dice') {
      humanStrategy.submitDiceSelection(decision as DiceSelectionDecision);
    } else {
      humanStrategy.submitContinueDecision(decision as ContinueDecision);
    }

    // Track decision for analysis
    this.humanDecisionHistory.push({
      decisionId,
      timestamp: new Date(),
      context: pending.context,
      decision,
      gameStateBefore: this.cloneState()
    });

    // Remove from pending
    this.pendingHumanDecisions.delete(decisionId);

    // Capture how many steps exist before advancing so we can report what was skipped
    const stepCountBefore = this.steps.length;

    // Advance through AI turns until the next human decision or game end
    const step = this.advanceToDecisionPoint();

    // All steps generated between now and the final step are "skipped" AI steps
    const skippedSteps = this.steps.slice(stepCountBefore, this.steps.length - 1);

    return { step, skippedSteps };
  }

  getHumanDecisionHistory(): HumanDecisionRecord[] {
    return this.humanDecisionHistory;
  }

  private createStrategyContext(player: PlayerState, turnState: any): StrategyContext {
    const opponents = this.state.players.filter(p => p.id !== player.id);
    const leadingOpponentScore = Math.max(...opponents.map(p => p.totalScore), 0);
    const farkleRisk = this.calculateFarkleRisk(turnState.diceRemaining);
    return {
      gameState: this.cloneState(),
      playerState: player,
      turnState,
      availableScoring: turnState.lastScoringResult!,
      opponents,
      leadingOpponentScore,
      farkleRisk,
      expectedValue: 0
    };
  }

  /**
   * Expand scoring combinations for human players.
   * For n-of-a-kind (n >= 3) of 1s or 5s, also adds individual single-die options
   * so the human can choose to keep fewer dice for more re-roll flexibility.
   * Options that share dice indices are mutually exclusive — the frontend handles conflicts.
   */
  private expandCombinationsForHuman(combinations: ScoringCombination[]): ScoringCombination[] {
    const expanded: ScoringCombination[] = [];

    for (const combo of combinations) {
      expanded.push(combo);

      const isNOfAKind =
        combo.type === ScoreType.THREE_OF_KIND ||
        combo.type === ScoreType.FOUR_OF_KIND ||
        combo.type === ScoreType.FIVE_OF_KIND ||
        combo.type === ScoreType.SIX_OF_KIND;

      if (isNOfAKind && combo.diceIndices.length >= 3) {
        const value = combo.dice[0] as DieValue;
        if (value === 1 || value === 5) {
          const singleType = value === 1 ? ScoreType.SINGLE_ONE : ScoreType.SINGLE_FIVE;
          const singlePoints = value === 1 ? 100 : 50;

          // Add one SINGLE option per die so the human can select any subset
          for (const dieIndex of combo.diceIndices) {
            expanded.push({
              type: singleType,
              dice: [value],
              points: singlePoints,
              diceIndices: [dieIndex]
            });
          }
        }
      }
    }

    return expanded;
  }

  private calculateFarkleRisk(diceRemaining: number): number {
    const risks: Record<number, number> = { 1: 0.667, 2: 0.444, 3: 0.278, 4: 0.154, 5: 0.077, 6: 0.023 };
    return risks[diceRemaining] || 0.5;
  }

  private advanceToNextPlayer(): void {
    this.currentTurnManager = null;
    this.currentTurnState = null;
    this.state.currentTurn = null;
    this.waitingForDiceSelection = false;
    this.waitingForContinueDecision = false;

    const nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    if (nextIndex === 0) {
      this.roundNumber++;
    }
    this.state.currentPlayerIndex = nextIndex;
  }

  private checkGameOver(): boolean {
    const winners = this.state.players.filter(p => p.totalScore >= this.state.targetScore);
    if (winners.length > 0) {
      this.state.isGameOver = true;
      this.state.winnerIds = winners.map(w => w.id);
      this.state.winnerId = winners[0].id; // For backwards compatibility
      return true;
    }
    return false;
  }

  private endGame(): InteractiveGameStep {
    const winners = this.state.players.filter(p => p.totalScore >= this.state.targetScore);
    const winnerNames = winners.map(w => w.name).join(', ');

    const step: InteractiveGameStep = {
      type: 'game_end',
      gameState: this.cloneState(),
      message: `Game Over! ${winnerNames} won with ${winners[0].totalScore} points!`
    };

    this.steps.push(step);
    return step;
  }

  private cloneState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }
}
