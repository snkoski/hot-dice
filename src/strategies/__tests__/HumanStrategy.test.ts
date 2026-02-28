import { HumanStrategy } from '../HumanStrategy';
import { StrategyContext, DiceSelectionDecision, ContinueDecision } from '../../core/types';

describe('HumanStrategy', () => {
  let strategy: HumanStrategy;

  beforeEach(() => {
    strategy = new HumanStrategy('human-1', 'Test Human', 'Test human player', '1.0.0');
  });

  describe('Strategy interface compliance', () => {
    test('should have required strategy properties', () => {
      expect(strategy.id).toBe('human-1');
      expect(strategy.name).toBe('Test Human');
      expect(strategy.description).toBe('Test human player');
      expect(strategy.version).toBe('1.0.0');
    });

    test('should implement selectDice method', () => {
      expect(typeof strategy.selectDice).toBe('function');
    });

    test('should implement decideContinue method', () => {
      expect(typeof strategy.decideContinue).toBe('function');
    });
  });

  describe('Dice selection flow', () => {
    test('createDiceDecisionPromise should return a promise', () => {
      const promise = strategy.createDiceDecisionPromise();
      expect(promise).toBeInstanceOf(Promise);
    });

    test('submitDiceSelection should resolve the promise', async () => {
      const promise = strategy.createDiceDecisionPromise();

      const decision: DiceSelectionDecision = {
        selectedCombinations: [],
        points: 100,
        diceKept: 2,
        reason: 'Test selection'
      };

      strategy.submitDiceSelection(decision);

      const result = await promise;
      expect(result).toEqual(decision);
    });

    test('selectDice should return the submitted decision', () => {
      const decision: DiceSelectionDecision = {
        selectedCombinations: [],
        points: 100,
        diceKept: 2,
        reason: 'Test selection'
      };

      strategy.submitDiceSelection(decision);

      const mockContext: any = {
        playerId: 'player-1',
        playerName: 'Player 1',
        diceRolled: [1, 1, 5],
        scoringCombinations: [],
        turnPoints: 0,
        diceRemaining: 6,
        playerScore: 0,
        opponentScores: [],
        targetScore: 10000,
        minimumScoreToBoard: 0
      };

      const result = strategy.selectDice(mockContext);
      expect(result).toEqual(decision);
    });

    test('selectDice should throw error if called before decision submitted', () => {
      const mockContext: any = {
        playerId: 'player-1',
        playerName: 'Player 1',
        diceRolled: [1, 1, 5],
        scoringCombinations: [],
        turnPoints: 0,
        diceRemaining: 6,
        playerScore: 0,
        opponentScores: [],
        targetScore: 10000,
        minimumScoreToBoard: 0
      };

      expect(() => strategy.selectDice(mockContext)).toThrow(
        'No human dice selection available - must call waitForDiceSelection first'
      );
    });
  });

  describe('Continue decision flow', () => {
    test('createContinueDecisionPromise should return a promise', () => {
      const promise = strategy.createContinueDecisionPromise();
      expect(promise).toBeInstanceOf(Promise);
    });

    test('submitContinueDecision should resolve the promise', async () => {
      const promise = strategy.createContinueDecisionPromise();

      const decision: ContinueDecision = {
        continue: true,
        reason: 'Test continue'
      };

      strategy.submitContinueDecision(decision);

      const result = await promise;
      expect(result).toEqual(decision);
    });

    test('decideContinue should return the submitted decision', () => {
      const decision: ContinueDecision = {
        continue: true,
        reason: 'Test continue'
      };

      strategy.submitContinueDecision(decision);

      const mockContext: any = {
        playerId: 'player-1',
        playerName: 'Player 1',
        diceRolled: [1, 1, 5],
        scoringCombinations: [],
        turnPoints: 300,
        diceRemaining: 4,
        playerScore: 1000,
        opponentScores: [500],
        targetScore: 10000,
        minimumScoreToBoard: 0
      };

      const result = strategy.decideContinue(mockContext);
      expect(result).toEqual(decision);
    });

    test('decideContinue should throw error if called before decision submitted', () => {
      const mockContext: any = {
        playerId: 'player-1',
        playerName: 'Player 1',
        diceRolled: [1, 1, 5],
        scoringCombinations: [],
        turnPoints: 300,
        diceRemaining: 4,
        playerScore: 1000,
        opponentScores: [500],
        targetScore: 10000,
        minimumScoreToBoard: 0
      };

      expect(() => strategy.decideContinue(mockContext)).toThrow(
        'No human continue decision available - must call waitForContinueDecision first'
      );
    });
  });

  describe('Decision reset', () => {
    test('resetDecisions should clear dice decision state', () => {
      const decision: DiceSelectionDecision = {
        selectedCombinations: [],
        points: 100,
        diceKept: 2,
        reason: 'Test selection'
      };

      strategy.submitDiceSelection(decision);
      strategy.resetDecisions();

      const mockContext: any = {
        playerId: 'player-1',
        playerName: 'Player 1',
        diceRolled: [1, 1, 5],
        scoringCombinations: [],
        turnPoints: 0,
        diceRemaining: 6,
        playerScore: 0,
        opponentScores: [],
        targetScore: 10000,
        minimumScoreToBoard: 0
      };

      expect(() => strategy.selectDice(mockContext)).toThrow();
    });

    test('resetDecisions should clear continue decision state', () => {
      const decision: ContinueDecision = {
        continue: true,
        reason: 'Test continue'
      };

      strategy.submitContinueDecision(decision);
      strategy.resetDecisions();

      const mockContext: any = {
        playerId: 'player-1',
        playerName: 'Player 1',
        diceRolled: [1, 1, 5],
        scoringCombinations: [],
        turnPoints: 300,
        diceRemaining: 4,
        playerScore: 1000,
        opponentScores: [500],
        targetScore: 10000,
        minimumScoreToBoard: 0
      };

      expect(() => strategy.decideContinue(mockContext)).toThrow();
    });
  });

  describe('Multiple decision cycles', () => {
    test('should handle multiple dice selection cycles', async () => {
      // First cycle
      const promise1 = strategy.createDiceDecisionPromise();
      const decision1: DiceSelectionDecision = {
        selectedCombinations: [],
        points: 100,
        diceKept: 2,
        reason: 'First selection'
      };
      strategy.submitDiceSelection(decision1);
      await promise1;

      // Reset for next cycle
      strategy.resetDecisions();

      // Second cycle
      const promise2 = strategy.createDiceDecisionPromise();
      const decision2: DiceSelectionDecision = {
        selectedCombinations: [],
        points: 200,
        diceKept: 3,
        reason: 'Second selection'
      };
      strategy.submitDiceSelection(decision2);
      const result2 = await promise2;

      expect(result2).toEqual(decision2);
    });
  });
});
