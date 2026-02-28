/**
 * Step-through game mode for detailed visualization
 * Allows stepping through a game one roll at a time
 */

import { DiceRoller } from '../core/dice';
import { ScoringEngine } from '../core/scoring';
import { TurnManager } from '../core/turn';
import type {
  GameConfig,
  GameState,
  PlayerState,
  Strategy,
  StrategyContext,
  ScoringCombination
} from '../core/types';

interface GameStep {
  type: 'game_start' | 'turn_start' | 'roll' | 'dice_selected' | 'continue_decision' | 'bank' | 'farkle' | 'game_end';
  gameState: GameState;
  currentPlayer: PlayerState;
  currentStrategy: string;

  // Roll details
  diceRolled?: number[];
  scoringCombinations?: ScoringCombination[];

  // Strategy decisions
  selectedDice?: number[];
  selectedCombinations?: ScoringCombination[];
  decision?: {
    continue: boolean;
    reason: string;
  };

  // Turn state
  turnPoints?: number;
  diceRemaining?: number;
  rollNumber?: number;

  // Banking/farkle
  pointsBanked?: number;
  wasFarkle?: boolean;

  message?: string;
}

export class StepThroughGame {
  private state: GameState;
  private roller: DiceRoller;
  private scorer: ScoringEngine;
  private strategies: Map<string, Strategy>;
  private currentTurnManager: TurnManager | null = null;
  private currentTurnState: any = null;
  private steps: GameStep[] = [];
  private currentRound: number = 0;
  private baseSeed: number;

