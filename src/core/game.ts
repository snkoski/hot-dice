import { DiceRoller } from './dice';
import { ScoringEngine } from './scoring';
import { TurnManager } from './turn';
import type {
  GameConfig,
  GameState,
  PlayerState,
  TurnRecord,
  Strategy,
  StrategyContext
} from './types';

/**
 * Main game orchestrator
 */
export class Game {
  private state: GameState;
  private roller: DiceRoller;
  private scorer: ScoringEngine;
  private strategies: Map<string, Strategy>;
  private baseSeed: number;
  private currentRound: number;

  constructor(config: GameConfig, strategies: Strategy[]) {
    if (strategies.length !== config.playerCount) {
      throw new Error(`Expected ${config.playerCount} strategies, got ${strategies.length}`);
    }

    this.baseSeed = config.seed || Math.floor(Math.random() * 1000000);
    this.roller = new DiceRoller(this.baseSeed);
    this.scorer = new ScoringEngine(config.scoringRules);
    this.strategies = new Map();
    this.currentRound = 0;

    // Initialize game state
    this.state = {
      gameId: `game-${Date.now()}`,
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

      // Call onGameStart if strategy implements it
      strategies[index].onGameStart?.(this.getState());
    });
  }

  /**
   * Play a single turn
   */
  playTurn(): TurnRecord {
    if (this.state.isGameOver) {
      throw new Error('Game is already over');
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    const strategy = this.strategies.get(currentPlayer.id)!;

    // Reset dice roller to the same seed for this round
    // This ensures all players in the same round get the same dice rolls
    const roundSeed = this.baseSeed + this.currentRound;
    this.roller.reset(roundSeed);

    const turnMgr = new TurnManager(currentPlayer.id, this.state, this.roller, this.scorer);

    // Start the turn
    let turnState = turnMgr.startTurn();
    let rollCount = 0;

    // Keep playing until player decides to stop or farkles
    while (turnState.canContinue && !turnState.isFarkle) {
      // Roll dice
      turnState = turnMgr.rollDice();
      rollCount++;

      // Track rolls by dice count for luck calculation
      if (turnState.lastRoll) {
        const diceCount = turnState.lastRoll.length;
        if (!currentPlayer.stats.rollsByDiceCount) {
          currentPlayer.stats.rollsByDiceCount = {};
        }
        currentPlayer.stats.rollsByDiceCount[diceCount] =
          (currentPlayer.stats.rollsByDiceCount[diceCount] || 0) + 1;
      }

      if (turnState.isFarkle) {
        break;
      }

      // Let strategy decide which dice to select
      const context = this.createStrategyContext(currentPlayer, turnState);
      const selection = strategy.selectDice(context);

      // Select the dice
      turnState = turnMgr.selectDice(selection.selectedCombinations);

      // Let strategy decide whether to continue
      const continueDecision = strategy.decideContinue(context);

      if (!continueDecision.continue || turnState.diceRemaining === 0) {
        // Player wants to bank or used all dice (hot dice reset means continue)
        if (turnState.diceRemaining === 6 && turnState.turnPoints > 0) {
          // Hot dice - continue rolling
          continue;
        }
        break;
      }
    }

    // Bank points
    const result = turnMgr.bankPoints();

    // Create turn record
    const turnRecord: TurnRecord = {
      playerId: currentPlayer.id,
      rollCount,
      pointsScored: result.pointsAdded,
      finalScore: result.newScore,
      wasFarkle: turnState.isFarkle,
      farkleDiceCount: turnState.isFarkle && turnState.lastRoll ? turnState.lastRoll.length : undefined,
      timestamp: new Date()
    };

    // Update player stats
    currentPlayer.stats.totalTurns++;
    currentPlayer.stats.totalRolls += rollCount;
    if (turnState.isFarkle) {
      currentPlayer.stats.farkles++;
      if (turnRecord.farkleDiceCount) {
        if (!currentPlayer.stats.farkleDiceDistribution) {
          currentPlayer.stats.farkleDiceDistribution = {};
        }
        currentPlayer.stats.farkleDiceDistribution[turnRecord.farkleDiceCount] =
          (currentPlayer.stats.farkleDiceDistribution[turnRecord.farkleDiceCount] || 0) + 1;
      }
    }
    if (turnRecord.pointsScored > currentPlayer.stats.maxTurnScore) {
      currentPlayer.stats.maxTurnScore = turnRecord.pointsScored;
    }

    // Record turn in history
    this.state.turnHistory.push(turnRecord);

    // Call onTurnComplete if strategy implements it
    strategy.onTurnComplete?.(turnRecord);

    // Check for game end
    if (currentPlayer.totalScore >= this.state.targetScore) {
      this.handleGameEnd();
    } else {
      // Move to next player
      const nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

      // If we're wrapping back to player 0, increment the round
      if (nextPlayerIndex === 0) {
        this.currentRound++;
      }

      this.state.currentPlayerIndex = nextPlayerIndex;
    }

    return turnRecord;
  }

  /**
   * Play the entire game to completion
   */
  play(): GameState {
    while (!this.state.isGameOver) {
      this.playTurn();
    }

    return this.getState();
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.state.isGameOver;
  }

  /**
   * Get the winner
   */
  getWinner(): PlayerState | null {
    if (!this.state.winnerId) {
      return null;
    }
    return this.state.players.find(p => p.id === this.state.winnerId) || null;
  }

  /**
   * Get current game state (readonly)
   */
  getState(): Readonly<GameState> {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Create players
   */
  private createPlayers(config: GameConfig, strategies: Strategy[]): PlayerState[] {
    const players: PlayerState[] = [];

    for (let i = 0; i < config.playerCount; i++) {
      const player: PlayerState = {
        id: `player-${i}`,
        name: config.playerNames?.[i] || `Player ${i + 1}`,
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

  /**
   * Create strategy context
   */
  private createStrategyContext(player: PlayerState, turnState: any): StrategyContext {
    const opponents = this.state.players.filter(p => p.id !== player.id);
    const leadingOpponentScore = Math.max(...opponents.map(p => p.totalScore), 0);

    // Simple farkle risk calculation based on dice remaining
    const farkleRisk = this.calculateFarkleRisk(turnState.diceRemaining);

    // Simple expected value (can be improved)
    const expectedValue = this.calculateExpectedValue(turnState.diceRemaining);

    return {
      gameState: this.getState(),
      playerState: player,
      turnState,
      availableScoring: turnState.lastScoringResult!,
      opponents,
      leadingOpponentScore,
      farkleRisk,
      expectedValue
    };
  }

  /**
   * Calculate approximate farkle risk
   */
  private calculateFarkleRisk(diceRemaining: number): number {
    // Approximate probability of farkle based on dice count
    // These are rough estimates
    const farkleProb: Record<number, number> = {
      1: 0.667, // 4/6 = no score
      2: 0.444,
      3: 0.278,
      4: 0.154,
      5: 0.077,
      6: 0.023
    };

    return farkleProb[diceRemaining] || 0.5;
  }

  /**
   * Calculate expected value for continuing
   */
  private calculateExpectedValue(diceRemaining: number): number {
    // Rough expected points per roll
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

  /**
   * Handle game end - give all players final turn
   */
  private handleGameEnd(): void {
    const playerWhoReachedTarget = this.state.currentPlayerIndex;

    // Give remaining players their final turn
    let nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

    while (nextPlayerIndex !== playerWhoReachedTarget) {
      this.state.currentPlayerIndex = nextPlayerIndex;

      // Reset dice roller to the same seed for this round
      const roundSeed = this.baseSeed + this.currentRound;
      this.roller.reset(roundSeed);

      const currentPlayer = this.state.players[this.state.currentPlayerIndex];
      const strategy = this.strategies.get(currentPlayer.id)!;
      const turnMgr = new TurnManager(currentPlayer.id, this.state, this.roller, this.scorer);

      let turnState = turnMgr.startTurn();
      let rollCount = 0;

      while (turnState.canContinue && !turnState.isFarkle) {
        turnState = turnMgr.rollDice();
        rollCount++;

        // Track rolls by dice count for luck calculation
        if (turnState.lastRoll) {
          const diceCount = turnState.lastRoll.length;
          if (!currentPlayer.stats.rollsByDiceCount) {
            currentPlayer.stats.rollsByDiceCount = {};
          }
          currentPlayer.stats.rollsByDiceCount[diceCount] =
            (currentPlayer.stats.rollsByDiceCount[diceCount] || 0) + 1;
        }

        if (turnState.isFarkle) {
          break;
        }

        const context = this.createStrategyContext(currentPlayer, turnState);
        const selection = strategy.selectDice(context);
        turnState = turnMgr.selectDice(selection.selectedCombinations);

        const continueDecision = strategy.decideContinue(context);

        if (!continueDecision.continue || turnState.diceRemaining === 0) {
          if (turnState.diceRemaining === 6 && turnState.turnPoints > 0) {
            continue;
          }
          break;
        }
      }

      const result = turnMgr.bankPoints();

      const turnRecord: TurnRecord = {
        playerId: currentPlayer.id,
        rollCount,
        pointsScored: result.pointsAdded,
        finalScore: result.newScore,
        wasFarkle: turnState.isFarkle,
        farkleDiceCount: turnState.isFarkle && turnState.lastRoll ? turnState.lastRoll.length : undefined,
        timestamp: new Date()
      };

      currentPlayer.stats.totalTurns++;
      currentPlayer.stats.totalRolls += rollCount;
      if (turnState.isFarkle) {
        currentPlayer.stats.farkles++;
        if (turnRecord.farkleDiceCount) {
          if (!currentPlayer.stats.farkleDiceDistribution) {
            currentPlayer.stats.farkleDiceDistribution = {};
          }
          currentPlayer.stats.farkleDiceDistribution[turnRecord.farkleDiceCount] =
            (currentPlayer.stats.farkleDiceDistribution[turnRecord.farkleDiceCount] || 0) + 1;
        }
      }
      if (turnRecord.pointsScored > currentPlayer.stats.maxTurnScore) {
        currentPlayer.stats.maxTurnScore = turnRecord.pointsScored;
      }

      this.state.turnHistory.push(turnRecord);
      strategy.onTurnComplete?.(turnRecord);

      nextPlayerIndex = (nextPlayerIndex + 1) % this.state.players.length;
    }

    // Determine winner(s) - find all players with the highest score
    const maxScore = Math.max(...this.state.players.map(p => p.totalScore));
    const winners = this.state.players.filter(p => p.totalScore === maxScore);

    // Mark all winners
    this.state.winnerIds = winners.map(w => w.id);
    this.state.winnerId = winners[0].id; // Backward compatibility
    winners.forEach(w => w.gamesWon++);
    this.state.isGameOver = true;

    // Call onGameEnd for all strategies
    this.strategies.forEach(strategy => {
      strategy.onGameEnd?.(this.getState());
    });
  }
}
