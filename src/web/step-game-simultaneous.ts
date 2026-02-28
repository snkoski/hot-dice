/**
 * Simultaneous Step-through game mode
 * All strategies play at the same time with the same dice rolls
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

interface PlayerTurnState {
  playerId: string;
  playerName: string;
  strategyName: string;
  turnManager: TurnManager;
  turnState: any;
  isActive: boolean; // Still rolling
  wasFarkle: boolean;
  pointsThisTurn: number;
  rollCount: number;
}

interface PlayerDecision {
  playerId: string;
  playerName: string;
  strategyName: string;
  selectedCombinations: ScoringCombination[];
  selectedDice: number[];
  decision: {
    continue: boolean;
    reason: string;
  };
  turnPoints: number;
  diceRemaining: number;
  isActive: boolean;
  wasFarkle: boolean;
}

interface GameStep {
  type: 'game_start' | 'round_start' | 'roll' | 'decisions' | 'round_complete' | 'game_end';
  gameState: GameState;

  // Round info
  roundNumber?: number;
  rollNumber?: number;

  // Dice rolled (same for all players)
  diceRolled?: number[];
  scoringCombinations?: ScoringCombination[];

  // All player decisions
  playerDecisions?: PlayerDecision[];

  // Round completion
  roundResults?: {
    playerId: string;
    playerName: string;
    pointsBanked: number;
    wasFarkle: boolean;
    newScore: number;
  }[];

  message?: string;
}

export class SimultaneousStepGame {
  private state: GameState;
  private roller: DiceRoller;
  private scorer: ScoringEngine;
  private strategies: Map<string, Strategy>;
  private steps: GameStep[] = [];
  private currentRound: number = 0;
  private baseSeed: number;

  // Track all players' turn states
  private playerTurns: Map<string, PlayerTurnState> = new Map();
  private rollNumber: number = 0;

  constructor(config: GameConfig, strategies: Strategy[]) {
    if (strategies.length !== config.playerCount) {
      throw new Error(`Expected ${config.playerCount} strategies, got ${strategies.length}`);
    }

    this.baseSeed = config.seed || Math.floor(Math.random() * 1000000);
    this.roller = new DiceRoller(this.baseSeed);
    this.scorer = new ScoringEngine(config.scoringRules);
    this.strategies = new Map();

    // Initialize game state
    this.state = {
      gameId: `sim-game-${Date.now()}`,
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
      message: 'Game started! All strategies will play simultaneously with the same dice rolls. Click Next to begin Round 1.'
    });
  }

  getSteps(): GameStep[] {
    return this.steps;
  }

  getCurrentStep(): GameStep {
    return this.steps[this.steps.length - 1];
  }

  /**
   * Advance to the next step
   */
  nextStep(): GameStep {
    if (this.state.isGameOver) {
      return this.getCurrentStep();
    }

    // If no active turns, start a new round
    if (this.playerTurns.size === 0) {
      return this.startNewRound();
    }

    // Check if all players are done
    const activePlayers = Array.from(this.playerTurns.values()).filter(pt => pt.isActive);
    if (activePlayers.length === 0) {
      return this.completeRound();
    }

    // Roll dice for all active players
    return this.rollForAllPlayers();
  }

  private startNewRound(): GameStep {
    this.currentRound++;
    this.rollNumber = 0;

    // Reset dice roller with round seed
    const roundSeed = this.baseSeed + this.currentRound;
    this.roller.reset(roundSeed);

    // Initialize turn managers for all players
    this.playerTurns.clear();

    for (const player of this.state.players) {
      const turnManager = new TurnManager(
        player.id,
        this.state,
        this.roller,
        this.scorer
      );

      const turnState = turnManager.startTurn();

      // Ensure turn state has the right initial values
      turnState.turnPoints = 0;
      turnState.diceRemaining = 6;

      this.playerTurns.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        strategyName: this.strategies.get(player.id)!.name,
        turnManager,
        turnState,
        isActive: true,
        wasFarkle: false,
        pointsThisTurn: 0,
        rollCount: 0
      });
    }

    const step: GameStep = {
      type: 'round_start',
      gameState: this.cloneState(),
      roundNumber: this.currentRound,
      message: `Round ${this.currentRound} begins! All ${this.state.players.length} strategies start with 6 dice.`
    };

    this.steps.push(step);
    return step;
  }

  private rollForAllPlayers(): GameStep {
    this.rollNumber++;

    // Get the dice roll (same for all players)
    const activePlayers = Array.from(this.playerTurns.values()).filter(pt => pt.isActive);

    // Roll dice using the first active player's turn manager
    const firstActive = activePlayers[0];
    const diceCount = firstActive.turnState.diceRemaining;

    // Roll the dice once
    const diceRoll = this.roller.roll(diceCount);
    const scoringResult = this.scorer.analyzeRoll(diceRoll);

    // Apply this roll to all active players and get their decisions
    const playerDecisions: PlayerDecision[] = [];

    for (const playerTurn of activePlayers) {
      // Manually update the turn state with the dice roll
      playerTurn.turnState.lastRoll = [...diceRoll];
      playerTurn.turnState.lastScoringResult = scoringResult;
      playerTurn.rollCount++;

      // Check for farkle
      if (scoringResult.combinations.length === 0) {
        playerTurn.isActive = false;
        playerTurn.wasFarkle = true;

        playerDecisions.push({
          playerId: playerTurn.playerId,
          playerName: playerTurn.playerName,
          strategyName: playerTurn.strategyName,
          selectedCombinations: [],
          selectedDice: [],
          decision: {
            continue: false,
            reason: 'FARKLE - no scoring combinations'
          },
          turnPoints: playerTurn.turnState.turnPoints,
          diceRemaining: playerTurn.turnState.diceRemaining,
          isActive: false,
          wasFarkle: true
        });
        continue;
      }

      // Get strategy's decision
      const strategy = this.strategies.get(playerTurn.playerId)!;
      const context = this.createStrategyContext(
        this.state.players.find(p => p.id === playerTurn.playerId)!,
        playerTurn.turnState
      );

      // Let strategy select dice
      const selection = strategy.selectDice(context);

      // Manually update turn state with selected dice
      const pointsFromSelection = selection.selectedCombinations.reduce((sum, c) => sum + c.points, 0);
      const diceUsed = selection.selectedCombinations.reduce((sum, c) => sum + c.dice.length, 0);

      playerTurn.turnState.turnPoints += pointsFromSelection;
      playerTurn.turnState.diceRemaining -= diceUsed;

      // Check for hot dice (all dice used)
      if (playerTurn.turnState.diceRemaining === 0) {
        playerTurn.turnState.diceRemaining = 6; // Reset to 6 dice
      }

      // Create updated context after dice selection
      const updatedContext = this.createStrategyContext(
        this.state.players.find(p => p.id === playerTurn.playerId)!,
        playerTurn.turnState
      );

      // Get continue decision
      let continueDecision = strategy.decideContinue(updatedContext);

      // Check for hot dice (just reset to 6)
      if (playerTurn.turnState.diceRemaining === 6 && diceUsed > 0) {
        continueDecision = {
          continue: true,
          reason: '🔥 HOT DICE! All dice scored - continuing with 6 dice'
        };
      }

      // Update active status
      if (!continueDecision.continue) {
        playerTurn.isActive = false;
      }

      playerDecisions.push({
        playerId: playerTurn.playerId,
        playerName: playerTurn.playerName,
        strategyName: playerTurn.strategyName,
        selectedCombinations: selection.selectedCombinations,
        selectedDice: selection.selectedCombinations.flatMap(c => c.diceIndices),
        decision: {
          continue: continueDecision.continue,
          reason: continueDecision.reason || 'No reason provided'
        },
        turnPoints: playerTurn.turnState.turnPoints,
        diceRemaining: playerTurn.turnState.diceRemaining,
        isActive: playerTurn.isActive,
        wasFarkle: false
      });
    }

    const step: GameStep = {
      type: 'roll',
      gameState: this.cloneState(),
      roundNumber: this.currentRound,
      rollNumber: this.rollNumber,
      diceRolled: diceRoll,
      scoringCombinations: scoringResult.combinations,
      message: `Roll ${this.rollNumber}: Rolled ${diceRoll.join(', ')}. ${scoringResult.combinations.length > 0 ? `Found ${scoringResult.combinations.length} scoring combination(s).` : 'FARKLE!'}`,
    };

    this.steps.push(step);

    // Add decisions step
    const decisionsStep: GameStep = {
      type: 'decisions',
      gameState: this.cloneState(),
      roundNumber: this.currentRound,
      rollNumber: this.rollNumber,
      diceRolled: diceRoll, // Include dice roll for display
      scoringCombinations: scoringResult.combinations, // Include scoring combos
      playerDecisions,
      message: `${playerDecisions.filter(d => d.isActive).length} strategy(ies) continuing, ${playerDecisions.filter(d => !d.isActive).length} stopped/farkled.`
    };

    this.steps.push(decisionsStep);
    return decisionsStep;
  }

  private completeRound(): GameStep {
    const roundResults = Array.from(this.playerTurns.values()).map(playerTurn => {
      const player = this.state.players.find(p => p.id === playerTurn.playerId)!;

      // Manually bank points
      const turnPoints = playerTurn.wasFarkle ? 0 : playerTurn.turnState.turnPoints;
      let pointsActuallyBanked = 0;

      // Check if player is on board
      if (!player.isOnBoard && turnPoints >= this.state.minimumScoreToBoard) {
        player.isOnBoard = true;
      }

      // Add points if on board
      if (player.isOnBoard && turnPoints > 0) {
        player.totalScore += turnPoints;
        pointsActuallyBanked = turnPoints;
      }

      // Update player stats
      player.stats.totalTurns++;
      player.stats.totalRolls += playerTurn.rollCount;
      if (playerTurn.wasFarkle) {
        player.stats.farkles++;
      }
      if (turnPoints > player.stats.maxTurnScore) {
        player.stats.maxTurnScore = turnPoints;
      }

      return {
        playerId: playerTurn.playerId,
        playerName: playerTurn.playerName,
        pointsBanked: pointsActuallyBanked,
        wasFarkle: playerTurn.wasFarkle,
        newScore: player.totalScore
      };
    });

    // Clear player turns
    this.playerTurns.clear();
    this.rollNumber = 0;

    // Check for game end
    const anyWinner = this.state.players.find(p => p.totalScore >= this.state.targetScore);

    if (anyWinner) {
      // Find all players with the highest score (detect ties)
      const maxScore = Math.max(...this.state.players.map(p => p.totalScore));
      const winners = this.state.players.filter(p => p.totalScore === maxScore);

      this.state.winnerIds = winners.map(w => w.id);
      this.state.winnerId = winners[0].id; // Backward compatibility
      winners.forEach(w => w.gamesWon++);
      this.state.isGameOver = true;

      const message = winners.length > 1
        ? `🤝 TIE! ${winners.map(w => w.name).join(' and ')} tie with ${maxScore} points!`
        : `🏆 ${winners[0].name} WINS with ${maxScore} points!`;

      const gameEndStep: GameStep = {
        type: 'game_end',
        gameState: this.cloneState(),
        roundResults,
        message
      };

      this.steps.push(gameEndStep);
      return gameEndStep;
    }

    const step: GameStep = {
      type: 'round_complete',
      gameState: this.cloneState(),
      roundNumber: this.currentRound,
      roundResults,
      message: `Round ${this.currentRound} complete! Click Next for Round ${this.currentRound + 1}.`
    };

    this.steps.push(step);
    return step;
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
