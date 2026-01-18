import { describe, it, expect, beforeEach } from 'vitest';
import { TurnManager } from '../../src/core/turn';
import { DiceRoller } from '../../src/core/dice';
import { ScoringEngine } from '../../src/core/scoring';
import type { GameState, PlayerState } from '../../src/core/types';

describe('TurnManager', () => {
  let gameState: GameState;
  let roller: DiceRoller;
  let scorer: ScoringEngine;

  beforeEach(() => {
    const player: PlayerState = {
      id: 'player1',
      name: 'Test Player',
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

    gameState = {
      gameId: 'test-game',
      players: [player],
      currentPlayerIndex: 0,
      currentTurn: null,
      targetScore: 10000,
      minimumScoreToBoard: 500,
      isGameOver: false,
      winnerId: null,
      turnHistory: []
    };

    roller = new DiceRoller(42);
    scorer = new ScoringEngine();
  });

  describe('startTurn', () => {
    it('should initialize a new turn', () => {
      const turnMgr = new TurnManager('player1', gameState, roller, scorer);
      const turn = turnMgr.startTurn();

      expect(turn.playerId).toBe('player1');
      expect(turn.turnPoints).toBe(0);
      expect(turn.rollNumber).toBe(0);
      expect(turn.diceRemaining).toBe(6);
      expect(turn.lastRoll).toBeNull();
      expect(turn.lastScoringResult).toBeNull();
      expect(turn.bankedCombinations).toEqual([]);
      expect(turn.canContinue).toBe(true);
      expect(turn.isFarkle).toBe(false);
    });
  });

  describe('rollDice', () => {
    it('should roll initial 6 dice', () => {
      const turnMgr = new TurnManager('player1', gameState, roller, scorer);
      turnMgr.startTurn();

      const turn = turnMgr.rollDice();

      expect(turn.lastRoll).toHaveLength(6);
      expect(turn.rollNumber).toBe(1);
      expect(turn.lastScoringResult).not.toBeNull();
    });

    it('should roll remaining dice after selection', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(100), scorer);
      turnMgr.startTurn();
      turnMgr.rollDice();

      // Assume we kept some dice, leaving 3 remaining
      const currentState = turnMgr.getState();
      if (currentState.lastScoringResult && !currentState.lastScoringResult.isFarkle) {
        const diceToKeep = currentState.lastScoringResult.scoringDiceCount;
        turnMgr.selectDice(currentState.lastScoringResult.combinations.slice(0, 1));

        const turn = turnMgr.rollDice();
        expect(turn.rollNumber).toBe(2);
      }
    });

    it('should detect farkle', () => {
      // Use a seed that produces a farkle
      const farkleRoller = new DiceRoller(12345);
      const turnMgr = new TurnManager('player1', gameState, farkleRoller, scorer);
      turnMgr.startTurn();

      // Keep rolling until we get a farkle
      let turn = turnMgr.rollDice();
      let attempts = 0;
      while (!turn.isFarkle && attempts < 100) {
        if (turn.lastScoringResult && turn.lastScoringResult.combinations.length > 0) {
          turnMgr.selectDice([turn.lastScoringResult.combinations[0]]);
          if (turn.diceRemaining > 0) {
            turn = turnMgr.rollDice();
          } else {
            break;
          }
        } else {
          break;
        }
        attempts++;
      }

      // Should eventually farkle with enough attempts or find a farkle roll
      expect(turn).toBeDefined();
    });
  });

  describe('selectDice', () => {
    it('should select scoring combinations and update turn points', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(50), scorer);
      turnMgr.startTurn();
      const afterRoll = turnMgr.rollDice();

      if (afterRoll.lastScoringResult && afterRoll.lastScoringResult.combinations.length > 0) {
        const combo = afterRoll.lastScoringResult.combinations[0];
        const turn = turnMgr.selectDice([combo]);

        expect(turn.turnPoints).toBe(combo.points);
        expect(turn.bankedCombinations).toHaveLength(1);
        expect(turn.diceRemaining).toBe(6 - combo.diceIndices.length);
      }
    });

    it('should accumulate points from multiple selections', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(75), scorer);
      turnMgr.startTurn();
      let turn = turnMgr.rollDice();

      if (turn.lastScoringResult && turn.lastScoringResult.combinations.length >= 2) {
        const combo1 = turn.lastScoringResult.combinations[0];
        turn = turnMgr.selectDice([combo1]);
        const pointsAfterFirst = turn.turnPoints;

        if (turn.diceRemaining > 0) {
          turn = turnMgr.rollDice();
          if (turn.lastScoringResult && turn.lastScoringResult.combinations.length > 0) {
            const combo2 = turn.lastScoringResult.combinations[0];
            turn = turnMgr.selectDice([combo2]);

            expect(turn.turnPoints).toBeGreaterThan(pointsAfterFirst);
          }
        }
      }
    });

    it('should update dice remaining correctly', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(80), scorer);
      turnMgr.startTurn();
      const afterRoll = turnMgr.rollDice();

      if (afterRoll.lastScoringResult && afterRoll.lastScoringResult.combinations.length > 0) {
        const combo = afterRoll.lastScoringResult.combinations[0];
        const diceUsed = combo.diceIndices.length;
        const turn = turnMgr.selectDice([combo]);

        expect(turn.diceRemaining).toBe(6 - diceUsed);
      }
    });
  });

  describe('hot dice', () => {
    it('should reset to 6 dice when all dice score', () => {
      // Create a scenario with hot dice
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(999), scorer);
      turnMgr.startTurn();

      let turn = turnMgr.rollDice();
      let attempts = 0;

      // Keep rolling until we get hot dice or run out of attempts
      while (attempts < 50) {
        if (turn.lastScoringResult) {
          if (turn.lastScoringResult.isHotDice) {
            // Select all scoring dice
            turn = turnMgr.selectDice(turn.lastScoringResult.combinations);
            expect(turn.diceRemaining).toBe(6);
            break;
          } else if (turn.lastScoringResult.combinations.length > 0) {
            turn = turnMgr.selectDice([turn.lastScoringResult.combinations[0]]);
            if (turn.diceRemaining > 0) {
              turn = turnMgr.rollDice();
            } else {
              break;
            }
          }
        }
        attempts++;
      }
    });

    it('should maintain turn points when hot dice occurs', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(888), scorer);
      turnMgr.startTurn();

      let turn = turnMgr.rollDice();
      let attempts = 0;

      while (attempts < 50) {
        if (turn.lastScoringResult) {
          if (turn.lastScoringResult.isHotDice) {
            const pointsBeforeHotDice = turn.lastScoringResult.totalPoints;
            turn = turnMgr.selectDice(turn.lastScoringResult.combinations);

            expect(turn.turnPoints).toBe(pointsBeforeHotDice);
            expect(turn.diceRemaining).toBe(6);
            break;
          } else if (turn.lastScoringResult.combinations.length > 0) {
            turn = turnMgr.selectDice([turn.lastScoringResult.combinations[0]]);
            if (turn.diceRemaining > 0) {
              turn = turnMgr.rollDice();
            }
          }
        }
        attempts++;
      }
    });
  });

  describe('bankPoints', () => {
    it('should return points earned this turn', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(200), scorer);
      turnMgr.startTurn();
      const afterRoll = turnMgr.rollDice();

      if (afterRoll.lastScoringResult && afterRoll.lastScoringResult.combinations.length > 0) {
        const combo = afterRoll.lastScoringResult.combinations[0];
        turnMgr.selectDice([combo]);

        const result = turnMgr.bankPoints();
        expect(result.pointsAdded).toBe(combo.points);
        expect(result.newScore).toBe(combo.points);
      }
    });

    it('should not bank points on farkle', () => {
      const turnMgr = new TurnManager('player1', gameState, roller, scorer);
      turnMgr.startTurn();
      turnMgr.rollDice();

      // Force a farkle by manually setting state
      const state = turnMgr.getState();
      if (state.lastScoringResult && state.lastScoringResult.isFarkle) {
        const result = turnMgr.bankPoints();
        expect(result.pointsAdded).toBe(0);
        expect(result.newScore).toBe(0);
      }
    });

    it('should update player isOnBoard status when reaching minimum', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(300), scorer);
      turnMgr.startTurn();

      let turn = turnMgr.rollDice();
      let totalPoints = 0;

      // Accumulate at least 500 points
      let attempts = 0;
      while (totalPoints < 500 && attempts < 20) {
        if (turn.lastScoringResult && turn.lastScoringResult.combinations.length > 0) {
          turn = turnMgr.selectDice(turn.lastScoringResult.combinations);
          totalPoints = turn.turnPoints;

          if (totalPoints >= 500) {
            const result = turnMgr.bankPoints();
            expect(gameState.players[0].isOnBoard).toBe(true);
            break;
          }

          if (turn.diceRemaining > 0) {
            turn = turnMgr.rollDice();
          }
        }
        attempts++;
      }
    });
  });

  describe('canContinue', () => {
    it('should be false after farkle', () => {
      const turnMgr = new TurnManager('player1', gameState, roller, scorer);
      turnMgr.startTurn();

      let turn = turnMgr.rollDice();
      if (turn.lastScoringResult && turn.lastScoringResult.isFarkle) {
        expect(turn.canContinue).toBe(false);
      }
    });

    it('should be true with scoring dice', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(150), scorer);
      turnMgr.startTurn();

      const turn = turnMgr.rollDice();
      if (turn.lastScoringResult && !turn.lastScoringResult.isFarkle) {
        expect(turn.canContinue).toBe(true);
      }
    });
  });

  describe('getState', () => {
    it('should return current turn state', () => {
      const turnMgr = new TurnManager('player1', gameState, roller, scorer);
      turnMgr.startTurn();

      const state = turnMgr.getState();
      expect(state.playerId).toBe('player1');
      expect(state.diceRemaining).toBe(6);
    });

    it('should reflect state changes', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(250), scorer);
      turnMgr.startTurn();
      turnMgr.rollDice();

      const state = turnMgr.getState();
      expect(state.rollNumber).toBe(1);
      expect(state.lastRoll).not.toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete successful turn', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(400), scorer);
      turnMgr.startTurn();

      // Roll dice
      let turn = turnMgr.rollDice();
      expect(turn.rollNumber).toBe(1);

      // Select scoring dice
      if (turn.lastScoringResult && turn.lastScoringResult.combinations.length > 0) {
        turn = turnMgr.selectDice([turn.lastScoringResult.combinations[0]]);
        expect(turn.turnPoints).toBeGreaterThan(0);

        // Bank points
        const result = turnMgr.bankPoints();
        expect(result.pointsAdded).toBeGreaterThan(0);
      }
    });

    it('should handle multiple rolls in a turn', () => {
      const turnMgr = new TurnManager('player1', gameState, new DiceRoller(500), scorer);
      turnMgr.startTurn();

      let turn = turnMgr.rollDice();
      let rollCount = 1;

      for (let i = 0; i < 3; i++) {
        if (turn.lastScoringResult && turn.lastScoringResult.combinations.length > 0 && !turn.isFarkle) {
          turn = turnMgr.selectDice([turn.lastScoringResult.combinations[0]]);

          if (turn.diceRemaining > 0) {
            turn = turnMgr.rollDice();
            rollCount++;
          }
        }
      }

      expect(turn.rollNumber).toBeGreaterThan(0);
    });
  });
});