  constructor(config: GameConfig, strategies: Strategy[]) {
    if (strategies.length !== config.playerCount) {
      throw new Error(`Expected ${config.playerCount} strategies, got ${strategies.length}`);
    }

    this.baseSeed = config.seed || Math.floor(Math.random() * 1000000);
    this.roller = new DiceRoller(this.baseSeed);
    this.scorer = new ScoringEngine();
    this.strategies = new Map();

    // Initialize game state
    this.state = {
      gameId: `step-game-${Date.now()}`,
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

    // Store strategies by player ID
    this.state.players.forEach((player, index) => {
      this.strategies.set(player.id, strategies[index]);
    });

    // Add game start step
    this.steps.push({
      type: 'game_start',
      gameState: this.cloneState(),
      currentPlayer: this.state.players[0],
      currentStrategy: strategies[0].name,
      message: 'Game started! Click Next to begin the first turn.'
    });
  }

  /**
   * Get all steps so far
   */
  getSteps(): GameStep[] {
    return this.steps;
  }

  /**
   * Get the most recent step
   */
  getCurrentStep(): GameStep {
    return this.steps[this.steps.length - 1];
  }

  /**
   * Advance to the next step in the game
   */
  nextStep(): GameStep {
    if (this.state.isGameOver) {
      return this.getCurrentStep();
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;

    // If no turn in progress, start a new turn
    if (!this.currentTurnManager) {
      return this.startNewTurn();
    }

    // If we have a turn state that's a farkle, bank it
    if (this.currentTurnState?.isFarkle) {
      return this.bankCurrentTurn();
    }

    // If decision was to stop, bank it
    if (this.currentTurnState?.shouldStop) {
      return this.bankCurrentTurn();
    }

    // If we have a turn state with a roll but no decision made yet, get strategy decision
    if (this.currentTurnState?.lastRoll && !this.currentTurnState.decisionMade) {
      return this.makeStrategyDecision();
    }

    // Otherwise, roll the dice
    return this.rollDice();
  }

  private startNewTurn(): GameStep {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;

    // Reset dice roller to the same seed for this round
    const roundSeed = this.baseSeed + this.currentRound;
    this.roller.reset(roundSeed);

    this.currentTurnManager = new TurnManager(
      currentPlayer.id,
      this.state,
      this.roller,
      this.scorer
    );

    this.currentTurnState = this.currentTurnManager.startTurn();
    this.currentTurnState.rollNumber = 0;

    const step: GameStep = {
      type: 'turn_start',
      gameState: this.cloneState(),
      currentPlayer,
      currentStrategy: strategy.name,
      turnPoints: 0,
      diceRemaining: 6,
      rollNumber: 0,
      message: `${strategy.name}'s turn begins. Starting with 6 dice.`
    };

    this.steps.push(step);
    return step;
  }

  private rollDice(): GameStep {
    if (!this.currentTurnManager) {
      throw new Error('No turn in progress');
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;

    this.currentTurnState = this.currentTurnManager.rollDice();
    this.currentTurnState.rollNumber = (this.currentTurnState.rollNumber || 0) + 1;

    if (this.currentTurnState.isFarkle) {
      const step: GameStep = {
        type: 'farkle',
        gameState: this.cloneState(),
        currentPlayer,
        currentStrategy: strategy.name,
        diceRolled: this.currentTurnState.lastRoll,
        turnPoints: this.currentTurnState.turnPoints,
        diceRemaining: this.currentTurnState.diceRemaining,
        rollNumber: this.currentTurnState.rollNumber,
        wasFarkle: true,
        message: `FARKLE! Rolled ${this.currentTurnState.lastRoll.join(', ')} - no scoring combinations. Turn ends with 0 points.`
      };

      this.steps.push(step);
      return step;
    }

    const step: GameStep = {
      type: 'roll',
      gameState: this.cloneState(),
      currentPlayer,
      currentStrategy: strategy.name,
      diceRolled: this.currentTurnState.lastRoll,
      scoringCombinations: this.currentTurnState.lastScoringResult?.combinations || [],
      turnPoints: this.currentTurnState.turnPoints,
      diceRemaining: this.currentTurnState.diceRemaining,
      rollNumber: this.currentTurnState.rollNumber,
      message: `Rolled ${this.currentTurnState.lastRoll.join(', ')}. Found ${this.currentTurnState.lastScoringResult?.combinations.length || 0} scoring combination(s).`
    };

    this.steps.push(step);
    return step;
  }

  private makeStrategyDecision(): GameStep {
    if (!this.currentTurnManager) {
      throw new Error('No turn in progress');
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;
    const context = this.createStrategyContext(currentPlayer, this.currentTurnState);

    // Let strategy decide which dice to select
    const selection = strategy.selectDice(context);
    this.currentTurnState = this.currentTurnManager.selectDice(selection.selectedCombinations);

    // Extract dice indices for visualization
    const selectedDice = selection.selectedCombinations.flatMap(c => c.diceIndices);

    const step: GameStep = {
      type: 'dice_selected',
      gameState: this.cloneState(),
      currentPlayer,
      currentStrategy: strategy.name,
      selectedDice,
      selectedCombinations: selection.selectedCombinations,
      turnPoints: this.currentTurnState.turnPoints,
      diceRemaining: this.currentTurnState.diceRemaining,
      rollNumber: this.currentTurnState.rollNumber,
      message: `${strategy.name} selected ${selection.selectedCombinations.length} combination(s) for ${selection.selectedCombinations.reduce((sum, c) => sum + c.points, 0)} points. Turn total: ${this.currentTurnState.turnPoints} points.`
    };

    this.steps.push(step);

    // Create updated context with new turn state AFTER dice selection
    const updatedContext = this.createStrategyContext(currentPlayer, this.currentTurnState);

    // Now get continue decision with updated context
    const continueDecision = strategy.decideContinue(updatedContext);

    // Check for hot dice
    if (this.currentTurnState.diceRemaining === 6 && this.currentTurnState.turnPoints > 0) {
      const hotDiceStep: GameStep = {
        type: 'continue_decision',
        gameState: this.cloneState(),
        currentPlayer,
        currentStrategy: strategy.name,
        decision: {
          continue: true,
          reason: 'HOT DICE! All dice scored - resetting to 6 dice and continuing.'
        },
        turnPoints: this.currentTurnState.turnPoints,
        diceRemaining: 6,
        rollNumber: this.currentTurnState.rollNumber,
        message: '🔥 HOT DICE! All dice scored - resetting to 6 dice and continuing!'
      };

      this.currentTurnState.decisionMade = true;
      this.currentTurnState.shouldStop = false;
      this.steps.push(hotDiceStep);
      return hotDiceStep;
    }

    const decisionStep: GameStep = {
      type: 'continue_decision',
      gameState: this.cloneState(),
      currentPlayer,
      currentStrategy: strategy.name,
      decision: {
        continue: continueDecision.continue,
        reason: continueDecision.reason || 'No reason provided'
      },
      turnPoints: this.currentTurnState.turnPoints,
      diceRemaining: this.currentTurnState.diceRemaining,
      rollNumber: this.currentTurnState.rollNumber,
      message: continueDecision.continue
        ? `${strategy.name} decides to CONTINUE. Reason: ${continueDecision.reason || 'No reason provided'}`
        : `${strategy.name} decides to STOP. Reason: ${continueDecision.reason || 'No reason provided'}`
    };

    this.currentTurnState.decisionMade = true;
    this.currentTurnState.shouldStop = !continueDecision.continue;

    this.steps.push(decisionStep);
    return decisionStep;
  }

  private bankCurrentTurn(): GameStep {
    if (!this.currentTurnManager) {
      throw new Error('No turn in progress');
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;
    const wasFarkle = this.currentTurnState.isFarkle;

    const result = this.currentTurnManager.bankPoints();

    // Update player stats
    currentPlayer.stats.totalTurns++;
    currentPlayer.stats.totalRolls += this.currentTurnState.rollNumber || 0;
    if (wasFarkle) {
      currentPlayer.stats.farkles++;
    }

    const step: GameStep = {
      type: 'bank',
      gameState: this.cloneState(),
      currentPlayer,
      currentStrategy: strategy.name,
      pointsBanked: result.pointsAdded,
      wasFarkle,
      message: wasFarkle
        ? `Turn ends with FARKLE. ${currentPlayer.name} gains 0 points. Score: ${result.newScore}`
        : `${currentPlayer.name} banks ${result.pointsAdded} points. New score: ${result.newScore}`
    };

    this.steps.push(step);

    // Check for game end
    if (currentPlayer.totalScore >= this.state.targetScore) {
      this.handleGameEnd();
    } else {
      // Move to next player
      const nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

      if (nextPlayerIndex === 0) {
        this.currentRound++;
      }

      this.state.currentPlayerIndex = nextPlayerIndex;
      this.currentTurnManager = null;
      this.currentTurnState = null;
    }

    return step;
  }

  private handleGameEnd(): void {
    const winner = this.state.players.reduce((max, player) =>
      player.totalScore > max.totalScore ? player : max
    );

    this.state.winnerId = winner.id;
    winner.gamesWon++;
    this.state.isGameOver = true;

    const step: GameStep = {
      type: 'game_end',
      gameState: this.cloneState(),
      currentPlayer: winner,
      currentStrategy: this.strategies.get(winner.id)!.name,
      message: `🏆 ${winner.name} (${this.strategies.get(winner.id)!.name}) WINS with ${winner.totalScore} points!`
    };

    this.steps.push(step);
  }

  private createPlayers(config: GameConfig, strategies: Strategy[]): PlayerState[] {
    const players: PlayerState[] = [];

    for (let i = 0; i < config.playerCount; i++) {
      const player: PlayerState = {
        id: `player-${i}`,
        name: strategies[i].name,
        totalScore: 0,
        isOnBoard: false,
        gamesWon: 0,
        stats: {
          totalTurns: 0,
          totalRolls: 0,
          farkles: 0,
          hotDiceCount: 0,
          averagePointsPerTurn: 0,
          maxTurnScore: 0
        }
      };
      players.push(player);
    }

    return players;
  }

  private createStrategyContext(player: PlayerState, turnState: any): StrategyContext {
    const opponents = this.state.players.filter(p => p.id !== player.id);
    const leadingOpponentScore = Math.max(...opponents.map(p => p.totalScore), 0);

    return {
      gameState: this.cloneState(),
      playerState: player,
      turnState,
      availableScoring: turnState.lastScoringResult!,
      opponents,
      leadingOpponentScore,
      farkleRisk: this.calculateFarkleRisk(turnState.diceRemaining),
      expectedValue: this.calculateExpectedValue(turnState.diceRemaining)
    };
  }

  private calculateFarkleRisk(diceRemaining: number): number {
    const farkleProb: Record<number, number> = {
      1: 0.667,
      2: 0.444,
      3: 0.278,
      4: 0.154,
      5: 0.077,
      6: 0.023
    };
    return farkleProb[diceRemaining] || 0.5;
  }

  private calculateExpectedValue(diceRemaining: number): number {
    const expectedPoints: Record<number, number> = {
      1: 50,
      2: 100,
      3: 150,
      4: 200,
      5: 250,
      6: 300
    };
    return expectedPoints[diceRemaining] || 150;
  }

  private cloneState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }
}
